const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const { calculateCtvCommission } = require('../services/commission');
const { getCachedOrCompute } = require('../services/cache');

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
router.get('/transactions', async (req, res) => {
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

// Products
router.get('/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { category: 'asc' } });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
