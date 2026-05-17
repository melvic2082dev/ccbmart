/**
 * Inventory service — FIFO batch allocation for variant-based transactions.
 * Spec: docs/specs/01_PRODUCT_M0.md §4.2.1
 */

const prisma = require('../lib/prisma');

/**
 * Allocate `quantity` units of `variantId` from available batches using FIFO
 * (earliest expiry first, then earliest received). Decrements `qtyAvailable`
 * atomically. Marks batch DEPLETED when it reaches zero.
 *
 * Returns an array of allocations: [{ batchId, qty, costPerUnit }]
 * Throws if insufficient stock.
 *
 * MUST be called inside a prisma.$transaction context to keep allocation +
 * transaction-item creation atomic.
 *
 * @param {object} tx - prisma transaction client (or root prisma for ad-hoc)
 * @param {number} variantId
 * @param {number} quantity
 * @param {number|null} agencyId - if set, allocate only from this agency's batches; null = trung tâm
 */
async function allocateBatch(tx, variantId, quantity, agencyId = null) {
  if (quantity <= 0) throw new Error(`Quantity must be > 0, got ${quantity}`);

  // Find active batches with availability, ordered by FIFO (expiry asc, received asc)
  const batches = await tx.inventoryBatch.findMany({
    where: {
      variantId,
      agencyId,
      status: 'ACTIVE',
      qtyAvailable: { gt: 0 },
    },
    orderBy: [
      { expDate: 'asc' },
      { receivedAt: 'asc' },
    ],
  });

  const allocations = [];
  let remaining = quantity;

  for (const b of batches) {
    if (remaining <= 0) break;
    const take = Math.min(b.qtyAvailable, remaining);
    const newAvail = b.qtyAvailable - take;
    const newStatus = newAvail === 0 ? 'DEPLETED' : 'ACTIVE';

    await tx.inventoryBatch.update({
      where: { id: b.id },
      data: { qtyAvailable: newAvail, status: newStatus },
    });

    allocations.push({
      batchId: b.id,
      qty: take,
      costPerUnit: b.costPerUnit,
    });
    remaining -= take;
  }

  if (remaining > 0) {
    throw new Error(
      `Insufficient stock for variant ${variantId} (short ${remaining} units, agency=${agencyId})`,
    );
  }

  return allocations;
}

/**
 * Restore batch quantities when a transaction is rejected/cancelled.
 * Iterates transaction items, increments back qtyAvailable on referenced batches,
 * flips DEPLETED → ACTIVE if needed.
 *
 * @param {object} tx - prisma transaction client
 * @param {number} transactionId
 */
async function restoreTransactionBatches(tx, transactionId) {
  const items = await tx.transactionItem.findMany({
    where: { transactionId, batchId: { not: null } },
  });

  for (const it of items) {
    const batch = await tx.inventoryBatch.findUnique({ where: { id: it.batchId } });
    if (!batch) continue;
    const newAvail = batch.qtyAvailable + it.quantity;
    const newStatus = batch.status === 'DEPLETED' && newAvail > 0 ? 'ACTIVE' : batch.status;
    await tx.inventoryBatch.update({
      where: { id: batch.id },
      data: { qtyAvailable: newAvail, status: newStatus },
    });
  }
}

/**
 * Receive a new batch of a variant (admin action).
 * @param {object} params
 * @param {number} params.variantId
 * @param {string} params.batchNo - unique per variant
 * @param {number} params.qtyReceived
 * @param {number} params.costPerUnit
 * @param {Date|null} params.mfgDate
 * @param {Date|null} params.expDate
 * @param {number|null} params.supplierId
 * @param {number|null} params.agencyId
 * @param {string|null} params.notes
 */
async function receiveBatch(params) {
  const { variantId, batchNo, qtyReceived, costPerUnit, mfgDate, expDate, supplierId, agencyId, notes } = params;
  if (qtyReceived <= 0) throw new Error('qtyReceived must be > 0');

  return prisma.inventoryBatch.create({
    data: {
      variantId,
      batchNo,
      qtyReceived,
      qtyAvailable: qtyReceived,
      costPerUnit,
      mfgDate: mfgDate || null,
      expDate: expDate || null,
      supplierId: supplierId || null,
      agencyId: agencyId || null,
      notes: notes || null,
      status: 'ACTIVE',
    },
  });
}

/**
 * List batches expiring within `daysAhead` days.
 */
async function expiringBatches(daysAhead = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + daysAhead);
  return prisma.inventoryBatch.findMany({
    where: {
      status: 'ACTIVE',
      qtyAvailable: { gt: 0 },
      expDate: { lte: cutoff, not: null },
    },
    orderBy: { expDate: 'asc' },
    include: {
      variant: {
        include: {
          product: {
            include: { warehouse: { select: { id: true, code: true, name: true } } },
          },
        },
      },
      supplier: { select: { id: true, name: true } },
    },
  });
}

module.exports = {
  allocateBatch,
  restoreTransactionBatches,
  receiveBatch,
  expiringBatches,
};
