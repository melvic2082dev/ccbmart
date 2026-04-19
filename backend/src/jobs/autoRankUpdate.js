const cron = require('node-cron');
const { getDescendantCount } = require('../services/treeValidator');
const { sendRankChangeNotification, notifyAdmins } = require('../services/notification');
const { invalidateCommissionCache } = require('../services/commission');

const prisma = require('../lib/prisma');

// Lock to prevent concurrent runs
let isRunning = false;

/**
 * Determine rank based on KPI thresholds
 */
function determineRankByKpi(selfCombos, portfolioSize) {
  if (selfCombos >= 50 && portfolioSize >= 1000) return 'GDKD';
  if (selfCombos >= 50 && portfolioSize >= 550) return 'GDV';
  if (selfCombos >= 50 && portfolioSize >= 150) return 'TP';
  if (selfCombos >= 50) return 'PP';
  return 'CTV';
}

/**
 * Get the previous month in YYYY-MM format
 */
function getLastMonth() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Calculate KPI for a CTV in a given month
 */
async function calculateMonthlyKpi(ctvId, month) {
  const [year, monthNum] = month.split('-').map(Number);
  const startDate = new Date(year, monthNum - 1, 1);
  const endDate = new Date(year, monthNum, 1);

  // Count combos sold (each combo = 2,000,000 VND)
  const salesResult = await prisma.transaction.aggregate({
    where: {
      ctvId,
      channel: 'ctv',
      status: 'CONFIRMED',
      createdAt: { gte: startDate, lt: endDate },
    },
    _sum: { totalAmount: true },
    _count: { id: true },
  });

  const totalSales = salesResult._sum.totalAmount || 0;
  const selfCombos = Math.floor(totalSales / 2000000);
  const portfolioSize = await getDescendantCount(ctvId);

  return { selfCombos, portfolioSize, totalSales, transactionCount: salesResult._count.id };
}

/**
 * Run monthly rank evaluation for all CTVs
 */
async function runRankEvaluation(triggeredBy = 'CRON') {
  if (isRunning) {
    console.log('[AutoRank] Already running, skipping...');
    return { skipped: true, reason: 'Already running' };
  }

  isRunning = true;
  const startTime = Date.now();
  console.log(`[AutoRank] Starting rank evaluation (triggered by ${triggeredBy})...`);

  try {
    const lastMonth = getLastMonth();
    const allCtv = await prisma.user.findMany({
      where: { role: 'ctv', isActive: true },
      select: { id: true, name: true, rank: true, email: true },
    });

    const results = { promoted: [], demoted: [], unchanged: 0, errors: [] };

    for (const ctv of allCtv) {
      try {
        const kpi = await calculateMonthlyKpi(ctv.id, lastMonth);
        const newRank = determineRankByKpi(kpi.selfCombos, kpi.portfolioSize);
        const oldRank = ctv.rank || 'CTV';

        // Log KPI regardless of rank change
        await prisma.kpiLog.upsert({
          where: { ctvId_month: { ctvId: ctv.id, month: lastMonth } },
          create: {
            ctvId: ctv.id,
            month: lastMonth,
            selfSales: kpi.selfCombos,
            portfolioSize: kpi.portfolioSize,
            rankBefore: oldRank,
            rankAfter: newRank,
          },
          update: {
            selfSales: kpi.selfCombos,
            portfolioSize: kpi.portfolioSize,
            rankBefore: oldRank,
            rankAfter: newRank,
          },
        });

        if (newRank !== oldRank) {
          // Update rank and create history
          await prisma.$transaction([
            prisma.user.update({
              where: { id: ctv.id },
              data: { rank: newRank },
            }),
            prisma.rankHistory.create({
              data: {
                ctvId: ctv.id,
                oldRank,
                newRank,
                reason: `AUTO_MONTHLY_KPI: ${kpi.selfCombos} combos, ${kpi.portfolioSize} portfolio`,
                changedBy: 'SYSTEM',
              },
            }),
          ]);

          // Send notification
          await sendRankChangeNotification(ctv.id, oldRank, newRank, 'Danh gia KPI tu dong hang thang');

          const entry = {
            ctvId: ctv.id,
            name: ctv.name,
            oldRank,
            newRank,
            kpi,
          };

          if (getRankLevel(newRank) > getRankLevel(oldRank)) {
            results.promoted.push(entry);
          } else {
            results.demoted.push(entry);
          }
        } else {
          results.unchanged++;
        }
      } catch (err) {
        results.errors.push({ ctvId: ctv.id, name: ctv.name, error: err.message });
        console.error(`[AutoRank] Error evaluating CTV ${ctv.id}:`, err.message);
      }
    }

    // Invalidate commission cache after rank changes
    if (results.promoted.length > 0 || results.demoted.length > 0) {
      invalidateCommissionCache();
    }

    // Send admin report
    const totalChanges = results.promoted.length + results.demoted.length;
    if (totalChanges > 0) {
      await notifyAdmins(
        'RANK_UPDATE_REPORT',
        `Bao cao cap nhat hang thang: ${totalChanges} thay doi`,
        `Thang cap: ${results.promoted.length}, Ha cap: ${results.demoted.length}, Khong doi: ${results.unchanged}`,
        { month: lastMonth, ...results }
      );
    }

    const elapsed = Date.now() - startTime;
    console.log(`[AutoRank] Completed in ${elapsed}ms. Promoted: ${results.promoted.length}, Demoted: ${results.demoted.length}, Unchanged: ${results.unchanged}, Errors: ${results.errors.length}`);

    return results;
  } finally {
    isRunning = false;
  }
}

function getRankLevel(rank) {
  const levels = { CTV: 1, PP: 2, TP: 3, GDV: 4, GDKD: 5 };
  return levels[rank] || 0;
}

/**
 * Schedule the cron job: runs at 00:05 on the 1st of every month
 */
function scheduleAutoRankJob() {
  cron.schedule('5 0 1 * *', async () => {
    console.log('[AutoRank] Cron triggered');
    try {
      await runRankEvaluation('CRON');
    } catch (err) {
      console.error('[AutoRank] Cron job failed:', err);
    }
  });
  console.log('[AutoRank] Cron job scheduled: 00:05 on the 1st of every month');
}

module.exports = {
  runRankEvaluation,
  scheduleAutoRankJob,
  calculateMonthlyKpi,
  determineRankByKpi,
};
