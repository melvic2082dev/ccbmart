/**
 * Warehouse routes — v3.3 order-flow.
 *
 * Auth: warehouse_staff (or any admin sub-role for testing/override).
 * Mount: app.use('/api/warehouse', warehouseRoutes)
 */

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const prisma = require('../lib/prisma');
const { applyTransition, Status } = require('../services/orderFlow');
const logger = require('../services/logger');

const router = express.Router();
router.use(authenticate, authorize('warehouse_staff', 'admin'));

// Helper: optionally constrain to the staff member's assigned warehouse.
function warehouseScopeWhere(req) {
  // Admins see all warehouses; warehouse_staff scoped to their assigned warehouse if set.
  if (req.user.role === 'warehouse_staff' && req.user.warehouseId) {
    return { warehouseId: req.user.warehouseId };
  }
  return {};
}

// ---------- Lists ----------

router.get('/orders/pending-inventory', async (req, res) => {
  const items = await prisma.transaction.findMany({
    where: { status: Status.INVENTORY_PENDING, ...warehouseScopeWhere(req) },
    include: {
      ctv: { select: { id: true, fullName: true, phone: true } },
      customer: { select: { id: true, name: true, phone: true } },
      items: { include: { product: { select: { name: true, region: true } } } },
    },
    orderBy: { draftedAt: 'asc' },
    take: 100,
  });
  res.json({ items, total: items.length });
});

router.get('/orders/awaiting-packing', async (req, res) => {
  const items = await prisma.transaction.findMany({
    where: { status: Status.PAID, ...warehouseScopeWhere(req) },
    include: {
      ctv: { select: { id: true, fullName: true, phone: true } },
      customer: { select: { id: true, name: true, phone: true } },
      items: { include: { product: { select: { name: true } } } },
    },
    orderBy: { paidAt: 'asc' },
    take: 100,
  });
  res.json({ items, total: items.length });
});

router.get('/orders/packing', async (req, res) => {
  const items = await prisma.transaction.findMany({
    where: { status: Status.PACKING, ...warehouseScopeWhere(req) },
    include: {
      ctv: { select: { id: true, fullName: true } },
      items: { include: { product: { select: { name: true } } } },
    },
    orderBy: { packingStartedAt: 'asc' },
    take: 100,
  });
  res.json({ items, total: items.length });
});

router.get('/orders/awaiting-pickup', async (req, res) => {
  const items = await prisma.transaction.findMany({
    where: { status: Status.AWAITING_PICKUP, ...warehouseScopeWhere(req) },
    include: {
      ctv: { select: { id: true, fullName: true, phone: true } },
      items: { include: { product: { select: { name: true } } } },
    },
    orderBy: { packedAt: 'asc' },
    take: 100,
  });
  res.json({ items, total: items.length });
});

router.get('/dashboard', async (req, res) => {
  const where = warehouseScopeWhere(req);
  const [pendingInv, awaitingPay, paid, packing, awaitingPickup] = await Promise.all([
    prisma.transaction.count({ where: { status: Status.INVENTORY_PENDING, ...where } }),
    prisma.transaction.count({ where: { status: Status.AWAITING_PAYMENT, ...where } }),
    prisma.transaction.count({ where: { status: Status.PAID, ...where } }),
    prisma.transaction.count({ where: { status: Status.PACKING, ...where } }),
    prisma.transaction.count({ where: { status: Status.AWAITING_PICKUP, ...where } }),
  ]);
  res.json({
    counts: { pendingInv, awaitingPay, paid, packing, awaitingPickup },
  });
});

// ---------- Transitions ----------

router.post('/orders/:id/confirm-inventory', async (req, res) => {
  try {
    const txId = parseInt(req.params.id, 10);
    const updated = await applyTransition(txId, Status.AWAITING_PAYMENT, {
      actorId: req.user.id,
      actorRole: req.user.role,
      note: req.body?.note,
    });
    res.json({ ok: true, transaction: updated });
  } catch (e) {
    logger.error('[warehouse] confirm-inventory failed: ' + e.message);
    res.status(e.code === 'INVALID_TRANSITION' ? 409 : 400).json({ error: e.message });
  }
});

router.post('/orders/:id/reject-inventory', async (req, res) => {
  try {
    const reason = (req.body?.reason || '').trim();
    if (!reason) return res.status(400).json({ error: 'reason is required' });
    const txId = parseInt(req.params.id, 10);
    const updated = await applyTransition(txId, Status.INVENTORY_REJECTED, {
      actorId: req.user.id,
      actorRole: req.user.role,
      note: reason,
      data: { inventoryRejectedReason: reason },
    });
    res.json({ ok: true, transaction: updated });
  } catch (e) {
    res.status(e.code === 'INVALID_TRANSITION' ? 409 : 400).json({ error: e.message });
  }
});

router.post('/orders/:id/start-packing', async (req, res) => {
  try {
    const txId = parseInt(req.params.id, 10);
    const updated = await applyTransition(txId, Status.PACKING, {
      actorId: req.user.id,
      actorRole: req.user.role,
    });
    res.json({ ok: true, transaction: updated });
  } catch (e) {
    res.status(e.code === 'INVALID_TRANSITION' ? 409 : 400).json({ error: e.message });
  }
});

router.post('/orders/:id/finish-packing', async (req, res) => {
  try {
    const txId = parseInt(req.params.id, 10);
    const updated = await applyTransition(txId, Status.AWAITING_PICKUP, {
      actorId: req.user.id,
      actorRole: req.user.role,
    });
    res.json({ ok: true, transaction: updated, pickupCode: updated.pickupCode });
  } catch (e) {
    res.status(e.code === 'INVALID_TRANSITION' ? 409 : 400).json({ error: e.message });
  }
});

module.exports = router;
