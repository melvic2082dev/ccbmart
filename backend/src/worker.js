// Standalone worker process — runs BullMQ queues + cron jobs WITHOUT the HTTP server.
// For P4 architecture split. Currently inactive: server.js still owns all jobs.
//
// To enable as a separate Railway service later:
//   1. Add a new Railway service pointing at the same repo
//   2. Set startCommand = "sh ./start-worker.sh"
//   3. In the web service, set WORKER_ROLE=web so server.js can skip job init (future change)
//   4. Deploy both
//
// Do NOT run this concurrently with server.js in the same environment today —
// jobs would be scheduled twice. Until the cutover is done, this file is dormant.

process.stdout.write('[WORKER] starting PID=' + process.pid + ' NODE_ENV=' + process.env.NODE_ENV + '\n');

const config = require('./config');
const logger = require('./services/logger');
const { initSentry } = require('./lib/sentry');
const prisma = require('./lib/prisma');
const { initRedis } = require('./services/cache');
const { initSyncQueue } = require('./queues/syncQueue');
const { scheduleAutoRankJob } = require('./jobs/autoRankUpdate');
const { scheduleCashCheckJob } = require('./jobs/checkUnsubmittedCash');
const { scheduleReferralCapReset } = require('./jobs/resetReferralCap');
const { scheduleAuditLogCleanup } = require('./jobs/auditLogCleanup');
const { initCommissionQueue, closeCommissionWorker } = require('./jobs/commissionCalculation');

initSentry();

async function start() {
  logger.info('[Worker] boot', { nodeEnv: config.nodeEnv });
  await initRedis().catch((err) => logger.error('[Worker] Redis init failed', { error: err.message }));
  await initSyncQueue().catch((err) => logger.error('[Worker] SyncQueue init failed', { error: err.message }));
  await initCommissionQueue().catch((err) => logger.error('[Worker] CommissionQueue init failed', { error: err.message }));
  scheduleAutoRankJob();
  scheduleCashCheckJob();
  scheduleReferralCapReset();
  scheduleAuditLogCleanup();
  logger.info('[Worker] all jobs scheduled, worker is idle waiting for events');
}

const shutdown = async (signal) => {
  logger.info(`[Worker] ${signal} received, shutting down`);
  try {
    await closeCommissionWorker();
    await prisma.$disconnect();
  } catch (err) {
    logger.error('[Worker] shutdown error', { error: err.message });
  }
  process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch((err) => {
  logger.error('[Worker] failed to start', { error: err.message, stack: err.stack });
  process.exit(1);
});
