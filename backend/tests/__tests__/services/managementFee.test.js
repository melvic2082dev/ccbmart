jest.mock('@prisma/client', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    transaction: {
      findMany: jest.fn(),
    },
    trainingLog: {
      findMany: jest.fn(),
    },
    managementFee: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mockPrisma) };
});

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const {
  calculateMonthlyManagementFees,
  getReceivedManagementFeesSummary,
  getTrainerMinutes,
  MIN_TRAINING_MINUTES_PER_MONTH,
  LEVEL_CONFIG,
} = require('../../../src/services/managementFee');

const MONTH = '2024-01';

beforeEach(() => {
  // resetAllMocks clears queued mockResolvedValueOnce values (clearAllMocks does NOT)
  jest.resetAllMocks();
  // Set safe defaults so unmocked calls don't throw
  prisma.managementFee.deleteMany.mockResolvedValue({});
  prisma.user.findMany.mockResolvedValue([]);
  prisma.trainingLog.findMany.mockResolvedValue([]);
  prisma.transaction.findMany.mockResolvedValue([]);
  prisma.managementFee.create.mockResolvedValue({ id: 1 });
  prisma.managementFee.findMany.mockResolvedValue([]);
  prisma.user.findUnique.mockResolvedValue(null);
});

// ---------- Constants ----------
describe('constants', () => {
  test('minimum training = 20 hours = 1200 minutes', () => {
    expect(MIN_TRAINING_MINUTES_PER_MONTH).toBe(1200);
  });

  test('F1 level = 10%, requires TP rank', () => {
    const f1 = LEVEL_CONFIG.find(c => c.level === 1);
    expect(f1.percent).toBe(0.10);
    expect(f1.minRank).toBe('TP');
  });

  test('F2 level = 5%, requires GDV rank', () => {
    const f2 = LEVEL_CONFIG.find(c => c.level === 2);
    expect(f2.percent).toBe(0.05);
    expect(f2.minRank).toBe('GDV');
  });

  test('F3 level = 3%, requires GDKD rank', () => {
    const f3 = LEVEL_CONFIG.find(c => c.level === 3);
    expect(f3.percent).toBe(0.03);
    expect(f3.minRank).toBe('GDKD');
  });
});

// ---------- getTrainerMinutes ----------
describe('getTrainerMinutes', () => {
  test('sums VERIFIED training session durations', async () => {
    prisma.trainingLog.findMany.mockResolvedValue([
      { durationMinutes: 60 },
      { durationMinutes: 90 },
      { durationMinutes: 30 },
    ]);
    const mins = await getTrainerMinutes(1, MONTH);
    expect(mins).toBe(180);
  });

  test('returns 0 when no sessions', async () => {
    prisma.trainingLog.findMany.mockResolvedValue([]);
    const mins = await getTrainerMinutes(1, MONTH);
    expect(mins).toBe(0);
  });
});

