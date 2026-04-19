jest.mock('@prisma/client', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    transaction: {
      findMany: jest.fn(),
    },
    b2BContract: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    businessHousehold: {
      upsert: jest.fn(),
    },
    breakawayLog: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    breakawayFee: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn(mockPrisma)),
  };
  return { PrismaClient: jest.fn(() => mockPrisma) };
});

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const {
  shouldBreakaway,
  handleBreakaway,
  processMonthlyBreakawayFees,
  getReceivedBreakawayFeesSummary,
  RANK_ORDER,
} = require('../../../src/services/breakaway');

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------- shouldBreakaway (pure function) ----------
describe('shouldBreakaway', () => {
  test('CTV vs CTV: false (traineeIdx = 0, fails > 0 check)', () => {
    expect(shouldBreakaway('CTV', 'CTV')).toBe(false);
  });

  test('CTV vs GDKD: false (trainee rank lower)', () => {
    expect(shouldBreakaway('CTV', 'GDKD')).toBe(false);
  });

  test('PP vs CTV: true (PP > CTV and traineeIdx > 0)', () => {
    expect(shouldBreakaway('PP', 'CTV')).toBe(true);
  });

  test('PP vs PP: true (same rank, traineeIdx > 0)', () => {
    expect(shouldBreakaway('PP', 'PP')).toBe(true);
  });

  test('TP vs PP: true', () => {
    expect(shouldBreakaway('TP', 'PP')).toBe(true);
  });

  test('GDV vs TP: true', () => {
    expect(shouldBreakaway('GDV', 'TP')).toBe(true);
  });

  test('GDKD vs GDKD: true', () => {
    expect(shouldBreakaway('GDKD', 'GDKD')).toBe(true);
  });

  test('TP vs GDV: false (trainee lower than mentor)', () => {
    expect(shouldBreakaway('TP', 'GDV')).toBe(false);
  });
});

// ---------- RANK_ORDER ----------
describe('RANK_ORDER', () => {
  test('order is CTV < PP < TP < GDV < GDKD', () => {
    expect(RANK_ORDER).toEqual(['CTV', 'PP', 'TP', 'GDV', 'GDKD']);
  });
});

// ---------- handleBreakaway ----------
describe('handleBreakaway', () => {
  function setupBasicBreakaway({
    traineeId = 1,
    traineeRank = 'PP',
    mentorId = 2,
    mentorRank = 'CTV',
    grandParentId = null,
    existingContract = null,
  } = {}) {
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: traineeId, name: 'Trainee', rank: traineeRank, parentId: mentorId })
      .mockResolvedValueOnce({ id: mentorId, name: 'Mentor', rank: mentorRank, parentId: grandParentId });
    prisma.b2BContract.findFirst.mockResolvedValue(existingContract);
    prisma.businessHousehold.upsert.mockResolvedValue({});
    prisma.user.update.mockResolvedValue({});
    prisma.b2BContract.create.mockResolvedValue({ contractNo: 'B2B-NEW' });
    prisma.breakawayLog.upsert.mockResolvedValue({ id: 99, userId: traineeId });
  }

  test('returns breakaway:false when trainee rank is below mentor', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 1, name: 'Trainee', rank: 'CTV', parentId: 2 })
      .mockResolvedValueOnce({ id: 2, name: 'Mentor', rank: 'GDKD', parentId: null });

    const result = await handleBreakaway(1, 2);
    expect(result.breakaway).toBe(false);
    expect(result.reason).toContain('below mentor');
  });

  test('throws when trainee not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(handleBreakaway(999, 2)).rejects.toThrow('not found');
  });

  test('moves parentId to grandParent on breakaway', async () => {
    setupBasicBreakaway({ traineeId: 1, mentorId: 2, grandParentId: 3 });
    prisma.b2BContract.findFirst.mockResolvedValue(null);

    await handleBreakaway(1, 2);

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: { parentId: 3 },
      })
    );
  });

  test('parentId set to null when mentor has no parent (becomes root)', async () => {
    setupBasicBreakaway({ traineeId: 1, mentorId: 2, grandParentId: null });

    await handleBreakaway(1, 2);

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { parentId: null },
      })
    );
  });

  test('terminates existing B2BContract with mentor', async () => {
    setupBasicBreakaway({
      traineeId: 1,
      mentorId: 2,
      existingContract: { id: 55, contractNo: 'B2B-OLD', status: 'active' },
    });

    const result = await handleBreakaway(1, 2);

    expect(prisma.b2BContract.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 55 },
        data: expect.objectContaining({ status: 'terminated' }),
      })
    );
    expect(result.contractTerminated).toBe('B2B-OLD');
  });

  test('creates new B2BContract with grandParent when grandParent exists', async () => {
    setupBasicBreakaway({ traineeId: 1, mentorId: 2, grandParentId: 3 });

    const result = await handleBreakaway(1, 2);

    expect(prisma.b2BContract.create).toHaveBeenCalled();
    expect(result.newContractNo).toBeTruthy();
  });

  test('no new B2BContract created when no grandParent', async () => {
    setupBasicBreakaway({ traineeId: 1, mentorId: 2, grandParentId: null });

    const result = await handleBreakaway(1, 2);

    expect(prisma.b2BContract.create).not.toHaveBeenCalled();
    expect(result.newContractNo).toBeNull();
  });

  test('creates BreakawayLog with 12-month expiry', async () => {
    setupBasicBreakaway({ traineeId: 1, mentorId: 2, grandParentId: 3 });

    const result = await handleBreakaway(1, 2);

    expect(result.breakaway).toBe(true);
    expect(result.breakawayLogId).toBe(99);
    expect(result.expireAt).toBeInstanceOf(Date);

    const now = new Date();
    const expectedExpiry = new Date(now);
    expectedExpiry.setMonth(expectedExpiry.getMonth() + 12);
    expect(result.expireAt.getMonth()).toBe(expectedExpiry.getMonth());
  });

  test('registers trainee as BusinessHousehold', async () => {
    setupBasicBreakaway({ traineeId: 1, mentorId: 2 });

    await handleBreakaway(1, 2);

    expect(prisma.businessHousehold.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 1 } })
    );
  });
});

