const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const { calculateCtvCommission, calculateSalaryFundStatus, COMMISSION_RATES, AGENCY_COMMISSION } = require('../services/commission');
const { simulateSync, getSyncHistory } = require('../services/kiotviet-sync');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(authorize('admin'));

// Dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Revenue by channel (current month)
    const allTxns = await prisma.transaction.findMany({
      where: { createdAt: { gte: startOfMonth } },
    });

    const channelRevenue = { ctv: 0, agency: 0, showroom: 0 };
    let totalCogs = 0;
    for (const t of allTxns) {
      channelRevenue[t.channel] = (channelRevenue[t.channel] || 0) + t.totalAmount;
      totalCogs += t.cogsAmount;
    }
    const totalRevenue = Object.values(channelRevenue).reduce((s, v) => s + v, 0);
    const grossProfit = totalRevenue - totalCogs;

    // Operating costs estimates (based on doc percentages)
    const xwiseFee = totalRevenue * 0.05;
    const e29Fee = totalRevenue * 0.01;
    const logistics = totalRevenue * 0.03;
    const marketing = totalRevenue * 0.03;
    const opcoOverhead = totalRevenue * 0.02;
    const fixedCosts = 26000000 + 2000000 + 2000000; // staff + utilities + rent avg

    // CTV channel costs
    const ctvCommissions = channelRevenue.ctv * 0.40;
    const agencyCommissions = channelRevenue.agency * 0.20;

    const totalCosts = totalCogs + ctvCommissions + agencyCommissions + xwiseFee + e29Fee + logistics + marketing + opcoOverhead + fixedCosts;
    const netProfit = totalRevenue - totalCosts;

    // Salary fund status
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const salaryFund = await calculateSalaryFundStatus(monthStr);

    // Counts
    const totalCtvs = await prisma.user.count({ where: { role: 'ctv', isActive: true } });
    const totalAgencies = await prisma.agency.count();
    const totalCustomers = await prisma.customer.count();

    // Monthly revenue chart (6 months)
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const txns = await prisma.transaction.findMany({
        where: { createdAt: { gte: d, lt: dEnd } },
      });

      const rev = { ctv: 0, agency: 0, showroom: 0, total: 0, cogs: 0 };
      for (const t of txns) {
        rev[t.channel] += t.totalAmount;
        rev.total += t.totalAmount;
        rev.cogs += t.cogsAmount;
      }

      // Salary fund for this month
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const sf = await calculateSalaryFundStatus(mStr);

      chartData.push({
        month: mStr,
        ...rev,
        grossProfit: rev.total - rev.cogs,
        netProfit: rev.total - rev.cogs - (rev.ctv * 0.40) - (rev.agency * 0.20) - (rev.total * 0.14) - fixedCosts,
        salaryFundCap: sf.salaryFundCap,
        salaryFundUsed: sf.totalFixedSalary,
        salaryFundPct: sf.usagePercent,
      });
    }

    res.json({
      totalRevenue,
      channelRevenue,
      grossProfit,
      netProfit,
      totalCosts,
      costBreakdown: {
        cogs: totalCogs,
        ctvCommissions,
        agencyCommissions,
        xwiseFee,
        e29Fee,
        logistics,
        marketing,
        opcoOverhead,
        fixedCosts,
      },
      salaryFund,
      totalCtvs,
      totalAgencies,
      totalCustomers,
      chartData,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CTV management
router.get('/ctvs', async (req, res) => {
  try {
    const ctvs = await prisma.user.findMany({
      where: { role: 'ctv' },
      include: {
        parent: { select: { id: true, name: true, rank: true } },
        children: { select: { id: true, name: true, rank: true }, where: { role: 'ctv' } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Add transaction counts
    const result = await Promise.all(
      ctvs.map(async (ctv) => {
        const txnCount = await prisma.transaction.count({ where: { ctvId: ctv.id } });
        const customerCount = await prisma.customer.count({ where: { ctvId: ctv.id } });
        return {
          id: ctv.id,
          name: ctv.name,
          email: ctv.email,
          phone: ctv.phone,
          rank: ctv.rank,
          isActive: ctv.isActive,
          parentId: ctv.parentId,
          parent: ctv.parent,
          childrenCount: ctv.children.length,
          transactions: txnCount,
          customers: customerCount,
          createdAt: ctv.createdAt,
        };
      })
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CTV tree (full hierarchy)
router.get('/ctv-tree', async (req, res) => {
  try {
    async function buildTree(parentId, depth = 0) {
      if (depth > 4) return [];
      const children = await prisma.user.findMany({
        where: { parentId, role: 'ctv', isActive: true },
        select: { id: true, name: true, rank: true, email: true },
      });
      const result = [];
      for (const child of children) {
        const subChildren = await buildTree(child.id, depth + 1);
        result.push({ ...child, children: subChildren });
      }
      return result;
    }

    // Find root CTVs (GDKD or those without parents)
    const roots = await prisma.user.findMany({
      where: { role: 'ctv', parentId: null, isActive: true },
      select: { id: true, name: true, rank: true, email: true },
    });

    const tree = [];
    for (const root of roots) {
      const children = await buildTree(root.id);
      tree.push({ ...root, children });
    }

    res.json(tree);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reassign CTV
router.post('/ctv/:id/reassign', async (req, res) => {
  try {
    const { newParentId } = req.body;
    const ctvId = parseInt(req.params.id);

    await prisma.user.update({
      where: { id: ctvId },
      data: { parentId: newParentId },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Change rank
router.post('/ctv/:id/rank', async (req, res) => {
  try {
    const { newRank, reason } = req.body;
    const ctvId = parseInt(req.params.id);
    const ctv = await prisma.user.findUnique({ where: { id: ctvId } });
    if (!ctv) return res.status(404).json({ error: 'CTV not found' });

    await prisma.$transaction([
      prisma.user.update({
        where: { id: ctvId },
        data: { rank: newRank },
      }),
      prisma.rankHistory.create({
        data: {
          ctvId,
          oldRank: ctv.rank || 'CTV',
          newRank,
          reason: reason || 'Manual rank change by admin',
          changedBy: req.user.name,
        },
      }),
    ]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Agencies
router.get('/agencies', async (req, res) => {
  try {
    const agencies = await prisma.agency.findMany({
      include: {
        user: { select: { name: true, email: true, phone: true } },
        inventoryWarnings: { include: { product: true } },
      },
    });

    const result = await Promise.all(
      agencies.map(async (a) => {
        const txnCount = await prisma.transaction.count({ where: { agencyId: a.id } });
        const revenue = await prisma.transaction.aggregate({
          where: { agencyId: a.id },
          _sum: { totalAmount: true },
        });
        return {
          ...a,
          transactions: txnCount,
          totalRevenue: revenue._sum.totalAmount || 0,
        };
      })
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Commission config
router.get('/config/commission', async (req, res) => {
  try {
    const ctvConfig = await prisma.commissionConfig.findMany({ orderBy: { id: 'asc' } });
    const agencyConfig = await prisma.agencyCommissionConfig.findMany({ orderBy: { id: 'asc' } });
    res.json({ ctvConfig, agencyConfig, rates: COMMISSION_RATES, agencyRates: AGENCY_COMMISSION });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update commission config
router.put('/config/commission/:tier', async (req, res) => {
  try {
    const { selfSalePct, f1Pct, f2Pct, f3Pct, fixedSalary } = req.body;
    const config = await prisma.commissionConfig.update({
      where: { tier: req.params.tier },
      data: { selfSalePct, f1Pct, f2Pct, f3Pct, fixedSalary },
    });
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Financial report
router.get('/reports/financial', async (req, res) => {
  try {
    const { period = 'monthly', months = 6 } = req.query;
    const now = new Date();
    const reports = [];

    for (let i = parseInt(months) - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const txns = await prisma.transaction.findMany({
        where: { createdAt: { gte: d, lt: dEnd } },
      });

      const revenue = { ctv: 0, agency: 0, showroom: 0, total: 0 };
      let cogs = 0;
      for (const t of txns) {
        revenue[t.channel] += t.totalAmount;
        revenue.total += t.totalAmount;
        cogs += t.cogsAmount;
      }

      const grossProfit = revenue.total - cogs;
      const ctvCost = revenue.ctv * 0.40;
      const agencyCost = revenue.agency * 0.20;
      const sf = await calculateSalaryFundStatus(monthStr);
      const opex = revenue.total * 0.14 + 30000000; // 14% variable + 30M fixed
      const netProfit = grossProfit - ctvCost - agencyCost - sf.totalFixedSalary - opex;

      reports.push({
        month: monthStr,
        revenue,
        cogs,
        grossProfit,
        grossMargin: revenue.total > 0 ? ((grossProfit / revenue.total) * 100).toFixed(1) : 0,
        ctvCost,
        agencyCost,
        fixedSalaries: sf.totalFixedSalary,
        salaryFundPct: sf.usagePercent,
        opex,
        netProfit,
        netMargin: revenue.total > 0 ? ((netProfit / revenue.total) * 100).toFixed(1) : 0,
        transactionCount: txns.length,
      });
    }

    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// KPI logs
router.get('/kpi-logs', async (req, res) => {
  try {
    const logs = await prisma.kpiLog.findMany({
      include: { ctv: { select: { name: true, rank: true } } },
      orderBy: { month: 'desc' },
      take: 50,
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync
router.post('/sync', async (req, res) => {
  try {
    const result = await simulateSync();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sync-history', async (req, res) => {
  try {
    const history = await getSyncHistory();
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
