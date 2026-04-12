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
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin/reports', reportRoutes);

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
