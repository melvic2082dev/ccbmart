const cron = require('node-cron');
const { createNotification, notifyAdmins } = require('../services/notification');

const prisma = require('../lib/prisma');

/**
 * Check for CTV holding cash too long
 * - > 24h: send reminder
 * - > 48h: lock account + notify admin
 */
async function checkUnsubmittedCash() {
  console.log('[CashCheck] Running unsubmitted cash check...');

  const now = new Date();
  const threshold24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const threshold48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  // Find cash transactions PENDING and not in a deposit, older than 24h
  const overdueTxns = await prisma.transaction.findMany({
    where: {
      paymentMethod: 'cash',
      status: 'PENDING',
      cashDepositId: null,
      channel: 'ctv',
      ctvSubmittedAt: { lt: threshold24h },
    },
    include: { ctv: { select: { id: true, name: true, isActive: true } } },
  });

  if (overdueTxns.length === 0) {
    console.log('[CashCheck] No overdue cash transactions found');
    return { reminders: 0, locked: 0 };
  }

  // Group by CTV
  const byCtvId = new Map();
  for (const tx of overdueTxns) {
    if (!byCtvId.has(tx.ctvId)) byCtvId.set(tx.ctvId, []);
    byCtvId.get(tx.ctvId).push(tx);
  }

  let reminders = 0;
  let locked = 0;

  for (const [ctvId, txns] of byCtvId) {
    const ctv = txns[0].ctv;
    const totalAmount = txns.reduce((s, t) => s + t.totalAmount, 0);

    // Check if any are over 48h
    const hasOver48h = txns.some(tx =>
      tx.ctvSubmittedAt && new Date(tx.ctvSubmittedAt) < threshold48h
    );

    if (hasOver48h && ctv.isActive) {
      // Lock account
      await prisma.user.update({
        where: { id: ctvId },
        data: { isActive: false },
      });

      await createNotification(
        ctvId,
        'ACCOUNT_LOCKED',
        'Tai khoan bi khoa',
        `Tai khoan bi khoa do giu tien mat qua 48h. Tong: ${totalAmount.toLocaleString('vi-VN')} VND (${txns.length} giao dich)`,
        { reason: 'CASH_HOLD_EXCEEDED', amount: totalAmount, transactionCount: txns.length }
      );

      await notifyAdmins(
        'CTV_ACCOUNT_LOCKED',
        `CTV ${ctv.name} bi khoa do giu tien qua han`,
        `Giu ${totalAmount.toLocaleString('vi-VN')} VND qua 48h (${txns.length} giao dich)`,
        { ctvId, ctvName: ctv.name, amount: totalAmount }
      );

      locked++;
      console.log(`[CashCheck] LOCKED CTV ${ctvId} (${ctv.name}): ${txns.length} txns, ${totalAmount} VND`);
    } else if (!hasOver48h) {
      // Send reminder (24h-48h range)
      await createNotification(
        ctvId,
        'CASH_REMINDER',
        'Nhac nho nop tien mat',
        `Ban co ${txns.length} giao dich tien mat chua nop, tong ${totalAmount.toLocaleString('vi-VN')} VND. Vui long nop trong 24h.`,
        { amount: totalAmount, transactionCount: txns.length }
      );

      reminders++;
      console.log(`[CashCheck] Reminded CTV ${ctvId} (${ctv.name}): ${txns.length} txns`);
    }
  }

  console.log(`[CashCheck] Done. Reminders: ${reminders}, Locked: ${locked}`);
  return { reminders, locked };
}

/**
 * Schedule: every 6 hours
 */
function scheduleCashCheckJob() {
  cron.schedule('0 */6 * * *', async () => {
    console.log('[CashCheck] Cron triggered');
    try {
      await checkUnsubmittedCash();
    } catch (err) {
      console.error('[CashCheck] Cron job failed:', err);
    }
  });
  console.log('[CashCheck] Cron job scheduled: every 6 hours');
}

module.exports = { checkUnsubmittedCash, scheduleCashCheckJob };
