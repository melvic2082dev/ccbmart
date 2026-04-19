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

    // Personal revenue
    const personalTxns = await prisma.transaction.findMany({
      where: {
        ctvId: userId,
        channel: 'ctv',
        createdAt: { gte: startDate, lt: endDate },
      },
    });
    const personalRevenue = personalTxns.reduce((sum, t) => sum + t.totalAmount, 0);

    // Team revenue (downline direct + level 2)
    let teamRevenue = personalRevenue;
    const directReports = await prisma.user.findMany({
      where: { parentId: userId, role: 'ctv', isActive: true },
    });
    for (const f1 of directReports) {
      const f1Txns = await prisma.transaction.findMany({
        where: { ctvId: f1.id, channel: 'ctv', createdAt: { gte: startDate, lt: endDate } },
      });
      teamRevenue += f1Txns.reduce((sum, t) => sum + t.totalAmount, 0);

      const level2 = await prisma.user.findMany({
        where: { parentId: f1.id, role: 'ctv', isActive: true },
      });
      for (const f2 of level2) {
        const f2Txns = await prisma.transaction.findMany({
          where: { ctvId: f2.id, channel: 'ctv', createdAt: { gte: startDate, lt: endDate } },
        });
        teamRevenue += f2Txns.reduce((sum, t) => sum + t.totalAmount, 0);
      }
    }

    // Training/invoice fees (received/paid)
    const feeReceivedInvoices = await prisma.invoice.findMany({
      where: { toUserId: userId, issuedAt: { gte: startDate, lt: endDate } },
    });
    const trainingFeeReceived = feeReceivedInvoices.reduce((sum, i) => sum + i.amount, 0);

    const feePaidInvoices = await prisma.invoice.findMany({
      where: { fromUserId: userId, issuedAt: { gte: startDate, lt: endDate } },
    });
    const feePaid = feePaidInvoices.reduce((sum, i) => sum + i.amount, 0);

    // Commission
    const commission = await calculateCtvCommission(userId, month);
    const selfCommission = commission?.selfCommission || 0;
    const fixedSalary = commission?.fixedSalary || 0;
    const teamBonus = commission?.teamBonus || 0;
    const marketFundReceived = commission?.marketFund || 0;

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
    const tax = Math.floor(Math.max(0, totalIncome) * 0.10);
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
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
