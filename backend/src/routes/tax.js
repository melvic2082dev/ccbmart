const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const { processMonthlyTax, generateTaxReport, calculateTax } = require('../services/taxEngine');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);

// GET /api/admin/tax — list tax records by month
router.get('/admin/tax', authorize('admin'), async (req, res) => {
  try {
    const { month, status } = req.query;
    const where = {};
    if (month) where.month = month;
    if (status) where.status = status;

    const records = await prisma.taxRecord.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, rank: true, isBusinessHousehold: true },
        },
      },
      orderBy: { month: 'desc' },
      take: 200,
    });

    const totalTax = records.reduce((sum, r) => sum + r.taxAmount, 0);
    const totalIncome = records.reduce((sum, r) => sum + r.taxableIncome, 0);

    res.json({ records, totalTax, totalIncome, count: records.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/tax/process — trigger tax calculation for a month
router.post('/admin/tax/process', authorize('admin'), async (req, res) => {
  try {
    const { month } = req.body;
    if (!month) return res.status(400).json({ error: 'month (YYYY-MM) is required' });
    const result = await processMonthlyTax(month);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/tax/report/:hkdId?month=YYYY-MM — tax report for an HKD
router.get('/admin/tax/report/:hkdId', authorize('admin'), async (req, res) => {
  try {
    const hkdId = parseInt(req.params.hkdId, 10);
    const { month } = req.query;
    if (!month) return res.status(400).json({ error: 'month is required' });
    const report = await generateTaxReport(hkdId, month);
    res.json(report);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/admin/tax/mark-paid/:id — mark a tax record as paid
router.post('/admin/tax/mark-paid/:id', authorize('admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const record = await prisma.taxRecord.update({
      where: { id },
      data: { status: 'PAID' },
    });
    res.json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/ctv/tax/preview?month=YYYY-MM — CTV previews own tax
router.get('/ctv/tax/preview', authorize('ctv'), async (req, res) => {
  try {
    const { month } = req.query;
    const result = await calculateTax(req.user.id, month);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
