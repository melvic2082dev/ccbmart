const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { registerMember, getWalletDetails, getReferralStats } = require('../services/membership');
const { validate, schemas } = require('../middleware/validate');

const router = express.Router();
const prisma = require('../lib/prisma');

// POST /register - Public registration
router.post('/register', validate(schemas.memberRegister), async (req, res) => {
  try {
    const result = await registerMember(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// All routes below require member auth
router.use(authenticate);
router.use(authorize('member'));

// GET /wallet - Get wallet details
router.get('/wallet', async (req, res) => {
  try {
    const wallet = await getWalletDetails(req.user.id);
    res.json(wallet);
  } catch (err) {
    console.error("[route]", err); res.status(500).json({ error: "Internal server error" });
  }
});

// POST /deposit - Request a top-up
router.post('/deposit', validate(schemas.memberDeposit), async (req, res) => {
  try {
    const wallet = await prisma.memberWallet.findUnique({ where: { userId: req.user.id } });
    if (!wallet) return res.status(404).json({ error: 'Khong tim thay vi' });

    const deposit = await prisma.depositHistory.create({
      data: {
        walletId: wallet.id,
        amount: req.body.amount,
        method: req.body.method || 'bank_transfer',
        status: 'PENDING',
      },
    });

    res.json({
      depositId: deposit.id,
      amount: deposit.amount,
      method: deposit.method,
      status: 'PENDING',
      bankAccount: {
        bankName: 'Vietcombank',
        accountNo: '1903698888',
        accountName: 'CONG TY TNHH CCB MART',
        transferContent: `CCB NAP ${deposit.id}`,
      },
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /transactions - Deposit history + referral commissions
router.get('/transactions', validate(schemas.pagination, 'query'), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const wallet = await prisma.memberWallet.findUnique({ where: { userId: req.user.id } });
    if (!wallet) return res.status(404).json({ error: 'Khong tim thay vi' });

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [deposits, commissions, totalDeposits] = await Promise.all([
      prisma.depositHistory.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.referralCommission.findMany({
        where: { earnerWalletId: wallet.id },
        include: { sourceWallet: { select: { user: { select: { name: true } } } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.depositHistory.count({ where: { walletId: wallet.id } }),
    ]);

    res.json({
      deposits,
      commissions,
      totalDeposits,
      page: parseInt(page),
      totalPages: Math.ceil(totalDeposits / parseInt(limit)),
    });
  } catch (err) {
    console.error("[route]", err); res.status(500).json({ error: "Internal server error" });
  }
});

// GET /referral-stats - Referral dashboard
router.get('/referral-stats', async (req, res) => {
  try {
    const stats = await getReferralStats(req.user.id);
    res.json(stats);
  } catch (err) {
    console.error("[route]", err); res.status(500).json({ error: "Internal server error" });
  }
});

// POST /redeem-code - Link referral code post-registration
router.post('/redeem-code', validate(schemas.memberRedeemCode), async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Can nhap ma gioi thieu' });

    const wallet = await prisma.memberWallet.findUnique({ where: { userId: req.user.id } });
    if (!wallet) return res.status(404).json({ error: 'Khong tim thay vi' });
    if (wallet.referredById) return res.status(400).json({ error: 'Ban da co nguoi gioi thieu' });

    const referrer = await prisma.memberWallet.findUnique({ where: { referralCode: code } });
    if (!referrer) return res.status(400).json({ error: 'Ma gioi thieu khong hop le' });
    if (referrer.id === wallet.id) return res.status(400).json({ error: 'Khong the tu gioi thieu ban than' });

    await prisma.memberWallet.update({
      where: { id: wallet.id },
      data: { referredById: referrer.id },
    });

    res.json({ success: true, referrerName: (await prisma.user.findUnique({ where: { id: referrer.userId } }))?.name });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
