// =======================================================================
// C12.4: Thoát ly + Phí quản lý sau thoát ly (2 giai đoạn)
// -----------------------------------------------------------------------
// Khi mentee đạt cấp ngang/vượt mentor, mentee "thoát ly":
//   1. parentId của mentee được chuyển lên GRANDPARENT (cấp trên của
//      mentor cũ) — mentee KHÔNG còn treo lơ lửng.
//   2. B2BContract với mentor cũ bị terminate.
//   3. Mentee được đăng ký làm HKD (nếu chưa).
//   4. Tạo BreakawayLog với expireAt = +12 tháng.
//
// Phí thoát ly — GIAI ĐOẠN 1 (12 tháng):
//   Tính theo MỐC CỐ ĐỊNH/combo (không tính theo % để tránh diễn giải đa cấp).
//   Mốc xấp xỉ tỉ lệ 3%/2%/1% × giá combo (2.000.000 VND):
//     Level 1 (≈3%): F1 cũ nhận 60.000 VND × số combo nhánh thoát ly
//     Level 2 (≈2%): F2 cũ nhận 40.000 VND × số combo nhánh thoát ly
//     Level 3 (≈1%): GĐKD nhận 20.000 VND × số combo nhánh thoát ly
//                    CHỈ khi GĐKD không phải F1/F2 cũ.
//
// Sau 12 tháng (GIAI ĐOẠN 2): BreakawayLog chuyển sang EXPIRED, cơ chế trở
// về mặc định F1=10% / F2=5% / F3=3% với cấp trên MỚI (đã là grandParent).
//
// Nguyên tắc tài chính: TẤT CẢ khoản thù lao/HH/phí đều do CCB Mart chi
// trả từ doanh thu bán hàng — không có chuyển tiền trực tiếp giữa đối tác.
// =======================================================================

const prisma = require('../lib/prisma');

// Combo unit price (VND) — kept in sync with COMBO_PRICE env. Used to convert
// breakaway-team revenue to combo count for fixed-amount fee tiers.
const COMBO_PRICE = parseInt(process.env.COMBO_PRICE || '1800000', 10);

// Breakaway fee per combo, by level. Math: 60K/40K/20K = 3%/2%/1% × 2M.
const BREAKAWAY_FEE_PER_COMBO = { L1: 60_000, L2: 40_000, L3: 20_000 };

// Rank hierarchy (higher index = higher rank)
const RANK_ORDER = ['CTV', 'PP', 'TP', 'GDV', 'GDKD'];

function getRankIndex(rank) {
  return RANK_ORDER.indexOf(rank);
}

function shouldBreakaway(traineeRank, mentorRank) {
  const traineeIdx = getRankIndex(traineeRank);
  const mentorIdx = getRankIndex(mentorRank);
  return traineeIdx >= mentorIdx && traineeIdx > 0;
}

const MAX_DEPTH = 20;

async function findNearestGdkdInUpline(userId) {
  const visited = new Set([userId]);
  let current = await prisma.user.findUnique({
    where: { id: userId },
    select: { parentId: true },
  });
  let depth = 0;
  while (current?.parentId && depth < MAX_DEPTH) {
    if (visited.has(current.parentId)) break;
    visited.add(current.parentId);
    const parent = await prisma.user.findUnique({
      where: { id: current.parentId },
      select: { id: true, rank: true, parentId: true, isActive: true },
    });
    if (!parent) break;
    if (parent.rank === 'GDKD' && parent.isActive) return parent;
    current = parent;
    depth++;
  }
  return null;
}

/**
 * Handle breakaway:
 *  - Terminate B2BContract mentor cũ
 *  - Update parentId -> grandParent
 *  - Create new B2BContract với grandParent (nếu có)
 *  - Create BreakawayLog ACTIVE, expire = +12 months
 */
