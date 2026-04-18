const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { checkEligibility, activatePromotions } = require('../../services/promotion');
const { invalidateCommissionCache } = require('../../services/commission');
const { asyncHandler, AppError } = require('../../middleware/errorHandler');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/promotions/pending', asyncHandler(async (req, res) => {
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const allCtv = await prisma.user.findMany({
    where: { role: 'ctv', isActive: true, rank: { in: ['CTV', 'PP', 'TP', 'GDV'] } },
    select: { id: true },
  });

  const eligible = [];
  for (const ctv of allCtv) {
    const result = await checkEligibility(ctv.id, monthStr);
    if (result && result.eligible) {
      const existing = await prisma.promotionEligibility.findFirst({
        where: { ctvId: ctv.id, qualifiedMonth: monthStr },
      });
      if (!existing) {
        await prisma.promotionEligibility.create({
          data: {
            ctvId: ctv.id,
            targetRank: result.targetRank,
            qualifiedMonth: monthStr,
            effectiveDate: result.effectiveDate,
          },
        });
      }
      eligible.push(result);
    }
  }

  const promotions = await prisma.promotionEligibility.findMany({
    where: { status: { in: ['PENDING', 'APPROVED'] } },
    include: { ctv: { select: { id: true, name: true, rank: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const history = await prisma.promotionEligibility.findMany({
    where: { status: 'ACTIVATED' },
    include: { ctv: { select: { id: true, name: true, rank: true, email: true } } },
    orderBy: { approvedAt: 'desc' },
    take: 20,
  });

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
