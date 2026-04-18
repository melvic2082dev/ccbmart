const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const { calculateCtvCommission, calculateSalaryFundStatus, COMMISSION_RATES, AGENCY_COMMISSION, invalidateCommissionCache } = require('../services/commission');
const { addSyncJob, getSyncHistory } = require('../queues/syncQueue');
const { getCachedOrCompute, invalidateCache } = require('../services/cache');
const { validateReassignment } = require('../services/treeValidator');
const { validate, schemas } = require('../middleware/validate');
const { sendRankChangeNotification, sendSalaryWarning } = require('../services/notification');
const { runRankEvaluation } = require('../jobs/autoRankUpdate');
const { checkEligibility, activatePromotions } = require('../services/promotion');
const { calculateSoftSalary } = require('../services/soft-salary');
const { calculateTeamBonus } = require('../services/team-bonus');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(authorize('admin'));

// Dashboard (with caching)
router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const cacheKey = `admin:dashboard:${monthStr}`;

    const dashboard = await getCachedOrCompute(cacheKey, 300, async () => {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Revenue by channel (current month) - single query
      const allTxns = await prisma.transaction.findMany({
        where: { createdAt: { gte: startOfMonth } },
        select: { channel: true, totalAmount: true, cogsAmount: true },
      });

      const channelRevenue = { ctv: 0, agency: 0, showroom: 0 };
      let totalCogs = 0;
      for (const t of allTxns) {
        channelRevenue[t.channel] = (channelRevenue[t.channel] || 0) + t.totalAmount;
        totalCogs += t.cogsAmount;
      }
      const totalRevenue = Object.values(channelRevenue).reduce((s, v) => s + v, 0);
      const grossProfit = totalRevenue - totalCogs;

      // Operating costs
      const xwiseFee = totalRevenue * 0.05;
      const e29Fee = totalRevenue * 0.01;
      const logistics = totalRevenue * 0.03;
      const marketing = totalRevenue * 0.03;
      const opcoOverhead = totalRevenue * 0.02;
      const fixedCosts = 26000000 + 2000000 + 2000000;
      const ctvCommissions = channelRevenue.ctv * 0.40;
      const agencyCommissions = channelRevenue.agency * 0.20;
      const totalCosts = totalCogs + ctvCommissions + agencyCommissions + xwiseFee + e29Fee + logistics + marketing + opcoOverhead + fixedCosts;
      const netProfit = totalRevenue - totalCosts;

      // Salary fund
      const salaryFund = await calculateSalaryFundStatus(monthStr);

      // Counts - parallel queries
      const [totalCtvs, totalAgencies, totalCustomers] = await Promise.all([
        prisma.user.count({ where: { role: 'ctv', isActive: true } }),
        prisma.agency.count(),
        prisma.customer.count(),
      ]);

      // Monthly chart (6 months) - batch all months
      const chartData = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const dEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        const txns = await prisma.transaction.findMany({
          where: { createdAt: { gte: d, lt: dEnd } },
          select: { channel: true, totalAmount: true, cogsAmount: true },
        });

        const rev = { ctv: 0, agency: 0, showroom: 0, total: 0, cogs: 0 };
        for (const t of txns) {
          rev[t.channel] += t.totalAmount;
          rev.total += t.totalAmount;
          rev.cogs += t.cogsAmount;
        }

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

      return {
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
      };
    });

    // Check salary warning
    if (dashboard.salaryFund && dashboard.salaryFund.warning !== 'OK') {
      await sendSalaryWarning(
        dashboard.salaryFund.usagePercent,
        dashboard.salaryFund.totalFixedSalary,
        dashboard.salaryFund.salaryFundCap
      );
    }

    res.json(dashboard);
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
        _count: { select: { transactions: true, customers: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const result = ctvs.map(ctv => ({
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

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CTV tree (optimized - single query + in-memory build)
router.get('/ctv-tree', async (req, res) => {
  try {
    const cacheKey = 'admin:ctv-tree';
    const tree = await getCachedOrCompute(cacheKey, 300, async () => {
      const allCtv = await prisma.user.findMany({
        where: { role: 'ctv', isActive: true },
        select: { id: true, name: true, rank: true, email: true, parentId: true },
      });

      // Build tree in memory
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reassign CTV (with circular reference validation)
router.post('/ctv/:id/reassign', validate(schemas.reassignCtv), async (req, res) => {
  try {
    const { newParentId } = req.body;
    const ctvId = parseInt(req.params.id);

    // Validate reassignment
    const validation = await validateReassignment(ctvId, newParentId);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    await prisma.user.update({
      where: { id: ctvId },
      data: { parentId: newParentId },
    });

    // Invalidate caches
    invalidateCommissionCache();
    await invalidateCache('admin:ctv-tree');
    await invalidateCache('ctv:tree:*');

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Change rank (with notification)
router.post('/ctv/:id/rank', validate(schemas.changeRank), async (req, res) => {
  try {
    const { newRank, reason } = req.body;
    const ctvId = parseInt(req.params.id);
    const ctv = await prisma.user.findUnique({ where: { id: ctvId } });
    if (!ctv) return res.status(404).json({ error: 'CTV not found' });

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

    // Send notification to CTV
    await sendRankChangeNotification(ctvId, oldRank, newRank, reason || 'Admin thay doi');
    invalidateCommissionCache(ctvId);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Agencies (optimized with _count)
router.get('/agencies', async (req, res) => {
  try {
    const agencies = await prisma.agency.findMany({
      include: {
        user: { select: { name: true, email: true, phone: true } },
        inventoryWarnings: { include: { product: true } },
        _count: { select: { transactions: true } },
      },
    });

    // Batch aggregate revenues
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Commission config
router.get('/config/commission', async (req, res) => {
  try {
    const [ctvConfig, agencyConfig] = await Promise.all([
      prisma.commissionConfig.findMany({ orderBy: { id: 'asc' } }),
      prisma.agencyCommissionConfig.findMany({ orderBy: { id: 'asc' } }),
    ]);
    res.json({ ctvConfig, agencyConfig, rates: COMMISSION_RATES, agencyRates: AGENCY_COMMISSION });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update commission config
router.put('/config/commission/:tier', validate(schemas.updateCommission), async (req, res) => {
  try {
    const { selfSalePct, directPct, indirect2Pct, indirect3Pct, fixedSalary } = req.body;
    const config = await prisma.commissionConfig.update({
      where: { tier: req.params.tier },
      data: { selfSalePct, directPct, indirect2Pct, indirect3Pct, fixedSalary },
    });
    invalidateCommissionCache();
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Financial report
router.get('/reports/financial', async (req, res) => {
  try {
    const { months = 6 } = req.query;
    const monthCount = parseInt(months);
    const now = new Date();
    const cacheKey = `admin:reports:${monthCount}`;

    const reports = await getCachedOrCompute(cacheKey, 600, async () => {
      const result = [];
      const fixedCosts = 30000000;

      for (let i = monthCount - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const dEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        const txns = await prisma.transaction.findMany({
          where: { createdAt: { gte: d, lt: dEnd } },
          select: { channel: true, totalAmount: true, cogsAmount: true },
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
        const opex = revenue.total * 0.14 + fixedCosts;
        const netProfit = grossProfit - ctvCost - agencyCost - sf.totalFixedSalary - opex;

        result.push({
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
      return result;
    });

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

// Trigger rank evaluation manually
router.post('/rank-evaluation', async (req, res) => {
  try {
    const result = await runRankEvaluation('ADMIN_MANUAL');
    if (result.skipped) {
      return res.status(409).json({ error: 'Rank evaluation is already running' });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== V10: PROMOTION ENDPOINTS =====

// List pending promotions for current month
router.get('/promotions/pending', async (req, res) => {
  try {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Check eligibility for all CTVs
    const allCtv = await prisma.user.findMany({
      where: { role: 'ctv', isActive: true, rank: { in: ['CTV', 'PP', 'TP', 'GDV'] } },
      select: { id: true },
    });

    const eligible = [];
    for (const ctv of allCtv) {
      const result = await checkEligibility(ctv.id, monthStr);
      if (result && result.eligible) {
        // Create or find existing record
        const existing = await prisma.promotionEligibility.findFirst({
          where: { ctvId: ctv.id, qualifiedMonth: monthStr },
        });
        if (!existing) {
          await prisma.promotionEligibility.create({
            data: {
              ctvId: ctv.id,
              targetRank: result.targetRank,
              qualifiedMonth: monthStr,
              effectiveDate: result.effectiveDate,
            },
          });
        }
        eligible.push(result);
      }
    }

    // Get all pending/approved promotions
    const promotions = await prisma.promotionEligibility.findMany({
      where: { status: { in: ['PENDING', 'APPROVED'] } },
      include: { ctv: { select: { id: true, name: true, rank: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Get history
    const history = await prisma.promotionEligibility.findMany({
      where: { status: 'ACTIVATED' },
      include: { ctv: { select: { id: true, name: true, rank: true, email: true } } },
      orderBy: { approvedAt: 'desc' },
      take: 20,
    });

    res.json({ pending: promotions, history, newEligible: eligible.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve a promotion
router.post('/promotions/:id/approve', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const promo = await prisma.promotionEligibility.findUnique({ where: { id } });
    if (!promo) return res.status(404).json({ error: 'Promotion not found' });
    if (promo.status !== 'PENDING') return res.status(400).json({ error: 'Promotion is not pending' });

    await prisma.promotionEligibility.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy: req.user.id, approvedAt: new Date() },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Activate approved promotions (run on 1st of month)
router.post('/promotions/activate', async (req, res) => {
  try {
    const result = await activatePromotions();
    invalidateCommissionCache();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== V10: SOFT SALARY =====
router.get('/salary/soft-adjustment', async (req, res) => {
  try {
    const now = new Date();
    const monthStr = req.query.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const result = await calculateSoftSalary(monthStr);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== V10: TEAM BONUS =====
router.get('/team-bonus/:month', async (req, res) => {
  try {
    const bonuses = await prisma.teamBonus.findMany({
      where: { month: req.params.month },
      include: { ctv: { select: { id: true, name: true, rank: true } } },
      orderBy: { bonusAmount: 'desc' },
    });
    res.json(bonuses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/team-bonus/:month/calculate', async (req, res) => {
  try {
    const result = await calculateTeamBonus(req.params.month);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== V10: PROFESSIONAL TITLES =====
router.get('/titles', async (req, res) => {
  try {
    const titles = await prisma.professionalTitle.findMany({
      include: { user: { select: { id: true, name: true, rank: true, email: true } } },
      orderBy: { awardedAt: 'desc' },
    });
    res.json(titles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/titles/award', validate(schemas.awardTitle), async (req, res) => {
  try {
    const { userId, title } = req.body;
    if (!userId || !title) return res.status(400).json({ error: 'userId and title required' });

    const validTitles = ['EXPERT_LEADER', 'SENIOR_EXPERT', 'STRATEGIC_ADVISOR'];
    if (!validTitles.includes(title)) return res.status(400).json({ error: 'Invalid title' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { children: { where: { role: 'ctv', isActive: true } } },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const existing = await prisma.professionalTitle.findUnique({ where: { userId } });
    if (existing) {
      await prisma.professionalTitle.update({
        where: { userId },
        data: { title, directCount: user.children.length, renewedAt: now, expiresAt, isActive: true },
      });
    } else {
      await prisma.professionalTitle.create({
        data: { userId, title, directCount: user.children.length, renewedAt: now, expiresAt },
      });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync (via queue)
router.post('/sync', validate(schemas.adminSync), async (req, res) => {
  try {
    const result = await addSyncJob('batch-sync', { dateRange: req.body?.dateRange || 'last-7-days' });
    res.json({ message: 'Sync job initiated', ...result });
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

// ============================================================
// C12.4: Management fees + Breakaway (admin views)
// ============================================================

router.get('/management-fees', async (req, res) => {
  try {
    const { month, level, status } = req.query;
    const where = {};
    if (month) where.month = month;
    if (level) where.level = parseInt(level, 10);
    if (status) where.status = status;
    const fees = await prisma.managementFee.findMany({
      where,
      include: {
        fromUser: { select: { id: true, name: true, rank: true } },
        toUser:   { select: { id: true, name: true, rank: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(fees);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/management-fees/:id/mark-paid', async (req, res) => {
  try {
    const fee = await prisma.managementFee.update({
      where: { id: parseInt(req.params.id, 10) },
      data: { status: 'PAID' },
    });
    res.json(fee);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/breakaway-logs', async (req, res) => {
  try {
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
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/breakaway-fees', async (req, res) => {
  try {
    const { month, level, status } = req.query;
    const where = {};
    if (month) where.month = month;
    if (level) where.level = parseInt(level, 10);
    if (status) where.status = status;
    const fees = await prisma.breakawayFee.findMany({
      where,
      include: {
        fromUser: { select: { id: true, name: true, rank: true } },
        toUser:   { select: { id: true, name: true, rank: true } },
        breakawayLog: { select: { id: true, breakawayAt: true, expireAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(fees);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/breakaway-fees/:id/mark-paid', async (req, res) => {
  try {
    const fee = await prisma.breakawayFee.update({
      where: { id: parseInt(req.params.id, 10) },
      data: { status: 'PAID' },
    });
    res.json(fee);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
