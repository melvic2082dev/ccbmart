const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Fee tiers for training service fees (Phí DV đào tạo)
const FEE_TIERS = [
  { tier: 'M0', minCombo: 0,   maxCombo: 49,   feeAmount: 0 },
  { tier: 'M1', minCombo: 50,  maxCombo: 99,   feeAmount: 1500000 },
  { tier: 'M2', minCombo: 100, maxCombo: 199,  feeAmount: 3000000 },
  { tier: 'M3', minCombo: 200, maxCombo: 299,  feeAmount: 4500000 },
  { tier: 'M4', minCombo: 300, maxCombo: 399,  feeAmount: 6000000 },
  { tier: 'M5', minCombo: 400, maxCombo: null,  feeAmount: 7500000 },
];

/**
 * Calculate training fee for a trainee based on their branch combo count
 */
async function calculateTrainingFee(traineeId, month) {
  const startDate = new Date(`${month}-01`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  // Count combos in the trainee's branch (personal + downline)
  const branchComboCount = await countBranchCombos(traineeId, startDate, endDate);

  // Find matching tier from DB first, fallback to hardcoded
  let feeConfig = await prisma.feeConfig.findMany({
    where: { isActive: true },
    orderBy: { minCombo: 'asc' },
  });

  if (feeConfig.length === 0) {
    feeConfig = FEE_TIERS;
  }

  let matchedTier = feeConfig[0];
  for (const tier of feeConfig) {
    if (branchComboCount >= tier.minCombo) {
      if (tier.maxCombo === null || branchComboCount <= tier.maxCombo) {
        matchedTier = tier;
        break;
      }
      // If branchComboCount exceeds maxCombo, continue to next tier
      matchedTier = tier;
    }
  }

  // For M5 (400+), always match if count >= 400
  const lastTier = feeConfig[feeConfig.length - 1];
  if (branchComboCount >= lastTier.minCombo) {
    matchedTier = lastTier;
  }

  return {
    traineeId,
    month,
    branchComboCount,
    tier: matchedTier.tier,
    feeAmount: matchedTier.feeAmount,
  };
}

/**
 * Count combos in a user's branch (personal + all downline)
 */
async function countBranchCombos(userId, startDate, endDate) {
  // Personal combos
  const personalTxns = await prisma.transaction.count({
    where: {
      ctvId: userId,
      channel: 'ctv',
      createdAt: { gte: startDate, lt: endDate },
    },
  });

  // Downline combos (recursive)
  const downlineIds = await getDownlineIds(userId);
  let downlineCombos = 0;
  if (downlineIds.length > 0) {
    downlineCombos = await prisma.transaction.count({
      where: {
        ctvId: { in: downlineIds },
        channel: 'ctv',
        createdAt: { gte: startDate, lt: endDate },
      },
    });
  }

  return personalTxns + downlineCombos;
}

/**
 * Get all downline user IDs recursively
 */
async function getDownlineIds(userId) {
  const ids = [];
  const directReports = await prisma.user.findMany({
    where: { parentId: userId, role: 'ctv', isActive: true },
    select: { id: true },
  });

  for (const child of directReports) {
    ids.push(child.id);
    const childDownline = await getDownlineIds(child.id);
    ids.push(...childDownline);
  }

  return ids;
}

/**
 * Calculate K factor: K = (3% x Total Revenue) / (Total theoretical training fees)
 * K is capped at minimum 0.7
 */
async function calculateKFactor(month) {
  const startDate = new Date(`${month}-01`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  // Total CTV channel revenue
  const txns = await prisma.transaction.findMany({
    where: { channel: 'ctv', createdAt: { gte: startDate, lt: endDate } },
    select: { totalAmount: true },
  });
  const totalRevenue = txns.reduce((sum, t) => sum + t.totalAmount, 0);
  const trainingFund = totalRevenue * 0.03; // 3% of total revenue

  // Calculate total theoretical fees for all eligible trainers
  const trainers = await prisma.user.findMany({
    where: { role: 'ctv', isActive: true, rank: { in: ['PP', 'TP', 'GDV', 'GDKD'] } },
  });

  let totalTheoreticalFees = 0;
  for (const trainer of trainers) {
    const fee = await calculateTrainingFee(trainer.id, month);
    totalTheoreticalFees += fee.feeAmount;
  }

  const kFactor = totalTheoreticalFees > 0
    ? Math.max(0.7, trainingFund / totalTheoreticalFees)
    : 1;

  return {
    month,
    totalRevenue,
    trainingFund,
    totalTheoreticalFees,
    kFactor: Math.round(kFactor * 1000) / 1000,
    actualTotalFees: Math.floor(totalTheoreticalFees * kFactor),
  };
}

module.exports = {
  calculateTrainingFee,
  calculateKFactor,
  countBranchCombos,
  FEE_TIERS,
};
