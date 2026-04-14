const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const { calculateCtvCommission } = require('../services/commission');
const { calculateTax } = require('../services/taxEngine');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);

/**
 * GET /api/ctv/monthly-report?month=YYYY-MM
 * Returns a comprehensive personal monthly report for a CTV, including
 * personal revenue, team revenue, training fees received/paid, tax, and invoices.
 */
router.get('/ctv/monthly-report', authorize('ctv'), async (req, res) => {
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

    // Fees received (invoices where user is the trainer/toUser)
    const feeReceivedInvoices = await prisma.invoice.findMany({
      where: {
        toUserId: userId,
        issuedAt: { gte: startDate, lt: endDate },
      },
    });
    const feeReceived = feeReceivedInvoices.reduce((sum, i) => sum + i.amount, 0);

    // Fees paid (invoices where user is trainee/fromUser)
    const feePaidInvoices = await prisma.invoice.findMany({
      where: {
        fromUserId: userId,
        issuedAt: { gte: startDate, lt: endDate },
      },
    });
    const feePaid = feePaidInvoices.reduce((sum, i) => sum + i.amount, 0);

    // Commission + tax
    const commission = await calculateCtvCommission(userId, month);
    const selfCommission = commission?.selfCommission || 0;
    const fixedSalary = commission?.fixedSalary || 0;
    const teamBonus = commission?.teamBonus || 0;

    // Net income = commission + salary + team bonus + fees received - fees paid
    const grossIncome = selfCommission + fixedSalary + teamBonus + feeReceived - feePaid;
    const taxResult = await calculateTax(userId, month);
    const tax = Math.floor(Math.max(0, grossIncome) * 0.10);
    const netAfterTax = grossIncome - tax;

    res.json({
      userId,
      month,
      personalRevenue,
      teamRevenue,
      selfCommission,
      fixedSalary,
      teamBonus,
      feeReceived,
      feePaid,
      netIncome: grossIncome,
      tax,
      netAfterTax,
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
