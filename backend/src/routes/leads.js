/**
 * Lead routes — CTV-facing + admin.
 * Spec: docs/specs/02_CRM_LIGHTWEIGHT.md §5.3
 */

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditLog');
const { onLeadCreated, onLeadStageChanged } = require('../services/leadNotifier');

const router = express.Router();
const prisma = require('../lib/prisma');

const VALID_STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'NEGOTIATING', 'WON', 'LOST'];
const STAGE_TRANSITIONS = {
  NEW: ['CONTACTED', 'LOST'],
  CONTACTED: ['QUALIFIED', 'LOST'],
  QUALIFIED: ['NEGOTIATING', 'LOST'],
  NEGOTIATING: ['WON', 'LOST'],
  WON: [],
  LOST: [],
};

// ============================================================
// CTV-FACING
// ============================================================
router.use('/ctv', authenticate, authorize('ctv'));

router.get('/ctv/leads', async (req, res) => {
  const { stage, source } = req.query;
  const where = { assignedCtvId: req.user.id };
  if (stage) where.stage = stage;
  if (source) where.source = source;
  const items = await prisma.lead.findMany({
    where,
    orderBy: [{ nextActionAt: 'asc' }, { createdAt: 'desc' }],
    take: 200,
  });
  res.json({ items });
});

router.get('/ctv/leads/today', async (req, res) => {
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  const items = await prisma.lead.findMany({
    where: {
      assignedCtvId: req.user.id,
      stage: { in: ['NEW', 'CONTACTED', 'QUALIFIED', 'NEGOTIATING'] },
      nextActionAt: { lte: endOfDay, not: null },
    },
    orderBy: { nextActionAt: 'asc' },
  });
  res.json({ items });
});

router.get('/ctv/leads/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const lead = await prisma.lead.findFirst({
    where: { id, assignedCtvId: req.user.id },
    include: { activities: { orderBy: { occurredAt: 'desc' } }, customer: true },
  });
  if (!lead) return res.status(404).json({ error: 'Not found' });
  res.json(lead);
});

router.post('/ctv/leads', async (req, res) => {
  try {
    const { name, phone, zaloName, email, source, sourceDetail, interestNote, estimatedValue } = req.body;
    if (!name || !phone || !source) return res.status(400).json({ error: 'name, phone, source required' });
    const lead = await prisma.lead.create({
      data: {
        name, phone,
        zaloName: zaloName || null, email: email || null,
        source, sourceDetail: sourceDetail || null,
        interestNote: interestNote || null,
        estimatedValue: estimatedValue || null,
        assignedCtvId: req.user.id,
        stage: 'NEW',
      },
    });
    await onLeadCreated(lead.id);
    logAudit({ userId: req.user.id, action: 'LEAD_CREATE', targetType: 'Lead', targetId: lead.id, status: 'SUCCESS' });
    res.status(201).json(lead);
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Lead voi SDT nay da ton tai' });
    res.status(400).json({ error: e.message });
  }
});

router.put('/ctv/leads/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = await prisma.lead.findFirst({ where: { id, assignedCtvId: req.user.id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const data = { ...req.body };
  delete data.id; delete data.stage; delete data.assignedCtvId; delete data.createdAt;
  const lead = await prisma.lead.update({ where: { id }, data });
  res.json(lead);
});

