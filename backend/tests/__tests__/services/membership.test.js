jest.mock('@prisma/client', () => {
  const instance = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    memberWallet: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    membershipTier: {
      findMany: jest.fn(),
    },
    depositHistory: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    referralCommission: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  return { PrismaClient: jest.fn(() => instance) };
});

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const {
  RESERVE_RATE,
  AVAILABLE_RATE,
  generateReferralCode,
  determineTier,
  registerMember,
  processReferralCommission,
  confirmDeposit,
} = require('../../../src/services/membership');

const BASIC_TIER = { id: 1, name: 'Basic', minDeposit: 0, referralPct: 0.01, monthlyReferralCap: 2000000 };
const SILVER_TIER = { id: 2, name: 'Silver', minDeposit: 5000000, referralPct: 0.02, monthlyReferralCap: 4000000 };

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------- Constants ----------
describe('constants', () => {
  test('RESERVE_RATE = 30%', () => {
    expect(RESERVE_RATE).toBe(0.30);
  });

  test('AVAILABLE_RATE = 70%', () => {
    expect(AVAILABLE_RATE).toBe(0.70);
  });
});

// ---------- generateReferralCode ----------
describe('generateReferralCode', () => {
  test('returns code matching CCB_[A-Z0-9]{6} format', async () => {
    prisma.memberWallet.findUnique.mockResolvedValue(null); // code is unique

    const code = await generateReferralCode();
    expect(code).toMatch(/^CCB_[A-Z0-9]{6}$/);
  });

  test('retries if code already exists', async () => {
    prisma.memberWallet.findUnique
      .mockResolvedValueOnce({ id: 1 }) // first attempt: code exists
      .mockResolvedValueOnce(null);      // second attempt: unique

    const code = await generateReferralCode();
    expect(code).toMatch(/^CCB_[A-Z0-9]{6}$/);
    expect(prisma.memberWallet.findUnique).toHaveBeenCalledTimes(2);
  });
});

// ---------- determineTier ----------
describe('determineTier', () => {
  test('returns lowest tier for zero deposit', async () => {
    prisma.membershipTier.findMany.mockResolvedValue([SILVER_TIER, BASIC_TIER]);

    const tier = await determineTier(0);
    expect(tier.id).toBe(1); // Basic
  });

  test('returns matching tier for deposit amount', async () => {
    prisma.membershipTier.findMany.mockResolvedValue([SILVER_TIER, BASIC_TIER]);

    const tier = await determineTier(5000000);
    expect(tier.id).toBe(2); // Silver
  });
});

// ---------- registerMember ----------
describe('registerMember', () => {
  function setupRegisterMocks() {
    prisma.user.findUnique.mockResolvedValue(null); // email not taken
    prisma.memberWallet.findUnique.mockResolvedValue(null); // referral code unique
    prisma.membershipTier.findMany.mockResolvedValue([BASIC_TIER]);

    const mockUser = { id: 1, email: 'test@test.com', role: 'member', name: 'Test', phone: '0900000001' };
    const mockWallet = { id: 1, userId: 1, referralCode: 'CCB_ABCDE1', tierId: 1 };

    prisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        user: { create: jest.fn().mockResolvedValue(mockUser) },
        memberWallet: { create: jest.fn().mockResolvedValue(mockWallet) },
        depositHistory: { create: jest.fn().mockResolvedValue({ id: 1 }) },
      };
      return fn(tx);
    });
  }

  test('creates user, wallet, and referral code', async () => {
    setupRegisterMocks();

    const result = await registerMember({
      email: 'test@test.com',
      password: 'password123',
      name: 'Test User',
      phone: '0900000001',
    });

    expect(result.userId).toBe(1);
    expect(result.walletId).toBe(1);
    expect(result.referralCode).toMatch(/^CCB_[A-Z0-9]{6}$/);
  });

  test('throws if email already exists', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, email: 'existing@test.com' });

    await expect(registerMember({
      email: 'existing@test.com',
      password: 'pass',
      name: 'Test',
      phone: '09000',
    })).rejects.toThrow('Email da duoc su dung');
  });

  test('throws if referral code is invalid', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.membershipTier.findMany.mockResolvedValue([BASIC_TIER]);
    prisma.memberWallet.findUnique
      .mockResolvedValueOnce(null) // referral code lookup: not found
      .mockResolvedValueOnce(null); // any further calls

    // findUnique for referralCode will return null (invalid)
    // But determineTier also calls membershipTier.findMany, not memberWallet
    prisma.memberWallet.findUnique.mockResolvedValue(null);

    await expect(registerMember({
      email: 'new@test.com',
      password: 'pass',
      name: 'Test',
      phone: '09000',
      referralCode: 'CCB_BADREF',
    })).rejects.toThrow('Ma gioi thieu khong hop le');
  });
});

// ---------- confirmDeposit ----------
describe('confirmDeposit', () => {
  test('splits deposit 70% available / 30% reserve', async () => {
    const depositAmount = 1000000;
    prisma.depositHistory.findUnique.mockResolvedValue({
      id: 1,
      amount: depositAmount,
      status: 'PENDING',
      walletId: 10,
      wallet: { id: 10 },
    });
    prisma.depositHistory.update.mockResolvedValue({});
    prisma.memberWallet.update.mockResolvedValue({
      id: 10,
      balance: depositAmount,
      availableBalance: 700000,
      reserveBalance: 300000,
      totalDeposited: depositAmount,
      tierId: 1,
    });
    prisma.membershipTier.findMany.mockResolvedValue([BASIC_TIER]);
    prisma.memberWallet.findUnique.mockResolvedValue(null); // no referrer

    const result = await confirmDeposit(1, 99);
    expect(result.availableAdded).toBe(700000);
    expect(result.reserveAdded).toBe(300000);
  });

  test('throws when deposit not found', async () => {
    prisma.depositHistory.findUnique.mockResolvedValue(null);
    await expect(confirmDeposit(999, 1)).rejects.toThrow('Phieu nap tien khong ton tai');
  });

  test('throws when deposit status is not PENDING', async () => {
    prisma.depositHistory.findUnique.mockResolvedValue({
      id: 1,
      amount: 1000000,
      status: 'CONFIRMED',
      walletId: 10,
    });
    await expect(confirmDeposit(1, 1)).rejects.toThrow('PENDING');
  });
});

// ---------- processReferralCommission ----------
describe('processReferralCommission', () => {
  test('returns null when no referrer', async () => {
    prisma.memberWallet.findUnique.mockResolvedValue({ id: 1, referredBy: null });

    const result = await processReferralCommission(1, 1000000);
    expect(result).toBeNull();
  });

  test('calculates commission and caps at monthly limit', async () => {
    prisma.memberWallet.findUnique.mockResolvedValue({
      id: 1,
      referredBy: {
        id: 2,
        tier: { referralPct: 0.01, monthlyReferralCap: 2000000 },
        monthlyReferralEarned: 0,
      },
    });

    prisma.$transaction.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const result = await processReferralCommission(1, 1000000);
    expect(result.amount).toBe(10000); // 1M * 1%
  });

  test('skips commission when monthly cap is already reached', async () => {
    prisma.memberWallet.findUnique.mockResolvedValue({
      id: 1,
      referredBy: {
        id: 2,
        tier: { referralPct: 0.01, monthlyReferralCap: 2000000 },
        monthlyReferralEarned: 2000000, // already at cap
      },
    });

    const result = await processReferralCommission(1, 1000000);
    expect(result).toBeNull();
  });
});
