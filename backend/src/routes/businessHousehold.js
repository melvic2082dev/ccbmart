const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

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
    res.json(households);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/business-household — create or update actions (suspend, terminate, activate)
router.post('/', async (req, res) => {
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
