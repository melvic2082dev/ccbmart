const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { calculateCtvCommission } = require('../services/commission');
const { getCachedOrCompute } = require('../services/cache');
const { getReceivedManagementFeesSummary, getTrainerMinutes, MIN_TRAINING_MINUTES_PER_MONTH } = require('../services/managementFee');
const { getReceivedBreakawayFeesSummary } = require('../services/breakaway');
const { validate, schemas } = require('../middleware/validate');

const router = express.Router();
const prisma = require('../lib/prisma');

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
          where: { ctvId: userId, channel: 'ctv', createdAt: { gte: startOfMonth }, status: 'CONFIRMED' },
          select: { totalAmount: true },
        }),
        prisma.transaction.findMany({
          where: {
            ctvId: userId,
            channel: 'ctv',
            createdAt: { gte: startOfLastMonth, lt: startOfMonth },
            status: 'CONFIRMED',
          },
          select: { totalAmount: true },
        }),
        prisma.customer.count({ where: { ctvId: userId } }),
        prisma.user.count({ where: { parentId: userId, role: 'ctv', isActive: true } }),
      ]);

      const currentRevenue = currentMonthTxns.reduce((sum, t) => sum + Number(t.totalAmount), 0);
      const currentCombos = currentMonthTxns.length;
      const lastRevenue = lastMonthTxns.reduce((sum, t) => sum + Number(t.totalAmount), 0);

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

      // KPI — monthly targets the CTV can act on.
      const kpi = await computeKpi(userId, monthStr, req.user.rank || 'CTV');

      // Monthly chart (6 months)
      const chartData = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const dEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        const txns = await prisma.transaction.findMany({
          where: { ctvId: userId, channel: 'ctv', createdAt: { gte: d, lt: dEnd }, status: 'CONFIRMED' },
          select: { totalAmount: true },
        });
        const revenue = txns.reduce((sum, t) => sum + Number(t.totalAmount), 0);
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
        kpi,
      };
    });

    res.json(dashboard);
  } catch (err) {
    console.error('[ctv]', err); res.status(500).json({ error: 'Internal server error' });
  }
});

