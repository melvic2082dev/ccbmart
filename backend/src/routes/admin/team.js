const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { calculateTeamBonus } = require('../../services/team-bonus');
const { calculateSoftSalary } = require('../../services/soft-salary');
const { asyncHandler, AppError } = require('../../middleware/errorHandler');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/salary/soft-adjustment', asyncHandler(async (req, res) => {
  const now = new Date();
  const monthStr = req.query.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const result = await calculateSoftSalary(monthStr);
  res.json(result);
}));

router.get('/team-bonus/:month', asyncHandler(async (req, res) => {
  const bonuses = await prisma.teamBonus.findMany({
    where: { month: req.params.month },
    include: { ctv: { select: { id: true, name: true, rank: true } } },
    orderBy: { bonusAmount: 'desc' },
  });
  res.json(bonuses);
}));

router.post('/team-bonus/:month/calculate', asyncHandler(async (req, res) => {
  const result = await calculateTeamBonus(req.params.month);
  res.json(result);
}));

router.get('/titles', asyncHandler(async (req, res) => {
  const titles = await prisma.professionalTitle.findMany({
    include: { user: { select: { id: true, name: true, rank: true, email: true } } },
    orderBy: { awardedAt: 'desc' },
  });
  res.json(titles);
}));

router.post('/titles/award', asyncHandler(async (req, res) => {
  const { userId, title } = req.body;
  if (!userId || !title) throw new AppError('userId and title required', 400, 'MISSING_FIELDS');

  const validTitles = ['EXPERT_LEADER', 'SENIOR_EXPERT', 'STRATEGIC_ADVISOR'];
  if (!validTitles.includes(title)) throw new AppError('Invalid title', 400, 'INVALID_TITLE');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { children: { where: { role: 'ctv', isActive: true } } },
  });
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const existing = await prisma.professionalTitle.findUnique({ where: { userId } });
  if (existing) {
    await prisma.professionalTitle.update({
      where: { userId },
      data: { title, directCount: user.children.length, renewedAt: now, expiresAt, isActive: true },
    });
  } else {
    await prisma.professionalTitle.create({
      data: { userId, title, directCount: user.children.length, renewedAt: now, expiresAt },
    });
  }

  res.json({ success: true });
}));

module.exports = router;
