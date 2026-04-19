const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { processMonthlyTransfer, generateInvoicePDF } = require('../services/autoTransfer');
const { validate, schemas } = require('../middleware/validate');

const router = express.Router();
const prisma = require('../lib/prisma');

router.use(authenticate);

// GET /api/admin/invoices — list all invoices with filter
router.get('/admin/invoices', authorize('admin'), validate(schemas.invoicesQuery, 'query'), async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const where = status ? { status } : {};

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          fromUser: { select: { id: true, name: true, rank: true } },
          toUser: { select: { id: true, name: true, rank: true } },
          contract: { select: { id: true, contractNo: true } },
        },
        orderBy: { issuedAt: 'desc' },
        skip,
        take: parseInt(limit, 10),
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({ invoices, total, page: parseInt(page, 10) });
  } catch (err) {
    console.error("[route]", err); res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/invoices/process-monthly — trigger monthly auto-transfer
router.post('/admin/invoices/process-monthly', authorize('admin'), validate(schemas.invoiceProcessMonthly), async (req, res) => {
  try {
    const { month, year } = req.body;
    const now = new Date();
    const m = month || (now.getMonth() + 1);
    const y = year || now.getFullYear();
    const result = await processMonthlyTransfer(m, y);
    res.json(result);
  } catch (err) {
    console.error("[route]", err); res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/transfers — list auto-transfer logs
router.get('/admin/transfers', authorize('admin'), validate(schemas.invoicesQuery, 'query'), async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const where = status ? { status } : {};

    const [transfers, total] = await Promise.all([
      prisma.autoTransferLog.findMany({
        where,
        include: {
          fromUser: { select: { id: true, name: true, rank: true } },
          toUser: { select: { id: true, name: true, rank: true } },
        },
        orderBy: { transferDate: 'desc' },
        skip,
        take: parseInt(limit, 10),
      }),
      prisma.autoTransferLog.count({ where }),
    ]);

    res.json({ transfers, total, page: parseInt(page, 10) });
  } catch (err) {
    console.error("[route]", err); res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/ctv/invoices/my — CTV sees own invoices
router.get('/ctv/invoices/my', authorize('ctv'), async (req, res) => {
  try {
    const userId = req.user.id;
    const invoices = await prisma.invoice.findMany({
      where: {
        OR: [{ fromUserId: userId }, { toUserId: userId }],
      },
      include: {
        fromUser: { select: { id: true, name: true, rank: true } },
        toUser: { select: { id: true, name: true, rank: true } },
        contract: { select: { id: true, contractNo: true } },
      },
      orderBy: { issuedAt: 'desc' },
      take: 50,
    });
    res.json(invoices);
  } catch (err) {
    console.error("[route]", err); res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/invoices/:id/pdf — generate/return PDF url
router.get('/admin/invoices/:id/pdf', authorize('admin'), async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.id, 10);
    const result = await generateInvoicePDF(invoiceId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/admin/contracts/:id/terminate — terminate a B2B contract
router.post('/admin/contracts/:id/terminate', authorize('admin'), validate(schemas.contractTerminate), async (req, res) => {
  try {
    const contractId = parseInt(req.params.id, 10);
    const { reason } = req.body;
    const contract = await prisma.b2BContract.update({
      where: { id: contractId },
      data: {
        status: 'terminated',
        terminatedAt: new Date(),
        terminationReason: reason || 'Admin terminated',
        terminatedBy: req.user.id,
      },
    });
    res.json(contract);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
