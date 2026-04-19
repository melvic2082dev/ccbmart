const express = require('express');
const { asyncHandler } = require('../../middleware/errorHandler');

const router = express.Router();
const prisma = require('../../lib/prisma');

router.get('/management-fees', asyncHandler(async (req, res) => {
  const { month, level, status } = req.query;
  const where = {};
  if (month) where.month = month;
  if (level) where.level = parseInt(level, 10);
  if (status) where.status = status;
  const fees = await prisma.managementFee.findMany({
    where,
    include: {
      fromUser: { select: { id: true, name: true, rank: true } },
      toUser:   { select: { id: true, name: true, rank: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(fees);
}));

router.post('/management-fees/:id/mark-paid', asyncHandler(async (req, res) => {
  const fee = await prisma.managementFee.update({
    where: { id: parseInt(req.params.id, 10) },
    data: { status: 'PAID' },
  });
  res.json(fee);
}));

router.get('/breakaway-logs', asyncHandler(async (req, res) => {
  const where = req.query.status ? { status: req.query.status } : {};
  const logs = await prisma.breakawayLog.findMany({
    where,
    include: {
      user:      { select: { id: true, name: true, rank: true } },
      oldParent: { select: { id: true, name: true, rank: true } },
      newParent: { select: { id: true, name: true, rank: true } },
    },
    orderBy: { breakawayAt: 'desc' },
  });
  res.json(logs);
}));

router.get('/breakaway-fees', asyncHandler(async (req, res) => {
  const { month, level, status } = req.query;
  const where = {};
  if (month) where.month = month;
  if (level) where.level = parseInt(level, 10);
  if (status) where.status = status;
  const fees = await prisma.breakawayFee.findMany({
    where,
    include: {
      fromUser: { select: { id: true, name: true, rank: true } },
      toUser:   { select: { id: true, name: true, rank: true } },
      breakawayLog: { select: { id: true, breakawayAt: true, expireAt: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(fees);
}));

router.post('/breakaway-fees/:id/mark-paid', asyncHandler(async (req, res) => {
  const fee = await prisma.breakawayFee.update({
    where: { id: parseInt(req.params.id, 10) },
    data: { status: 'PAID' },
  });
  res.json(fee);
}));

module.exports = router;
