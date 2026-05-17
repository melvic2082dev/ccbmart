/**
 * CTV order-flow routes — v3.3.
 *
 * Auth: ctv role (or admin for testing).
 * Mount: app.use('/api/ctv/orders', ctvOrdersRoutes)
 *
 * Flow handled here: DRAFT → INVENTORY_PENDING (auto) → … (warehouse) →
 * AWAITING_PICKUP → CTV scans QR → PICKED_UP → DELIVERING → DELIVERED.
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate, authorize } = require('../middleware/auth');
const prisma = require('../lib/prisma');
const { applyTransition, Status } = require('../services/orderFlow');
const { generateDeliveryOTP, verifyDeliveryOTP } = require('../services/otpService');
const logger = require('../services/logger');

const router = express.Router();
router.use(authenticate, authorize('ctv', 'admin'));

// ---------- Signature upload (multer, local disk) ----------

const SIGNATURE_DIR = path.join(__dirname, '..', '..', 'uploads', 'signatures');
try { fs.mkdirSync(SIGNATURE_DIR, { recursive: true }); } catch {}

const signatureUpload = multer({
  storage: multer.diskStorage({
    destination: SIGNATURE_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `sig-${req.params.id}-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|heic)$/i.test(file.mimetype);
    cb(ok ? null : new Error('Only image uploads allowed'), ok);
  },
});

// ---------- Helpers ----------

function isOwnerCtv(req, tx) {
  if (req.user.role !== 'ctv') return true; // admin override
  return tx.ctvId === req.user.id;
}

// ---------- Read ----------

router.get('/:id', async (req, res) => {
  const tx = await prisma.transaction.findUnique({
    where: { id: parseInt(req.params.id, 10) },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      ctv:      { select: { id: true, fullName: true, phone: true } },
      warehouse: { select: { id: true, code: true, name: true, address: true } },
      items: { include: { product: { select: { name: true, region: true } } } },
      statusLogs: { orderBy: { at: 'asc' } },
    },
  });
  if (!tx) return res.status(404).json({ error: 'Not found' });
  if (!isOwnerCtv(req, tx)) return res.status(403).json({ error: 'Forbidden' });
  res.json(tx);
});

router.get('/', async (req, res) => {
  const where = req.user.role === 'ctv' ? { ctvId: req.user.id } : {};
  if (req.query.status) where.status = req.query.status;
  const items = await prisma.transaction.findMany({
    where,
    include: {
      warehouse: { select: { code: true, name: true } },
      items: { select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({ items, total: items.length });
});

// ---------- Draft create ----------
//
// Body: { customerId?, warehouseId, items: [{ productId, quantity, unitPrice }], totalAmount, cogsAmount }
// Creates Transaction with status=DRAFT, then auto-transitions to INVENTORY_PENDING.

router.post('/draft', async (req, res) => {
  const { customerId, warehouseId, items = [], totalAmount, cogsAmount, notes } = req.body || {};
  if (!warehouseId || !Number.isInteger(warehouseId)) {
    return res.status(400).json({ error: 'warehouseId is required (integer)' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items is required (non-empty array)' });
  }

  try {
    const wh = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
    if (!wh || !wh.isActive) return res.status(400).json({ error: 'Invalid warehouseId' });

    const tx = await prisma.$transaction(async (db) => {
      const created = await db.transaction.create({
        data: {
          ctvId: req.user.role === 'ctv' ? req.user.id : (req.body.ctvId || null),
          customerId: customerId || null,
          warehouseId,
          channel: 'ctv',
          status: Status.DRAFT,
          totalAmount: totalAmount || 0,
          cogsAmount: cogsAmount || 0,
          draftedAt: new Date(),
          ctvSubmittedAt: new Date(),
          items: {
            create: items.map((it) => ({
              productId: it.productId,
              variantId: it.variantId || null,
              quantity: it.quantity || 1,
              unitPrice: it.unitPrice || 0,
              unitCogs: it.unitCogs || null,
              subtotal: (it.unitPrice || 0) * (it.quantity || 1),
            })),
          },
        },
      });
      await db.transactionStatusLog.create({
        data: {
          transactionId: created.id,
          fromStatus: null,
          toStatus: Status.DRAFT,
          actorId: req.user.id,
          actorRole: req.user.role,
          note: notes || 'CTV tạo đơn nháp',
        },
      });
      return created;
    });

    // Auto-transition DRAFT → INVENTORY_PENDING (system actor)
    const promoted = await applyTransition(tx.id, Status.INVENTORY_PENDING, {
      actorId: req.user.id,
      actorRole: 'system',
      note: 'Auto: yêu cầu xác nhận tồn kho',
    });

    res.status(201).json({ ok: true, transaction: promoted });
  } catch (e) {
    logger.error('[ctv-orders] draft create failed: ' + (e.stack || e.message));
    res.status(500).json({ error: e.message });
  }
});

// ---------- Pickup (CTV scans pickup_code at warehouse) ----------

router.post('/:id/pickup', async (req, res) => {
  try {
    const txId = parseInt(req.params.id, 10);
    const submittedCode = String(req.body?.pickupCode || '').trim().toUpperCase();
    if (!submittedCode) return res.status(400).json({ error: 'pickupCode is required' });

    const tx = await prisma.transaction.findUnique({ where: { id: txId } });
    if (!tx) return res.status(404).json({ error: 'Not found' });
    if (!isOwnerCtv(req, tx)) return res.status(403).json({ error: 'Forbidden' });
    if (tx.pickupCode !== submittedCode) {
      return res.status(400).json({ error: 'Mã pickup không đúng' });
    }

    const updated = await applyTransition(txId, Status.PICKED_UP, {
      actorId: req.user.id,
      actorRole: req.user.role,
      note: 'CTV quét QR nhận hàng tại kho',
    });
    res.json({ ok: true, transaction: updated });
  } catch (e) {
    res.status(e.code === 'INVALID_TRANSITION' ? 409 : 400).json({ error: e.message });
  }
});

// ---------- Start delivery ----------

router.post('/:id/start-delivery', async (req, res) => {
  try {
    const txId = parseInt(req.params.id, 10);
    const tx = await prisma.transaction.findUnique({ where: { id: txId } });
    if (!tx) return res.status(404).json({ error: 'Not found' });
    if (!isOwnerCtv(req, tx)) return res.status(403).json({ error: 'Forbidden' });
    const updated = await applyTransition(txId, Status.DELIVERING, {
      actorId: req.user.id,
      actorRole: req.user.role,
    });
    res.json({ ok: true, transaction: updated });
  } catch (e) {
    res.status(e.code === 'INVALID_TRANSITION' ? 409 : 400).json({ error: e.message });
  }
});

// ---------- Delivery OTP ----------

router.post('/:id/request-otp', async (req, res) => {
  try {
    const txId = parseInt(req.params.id, 10);
    const tx = await prisma.transaction.findUnique({ where: { id: txId } });
    if (!tx) return res.status(404).json({ error: 'Not found' });
    if (!isOwnerCtv(req, tx)) return res.status(403).json({ error: 'Forbidden' });
    const result = await generateDeliveryOTP(txId);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/:id/verify-otp', async (req, res) => {
  try {
    const txId = parseInt(req.params.id, 10);
    const tx = await prisma.transaction.findUnique({ where: { id: txId } });
    if (!tx) return res.status(404).json({ error: 'Not found' });
    if (!isOwnerCtv(req, tx)) return res.status(403).json({ error: 'Forbidden' });
    const code = String(req.body?.code || '').trim();
    if (!code) return res.status(400).json({ error: 'code is required' });

    await verifyDeliveryOTP(txId, code);
    const updated = await applyTransition(txId, Status.DELIVERED, {
      actorId: req.user.id,
      actorRole: req.user.role,
      note: 'Khách xác nhận qua OTP',
    });
    res.json({ ok: true, transaction: updated });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ---------- Signature fallback ----------

router.post('/:id/upload-signature', signatureUpload.single('signature'), async (req, res) => {
  try {
    const txId = parseInt(req.params.id, 10);
    if (!req.file) return res.status(400).json({ error: 'signature image is required (multipart field: signature)' });
    const tx = await prisma.transaction.findUnique({ where: { id: txId } });
    if (!tx) return res.status(404).json({ error: 'Not found' });
    if (!isOwnerCtv(req, tx)) return res.status(403).json({ error: 'Forbidden' });

    const url = `/uploads/signatures/${req.file.filename}`;
    await prisma.transaction.update({
      where: { id: txId },
      data: { deliverySignatureUrl: url },
    });

    const updated = await applyTransition(txId, Status.DELIVERED, {
      actorId: req.user.id,
      actorRole: req.user.role,
      note: 'Khách ký nhận, chữ ký đã upload',
    });
    res.json({ ok: true, transaction: updated, signatureUrl: url });
  } catch (e) {
    res.status(e.code === 'INVALID_TRANSITION' ? 409 : 400).json({ error: e.message });
  }
});

// ---------- Cancel (pre-PAID only) ----------

router.post('/:id/cancel', async (req, res) => {
  try {
    const txId = parseInt(req.params.id, 10);
    const reason = (req.body?.reason || '').trim() || 'CTV huỷ đơn';
    const tx = await prisma.transaction.findUnique({ where: { id: txId } });
    if (!tx) return res.status(404).json({ error: 'Not found' });
    if (!isOwnerCtv(req, tx)) return res.status(403).json({ error: 'Forbidden' });
    const updated = await applyTransition(txId, Status.CANCELLED, {
      actorId: req.user.id,
      actorRole: req.user.role,
      note: reason,
      data: { cancelledReason: reason },
    });
    res.json({ ok: true, transaction: updated });
  } catch (e) {
    res.status(e.code === 'INVALID_TRANSITION' ? 409 : 400).json({ error: e.message });
  }
});

module.exports = router;
