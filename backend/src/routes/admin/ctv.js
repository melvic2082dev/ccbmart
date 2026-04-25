const express = require('express');
const bcrypt = require('bcryptjs');
const { getCachedOrCompute, invalidateCache } = require('../../services/cache');
const { invalidateCommissionCache } = require('../../services/commission');
const { validateReassignment } = require('../../services/treeValidator');
const { validate, schemas } = require('../../middleware/validate');
const { sendRankChangeNotification, createNotification } = require('../../services/notification');
const { runRankEvaluation } = require('../../jobs/autoRankUpdate');
const { asyncHandler, AppError } = require('../../middleware/errorHandler');

const router = express.Router();
const prisma = require('../../lib/prisma');

// GET /ctv/export — export CTV list as JSON (#5)
router.get('/ctv/export', asyncHandler(async (req, res) => {
  const ctvs = await prisma.user.findMany({
    where: { role: 'ctv' },
    select: {
      id: true, name: true, email: true, phone: true, rank: true,
      isActive: true, parentId: true, createdAt: true,
      _count: { select: { transactions: true, customers: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  res.setHeader('Content-Disposition', 'attachment; filename="ctv-list.json"');
  res.json(ctvs);
}));

// GET /ctv/:id/details — CTV detail with transactions, rank history, training logs, KPI (#2)
router.get('/ctv/:id/details', asyncHandler(async (req, res) => {
  const ctvId = parseInt(req.params.id);
  const ctv = await prisma.user.findUnique({
    where: { id: ctvId },
    include: {
      parent: { select: { id: true, name: true, rank: true } },
      children: { select: { id: true, name: true, rank: true }, where: { role: 'ctv' } },
      transactions: { take: 50, orderBy: { createdAt: 'desc' }, select: { id: true, totalAmount: true, status: true, channel: true, createdAt: true, paymentMethod: true } },
      rankHistory: { orderBy: { changedAt: 'desc' }, take: 20 },
      traineeLogs: { take: 20, orderBy: { createdAt: 'desc' } },
      kpiLogs: { take: 12, orderBy: { month: 'desc' } },
      _count: { select: { transactions: true, customers: true } },
    },
  });
  if (!ctv) throw new AppError('CTV not found', 404, 'CTV_NOT_FOUND');
  const { passwordHash, ...safe } = ctv;
  res.json(safe);
}));

// POST /ctv/:id/toggle-active — toggle CTV isActive flag (#3)
router.post('/ctv/:id/toggle-active', asyncHandler(async (req, res) => {
  const ctvId = parseInt(req.params.id);
  const { isActive } = req.body;
  const ctv = await prisma.user.findUnique({ where: { id: ctvId } });
  if (!ctv) throw new AppError('CTV not found', 404, 'CTV_NOT_FOUND');
  const updated = await prisma.user.update({
    where: { id: ctvId },
    data: { isActive: Boolean(isActive) },
    select: { id: true, name: true, isActive: true },
  });
  await invalidateCache('admin:ctv-list');
  res.json(updated);
}));

// POST /ctv — create new CTV (#4)
router.post('/ctv', validate(schemas.createCtv), asyncHandler(async (req, res) => {
  const { name, email, phone, password, parentId, rank } = req.body;
  if (!name || !email || !password) throw new AppError('name, email, password are required', 400, 'MISSING_FIELDS');
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('Email da ton tai', 409, 'EMAIL_EXISTS');
  const passwordHash = await bcrypt.hash(password, 10);
  const ctv = await prisma.user.create({
    data: {
      name, email, phone: phone || null,
      passwordHash,
      role: 'ctv',
      rank: rank || 'CTV',
      parentId: parentId || null,
      isActive: true,
    },
    select: { id: true, name: true, email: true, phone: true, rank: true, isActive: true, createdAt: true },
  });
  await invalidateCache('admin:ctv-list');
  res.status(201).json(ctv);
}));

// GET /ctvs — list all CTVs (#existing)
router.get('/ctvs', asyncHandler(async (req, res) => {
  const result = await getCachedOrCompute('admin:ctv-list', 120, async () => {
    const ctvs = await prisma.user.findMany({
      where: { role: 'ctv' },
      include: {
        parent: { select: { id: true, name: true, rank: true } },
        children: { select: { id: true, name: true, rank: true }, where: { role: 'ctv' } },
        _count: { select: { transactions: true, customers: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return ctvs.map(ctv => ({
      id: ctv.id,
      name: ctv.name,
      email: ctv.email,
      phone: ctv.phone,
      rank: ctv.rank,
      isActive: ctv.isActive,
      parentId: ctv.parentId,
      parent: ctv.parent,
      childrenCount: ctv.children.length,
      transactions: ctv._count.transactions,
      customers: ctv._count.customers,
      createdAt: ctv.createdAt,
    }));
  });

  res.json(result);
}));

router.get('/ctv-tree', asyncHandler(async (req, res) => {
  const cacheKey = 'admin:ctv-tree';
  const tree = await getCachedOrCompute(cacheKey, 300, async () => {
    const allCtv = await prisma.user.findMany({
      where: { role: 'ctv', isActive: true },
      select: { id: true, name: true, rank: true, email: true, parentId: true },
    });

    const map = new Map();
    allCtv.forEach(ctv => map.set(ctv.id, { ...ctv, children: [] }));

    const roots = [];
    allCtv.forEach(ctv => {
      if (ctv.parentId === null) {
        roots.push(map.get(ctv.id));
      } else {
        const parent = map.get(ctv.parentId);
        if (parent) parent.children.push(map.get(ctv.id));
      }
    });

    return roots;
  });

  res.json(tree);
}));

router.post('/ctv/:id/reassign', validate(schemas.reassignCtv), asyncHandler(async (req, res) => {
  const { newParentId, reason } = req.body;
  const ctvId = parseInt(req.params.id);

  const validation = await validateReassignment(ctvId, newParentId);
  if (!validation.valid) {
    throw new AppError(validation.error, 400, 'INVALID_REASSIGNMENT');
  }

  const ctv = await prisma.user.findUnique({ where: { id: ctvId }, select: { parentId: true } });

  await prisma.user.update({
    where: { id: ctvId },
    data: { parentId: newParentId },
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'REASSIGN_CTV',
      targetType: 'user',
      targetId: ctvId,
      oldValue: JSON.stringify({ parentId: ctv?.parentId ?? null }),
      newValue: JSON.stringify({ parentId: newParentId }),
      metadata: reason ? JSON.stringify({ reason }) : null,
    },
  });

  invalidateCommissionCache();
  await invalidateCache('admin:ctv-tree');
  await invalidateCache('admin:ctv-list');
  await invalidateCache('ctv:tree:*');

  res.json({ success: true });
}));

router.post('/ctv/:id/rank', validate(schemas.changeRank), asyncHandler(async (req, res) => {
  const { newRank, reason } = req.body;
  const ctvId = parseInt(req.params.id);
  const ctv = await prisma.user.findUnique({ where: { id: ctvId } });
  if (!ctv) throw new AppError('CTV not found', 404, 'CTV_NOT_FOUND');

  const oldRank = ctv.rank || 'CTV';

  await prisma.$transaction([
    prisma.user.update({
      where: { id: ctvId },
      data: { rank: newRank },
    }),
    prisma.rankHistory.create({
      data: {
        ctvId,
        oldRank,
        newRank,
        reason: reason || 'Manual rank change by admin',
        changedBy: req.user.name,
      },
    }),
  ]);

  await sendRankChangeNotification(ctvId, oldRank, newRank, reason || 'Admin thay doi');
  invalidateCommissionCache(ctvId);
  await invalidateCache('admin:ctv-list');

  res.json({ success: true });
}));

router.get('/agencies', asyncHandler(async (req, res) => {
  const result = await getCachedOrCompute('admin:agencies-list', 60, async () => {
    const [agencies, allRevenues] = await Promise.all([
      prisma.agency.findMany({
        include: {
          user: { select: { name: true, email: true, phone: true } },
          inventoryWarnings: { include: { product: true } },
          _count: { select: { transactions: true } },
        },
      }),
      prisma.transaction.groupBy({
        by: ['agencyId'],
        where: { status: 'CONFIRMED', agencyId: { not: null } },
        _sum: { totalAmount: true },
      }),
    ]);

    const revenueMap = new Map(allRevenues.map(r => [r.agencyId, r._sum.totalAmount || 0]));

    return agencies.map(a => ({
      ...a,
      transactions: a._count.transactions,
      totalRevenue: revenueMap.get(a.id) || 0,
      _count: undefined,
    }));
  });

  res.json(result);
}));

router.post('/rank-evaluation', asyncHandler(async (req, res) => {
  const result = await runRankEvaluation('ADMIN_MANUAL');
  if (result.skipped) {
    throw new AppError('Rank evaluation is already running', 409, 'EVALUATION_RUNNING');
  }
  res.json(result);
}));

// ===== Agency detail routes (#6) =====

// GET /agencies/:id/details
router.get('/agencies/:id/details', asyncHandler(async (req, res) => {
  const agencyId = parseInt(req.params.id);
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      inventoryWarnings: { include: { product: true } },
    },
  });
  if (!agency) throw new AppError('Agency not found', 404, 'AGENCY_NOT_FOUND');
  const [revenueAgg, monthlyAgg] = await Promise.all([
    prisma.transaction.aggregate({ where: { agencyId, status: 'CONFIRMED' }, _sum: { totalAmount: true } }),
    prisma.transaction.aggregate({
      where: { agencyId, status: 'CONFIRMED', createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      _sum: { totalAmount: true },
    }),
  ]);
  res.json({
    profile: { id: agency.id, name: agency.name, address: agency.address, region: null, depositTier: agency.depositTier, user: agency.user },
    finance: {
      depositAmount: agency.depositAmount,
      receivedValue: 0, soldValue: 0, currentInventory: 0, creditRemaining: 0,
      totalRevenue: revenueAgg._sum.totalAmount || 0,
      monthlyRevenue: monthlyAgg._sum.totalAmount || 0,
      rankTier: 'DONG',
    },
    warnings: agency.inventoryWarnings,
    velocity: [],
  });
}));

// GET /agencies/:id/transactions?days=30
router.get('/agencies/:id/transactions', asyncHandler(async (req, res) => {
  const agencyId = parseInt(req.params.id);
  const days = parseInt(req.query.days || '30');
  const since = new Date(Date.now() - days * 86400000);
  const transactions = await prisma.transaction.findMany({
    where: { agencyId, createdAt: { gte: since } },
    include: {
      customer: { select: { name: true, phone: true } },
      items: { include: { product: { select: { name: true, unit: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json({ transactions, days });
}));

// GET /agencies/:id/restock-suggestions
router.get('/agencies/:id/restock-suggestions', asyncHandler(async (req, res) => {
  const agencyId = parseInt(req.params.id);
  const since = new Date(Date.now() - 30 * 86400000);
  const items = await prisma.transactionItem.findMany({
    where: { transaction: { agencyId, createdAt: { gte: since } } },
    include: { product: { select: { id: true, name: true, unit: true, price: true } } },
  });
  const productMap = new Map();
  for (const item of items) {
    const key = item.productId;
    if (!productMap.has(key)) productMap.set(key, { product: item.product, soldQty: 0 });
    productMap.get(key).soldQty += item.quantity;
  }
  const suggestions = Array.from(productMap.values()).map(({ product, soldQty }) => {
    const dailyAvg = soldQty / 30;
    const suggestQty = Math.ceil(dailyAvg * 14);
    return { product, soldLast30d: soldQty, dailyAvg: Math.round(dailyAvg * 100) / 100, suggestQty, estimatedCost: suggestQty * Number(product.price) };
  }).filter(s => s.suggestQty > 0);
  const totalEstimate = suggestions.reduce((s, x) => s + x.estimatedCost, 0);
  res.json({ suggestions, totalEstimate });
}));

// GET /agencies/:id/transactions/export
router.get('/agencies/:id/transactions/export', asyncHandler(async (req, res) => {
  const agencyId = parseInt(req.params.id);
  const days = parseInt(req.query.days || '30');
  const since = new Date(Date.now() - days * 86400000);
  const transactions = await prisma.transaction.findMany({
    where: { agencyId, createdAt: { gte: since } },
    select: { id: true, createdAt: true, totalAmount: true, cogsAmount: true, status: true, channel: true, paymentMethod: true },
    orderBy: { createdAt: 'desc' },
  });
  res.setHeader('Content-Disposition', `attachment; filename="agency-${agencyId}-txn-${days}d.json"`);
  res.json(transactions);
}));

// ===== Bulk notifications (#7) =====

// POST /notifications/bulk
router.post('/notifications/bulk', asyncHandler(async (req, res) => {
  const { userIds, title, content, type } = req.body;
  if (!Array.isArray(userIds) || userIds.length === 0) throw new AppError('userIds array is required', 400, 'MISSING_FIELDS');
  if (userIds.length > 500) throw new AppError('Cannot send to more than 500 users at once', 400, 'TOO_MANY_RECIPIENTS');
  if (!title || !content) throw new AppError('title and content are required', 400, 'MISSING_FIELDS');
  const results = await Promise.allSettled(
    userIds.map(uid => createNotification(uid, type || 'ADMIN_BROADCAST', title, content, {}))
  );
  const created = results.filter(r => r.status === 'fulfilled' && r.value).length;
  const failed = results.length - created;
  res.json({ created, failed, total: userIds.length });
}));

module.exports = router;
