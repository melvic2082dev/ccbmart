/**
 * CCB Mart Worker Process
 *
 * Runs BullMQ workers + cron jobs without starting an HTTP server.
 * Deploy as a separate Railway service with start command: node src/worker.js
 *
 * Cutover procedure:
 *   1. Deploy this worker process on Railway (separate service, same Docker image)
 *   2. Confirm jobs are being picked up (check Railway logs for [SyncQueue] / [CommissionJob])
 *   3. Set WORKER_PROCESS=separate on the web service and redeploy it
 *   4. Web server no longer runs workers — this process owns them exclusively
 *
 * Rollback: remove WORKER_PROCESS=separate from web service → web reverts to monolith mode.
 */

require('dotenv').config();

const { initRedis } = require('./services/cache');
const { initSyncQueue, closeSyncWorker } = require('./queues/syncQueue');
const { initCommissionQueue, closeCommissionWorker } = require('./jobs/commissionCalculation');
const { scheduleAutoRankJob } = require('./jobs/autoRankUpdate');
const { scheduleCashCheckJob } = require('./jobs/checkUnsubmittedCash');
const { scheduleReferralCapReset } = require('./jobs/resetReferralCap');
const { scheduleAuditLogCleanup } = require('./jobs/auditLogCleanup');
const logger = require('./services/logger');
const prisma = require('./lib/prisma');

async function startWorker() {
  await initRedis();
  await initSyncQueue();
  await initCommissionQueue();
  scheduleAutoRankJob();
  scheduleCashCheckJob();
  scheduleReferralCapReset();
  scheduleAuditLogCleanup();
  logger.info('CCB Mart Worker process running', {
    env: process.env.NODE_ENV || 'development',
    redis: !!(process.env.REDIS_HOST || process.env.REDIS_URL),
  });
}

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received — shutting down worker`);
  try {
    await closeCommissionWorker();
    await closeSyncWorker();
    await prisma.$disconnect();
  } catch (err) {
    logger.error('Error during worker shutdown', { error: err.message });
  }
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startWorker().catch(err => {
  logger.error('Worker failed to start', { error: err.message, stack: err.stack });
  process.exit(1);
});
