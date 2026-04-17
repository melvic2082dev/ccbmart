const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Create a notification for a user.
 * Returns null on failure so callers never crash — notifications are non-critical side effects.
 */
async function createNotification(userId, type, title, content, metadata = {}) {
  try {
    return await prisma.notification.create({
      data: { userId, type, title, content, metadata: JSON.stringify(metadata) },
    });
  } catch (err) {
    console.error('[Notification] createNotification failed:', err.message);
    return null;
  }
}

/**
 * Send notifications to all admins.
 * Swallows errors — notification failures must not break the calling request.
 */
async function notifyAdmins(type, title, content, metadata = {}) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'admin', isActive: true },
      select: { id: true },
    });
    const results = await Promise.allSettled(
      admins.map(admin =>
        prisma.notification.create({
          data: { userId: admin.id, type, title, content, metadata: JSON.stringify(metadata) },
        })
      )
    );
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed > 0) console.error(`[Notification] notifyAdmins: ${failed}/${results.length} failed`);
    return results;
  } catch (err) {
    console.error('[Notification] notifyAdmins failed:', err.message);
    return [];
  }
}

/**
 * Send salary fund warning to admins
 */
async function sendSalaryWarning(usagePercent, totalFixedSalary, salaryFundCap) {
  const formatVND = (n) => new Intl.NumberFormat('vi-VN').format(n) + ' VND';
  await notifyAdmins(
    'SALARY_WARNING',
    `Canh bao quy luong: ${usagePercent.toFixed(1)}%`,
    `Quy luong hien tai ${formatVND(totalFixedSalary)} / ${formatVND(salaryFundCap)}`,
    { usagePercent, totalFixedSalary, salaryFundCap }
  );
}

/**
 * Send rank change notification to a CTV
 */
async function sendRankChangeNotification(ctvId, oldRank, newRank, reason) {
  const direction = getRankLevel(newRank) > getRankLevel(oldRank) ? 'thang cap' : 'ha cap';
  await createNotification(
    ctvId,
    'RANK_CHANGE',
    `Ban da duoc ${direction} len ${newRank}`,
    `Hang cu: ${oldRank} -> Hang moi: ${newRank}. Ly do: ${reason}`,
    { oldRank, newRank, reason }
  );
}

/**
 * Send transaction confirmation notification
 */
async function sendTransactionConfirmedNotification(ctvId, transactionId, amount) {
  const formatVND = (n) => new Intl.NumberFormat('vi-VN').format(n) + ' VND';
  await createNotification(
    ctvId,
    'TRANSACTION_CONFIRMED',
    `Giao dich #${transactionId} da duoc xac nhan`,
    `So tien: ${formatVND(amount)}`,
    { transactionId, amount }
  );
}

/**
 * Get notifications for a user
 */
async function getUserNotifications(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
  const where = { userId };
  if (unreadOnly) where.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return {
    notifications: notifications.map(n => ({
      ...n,
      metadata: typeof n.metadata === 'string' ? JSON.parse(n.metadata) : n.metadata,
    })),
    total,
    unreadCount,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Mark a notification as read
 */
async function markAsRead(notificationId, userId) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
}

/**
 * Mark all notifications as read for a user
 */
async function markAllAsRead(userId) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

// Rank ordering helper
function getRankLevel(rank) {
  const levels = { CTV: 1, PP: 2, TP: 3, GDV: 4, GDKD: 5 };
  return levels[rank] || 0;
}

module.exports = {
  createNotification,
  notifyAdmins,
  sendSalaryWarning,
  sendRankChangeNotification,
  sendTransactionConfirmedNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
};
