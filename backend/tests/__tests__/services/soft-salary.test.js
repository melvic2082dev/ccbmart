jest.mock('@prisma/client', () => {
  const mockPrisma = {
    user: {
      findMany: jest.fn(),
    },
    transaction: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mockPrisma) };
});

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const { calculateSoftSalary } = require('../../../src/services/soft-salary');

const MONTH = '2024-01';

beforeEach(() => {
  jest.clearAllMocks();
  prisma.transaction.groupBy.mockResolvedValue([]);
});

function mockRevenue(amount) {
  prisma.transaction.aggregate.mockResolvedValue({ _sum: { totalAmount: String(amount) } });
}

function mockManagers(managers) {
  prisma.user.findMany.mockResolvedValue(managers.map((m, i) => ({
    id: i + 1,
    name: m.name || `Manager ${i + 1}`,
    rank: m.rank,
    createdAt: m.createdAt || new Date(`2024-0${i + 1}-01`),
  })));
}

// ---------- calculateSoftSalary ----------
describe('calculateSoftSalary', () => {
  test('salary fund cap = 5% of CTV revenue', async () => {
    mockRevenue(100000000); // 100M
    mockManagers([]);

    const result = await calculateSoftSalary(MONTH);
    expect(result.ctvRevenue).toBe(100000000);
    expect(result.salaryFundCap).toBe(5000000);
  });

  test('zero revenue → zero fund, NORMAL bracket', async () => {
    prisma.transaction.aggregate.mockResolvedValue({ _sum: { totalAmount: null } });
    mockManagers([]);

    const result = await calculateSoftSalary(MONTH);
    expect(result.ctvRevenue).toBe(0);
    expect(result.salaryFundCap).toBe(0);
    expect(result.bracket).toBe('NORMAL');
    expect(result.usagePercent).toBe(0);
  });

  test('usagePercent < 100 → NORMAL bracket, no adjustment', async () => {
    // PP salary = 5M, fund cap = 10M → 50%
    mockRevenue(200000000); // fund = 10M
    mockManagers([{ rank: 'PP' }]);

    const result = await calculateSoftSalary(MONTH);
    expect(result.bracket).toBe('NORMAL');
    expect(result.details[0].isAdjusted).toBe(false);
    expect(result.details[0].totalSalary).toBe(5000000);
  });

  test('usagePercent 100-120 → WARNING bracket', async () => {
    // PP salary = 5M, fund cap = 4.5M → 111%
    mockRevenue(90000000); // fund = 4.5M
    mockManagers([{ rank: 'PP' }]);

    const result = await calculateSoftSalary(MONTH);
    expect(result.bracket).toBe('WARNING');
    expect(result.freezeHiring).toBe(false);
  });

  test('usagePercent > 120 and <= 150 → HIGH bracket', async () => {
    // PP salary = 5M, fund cap = 3.7M → ~135%
    mockRevenue(74000000); // fund = 3.7M
    mockManagers([{ rank: 'PP' }]);

    const result = await calculateSoftSalary(MONTH);
    expect(result.bracket).toBe('HIGH');
  });

  test('usagePercent > 150 → FREEZE bracket', async () => {
    // PP salary = 5M, fund cap = 3M → 167%
    mockRevenue(60000000); // fund = 3M
    mockManagers([{ rank: 'PP' }]);

    const result = await calculateSoftSalary(MONTH);
    expect(result.bracket).toBe('FREEZE');
    expect(result.freezeHiring).toBe(true);
  });

  test('newest manager gets variable salary adjustment in WARNING bracket', async () => {
    // One PP manager (5M salary), fund cap must be between 5M/1.20 and 5M/1.00
    // ctvRevenue ∈ (83.33M, 100M] → pick 90M: fund=4.5M, usage=5M/4.5M=111% → WARNING
    mockRevenue(90000000);
    prisma.user.findMany.mockResolvedValue([{
      id: 1,
      name: 'PP Manager',
      rank: 'PP',
      createdAt: new Date('2024-01-01'),
    }]);
    prisma.transaction.groupBy.mockResolvedValue([
      { ctvId: 1, _sum: { totalAmount: '2000000' } },
    ]);

    const result = await calculateSoftSalary(MONTH);
    expect(result.bracket).toBe('WARNING');
    const adjusted = result.details.find(d => d.isAdjusted);
    expect(adjusted).toBeTruthy();
    // In WARNING: fixedRatio=0.5 → actualFixed = 5M * 0.5 = 2.5M
    expect(adjusted.actualFixed).toBe(2500000);
  });

  test('totalActualSalary sums all manager salaries', async () => {
    mockRevenue(1000000000); // huge revenue → NORMAL
    mockManagers([{ rank: 'PP' }, { rank: 'TP' }]);

    const result = await calculateSoftSalary(MONTH);
    expect(result.totalActualSalary).toBe(15000000); // 5M + 10M
  });
});
