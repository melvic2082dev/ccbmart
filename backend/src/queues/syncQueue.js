/**
 * KiotViet Sync Queue using BullMQ (requires Redis)
 * Falls back to direct execution if Redis is not available
 */

const { PrismaClient } = require('@prisma/client');
const { invalidateCache } = require('../services/cache');
const { invalidateCommissionCache } = require('../services/commission');
const appEvents = require('../services/eventEmitter');
const { queueCommissionRecalc } = require('../jobs/commissionCalculation');

const prisma = new PrismaClient();

let syncQueue = null;
let syncWorker = null;
let useQueue = false;

/**
 * Initialize BullMQ queue if Redis is available
 */
async function initSyncQueue() {
  if (!process.env.REDIS_HOST && !process.env.REDIS_URL) {
    console.log('[SyncQueue] No Redis configured, sync will run directly');
    return;
  }

  try {
    const { Queue, Worker } = require('bullmq');
    const Redis = require('ioredis');

    const connection = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
    });

    syncQueue = new Queue('kiotviet-sync', { connection });

    syncWorker = new Worker('kiotviet-sync', async (job) => {
      console.log(`[SyncQueue] Processing job ${job.id}: ${job.name}`);
      return await processSyncJob(job.data);
    }, {
      connection,
      concurrency: 1,
    });

    syncWorker.on('completed', (job) => {
      console.log(`[SyncQueue] Job ${job.id} completed`);
    });

    syncWorker.on('failed', (job, err) => {
      console.error(`[SyncQueue] Job ${job?.id} failed:`, err.message);
    });

    useQueue = true;
    console.log('[SyncQueue] BullMQ queue initialized');
  } catch (err) {
    console.warn('[SyncQueue] Failed to init BullMQ:', err.message);
    console.log('[SyncQueue] Falling back to direct sync');
  }
}

/**
 * Process a sync job (used by both queue and direct execution)
 */
async function processSyncJob(data) {
  const { type } = data;

  if (type === 'batch-sync') {
    return await executeBatchSync(data);
  }

  if (type === 'webhook-order') {
    return await processWebhookOrder(data);
  }

  throw new Error(`Unknown sync job type: ${type}`);
}

/**
 * Simulate batch sync from KiotViet
 */
async function executeBatchSync(data) {
  const recordCount = Math.floor(Math.random() * 50) + 10;

  // Create sync log
  const syncLog = await prisma.syncLog.create({
    data: {
      source: 'kiotviet',
      recordsSynced: recordCount,
      status: 'success',
    },
  });

  // Invalidate caches
  invalidateCommissionCache();
  await invalidateCache('admin:dashboard:*');
  await invalidateCache('ctv:dashboard:*');
  await invalidateCache('agency:dashboard:*');

  console.log(`[SyncQueue] Batch sync completed: ${recordCount} records`);
  return { syncLogId: syncLog.id, recordsSynced: recordCount };
}

/**
 * Process a single webhook order from KiotViet
 */
async function processWebhookOrder(data) {
  const { order } = data;

  if (!order || !order.id) {
    throw new Error('Invalid webhook order data');
  }

  // Check for duplicate
  const existing = await prisma.transaction.findFirst({
    where: { kiotvietOrderId: String(order.id) },
  });

  if (existing) {
    console.log(`[SyncQueue] Order ${order.id} already exists, skipping`);
    return { skipped: true, orderId: order.id };
  }

  const transaction = await prisma.transaction.create({
    data: {
      kiotvietOrderId: String(order.id),
      customerId: order.customerId || null,
      agencyId: order.agencyId || null,
      ctvId: order.ctvId || null,
      channel: order.channel || 'showroom',
      totalAmount: order.totalAmount || 0,
      cogsAmount: order.cogsAmount || 0,
    },
  });

  // Invalidate relevant caches
  if (transaction.ctvId) {
    invalidateCommissionCache(transaction.ctvId);
    await invalidateCache(`ctv:dashboard:${transaction.ctvId}:*`);
  }
  if (transaction.agencyId) {
    await invalidateCache(`agency:dashboard:${transaction.agencyId}:*`);
  }
  await invalidateCache('admin:dashboard:*');

  // Emit SSE event so connected dashboards refresh immediately
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  appEvents.emit('transaction:new', { transactionId: transaction.id, orderId: order.id, month: monthStr });

  // Queue commission recalculation asynchronously
  queueCommissionRecalc(monthStr, transaction.ctvId).catch(err =>
    console.warn('[SyncQueue] Commission recalc queue error:', err.message)
  );

  console.log(`[SyncQueue] Webhook order ${order.id} processed`);
  return { transactionId: transaction.id, orderId: order.id };
}

/**
 * Add a sync job to the queue (or execute directly if no queue)
 */
async function addSyncJob(type, data) {
  const jobData = { type, ...data };

  if (useQueue && syncQueue) {
    const job = await syncQueue.add(type, jobData, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
    return { queued: true, jobId: job.id };
  }

  // Direct execution fallback
  const result = await processSyncJob(jobData);
  return { queued: false, ...result };
}

/**
 * Get sync history
 */
async function getSyncHistory(limit = 20) {
  return prisma.syncLog.findMany({
    orderBy: { syncedAt: 'desc' },
    take: limit,
  });
}

module.exports = {
  initSyncQueue,
  addSyncJob,
  getSyncHistory,
};
