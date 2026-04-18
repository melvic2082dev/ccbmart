const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const { calculateCtvCommission } = require('../services/commission');
const { getCachedOrCompute } = require('../services/cache');
const { getReceivedManagementFeesSummary } = require('../services/managementFee');
const { getReceivedBreakawayFeesSummary } = require('../services/breakaway');
const { validate, schemas } = require('../middleware/validate');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(authorize('ctv'));

// Dashboard stats (with caching)
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const cacheKey = `ctv:dashboard:${userId}:${monthStr}`;

    const dashboard = await getCachedOrCompute(cacheKey, 300, async () => {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      // Parallel queries
      const [currentMonthTxns, lastMonthTxns, totalCustomers, teamSize] = await Promise.all([
        prisma.transaction.findMany({
          where: { ctvId: userId, channel: 'ctv', createdAt: { gte: startOfMonth } },
          select: { totalAmount: true },
        }),
        prisma.transaction.findMany({
          where: {
            ctvId: userId,
            channel: 'ctv',
            createdAt: { gte: startOfLastMonth, lt: startOfMonth },
          },
          select: { totalAmount: true },
        }),
        prisma.customer.count({ where: { ctvId: userId } }),
        prisma.user.count({ where: { parentId: userId, role: 'ctv', isActive: true } }),
      ]);

      const currentRevenue = currentMonthTxns.reduce((sum, t) => sum + t.totalAmount, 0);
      const currentCombos = currentMonthTxns.length;
      const lastRevenue = lastMonthTxns.reduce((sum, t) => sum + t.totalAmount, 0);

      const commission = await calculateCtvCommission(userId, monthStr);

      // Loyalty points balance
      const loyaltyPoints = await prisma.loyaltyPoint.aggregate({
        where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
        _sum: { points: true },
      });

      // Professional title
      const professionalTitle = await prisma.professionalTitle.findUnique({
        where: { userId },
      });

      // Promotion eligibility
      const promotionStatus = await prisma.promotionEligibility.findFirst({
        where: { ctvId: userId, status: { in: ['PENDING', 'APPROVED'] } },
        orderBy: { createdAt: 'desc' },
      });

      // Team bonus for current month
      const teamBonus = await prisma.teamBonus.findFirst({
        where: { ctvId: userId, month: monthStr },
      });

      // Monthly chart (6 months)
      const chartData = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const dEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        const txns = await prisma.transaction.findMany({
          where: { ctvId: userId, channel: 'ctv', createdAt: { gte: d, lt: dEnd } },
          select: { totalAmount: true },
        });
        const revenue = txns.reduce((sum, t) => sum + t.totalAmount, 0);
        chartData.push({
          month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          revenue,
          combos: txns.length,
        });
      }

      return {
        currentRevenue,
        currentCombos,
        lastRevenue,
        revenueGrowth: lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue * 100).toFixed(1) : 0,
        totalCustomers,
        teamSize,
        rank: req.user.rank || 'CTV',
        commission,
        chartData,
        loyaltyPoints: loyaltyPoints._sum.points || 0,
        professionalTitle: professionalTitle ? { title: professionalTitle.title, isActive: professionalTitle.isActive } : null,
        promotionStatus: promotionStatus ? { targetRank: promotionStatus.targetRank, status: promotionStatus.status } : null,
        teamBonus: teamBonus ? { bonusAmount: teamBonus.bonusAmount, status: teamBonus.status } : null,
      };
    });

    res.json(dashboard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Management tree (optimized - single query + in-memory build)
router.get('/tree', async (req, res) => {
  try {
    const userId = req.user.id;
    const cacheKey = `ctv:tree:${userId}`;

    const tree = await getCachedOrCompute(cacheKey, 300, async () => {
      // Get all CTVs and transactions in one go
      const [allCtv, allTxnCounts] = await Promise.all([
        prisma.user.findMany({
          where: { role: 'ctv', isActive: true },
          select: { id: true, name: true, rank: true, email: true, phone: true, parentId: true },
        }),
        prisma.transaction.groupBy({
          by: ['ctvId'],
          where: { channel: 'ctv' },
          _count: { id: true },
        }),
      ]);

      const txnCountMap = new Map(allTxnCounts.map(t => [t.ctvId, t._count.id]));

      // Build tree in memory
      const childrenMap = new Map();
      const nodeMap = new Map();
      for (const ctv of allCtv) {
        nodeMap.set(ctv.id, ctv);
        if (ctv.parentId !== null) {
          if (!childrenMap.has(ctv.parentId)) childrenMap.set(ctv.parentId, []);
          childrenMap.get(ctv.parentId).push(ctv.id);
        }
      }

      function buildSubtree(id, depth = 0) {
        if (depth > 3) return [];
        const childIds = childrenMap.get(id) || [];
        return childIds.map(childId => {
          const child = nodeMap.get(childId);
          return {
            id: child.id,
            name: child.name,
            rank: child.rank,
            email: child.email,
            phone: child.phone,
            transactions: txnCountMap.get(child.id) || 0,
            children: buildSubtree(child.id, depth + 1),
          };
        });
      }

      const user = nodeMap.get(userId);
      return {
        id: user?.id,
        name: user?.name,
        rank: user?.rank,
        email: user?.email,
        children: buildSubtree(userId),
      };
    });

    res.json(tree);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Customers
router.get('/customers', async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      where: { ctvId: req.user.id },
      orderBy: { totalSpent: 'desc' },
    });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Transactions
router.get('/transactions', validate(schemas.pagination, 'query'), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { ctvId: req.user.id },
        include: { customer: true, items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.transaction.count({ where: { ctvId: req.user.id } }),
    ]);

    res.json({ transactions, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// C12.4: Management fees received (F1/F2/F3)
router.get('/management-fees', validate(schemas.monthQuery, 'query'), async (req, res) => {
  try {
    const now = new Date();
    const month = req.query.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const summary = await getReceivedManagementFeesSummary(req.user.id, month);

    const detailed = await prisma.managementFee.findMany({
      where: { toUserId: req.user.id, month },
      include: { fromUser: { select: { id: true, name: true, rank: true, email: true } } },
      orderBy: { level: 'asc' },
    });

    res.json({
      month,
      summary: { f1: summary.f1, f2: summary.f2, f3: summary.f3, total: summary.total },
      records: detailed,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// C12.4: Breakaway fees received (giai đoạn 1)
router.get('/breakaway-fees', validate(schemas.monthQuery, 'query'), async (req, res) => {
  try {
    const now = new Date();
    const month = req.query.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const summary = await getReceivedBreakawayFeesSummary(req.user.id, month);

    const detailed = await prisma.breakawayFee.findMany({
      where: { toUserId: req.user.id, month },
      include: {
        fromUser: { select: { id: true, name: true, rank: true, email: true } },
        breakawayLog: true,
      },
      orderBy: { level: 'asc' },
    });

    res.json({
      month,
      summary: {
        level1: summary.level1,
        level2: summary.level2,
        level3: summary.level3,
        total: summary.total,
      },
      records: detailed,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Products
router.get('/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { category: 'asc' } });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== V10: CTV LOYALTY POINTS =====
router.get('/loyalty-points', async (req, res) => {
  try {
    const points = await prisma.loyaltyPoint.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    const balance = points
      .filter(p => !p.usedAt && p.expiresAt > new Date())
      .reduce((sum, p) => sum + p.points, 0);
    res.json({ balance, history: points });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== V10: CTV PROMOTION STATUS =====
router.get('/promotion-status', async (req, res) => {
  try {
    const promotions = await prisma.promotionEligibility.findMany({
      where: { ctvId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(promotions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== V10: CTV TEAM BONUS =====
router.get('/team-bonus', async (req, res) => {
  try {
    const bonuses = await prisma.teamBonus.findMany({
      where: { ctvId: req.user.id },
      orderBy: { month: 'desc' },
    });
    res.json(bonuses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