// ---------- processMonthlyBreakawayFees ----------
describe('processMonthlyBreakawayFees', () => {
  const MONTH = '2024-01';

  test('deletes PENDING records before recomputing', async () => {
    prisma.breakawayFee.deleteMany.mockResolvedValue({});
    prisma.breakawayLog.updateMany.mockResolvedValue({});
    prisma.breakawayLog.findMany.mockResolvedValue([]);
    prisma.user.findFirst.mockResolvedValue(null);

    await processMonthlyBreakawayFees(MONTH);

    expect(prisma.breakawayFee.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { month: MONTH, status: 'PENDING' } })
    );
  });

  test('creates Level 1 fee (3%) for old mentor', async () => {
    // Use fixed dates: breakaway happened at start of month, expires 12 months later
    const breakawayAt = new Date('2024-01-01');
    const expireAt = new Date('2025-01-01');

    prisma.breakawayFee.deleteMany.mockResolvedValue({});
    prisma.breakawayLog.updateMany.mockResolvedValue({});
    prisma.breakawayLog.findMany.mockResolvedValue([{
      id: 1,
      userId: 10,
      oldParentId: 20,
      newParentId: 30,
      breakawayAt,
      expireAt,
      status: 'ACTIVE',
    }]);
    prisma.user.findFirst.mockResolvedValue({ id: 99, rank: 'GDKD' });

    // getSubtreeRevenue mocks
    prisma.user.findMany.mockResolvedValue([]); // no children
    prisma.transaction.findMany.mockResolvedValue([{ totalAmount: '10000000' }]);
    prisma.breakawayFee.create.mockResolvedValue({ id: 1 });

    const result = await processMonthlyBreakawayFees(MONTH);

    const l1Call = prisma.breakawayFee.create.mock.calls.find(
      ([args]) => args.data.level === 1
    );
    expect(l1Call).toBeTruthy();
    expect(l1Call[0].data.amount).toBe(300000); // 10M * 3%
    expect(l1Call[0].data.toUserId).toBe(20);
  });

  test('skips fees when no revenue', async () => {
    const breakawayAt = new Date('2024-01-01');
    const expireAt = new Date('2025-01-01');

    prisma.breakawayFee.deleteMany.mockResolvedValue({});
    prisma.breakawayLog.updateMany.mockResolvedValue({});
    prisma.breakawayLog.findMany.mockResolvedValue([{
      id: 1,
      userId: 10,
      oldParentId: 20,
      newParentId: 30,
      breakawayAt,
      expireAt,
      status: 'ACTIVE',
    }]);
    prisma.user.findFirst.mockResolvedValue({ id: 99, rank: 'GDKD' });
    prisma.user.findMany.mockResolvedValue([]);
    prisma.transaction.findMany.mockResolvedValue([]); // zero revenue

    const result = await processMonthlyBreakawayFees(MONTH);
    expect(result.created).toBe(0);
  });
});

// ---------- getReceivedBreakawayFeesSummary ----------
describe('getReceivedBreakawayFeesSummary', () => {
  test('sums fees by level correctly', async () => {
    prisma.breakawayFee.findMany.mockResolvedValue([
      { level: 1, amount: '300000' },
      { level: 2, amount: '200000' },
      { level: 3, amount: '100000' },
    ]);

    const result = await getReceivedBreakawayFeesSummary(1, '2024-01');
    expect(result.level1).toBe(300000);
    expect(result.level2).toBe(200000);
    expect(result.level3).toBe(100000);
    expect(result.total).toBe(600000);
  });

  test('returns zeros when no fees', async () => {
    prisma.breakawayFee.findMany.mockResolvedValue([]);

    const result = await getReceivedBreakawayFeesSummary(1, '2024-01');
    expect(result.total).toBe(0);
  });
});
