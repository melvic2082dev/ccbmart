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

  const dashboard = await getCachedOrCompute(cacheKey, 60, async () => {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Current-month KPIs + 6-month chart data in two queries (instead of 7 findMany)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [allTxns, chartTxns] = await Promise.all([
      prisma.transaction.findMany({
        where: { createdAt: { gte: startOfMonth } },
        select: { channel: true, totalAmount: true, cogsAmount: true },
      }),
      prisma.transaction.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { channel: true, totalAmount: true, cogsAmount: true, createdAt: true },
      }),
    ]);

    // Current month aggregation
    const channelRevenue = { ctv: 0, agency: 0, showroom: 0 };
    let totalCogs = 0;
    for (const t of allTxns) {
      channelRevenue[t.channel] = (channelRevenue[t.channel] || 0) + Number(t.totalAmount);
      totalCogs += Number(t.cogsAmount);
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

    // Build month revenue map from single query (replaces 6 sequential findMany)
    const monthRevMap = new Map();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthRevMap.set(mStr, { ctv: 0, agency: 0, showroom: 0, total: 0, cogs: 0 });
    }
    for (const t of chartTxns) {
      const d = t.createdAt;
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const rev = monthRevMap.get(mStr);
      if (!rev) continue;
      rev[t.channel] = (rev[t.channel] || 0) + Number(t.totalAmount);
      rev.total += Number(t.totalAmount);
      rev.cogs += Number(t.cogsAmount);
    }

    const monthStrList = [...monthRevMap.keys()];

    // Salary fund calculations in parallel (replaces 6 sequential awaits)
    const [salaryFund, ...chartSalaryFunds] = await Promise.all([
      calculateSalaryFundStatus(monthStr),
      ...monthStrList.map(m => calculateSalaryFundStatus(m)),
    ]);
    const sfByMonth = new Map(monthStrList.map((m, i) => [m, chartSalaryFunds[i]]));

    const [totalCtvs, totalAgencies, totalCustomers] = await Promise.all([
      prisma.user.count({ where: { role: 'ctv', isActive: true } }),
      prisma.agency.count(),
      prisma.customer.count(),
    ]);

    const chartData = monthStrList.map(mStr => {
      const rev = monthRevMap.get(mStr);
      const sf = sfByMonth.get(mStr);
      return {
        month: mStr,
        ...rev,
        grossProfit: rev.total - rev.cogs,
        netProfit: rev.total - rev.cogs - (rev.ctv * 0.40) - (rev.agency * 0.20) - (rev.total * 0.14) - fixedCosts,
        salaryFundCap: sf.salaryFundCap,
        salaryFundUsed: sf.totalFixedSalary,
        salaryFundPct: sf.usagePercent,
      };
    });

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
  const logs = await getCachedOrCompute('admin:kpi-logs', 60, async () => {
    return prisma.kpiLog.findMany({
      include: { ctv: { select: { name: true, rank: true } } },
      orderBy: { month: 'desc' },
      take: 50,
    });
  });
  res.json(logs);
}));

router.get('/salary-fund', asyncHandler(async (req, res) => {
  const now = new Date();
  const monthStr = req.query.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  // calculateSalaryFundStatus has its own 300s cache
  const result = await calculateSalaryFundStatus(monthStr);
  res.json(result);
}));

router.get('/reports/financial', asyncHandler(async (req, res) => {
  const { months = 6 } = req.query;
  const monthCount = parseInt(months);
  const now = new Date();
  const cacheKey = `admin:reports:${monthCount}`;

  const reports = await getCachedOrCompute(cacheKey, 600, async () => {
    const fixedCosts = 30000000;

    // Build month list
    const monthList = [];
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthList.push({ d, dEnd, monthStr });
    }

    // Single query covering all months (replaces N sequential findMany)
    const allTxns = await prisma.transaction.findMany({
      where: { createdAt: { gte: monthList[0].d } },
      select: { channel: true, totalAmount: true, cogsAmount: true, createdAt: true },
    });

    // Group transactions by month
    const txnsByMonth = new Map(monthList.map(m => [m.monthStr, []]));
    for (const t of allTxns) {
      const d = t.createdAt;
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      txnsByMonth.get(mStr)?.push(t);
    }

    // Salary fund calculations in parallel (replaces N sequential awaits)
    const salaryFunds = await Promise.all(monthList.map(m => calculateSalaryFundStatus(m.monthStr)));

    return monthList.map(({ monthStr }, idx) => {
      const txns = txnsByMonth.get(monthStr) || [];
      const sf = salaryFunds[idx];
      const revenue = { ctv: 0, agency: 0, showroom: 0, total: 0 };
      let cogs = 0;
      for (const t of txns) {
        revenue[t.channel] = (revenue[t.channel] || 0) + Number(t.totalAmount);
        revenue.total += Number(t.totalAmount);
        cogs += Number(t.cogsAmount);
      }
      const grossProfit = revenue.total - cogs;
      const ctvCost = revenue.ctv * 0.40;
      const agencyCost = revenue.agency * 0.20;
      const opex = revenue.total * 0.14 + fixedCosts;
      const netProfit = grossProfit - ctvCost - agencyCost - sf.totalFixedSalary - opex;
      return {
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
      };
    });
  });

  res.json(reports);
}));

module.exports = router;
