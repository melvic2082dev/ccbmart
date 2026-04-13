const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Calculate team bonus (thuong dan dat doi nhom) for all eligible CTVs
 * Source: 2% from Marketing budget
 * Tiers: 5-9 direct (0.5%), 10-19 (1%), 20-49 (1.5%), 50+ (2%)
 * Split: <20 = 100% points, 20-49 = 70% points + 30% cash, 50+ = 50/50
 */
async function calculateTeamBonus(month) {
  const startDate = new Date(`${month}-01`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  // Get all CTVs with their direct member counts
  const allCtv = await prisma.user.findMany({
    where: { role: 'ctv', isActive: true },
    select: { id: true, name: true, rank: true, parentId: true },
  });

  // Count direct members per CTV
  const directCountMap = new Map();
  for (const ctv of allCtv) {
    if (ctv.parentId) {
      directCountMap.set(ctv.parentId, (directCountMap.get(ctv.parentId) || 0) + 1);
    }
  }

  // Get team revenue (direct members only)
  const transactions = await prisma.transaction.findMany({
    where: {
      channel: 'ctv',
      status: 'CONFIRMED',
      createdAt: { gte: startDate, lt: endDate },
    },
    select: { ctvId: true, totalAmount: true },
  });

  // Build parent-to-team-revenue map
  const ctvRevenueMap = new Map();
  for (const tx of transactions) {
    ctvRevenueMap.set(tx.ctvId, (ctvRevenueMap.get(tx.ctvId) || 0) + tx.totalAmount);
  }

  // Build parentId -> children IDs
  const childrenMap = new Map();
  for (const ctv of allCtv) {
    if (ctv.parentId) {
      if (!childrenMap.has(ctv.parentId)) childrenMap.set(ctv.parentId, []);
      childrenMap.get(ctv.parentId).push(ctv.id);
    }
  }

  const results = [];

  for (const ctv of allCtv) {
    const directCount = directCountMap.get(ctv.id) || 0;
    if (directCount < 5) continue; // Minimum 5 direct members

    // Calculate team revenue (direct members only)
    const childIds = childrenMap.get(ctv.id) || [];
    let teamRevenue = 0;
    for (const childId of childIds) {
      teamRevenue += ctvRevenueMap.get(childId) || 0;
    }

    if (teamRevenue === 0) continue;

    // Determine bonus rate
    let bonusRate = 0;
    if (directCount >= 50) bonusRate = 0.02;
    else if (directCount >= 20) bonusRate = 0.015;
    else if (directCount >= 10) bonusRate = 0.01;
    else bonusRate = 0.005;

    const bonusAmount = teamRevenue * bonusRate;

    // Determine split (cash vs points)
    let cashAmount = 0;
    let pointAmount = 0;
    if (directCount >= 50) {
      cashAmount = bonusAmount * 0.50;
      pointAmount = bonusAmount * 0.50;
    } else if (directCount >= 20) {
      cashAmount = bonusAmount * 0.30;
      pointAmount = bonusAmount * 0.70;
    } else {
      cashAmount = 0;
      pointAmount = bonusAmount;
    }

    results.push({
      ctvId: ctv.id,
      name: ctv.name,
      rank: ctv.rank,
      month,
      directMemberCount: directCount,
      teamRevenue,
      bonusRate,
      bonusAmount,
      cashAmount,
      pointAmount,
    });
  }

  // Upsert team bonus records
  for (const r of results) {
    const existing = await prisma.teamBonus.findFirst({
      where: { ctvId: r.ctvId, month: r.month },
    });

    if (existing) {
      await prisma.teamBonus.update({
        where: { id: existing.id },
        data: {
          directMemberCount: r.directMemberCount,
          teamRevenue: r.teamRevenue,
          bonusRate: r.bonusRate,
          bonusAmount: r.bonusAmount,
          cashAmount: r.cashAmount,
          pointAmount: r.pointAmount,
        },
      });
    } else {
      const bonus = await prisma.teamBonus.create({
        data: {
          ctvId: r.ctvId,
          month: r.month,
          directMemberCount: r.directMemberCount,
          teamRevenue: r.teamRevenue,
          bonusRate: r.bonusRate,
          bonusAmount: r.bonusAmount,
          cashAmount: r.cashAmount,
          pointAmount: r.pointAmount,
        },
      });

      // Create loyalty points for point portion (1 point = 500 VND)
      if (r.pointAmount > 0) {
        const points = Math.floor(r.pointAmount / 500);
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);

        await prisma.loyaltyPoint.create({
          data: {
            userId: r.ctvId,
            points,
            source: 'TEAM_BONUS',
            referenceId: bonus.id,
            expiresAt,
          },
        });
      }
    }
  }

  return {
    month,
    totalBonuses: results.length,
    totalAmount: results.reduce((s, r) => s + r.bonusAmount, 0),
    totalCash: results.reduce((s, r) => s + r.cashAmount, 0),
    totalPoints: results.reduce((s, r) => s + r.pointAmount, 0),
    details: results,
  };
}

module.exports = { calculateTeamBonus };
