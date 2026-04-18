let idCounter = 1;
const nextId = () => idCounter++;

function createUser(overrides = {}) {
  return {
    id: nextId(),
    email: `user${nextId()}@test.com`,
    name: 'Test User',
    role: 'ctv',
    rank: 'CTV',
    parentId: null,
    isActive: true,
    isMember: false,
    isBusinessHousehold: false,
    passwordHash: '$2b$10$fakehash',
    phone: '0900000001',
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function createTransaction(overrides = {}) {
  return {
    id: nextId(),
    totalAmount: '1000000',
    ctvId: 1,
    channel: 'ctv',
    status: 'CONFIRMED',
    createdAt: new Date('2024-01-15'),
    ...overrides,
  };
}

function createMemberWallet(overrides = {}) {
  return {
    id: nextId(),
    userId: nextId(),
    balance: 0,
    availableBalance: 0,
    reserveBalance: 0,
    totalDeposited: 0,
    referralCode: 'CCB_ABCDE1',
    referredById: null,
    tierId: 1,
    referralEarned: 0,
    monthlyReferralEarned: 0,
    ...overrides,
  };
}

function createMembershipTier(overrides = {}) {
  return {
    id: nextId(),
    name: 'Basic',
    minDeposit: 0,
    discountPct: 0,
    referralPct: 0.01,
    monthlyReferralCap: 2000000,
    ...overrides,
  };
}

function createBreakawayLog(overrides = {}) {
  const now = new Date();
  const expireAt = new Date(now);
  expireAt.setMonth(expireAt.getMonth() + 12);
  return {
    id: nextId(),
    userId: nextId(),
    oldParentId: nextId(),
    newParentId: null,
    breakawayAt: now,
    expireAt,
    status: 'ACTIVE',
    ...overrides,
  };
}

function resetIdCounter() {
  idCounter = 1;
}

module.exports = {
  createUser,
  createTransaction,
  createMemberWallet,
  createMembershipTier,
  createBreakawayLog,
  resetIdCounter,
};
