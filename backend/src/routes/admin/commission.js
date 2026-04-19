const express = require('express');
const {
  COMMISSION_RATES,
  AGENCY_COMMISSION,
  getCommissionRates,
  getAgencyCommissionRates,
  invalidateCommissionCache,
} = require('../../services/commission');
const { validate, schemas } = require('../../middleware/validate');
const { asyncHandler } = require('../../middleware/errorHandler');
const appEvents = require('../../services/eventEmitter');

const router = express.Router();
const prisma = require('../../lib/prisma');

router.get('/config/commission', asyncHandler(async (req, res) => {
  const [ctvConfig, agencyConfig, rates, agencyRates] = await Promise.all([
    prisma.commissionConfig.findMany({ orderBy: { id: 'asc' } }),
    prisma.agencyCommissionConfig.findMany({ orderBy: { id: 'asc' } }),
    getCommissionRates(),
    getAgencyCommissionRates(),
  ]);
  res.json({ ctvConfig, agencyConfig, rates, agencyRates });
}));

router.put('/config/commission/:tier', validate(schemas.updateCommission), asyncHandler(async (req, res) => {
  const { selfSalePct, directPct, indirect2Pct, indirect3Pct, fixedSalary } = req.body;
  const config = await prisma.commissionConfig.update({
    where: { tier: req.params.tier },
    data: { selfSalePct, directPct, indirect2Pct, indirect3Pct, fixedSalary },
  });
  invalidateCommissionCache();
  appEvents.emit('config:changed', { type: 'commission', tier: req.params.tier });
  res.json(config);
}));

module.exports = router;
