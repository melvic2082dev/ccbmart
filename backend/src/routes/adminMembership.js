const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { confirmDeposit, rejectDeposit } = require('../services/membership');
const { auditLog } = require('../middleware/auditLog');

const router = express.Router();
const prisma = require('../lib/prisma');

router.use(authenticate);
router.use(authorize('admin'));

// GET /tiers - List all membership tiers
router.get('/tiers', async (req, res) => {
  try {
    const tiers = await prisma.membershipTier.findMany({
      orderBy: { minDeposit: 'asc' },
      include: { _count: { select: { wallets: true } } },
    });
    res.json(tiers);
  } catch (err) {
    console.error("[route]", err); res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /tiers/:id - Update a tier
router.put('/tiers/:id', auditLog('CONFIG_CHANGE', 'MembershipTier'), async (req, res) => {
  try {
    const { name, minDeposit, discountPct, referralPct, monthlyReferralCap, color } = req.body;
    const tier = await prisma.membershipTier.update({
      where: { id: parseInt(req.params.id) },
      data: { name, minDeposit, discountPct, referralPct, monthlyReferralCap, color },
    });
    res.json(tier);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /deposits - List deposits (filter by status)
router.get('/deposits', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (status) where.status = status;

    const [deposits, total] = await Promise.all([
      prisma.depositHistory.findMany({
        where,
        include: {
          wallet: {
            include: {
              user: { select: { name: true, email: true, phone: true } },
              tier: { select: { name: true, color: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.depositHistory.count({ where }),
    ]);

    res.json({ deposits, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error("[route]", err); res.status(500).json({ error: "Internal server error" });
  }
});

// POST /deposits/:id/confirm - Confirm a deposit
router.post('/deposits/:id/confirm', auditLog('DEPOSIT_CONFIRM', 'DepositHistory'), async (req, res) => {
  try {
    const result = await confirmDeposit(parseInt(req.params.id), req.user.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /deposits/:id/reject - Reject a deposit
router.post('/deposits/:id/reject', auditLog('DEPOSIT_REJECT', 'DepositHistory'), async (req, res) => {
  try {
    if (!req.body.reason) return res.status(400).json({ error: 'Can ly do tu choi' });
    await rejectDeposit(parseInt(req.params.id), req.user.id, req.body.reason);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /referral-report - Referral commissions report
router.get('/referral-report', async (req, res) => {
  try {
    const { month, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (month) where.month = month;

    const [commissions, total, summary] = await Promise.all([
      prisma.referralCommission.findMany({
        where,
        include: {
          earnerWallet: { include: { user: { select: { name: true } }, tier: { select: { name: true } } } },
          sourceWallet: { include: { user: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.referralCommission.count({ where }),
      prisma.referralCommission.aggregate({
        where,
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    res.json({
      commissions,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalAmount: summary._sum.amount || 0,
      totalCount: summary._count.id,
    });
  } catch (err) {
    console.error("[route]", err); res.status(500).json({ error: "Internal server error" });
  }
});

// GET /wallets - List all member wallets
router.get('/wallets', async (req, res) => {
  try {
    const { page = 1, limit = 20, tierId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (tierId) where.tierId = parseInt(tierId);

    const [wallets, total] = await Promise.all([
      prisma.memberWallet.findMany({
        where,
        include: {
          user: { select: { name: true, email: true, phone: true, isActive: true } },
          tier: { select: { name: true, color: true } },
          _count: { select: { referrals: true, deposits: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.memberWallet.count({ where }),
    ]);

    res.json({ wallets, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error("[route]", err); res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
