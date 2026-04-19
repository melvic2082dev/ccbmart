const { getCommissionRates } = require('./commission');
const prisma = require('../lib/prisma');

/**
 * Calculate soft salary for all managers in a given month
 * Logic: tong luong cung vs 5% DT kenh CTV
 *  <100%: tra du (he so 1.0)
 *  100-120%: nguoi moi nhat 50% cung + 50% bien doi
 *  120-150%: nguoi moi nhat 30% cung + 70% bien doi
 *  >150%: tam dung bo nhiem
 * Luong bien doi = doanh so ca nhan x 2% x he so bien doi
 */
async function calculateSoftSalary(month) {
  const startDate = new Date(`${month}-01`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  // Get CTV channel revenue
  const revenueResult = await prisma.transaction.aggregate({
    where: {
      channel: 'ctv',
      status: 'CONFIRMED',
      createdAt: { gte: startDate, lt: endDate },
    },
    _sum: { totalAmount: true },
  });
  const ctvRevenue = Number(revenueResult._sum.totalAmount) || 0;
  const salaryFundCap = ctvRevenue * 0.05;

  // Get all managers with ranks PP+
  const managers = await prisma.user.findMany({
    where: {
      role: 'ctv',
      isActive: true,
      rank: { in: ['PP', 'TP', 'GDV', 'GDKD'] },
    },
    select: { id: true, name: true, rank: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const allRates = await getCommissionRates();

  // Total fixed salary
  let totalFixedSalary = 0;
  for (const m of managers) {
    totalFixedSalary += allRates[m.rank]?.fixedSalary || 0;
  }

  const usagePercent = salaryFundCap > 0 ? (totalFixedSalary / salaryFundCap) * 100 : 0;

  // Determine adjustment bracket
  let bracket = 'NORMAL';
  let variableRatio = 0;
  let fixedRatio = 1;
  if (usagePercent > 150) {
    bracket = 'FREEZE';
    variableRatio = 0.70;
    fixedRatio = 0.30;
  } else if (usagePercent > 120) {
    bracket = 'HIGH';
    variableRatio = 0.70;
    fixedRatio = 0.30;
  } else if (usagePercent >= 100) {
    bracket = 'WARNING';
    variableRatio = 0.50;
    fixedRatio = 0.50;
  }

  // Get personal sales for each manager
  const managerIds = managers.map(m => m.id);
  const personalSales = await prisma.transaction.groupBy({
    by: ['ctvId'],
    where: {
      ctvId: { in: managerIds },
      channel: 'ctv',
      status: 'CONFIRMED',
      createdAt: { gte: startDate, lt: endDate },
    },
    _sum: { totalAmount: true },
  });
  const salesMap = new Map(personalSales.map(s => [s.ctvId, Number(s._sum.totalAmount) || 0]));

  // Sort by newest first for adjustment targeting
  const managersSorted = [...managers].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const details = managersSorted.map((m, idx) => {
    const baseSalary = allRates[m.rank]?.fixedSalary || 0;
    const personalRevenue = salesMap.get(m.id) || 0;
    const isNewest = idx === 0 && bracket !== 'NORMAL';

    let actualFixed = baseSalary;
    let variableSalary = 0;
    let coefficient = 1.0;

    if (isNewest && bracket !== 'NORMAL') {
      actualFixed = baseSalary * fixedRatio;
      variableSalary = personalRevenue * 0.02 * variableRatio;
      coefficient = fixedRatio;
    }

    const totalSalary = isNewest ? actualFixed + variableSalary : baseSalary;

    return {
      id: m.id,
      name: m.name,
      rank: m.rank,
      baseSalary,
      personalRevenue,
      coefficient,
      actualFixed,
      variableSalary,
      totalSalary,
      isAdjusted: isNewest && bracket !== 'NORMAL',
      joinedAt: m.createdAt,
    };
  });

  return {
    month,
    ctvRevenue,
    salaryFundCap,
    totalFixedSalary,
    usagePercent: Math.round(usagePercent * 100) / 100,
    bracket,
    freezeHiring: bracket === 'FREEZE',
    details,
    totalActualSalary: details.reduce((sum, d) => sum + d.totalSalary, 0),
  };
}

module.exports = { calculateSoftSalary };
