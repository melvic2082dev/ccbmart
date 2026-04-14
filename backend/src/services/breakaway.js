const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Rank hierarchy (higher index = higher rank)
const RANK_ORDER = ['CTV', 'PP', 'TP', 'GDV', 'GDKD'];

function getRankIndex(rank) {
  return RANK_ORDER.indexOf(rank);
}

/**
 * Determine if a trainee should break away from their mentor
 * Breakaway happens when trainee reaches same or higher rank than mentor
 */
function shouldBreakaway(traineeRank, mentorRank) {
  const traineeIdx = getRankIndex(traineeRank);
  const mentorIdx = getRankIndex(mentorRank);
  return traineeIdx >= mentorIdx && traineeIdx > 0;
}

/**
 * Handle breakaway process:
 * 1. Terminate B2B contract
 * 2. Register trainee as independent BusinessHousehold
 * 3. Update hierarchy
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

  // 1. Terminate active B2B contract
  const activeContract = await prisma.b2BContract.findFirst({
    where: {
      trainerId: mentorId,
      traineeId: traineeId,
      status: 'active',
    },
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

  // 2. Register/update as BusinessHousehold
  await prisma.businessHousehold.upsert({
    where: { userId: traineeId },
    create: {
      userId: traineeId,
      businessName: `HKD ${trainee.name}`,
      status: 'active',
    },
    update: {
      status: 'active',
    },
  });

  await prisma.user.update({
    where: { id: traineeId },
    data: { isBusinessHousehold: true },
  });

  // 3. Remove parent relationship (trainee becomes independent)
  if (trainee.parentId === mentorId) {
    await prisma.user.update({
      where: { id: traineeId },
      data: { parentId: null },
    });
  }

  return {
    breakaway: true,
    traineeId,
    mentorId,
    contractTerminated: activeContract?.contractNo || null,
    newRank: trainee.rank,
  };
}

module.exports = {
  shouldBreakaway,
  handleBreakaway,
  RANK_ORDER,
};
