const cron = require('node-cron');
const prisma = require('../lib/prisma');

async function resetMonthlyReferralCaps() {
  console.log('[ReferralCap] Resetting monthly referral earnings...');
  const result = await prisma.memberWallet.updateMany({
    where: { monthlyReferralEarned: { gt: 0 } },
    data: { monthlyReferralEarned: 0 },
  });
  console.log(`[ReferralCap] Reset ${result.count} wallets`);
  return result.count;
}

function scheduleReferralCapReset() {
  cron.schedule('0 0 1 * *', async () => {
    console.log('[ReferralCap] Cron triggered');
    try {
      await resetMonthlyReferralCaps();
    } catch (err) {
      console.error('[ReferralCap] Cron job failed:', err);
    }
  });
  console.log('[ReferralCap] Cron job scheduled: 00:00 on 1st of every month');
}

module.exports = { resetMonthlyReferralCaps, scheduleReferralCapReset };
