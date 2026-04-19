const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { confirmTransaction, rejectTransaction, confirmCashDeposit, getReconciliationStats } = require('../services/transaction');
const { validate, schemas } = require('../middleware/validate');

const router = express.Router();
const prisma = require('../lib/prisma');

router.use(authenticate);
router.use(authorize('admin'));

// GET /pending - List pending transactions for reconciliation
router.get('/pending', validate(schemas.reconciliationQuery, 'query'), async (req, res) => {
  try {
    const { page = 1, limit = 20, paymentMethod } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { status: 'PENDING', channel: 'ctv' };
    if (paymentMethod) where.paymentMethod = paymentMethod;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          customer: { select: { name: true, phone: true } },
          ctv: { select: { id: true, name: true, rank: true, phone: true } },
          paymentProof: true,
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.transaction.count({ where }),
    ]);

    const summary = await getReconciliationStats();

    res.json({
      transactions,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      summary,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /:id/confirm - Confirm a transaction
router.post('/:id/confirm', validate(schemas.confirmNotes), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await confirmTransaction(id, req.user.id, req.body.notes);
    res.json({ success: true, transaction: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /:id/reject - Reject a transaction
router.post('/:id/reject', validate(schemas.rejectReason), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!req.body.reason) return res.status(400).json({ error: 'Can cung cap ly do tu choi' });
    const result = await rejectTransaction(id, req.user.id, req.body.reason);
    res.json({ success: true, transaction: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /stats - Reconciliation statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await getReconciliationStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /cash-deposits/pending - List pending cash deposits
router.get('/cash-deposits/pending', async (req, res) => {
  try {
    const deposits = await prisma.cashDeposit.findMany({
      where: { status: 'PENDING' },
      include: {
        ctv: { select: { id: true, name: true, rank: true, phone: true } },
      },
      orderBy: { depositedAt: 'asc' },
    });

    res.json(deposits.map(d => ({
      ...d,
      transactionIds: JSON.parse(d.transactionIds),
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /cash-deposits/:id/confirm - Confirm a cash deposit
router.post('/cash-deposits/:id/confirm', validate(schemas.confirmNotes), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await confirmCashDeposit(id, req.user.id, req.body.notes);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /cash-deposits/:id/reject - Reject a cash deposit
router.post('/cash-deposits/:id/reject', validate(schemas.rejectReason), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!req.body.reason) return res.status(400).json({ error: 'Can cung cap ly do tu choi' });

    const deposit = await prisma.cashDeposit.findUnique({ where: { id } });
    if (!deposit || deposit.status !== 'PENDING') {
      return res.status(400).json({ error: 'Phieu nop tien khong hop le' });
    }

    const txIds = JSON.parse(deposit.transactionIds);

    await prisma.cashDeposit.update({
      where: { id },
      data: { status: 'REJECTED', confirmedBy: req.user.id, confirmedAt: new Date(), notes: req.body.reason },
    });

    // Unlink transactions from deposit so CTV can resubmit
    await prisma.transaction.updateMany({
      where: { id: { in: txIds } },
      data: { cashDepositId: null },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /all - All transactions with any status for full view
router.get('/all', validate(schemas.reconciliationQuery, 'query'), async (req, res) => {
  try {
    const { page = 1, limit = 50, status, channel } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;
    if (channel) where.channel = channel;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          customer: { select: { name: true, phone: true } },
          ctv: { select: { id: true, name: true, rank: true } },
          paymentProof: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({ transactions, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
