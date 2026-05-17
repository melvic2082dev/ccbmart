/**
 * Mock payment webhook for v3.3.
 *
 * In production this endpoint would be called by the payment gateway
 * (VNPay / Momo / PayOS / bank webhook). For local development we accept
 * an unauthenticated POST with a transaction id + signed token; on success
 * we transition AWAITING_PAYMENT → PAID and PAID → PACKING (auto).
 *
 * Mount: app.use('/api/payments', paymentsWebhookRoutes)
 */

const express = require('express');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { applyTransition, Status } = require('../services/orderFlow');
const logger = require('../services/logger');

const router = express.Router();

const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || 'ccbmart-dev-payment-secret';

function expectedSignature(transactionId, amount) {
  return crypto.createHmac('sha256', WEBHOOK_SECRET)
    .update(`${transactionId}:${amount}`)
    .digest('hex');
}

// In dev: caller can omit signature when ?dev=1 is set (so the admin UI can
// simulate "payment received" with one click).
router.post('/webhook', async (req, res) => {
  try {
    const { transactionId, amount, signature } = req.body || {};
    if (!transactionId) return res.status(400).json({ error: 'transactionId required' });

    const isDev = process.env.NODE_ENV !== 'production' && req.query.dev === '1';
    if (!isDev) {
      const expected = expectedSignature(transactionId, amount);
      if (!signature || signature !== expected) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const txId = parseInt(transactionId, 10);
    const tx = await prisma.transaction.findUnique({ where: { id: txId } });
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    // AWAITING_PAYMENT → PAID
    const paid = await applyTransition(txId, Status.PAID, {
      actorId: null,
      actorRole: 'system',
      note: isDev ? 'Dev mock webhook' : 'Payment gateway webhook',
    });

    // Auto-promote PAID → PACKING so the warehouse list shows it immediately.
    let packing;
    try {
      packing = await applyTransition(txId, Status.PACKING, {
        actorId: null,
        actorRole: 'system',
        note: 'Auto: thông báo kho soạn hàng',
      });
    } catch (e) {
      // If admin manually moved status concurrently, just return PAID state.
      logger.warn(`[payment-webhook] auto-promote PAID → PACKING skipped: ${e.message}`);
    }

    res.json({ ok: true, transaction: packing || paid });
  } catch (e) {
    logger.error('[payment-webhook] ' + (e.stack || e.message));
    res.status(e.code === 'INVALID_TRANSITION' ? 409 : 400).json({ error: e.message });
  }
});

module.exports = router;
