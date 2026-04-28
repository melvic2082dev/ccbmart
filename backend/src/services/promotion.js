const prisma = require('../lib/prisma');

/**
 * Check if a CTV is eligible for promotion (T+1 rule, V13.4 spec)
 * - CTV→PP : 50 combo/thang ca nhan
 * - PP→TP  : 50 combo ca nhan + 10 CTV truc tiep + nhom >=150 combo
 * - TP→GDV : 50 combo ca nhan + 10 PP/TP truc tiep + nhom >=550 combo
 *            (PHAI duy tri 3 thang lien tiep — checked at activation time)
 * - GDV→GDKD: 50 combo ca nhan + 10 TP/GDV truc tiep + nhom >=2000 combo
 *             (PHAI duy tri 3 thang lien tiep — checked at activation time)
 */
async function checkEligibility(ctvId, month) {
  const user = await prisma.user.findUnique({ where: { id: ctvId } });
  if (!user || user.role !== 'ctv') return null;

  const rank = user.rank || 'CTV';
  const startDate = new Date(`${month}-01`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  const directMembers = await prisma.user.findMany({
    where: { parentId: ctvId, role: 'ctv', isActive: true },
    select: { id: true, rank: true },
  });

  // Personal combos this month
  const personalCombos = await prisma.transaction.count({
    where: { ctvId, channel: 'ctv', status: 'CONFIRMED', createdAt: { gte: startDate, lt: endDate } },
  });

  // Branch combos (self + all descendants)
  const allDescendantIds = await getDescendantIds(ctvId);
  const branchCombos = await prisma.transaction.count({
    where: {
      ctvId: { in: [...allDescendantIds, ctvId] },
      channel: 'ctv',
      status: 'CONFIRMED',
      createdAt: { gte: startDate, lt: endDate },
    },
  });

  let eligible = false;
  let targetRank = null;
  let reason = '';

  if (rank === 'CTV') {
    if (personalCombos >= 50) {
      eligible = true;
      targetRank = 'PP';
      reason = `${personalCombos} combo ca nhan`;
    }
  } else if (rank === 'PP') {
    const directCtvCount = directMembers.filter(m => (m.rank || 'CTV') === 'CTV').length;
    if (personalCombos >= 50 && directCtvCount >= 10 && branchCombos >= 150) {
      eligible = true;
      targetRank = 'TP';
      reason = `${personalCombos} combo CN, ${directCtvCount} CTV TT, ${branchCombos} combo nhom`;
    }
  } else if (rank === 'TP') {
    const directPpTpCount = directMembers.filter(m => m.rank === 'PP' || m.rank === 'TP').length;
    if (personalCombos >= 50 && directPpTpCount >= 10 && branchCombos >= 550) {
      eligible = true;
      targetRank = 'GDV';
      reason = `${personalCombos} combo CN, ${directPpTpCount} PP/TP TT, ${branchCombos} combo nhom (can du tri 3 thang)`;
    }
  } else if (rank === 'GDV') {
    const directTpGdvCount = directMembers.filter(m => m.rank === 'TP' || m.rank === 'GDV').length;
    if (personalCombos >= 50 && directTpGdvCount >= 10 && branchCombos >= 2000) {
      eligible = true;
      targetRank = 'GDKD';
      reason = `${personalCombos} combo CN, ${directTpGdvCount} TP/GDV TT, ${branchCombos} combo nhom (can du tri 3 thang + HDLD sau 3 thang)`;
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
