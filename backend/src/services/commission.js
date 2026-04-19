const { getCachedOrCompute, invalidateCache } = require('./cache');
const prisma = require('../lib/prisma');

// Default hardcoded rates (used as fallback when DB is unavailable)
const COMMISSION_RATES = {
  CTV:  { selfSale: 0.20, direct: 0,    indirect2: 0,    indirect3: 0,    fixedSalary: 0 },
  PP:   { selfSale: 0.20, direct: 0,    indirect2: 0,    indirect3: 0,    fixedSalary: 5000000 },
  TP:   { selfSale: 0.30, direct: 0.10, indirect2: 0,    indirect3: 0,    fixedSalary: 10000000 },
  GDV:  { selfSale: 0.35, direct: 0.10, indirect2: 0.05, indirect3: 0,    fixedSalary: 18000000 },
  GDKD: { selfSale: 0.38, direct: 0.10, indirect2: 0.05, indirect3: 0.03, fixedSalary: 30000000 },
};

// Default agency commission (fallback)
const AGENCY_COMMISSION = {
  A: { commission: 0.08, bonus: 0.02 },
  B: { commission: 0.15, bonus: 0.03 },
  C: { commission: 0.20, bonus: 0.05 },
};

// LRU Cache for commission results (max 1000 entries)
class LRUCache {
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.cache.has(key)) this.cache.delete(key);
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear() {
    this.cache.clear();
  }

  invalidatePattern(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

const commissionCache = new LRUCache(1000);

/**
 * Get commission rates from DB with 5-minute cache, falls back to hardcoded defaults
 */
async function getCommissionRates() {
  return getCachedOrCompute('commission:rates:config', 300, async () => {
    try {
      const dbRates = await prisma.commissionConfig.findMany();
      if (!dbRates || dbRates.length === 0) {
        console.warn('[Commission] No commission rates in DB — using hardcoded fallback rates');
        return COMMISSION_RATES;
      }
      const rates = {};
      for (const r of dbRates) {
        rates[r.tier] = {
          selfSale: Number(r.selfSalePct),
          direct: Number(r.directPct),
          indirect2: Number(r.indirect2Pct),
          indirect3: Number(r.indirect3Pct),
          fixedSalary: Number(r.fixedSalary),
        };
      }
      return rates;
    } catch (err) {
      console.warn('[Commission] Failed to load commission rates from DB — using hardcoded fallback rates:', err.message);
      return COMMISSION_RATES;
    }
  });
}

/**
 * Get agency commission rates from DB with 5-minute cache, falls back to hardcoded defaults
 */
async function getAgencyCommissionRates() {
  return getCachedOrCompute('commission:agency:config', 300, async () => {
    try {
      const dbRates = await prisma.agencyCommissionConfig.findMany();
      if (!dbRates || dbRates.length === 0) {
        console.warn('[Commission] No agency commission rates in DB — using hardcoded fallback rates');
        return AGENCY_COMMISSION;
      }
      const rates = {};
      for (const r of dbRates) {
        rates[r.group] = {
          commission: Number(r.commissionPct),
          bonus: Number(r.bonusPct),
        };
      }
      return rates;
    } catch (err) {
      console.warn('[Commission] Failed to load agency commission rates from DB — using hardcoded fallback rates:', err.message);
      return AGENCY_COMMISSION;
    }
  });
}

/**
 * Optimized commission calculator - uses only 2-3 queries instead of N+1
 */
async function calculateCtvCommission(ctvId, month) {
  const cacheKey = `commission:${ctvId}:${month}`;
  const cached = commissionCache.get(cacheKey);
  if (cached) return cached;

  const user = await prisma.user.findUnique({ where: { id: ctvId } });
  if (!user || user.role !== 'ctv') return null;

  const rank = user.rank || 'CTV';
  const allRates = await getCommissionRates();
  const rates = allRates[rank];
  if (!rates) return null;

  const startDate = new Date(`${month}-01`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  // Query 1: Get ALL CONFIRMED CTV channel transactions for the month
  const allTransactions = await prisma.transaction.findMany({
    where: {
      channel: 'ctv',
      status: 'CONFIRMED',
      createdAt: { gte: startDate, lt: endDate },
    },
    select: {
      id: true,
      totalAmount: true,
      ctvId: true,
    },
  });

  // Query 2: Get ALL active CTVs to build the tree in memory
  const allCtv = await prisma.user.findMany({
    where: { role: 'ctv', isActive: true },
    select: { id: true, parentId: true, rank: true, name: true },
  });

  // Build revenue map: ctvId -> total revenue
  const revenueMap = new Map();
  for (const tx of allTransactions) {
    revenueMap.set(tx.ctvId, (revenueMap.get(tx.ctvId) || 0) + Number(tx.totalAmount));
  }

  // Build children map: parentId -> [childIds]
  const childrenMap = new Map();
  for (const ctv of allCtv) {
    if (ctv.parentId !== null) {
      if (!childrenMap.has(ctv.parentId)) childrenMap.set(ctv.parentId, []);
      childrenMap.get(ctv.parentId).push(ctv.id);
    }
  }

  // Calculate commission using in-memory tree traversal
  const selfSalesAmount = revenueMap.get(ctvId) || 0;
  const selfCommission = selfSalesAmount * rates.selfSale;

  let directCommission = 0;
  let indirect2Commission = 0;
  let indirect3Commission = 0;

  const directIds = childrenMap.get(ctvId) || [];
  if (rates.direct > 0) {
    for (const directId of directIds) {
      const directRevenue = revenueMap.get(directId) || 0;
      directCommission += directRevenue * rates.direct;

      if (rates.indirect2 > 0) {
        const indirect2Ids = childrenMap.get(directId) || [];
        for (const ind2Id of indirect2Ids) {
          const ind2Revenue = revenueMap.get(ind2Id) || 0;
          indirect2Commission += ind2Revenue * rates.indirect2;

          if (rates.indirect3 > 0) {
            const indirect3Ids = childrenMap.get(ind2Id) || [];
            for (const ind3Id of indirect3Ids) {
              const ind3Revenue = revenueMap.get(ind3Id) || 0;
              indirect3Commission += ind3Revenue * rates.indirect3;
            }
          }
        }
      }
    }
  }

  const result = {
    ctvId,
    rank,
    month,
    selfSalesAmount,
    selfCommission,
    directCommission,
    indirect2Commission,
    indirect3Commission,
    fixedSalary: rates.fixedSalary,
    totalIncome: selfCommission + directCommission + indirect2Commission + indirect3Commission + rates.fixedSalary,
  };

  commissionCache.set(cacheKey, result);

  return result;
}

/**
 * Calculate all CTV commissions in batch - single pass for admin dashboard
 */
async function calculateAllCtvCommissions(month) {
  const cacheKey = `all-commissions:${month}`;
  const cached = commissionCache.get(cacheKey);
  if (cached) return cached;

  const startDate = new Date(`${month}-01`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  const [allTransactions, allCtv, allRates] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        channel: 'ctv',
        status: 'CONFIRMED',
        createdAt: { gte: startDate, lt: endDate },
      },
      select: { id: true, totalAmount: true, ctvId: true },
    }),
    prisma.user.findMany({
      where: { role: 'ctv', isActive: true },
      select: { id: true, parentId: true, rank: true, name: true },
    }),
    getCommissionRates(),
  ]);

  const revenueMap = new Map();
  for (const tx of allTransactions) {
    revenueMap.set(tx.ctvId, (revenueMap.get(tx.ctvId) || 0) + Number(tx.totalAmount));
  }

  const childrenMap = new Map();
  for (const ctv of allCtv) {
    if (ctv.parentId !== null) {
      if (!childrenMap.has(ctv.parentId)) childrenMap.set(ctv.parentId, []);
      childrenMap.get(ctv.parentId).push(ctv.id);
    }
  }

  const results = new Map();
  for (const ctv of allCtv) {
    const rates = allRates[ctv.rank || 'CTV'];
    if (!rates) continue;

    const selfSalesAmount = revenueMap.get(ctv.id) || 0;
    const selfCommission = selfSalesAmount * rates.selfSale;
    let directCommission = 0, indirect2Commission = 0, indirect3Commission = 0;

    const directIds = childrenMap.get(ctv.id) || [];
    if (rates.direct > 0) {
      for (const directId of directIds) {
        directCommission += (revenueMap.get(directId) || 0) * rates.direct;
        if (rates.indirect2 > 0) {
          const ind2Ids = childrenMap.get(directId) || [];
          for (const ind2Id of ind2Ids) {
            indirect2Commission += (revenueMap.get(ind2Id) || 0) * rates.indirect2;
            if (rates.indirect3 > 0) {
              const ind3Ids = childrenMap.get(ind2Id) || [];
              for (const ind3Id of ind3Ids) {
                indirect3Commission += (revenueMap.get(ind3Id) || 0) * rates.indirect3;
              }
            }
          }
        }
      }
    }

    results.set(ctv.id, {
      ctvId: ctv.id,
      name: ctv.name,
      rank: ctv.rank || 'CTV',
      month,
      selfSalesAmount,
      selfCommission,
      directCommission,
      indirect2Commission,
      indirect3Commission,
      fixedSalary: rates.fixedSalary,
      totalIncome: selfCommission + directCommission + indirect2Commission + indirect3Commission + rates.fixedSalary,
    });
  }

  commissionCache.set(cacheKey, results);
  return results;
}

