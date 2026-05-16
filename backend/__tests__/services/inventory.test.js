/**
 * Unit tests for inventory.js
 * Spec: docs/specs/01_PRODUCT_M0.md §7 acceptance
 */

jest.mock('../../src/lib/prisma', () => ({
  inventoryBatch: {
    findMany: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  transactionItem: {
    findMany: jest.fn(),
  },
}));

const prisma = require('../../src/lib/prisma');
const { allocateBatch, restoreTransactionBatches, receiveBatch } = require('../../src/services/inventory');

describe('inventory.allocateBatch', () => {
  let mockTx;

  beforeEach(() => {
    mockTx = {
      inventoryBatch: {
        findMany: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };
  });

  test('FIFO: earliest exp date allocated first', async () => {
    mockTx.inventoryBatch.findMany.mockResolvedValue([
      { id: 10, qtyAvailable: 50, costPerUnit: 100, expDate: new Date('2026-06-01') },
      { id: 11, qtyAvailable: 50, costPerUnit: 110, expDate: new Date('2026-12-01') },
    ]);
    const allocs = await allocateBatch(mockTx, 1, 30, null);
    expect(allocs).toEqual([{ batchId: 10, qty: 30, costPerUnit: 100 }]);
    expect(mockTx.inventoryBatch.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { qtyAvailable: 20, status: 'ACTIVE' },
    });
  });

  test('spans multiple batches when first depletes', async () => {
    mockTx.inventoryBatch.findMany.mockResolvedValue([
      { id: 10, qtyAvailable: 30, costPerUnit: 100, expDate: new Date('2026-06-01') },
      { id: 11, qtyAvailable: 50, costPerUnit: 110, expDate: new Date('2026-12-01') },
    ]);
    const allocs = await allocateBatch(mockTx, 1, 60, null);
    expect(allocs).toEqual([
      { batchId: 10, qty: 30, costPerUnit: 100 },
      { batchId: 11, qty: 30, costPerUnit: 110 },
    ]);
    expect(mockTx.inventoryBatch.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { qtyAvailable: 0, status: 'DEPLETED' },
    });
    expect(mockTx.inventoryBatch.update).toHaveBeenCalledWith({
      where: { id: 11 },
      data: { qtyAvailable: 20, status: 'ACTIVE' },
    });
  });

  test('throws on insufficient stock', async () => {
    mockTx.inventoryBatch.findMany.mockResolvedValue([
      { id: 10, qtyAvailable: 5, costPerUnit: 100, expDate: new Date('2026-06-01') },
    ]);
    await expect(allocateBatch(mockTx, 1, 10, null)).rejects.toThrow(/Insufficient stock/);
  });

  test('throws on quantity <= 0', async () => {
    await expect(allocateBatch(mockTx, 1, 0, null)).rejects.toThrow(/Quantity must be > 0/);
    await expect(allocateBatch(mockTx, 1, -5, null)).rejects.toThrow(/Quantity must be > 0/);
  });

  test('agencyId is honored in query', async () => {
    mockTx.inventoryBatch.findMany.mockResolvedValue([
      { id: 99, qtyAvailable: 100, costPerUnit: 200, expDate: new Date('2027-01-01') },
    ]);
    await allocateBatch(mockTx, 5, 1, 42);
    expect(mockTx.inventoryBatch.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ agencyId: 42 }),
    }));
  });
});

describe('inventory.restoreTransactionBatches', () => {
  let mockTx;
  beforeEach(() => {
    mockTx = {
      transactionItem: { findMany: jest.fn() },
      inventoryBatch: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };
  });

  test('increments qtyAvailable + flips DEPLETED to ACTIVE', async () => {
    mockTx.transactionItem.findMany.mockResolvedValue([
      { batchId: 10, quantity: 5 },
    ]);
    mockTx.inventoryBatch.findUnique.mockResolvedValue({
      id: 10, qtyAvailable: 0, status: 'DEPLETED',
    });
    await restoreTransactionBatches(mockTx, 1);
    expect(mockTx.inventoryBatch.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { qtyAvailable: 5, status: 'ACTIVE' },
    });
  });

  test('keeps status ACTIVE if not depleted', async () => {
    mockTx.transactionItem.findMany.mockResolvedValue([
      { batchId: 10, quantity: 5 },
    ]);
    mockTx.inventoryBatch.findUnique.mockResolvedValue({
      id: 10, qtyAvailable: 10, status: 'ACTIVE',
    });
    await restoreTransactionBatches(mockTx, 1);
    expect(mockTx.inventoryBatch.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { qtyAvailable: 15, status: 'ACTIVE' },
    });
  });

  test('skips items with null batchId (legacy combo)', async () => {
    mockTx.transactionItem.findMany.mockResolvedValue([]);
    await restoreTransactionBatches(mockTx, 1);
    expect(mockTx.inventoryBatch.update).not.toHaveBeenCalled();
  });
});

describe('inventory.receiveBatch', () => {
  beforeEach(() => {
    prisma.inventoryBatch.create.mockReset();
  });

  test('creates ACTIVE batch with qtyAvailable = qtyReceived', async () => {
    prisma.inventoryBatch.create.mockResolvedValue({ id: 1 });
    await receiveBatch({
      variantId: 1, batchNo: 'B001', qtyReceived: 100,
      costPerUnit: 50000, supplierId: 5,
    });
    expect(prisma.inventoryBatch.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        variantId: 1, batchNo: 'B001',
        qtyReceived: 100, qtyAvailable: 100,
        costPerUnit: 50000, supplierId: 5,
        status: 'ACTIVE',
      }),
    });
  });

  test('throws on qtyReceived <= 0', async () => {
    await expect(receiveBatch({ variantId: 1, batchNo: 'B', qtyReceived: 0, costPerUnit: 1 }))
      .rejects.toThrow(/qtyReceived must be > 0/);
  });
});
