const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');
const { validate, schemas } = require('../middleware/validate');

const router = express.Router();
const prisma = require('../lib/prisma');

router.use(authenticate);
router.use(authorize('admin'));

// GET /api/admin/fee-config — list all fee tiers
router.get('/', async (req, res) => {
  try {
    const configs = await prisma.feeConfig.findMany({
      orderBy: { minCombo: 'asc' },
    });
    res.json(configs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/fee-config/:tier — update a fee tier
router.put('/:tier', auditLog('CONFIG_CHANGE', 'FeeConfig'), validate(schemas.feeConfigUpdate), async (req, res) => {
  try {
    const { minCombo, maxCombo, feeAmount, description, isActive } = req.body;
    const config = await prisma.feeConfig.update({
      where: { tier: req.params.tier },
      data: {
        ...(minCombo !== undefined && { minCombo }),
        ...(maxCombo !== undefined && { maxCombo }),
        ...(feeAmount !== undefined && { feeAmount }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    res.json(config);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
