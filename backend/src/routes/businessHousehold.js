const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(authorize('admin'));

// GET /api/admin/business-household — list all business households
router.get('/', async (req, res) => {
  try {
    const households = await prisma.businessHousehold.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, rank: true, isActive: true } },
      },
      orderBy: { registeredAt: 'desc' },
    });

    const now = new Date();
    const result = households.map(h => {
      const warnings = [];
      if (h.dealerExpiredAt) {
        const daysLeft = Math.ceil((new Date(h.dealerExpiredAt).getTime() - now.getTime()) / 86400000);
        if (daysLeft < 0) warnings.push({ type: 'DEALER_EXPIRED', severity: 'red', label: `HĐ Đại lý đã hết hạn ${-daysLeft} ngày` });
        else if (daysLeft <= 30) warnings.push({ type: 'DEALER_EXPIRING', severity: 'amber', label: `HĐ Đại lý hết hạn trong ${daysLeft} ngày` });
      }
      if (h.trainingExpiredAt) {
        const daysLeft = Math.ceil((new Date(h.trainingExpiredAt).getTime() - now.getTime()) / 86400000);
        if (daysLeft < 0) warnings.push({ type: 'TRAINING_EXPIRED', severity: 'red', label: `HĐ DV đào tạo đã hết hạn ${-daysLeft} ngày` });
        else if (daysLeft <= 30) warnings.push({ type: 'TRAINING_EXPIRING', severity: 'amber', label: `HĐ DV đào tạo hết hạn trong ${daysLeft} ngày` });
      }
      if (!h.bankAccountNo) warnings.push({ type: 'NO_BANK', severity: 'yellow', label: 'Chưa cập nhật TK ngân hàng' });
      if (!h.trainingLineRegistered) warnings.push({ type: 'NO_TRAINING_LINE', severity: 'orange', label: 'Chưa đăng ký ngành đào tạo' });

      return { ...h, warnings };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/business-household/:id/details — include payment history + B2B contracts
router.get('/:id/details', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const hkd = await prisma.businessHousehold.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, rank: true, isActive: true } },
      },
    });
    if (!hkd) return res.status(404).json({ error: 'Không tìm thấy HKD' });

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // Training fees paid to this HKD (via Invoice.toUserId)
    const [invoices, trainingContracts] = await Promise.all([
      prisma.invoice.findMany({
        where: { toUserId: hkd.userId, issuedAt: { gte: twelveMonthsAgo } },
        orderBy: { issuedAt: 'desc' },
        take: 24,
      }),
      prisma.b2BContract.findMany({
        where: { OR: [{ trainerId: hkd.userId }, { traineeId: hkd.userId }] },
        include: {
          trainer: { select: { id: true, name: true, rank: true } },
          trainee: { select: { id: true, name: true, rank: true } },
        },
        orderBy: { signedAt: 'desc' },
      }),
    ]);

    // Monthly breakdown: fixed fees (feeTier M*) vs pool (tier starting with P)
    const monthlyMap = new Map();
    for (const inv of invoices) {
      const m = inv.issuedAt.toISOString().slice(0, 7);
      if (!monthlyMap.has(m)) monthlyMap.set(m, { month: m, fixedFee: 0, poolFee: 0, total: 0, status: 'PENDING' });
      const row = monthlyMap.get(m);
      const isPool = /^P/i.test(inv.feeTier || '');
      if (isPool) row.poolFee += inv.amount || 0;
      else row.fixedFee += inv.amount || 0;
      row.total += inv.amount || 0;
      if (inv.status === 'PAID') row.status = 'PAID';
    }
    const trainingPayments = Array.from(monthlyMap.values()).sort((a, b) => b.month.localeCompare(a.month));
    const totalReceived12m = trainingPayments.reduce((s, r) => s + r.total, 0);

    res.json({
      hkd,
      warnings: [], // UI computes from list endpoint
      trainingPayments,
      totalReceived12m,
      b2bContracts: trainingContracts,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/business-household/:id/renew — renew contract
router.post('/:id/renew', validate(schemas.businessHouseholdRenew), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { kind, termMonths } = req.body; // kind = 'dealer' | 'training'
    if (!['dealer', 'training'].includes(kind)) {
      return res.status(400).json({ error: 'kind phải là dealer hoặc training' });
    }
    const months = Math.max(1, Math.min(60, parseInt(termMonths) || 12));
    const newExpired = new Date();
    newExpired.setMonth(newExpired.getMonth() + months);

    const data = kind === 'dealer'
      ? { dealerSignedAt: new Date(), dealerExpiredAt: newExpired, dealerTermMonths: months }
      : { trainingSignedAt: new Date(), trainingExpiredAt: newExpired, trainingTermMonths: months };

    const updated = await prisma.businessHousehold.update({ where: { id }, data });
    res.json({ success: true, hkd: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/business-household/:id/update-bank — update bank info
router.post('/:id/update-bank', validate(schemas.businessHouseholdUpdateBank), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { bankName, bankAccountNo, bankAccountHolder } = req.body;
    if (!bankName || !bankAccountNo || !bankAccountHolder) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin ngân hàng' });
    }
    const updated = await prisma.businessHousehold.update({
      where: { id },
      data: { bankName, bankAccountNo, bankAccountHolder },
    });
    res.json({ success: true, hkd: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/business-household — create or update actions (suspend, terminate, activate)
router.post('/', validate(schemas.businessHouseholdAction), async (req, res) => {
  try {
    const { userId, action, businessName, taxCode, businessLicense } = req.body;

    if (action === 'create') {
      if (!userId || !businessName) {
        return res.status(400).json({ error: 'userId and businessName are required' });
      }
      const household = await prisma.businessHousehold.upsert({
        where: { userId },
        create: { userId, businessName, taxCode, businessLicense, status: 'active' },
        update: { businessName, taxCode, businessLicense, status: 'active' },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { isBusinessHousehold: true },
      });
      return res.json(household);
    }

    if (action === 'suspend') {
      const household = await prisma.businessHousehold.update({
        where: { userId },
        data: { status: 'suspended' },
      });
      return res.json(household);
    }

    if (action === 'terminate') {
      const household = await prisma.businessHousehold.update({
        where: { userId },
        data: { status: 'terminated' },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { isBusinessHousehold: false },
      });
      return res.json(household);
    }

    if (action === 'activate') {
      const household = await prisma.businessHousehold.update({
        where: { userId },
        data: { status: 'active' },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { isBusinessHousehold: true },
      });
      return res.json(household);
    }

    res.status(400).json({ error: 'Invalid action. Use: create, suspend, terminate, activate' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
