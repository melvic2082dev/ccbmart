// =======================================================================
// C12.4: Phí quản lý trong nhóm (F1/F2/F3)
// -----------------------------------------------------------------------
// Đây KHÔNG phải cascading commission. Đây là phí quản lý mà CCB Mart chi
// trả cho cấp trên trên doanh số COMBO BÁN LẺ TRỰC TIẾP của các cấp dưới.
//
// Điều kiện bắt buộc: cấp trên phải có >= 20h đào tạo/tháng (TrainingLog).
//
// | Loại | Cấp nhận | Tỷ lệ | Trên                                    |
// |------|----------|-------|------------------------------------------|
// | F1   | TP+      | 10%   | Combo bán lẻ trực tiếp của F1            |
// | F2   | GĐV+     | 5%    | Combo bán lẻ trực tiếp của F2            |
// | F3   | GĐKD     | 3%    | Combo bán lẻ trực tiếp của F3            |
//
// Nguyên tắc tài chính: CCB Mart là bên chi trả duy nhất cho tất cả các
// khoản thù lao/HH/phí. Không có chuyển tiền trực tiếp giữa đối tác.
// =======================================================================

const prisma = require('../lib/prisma');

const MIN_TRAINING_MINUTES_PER_MONTH = 20 * 60; // 20h = 1200 phút

const LEVEL_CONFIG = [
  // level 1 (F1): 10% — cấp trên trực tiếp phải là TP+
  { level: 1, percent: 0.10, minRank: 'TP' },
  // level 2 (F2): 5% — cấp trên grandparent phải là GĐV+
  { level: 2, percent: 0.05, minRank: 'GDV' },
  // level 3 (F3): 3% — cấp trên great-grandparent phải là GĐKD
  { level: 3, percent: 0.03, minRank: 'GDKD' },
];

const RANK_ORDER = ['CTV', 'PP', 'TP', 'GDV', 'GDKD'];
function rankAtLeast(userRank, minRank) {
  return RANK_ORDER.indexOf(userRank || 'CTV') >= RANK_ORDER.indexOf(minRank);
}

/**
 * Trả về tổng thời lượng đào tạo (phút) mà 1 user đóng vai trò trainer trong tháng.
 * Chỉ tính log đã VERIFIED (mentee đã confirm hoặc admin đã xác nhận).
 */
async function getTrainerMinutes(userId, month) {
  const start = new Date(`${month}-01`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  const logs = await prisma.trainingLog.findMany({
    where: {
      trainerId: userId,
      status: 'VERIFIED',
      sessionDate: { gte: start, lt: end },
    },
    select: { durationMinutes: true },
  });
  return logs.reduce((sum, l) => sum + (l.durationMinutes || 0), 0);
}

/**
 * Doanh số combo bán lẻ TRỰC TIẾP của 1 CTV trong tháng
 * (channel = ctv, ctvId = userId, chỉ tính transaction của chính user đó,
 * không đệ quy xuống cấp dưới).
 */
async function getPersonalComboRevenue(userId, month) {
  const start = new Date(`${month}-01`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  const txns = await prisma.transaction.findMany({
    where: {
      ctvId: userId,
      channel: 'ctv',
      createdAt: { gte: start, lt: end },
    },
    select: { totalAmount: true },
  });
  return txns.reduce((s, t) => s + Number(t.totalAmount), 0);
}

/**
 * Trả về { f1, f2, f3 } — các cấp trên 1/2/3 (parent, grandparent, great-grandparent).
 */
async function getUplineChain(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { parentId: true },
  });
  if (!user?.parentId) return { f1: null, f2: null, f3: null };

  const f1 = await prisma.user.findUnique({
    where: { id: user.parentId },
    select: { id: true, rank: true, parentId: true },
  });
  if (!f1?.parentId) return { f1, f2: null, f3: null };

  const f2 = await prisma.user.findUnique({
    where: { id: f1.parentId },
    select: { id: true, rank: true, parentId: true },
  });
  if (!f2?.parentId) return { f1, f2, f3: null };

  const f3 = await prisma.user.findUnique({
    where: { id: f2.parentId },
    select: { id: true, rank: true, parentId: true },
  });
  return { f1, f2, f3 };
}

/**
 * Tính toàn bộ phí quản lý (F1/F2/F3) cho 1 tháng và ghi vào bảng management_fees.
 * Trả về danh sách records đã tạo.
 *
 * Chú ý: hàm xoá các record PENDING cũ của cùng tháng trước khi tính lại —
 * cho phép gọi lặp để recompute mà không trùng.
 */
async function calculateMonthlyManagementFees(month) {
  // 1. Xoá records PENDING cũ của tháng (để recompute)
  await prisma.managementFee.deleteMany({
    where: { month, status: 'PENDING' },
  });

  // 2. Lấy tất cả CTV active có phát sinh doanh số trong tháng
  const ctvs = await prisma.user.findMany({
    where: { role: 'ctv', isActive: true },
    select: { id: true, rank: true, parentId: true },
  });

  // Cache training minutes cho mỗi mentor để tránh query lặp
  const trainingCache = new Map();
  async function hasEnoughTraining(userId) {
    if (trainingCache.has(userId)) return trainingCache.get(userId);
    const mins = await getTrainerMinutes(userId, month);
    const ok = mins >= MIN_TRAINING_MINUTES_PER_MONTH;
    trainingCache.set(userId, ok);
    return ok;
  }

  const created = [];

  for (const ctv of ctvs) {
    const revenue = await getPersonalComboRevenue(ctv.id, month);
    if (revenue <= 0) continue;

    const { f1, f2, f3 } = await getUplineChain(ctv.id);
    const uplines = [f1, f2, f3];

    for (const cfg of LEVEL_CONFIG) {
      const upline = uplines[cfg.level - 1];
      if (!upline) continue;
      if (!rankAtLeast(upline.rank, cfg.minRank)) continue;
      if (!(await hasEnoughTraining(upline.id))) continue;

      const amount = Math.floor(revenue * cfg.percent);
      if (amount <= 0) continue;

      const rec = await prisma.managementFee.create({
        data: {
          fromUserId: ctv.id,
          toUserId: upline.id,
          level: cfg.level,
          amount,
          month,
          status: 'PENDING',
        },
      });
      created.push(rec);
    }
  }

  return { month, created: created.length, records: created };
}

/**
 * Tổng phí quản lý mà 1 user nhận được trong tháng (theo level).
 */
async function getReceivedManagementFeesSummary(userId, month) {
  const rows = await prisma.managementFee.findMany({
    where: { toUserId: userId, month },
  });
  const summary = { f1: 0, f2: 0, f3: 0, total: 0 };
  for (const r of rows) {
    if (r.level === 1) summary.f1 += Number(r.amount);
    else if (r.level === 2) summary.f2 += Number(r.amount);
    else if (r.level === 3) summary.f3 += Number(r.amount);
    summary.total += Number(r.amount);
  }
  return { ...summary, records: rows };
}

module.exports = {
  MIN_TRAINING_MINUTES_PER_MONTH,
  LEVEL_CONFIG,
  calculateMonthlyManagementFees,
  getReceivedManagementFeesSummary,
  getTrainerMinutes,
};
