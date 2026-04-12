const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const { COMMISSION_RATES, AGENCY_COMMISSION, invalidateCommissionCache } = require('../services/commission');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(authorize('admin'));

// ========== CTV COMMISSION ==========

router.get('/commission', async (req, res) => {
  try {
    const [ctvConfig, agencyConfig] = await Promise.all([
      prisma.commissionConfig.findMany({ orderBy: { id: 'asc' } }),
      prisma.agencyCommissionConfig.findMany({ orderBy: { id: 'asc' } }),
    ]);
    res.json({ ctvConfig, agencyConfig, rates: COMMISSION_RATES, agencyRates: AGENCY_COMMISSION });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/commission/:tier', async (req, res) => {
  try {
    const { selfSalePct, f1Pct, f2Pct, f3Pct, fixedSalary } = req.body;
    const config = await prisma.commissionConfig.update({
      where: { tier: req.params.tier },
      data: { selfSalePct, f1Pct, f2Pct, f3Pct, fixedSalary },
    });
    invalidateCommissionCache();
    res.json(config);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.post('/commission', async (req, res) => {
  try {
    const { tier, selfSalePct, f1Pct, f2Pct, f3Pct, fixedSalary } = req.body;
    if (!tier) return res.status(400).json({ error: 'Tier is required' });
    const config = await prisma.commissionConfig.create({
      data: { tier, selfSalePct: selfSalePct || 0, f1Pct: f1Pct || 0, f2Pct: f2Pct || 0, f3Pct: f3Pct || 0, fixedSalary: fixedSalary || 0 },
    });
    invalidateCommissionCache();
    res.json(config);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/commission/:tier', async (req, res) => {
  try {
    if (['CTV', 'GDKD'].includes(req.params.tier)) {
      return res.status(400).json({ error: 'Khong the xoa cap bac CTV hoac GDKD' });
    }
    await prisma.commissionConfig.delete({ where: { tier: req.params.tier } });
    invalidateCommissionCache();
    res.json({ success: true });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ========== KPI CONFIG ==========

router.get('/kpi', async (req, res) => {
  try {
    const configs = await prisma.kpiConfig.findMany({ orderBy: { id: 'asc' } });
    res.json(configs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/kpi/:rank', async (req, res) => {
  try {
    const { minSelfCombo, minPortfolio, fallbackRank } = req.body;
    const config = await prisma.kpiConfig.upsert({
      where: { rank: req.params.rank },
      update: { minSelfCombo, minPortfolio, fallbackRank },
      create: { rank: req.params.rank, minSelfCombo: minSelfCombo || 0, minPortfolio: minPortfolio || 0, fallbackRank: fallbackRank || 'CTV' },
    });
    res.json(config);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ========== AGENCY COMMISSION ==========

router.get('/agency', async (req, res) => {
  try {
    const configs = await prisma.agencyCommissionConfig.findMany({ orderBy: { id: 'asc' } });
    res.json(configs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/agency/:group', async (req, res) => {
  try {
    const { commissionPct, bonusPct } = req.body;
    if ((commissionPct || 0) + (bonusPct || 0) > 0.30) {
      return res.status(400).json({ error: 'Tong hoa hong + thuong khong vuot qua 30%' });
    }
    const config = await prisma.agencyCommissionConfig.update({
      where: { group: req.params.group },
      data: { commissionPct, bonusPct },
    });
    res.json(config);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ========== COGS CONFIG ==========

router.get('/cogs', async (req, res) => {
  try {
    const configs = await prisma.cogsConfig.findMany({ orderBy: { id: 'asc' } });
    res.json(configs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/cogs/:phase', async (req, res) => {
  try {
    const { name, cogsPct, description } = req.body;
    const config = await prisma.cogsConfig.upsert({
      where: { phase: req.params.phase },
      update: { name, cogsPct, description },
      create: { phase: req.params.phase, name: name || req.params.phase, cogsPct: cogsPct || 0, description },
    });
    res.json(config);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ========== RESET DEFAULT ==========

router.post('/reset-default', async (req, res) => {
  try {
    // Reset CTV Commission
    await prisma.commissionConfig.deleteMany();
    await prisma.commissionConfig.createMany({
      data: [
        { tier: 'CTV',  selfSalePct: 0.20, f1Pct: 0,    f2Pct: 0,    f3Pct: 0,    fixedSalary: 0 },
        { tier: 'PP',   selfSalePct: 0.20, f1Pct: 0,    f2Pct: 0,    f3Pct: 0,    fixedSalary: 5000000 },
        { tier: 'TP',   selfSalePct: 0.30, f1Pct: 0.10, f2Pct: 0,    f3Pct: 0,    fixedSalary: 10000000 },
        { tier: 'GDV',  selfSalePct: 0.35, f1Pct: 0.10, f2Pct: 0.05, f3Pct: 0,    fixedSalary: 18000000 },
        { tier: 'GDKD', selfSalePct: 0.38, f1Pct: 0.10, f2Pct: 0.05, f3Pct: 0.03, fixedSalary: 30000000 },
      ],
    });

    // Reset Agency Commission
    await prisma.agencyCommissionConfig.deleteMany();
    await prisma.agencyCommissionConfig.createMany({
      data: [
        { group: 'A', commissionPct: 0.08, bonusPct: 0.02 },
        { group: 'B', commissionPct: 0.15, bonusPct: 0.03 },
        { group: 'C', commissionPct: 0.20, bonusPct: 0.05 },
      ],
    });

    // Reset KPI Config
    await prisma.kpiConfig.deleteMany();
    await prisma.kpiConfig.createMany({
      data: [
        { rank: 'CTV',  minSelfCombo: 0,  minPortfolio: 0,    fallbackRank: 'LOCK' },
        { rank: 'PP',   minSelfCombo: 50, minPortfolio: 0,    fallbackRank: 'CTV' },
        { rank: 'TP',   minSelfCombo: 50, minPortfolio: 150,  fallbackRank: 'PP' },
        { rank: 'GDV',  minSelfCombo: 50, minPortfolio: 550,  fallbackRank: 'TP' },
        { rank: 'GDKD', minSelfCombo: 50, minPortfolio: 1000, fallbackRank: 'GDV' },
      ],
    });

    // Reset COGS Config
    await prisma.cogsConfig.deleteMany();
    await prisma.cogsConfig.createMany({
      data: [
        { phase: 'GD1', name: 'GD1 (0-6 thang)',  cogsPct: 0.50, description: 'Blended NS 65% + TPCN 35%' },
        { phase: 'GD2', name: 'GD2 (6-18 thang)',  cogsPct: 0.63, description: 'Mo rong FMCG, gia vi' },
        { phase: 'GD3', name: 'GD3 (18-36 thang)', cogsPct: 0.58, description: 'Danh muc toi uu' },
        { phase: 'GD4', name: 'GD4 (3-5 nam)',     cogsPct: 0.55, description: 'Mature stores' },
      ],
    });

    invalidateCommissionCache();
    res.json({ success: true, message: 'Da reset ve mac dinh' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
