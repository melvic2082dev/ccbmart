const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth');
const { createCtvTransaction, uploadPaymentProof, createCashDeposit } = require('../services/transaction');

const router = express.Router();
const prisma = require('../lib/prisma');

router.use(authenticate);
router.use(authorize('ctv'));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `proof_${Date.now()}_${req.user.id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Chi chap nhan file anh (jpg, png, webp)'));
  },
});

// POST /create - Create a new CTV transaction
router.post('/create', async (req, res) => {
  try {
    const result = await createCtvTransaction(req.user.id, req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /:id/upload-proof - Upload payment proof image
router.post('/:id/upload-proof', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Vui long upload anh' });
    const transactionId = parseInt(req.params.id);
    const imageUrl = `/uploads/${req.file.filename}`;
    const proof = await uploadPaymentProof(transactionId, req.user.id, imageUrl, req.body.notes);
    res.json({ success: true, proofId: proof.id, imageUrl });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /pending - List PENDING transactions for this CTV
router.get('/pending', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { ctvId: req.user.id, status: 'PENDING', channel: 'ctv' },
        include: { customer: true, paymentProof: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.transaction.count({
        where: { ctvId: req.user.id, status: 'PENDING', channel: 'ctv' },
      }),
    ]);

    res.json({ transactions, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /history - Full transaction history with status filter
router.get('/history', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { ctvId: req.user.id, channel: 'ctv' };
    if (status) where.status = status;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { customer: true, paymentProof: true },
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

// GET /pending-cash - List cash transactions not yet deposited
router.get('/pending-cash', async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        ctvId: req.user.id,
        paymentMethod: 'cash',
        status: 'PENDING',
        cashDepositId: null,
        channel: 'ctv',
      },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
    });

    const totalAmount = transactions.reduce((s, t) => s + t.totalAmount, 0);
    res.json({ transactions, totalAmount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /cash-deposit - Create cash deposit batch
router.post('/cash-deposit', async (req, res) => {
  try {
    const { transactionIds, notes } = req.body;
    const result = await createCashDeposit(req.user.id, transactionIds, notes);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /pending-count - Count of pending transactions (for sidebar badge)
router.get('/pending-count', async (req, res) => {
  try {
    const count = await prisma.transaction.count({
      where: { ctvId: req.user.id, status: 'PENDING', channel: 'ctv' },
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
