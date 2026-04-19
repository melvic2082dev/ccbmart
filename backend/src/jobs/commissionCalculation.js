/**
 * Commission Calculation Background Job
 * Queues commission recalculation after new transactions instead of blocking the request.
 * Uses BullMQ when Redis is available; falls back to direct execution.
 */

const { calculateAllCtvCommissions } = require('../services/commission');
const { invalidateCache } = require('../services/cache');
const appEvents = require('../services/eventEmitter');

let queue = null;
let worker = null;
let useQueue = false;

async function initCommissionQueue() {
  if (!process.env.REDIS_HOST && !process.env.REDIS_URL) {
    console.log('[CommissionJob] No Redis configured, recalc runs synchronously');
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

    queue = new Queue('commission-calc', { connection });

    worker = new Worker('commission-calc', async (job) => {
      return await processCommissionJob(job.data);
    }, { connection, concurrency: 1 });

    worker.on('completed', (job) => {
      console.log(`[CommissionJob] Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
      console.error(`[CommissionJob] Job ${job?.id} failed:`, err.message);
    });

    useQueue = true;
    console.log('[CommissionJob] BullMQ queue initialized');
  } catch (err) {
    console.warn('[CommissionJob] Failed to init BullMQ:', err.message);
    console.log('[CommissionJob] Falling back to direct execution');
  }
}

async function processCommissionJob(data) {
  const { month, ctvId } = data;

  await calculateAllCtvCommissions(month);

  await invalidateCache('admin:dashboard:*');
  await invalidateCache(`ctv:dashboard:${ctvId || '*'}:*`);
  await invalidateCache(`salary-fund:${month}`);

  appEvents.emit('commission:calculated', { month, ctvId });

  console.log(`[CommissionJob] Recalc done for month=${month} ctvId=${ctvId || 'all'}`);
  return { month, ctvId };
}

/**
 * Queue a commission recalculation (or run directly if no queue available).
 * Uses jobId deduplication so multiple triggers for the same month/ctv collapse into one job.
 */
async function queueCommissionRecalc(month, ctvId = null) {
  const data = { month, ctvId };

  if (useQueue && queue) {
    const job = await queue.add('recalculate', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      jobId: `commission:${month}:${ctvId || 'all'}`,
    });
    return { queued: true, jobId: job.id };
  }

  const result = await processCommissionJob(data);
  return { queued: false, ...result };
}

async function closeCommissionWorker() {
  if (worker) await worker.close();
  if (queue) await queue.close();
}

module.exports = { initCommissionQueue, queueCommissionRecalc, closeCommissionWorker };
