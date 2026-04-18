const config = require('./config');
const express = require('express');
const helmet = require('helmet');
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
const kycRoutes = require('./routes/kyc');
const invoiceRoutes = require('./routes/invoices');
const taxRoutes = require('./routes/tax');
const monthlyReportRoutes = require('./routes/monthlyReport');
const auditLogRoutes = require('./routes/auditLogs');
const { subscribeUser, unsubscribeUser } = require('./services/pushNotification');
const { authenticate: authMw } = require('./middleware/auth');
const { createMomoPayment, verifyMomoSignature, createZaloPayPayment, verifyZaloPayCallback } = require('./services/payment');
const { confirmDeposit: confirmMemberDeposit } = require('./services/membership');
const { globalLimiter, apiLimiter } = require('./middleware/rateLimiter');
const { validate, schemas } = require('./middleware/validate');
const { initRedis } = require('./services/cache');
const { errorHandler } = require('./middleware/errorHandler');
const { initSyncQueue, addSyncJob } = require('./queues/syncQueue');
const { scheduleAutoRankJob } = require('./jobs/autoRankUpdate');
const { scheduleCashCheckJob } = require('./jobs/checkUnsubmittedCash');
const { scheduleReferralCapReset } = require('./jobs/resetReferralCap');
const { scheduleAuditLogCleanup } = require('./jobs/auditLogCleanup');
const { initCommissionQueue } = require('./jobs/commissionCalculation');
const appEvents = require('./services/eventEmitter');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = config.port;

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (config.cors.origins.includes(origin)) return callback(null, true);
    if (config.nodeEnv !== 'production' && origin.startsWith('http://localhost:')) return callback(null, true);
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

// V12.2: eKYC, invoices, tax, monthly report (routers define their own /admin/... /ctv/... paths)
app.use('/api', kycRoutes);
app.use('/api', invoiceRoutes);
app.use('/api', taxRoutes);
app.use('/api', monthlyReportRoutes);

// C13.3.1: Audit log viewer (admin)
app.use('/api/admin', auditLogRoutes);

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
app.post('/api/payment/momo/create', authMw, apiLimiter, async (req, res) => {
  try {
    const { amount, depositId } = req.body;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const result = await createMomoPayment(amount, `DEP${depositId}`, `${baseUrl}/member/topup?result=success`, `${baseUrl}/webhook/momo/ipn`);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/webhook/momo/ipn', async (req, res) => {
  try {
    if (!verifyMomoSignature(req.body, req.body.signature)) {
      return res.status(401).end();
    }
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
app.post('/api/payment/zalopay/create', authMw, apiLimiter, async (req, res) => {
  try {
    const { amount, depositId } = req.body;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const result = await createZaloPayPayment(amount, `DEP${depositId}`, `${baseUrl}/member/topup?result=success`, `${baseUrl}/webhook/zalopay/callback`);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/webhook/zalopay/callback', async (req, res) => {
  try {
    const { data, mac } = req.body;
    if (!data || !verifyZaloPayCallback(data, mac)) {
      return res.json({ return_code: -1, return_message: 'mac not equal' });
    }
    const callbackData = JSON.parse(data);
    const depMatch = callbackData.app_trans_id?.match(/DEP(\d+)$/);
    if (depMatch) {
      const depositId = parseInt(depMatch[1]);
      const { PrismaClient } = require('@prisma/client');
      const p = new PrismaClient();
      await p.depositHistory.update({ where: { id: depositId }, data: { status: 'CONFIRMED', provider: 'zalopay', providerTxId: String(callbackData.zp_trans_id), confirmedAt: new Date() } });
    }
    res.json({ return_code: 1, return_message: 'success' });
  } catch (err) {
    console.error('[ZaloPay] Callback error:', err.message);
    res.json({ return_code: 0, return_message: err.message });
  }
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

// SSE real-time event stream (supports token via query param for EventSource compatibility)
app.get('/api/events', (req, res) => {
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : queryToken;

  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  res.write('event: connected\ndata: {"status":"connected"}\n\n');

  const keepAlive = setInterval(() => res.write(': ping\n\n'), 30000);

  const handlers = {
    'transaction:new': (data) => res.write(`event: transaction:new\ndata: ${JSON.stringify(data)}\n\n`),
    'commission:calculated': (data) => res.write(`event: commission:calculated\ndata: ${JSON.stringify(data)}\n\n`),
    'config:changed': (data) => res.write(`event: config:changed\ndata: ${JSON.stringify(data)}\n\n`),
  };

  for (const [event, handler] of Object.entries(handlers)) {
    appEvents.on(event, handler);
  }

  req.on('close', () => {
    clearInterval(keepAlive);
    for (const [event, handler] of Object.entries(handlers)) {
      appEvents.off(event, handler);
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Centralized error handler (must be after all routes)
app.use(errorHandler);

// Initialize services and start server
async function start() {
  await initRedis();
  await initSyncQueue();
  await initCommissionQueue();
  scheduleAutoRankJob();
  scheduleCashCheckJob();
  scheduleReferralCapReset();
  scheduleAuditLogCleanup();

  app.listen(PORT, () => {
    console.log(`CCB Mart API running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
