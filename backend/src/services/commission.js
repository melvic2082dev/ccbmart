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
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.cache.has(key)) this.cache.delete(key);
    if (this.cache.size >= this.maxSize) {
      // Delete oldest (first) entry
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
 * Optimized commission calculator - uses only 2-3 queries instead of N+1
 */
async function calculateCtvCommission(ctvId, month) {
  // Check LRU cache first
  const cacheKey = `commission:${ctvId}:${month}`;
  const cached = commissionCache.get(cacheKey);
  if (cached) return cached;

  const user = await prisma.user.findUnique({ where: { id: ctvId } });
  if (!user || user.role !== 'ctv') return null;

  const rank = user.rank || 'CTV';
  const rates = COMMISSION_RATES[rank];
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
    revenueMap.set(tx.ctvId, (revenueMap.get(tx.ctvId) || 0) + tx.totalAmount);
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

  let f1Commission = 0;
  let f2Commission = 0;
  let f3Commission = 0;

  // F1: direct children
  const f1Ids = childrenMap.get(ctvId) || [];
  if (rates.f1 > 0) {
    for (const f1Id of f1Ids) {
      const f1Revenue = revenueMap.get(f1Id) || 0;
      f1Commission += f1Revenue * rates.f1;

      // F2: children of F1
      if (rates.f2 > 0) {
        const f2Ids = childrenMap.get(f1Id) || [];
        for (const f2Id of f2Ids) {
          const f2Revenue = revenueMap.get(f2Id) || 0;
          f2Commission += f2Revenue * rates.f2;

          // F3: children of F2
          if (rates.f3 > 0) {
            const f3Ids = childrenMap.get(f2Id) || [];
            for (const f3Id of f3Ids) {
              const f3Revenue = revenueMap.get(f3Id) || 0;
              f3Commission += f3Revenue * rates.f3;
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
    f1Commission,
    f2Commission,
    f3Commission,
    fixedSalary: rates.fixedSalary,
    totalIncome: selfCommission + f1Commission + f2Commission + f3Commission + rates.fixedSalary,
  };

  // Store in LRU cache
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

  // Only 2 queries for ALL CTVs (CONFIRMED only)
  const [allTransactions, allCtv] = await Promise.all([
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
  ]);

  const revenueMap = new Map();
  for (const tx of allTransactions) {
    revenueMap.set(tx.ctvId, (revenueMap.get(tx.ctvId) || 0) + tx.totalAmount);
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
    const rates = COMMISSION_RATES[ctv.rank || 'CTV'];
    if (!rates) continue;

    const selfSalesAmount = revenueMap.get(ctv.id) || 0;
    const selfCommission = selfSalesAmount * rates.selfSale;
    let f1Commission = 0, f2Commission = 0, f3Commission = 0;

    const f1Ids = childrenMap.get(ctv.id) || [];
    if (rates.f1 > 0) {
      for (const f1Id of f1Ids) {
        f1Commission += (revenueMap.get(f1Id) || 0) * rates.f1;
        if (rates.f2 > 0) {
          const f2Ids = childrenMap.get(f1Id) || [];
          for (const f2Id of f2Ids) {
            f2Commission += (revenueMap.get(f2Id) || 0) * rates.f2;
            if (rates.f3 > 0) {
              const f3Ids = childrenMap.get(f2Id) || [];
              for (const f3Id of f3Ids) {
                f3Commission += (revenueMap.get(f3Id) || 0) * rates.f3;
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
      f1Commission,
      f2Commission,
      f3Commission,
      fixedSalary: rates.fixedSalary,
      totalIncome: selfCommission + f1Commission + f2Commission + f3Commission + rates.fixedSalary,
    });
  }

  commissionCache.set(cacheKey, results);
  return results;
}

async function calculateSalaryFundStatus(month) {
  const startDate = new Date(`${month}-01`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  // Single aggregation query - CONFIRMED only
  const ctvRevenueResult = await prisma.transaction.aggregate({
    where: {
      channel: 'ctv',
      status: 'CONFIRMED',
      createdAt: { gte: startDate, lt: endDate },
    },
    _sum: { totalAmount: true },
  });

  const ctvRevenue = ctvRevenueResult._sum.totalAmount || 0;
  const salaryFundCap = ctvRevenue * 0.05;

  const managers = await prisma.user.findMany({
    where: {
      role: 'ctv',
      isActive: true,
      rank: { in: ['PP', 'TP', 'GDV', 'GDKD'] },
    },
    select: { id: true, name: true, rank: true },
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
  console.log(`[Cache] Commission cache invalidated${ctvId ? ` for CTV ${ctvId}` : ' (all)'}`);
}

module.exports = {
  calculateCtvCommission,
  calculateAllCtvCommissions,
  calculateSalaryFundStatus,
  invalidateCommissionCache,
  COMMISSION_RATES,
  AGENCY_COMMISSION,
};