router.post('/ctv/leads/:id/activities', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const lead = await prisma.lead.findFirst({ where: { id, assignedCtvId: req.user.id } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    const { type, outcome, durationMin, notes } = req.body;
    if (!type || !notes) return res.status(400).json({ error: 'type, notes required' });

    const result = await prisma.$transaction(async (tx) => {
      const act = await tx.leadActivity.create({
        data: {
          leadId: id, ctvId: req.user.id,
          type, outcome: outcome || null, durationMin: durationMin || null, notes,
        },
      });
      const update = { lastContactedAt: new Date() };
      // Auto-advance NEW → CONTACTED on first activity with outcome
      if (lead.stage === 'NEW' && outcome) update.stage = 'CONTACTED';
      await tx.lead.update({ where: { id }, data: update });
      return act;
    });

    if (lead.stage === 'NEW') {
      try { await onLeadStageChanged(id, 'NEW', 'CONTACTED'); } catch {}
    }
    res.status(201).json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/ctv/leads/:id/stage', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const lead = await prisma.lead.findFirst({ where: { id, assignedCtvId: req.user.id } });
    if (!lead) return res.status(404).json({ error: 'Not found' });
    const { stage, lostReason } = req.body;
    if (!VALID_STAGES.includes(stage)) return res.status(400).json({ error: 'Invalid stage' });
    if (!STAGE_TRANSITIONS[lead.stage].includes(stage)) {
      return res.status(400).json({ error: `Cannot transition ${lead.stage} → ${stage}` });
    }
    const data = { stage };
    if (stage === 'LOST') data.lostReason = lostReason || 'other';
    if (stage === 'LOST' || stage === 'WON') data.closedAt = new Date();
    const updated = await prisma.lead.update({ where: { id }, data });
    try { await onLeadStageChanged(id, lead.stage, stage); } catch {}
    logAudit({ userId: req.user.id, action: 'LEAD_STAGE', targetType: 'Lead', targetId: id, metadata: { from: lead.stage, to: stage }, status: 'SUCCESS' });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Convert lead WON + tạo Customer (Transaction creation is separate flow)
router.post('/ctv/leads/:id/convert', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const lead = await prisma.lead.findFirst({ where: { id, assignedCtvId: req.user.id } });
    if (!lead) return res.status(404).json({ error: 'Not found' });
    if (lead.stage === 'WON') return res.status(400).json({ error: 'Already converted' });

    const result = await prisma.$transaction(async (tx) => {
      // Find or create customer by phone
      let customer = await tx.customer.findUnique({ where: { phone: lead.phone } });
      if (!customer) {
        customer = await tx.customer.create({
          data: {
            name: lead.name, phone: lead.phone,
            ctvId: req.user.id, lifecycleStage: 'ACTIVE',
            lastContactedAt: new Date(),
          },
        });
      } else {
        await tx.customer.update({
          where: { id: customer.id },
          data: { lifecycleStage: 'ACTIVE', lastContactedAt: new Date() },
        });
      }
      const updated = await tx.lead.update({
        where: { id },
        data: { stage: 'WON', customerId: customer.id, closedAt: new Date() },
      });
      return { lead: updated, customer };
    });
    try { await onLeadStageChanged(id, lead.stage, 'WON'); } catch {}
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ============================================================
// ADMIN-FACING
// ============================================================
const adminRouter = express.Router();
adminRouter.use(authenticate, authorize('admin'));

adminRouter.get('/leads', async (req, res) => {
  const { stage, source, ctvId, q, limit = 50, offset = 0 } = req.query;
  const where = {};
  if (stage) where.stage = stage;
  if (source) where.source = source;
  if (ctvId) where.assignedCtvId = parseInt(ctvId, 10);
  if (q) where.OR = [{ name: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }];
  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: { assignedCtv: { select: { id: true, name: true, rank: true } } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit, 10) || 50, 200),
      skip: parseInt(offset, 10) || 0,
    }),
    prisma.lead.count({ where }),
  ]);
  res.json({ items, total });
});

adminRouter.get('/reports/conversion', async (req, res) => {
  const { month } = req.query; // YYYY-MM
  let dateFilter = {};
  if (month) {
    const [y, m] = month.split('-').map((x) => parseInt(x, 10));
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 1));
    dateFilter = { closedAt: { gte: start, lt: end } };
  }
  const grouped = await prisma.lead.groupBy({
    by: ['assignedCtvId', 'stage'],
    where: { ...dateFilter, stage: { in: ['WON', 'LOST'] } },
    _count: { id: true },
  });
  // pivot to { ctvId, won, lost, conv }
  const map = new Map();
  for (const g of grouped) {
    const row = map.get(g.assignedCtvId) || { ctvId: g.assignedCtvId, won: 0, lost: 0 };
    row[g.stage.toLowerCase()] = g._count.id;
    map.set(g.assignedCtvId, row);
  }
  const ctvIds = Array.from(map.keys());
  const ctvs = await prisma.user.findMany({ where: { id: { in: ctvIds } }, select: { id: true, name: true, rank: true } });
  const items = ctvs.map((u) => {
    const r = map.get(u.id);
    const conv = r.won + r.lost === 0 ? 0 : (r.won / (r.won + r.lost)) * 100;
    return { ...r, name: u.name, rank: u.rank, conversionRate: Number(conv.toFixed(1)) };
  }).sort((a, b) => b.conversionRate - a.conversionRate);
  res.json({ items, month: month || 'all' });
});

router.use('/admin', adminRouter);

module.exports = router;
