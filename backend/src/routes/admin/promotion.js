const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { checkEligibility, activatePromotions } = require('../../services/promotion');
const { invalidateCommissionCache } = require('../../services/commission');
const { asyncHandler, AppError } = require('../../middleware/errorHandler');

const router = express.Router();
const prisma = new PrismaClient();

// Batch size for parallel eligibility checks to avoid overwhelming the connection pool
const ELIGIBILITY_BATCH_SIZE = 10;

router.get('/promotions/pending', asyncHandler(async (req, res) => {
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const allCtv = await prisma.user.findMany({
    where: { role: 'ctv', isActive: true, rank: { in: ['CTV', 'PP', 'TP', 'GDV'] } },
    select: { id: true },
  });

  // Pre-load existing promotions for this month in one query (eliminates N findFirst calls)
  const existingPromos = await prisma.promotionEligibility.findMany({
    where: { qualifiedMonth: monthStr },
    select: { ctvId: true },
  });
  const existingCtvIds = new Set(existingPromos.map(p => p.ctvId));

  // Run eligibility checks in parallel batches (replaces sequential loop)
  const eligibilityResults = [];
  for (let i = 0; i < allCtv.length; i += ELIGIBILITY_BATCH_SIZE) {
    const batch = allCtv.slice(i, i + ELIGIBILITY_BATCH_SIZE);
    const results = await Promise.all(batch.map(ctv => checkEligibility(ctv.id, monthStr)));
    eligibilityResults.push(...results);
  }

  // Collect new eligible records to batch-create
  const eligible = [];
  const toCreate = [];
  for (let i = 0; i < allCtv.length; i++) {
    const result = eligibilityResults[i];
    if (result && result.eligible) {
      if (!existingCtvIds.has(allCtv[i].id)) {
        toCreate.push({
          ctvId: allCtv[i].id,
          targetRank: result.targetRank,
          qualifiedMonth: monthStr,
          effectiveDate: result.effectiveDate,
        });
      }
      eligible.push(result);
    }
  }

  // Batch create instead of N individual creates
  if (toCreate.length > 0) {
    await prisma.promotionEligibility.createMany({
      data: toCreate,
      skipDuplicates: true,
    });
  }

  const [promotions, history] = await Promise.all([
    prisma.promotionEligibility.findMany({
      where: { status: { in: ['PENDING', 'APPROVED'] } },
      include: { ctv: { select: { id: true, name: true, rank: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.promotionEligibility.findMany({
      where: { status: 'ACTIVATED' },
      include: { ctv: { select: { id: true, name: true, rank: true, email: true } } },
      orderBy: { approvedAt: 'desc' },
      take: 20,
    }),
  ]);

  res.json({ pending: promotions, history, newEligible: eligible.length });
}));

router.post('/promotions/:id/approve', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const promo = await prisma.promotionEligibility.findUnique({ where: { id } });
  if (!promo) throw new AppError('Promotion not found', 404, 'PROMOTION_NOT_FOUND');
  if (promo.status !== 'PENDING') throw new AppError('Promotion is not pending', 400, 'INVALID_STATUS');

  await prisma.promotionEligibility.update({
    where: { id },
    data: { status: 'APPROVED', approvedBy: req.user.id, approvedAt: new Date() },
  });

  res.json({ success: true });
}));

router.post('/promotions/activate', asyncHandler(async (req, res) => {
  const result = await activatePromotions();
  invalidateCommissionCache();
  res.json(result);
}));

module.exports = router;
