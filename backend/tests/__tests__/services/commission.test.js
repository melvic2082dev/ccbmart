jest.mock('@prisma/client', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    transaction: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mockPrisma) };
});

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const {
  calculateCtvCommission,
  calculateAllCtvCommissions,
  calculateSalaryFundStatus,
  invalidateCommissionCache,
  COMMISSION_RATES,
} = require('../../../src/services/commission');

const MONTH = '2024-01';

beforeEach(() => {
  jest.clearAllMocks();
  invalidateCommissionCache();
});

// ---------- COMMISSION_RATES constants ----------
describe('COMMISSION_RATES constants', () => {
  test('CTV: selfSale=20%, no fixed salary', () => {
    expect(COMMISSION_RATES.CTV.selfSale).toBe(0.20);
    expect(COMMISSION_RATES.CTV.fixedSalary).toBe(0);
    expect(COMMISSION_RATES.CTV.direct).toBe(0);
  });

  test('PP: selfSale=20%, fixedSalary=5M', () => {
    expect(COMMISSION_RATES.PP.selfSale).toBe(0.20);
    expect(COMMISSION_RATES.PP.fixedSalary).toBe(5000000);
  });

  test('TP: selfSale=30%, direct=10%, fixedSalary=10M', () => {
    expect(COMMISSION_RATES.TP.selfSale).toBe(0.30);
    expect(COMMISSION_RATES.TP.direct).toBe(0.10);
    expect(COMMISSION_RATES.TP.fixedSalary).toBe(10000000);
  });

  test('GDV: selfSale=35%, direct=10%, indirect2=5%, fixedSalary=18M', () => {
    expect(COMMISSION_RATES.GDV.selfSale).toBe(0.35);
    expect(COMMISSION_RATES.GDV.direct).toBe(0.10);
    expect(COMMISSION_RATES.GDV.indirect2).toBe(0.05);
    expect(COMMISSION_RATES.GDV.fixedSalary).toBe(18000000);
  });

  test('GDKD: selfSale=38%, direct=10%, indirect2=5%, indirect3=3%, fixedSalary=30M', () => {
    expect(COMMISSION_RATES.GDKD.selfSale).toBe(0.38);
    expect(COMMISSION_RATES.GDKD.direct).toBe(0.10);
    expect(COMMISSION_RATES.GDKD.indirect2).toBe(0.05);
    expect(COMMISSION_RATES.GDKD.indirect3).toBe(0.03);
    expect(COMMISSION_RATES.GDKD.fixedSalary).toBe(30000000);
  });
});

