// Force sync stdout so crash diagnostics never get swallowed by pipe buffering
try { if (process.stdout._handle) process.stdout._handle.setBlocking(true); } catch (_) {}
try { if (process.stderr._handle) process.stderr._handle.setBlocking(true); } catch (_) {}
process.stdout.write('[BOOT] node started PID=' + process.pid + ' PORT=' + process.env.PORT + ' NODE_ENV=' + process.env.NODE_ENV + '\n');

const config = require('./config');
const logger = require('./services/logger');
const prisma = require('./lib/prisma');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
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
const appConfigRoutes = require('./routes/appConfig');
const importRoutes = require('./routes/import');
const feeConfigRoutes = require('./routes/feeConfig');
const businessHouseholdRoutes = require('./routes/businessHousehold');
const trainingLogRoutes = require('./routes/trainingLogs');
const kycRoutes = require('./routes/kyc');
const invoiceRoutes = require('./routes/invoices');
const taxRoutes = require('./routes/tax');
const monthlyReportRoutes = require('./routes/monthlyReport');
const auditLogRoutes = require('./routes/auditLogs');
const healthRoutes = require('./routes/health');
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
const { initCommissionQueue, closeCommissionWorker } = require('./jobs/commissionCalculation');
const appEvents = require('./services/eventEmitter');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
const PORT = config.port;

// Trust reverse proxy (nginx/load balancer) so rate limiter uses real client IP
app.set('trust proxy', 1);

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
app.use(express.json({ limit: '1mb' }));

// Block direct access to KYC directory — use authenticated API route instead
app.use('/uploads/kyc', (req, res) => res.status(403).json({ error: 'Forbidden' }));
// Serve non-sensitive uploaded files (product images, etc.) publicly
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Liveness probe — always 200 if process is running (used by Railway healthcheck)
app.get('/api/ping', (_req, res) => res.json({ ok: true }));

// Health check must be public and bypass all rate limiting / auth middleware
app.use('/api/health', healthRoutes);

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
app.use('/api/config', appConfigRoutes);
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
        await prisma.depositHistory.update({
          where: { id: depositId },
          data: { provider: 'momo', providerTxId: String(req.body.transId) },
        });
        await confirmMemberDeposit(depositId, null);
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
      await prisma.depositHistory.update({
        where: { id: depositId },
        data: { provider: 'zalopay', providerTxId: String(callbackData.zp_trans_id) },
      });
      await confirmMemberDeposit(depositId, null);
    }
    res.json({ return_code: 1, return_message: 'success' });
  } catch (err) {
    logger.error('[ZaloPay] Callback error', { error: err.message });
    res.json({ return_code: 0, return_message: err.message });
  }
});

// Webhook endpoint for KiotViet
app.post('/webhook/kiotviet/order', (req, res, next) => {
  const secret = config.kiotviet.webhookSecret;
  if (!secret) {
    logger.warn('[KiotViet] KIOTVIET_WEBHOOK_SECRET not configured — rejecting webhook request');
    return res.status(403).json({ error: 'Webhook not configured' });
  }
  const signature = req.headers['x-kiotviet-signature'] || req.headers['x-hub-signature-256'] || '';
  const payload = JSON.stringify(req.body);
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  if (signature !== expected && signature !== `sha256=${expected}`) {
    logger.warn('[KiotViet] Invalid webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }
  next();
}, validate(schemas.webhookOrder), async (req, res) => {
  try {
    await addSyncJob('webhook-order', { order: req.body });
    res.status(200).json({ ok: true });
  } catch (err) {
    logger.error('[Webhook] Error', { error: err.message });
    res.status(500).json({ error: 'Internal error' });
  }
});

// SSE ticket endpoint: exchange normal JWT for a short-lived (60s) SSE-only token.
// This avoids leaking the long-lived session JWT via query-string / referer / access logs.
app.post('/api/events/ticket', authMw, (req, res) => {
  const ticket = jwt.sign(
    { id: req.user.id, role: req.user.role, aud: 'sse' },
    config.jwt.secret,
    { expiresIn: '60s' }
  );
  res.json({ ticket });
});

// SSE real-time event stream.
// EventSource API cannot set custom headers — must use ticket query param (scoped, 60s TTL).
app.get('/api/events', async (req, res) => {
  const ticket = req.query.ticket;
  if (!ticket) return res.status(401).json({ error: 'Missing SSE ticket' });
  try {
    const decoded = jwt.verify(ticket, config.jwt.secret);
    if (decoded.aud !== 'sse') return res.status(401).json({ error: 'Invalid ticket scope' });
    const dbUser = await prisma.user.findUnique({ where: { id: decoded.id }, select: { isActive: true } });
    if (!dbUser || dbUser.isActive === false) return res.status(401).json({ error: 'Account deactivated' });
    req.user = { ...decoded, isActive: dbUser.isActive };
  } catch {
    return res.status(401).json({ error: 'Invalid or expired ticket' });
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

// KYC file upload endpoint (#15)
const kycUploadDir = path.join(__dirname, '../uploads/kyc');
if (!fs.existsSync(kycUploadDir)) fs.mkdirSync(kycUploadDir, { recursive: true });
const kycStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, kycUploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const kycUpload = multer({ storage: kycStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files are allowed'));
} });
app.post('/api/uploads/kyc', authMw, kycUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const url = `/api/uploads/kyc/${req.file.filename}`;
  res.json({ url });
});

// Authenticated KYC file serving — prevents public access via static route
app.get('/api/uploads/kyc/:filename', authMw, (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(__dirname, '../uploads/kyc', filename);
  res.sendFile(filePath, (err) => {
    if (err) res.status(404).json({ error: 'File not found' });
  });
});

// Centralized error handler (must be after all routes)
app.use(errorHandler);

// Initialize services and start server
let server;
async function start() {
  // Bind port FIRST so healthcheck can respond while background services initialize
  server = app.listen(PORT, () => {
    logger.info(`CCB Mart API running on http://localhost:${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  await initRedis().catch(err => logger.error('Redis init failed', { error: err.message }));
  await initSyncQueue().catch(err => logger.error('SyncQueue init failed', { error: err.message }));
  await initCommissionQueue().catch(err => logger.error('CommissionQueue init failed', { error: err.message }));
  scheduleAutoRankJob();
  scheduleCashCheckJob();
  scheduleReferralCapReset();
  scheduleAuditLogCleanup();
}

const gracefulShutdown = async (signal) => {
  console.log(`${signal} received, shutting down gracefully...`);
  server.close(async () => {
    await closeCommissionWorker();
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

start().catch(err => {
  logger.error('Failed to start server', { error: err.message, stack: err.stack });
  process.exit(1);
});
