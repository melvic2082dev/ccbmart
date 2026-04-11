const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Commission rates by rank
const COMMISSION_RATES = {
  CTV:  { selfSale: 0.20, f1: 0,    f2: 0,    f3: 0,    fixedSalary: 0 },
  PP:   { selfSale: 0.20, f1: 0,    f2: 0,    f3: 0,    fixedSalary: 5000000 },
  TP:   { selfSale: 0.30, f1: 0.10, f2: 0,    f3: 0,    fixedSalary: 10000000 },
  GDV:  { selfSale: 0.35, f1: 0.10, f2: 0.05, f3: 0,    fixedSalary: 18000000 },
  GDKD: { selfSale: 0.38, f1: 0.10, f2: 0.05, f3: 0.03, fixedSalary: 30000000 },
};

// Agency commission by product group
const AGENCY_COMMISSION = {
  A: { commission: 0.08, bonus: 0.02 }, // Thiết yếu (nông sản) - thấp nhất
  B: { commission: 0.15, bonus: 0.03 }, // Core (FMCG, gia vị)
  C: { commission: 0.20, bonus: 0.05 }, // Lợi nhuận cao (TPCN, combo)
};

async function calculateCtvCommission(ctvId, month) {
  const user = await prisma.user.findUnique({ where: { id: ctvId } });
  if (!user || user.role !== 'ctv') return null;

  const rank = user.rank || 'CTV';
  const rates = COMMISSION_RATES[rank];
  if (!rates) return null;

  const startDate = new Date(`${month}-01`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  // Self sales
  const selfTransactions = await prisma.transaction.findMany({
    where: {
      ctvId: ctvId,
      channel: 'ctv',
      createdAt: { gte: startDate, lt: endDate },
    },
  });
  const selfSalesAmount = selfTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
  const selfCommission = selfSalesAmount * rates.selfSale;

  // F1 sales (direct reports)
  let f1Commission = 0;
  let f2Commission = 0;
  let f3Commission = 0;

  if (rates.f1 > 0) {
    const f1Users = await prisma.user.findMany({
      where: { parentId: ctvId, role: 'ctv', isActive: true },
    });
    for (const f1 of f1Users) {
      const f1Txns = await prisma.transaction.findMany({
        where: {
          ctvId: f1.id,
          channel: 'ctv',
          createdAt: { gte: startDate, lt: endDate },
        },
      });
      const f1Amount = f1Txns.reduce((sum, t) => sum + t.totalAmount, 0);
      f1Commission += f1Amount * rates.f1;

      // F2 sales (reports of F1)
      if (rates.f2 > 0) {
        const f2Users = await prisma.user.findMany({
          where: { parentId: f1.id, role: 'ctv', isActive: true },
        });
        for (const f2 of f2Users) {
          const f2Txns = await prisma.transaction.findMany({
            where: {
              ctvId: f2.id,
              channel: 'ctv',
              createdAt: { gte: startDate, lt: endDate },
            },
          });
          const f2Amount = f2Txns.reduce((sum, t) => sum + t.totalAmount, 0);
          f2Commission += f2Amount * rates.f2;

          // F3 sales (reports of F2)
          if (rates.f3 > 0) {
            const f3Users = await prisma.user.findMany({
              where: { parentId: f2.id, role: 'ctv', isActive: true },
            });
            for (const f3 of f3Users) {
              const f3Txns = await prisma.transaction.findMany({
                where: {
                  ctvId: f3.id,
                  channel: 'ctv',
                  createdAt: { gte: startDate, lt: endDate },
                },
              });
              const f3Amount = f3Txns.reduce((sum, t) => sum + t.totalAmount, 0);
              f3Commission += f3Amount * rates.f3;
            }
          }
        }
      }
    }
  }

  return {
    ctvId,
    rank,
    month,
    selfSalesAmount,
    selfCommission,
    f1Commission,
    f2Commission,
    f3Commission,
    fixedSalary: rates.fixedSalary,
    totalIncome: selfCommission + f1Commission + f2Commission + f3Commission + rates.fixedSalary,
  };
}

async function calculateSalaryFundStatus(month) {
  const startDate = new Date(`${month}-01`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  // Total CTV channel revenue
  const ctvTransactions = await prisma.transaction.findMany({
    where: {
      channel: 'ctv',
      createdAt: { gte: startDate, lt: endDate },
    },
  });
  const ctvRevenue = ctvTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
  const salaryFundCap = ctvRevenue * 0.05; // 5% of CTV channel revenue

  // Total fixed salaries
  const managers = await prisma.user.findMany({
    where: {
      role: 'ctv',
      isActive: true,
      rank: { in: ['PP', 'TP', 'GDV', 'GDKD'] },
    },
  });
  let totalFixedSalary = 0;
  for (const m of managers) {
    totalFixedSalary += COMMISSION_RATES[m.rank]?.fixedSalary || 0;
  }

  const usagePercent = salaryFundCap > 0 ? (totalFixedSalary / salaryFundCap) * 100 : 0;

  return {
    month,
    ctvRevenue,
    salaryFundCap,
    totalFixedSalary,
    usagePercent: Math.round(usagePercent * 100) / 100,
    warning: usagePercent >= 100 ? 'CRITICAL' : usagePercent >= 80 ? 'WARNING' : 'OK',
    managers: managers.map(m => ({
      id: m.id,
      name: m.name,
      rank: m.rank,
      salary: COMMISSION_RATES[m.rank]?.fixedSalary || 0,
    })),
  };
}

module.exports = {
  calculateCtvCommission,
  calculateSalaryFundStatus,
  COMMISSION_RATES,
  AGENCY_COMMISSION,
};
