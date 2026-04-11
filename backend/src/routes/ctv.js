const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const { calculateCtvCommission } = require('../services/commission');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(authorize('ctv'));

// Dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Current month sales
    const currentMonthTxns = await prisma.transaction.findMany({
      where: { ctvId: userId, channel: 'ctv', createdAt: { gte: startOfMonth } },
    });
    const currentRevenue = currentMonthTxns.reduce((sum, t) => sum + t.totalAmount, 0);
    const currentCombos = currentMonthTxns.length;

    // Last month sales
    const lastMonthTxns = await prisma.transaction.findMany({
      where: {
        ctvId: userId,
        channel: 'ctv',
        createdAt: { gte: startOfLastMonth, lt: startOfMonth },
      },
    });
    const lastRevenue = lastMonthTxns.reduce((sum, t) => sum + t.totalAmount, 0);

    // Total customers
    const totalCustomers = await prisma.customer.count({ where: { ctvId: userId } });

    // Team size (F1)
    const teamSize = await prisma.user.count({
      where: { parentId: userId, role: 'ctv', isActive: true },
    });

    // Commission for current month
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const commission = await calculateCtvCommission(userId, monthStr);

    // Monthly revenue chart (last 6 months)
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const txns = await prisma.transaction.findMany({
        where: { ctvId: userId, channel: 'ctv', createdAt: { gte: d, lt: dEnd } },
      });
      const revenue = txns.reduce((sum, t) => sum + t.totalAmount, 0);
      chartData.push({
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        revenue,
        combos: txns.length,
      });
    }

    res.json({
      currentRevenue,
      currentCombos,
      lastRevenue,
      revenueGrowth: lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue * 100).toFixed(1) : 0,
      totalCustomers,
      teamSize,
      rank: req.user.rank || 'CTV',
      commission,
      chartData,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Management tree
router.get('/tree', async (req, res) => {
  try {
    const userId = req.user.id;

    async function buildTree(parentId, depth = 0) {
      if (depth > 3) return [];
      const children = await prisma.user.findMany({
        where: { parentId, role: 'ctv', isActive: true },
        select: { id: true, name: true, rank: true, email: true, phone: true },
      });
      const result = [];
      for (const child of children) {
        const subChildren = await buildTree(child.id, depth + 1);
        const txnCount = await prisma.transaction.count({
          where: { ctvId: child.id, channel: 'ctv' },
        });
        result.push({ ...child, transactions: txnCount, children: subChildren });
      }
      return result;
    }

    const tree = await buildTree(userId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, rank: true, email: true },
    });

    res.json({ ...user, children: tree });
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
