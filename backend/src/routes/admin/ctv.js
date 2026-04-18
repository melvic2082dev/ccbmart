const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { getCachedOrCompute, invalidateCache } = require('../../services/cache');
const { invalidateCommissionCache } = require('../../services/commission');
const { validateReassignment } = require('../../services/treeValidator');
const { validate, schemas } = require('../../middleware/validate');
const { sendRankChangeNotification } = require('../../services/notification');
const { runRankEvaluation } = require('../../jobs/autoRankUpdate');
const { asyncHandler, AppError } = require('../../middleware/errorHandler');

const router = express.Router();
const prisma = new PrismaClient();

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
  const { newParentId } = req.body;
  const ctvId = parseInt(req.params.id);

  const validation = await validateReassignment(ctvId, newParentId);
  if (!validation.valid) {
    throw new AppError(validation.error, 400, 'INVALID_REASSIGNMENT');
  }

  await prisma.user.update({
    where: { id: ctvId },
    data: { parentId: newParentId },
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
  const agencies = await prisma.agency.findMany({
    include: {
      user: { select: { name: true, email: true, phone: true } },
      inventoryWarnings: { include: { product: true } },
      _count: { select: { transactions: true } },
    },
  });

  const agencyIds = agencies.map(a => a.id);
  const revenues = await prisma.transaction.groupBy({
    by: ['agencyId'],
    where: { agencyId: { in: agencyIds } },
    _sum: { totalAmount: true },
  });

  const revenueMap = new Map(revenues.map(r => [r.agencyId, r._sum.totalAmount || 0]));

  const result = agencies.map(a => ({
    ...a,
    transactions: a._count.transactions,
    totalRevenue: revenueMap.get(a.id) || 0,
    _count: undefined,
  }));

  res.json(result);
}));

router.post('/rank-evaluation', asyncHandler(async (req, res) => {
  const result = await runRankEvaluation('ADMIN_MANUAL');
  if (result.skipped) {
    throw new AppError('Rank evaluation is already running', 409, 'EVALUATION_RUNNING');
  }
  res.json(result);
}));

module.exports = router;
