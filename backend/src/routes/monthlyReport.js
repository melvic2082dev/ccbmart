const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { calculateCtvCommission } = require('../services/commission');
const { calculateTax } = require('../services/taxEngine');
const { getReceivedManagementFeesSummary } = require('../services/managementFee');
const { getReceivedBreakawayFeesSummary } = require('../services/breakaway');
const { validate, schemas } = require('../middleware/validate');

const router = express.Router();
const prisma = require('../lib/prisma');

router.use(authenticate);

/**
 * GET /api/ctv/monthly-report?month=YYYY-MM
 * C12.4: comprehensive personal monthly report including:
 *   personalRevenue, teamRevenue,
 *   selfCommission, fixedSalary, teamBonus,
 *   managementFeeReceived { f1, f2, f3 },       (C12.4)
 *   breakawayFeeReceived  { level1, level2 },   (C12.4)
 *   marketFundReceived, trainingFeeReceived,
 *   totalIncome, tax, netIncome, invoiceLinks
 *
 * Nguyên tắc tài chính: TẤT CẢ khoản thù lao/HH/phí đều do CCB Mart chi
 * trả từ doanh thu bán hàng. Không có chuyển tiền trực tiếp giữa đối tác.
 */
router.get('/ctv/monthly-report', authorize('ctv'), validate(schemas.monthlyReportQuery, 'query'), async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const month = req.query.month || defaultMonth;

    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // Build hierarchy map once — avoids N+1 queries
    const allCtvsInTree = await prisma.user.findMany({
      where: { role: 'ctv', isActive: true },
      select: { id: true, parentId: true },
    });
    const childrenMap = new Map();
    for (const ctv of allCtvsInTree) {
      if (ctv.parentId !== null) {
        if (!childrenMap.has(ctv.parentId)) childrenMap.set(ctv.parentId, []);
        childrenMap.get(ctv.parentId).push(ctv.id);
      }
    }

    const directIds = childrenMap.get(userId) || [];
    const level2Ids = directIds.flatMap(id => childrenMap.get(id) || []);
    const allRelevantIds = [userId, ...directIds, ...level2Ids];

    // Single batch query for all team transactions
    const [allTeamTxns, feeReceivedInvoices, feePaidInvoices] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          ctvId: { in: allRelevantIds },
          channel: 'ctv',
          status: 'CONFIRMED',
          createdAt: { gte: startDate, lt: endDate },
        },
        select: { ctvId: true, totalAmount: true },
      }),
      prisma.invoice.findMany({
        where: { toUserId: userId, issuedAt: { gte: startDate, lt: endDate } },
      }),
      prisma.invoice.findMany({
        where: { fromUserId: userId, issuedAt: { gte: startDate, lt: endDate } },
      }),
    ]);

    const revenueMap = new Map();
    for (const txn of allTeamTxns) {
      revenueMap.set(txn.ctvId, (revenueMap.get(txn.ctvId) || 0) + Number(txn.totalAmount));
    }

    const personalRevenue = revenueMap.get(userId) || 0;
    const teamRevenue = allRelevantIds.reduce((sum, id) => sum + (revenueMap.get(id) || 0), 0);

    const trainingFeeReceived = feeReceivedInvoices.reduce((sum, i) => sum + Number(i.amount), 0);
    const feePaid = feePaidInvoices.reduce((sum, i) => sum + Number(i.amount), 0);

    // Commission
    const commission = await calculateCtvCommission(userId, month);
    const selfCommission = commission?.selfCommission || 0;
    const fixedSalary = commission?.fixedSalary || 0;
    // TODO: integrate when team bonus table is calculated (not in commission service yet)
    const teamBonus = 0;
    // TODO: integrate when market fund table is calculated (not in commission service yet)
    const marketFundReceived = 0;

    // C12.4: Management fees received (F1/F2/F3)
    const mgmtSummary = await getReceivedManagementFeesSummary(userId, month);
    const managementFeeReceived = {
      f1: mgmtSummary.f1,
      f2: mgmtSummary.f2,
      f3: mgmtSummary.f3,
      total: mgmtSummary.total,
    };

    // C12.4: Breakaway fees received (giai đoạn 1)
    const breakSummary = await getReceivedBreakawayFeesSummary(userId, month);
    const breakawayFeeReceived = {
      level1: breakSummary.level1,
      level2: breakSummary.level2,
      level3: breakSummary.level3,
      total: breakSummary.total,
    };

    // Total income (CCB Mart trả tất cả)
    const totalIncome =
      selfCommission +
      fixedSalary +
      teamBonus +
      managementFeeReceived.total +
      breakawayFeeReceived.total +
      marketFundReceived +
      trainingFeeReceived -
      feePaid;

    const taxResult = await calculateTax(userId, month);
    const tax = taxResult.taxAmount;
    const netIncome = totalIncome - tax;

    res.json({
      userId,
      month,
      personalRevenue,
      teamRevenue,
      selfCommission,
      fixedSalary,
      managementFeeReceived,
      breakawayFeeReceived,
      marketFundReceived,
      trainingFeeReceived,
      teamBonus,
      feePaid,
      totalIncome,
      tax,
      netIncome,
      taxableIncome: taxResult.taxableIncome,
      invoiceLinks: [
        ...feeReceivedInvoices.map((i) => ({
          id: i.id,
          invoiceNumber: i.invoiceNumber,
          amount: i.amount,
          type: 'received',
          pdfUrl: i.pdfUrl,
        })),
        ...feePaidInvoices.map((i) => ({
          id: i.id,
          invoiceNumber: i.invoiceNumber,
          amount: i.amount,
          type: 'paid',
          pdfUrl: i.pdfUrl,
        })),
      ],
    });
  } catch (err) {
    console.error('[monthlyReport]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
