const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { getCachedOrCompute } = require('../../services/cache');
const { calculateSalaryFundStatus } = require('../../services/commission');
const { sendSalaryWarning } = require('../../services/notification');
const { asyncHandler, AppError } = require('../../middleware/errorHandler');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/dashboard', asyncHandler(async (req, res) => {
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const cacheKey = `admin:dashboard:${monthStr}`;

  const dashboard = await getCachedOrCompute(cacheKey, 300, async () => {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const allTxns = await prisma.transaction.findMany({
      where: { createdAt: { gte: startOfMonth } },
      select: { channel: true, totalAmount: true, cogsAmount: true },
    });

    const channelRevenue = { ctv: 0, agency: 0, showroom: 0 };
    let totalCogs = 0;
    for (const t of allTxns) {
      channelRevenue[t.channel] = (channelRevenue[t.channel] || 0) + t.totalAmount;
      totalCogs += t.cogsAmount;
    }
    const totalRevenue = Object.values(channelRevenue).reduce((s, v) => s + v, 0);
    const grossProfit = totalRevenue - totalCogs;

    const xwiseFee = totalRevenue * 0.05;
    const e29Fee = totalRevenue * 0.01;
    const logistics = totalRevenue * 0.03;
    const marketing = totalRevenue * 0.03;
    const opcoOverhead = totalRevenue * 0.02;
    const fixedCosts = 26000000 + 2000000 + 2000000;
    const ctvCommissions = channelRevenue.ctv * 0.40;
    const agencyCommissions = channelRevenue.agency * 0.20;
    const totalCosts = totalCogs + ctvCommissions + agencyCommissions + xwiseFee + e29Fee + logistics + marketing + opcoOverhead + fixedCosts;
    const netProfit = totalRevenue - totalCosts;

    const salaryFund = await calculateSalaryFundStatus(monthStr);

    const [totalCtvs, totalAgencies, totalCustomers] = await Promise.all([
      prisma.user.count({ where: { role: 'ctv', isActive: true } }),
      prisma.agency.count(),
      prisma.customer.count(),
    ]);

    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const txns = await prisma.transaction.findMany({
        where: { createdAt: { gte: d, lt: dEnd } },
        select: { channel: true, totalAmount: true, cogsAmount: true },
      });

      const rev = { ctv: 0, agency: 0, showroom: 0, total: 0, cogs: 0 };
      for (const t of txns) {
        rev[t.channel] += t.totalAmount;
        rev.total += t.totalAmount;
        rev.cogs += t.cogsAmount;
      }

      const sf = await calculateSalaryFundStatus(mStr);

      chartData.push({
        month: mStr,
        ...rev,
        grossProfit: rev.total - rev.cogs,
        netProfit: rev.total - rev.cogs - (rev.ctv * 0.40) - (rev.agency * 0.20) - (rev.total * 0.14) - fixedCosts,
        salaryFundCap: sf.salaryFundCap,
        salaryFundUsed: sf.totalFixedSalary,
        salaryFundPct: sf.usagePercent,
      });
    }

    return {
      totalRevenue,
      channelRevenue,
      grossProfit,
      netProfit,
      totalCosts,
      costBreakdown: {
        cogs: totalCogs,
        ctvCommissions,
        agencyCommissions,
        xwiseFee,
        e29Fee,
        logistics,
        marketing,
        opcoOverhead,
        fixedCosts,
      },
      salaryFund,
      totalCtvs,
      totalAgencies,
      totalCustomers,
      chartData,
    };
  });

  if (dashboard.salaryFund && dashboard.salaryFund.warning !== 'OK') {
    await sendSalaryWarning(
      dashboard.salaryFund.usagePercent,
      dashboard.salaryFund.totalFixedSalary,
      dashboard.salaryFund.salaryFundCap
    );
  }

  res.json(dashboard);
}));

router.get('/kpi-logs', asyncHandler(async (req, res) => {
  const logs = await prisma.kpiLog.findMany({
    include: { ctv: { select: { name: true, rank: true } } },
    orderBy: { month: 'desc' },
    take: 50,
  });
  res.json(logs);
}));

router.get('/salary-fund', asyncHandler(async (req, res) => {
  const now = new Date();
  const monthStr = req.query.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const result = await calculateSalaryFundStatus(monthStr);
  res.json(result);
}));

router.get('/reports/financial', asyncHandler(async (req, res) => {
  const { months = 6 } = req.query;
  const monthCount = parseInt(months);
  const now = new Date();
  const cacheKey = `admin:reports:${monthCount}`;

  const reports = await getCachedOrCompute(cacheKey, 600, async () => {
    const result = [];
    const fixedCosts = 30000000;

    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const txns = await prisma.transaction.findMany({
        where: { createdAt: { gte: d, lt: dEnd } },
        select: { channel: true, totalAmount: true, cogsAmount: true },
      });

      const revenue = { ctv: 0, agency: 0, showroom: 0, total: 0 };
      let cogs = 0;
      for (const t of txns) {
        revenue[t.channel] += t.totalAmount;
        revenue.total += t.totalAmount;
        cogs += t.cogsAmount;
      }

      const grossProfit = revenue.total - cogs;
      const ctvCost = revenue.ctv * 0.40;
      const agencyCost = revenue.agency * 0.20;
      const sf = await calculateSalaryFundStatus(monthStr);
      const opex = revenue.total * 0.14 + fixedCosts;
      const netProfit = grossProfit - ctvCost - agencyCost - sf.totalFixedSalary - opex;

      result.push({
        month: monthStr,
        revenue,
        cogs,
        grossProfit,
        grossMargin: revenue.total > 0 ? ((grossProfit / revenue.total) * 100).toFixed(1) : 0,
        ctvCost,
        agencyCost,
        fixedSalaries: sf.totalFixedSalary,
        salaryFundPct: sf.usagePercent,
        opex,
        netProfit,
        netMargin: revenue.total > 0 ? ((netProfit / revenue.total) * 100).toFixed(1) : 0,
        transactionCount: txns.length,
      });
    }
    return result;
  });

  res.json(reports);
}));

module.exports = router;
