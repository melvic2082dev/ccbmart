const cron = require('node-cron');
const { logAudit } = require('../middleware/auditLog');

const prisma = require('../lib/prisma');

const RETENTION_DAYS = 90;

async function cleanupOldAuditLogs() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  console.log(`[AuditLogCleanup] Deleting logs older than ${cutoff.toISOString()}`);
  const result = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  console.log(`[AuditLogCleanup] Deleted ${result.count} audit logs`);

  await logAudit({
    userId: null,
    action: 'CRON_JOB',
    targetType: 'AuditLog',
    metadata: { job: 'auditLogCleanup', deleted: result.count, retentionDays: RETENTION_DAYS },
    status: 'SUCCESS',
  });

  return result.count;
}

function scheduleAuditLogCleanup() {
  // Every day at 02:00
  cron.schedule('0 2 * * *', async () => {
    console.log('[AuditLogCleanup] Cron triggered');
    try {
      await cleanupOldAuditLogs();
    } catch (err) {
      console.error('[AuditLogCleanup] Cron job failed:', err);
    }
  });
  console.log('[AuditLogCleanup] Cron job scheduled: 02:00 daily');
}

module.exports = { cleanupOldAuditLogs, scheduleAuditLogCleanup, RETENTION_DAYS };
