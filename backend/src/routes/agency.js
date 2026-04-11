const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const { AGENCY_COMMISSION } = require('../services/commission');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(authorize('agency'));

// Dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.id;
    const agency = await prisma.agency.findUnique({ where: { userId } });
    if (!agency) return res.status(404).json({ error: 'Agency not found' });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Current month transactions
    const currentTxns = await prisma.transaction.findMany({
      where: { agencyId: agency.id, createdAt: { gte: startOfMonth } },
    });
    const currentRevenue = currentTxns.reduce((sum, t) => sum + t.totalAmount, 0);

    // Last month
    const lastTxns = await prisma.transaction.findMany({
      where: { agencyId: agency.id, createdAt: { gte: startOfLastMonth, lt: startOfMonth } },
    });
    const lastRevenue = lastTxns.reduce((sum, t) => sum + t.totalAmount, 0);

    // Total customers
    const totalCustomers = await prisma.customer.count({ where: { agencyId: agency.id } });

    // Commission estimate (assuming group B average)
    const commissionRate = 0.15;
    const estimatedCommission = currentRevenue * commissionRate;

    // Reward points (max 5% of sales)
    const rewardPoints = Math.floor(currentRevenue * 0.05);

    // Inventory warnings
    const warnings = await prisma.inventoryWarning.findMany({
      where: { agencyId: agency.id },
      include: { product: true },
      orderBy: { expiryDate: 'asc' },
    });

    // Monthly chart data
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const txns = await prisma.transaction.findMany({
        where: { agencyId: agency.id, createdAt: { gte: d, lt: dEnd } },
      });
      const revenue = txns.reduce((sum, t) => sum + t.totalAmount, 0);
      chartData.push({
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        revenue,
        transactions: txns.length,
      });
    }

    res.json({
      agency: {
        id: agency.id,
        name: agency.name,
        depositAmount: agency.depositAmount,
        depositTier: agency.depositTier,
        address: agency.address,
      },
      currentRevenue,
      lastRevenue,
      revenueGrowth: lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue * 100).toFixed(1) : 0,
      totalCustomers,
      estimatedCommission,
      rewardPoints,
      warnings,
      chartData,
      commissionConfig: AGENCY_COMMISSION,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Inventory warnings
router.get('/inventory', async (req, res) => {
  try {
    const agency = await prisma.agency.findUnique({ where: { userId: req.user.id } });
    if (!agency) return res.status(404).json({ error: 'Agency not found' });

    const warnings = await prisma.inventoryWarning.findMany({
      where: { agencyId: agency.id },
      include: { product: true },
      orderBy: { expiryDate: 'asc' },
    });

    const products = await prisma.product.findMany({ orderBy: { category: 'asc' } });

    res.json({ warnings, products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Transactions
router.get('/transactions', async (req, res) => {
  try {
    const agency = await prisma.agency.findUnique({ where: { userId: req.user.id } });
    if (!agency) return res.status(404).json({ error: 'Agency not found' });

    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { agencyId: agency.id },
        include: { customer: true, items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.transaction.count({ where: { agencyId: agency.id } }),
    ]);

    res.json({ transactions, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