async function calculateSalaryFundStatus(month) {
  return getCachedOrCompute(`salary-fund:${month}`, 300, async () => {
    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const ctvRevenueResult = await prisma.transaction.aggregate({
      where: {
        channel: 'ctv',
        status: 'CONFIRMED',
        createdAt: { gte: startDate, lt: endDate },
      },
      _sum: { totalAmount: true },
    });

    const ctvRevenue = Number(ctvRevenueResult._sum.totalAmount) || 0;
    const salaryFundCap = ctvRevenue * 0.05;

    const managers = await prisma.user.findMany({
      where: {
        role: 'ctv',
        isActive: true,
        rank: { in: ['PP', 'TP', 'GDV', 'GDKD'] },
      },
      select: { id: true, name: true, rank: true },
    });

    const allRates = await getCommissionRates();

    let totalFixedSalary = 0;
    for (const m of managers) {
      totalFixedSalary += allRates[m.rank]?.fixedSalary || 0;
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
        salary: allRates[m.rank]?.fixedSalary || 0,
      })),
    };
  });
}

/**
 * Invalidate commission cache when data changes
 */
function invalidateCommissionCache(ctvId = null) {
  if (ctvId) {
    commissionCache.invalidatePattern(`commission:${ctvId}`);
    commissionCache.invalidatePattern('all-commissions');
  } else {
    commissionCache.clear();
  }
  // Clear DB-driven rates cache and salary fund cache
  invalidateCache('commission:rates:config');
  invalidateCache('commission:agency:config');
  invalidateCache('salary-fund:*');
  console.log(`[Cache] Commission cache invalidated${ctvId ? ` for CTV ${ctvId}` : ' (all)'}`);
}

module.exports = {
  calculateCtvCommission,
  calculateAllCtvCommissions,
  calculateSalaryFundStatus,
  invalidateCommissionCache,
  getCommissionRates,
  getAgencyCommissionRates,
  COMMISSION_RATES,
  AGENCY_COMMISSION,
};