async function handleBreakaway(traineeId, mentorId) {
  const trainee = await prisma.user.findUnique({ where: { id: traineeId } });
  const mentor = await prisma.user.findUnique({ where: { id: mentorId } });

  if (!trainee || !mentor) {
    throw new Error('Trainee or mentor not found');
  }
  if (!shouldBreakaway(trainee.rank, mentor.rank)) {
    return { breakaway: false, reason: 'Trainee rank is still below mentor' };
  }

  const now = new Date();
  const grandParentId = mentor.parentId; // cấp trên của mentor cũ

  // 1. Find active contract before transaction (read-only, safe outside)
  const activeContract = await prisma.b2BContract.findFirst({
    where: { trainerId: mentorId, traineeId, status: 'active' },
  });

  const expireAt = new Date(now);
  expireAt.setMonth(expireAt.getMonth() + 12);

  const newContractNoStr = grandParentId
    ? `B2B-BRK-${traineeId}-${Date.now().toString(36).toUpperCase()}`
    : null;

  // Wrap all 5 writes atomically
  const log = await prisma.$transaction(async (tx) => {
    // 1. Terminate active B2B contract with old mentor
    if (activeContract) {
      await tx.b2BContract.update({
        where: { id: activeContract.id },
        data: {
          status: 'terminated',
          terminatedAt: now,
          terminationReason: `Breakaway: ${trainee.name} đạt cấp ${trainee.rank}, ngang/vượt mentor ${mentor.rank}`,
        },
      });
    }

    // 2. Mentee register as HKD if chưa
    await tx.businessHousehold.upsert({
      where: { userId: traineeId },
      create: {
        userId: traineeId,
        businessName: `HKD ${trainee.name}`,
        status: 'active',
      },
      update: { status: 'active' },
    });
    await tx.user.update({
      where: { id: traineeId },
      data: { isBusinessHousehold: true },
    });

    // 3. Update parentId -> grandParent (C12.4: KHÔNG để lơ lửng null)
    if (trainee.parentId === mentorId) {
      await tx.user.update({
        where: { id: traineeId },
        data: { parentId: grandParentId ?? null },
      });
    }

    // 4. Create new B2BContract với grandParent nếu có
    if (grandParentId && newContractNoStr) {
      await tx.b2BContract.create({
        data: {
          contractNo: newContractNoStr,
          trainerId: grandParentId,
          traineeId,
          status: 'active',
          expiredAt: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
        },
      });
    }

    // 5. Create/update BreakawayLog (12-month window cho phí giai đoạn 1)
    return tx.breakawayLog.upsert({
      where: { userId: traineeId },
      create: {
        userId: traineeId,
        oldParentId: mentorId,
        newParentId: grandParentId ?? mentorId,
        breakawayAt: now,
        expireAt,
        status: 'ACTIVE',
      },
      update: {
        oldParentId: mentorId,
        newParentId: grandParentId ?? mentorId,
        breakawayAt: now,
        expireAt,
        status: 'ACTIVE',
      },
    });
  });

  return {
    breakaway: true,
    traineeId,
    mentorId,
    grandParentId,
    contractTerminated: activeContract?.contractNo || null,
    newContractNo: newContractNoStr,
    breakawayLogId: log.id,
    expireAt,
    newRank: trainee.rank,
  };
}

/**
 * Lấy toàn bộ subtree doanh số của 1 user trong tháng (đệ quy).
 * Dùng cho phí sau thoát ly: tính "toàn doanh số nhánh thoát".
 */