// ---------- calculateCtvCommission ----------
describe('calculateCtvCommission', () => {
  function setupMocks({ userId = 1, rank = 'CTV', transactions = [], ctvs = [] } = {}) {
    prisma.user.findUnique.mockResolvedValue({ id: userId, role: 'ctv', rank });
    prisma.transaction.findMany.mockResolvedValue(transactions);
    prisma.user.findMany.mockResolvedValue(ctvs);
  }

  test('returns null if user not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const result = await calculateCtvCommission(999, MONTH);
    expect(result).toBeNull();
  });

  test('returns null if user is not ctv role', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, role: 'admin', rank: 'CTV' });
    const result = await calculateCtvCommission(1, MONTH);
    expect(result).toBeNull();
  });

  test('CTV rank: 20% self commission, zero fixed salary', async () => {
    setupMocks({
      userId: 1,
      rank: 'CTV',
      transactions: [{ id: 1, totalAmount: '1000000', ctvId: 1 }],
      ctvs: [{ id: 1, parentId: null, rank: 'CTV', name: 'Test' }],
    });

    const result = await calculateCtvCommission(1, MONTH);
    expect(result.selfSalesAmount).toBe(1000000);
    expect(result.selfCommission).toBe(200000);
    expect(result.fixedSalary).toBe(0);
    expect(result.directCommission).toBe(0);
    expect(result.totalIncome).toBe(200000);
    expect(result.rank).toBe('CTV');
  });

  test('PP rank: 20% self commission, 5M fixed salary, no direct commission', async () => {
    setupMocks({
      userId: 2,
      rank: 'PP',
      transactions: [{ id: 1, totalAmount: '2000000', ctvId: 2 }],
      ctvs: [{ id: 2, parentId: null, rank: 'PP', name: 'PP User' }],
    });

    const result = await calculateCtvCommission(2, MONTH);
    expect(result.selfCommission).toBe(400000); // 2M * 20%
    expect(result.fixedSalary).toBe(5000000);
    expect(result.directCommission).toBe(0);
    expect(result.totalIncome).toBe(5400000);
  });

  test('TP rank: 30% self + 10% direct commission', async () => {
    setupMocks({
      userId: 10,
      rank: 'TP',
      transactions: [
        { id: 1, totalAmount: '1000000', ctvId: 10 },  // self
        { id: 2, totalAmount: '500000', ctvId: 11 },   // direct child
      ],
      ctvs: [
        { id: 10, parentId: null, rank: 'TP', name: 'TP User' },
        { id: 11, parentId: 10, rank: 'CTV', name: 'Child' },
      ],
    });

    const result = await calculateCtvCommission(10, MONTH);
    expect(result.selfCommission).toBe(300000);   // 1M * 30%
    expect(result.directCommission).toBe(50000);  // 500k * 10%
    expect(result.fixedSalary).toBe(10000000);
    expect(result.totalIncome).toBe(10350000);
  });

  test('GDV rank: 35% self + 10% direct + 5% indirect2', async () => {
    setupMocks({
      userId: 20,
      rank: 'GDV',
      transactions: [
        { id: 1, totalAmount: '1000000', ctvId: 20 },
        { id: 2, totalAmount: '1000000', ctvId: 21 },
        { id: 3, totalAmount: '1000000', ctvId: 22 },
      ],
      ctvs: [
        { id: 20, parentId: null, rank: 'GDV', name: 'GDV' },
        { id: 21, parentId: 20, rank: 'CTV', name: 'Child' },
        { id: 22, parentId: 21, rank: 'CTV', name: 'Grandchild' },
      ],
    });

    const result = await calculateCtvCommission(20, MONTH);
    expect(result.selfCommission).toBe(350000);    // 1M * 35%
    expect(result.directCommission).toBe(100000);  // 1M * 10%
    expect(result.indirect2Commission).toBe(50000); // 1M * 5%
    expect(result.indirect3Commission).toBe(0);
    expect(result.fixedSalary).toBe(18000000);
  });

  test('GDKD rank: 38% self + 10% direct + 5% indirect2 + 3% indirect3', async () => {
    setupMocks({
      userId: 30,
      rank: 'GDKD',
      transactions: [
        { id: 1, totalAmount: '1000000', ctvId: 30 },
        { id: 2, totalAmount: '1000000', ctvId: 31 },
        { id: 3, totalAmount: '1000000', ctvId: 32 },
        { id: 4, totalAmount: '1000000', ctvId: 33 },
      ],
      ctvs: [
        { id: 30, parentId: null, rank: 'GDKD', name: 'GDKD' },
        { id: 31, parentId: 30, rank: 'CTV', name: 'L1' },
        { id: 32, parentId: 31, rank: 'CTV', name: 'L2' },
        { id: 33, parentId: 32, rank: 'CTV', name: 'L3' },
      ],
    });

    const result = await calculateCtvCommission(30, MONTH);
    expect(result.selfCommission).toBe(380000);    // 1M * 38%
    expect(result.directCommission).toBe(100000);  // 1M * 10%
    expect(result.indirect2Commission).toBe(50000); // 1M * 5%
    expect(result.indirect3Commission).toBe(30000); // 1M * 3%
    expect(result.fixedSalary).toBe(30000000);
    expect(result.totalIncome).toBe(30560000);
  });

  test('zero revenue → zero commission (only fixed salary)', async () => {
    setupMocks({
      userId: 40,
      rank: 'TP',
      transactions: [],
      ctvs: [{ id: 40, parentId: null, rank: 'TP', name: 'TP' }],
    });

    const result = await calculateCtvCommission(40, MONTH);
    expect(result.selfSalesAmount).toBe(0);
    expect(result.selfCommission).toBe(0);
    expect(result.directCommission).toBe(0);
    expect(result.fixedSalary).toBe(10000000);
    expect(result.totalIncome).toBe(10000000);
  });

  test('CTV with no transactions → zero total income', async () => {
    setupMocks({
      userId: 50,
      rank: 'CTV',
      transactions: [],
      ctvs: [{ id: 50, parentId: null, rank: 'CTV', name: 'Empty CTV' }],
    });

    const result = await calculateCtvCommission(50, MONTH);
    expect(result.totalIncome).toBe(0);
  });

  test('single CTV with multiple transactions sums correctly', async () => {
    setupMocks({
      userId: 60,
      rank: 'CTV',
      transactions: [
        { id: 1, totalAmount: '500000', ctvId: 60 },
        { id: 2, totalAmount: '300000', ctvId: 60 },
        { id: 3, totalAmount: '200000', ctvId: 60 },
      ],
      ctvs: [{ id: 60, parentId: null, rank: 'CTV', name: 'Multi Tx' }],
    });

    const result = await calculateCtvCommission(60, MONTH);
    expect(result.selfSalesAmount).toBe(1000000);
    expect(result.selfCommission).toBe(200000);
  });

  test('result is cached on second call', async () => {
    setupMocks({
      userId: 70,
      rank: 'CTV',
      transactions: [{ id: 1, totalAmount: '1000000', ctvId: 70 }],
      ctvs: [{ id: 70, parentId: null, rank: 'CTV', name: 'Cached' }],
    });

    await calculateCtvCommission(70, MONTH);
    await calculateCtvCommission(70, MONTH);

    // Only called once due to cache
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
  });

  test('returns correct month in result', async () => {
    setupMocks({
      userId: 80,
      rank: 'CTV',
      transactions: [],
      ctvs: [{ id: 80, parentId: null, rank: 'CTV', name: 'Test' }],
    });

    const result = await calculateCtvCommission(80, '2024-06');
    expect(result.month).toBe('2024-06');
  });
});