// ---------- calculateMonthlyManagementFees ----------
describe('calculateMonthlyManagementFees', () => {
  function setupCtvWithUpline({ ctvId, parentId, grandParentId, f1Rank = 'TP', f2Rank = 'GDV' } = {}) {
    prisma.user.findMany.mockResolvedValue([
      { id: ctvId, rank: 'CTV', parentId },
    ]);
    prisma.transaction.findMany.mockResolvedValue([{ totalAmount: '1000000' }]);

    // getUplineChain: findUnique for ctv → f1 → f2 → f3
    prisma.user.findUnique
      .mockResolvedValueOnce({ parentId }) // ctv
      .mockResolvedValueOnce({ id: parentId, rank: f1Rank, parentId: grandParentId }) // f1
      .mockResolvedValueOnce(grandParentId ? { id: grandParentId, rank: f2Rank, parentId: null } : null); // f2

    prisma.trainingLog.findMany.mockResolvedValue([
      { durationMinutes: 1200 }, // exactly 20h
    ]);
    prisma.managementFee.create.mockResolvedValue({ id: 1 });
    prisma.managementFee.deleteMany.mockResolvedValue({});
  }

  test('deletes PENDING records before recompute', async () => {
    prisma.managementFee.deleteMany.mockResolvedValue({});
    prisma.user.findMany.mockResolvedValue([]);

    await calculateMonthlyManagementFees(MONTH);

    expect(prisma.managementFee.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { month: MONTH, status: 'PENDING' } })
    );
  });

  test('skips CTV with zero combo sales', async () => {
    prisma.managementFee.deleteMany.mockResolvedValue({});
    prisma.user.findMany.mockResolvedValue([{ id: 1, rank: 'CTV', parentId: 10 }]);
    prisma.transaction.findMany.mockResolvedValue([]); // zero revenue

    const result = await calculateMonthlyManagementFees(MONTH);
    expect(result.created).toBe(0);
  });

  test('F1 fee = 10% of direct report combo sales when TP+ and 20h training', async () => {
    setupCtvWithUpline({ ctvId: 1, parentId: 10, grandParentId: null, f1Rank: 'TP' });

    const result = await calculateMonthlyManagementFees(MONTH);
    expect(result.created).toBeGreaterThanOrEqual(1);

    const f1Create = prisma.managementFee.create.mock.calls.find(
      ([args]) => args.data.level === 1
    );
    expect(f1Create).toBeTruthy();
    expect(f1Create[0].data.amount).toBe(100000); // 1M * 10%
    expect(f1Create[0].data.toUserId).toBe(10);
  });

  test('no management fee when trainer has < 20h training', async () => {
    prisma.managementFee.deleteMany.mockResolvedValue({});
    prisma.user.findMany.mockResolvedValue([{ id: 1, rank: 'CTV', parentId: 10 }]);
    prisma.transaction.findMany.mockResolvedValue([{ totalAmount: '1000000' }]);

    prisma.user.findUnique
      .mockResolvedValueOnce({ parentId: 10 })
      .mockResolvedValueOnce({ id: 10, rank: 'TP', parentId: null });

    prisma.trainingLog.findMany.mockResolvedValue([
      { durationMinutes: 600 }, // only 10h, below 20h threshold
    ]);

    const result = await calculateMonthlyManagementFees(MONTH);
    expect(result.created).toBe(0);
  });

  test('skips level if upline rank is below minimum required', async () => {
    prisma.managementFee.deleteMany.mockResolvedValue({});
    prisma.user.findMany.mockResolvedValue([{ id: 100, rank: 'CTV', parentId: 200 }]);
    prisma.transaction.findMany.mockResolvedValue([{ totalAmount: '1000000' }]);

    // Use mockImplementation to avoid queue pollution from previous tests
    prisma.user.findUnique.mockImplementation(({ where }) => {
      if (where.id === 100) return Promise.resolve({ parentId: 200 });
      if (where.id === 200) return Promise.resolve({ id: 200, rank: 'PP', parentId: null });
      return Promise.resolve(null);
    });

    prisma.trainingLog.findMany.mockResolvedValue([{ durationMinutes: 1200 }]);

    const result = await calculateMonthlyManagementFees(MONTH);
    // PP rank (index 1) is below TP minimum (index 2) for F1 → no fee created
    expect(result.created).toBe(0);
  });
});

// ---------- getReceivedManagementFeesSummary ----------
describe('getReceivedManagementFeesSummary', () => {
  test('sums fees by level', async () => {
    prisma.managementFee.findMany.mockResolvedValue([
      { level: 1, amount: '100000' },
      { level: 1, amount: '50000' },
      { level: 2, amount: '30000' },
      { level: 3, amount: '10000' },
    ]);

    const result = await getReceivedManagementFeesSummary(1, MONTH);
    expect(result.f1).toBe(150000);
    expect(result.f2).toBe(30000);
    expect(result.f3).toBe(10000);
    expect(result.total).toBe(190000);
  });

  test('returns all zeros when no fees', async () => {
    prisma.managementFee.findMany.mockResolvedValue([]);
    const result = await getReceivedManagementFeesSummary(1, MONTH);
    expect(result.total).toBe(0);
    expect(result.f1).toBe(0);
  });
});
