/**
 * Build a comprehensive Prisma mock object for unit tests.
 * Each method is a jest.fn() that can be configured per test.
 */
function buildPrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      aggregate: jest.fn(),
    },
    transaction: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    breakawayFee: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    breakawayLog: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    b2BContract: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    businessHousehold: {
      upsert: jest.fn(),
    },
    managementFee: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    trainingLog: {
      findMany: jest.fn(),
    },
    feeConfig: {
      findMany: jest.fn(),
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
      findMany: jest.fn(),
    },
    referralCommission: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(async (fnOrArray) => {
      if (typeof fnOrArray === 'function') {
        return fnOrArray(this);
      }
      return Promise.all(fnOrArray);
    }),
  };
}

module.exports = { buildPrismaMock };
