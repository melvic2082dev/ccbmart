const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Check if a CTV is eligible for promotion (T+1 rule)
 * - CTV→PP: 5 thanh vien truc tiep dat >=10 combo/nguoi
 * - PP→TP: 3 PP do minh dan dat + doanh so nhom >=500tr
 * - TP→GDV: 5 TP + doanh so >=2 ty
 * - GDV→GDKD: 3 GDV + doanh so >=5 ty (HDQT duyet)
 */
async function checkEligibility(ctvId, month) {
  const user = await prisma.user.findUnique({ where: { id: ctvId } });
  if (!user || user.role !== 'ctv') return null;

  const rank = user.rank || 'CTV';
  const startDate = new Date(`${month}-01`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  // Get direct children
  const directMembers = await prisma.user.findMany({
    where: { parentId: ctvId, role: 'ctv', isActive: true },
    select: { id: true, rank: true },
  });

  // Get transaction counts for direct members
  const directMemberIds = directMembers.map(m => m.id);
  const memberTxCounts = await prisma.transaction.groupBy({
    by: ['ctvId'],
    where: {
      ctvId: { in: directMemberIds },
      channel: 'ctv',
      status: 'CONFIRMED',
      createdAt: { gte: startDate, lt: endDate },
    },
    _count: { id: true },
  });
  const txCountMap = new Map(memberTxCounts.map(t => [t.ctvId, t._count.id]));

  // Get team revenue (all descendants)
  const allDescendantIds = await getDescendantIds(ctvId);
  const teamRevenueResult = await prisma.transaction.aggregate({
    where: {
      ctvId: { in: [...allDescendantIds, ctvId] },
      channel: 'ctv',
      status: 'CONFIRMED',
      createdAt: { gte: startDate, lt: endDate },
    },
    _sum: { totalAmount: true },
  });
  const teamRevenue = teamRevenueResult._sum.totalAmount || 0;

  let eligible = false;
  let targetRank = null;
  let reason = '';

  if (rank === 'CTV') {
    // CTV→PP: 5 thanh vien truc tiep dat >=10 combo
    const qualifiedMembers = directMembers.filter(m => (txCountMap.get(m.id) || 0) >= 10);
    if (qualifiedMembers.length >= 5) {
      eligible = true;
      targetRank = 'PP';
      reason = `${qualifiedMembers.length} thanh vien truc tiep dat >=10 combo`;
    }
  } else if (rank === 'PP') {
    // PP→TP: 3 PP truc tiep + doanh so nhom >=500tr
    const ppCount = directMembers.filter(m => m.rank === 'PP').length;
    if (ppCount >= 3 && teamRevenue >= 500000000) {
      eligible = true;
      targetRank = 'TP';
      reason = `${ppCount} PP truc tiep, doanh so nhom ${(teamRevenue / 1000000).toFixed(0)}tr`;
    }
  } else if (rank === 'TP') {
    // TP→GDV: 5 TP + doanh so >=2 ty
    const tpCount = directMembers.filter(m => m.rank === 'TP').length;
    if (tpCount >= 5 && teamRevenue >= 2000000000) {
      eligible = true;
      targetRank = 'GDV';
      reason = `${tpCount} TP truc tiep, doanh so nhom ${(teamRevenue / 1000000000).toFixed(1)} ty`;
    }
  } else if (rank === 'GDV') {
    // GDV→GDKD: 3 GDV + doanh so >=5 ty (HDQT duyet)
    const gdvCount = directMembers.filter(m => m.rank === 'GDV').length;
    if (gdvCount >= 3 && teamRevenue >= 5000000000) {
      eligible = true;
      targetRank = 'GDKD';
      reason = `${gdvCount} GDV truc tiep, doanh so nhom ${(teamRevenue / 1000000000).toFixed(1)} ty (can HDQT duyet)`;
    }
  }

  if (!eligible) return { eligible: false, ctvId, currentRank: rank };

  // Calculate effective date (1st of next month = T+1)
  const effectiveDate = new Date(endDate);

  return {
    eligible: true,
    ctvId,
    currentRank: rank,
    targetRank,
    qualifiedMonth: month,
    effectiveDate,
    reason,
  };
}

/**
 * Get all descendant IDs of a CTV (recursive)
 */
async function getDescendantIds(ctvId) {
  const children = await prisma.user.findMany({
    where: { parentId: ctvId, role: 'ctv', isActive: true },
    select: { id: true },
  });
  let ids = children.map(c => c.id);
  for (const child of children) {
    const childDescendants = await getDescendantIds(child.id);
    ids = ids.concat(childDescendants);
  }
  return ids;
}

/**
 * Activate all APPROVED promotions (run on 1st of each month)
 */
async function activatePromotions() {
  const pending = await prisma.promotionEligibility.findMany({
    where: {
      status: 'APPROVED',
      effectiveDate: { lte: new Date() },
    },
    include: { ctv: { select: { id: true, rank: true, name: true } } },
  });

  const results = [];
  for (const promo of pending) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: promo.ctvId },
        data: { rank: promo.targetRank },
      }),
      prisma.rankHistory.create({
        data: {
          ctvId: promo.ctvId,
          oldRank: promo.ctv.rank || 'CTV',
          newRank: promo.targetRank,
          reason: `Bo nhiem T+1: du dieu kien thang ${promo.qualifiedMonth}`,
          changedBy: 'System (T+1)',
        },
      }),
      prisma.promotionEligibility.update({
        where: { id: promo.id },
        data: { status: 'ACTIVATED' },
      }),
    ]);
    results.push({ ctvId: promo.ctvId, name: promo.ctv.name, newRank: promo.targetRank });
  }

  return { activated: results.length, details: results };
}

module.exports = {
  checkEligibility,
  activatePromotions,
};
