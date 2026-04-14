const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const { generateOTP, verifyOTP } = require('../services/otpService');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);

// ============ ADMIN ROUTES ============

// GET /api/admin/training-logs — list all training logs (admin only)
router.get('/admin', authorize('admin'), async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = status ? { status } : {};

    const [logs, total] = await Promise.all([
      prisma.trainingLog.findMany({
        where,
        include: {
          trainer: { select: { id: true, name: true, rank: true } },
          trainee: { select: { id: true, name: true, rank: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.trainingLog.count({ where }),
    ]);

    res.json({ logs, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/training-logs/verify/:id — verify a training log (admin only)
router.post('/admin/verify/:id', authorize('admin'), async (req, res) => {
  try {
    const logId = parseInt(req.params.id);
    const { action } = req.body; // 'verify' or 'reject'

    const log = await prisma.trainingLog.update({
      where: { id: logId },
      data: {
        status: action === 'reject' ? 'REJECTED' : 'VERIFIED',
        verifiedBy: req.user.id,
        verifiedAt: new Date(),
      },
    });

    res.json(log);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ============ CTV ROUTES ============

// GET /api/ctv/training-logs — my training logs
router.get('/my', authorize('ctv'), async (req, res) => {
  try {
    const userId = req.user.id;
    const logs = await prisma.trainingLog.findMany({
      where: {
        OR: [
          { trainerId: userId },
          { traineeId: userId },
        ],
      },
      include: {
        trainer: { select: { id: true, name: true, rank: true } },
        trainee: { select: { id: true, name: true, rank: true } },
      },
      orderBy: { sessionDate: 'desc' },
      take: 50,
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ctv/training-logs — create a training session
router.post('/', authorize('ctv'), async (req, res) => {
  try {
    const { traineeId, sessionDate, durationMinutes, content } = req.body;
    if (!traineeId || !sessionDate || !durationMinutes || !content) {
      return res.status(400).json({ error: 'traineeId, sessionDate, durationMinutes, content are required' });
    }

    const log = await prisma.trainingLog.create({
      data: {
        trainerId: req.user.id,
        traineeId,
        sessionDate: new Date(sessionDate),
        durationMinutes,
        content,
        mentorConfirmed: true,
        menteeConfirmed: false,
        status: 'PENDING',
      },
    });

    res.json(log);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/ctv/training-logs/:id/request-otp — trainer requests OTP for the session
// Returns the OTP code for demo visibility (in prod it'd be sent to trainee).
router.post('/:id/request-otp', authorize('ctv'), async (req, res) => {
  try {
    const logId = parseInt(req.params.id);
    const log = await prisma.trainingLog.findUnique({ where: { id: logId } });
    if (!log) return res.status(404).json({ error: 'Training log not found' });
    if (log.trainerId !== req.user.id && log.traineeId !== req.user.id) {
      return res.status(403).json({ error: 'Not allowed' });
    }
    const result = await generateOTP(logId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/ctv/training-logs/:id/confirm — trainee confirms the session via OTP
router.post('/:id/confirm', authorize('ctv'), async (req, res) => {
  try {
    const logId = parseInt(req.params.id);
    const { otp } = req.body;
    const log = await prisma.trainingLog.findUnique({ where: { id: logId } });

    if (!log) return res.status(404).json({ error: 'Training log not found' });
    if (log.traineeId !== req.user.id) {
      return res.status(403).json({ error: 'Only the trainee can confirm this session' });
    }

    // V12.2: If OTP was requested, require OTP verification
    if (log.otpCode) {
      if (!otp) return res.status(400).json({ error: 'OTP is required' });
      const updated = await verifyOTP(logId, otp);
      return res.json(updated);
    }

    // Fallback: legacy confirm without OTP (for seeded data or older flows)
    const updated = await prisma.trainingLog.update({
      where: { id: logId },
      data: { menteeConfirmed: true },
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
