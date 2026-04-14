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
// Phí sau thoát ly — GIAI ĐOẠN 1 (12 tháng):
//   Level 1 (3%): F1 cũ — mentor trực tiếp nhận 3% toàn doanh số nhánh thoát
//   Level 2 (2%): F2 cũ — mentor gián tiếp nhận 2% toàn doanh số nhánh thoát
//   Level 3 (1%): GĐKD — CHỈ khi GĐKD không phải F1/F2 cũ. CCB Mart trả từ
//                 quỹ công ty.
//
// Sau 12 tháng (GIAI ĐOẠN 2): BreakawayLog chuyển sang EXPIRED, cơ chế trở
// về mặc định F1=10% / F2=5% / F3=3% với cấp trên MỚI (đã là grandParent).
//
// Nguyên tắc tài chính: TẤT CẢ khoản thù lao/HH/phí đều do CCB Mart chi
// trả từ doanh thu bán hàng — không có chuyển tiền trực tiếp giữa đối tác.
// =======================================================================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

  // 1. Terminate active B2B contract with old mentor
  const activeContract = await prisma.b2BContract.findFirst({
    where: { trainerId: mentorId, traineeId, status: 'active' },
  });
  if (activeContract) {
    await prisma.b2BContract.update({
      where: { id: activeContract.id },
      data: {
        status: 'terminated',
        terminatedAt: now,
        terminationReason: `Breakaway: ${trainee.name} đạt cấp ${trainee.rank}, ngang/vượt mentor ${mentor.rank}`,
      },
    });
  }

  // 2. Mentee register as HKD if chưa
  await prisma.businessHousehold.upsert({
    where: { userId: traineeId },
    create: {
      userId: traineeId,
      businessName: `HKD ${trainee.name}`,
      status: 'active',
    },
    update: { status: 'active' },
  });
  await prisma.user.update({
    where: { id: traineeId },
    data: { isBusinessHousehold: true },
  });

  // 3. Update parentId -> grandParent (C12.4: KHÔNG để lơ lửng null)
  //    Nếu mentor không có parent → mentee thành root (parentId = null).
  if (trainee.parentId === mentorId) {
    await prisma.user.update({
      where: { id: traineeId },
      data: { parentId: grandParentId ?? null },
    });
  }

  // 4. Create new B2BContract với grandParent nếu có
  let newContractNo = null;
  if (grandParentId) {
    const newContractNoStr = `B2B-BRK-${traineeId}-${Date.now().toString(36).toUpperCase()}`;
    await prisma.b2BContract.create({
      data: {
        contractNo: newContractNoStr,
        trainerId: grandParentId,
        traineeId,
        status: 'active',
        expiredAt: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
      },
    });
    newContractNo = newContractNoStr;
  }

  // 5. Create BreakawayLog (12-month window cho phí giai đoạn 1)
  const expireAt = new Date(now);
  expireAt.setMonth(expireAt.getMonth() + 12);

  // Upsert: nếu user đã từng thoát ly, update (unique userId)
  const log = await prisma.breakawayLog.upsert({
    where: { userId: traineeId },
    create: {
      userId: traineeId,
      oldParentId: mentorId,
      newParentId: grandParentId ?? mentorId, // fallback (hiếm khi xảy ra)
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

  return {
    breakaway: true,
    traineeId,
    mentorId,
    grandParentId,
    contractTerminated: activeContract?.contractNo || null,
    newContractNo,
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
      createdAt: { gte: start, lt: end },
    },
    select: { totalAmount: true },
  });
  return txns.reduce((s, t) => s + t.totalAmount, 0);
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
    // Chỉ tính nếu tháng nằm trong cửa sổ 12 tháng
    const start = new Date(`${month}-01`);
    if (start > log.expireAt || start < new Date(log.breakawayAt.getFullYear(), log.breakawayAt.getMonth(), 1)) {
      continue;
    }

    const revenue = await getSubtreeRevenue(log.userId, month);
    if (revenue <= 0) continue;

    // Level 1: F1 cũ (mentor cũ)
    const amt1 = Math.floor(revenue * 0.03);
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

    // Level 2: F2 cũ (ông của mentor cũ tại thời điểm breakaway = newParentId)
    const amt2 = Math.floor(revenue * 0.02);
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

    // Level 3: 1% cho GĐKD — CHỈ khi GĐKD không phải F1/F2 cũ
    // Tìm GĐKD gần nhất trong upline (đi lên từ newParentId → cha → ông)
    let cursorId = log.newParentId;
    let gdkdId = null;
    const visited = new Set();
    while (cursorId && !visited.has(cursorId)) {
      visited.add(cursorId);
      const u = await prisma.user.findUnique({
        where: { id: cursorId },
        select: { id: true, rank: true, parentId: true },
      });
      if (!u) break;
      if (u.rank === 'GDKD') {
        gdkdId = u.id;
        break;
      }
      cursorId = u.parentId;
    }

    if (gdkdId && gdkdId !== log.oldParentId && gdkdId !== log.newParentId) {
      const amt3 = Math.floor(revenue * 0.01);
      if (amt3 > 0) {
        const rec = await prisma.breakawayFee.create({
          data: {
            breakawayLogId: log.id,
            fromUserId: log.userId,
            toUserId: gdkdId,
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
    if (r.level === 1) summary.level1 += r.amount;
    else if (r.level === 2) summary.level2 += r.amount;
    else if (r.level === 3) summary.level3 += r.amount;
    summary.total += r.amount;
  }
  return { ...summary, records: rows };
}

module.exports = {
  shouldBreakaway,
  handleBreakaway,
  processMonthlyBreakawayFees,
  getReceivedBreakawayFeesSummary,
  getSubtreeRevenue,
  RANK_ORDER,
};
