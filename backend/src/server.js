const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const ctvRoutes = require('./routes/ctv');
const agencyRoutes = require('./routes/agency');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const reportRoutes = require('./routes/reports');
const ctvTransactionRoutes = require('./routes/ctvTransactions');
const reconciliationRoutes = require('./routes/reconciliation');
const memberRoutes = require('./routes/members');
const adminMembershipRoutes = require('./routes/adminMembership');
const configRoutes = require('./routes/config');
const importRoutes = require('./routes/import');
const feeConfigRoutes = require('./routes/feeConfig');
const businessHouseholdRoutes = require('./routes/businessHousehold');
const trainingLogRoutes = require('./routes/trainingLogs');
const { subscribeUser, unsubscribeUser } = require('./services/pushNotification');
const { authenticate: authMw } = require('./middleware/auth');
const { createMomoPayment, verifyMomoSignature, createZaloPayPayment, verifyZaloPayCallback } = require('./services/payment');
const { confirmDeposit: confirmMemberDeposit } = require('./services/membership');
const { globalLimiter } = require('./middleware/rateLimiter');
const { validate, schemas } = require('./middleware/validate');
const { initRedis } = require('./services/cache');
const { initSyncQueue, addSyncJob } = require('./queues/syncQueue');
const { scheduleAutoRankJob } = require('./jobs/autoRankUpdate');
const { scheduleCashCheckJob } = require('./jobs/checkUnsubmittedCash');
const { scheduleReferralCapReset } = require('./jobs/resetReferralCap');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.startsWith('http://localhost:')) return callback(null, true);
    callback(new Error('Not allowed'));
  },
  credentials: true,
}));
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Global rate limiting
app.use('/api/', globalLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/ctv', ctvRoutes);
app.use('/api/ctv/transactions', ctvTransactionRoutes);
app.use('/api/agency', agencyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/reconciliation', reconciliationRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/admin/membership', adminMembershipRoutes);
app.use('/api/admin/config', configRoutes);
app.use('/api/admin/import', importRoutes);
app.use('/api/admin/fee-config', feeConfigRoutes);
app.use('/api/admin/business-household', businessHouseholdRoutes);
app.use('/api/training-logs', trainingLogRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin/reports', reportRoutes);

// Push notification subscribe/unsubscribe
app.post('/api/notifications/subscribe', authMw, async (req, res) => {
  try {
    await subscribeUser(req.user.id, req.body.subscription, req.headers['user-agent']);
    res.json({ success: true });
  } catch (err) { res.status(400).json({ error: err.message }); }
});
app.post('/api/notifications/unsubscribe', authMw, async (req, res) => {
  try {
    await unsubscribeUser(req.body.endpoint);
    res.json({ success: true });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// Payment: Momo
app.post('/api/payment/momo/create', authMw, async (req, res) => {
  try {
    const { amount, depositId } = req.body;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const result = await createMomoPayment(amount, `DEP${depositId}`, `${baseUrl}/member/topup?result=success`, `${baseUrl}/webhook/momo/ipn`);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/webhook/momo/ipn', async (req, res) => {
  try {
    if (req.body.resultCode === 0) {
      const orderId = req.body.orderId;
      const depositId = parseInt(orderId.replace('DEP', ''));
      if (depositId) {
        const { PrismaClient } = require('@prisma/client');
        const p = new PrismaClient();
        await p.depositHistory.update({ where: { id: depositId }, data: { status: 'CONFIRMED', provider: 'momo', providerTxId: String(req.body.transId), confirmedAt: new Date() } });
      }
    }
    res.status(204).end();
  } catch { res.status(204).end(); }
});

// Payment: ZaloPay
app.post('/api/payment/zalopay/create', authMw, async (req, res) => {
  try {
    const { amount, depositId } = req.body;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const result = await createZaloPayPayment(amount, `DEP${depositId}`, `${baseUrl}/member/topup?result=success`, `${baseUrl}/webhook/zalopay/callback`);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/webhook/zalopay/callback', async (req, res) => {
  try { res.json({ return_code: 1, return_message: 'success' }); } catch { res.json({ return_code: 0 }); }
});

// Webhook endpoint for KiotViet
app.post('/webhook/kiotviet/order', validate(schemas.webhookOrder), async (req, res) => {
  try {
    await addSyncJob('webhook-order', { order: req.body });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[Webhook] Error:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize services and start server
async function start() {
  await initRedis();
  await initSyncQueue();
  scheduleAutoRankJob();
  scheduleCashCheckJob();
  scheduleReferralCapReset();

  app.listen(PORT, () => {
    console.log(`CCB Mart API running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
