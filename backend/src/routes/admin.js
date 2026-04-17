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
const { calculateMonthlyManagementFees } = require('../services/managementFee');
const { processMonthlyBreakawayFees } = require('../services/breakaway');

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
        memberWallet: { select: { id: true, balance: true, points: true, totalSpent: true, referralCode: true, tier: { select: { name: true } } } },
        _count: { select: { transactions: true, customers: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Current-month training hours: sum VERIFIED logs where user is trainee
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const trainingThisMonth = await prisma.trainingLog.groupBy({
      by: ['traineeId'],
      where: {
        status: 'VERIFIED',
        sessionDate: { gte: startOfMonth },
      },
      _sum: { durationMinutes: true },
    });
    const hoursByCtv = new Map(
      trainingThisMonth.map(t => [t.traineeId, Math.round((t._sum.durationMinutes || 0) / 60 * 10) / 10])
    );

    const result = ctvs.map(ctv => ({
      id: ctv.id,
      name: ctv.name,
      email: ctv.email,
      phone: ctv.phone,
      rank: ctv.rank,
      isActive: ctv.isActive,
      status: ctv.isActive ? 'active' : 'inactive',
      parentId: ctv.parentId,
      parent: ctv.parent,
      parentName: ctv.parent?.name ?? null,
      childrenCount: ctv.children.length,
      f1Count: ctv.children.length,
      transactions: ctv._count.transactions,
      transactionCount: ctv._count.transactions,
      customers: ctv._count.customers,
      customerCount: ctv._count.customers,
      currentMonthTrainingHours: hoursByCtv.get(ctv.id) || 0,
      requiredTrainingHours: 20,
      // Member capability (multi-role)
      isMember: ctv.isMember,
      memberWallet: ctv.memberWallet
        ? {
            tier: ctv.memberWallet.tier?.name || 'BASIC',
            balance: ctv.memberWallet.balance,
            points: ctv.memberWallet.points,
            totalSpent: ctv.memberWallet.totalSpent,
            referralCode: ctv.memberWallet.referralCode,
          }
        : null,
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

// Reassign CTV (with circular reference validation + audit trail)
router.post('/ctv/:id/reassign', validate(schemas.reassignCtv), async (req, res) => {
  try {
    const { newParentId, reason } = req.body;
    const ctvId = parseInt(req.params.id);

    // Validate reassignment
    const validation = await validateReassignment(ctvId, newParentId);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const before = await prisma.user.findUnique({
      where: { id: ctvId },
      include: { parent: { select: { name: true } } },
    });
    if (!before) return res.status(404).json({ error: 'CTV not found' });

    const newParent = newParentId
      ? await prisma.user.findUnique({ where: { id: newParentId }, select: { name: true } })
      : null;

    await prisma.user.update({
      where: { id: ctvId },
      data: { parentId: newParentId },
    });

    // Audit log (RankHistory repurposed)
    await prisma.rankHistory.create({
      data: {
        ctvId,
        oldRank: before.rank || 'CTV',
        newRank: before.rank || 'CTV',
        reason: `Reassign: ${before.parent?.name || '(root)'} → ${newParent?.name || '(root)'}${reason ? ' · ' + reason : ''}`,
        changedBy: req.user.name,
      },
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

// Create CTV manually (admin-only onboarding for offline signups)
router.post('/ctv', validate(schemas.createCtv), async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const { name, email, phone, rank, parentId, password } = req.body;

    // Email uniqueness is enforced by DB; return 409 on conflict
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email đã tồn tại' });

    // Validate parent exists + is CTV (if provided)
    if (parentId) {
      const parent = await prisma.user.findUnique({ where: { id: parentId } });
      if (!parent || parent.role !== 'ctv') {
        return res.status(400).json({ error: 'Người quản lý không hợp lệ' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const ctv = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'ctv',
        name,
        phone: phone || null,
        rank,
        parentId: parentId || null,
      },
    });

    // Build hierarchy records (F1/F2/F3) if parent exists
    if (parentId) {
      await prisma.ctvHierarchy.create({
        data: { ctvId: ctv.id, managerId: parentId, level: 'F1' },
      });
      const parent = await prisma.user.findUnique({ where: { id: parentId } });
      if (parent?.parentId) {
        await prisma.ctvHierarchy.create({
          data: { ctvId: ctv.id, managerId: parent.parentId, level: 'F2' },
        });
        const grand = await prisma.user.findUnique({ where: { id: parent.parentId } });
        if (grand?.parentId) {
          await prisma.ctvHierarchy.create({
            data: { ctvId: ctv.id, managerId: grand.parentId, level: 'F3' },
          });
        }
      }
    }

    await invalidateCache('admin:ctv-tree');
    res.status(201).json({ success: true, ctv: { id: ctv.id, email: ctv.email, name: ctv.name, rank: ctv.rank } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk send notifications to a list of users (admin broadcast)
router.post('/notifications/bulk', validate(schemas.bulkNotify), async (req, res) => {
  try {
    const { userIds, title, content, type } = req.body;

    // Validate all target users exist + are CTV or agency
    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, isActive: true },
      select: { id: true },
    });
    if (users.length === 0) {
      return res.status(400).json({ error: 'Không tìm thấy người nhận hợp lệ' });
    }

    await prisma.notification.createMany({
      data: users.map(u => ({
        userId: u.id,
        type,
        title,
        content,
        metadata: JSON.stringify({ sentBy: req.user.name, at: new Date().toISOString() }),
      })),
    });

    res.json({ success: true, sent: users.length, skipped: userIds.length - users.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle active / deactivate CTV
router.post('/ctv/:id/toggle-active', validate(schemas.toggleActiveCtv), async (req, res) => {
  try {
    const ctvId = parseInt(req.params.id);
    const { isActive, reason } = req.body;

    const ctv = await prisma.user.findUnique({ where: { id: ctvId } });
    if (!ctv || ctv.role !== 'ctv') return res.status(404).json({ error: 'CTV not found' });

    await prisma.user.update({
      where: { id: ctvId },
      data: { isActive },
    });

    // Audit via RankHistory (repurposed as audit trail)
    await prisma.rankHistory.create({
      data: {
        ctvId,
        oldRank: ctv.rank || 'CTV',
        newRank: ctv.rank || 'CTV',
        reason: `${isActive ? 'Kích hoạt' : 'Ngừng hoạt động'}: ${reason || '(không có lý do)'}`,
        changedBy: req.user.name,
      },
    });

    await invalidateCache('admin:ctv-tree');
    res.json({ success: true, isActive });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CTV detail (profile + KPI history + rank history + recent commissions summary)
router.get('/ctv/:id/details', async (req, res) => {
  try {
    const ctvId = parseInt(req.params.id);
    const ctv = await prisma.user.findUnique({
      where: { id: ctvId },
      include: {
        parent: { select: { id: true, name: true, rank: true, email: true } },
        children: { select: { id: true, name: true, rank: true }, where: { role: 'ctv' } },
        memberWallet: {
          include: {
            tier: { select: { name: true, pointsRate: true } },
            deposits: { orderBy: { createdAt: 'desc' }, take: 10 },
          },
        },
        referralsGiven: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { referee: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { transactions: true, customers: true } },
      },
    });
    if (!ctv || ctv.role !== 'ctv') return res.status(404).json({ error: 'CTV not found' });

    // 6-month window for training summary
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [kpiLogs, rankHistory, trainingLogs, trainingForSummary, mgmtFees, transactionsAgg] = await Promise.all([
      prisma.kpiLog.findMany({
        where: { ctvId },
        orderBy: { month: 'desc' },
        take: 12,
      }),
      prisma.rankHistory.findMany({
        where: { ctvId },
        orderBy: { changedAt: 'desc' },
        take: 20,
      }),
      prisma.trainingLog.findMany({
        where: { OR: [{ trainerId: ctvId }, { traineeId: ctvId }] },
        orderBy: { sessionDate: 'desc' },
        take: 10,
        include: {
          trainer: { select: { name: true, rank: true } },
          trainee: { select: { name: true, rank: true } },
        },
      }),
      // All VERIFIED logs where this CTV is trainee (for 20h/month rule)
      prisma.trainingLog.findMany({
        where: {
          traineeId: ctvId,
          status: 'VERIFIED',
          sessionDate: { gte: sixMonthsAgo },
        },
        select: { sessionDate: true, durationMinutes: true },
      }),
      prisma.managementFee.findMany({
        where: { toUserId: ctvId },
        orderBy: { month: 'desc' },
        take: 6,
      }),
      prisma.transaction.aggregate({
        where: { ctvId },
        _sum: { totalAmount: true },
        _count: true,
      }),
    ]);

    // Build monthly training summary: 6 months back, aggregating VERIFIED trainee logs
    const REQUIRED_HOURS = 20;
    const monthlyMinutes = new Map();
    for (const log of trainingForSummary) {
      const d = new Date(log.sessionDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMinutes.set(key, (monthlyMinutes.get(key) || 0) + log.durationMinutes);
    }

    const trainingSummary = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const minutes = monthlyMinutes.get(month) || 0;
      const hours = Math.round((minutes / 60) * 10) / 10;
      const status = hours === 0 ? 'MISSING' : hours >= REQUIRED_HOURS ? 'OK' : 'SHORT';
      trainingSummary.push({
        month,
        hours,
        requiredHours: REQUIRED_HOURS,
        status,
        consequence: status === 'OK'
          ? null
          : 'Không đủ điều kiện nhận Thù lao DV duy trì tháng sau',
      });
    }

    // Consecutive missing/short months (from most recent backward, excluding current month if empty)
    let consecutiveBad = 0;
    for (let i = trainingSummary.length - 1; i >= 0; i--) {
      if (trainingSummary[i].status !== 'OK') consecutiveBad++;
      else break;
    }
    const trainingAlert = consecutiveBad >= 2
      ? `Thiếu log đào tạo ${consecutiveBad} tháng liên tiếp — đề xuất tạm dừng quyền khai thác DV`
      : null;

    res.json({
      profile: {
        id: ctv.id,
        name: ctv.name,
        email: ctv.email,
        phone: ctv.phone,
        rank: ctv.rank,
        isActive: ctv.isActive,
        isBusinessHousehold: ctv.isBusinessHousehold,
        kycStatus: ctv.kycStatus,
        createdAt: ctv.createdAt,
        parent: ctv.parent,
        f1Count: ctv.children.length,
        transactionCount: ctv._count.transactions,
        customerCount: ctv._count.customers,
        totalRevenue: transactionsAgg._sum.totalAmount || 0,
      },
      kpiLogs,
      rankHistory,
      trainingLogs,
      trainingSummary,
      trainingAlert,
      managementFees: mgmtFees,
      // Member activity tab
      memberActivity: ctv.memberWallet
        ? {
            isMember: true,
            tier: ctv.memberWallet.tier?.name || 'BASIC',
            pointsRate: ctv.memberWallet.tier?.pointsRate || 0.01,
            balance: ctv.memberWallet.balance,
            points: ctv.memberWallet.points,
            referralCode: ctv.memberWallet.referralCode,
            totalDeposited: ctv.memberWallet.totalDeposited,
            totalSpent: ctv.memberWallet.totalSpent,
            deposits: ctv.memberWallet.deposits,
            referralsGiven: ctv.referralsGiven,
          }
        : { isMember: false },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export CTV list to Excel
router.get('/ctv/export', async (req, res) => {
  try {
    const ExcelJS = require('exceljs');
    const ctvs = await prisma.user.findMany({
      where: { role: 'ctv' },
      include: {
        parent: { select: { name: true, rank: true } },
        children: { select: { id: true }, where: { role: 'ctv' } },
        _count: { select: { transactions: true, customers: true } },
      },
      orderBy: [{ rank: 'asc' }, { createdAt: 'asc' }],
    });

    // Current & previous month keys
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

    // Current month revenue per CTV
    const monthlyTxns = await prisma.transaction.groupBy({
      by: ['ctvId'],
      where: { createdAt: { gte: startOfMonth }, ctvId: { not: null } },
      _sum: { totalAmount: true },
    });
    const revByCtv = new Map(monthlyTxns.map(t => [t.ctvId, t._sum.totalAmount || 0]));

    // Previous month management fees (F1/F2/F3) per CTV
    const prevMgmtFees = await prisma.managementFee.groupBy({
      by: ['toUserId'],
      where: { month: prevMonthStr },
      _sum: { amount: true },
    });
    const mgmtFeeByCtv = new Map(prevMgmtFees.map(m => [m.toUserId, m._sum.amount || 0]));

    // Previous month "Thù lao DV duy trì" — fixed salary from CommissionConfig if rank is PP/TP/GDV/GDKD
    const commissionConfigs = await prisma.commissionConfig.findMany();
    const fixedSalaryByRank = new Map(commissionConfigs.map(c => [c.tier, c.fixedSalary || 0]));

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Danh sách CTV');
    ws.columns = [
      { header: 'ID',            key: 'id',           width: 6 },
      { header: 'Họ tên',         key: 'name',         width: 28 },
      { header: 'Email',          key: 'email',        width: 28 },
      { header: 'SĐT',            key: 'phone',        width: 14 },
      { header: 'Rank',           key: 'rank',         width: 8 },
      { header: 'Người quản lý',  key: 'parent',       width: 26 },
      { header: 'Số F1',          key: 'f1',           width: 8 },
      { header: 'Giao dịch',      key: 'txnCount',     width: 10 },
      { header: 'Khách hàng',     key: 'custCount',    width: 11 },
      { header: 'Doanh số tháng', key: 'monthRev',     width: 18 },
      { header: 'Trạng thái',     key: 'status',       width: 12 },
      { header: 'Ngày tham gia',  key: 'createdAt',    width: 14 },
      { header: `Thù lao DV duy trì (${prevMonthStr})`, key: 'prevSalary',  width: 22 },
      { header: `Phí QL F1/F2/F3 (${prevMonthStr})`,    key: 'prevMgmtFee', width: 22 },
      { header: `Tổng thu nhập (${prevMonthStr})`,      key: 'prevTotal',   width: 22 },
    ];
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };

    for (const c of ctvs) {
      const prevSalary = fixedSalaryByRank.get(c.rank) || 0;
      const prevMgmtFee = mgmtFeeByCtv.get(c.id) || 0;
      ws.addRow({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone || '',
        rank: c.rank || '',
        parent: c.parent?.name || '',
        f1: c.children.length,
        txnCount: c._count.transactions,
        custCount: c._count.customers,
        monthRev: revByCtv.get(c.id) || 0,
        status: c.isActive ? 'Hoạt động' : 'Dừng',
        createdAt: c.createdAt.toISOString().slice(0, 10),
        prevSalary,
        prevMgmtFee,
        prevTotal: prevSalary + prevMgmtFee,
      });
    }
    ws.getColumn('monthRev').numFmt = '#,##0';
    ws.getColumn('prevSalary').numFmt = '#,##0';
    ws.getColumn('prevMgmtFee').numFmt = '#,##0';
    ws.getColumn('prevTotal').numFmt = '#,##0';

    const buf = await wb.xlsx.writeBuffer();
    const filename = `ctv-list-${now.toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(buf));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Agencies (optimized with _count)
// Helpers for agency analytics (P0/P1/P2)
function classifyAgencyTier(monthlyRevenue) {
  if (monthlyRevenue >= 500_000_000) return 'KIM_CUONG';
  if (monthlyRevenue >= 200_000_000) return 'VANG';
  if (monthlyRevenue >= 50_000_000)  return 'BAC';
  return 'DONG';
}

function extractRegion(address) {
  if (!address) return 'Khác';
  const s = String(address).toLowerCase();
  if (/tp\.?\s*hcm|ho chi minh|tp\.?\s*hồ|hồ chí minh/.test(s)) return 'TP.HCM';
  if (/hà nội|ha noi|hn/.test(s)) return 'Hà Nội';
  if (/đà nẵng|da nang/.test(s)) return 'Đà Nẵng';
  if (/cần thơ|can tho/.test(s)) return 'Cần Thơ';
  return 'Khác';
}

router.get('/agencies', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

    const agencies = await prisma.agency.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        inventoryWarnings: { include: { product: true } },
        _count: { select: { transactions: true } },
      },
    });

    const agencyIds = agencies.map(a => a.id);

    // Batch aggregate: totalRevenue, this-month revenue, prev-month revenue, 30d revenue
    const [totalRev, monthRev, prevMonthRev, last30Rev, inventoryWarningCount] = await Promise.all([
      prisma.transaction.groupBy({
        by: ['agencyId'],
        where: { agencyId: { in: agencyIds } },
        _sum: { totalAmount: true },
      }),
      prisma.transaction.groupBy({
        by: ['agencyId'],
        where: { agencyId: { in: agencyIds }, createdAt: { gte: startOfMonth } },
        _sum: { totalAmount: true },
      }),
      prisma.transaction.groupBy({
        by: ['agencyId'],
        where: { agencyId: { in: agencyIds }, createdAt: { gte: startOfPrevMonth, lt: startOfMonth } },
        _sum: { totalAmount: true },
      }),
      prisma.transaction.groupBy({
        by: ['agencyId'],
        where: { agencyId: { in: agencyIds }, createdAt: { gte: thirtyDaysAgo } },
        _sum: { totalAmount: true, cogsAmount: true },
        _count: true,
      }),
      Promise.resolve(null),
    ]);

    const toMap = (rows, key = 'totalAmount') => new Map(rows.map(r => [r.agencyId, r._sum[key] || 0]));
    const mTotal = toMap(totalRev);
    const mMonth = toMap(monthRev);
    const mPrev  = toMap(prevMonthRev);
    const m30    = toMap(last30Rev);
    const m30Count = new Map(last30Rev.map(r => [r.agencyId, r._count || 0]));

    const result = agencies.map(a => {
      const monthlyRevenue = mMonth.get(a.id) || 0;
      const prevMonthlyRev = mPrev.get(a.id) || 0;
      // Mock inventory values deterministically from deposit + warnings
      // (production would query a real Inventory table)
      const depositAmount = a.depositAmount;
      const receivedValue    = Math.round(depositAmount * 1.8);              // hàng đã nhận (tích luỹ)
      const soldValue        = Math.round((mTotal.get(a.id) || 0) * 0.6);    // hàng đã bán (COGS-ish approx)
      const currentInventory = Math.max(0, receivedValue - soldValue);        // tồn kho hiện tại (VND)
      const creditRemaining  = Math.max(0, depositAmount - currentInventory * 0.3); // hạn mức còn lại

      // Low-stock count: warnings of type low_stock
      const lowStockWarnings = a.inventoryWarnings.filter(w => w.warningType === 'low_stock').length;

      return {
        id: a.id,
        userId: a.userId,
        name: a.name,
        depositAmount: a.depositAmount,
        depositTier: a.depositTier,
        address: a.address,
        region: extractRegion(a.address),
        user: a.user,
        inventoryWarnings: a.inventoryWarnings,
        warningCount: a.inventoryWarnings.length,
        lowStockCount: lowStockWarnings,
        transactions: a._count.transactions,
        totalRevenue: mTotal.get(a.id) || 0,
        monthlyRevenue,
        prevMonthlyRev,
        last30dRevenue: m30.get(a.id) || 0,
        last30dTxnCount: m30Count.get(a.id) || 0,
        currentInventory,
        receivedValue,
        soldValue,
        creditRemaining,
        rankTier: classifyAgencyTier(monthlyRevenue),
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Agency detail — finance + inventory breakdown
router.get('/agencies/:id/details', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

    const agency = await prisma.agency.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        inventoryWarnings: { include: { product: true }, orderBy: { expiryDate: 'asc' } },
      },
    });
    if (!agency) return res.status(404).json({ error: 'Không tìm thấy đại lý' });

    const [totalAgg, monthAgg] = await Promise.all([
      prisma.transaction.aggregate({
        where: { agencyId: id },
        _sum: { totalAmount: true, cogsAmount: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: { agencyId: id, createdAt: { gte: startOfMonth } },
        _sum: { totalAmount: true },
      }),
    ]);

    const totalRev = totalAgg._sum.totalAmount || 0;
    const monthRev = monthAgg._sum.totalAmount || 0;
    const receivedValue    = Math.round(agency.depositAmount * 1.8);
    const soldValue        = Math.round(totalRev * 0.6);
    const currentInventory = Math.max(0, receivedValue - soldValue);
    const creditRemaining  = Math.max(0, agency.depositAmount - currentInventory * 0.3);

    // 30-day sales velocity per product (for restock suggestion)
    const velocity = await prisma.transactionItem.groupBy({
      by: ['productId'],
      where: {
        transaction: { agencyId: id, createdAt: { gte: thirtyDaysAgo } },
      },
      _sum: { quantity: true },
    });
    const products = await prisma.product.findMany({
      where: { id: { in: velocity.map(v => v.productId) } },
    });
    const productById = new Map(products.map(p => [p.id, p]));
    const velocityList = velocity
      .map(v => ({
        product: productById.get(v.productId),
        soldQty: v._sum.quantity || 0,
        dailyAvg: Math.round(((v._sum.quantity || 0) / 30) * 100) / 100,
      }))
      .sort((a, b) => b.soldQty - a.soldQty);

    res.json({
      profile: {
        id: agency.id,
        name: agency.name,
        depositTier: agency.depositTier,
        address: agency.address,
        region: extractRegion(agency.address),
        user: agency.user,
      },
      finance: {
        depositAmount: agency.depositAmount,
        receivedValue,
        soldValue,
        currentInventory,
        creditRemaining,
        totalRevenue: totalRev,
        monthlyRevenue: monthRev,
        rankTier: classifyAgencyTier(monthRev),
      },
      warnings: agency.inventoryWarnings,
      velocity: velocityList,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Recent transactions (30 days by default)
router.get('/agencies/:id/transactions', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const days = Math.min(parseInt(req.query.days) || 30, 365);
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);

    const txns = await prisma.transaction.findMany({
      where: { agencyId: id, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true, phone: true } },
        items: { include: { product: { select: { name: true, unit: true } } } },
      },
    });

    res.json({ days, total: txns.length, transactions: txns });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Restock suggestions based on velocity + current stock (mock)
router.get('/agencies/:id/restock-suggestions', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

    const velocity = await prisma.transactionItem.groupBy({
      by: ['productId'],
      where: { transaction: { agencyId: id, createdAt: { gte: thirtyDaysAgo } } },
      _sum: { quantity: true },
    });
    const products = await prisma.product.findMany({
      where: { id: { in: velocity.map(v => v.productId) } },
    });
    const pById = new Map(products.map(p => [p.id, p]));

    // Suggestion: if daily sales > 0, suggest 14 days of stock (mock current stock = 3 days)
    const suggestions = velocity
      .map(v => {
        const product = pById.get(v.productId);
        if (!product) return null;
        const soldQty = v._sum.quantity || 0;
        const dailyAvg = soldQty / 30;
        const currentStockDays = 3; // mock: assume 3 days of stock on hand
        const targetStockDays = 14;
        const suggestQty = Math.max(0, Math.ceil(dailyAvg * (targetStockDays - currentStockDays)));
        if (suggestQty === 0) return null;
        return {
          product,
          soldLast30d: soldQty,
          dailyAvg: Math.round(dailyAvg * 100) / 100,
          currentStockDays,
          targetStockDays,
          suggestQty,
          estimatedCost: Math.round(suggestQty * product.price * product.cogsPct),
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.estimatedCost - a.estimatedCost);

    res.json({ suggestions, totalEstimate: suggestions.reduce((s, x) => s + x.estimatedCost, 0) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export agency transactions (30 days) to Excel
router.get('/agencies/:id/transactions/export', async (req, res) => {
  try {
    const ExcelJS = require('exceljs');
    const id = parseInt(req.params.id);
    const days = Math.min(parseInt(req.query.days) || 30, 365);
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);

    const [agency, txns] = await Promise.all([
      prisma.agency.findUnique({ where: { id }, include: { user: { select: { name: true } } } }),
      prisma.transaction.findMany({
        where: { agencyId: id, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, phone: true } },
          items: { include: { product: { select: { name: true } } } },
        },
      }),
    ]);
    if (!agency) return res.status(404).json({ error: 'Không tìm thấy đại lý' });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(`GD ${agency.name}`.slice(0, 31));
    ws.columns = [
      { header: 'Ngày',         key: 'date',     width: 18 },
      { header: 'Mã GD',        key: 'id',       width: 14 },
      { header: 'Khách hàng',    key: 'cust',     width: 24 },
      { header: 'SĐT',          key: 'phone',    width: 14 },
      { header: 'Sản phẩm',      key: 'items',    width: 50 },
      { header: 'Doanh thu',     key: 'revenue',  width: 16 },
      { header: 'Giá vốn',       key: 'cogs',     width: 16 },
      { header: 'Lợi nhuận',     key: 'profit',   width: 16 },
      { header: 'PT thanh toán', key: 'method',   width: 16 },
      { header: 'Trạng thái',    key: 'status',   width: 12 },
    ];
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };

    for (const t of txns) {
      ws.addRow({
        date: t.createdAt.toISOString().slice(0, 16).replace('T', ' '),
        id: `KV-${t.id}`,
        cust: t.customer?.name || '',
        phone: t.customer?.phone || '',
        items: t.items.map(i => `${i.product.name} x${i.quantity}`).join('; '),
        revenue: t.totalAmount,
        cogs: t.cogsAmount,
        profit: t.totalAmount - t.cogsAmount,
        method: t.paymentMethod || '—',
        status: t.status,
      });
    }
    ws.getColumn('revenue').numFmt = '#,##0';
    ws.getColumn('cogs').numFmt = '#,##0';
    ws.getColumn('profit').numFmt = '#,##0';

    const buf = await wb.xlsx.writeBuffer();
    const filename = `agency-${id}-txns-${days}d-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(buf));
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

// Update commission config (V12.1: F1/F2/F3 removed)
router.put('/config/commission/:tier', validate(schemas.updateCommission), async (req, res) => {
  try {
    const { selfSalePct, fixedSalary } = req.body;
    const config = await prisma.commissionConfig.update({
      where: { tier: req.params.tier },
      data: { selfSalePct, fixedSalary },
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

// Sync (via queue)
router.post('/sync', async (req, res) => {
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

// =====================================================================
// C12.4: Admin — Management fees (F1/F2/F3) & breakaway fees
// =====================================================================

// Trigger tính phí quản lý cho 1 tháng (recompute PENDING)
router.post('/management-fees/process-monthly', async (req, res) => {
  try {
    const { month } = req.body;
    if (!month) return res.status(400).json({ error: 'month required (YYYY-MM)' });
    const result = await calculateMonthlyManagementFees(month);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Xem toàn bộ phí quản lý theo tháng (+ filter level, status, user)
router.get('/management-fees', async (req, res) => {
  try {
    const { month, level, status, userId } = req.query;
    const where = {};
    if (month) where.month = month;
    if (level) where.level = parseInt(level);
    if (status) where.status = status;
    if (userId) where.toUserId = parseInt(userId);

    const records = await prisma.managementFee.findMany({
      where,
      include: {
        fromUser: { select: { id: true, name: true, rank: true, email: true } },
        toUser: { select: { id: true, name: true, rank: true, email: true } },
      },
      orderBy: [{ month: 'desc' }, { level: 'asc' }],
      take: 200,
    });

    const total = records.reduce((s, r) => s + r.amount, 0);
    const byLevel = { f1: 0, f2: 0, f3: 0 };
    for (const r of records) {
      if (r.level === 1) byLevel.f1 += r.amount;
      else if (r.level === 2) byLevel.f2 += r.amount;
      else if (r.level === 3) byLevel.f3 += r.amount;
    }

    res.json({ records, total, byLevel });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark a management fee as PAID
router.post('/management-fees/:id/mark-paid', async (req, res) => {
  try {
    const updated = await prisma.managementFee.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'PAID' },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger breakaway fee computation for 1 month
router.post('/breakaway/process-monthly', async (req, res) => {
  try {
    const { month } = req.body;
    if (!month) return res.status(400).json({ error: 'month required (YYYY-MM)' });
    const result = await processMonthlyBreakawayFees(month);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List breakaway logs (ACTIVE first, then EXPIRED)
router.get('/breakaway-logs', async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};
    const logs = await prisma.breakawayLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, rank: true, email: true } },
        oldParent: { select: { id: true, name: true, rank: true } },
        newParent: { select: { id: true, name: true, rank: true } },
      },
      orderBy: [{ status: 'asc' }, { breakawayAt: 'desc' }],
    });

    // Add monthsRemaining calc
    const now = new Date();
    const enriched = logs.map((l) => {
      const ms = l.expireAt.getTime() - now.getTime();
      const monthsRemaining = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24 * 30)));
      return { ...l, monthsRemaining };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List breakaway fee records
router.get('/breakaway-fees', async (req, res) => {
  try {
    const { month, level, status, userId } = req.query;
    const where = {};
    if (month) where.month = month;
    if (level) where.level = parseInt(level);
    if (status) where.status = status;
    if (userId) where.toUserId = parseInt(userId);

    const records = await prisma.breakawayFee.findMany({
      where,
      include: {
        fromUser: { select: { id: true, name: true, rank: true } },
        toUser: { select: { id: true, name: true, rank: true } },
        breakawayLog: true,
      },
      orderBy: [{ month: 'desc' }, { level: 'asc' }],
      take: 200,
    });

    const total = records.reduce((s, r) => s + r.amount, 0);
    const byLevel = { level1: 0, level2: 0, level3: 0 };
    for (const r of records) {
      if (r.level === 1) byLevel.level1 += r.amount;
      else if (r.level === 2) byLevel.level2 += r.amount;
      else if (r.level === 3) byLevel.level3 += r.amount;
    }

    res.json({ records, total, byLevel });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/breakaway-fees/:id/mark-paid', async (req, res) => {
  try {
    const updated = await prisma.breakawayFee.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'PAID' },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