async function getSubtreeRevenue(rootUserId, month) {
  const start = new Date(`${month}-01`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  // BFS collect all descendant ids
  const ids = new Set([rootUserId]);
  const queue = [rootUserId];
  while (queue.length) {
    const pid = queue.shift();
    const children = await prisma.user.findMany({
      where: { parentId: pid, role: 'ctv', isActive: true },
      select: { id: true },
    });
    for (const c of children) {
      if (!ids.has(c.id)) {
        ids.add(c.id);
        queue.push(c.id);
      }
    }
  }

  const txns = await prisma.transaction.findMany({
    where: {
      ctvId: { in: Array.from(ids) },
      channel: 'ctv',
      status: 'CONFIRMED',
      createdAt: { gte: start, lt: end },
    },
    select: { totalAmount: true },
  });
  return txns.reduce((s, t) => s + Number(t.totalAmount), 0);
}

/**
 * Tính phí sau thoát ly cho 1 tháng (giai đoạn 1).
 * - Dừng các BreakawayLog đã quá 12 tháng (status = EXPIRED).
 * - Với mỗi BreakawayLog ACTIVE:
 *     + Tính doanh số toàn nhánh thoát trong tháng
 *     + Level 1 = 3% cho F1 cũ (mentor cũ = oldParentId)
 *     + Level 2 = 2% cho F2 cũ (= parent của oldParent tại thời điểm thoát ly;
 *                               trong thực tế = newParentId)
 *     + Level 3 = 1% cho GĐKD (tìm GĐKD gần nhất trong upline mới),
 *                 CHỈ khi GĐKD không phải F1/F2 cũ.
 * - Tạo BreakawayFee records.
 *
 * Recompute-safe: xoá records PENDING cũ của tháng trước khi tạo mới.
 */
async function processMonthlyBreakawayFees(month) {
  // 1. Xoá PENDING cũ để recompute
  await prisma.breakawayFee.deleteMany({
    where: { month, status: 'PENDING' },
  });

  // 2. Đánh dấu các log đã hết hạn
  const now = new Date();
  await prisma.breakawayLog.updateMany({
    where: { status: 'ACTIVE', expireAt: { lt: now } },
    data: { status: 'EXPIRED' },
  });

  // 3. Tính phí cho các log còn ACTIVE
  const activeLogs = await prisma.breakawayLog.findMany({
    where: { status: 'ACTIVE' },
  });

  const created = [];

  for (const log of activeLogs) {
    const gdkdUser = await findNearestGdkdInUpline(log.userId);
    // Chỉ tính nếu tháng nằm trong cửa sổ 12 tháng
    const start = new Date(`${month}-01`);
    if (start > log.expireAt || start < new Date(log.breakawayAt.getFullYear(), log.breakawayAt.getMonth(), 1)) {
      continue;
    }

    const revenue = await getSubtreeRevenue(log.userId, month);
    if (revenue <= 0) continue;

    // Convert revenue → combo count (rounded down — partial combos do not pay).
    const comboCount = Math.floor(revenue / COMBO_PRICE);
    if (comboCount <= 0) continue;

    // Level 1: F1 cũ (mentor cũ) — 60.000 VND × số combo
    const amt1 = comboCount * BREAKAWAY_FEE_PER_COMBO.L1;
    if (amt1 > 0) {
      const rec = await prisma.breakawayFee.create({
        data: {
          breakawayLogId: log.id,
          fromUserId: log.userId,
          toUserId: log.oldParentId,
          level: 1,
          amount: amt1,
          month,
          status: 'PENDING',
        },
      });
      created.push(rec);
    }

    // Level 2: F2 cũ (ông của mentor cũ = newParentId) — 40.000 VND × số combo
    const amt2 = comboCount * BREAKAWAY_FEE_PER_COMBO.L2;
    if (amt2 > 0 && log.newParentId && log.newParentId !== log.oldParentId) {
      const rec = await prisma.breakawayFee.create({
        data: {
          breakawayLogId: log.id,
          fromUserId: log.userId,
          toUserId: log.newParentId,
          level: 2,
          amount: amt2,
          month,
          status: 'PENDING',
        },
      });
      created.push(rec);
    }

    // Level 3: GĐKD — 20.000 VND × số combo, CHỈ khi GĐKD không phải F1/F2 cũ
    if (gdkdUser) {
      const isGdkdAsF1 = gdkdUser.id === log.oldParentId;
      const isGdkdAsF2 = gdkdUser.id === log.newParentId;
      if (!isGdkdAsF1 && !isGdkdAsF2) {
        const amt3 = comboCount * BREAKAWAY_FEE_PER_COMBO.L3;
        if (amt3 > 0) {
          const rec = await prisma.breakawayFee.create({
            data: {
              breakawayLogId: log.id,
              fromUserId: log.userId,
              toUserId: gdkdUser.id,
              level: 3,
              amount: amt3,
              month,
              status: 'PENDING',
            },
          });
          created.push(rec);
        }
      }
    }
  }

  return { month, created: created.length, records: created };
}

/**
 * Summary phí sau thoát ly user nhận được trong tháng.
 */
async function getReceivedBreakawayFeesSummary(userId, month) {
  const rows = await prisma.breakawayFee.findMany({
    where: { toUserId: userId, month },
  });
  const summary = { level1: 0, level2: 0, level3: 0, total: 0 };
  for (const r of rows) {
    if (r.level === 1) summary.level1 += Number(r.amount);
    else if (r.level === 2) summary.level2 += Number(r.amount);
    else if (r.level === 3) summary.level3 += Number(r.amount);
    summary.total += Number(r.amount);
  }
  return { ...summary, records: rows };
}

module.exports = {
  COMBO_PRICE,
  BREAKAWAY_FEE_PER_COMBO,
  shouldBreakaway,
  handleBreakaway,
  processMonthlyBreakawayFees,
  getReceivedBreakawayFeesSummary,
  getSubtreeRevenue,
  RANK_ORDER,
};
