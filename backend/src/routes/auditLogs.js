const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(authorize('admin'));

// GET /admin/audit-logs — list with filter + pagination
router.get('/audit-logs', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const where = {};
    if (req.query.userId) {
      const uid = parseInt(req.query.userId, 10);
      if (Number.isFinite(uid)) where.userId = uid;
    }
    if (req.query.action) where.action = String(req.query.action);
    if (req.query.targetType) where.targetType = String(req.query.targetType);
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.dateFrom || req.query.dateTo) {
      where.createdAt = {};
      if (req.query.dateFrom) where.createdAt.gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) {
        const to = new Date(req.query.dateTo);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }
    if (req.query.search) {
      const q = String(req.query.search);
      where.OR = [
        { action: { contains: q } },
        { targetType: { contains: q } },
        { ipAddress: { contains: q } },
        { metadata: { contains: q } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true, role: true, rank: true } },
        },
      }),
    ]);

    res.json({
      logs,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      limit,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/audit-logs/actions — list of distinct actions (for filter dropdown)
router.get('/audit-logs/actions', async (_req, res) => {
  try {
    const rows = await prisma.auditLog.groupBy({
      by: ['action'],
      _count: { action: true },
      orderBy: { _count: { action: 'desc' } },
    });
    res.json({ actions: rows.map(r => ({ action: r.action, count: r._count.action })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
