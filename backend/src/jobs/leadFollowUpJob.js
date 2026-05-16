/**
 * Lead follow-up cron jobs.
 * Spec: docs/specs/02_CRM_LIGHTWEIGHT.md §4.2
 *
 * Schedules (all UTC; effective Asia/Ho_Chi_Minh = UTC+7):
 *   - Every 15 min: process due-action notifications
 *   - Every 1 hour: detect stale leads (>= 7 days inactive)
 *   - Daily 17:30 UTC (00:30 ICT): auto-LOST leads stale >= 30 days
 */

const cron = require('node-cron');
const prisma = require('../lib/prisma');
const logger = require('../services/logger');
const { onLeadDueAction, onLeadStale, onLeadStageChanged } = require('../services/leadNotifier');

let lastDueRun = new Date(0);

async function processDueActions() {
  const now = new Date();
  const window = new Date(now.getTime() + 15 * 60 * 1000); // next 15 min
  try {
    const leads = await prisma.lead.findMany({
      where: {
        nextActionAt: { lte: window, gt: lastDueRun },
        stage: { in: ['NEW', 'CONTACTED', 'QUALIFIED', 'NEGOTIATING'] },
      },
      select: { id: true },
    });
    for (const l of leads) {
      try { await onLeadDueAction(l.id); } catch (e) { logger.error('[lead-due] notify failed', { leadId: l.id, error: e.message }); }
    }
    if (leads.length > 0) logger.info(`[lead-due] processed ${leads.length} due actions`);
    lastDueRun = now;
  } catch (e) {
    logger.error('[lead-due] job error', { error: e.message });
  }
}

async function processStaleLeads() {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  try {
    const leads = await prisma.lead.findMany({
      where: {
        stage: { in: ['CONTACTED', 'QUALIFIED', 'NEGOTIATING'] },
        OR: [
          { lastContactedAt: { lt: cutoff } },
          { lastContactedAt: null, createdAt: { lt: cutoff } },
        ],
      },
      select: { id: true },
      take: 500,
    });
    for (const l of leads) {
      try { await onLeadStale(l.id); } catch (e) { logger.error('[lead-stale] notify failed', { leadId: l.id, error: e.message }); }
    }
    if (leads.length > 0) logger.info(`[lead-stale] notified ${leads.length} stale leads`);
  } catch (e) {
    logger.error('[lead-stale] job error', { error: e.message });
  }
}

async function autoLostExpired() {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  try {
    const leads = await prisma.lead.findMany({
      where: {
        stage: { in: ['NEW', 'CONTACTED', 'QUALIFIED', 'NEGOTIATING'] },
        OR: [
          { lastContactedAt: { lt: cutoff } },
          { lastContactedAt: null, createdAt: { lt: cutoff } },
        ],
      },
      select: { id: true, stage: true },
      take: 500,
    });
    for (const l of leads) {
      try {
        await prisma.lead.update({
          where: { id: l.id },
          data: { stage: 'LOST', lostReason: 'auto_stale', closedAt: new Date() },
        });
        await onLeadStageChanged(l.id, l.stage, 'LOST');
      } catch (e) {
        logger.error('[lead-auto-lost] update failed', { leadId: l.id, error: e.message });
      }
    }
    if (leads.length > 0) logger.info(`[lead-auto-lost] auto-closed ${leads.length} leads`);
  } catch (e) {
    logger.error('[lead-auto-lost] job error', { error: e.message });
  }
}

function scheduleLeadJobs() {
  cron.schedule('*/15 * * * *', processDueActions, { timezone: 'Asia/Ho_Chi_Minh' });
  cron.schedule('0 * * * *', processStaleLeads, { timezone: 'Asia/Ho_Chi_Minh' });
  cron.schedule('30 0 * * *', autoLostExpired, { timezone: 'Asia/Ho_Chi_Minh' });
  logger.info('[lead-jobs] Scheduled: due (15m), stale (1h), auto-lost (00:30 daily ICT)');
}

module.exports = {
  scheduleLeadJobs,
  processDueActions,
  processStaleLeads,
  autoLostExpired,
};
