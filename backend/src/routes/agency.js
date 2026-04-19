const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { AGENCY_COMMISSION } = require('../services/commission');
const { getCachedOrCompute } = require('../services/cache');
const { validate, schemas } = require('../middleware/validate');

const router = express.Router();
const prisma = require('../lib/prisma');

router.use(authenticate);
router.use(authorize('agency'));

// Dashboard (with caching)
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.id;
    const agency = await prisma.agency.findUnique({ where: { userId } });
    if (!agency) return res.status(404).json({ error: 'Agency not found' });

    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const cacheKey = `agency:dashboard:${agency.id}:${monthStr}`;

    const dashboard = await getCachedOrCompute(cacheKey, 300, async () => {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      // Parallel queries
      const [currentTxns, lastTxns, totalCustomers, warnings] = await Promise.all([
        prisma.transaction.findMany({
          where: { agencyId: agency.id, createdAt: { gte: startOfMonth } },
          select: { totalAmount: true },
        }),
        prisma.transaction.findMany({
          where: { agencyId: agency.id, createdAt: { gte: startOfLastMonth, lt: startOfMonth } },
          select: { totalAmount: true },
        }),
        prisma.customer.count({ where: { agencyId: agency.id } }),
        prisma.inventoryWarning.findMany({
          where: { agencyId: agency.id },
          include: { product: true },
          orderBy: { expiryDate: 'asc' },
        }),
      ]);

      const currentRevenue = currentTxns.reduce((sum, t) => sum + Number(t.totalAmount), 0);
      const lastRevenue = lastTxns.reduce((sum, t) => sum + Number(t.totalAmount), 0);
      const estimatedCommission = currentRevenue * 0.15;
      const rewardPoints = Math.floor(currentRevenue * 0.05);

      // Monthly chart
      const chartData = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const dEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        const txns = await prisma.transaction.findMany({
          where: { agencyId: agency.id, createdAt: { gte: d, lt: dEnd } },
          select: { totalAmount: true },
        });
        const revenue = txns.reduce((sum, t) => sum + Number(t.totalAmount), 0);
        chartData.push({
          month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          revenue,
          transactions: txns.length,
        });
      }

      return {
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
      };
    });

    res.json(dashboard);
  } catch (err) {
    console.error('[agency]', err); res.status(500).json({ error: 'Internal server error' });
  }
});

// Inventory warnings
router.get('/inventory', async (req, res) => {
  try {
    const agency = await prisma.agency.findUnique({ where: { userId: req.user.id } });
    if (!agency) return res.status(404).json({ error: 'Agency not found' });

    const [warnings, products] = await Promise.all([
      prisma.inventoryWarning.findMany({
        where: { agencyId: agency.id },
        include: { product: true },
        orderBy: { expiryDate: 'asc' },
      }),
      prisma.product.findMany({ orderBy: { category: 'asc' } }),
    ]);

    res.json({ warnings, products });
  } catch (err) {
    console.error('[agency]', err); res.status(500).json({ error: 'Internal server error' });
  }
});

// Transactions
router.get('/transactions', validate(schemas.pagination, 'query'), async (req, res) => {
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
    console.error('[agency]', err); res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