async function computeKpi(userId, monthStr, rank) {
  // V13.4 spec — Chuong 7: combo-based thresholds.
  const startDate = new Date(`${monthStr}-01`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  const [directMembers, personalCombos, allDescendantIds, trainedMinutes] = await Promise.all([
    prisma.user.findMany({
      where: { parentId: userId, role: 'ctv', isActive: true },
      select: { id: true, rank: true },
    }),
    prisma.transaction.count({
      where: { ctvId: userId, channel: 'ctv', status: 'CONFIRMED', createdAt: { gte: startDate, lt: endDate } },
    }),
    getAllDescendantIds(userId),
    getTrainerMinutes(userId, monthStr),
  ]);

  const branchCombos = await prisma.transaction.count({
    where: {
      ctvId: { in: [...allDescendantIds, userId] },
      channel: 'ctv',
      status: 'CONFIRMED',
      createdAt: { gte: startDate, lt: endDate },
    },
  });

  // Maintenance — what user must hit this month to keep current rank/payouts.
  // CTV has no monthly minimum (only "đã mua 1 combo" to activate, not tracked here).
  const maintenance = { rank, requirements: [] };
  if (rank !== 'CTV') {
    maintenance.requirements.push({ label: 'Combo cá nhân', current: personalCombos, target: 50 });
  }
  if (rank === 'TP') {
    maintenance.requirements.push({ label: 'Combo nhóm', current: branchCombos, target: 150 });
  } else if (rank === 'GDV') {
    maintenance.requirements.push({ label: 'Combo nhóm', current: branchCombos, target: 550 });
  } else if (rank === 'GDKD') {
    maintenance.requirements.push({ label: 'Combo nhóm', current: branchCombos, target: 2000 });
  }
  if (rank !== 'CTV') {
    maintenance.requirements.push({
      label: 'Đào tạo (giờ)',
      current: Math.round(trainedMinutes / 60 * 10) / 10,
      target: MIN_TRAINING_MINUTES_PER_MONTH / 60,
    });
  }

  // Promotion — what user needs to LEVEL UP to next rank this month.
  let promotion = null;
  if (rank === 'CTV') {
    promotion = {
      targetRank: 'PP',
      requirements: [
        { label: 'Combo cá nhân', current: personalCombos, target: 50 },
      ],
    };
  } else if (rank === 'PP') {
    const directCtv = directMembers.filter(m => (m.rank || 'CTV') === 'CTV').length;
    promotion = {
      targetRank: 'TP',
      requirements: [
        { label: 'Combo cá nhân', current: personalCombos, target: 50 },
        { label: 'CTV trực tiếp', current: directCtv, target: 10 },
        { label: 'Combo nhóm', current: branchCombos, target: 150 },
      ],
    };
  } else if (rank === 'TP') {
    const directPpTp = directMembers.filter(m => m.rank === 'PP' || m.rank === 'TP').length;
    promotion = {
      targetRank: 'GDV',
      requirements: [
        { label: 'Combo cá nhân', current: personalCombos, target: 50 },
        { label: 'PP/TP trực tiếp', current: directPpTp, target: 10 },
        { label: 'Combo nhóm', current: branchCombos, target: 550 },
      ],
      note: 'Cần duy trì 3 tháng liên tiếp',
    };
  } else if (rank === 'GDV') {
    const directTpGdv = directMembers.filter(m => m.rank === 'TP' || m.rank === 'GDV').length;
    promotion = {
      targetRank: 'GDKD',
      requirements: [
        { label: 'Combo cá nhân', current: personalCombos, target: 50 },
        { label: 'TP/GĐV trực tiếp', current: directTpGdv, target: 10 },
        { label: 'Combo nhóm', current: branchCombos, target: 2000 },
      ],
      note: 'Cần duy trì 3 tháng liên tiếp + chuyển HĐLĐ sau 3 tháng',
    };
  }
  // GDKD: top rank — no promotion target.

  return { maintenance, promotion };
}

async function getAllDescendantIds(rootId) {
  const ids = [];
  const queue = [rootId];
  while (queue.length) {
    const batch = queue.splice(0, queue.length);
    const children = await prisma.user.findMany({
      where: { parentId: { in: batch }, role: 'ctv', isActive: true },
      select: { id: true },
    });
    for (const c of children) {
      ids.push(c.id);
      queue.push(c.id);
    }
  }
  return ids;
}

// Each node carries selfCombos (this user's CONFIRMED ctv transactions in
// the current month) and teamCombos (selfCombos summed over the user + all
// descendants). Tree depth capped at 4 below the requesting user for
// readability; the team count is computed over the full tree.
router.get('/tree', async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const cacheKey = `ctv:tree:${userId}:${monthKey}`;

    const tree = await getCachedOrCompute(cacheKey, 300, async () => {
      const [allCtv, monthTxnCounts] = await Promise.all([
        prisma.user.findMany({
          where: { role: 'ctv', isActive: true },
          select: { id: true, name: true, rank: true, email: true, phone: true, parentId: true },
        }),
        prisma.transaction.groupBy({
          by: ['ctvId'],
          where: { channel: 'ctv', status: 'CONFIRMED', createdAt: { gte: startOfMonth } },
          _count: { id: true },
        }),
      ]);

      const selfCombosMap = new Map(monthTxnCounts.map(t => [t.ctvId, t._count.id]));

      const childrenMap = new Map();
      const nodeMap = new Map();
      for (const ctv of allCtv) {
        nodeMap.set(ctv.id, ctv);
        if (ctv.parentId !== null) {
          if (!childrenMap.has(ctv.parentId)) childrenMap.set(ctv.parentId, []);
          childrenMap.get(ctv.parentId).push(ctv.id);
        }
      }

      const teamCombosMap = new Map();
      function computeTeam(id) {
        if (teamCombosMap.has(id)) return teamCombosMap.get(id);
        let total = selfCombosMap.get(id) || 0;
        for (const childId of (childrenMap.get(id) || [])) total += computeTeam(childId);
        teamCombosMap.set(id, total);
        return total;
      }

      function buildSubtree(id, depth = 0) {
        if (depth > 4) return [];
        const childIds = childrenMap.get(id) || [];
        return childIds.map(childId => {
          const child = nodeMap.get(childId);
          return {
            id: child.id,
            name: child.name,
            rank: child.rank,
            email: child.email,
            phone: child.phone,
            selfCombos: selfCombosMap.get(child.id) || 0,
            teamCombos: computeTeam(child.id),
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
        selfCombos: selfCombosMap.get(userId) || 0,
        teamCombos: computeTeam(userId),
        children: buildSubtree(userId),
      };
    });

    res.json(tree);
  } catch (err) {
    console.error('[ctv]', err); res.status(500).json({ error: 'Internal server error' });
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
    console.error('[ctv]', err); res.status(500).json({ error: 'Internal server error' });
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
    console.error('[ctv]', err); res.status(500).json({ error: 'Internal server error' });
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
    console.error('[ctv]', err); res.status(500).json({ error: 'Internal server error' });
  }
});

// C12.4: Breakaway fees received (giai đoạn 1)
router.get('/breakaway-fees', validate(schemas.monthQuery, 'query'), async (req, res) => {
  try {
    const now = new Date();
    const month = req.query.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Eligible = user has ever appeared as a recipient of a breakaway fee (any month, any status).
    const everReceived = await prisma.breakawayFee.count({ where: { toUserId: req.user.id } });
    const eligible = everReceived > 0;

    if (!eligible) {
      return res.json({
        month,
        eligible: false,
        summary: { level1: 0, level2: 0, level3: 0, total: 0 },
        records: [],
      });
    }

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
      eligible: true,
      summary: {
        level1: summary.level1,
        level2: summary.level2,
        level3: summary.level3,
        total: summary.total,
      },
      records: detailed,
    });
  } catch (err) {
    console.error('[ctv]', err); res.status(500).json({ error: 'Internal server error' });
  }
});

// Products — never expose cogsPct (business-secret; admin-only).
router.get('/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      select: { id: true, name: true, category: true, price: true, unit: true },
      orderBy: { category: 'asc' },
    });
    res.json(products);
  } catch (err) {
    console.error('[ctv]', err); res.status(500).json({ error: 'Internal server error' });
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
    console.error('[ctv]', err); res.status(500).json({ error: 'Internal server error' });
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
    console.error('[ctv]', err); res.status(500).json({ error: 'Internal server error' });
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
    console.error('[ctv]', err); res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
