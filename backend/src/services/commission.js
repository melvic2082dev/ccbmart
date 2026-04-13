const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Commission rates by professional title (chức danh)
const COMMISSION_RATES = {
  CTV:  { selfSale: 0.20, f1: 0,    f2: 0,    f3: 0,    fixedSalary: 0,        isSoftSalary: false },
  PP:   { selfSale: 0.20, f1: 0,    f2: 0,    f3: 0,    fixedSalary: 5000000,  isSoftSalary: true },
  TP:   { selfSale: 0.30, f1: 0.10, f2: 0,    f3: 0,    fixedSalary: 10000000, isSoftSalary: true },
  GDV:  { selfSale: 0.35, f1: 0.10, f2: 0.05, f3: 0,    fixedSalary: 18000000, isSoftSalary: true },
  GDKD: { selfSale: 0.38, f1: 0.10, f2: 0.05, f3: 0.03, fixedSalary: 30000000, isSoftSalary: true },
};

// Team bonus thresholds (based on total team revenue)
const TEAM_BONUS_TIERS = {
  bronze: { threshold: 300000000, bonusPct: 0.01 }, // 300M+: 1% of team revenue
  silver: { threshold: 600000000, bonusPct: 0.01 }, // 600M+: 1% of team revenue
  gold:   { threshold: 1000000000, bonusPct: 0.01 }, // 1B+: 1% of team revenue
};

// Agency commission by product group
const AGENCY_COMMISSION = {
  A: { commission: 0.08, bonus: 0.02 }, // Thiết yếu (nông sản)
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

  // Downline sales (direct → level2 → level3)
  let f1Commission = 0;
  let f2Commission = 0;
  let f3Commission = 0;
  let teamRevenue = selfSalesAmount;

  if (rates.f1 > 0) {
    const directReports = await prisma.user.findMany({
      where: { parentId: ctvId, role: 'ctv', isActive: true },
    });
    for (const f1 of directReports) {
      const f1Txns = await prisma.transaction.findMany({
        where: { ctvId: f1.id, channel: 'ctv', createdAt: { gte: startDate, lt: endDate } },
      });
      const f1Amount = f1Txns.reduce((sum, t) => sum + t.totalAmount, 0);
      f1Commission += f1Amount * rates.f1;
      teamRevenue += f1Amount;

      if (rates.f2 > 0) {
        const level2 = await prisma.user.findMany({
          where: { parentId: f1.id, role: 'ctv', isActive: true },
        });
        for (const f2 of level2) {
          const f2Txns = await prisma.transaction.findMany({
            where: { ctvId: f2.id, channel: 'ctv', createdAt: { gte: startDate, lt: endDate } },
          });
          const f2Amount = f2Txns.reduce((sum, t) => sum + t.totalAmount, 0);
          f2Commission += f2Amount * rates.f2;
          teamRevenue += f2Amount;

          if (rates.f3 > 0) {
            const level3 = await prisma.user.findMany({
              where: { parentId: f2.id, role: 'ctv', isActive: true },
            });
            for (const f3 of level3) {
              const f3Txns = await prisma.transaction.findMany({
                where: { ctvId: f3.id, channel: 'ctv', createdAt: { gte: startDate, lt: endDate } },
              });
              const f3Amount = f3Txns.reduce((sum, t) => sum + t.totalAmount, 0);
              f3Commission += f3Amount * rates.f3;
              teamRevenue += f3Amount;
            }
          }
        }
      }
    }
  }

  // Soft salary: only paid if salary fund has capacity
  let effectiveSalary = rates.fixedSalary;
  if (rates.isSoftSalary && rates.fixedSalary > 0) {
    const fundStatus = await calculateSalaryFundStatus(month);
    if (fundStatus.warning === 'CRITICAL') {
      // Fund exceeded: reduce salary proportionally
      const ratio = fundStatus.salaryFundCap / fundStatus.totalFixedSalary;
      effectiveSalary = Math.floor(rates.fixedSalary * Math.min(ratio, 1));
    }
  }

  // Team bonus
  let teamBonusAmount = 0;
  if (teamRevenue >= TEAM_BONUS_TIERS.bronze.threshold) {
    const tier = teamRevenue >= TEAM_BONUS_TIERS.gold.threshold ? 'gold'
      : teamRevenue >= TEAM_BONUS_TIERS.silver.threshold ? 'silver' : 'bronze';
    teamBonusAmount = Math.floor(teamRevenue * TEAM_BONUS_TIERS[tier].bonusPct);
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
    fixedSalary: effectiveSalary,
    teamBonus: teamBonusAmount,
    totalIncome: selfCommission + f1Commission + f2Commission + f3Commission + effectiveSalary + teamBonusAmount,
  };
}

async function calculateSalaryFundStatus(month) {
  const startDate = new Date(`${month}-01`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  const ctvTransactions = await prisma.transaction.findMany({
    where: { channel: 'ctv', createdAt: { gte: startDate, lt: endDate } },
  });
  const ctvRevenue = ctvTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
  const salaryFundCap = ctvRevenue * 0.05; // 5% of CTV channel revenue

  const managers = await prisma.user.findMany({
    where: { role: 'ctv', isActive: true, rank: { in: ['PP', 'TP', 'GDV', 'GDKD'] } },
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

// T+1 promotion: queue promotion for next month
async function queuePromotion(ctvId, currentRank, targetRank) {
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const effectiveMonth = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;

  return prisma.promotionEligibility.upsert({
    where: { id: -1 }, // force create
    create: { ctvId, currentRank, targetRank, effectiveMonth, status: 'pending' },
    update: {},
  }).catch(() =>
    prisma.promotionEligibility.create({
      data: { ctvId, currentRank, targetRank, effectiveMonth, status: 'pending' },
    })
  );
}

module.exports = {
  calculateCtvCommission,
  calculateSalaryFundStatus,
  queuePromotion,
  COMMISSION_RATES,
  AGENCY_COMMISSION,
  TEAM_BONUS_TIERS,
};