// ---------- calculateSalaryFundStatus ----------
describe('calculateSalaryFundStatus', () => {
  test('salary fund cap = 5% of CTV revenue', async () => {
    prisma.transaction.aggregate.mockResolvedValue({ _sum: { totalAmount: '10000000' } });
    prisma.user.findMany.mockResolvedValue([]);

    const result = await calculateSalaryFundStatus(MONTH);
    expect(result.ctvRevenue).toBe(10000000);
    expect(result.salaryFundCap).toBe(500000);
  });

  test('zero revenue → zero fund, usagePercent = 0', async () => {
    prisma.transaction.aggregate.mockResolvedValue({ _sum: { totalAmount: null } });
    prisma.user.findMany.mockResolvedValue([]);

    const result = await calculateSalaryFundStatus(MONTH);
    expect(result.ctvRevenue).toBe(0);
    expect(result.salaryFundCap).toBe(0);
    expect(result.usagePercent).toBe(0);
    expect(result.warning).toBe('OK');
  });

  test('usagePercent >= 100 → CRITICAL warning', async () => {
    // PP salary = 5M, fund = 4M → 125%
    prisma.transaction.aggregate.mockResolvedValue({ _sum: { totalAmount: '80000000' } });
    prisma.user.findMany.mockResolvedValue([{ id: 1, name: 'PP', rank: 'PP' }]);

    const result = await calculateSalaryFundStatus(MONTH);
    expect(result.totalFixedSalary).toBe(5000000);
    expect(result.warning).toBe('CRITICAL');
  });

  test('usagePercent >= 80 and < 100 → WARNING', async () => {
    // TP salary = 10M, fund cap = 12M → 83.3%
    prisma.transaction.aggregate.mockResolvedValue({ _sum: { totalAmount: '240000000' } });
    prisma.user.findMany.mockResolvedValue([{ id: 1, name: 'TP', rank: 'TP' }]);

    const result = await calculateSalaryFundStatus(MONTH);
    expect(result.warning).toBe('WARNING');
  });

  test('managers listed with correct salary amounts', async () => {
    prisma.transaction.aggregate.mockResolvedValue({ _sum: { totalAmount: '1000000000' } });
    prisma.user.findMany.mockResolvedValue([
      { id: 1, name: 'PP User', rank: 'PP' },
      { id: 2, name: 'TP User', rank: 'TP' },
    ]);

    const result = await calculateSalaryFundStatus(MONTH);
    expect(result.managers).toHaveLength(2);
    expect(result.managers[0].salary).toBe(5000000);
    expect(result.managers[1].salary).toBe(10000000);
    expect(result.totalFixedSalary).toBe(15000000);
  });
});
