const express = require('express');
const { asyncHandler } = require('../../middleware/errorHandler');
const { calculateMonthlyManagementFees } = require('../../services/managementFee');
const { processMonthlyBreakawayFees } = require('../../services/breakaway');

const router = express.Router();
const prisma = require('../../lib/prisma');

router.get('/management-fees', asyncHandler(async (req, res) => {
  const { month, level, status, page = 1, limit = 50 } = req.query;
  const where = {};
  if (month) where.month = month;
  if (level) where.level = parseInt(level, 10);
  if (status) where.status = status;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [records, total] = await Promise.all([
    prisma.managementFee.findMany({
      where,
      include: {
        fromUser: { select: { id: true, name: true, rank: true } },
        toUser:   { select: { id: true, name: true, rank: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.managementFee.count({ where }),
  ]);

  // Aggregate by level
  const byLevel = { f1: 0, f2: 0, f3: 0 };
  for (const r of records) {
    const amt = Number(r.amount || 0);
    if (r.level === 1) byLevel.f1 += amt;
    else if (r.level === 2) byLevel.f2 += amt;
    else if (r.level === 3) byLevel.f3 += amt;
  }
  const totalAmount = byLevel.f1 + byLevel.f2 + byLevel.f3;

  // V13.4: aggregate per partner (toUser) — one row per partner showing F1/F2/F3 totals.
  // hasValidLog is implicit: managementFee records only exist when the upline had ≥20h training.
  const byPartnerMap = new Map();
  for (const r of records) {
    const key = r.toUser.id;
    if (!byPartnerMap.has(key)) {
      byPartnerMap.set(key, {
        partnerId: r.toUser.id,
        partnerName: r.toUser.name,
        partnerRank: r.toUser.rank,
        month: r.month,
        f1: 0,
        f2: 0,
        f3: 0,
        total: 0,
        hasValidLog: true,
        anyPending: false,
        anyPaid: false,
      });
    }
    const row = byPartnerMap.get(key);
    const amt = Number(r.amount || 0);
    if (r.level === 1) row.f1 += amt;
    else if (r.level === 2) row.f2 += amt;
    else if (r.level === 3) row.f3 += amt;
    row.total += amt;
    if (r.status === 'PENDING') row.anyPending = true;
    if (r.status === 'PAID') row.anyPaid = true;
  }
  const byPartner = Array.from(byPartnerMap.values()).map(p => ({
    ...p,
    status: p.anyPending && p.anyPaid ? 'PARTIAL' : (p.anyPaid ? 'PAID' : 'PENDING'),
  }));

  res.json({
    records,
    byLevel,
    byPartner,
    total: totalAmount,
    count: total,
    page: parseInt(page),
    totalPages: Math.ceil(total / parseInt(limit)),
  });
}));

router.post('/management-fees/process-monthly', asyncHandler(async (req, res) => {
  const now = new Date();
  const month = req.body.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const paidCount = await prisma.managementFee.count({ where: { month, status: { not: 'PENDING' } } });
  if (paidCount > 0) return res.status(409).json({ error: 'already processed', month, paidCount });
  const result = await calculateMonthlyManagementFees(month);
  res.json(result);
}));

router.post('/management-fees/:id/mark-paid', asyncHandler(async (req, res) => {
  const fee = await prisma.managementFee.update({
    where: { id: parseInt(req.params.id, 10) },
    data: { status: 'PAID' },
  });
  res.json(fee);
}));

router.get('/breakaway-logs', asyncHandler(async (req, res) => {
  const where = req.query.status ? { status: req.query.status } : {};
  const logs = await prisma.breakawayLog.findMany({
    where,
    include: {
      user:      { select: { id: true, name: true, rank: true } },
      oldParent: { select: { id: true, name: true, rank: true } },
      newParent: { select: { id: true, name: true, rank: true } },
    },
    orderBy: { breakawayAt: 'desc' },
  });
  res.json(logs);
}));

router.get('/breakaway-fees', asyncHandler(async (req, res) => {
  const { month, level, status, page = 1, limit = 50 } = req.query;
  const where = {};
  if (month) where.month = month;
  if (level) where.level = parseInt(level, 10);
  if (status) where.status = status;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [fees, total] = await Promise.all([
    prisma.breakawayFee.findMany({
      where,
      include: {
        fromUser: { select: { id: true, name: true, rank: true } },
        toUser:   { select: { id: true, name: true, rank: true } },
        breakawayLog: { select: { id: true, breakawayAt: true, expireAt: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.breakawayFee.count({ where }),
  ]);
  res.json({ fees, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
}));

router.post('/breakaway/process-monthly', asyncHandler(async (req, res) => {
  const now = new Date();
  const month = req.body.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const result = await processMonthlyBreakawayFees(month);
  res.json(result);
}));

router.post('/breakaway-fees/:id/mark-paid', asyncHandler(async (req, res) => {
  const fee = await prisma.breakawayFee.update({
    where: { id: parseInt(req.params.id, 10) },
    data: { status: 'PAID' },
  });
  res.json(fee);
}));

module.exports = router;
