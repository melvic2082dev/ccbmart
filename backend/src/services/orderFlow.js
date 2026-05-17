/**
 * v3.3 Order flow state machine.
 *
 * Single source of truth for which status transitions are allowed and which
 * actor role can perform them. Every transition runs in a $transaction so the
 * Transaction.status update and the TransactionStatusLog insert are atomic.
 *
 * See docs/specs/04_OPERATIONAL_FLOW_V3_3.md §3 for the diagram.
 */

const prisma = require('../lib/prisma');
const crypto = require('crypto');

// ---------- statuses ----------

const Status = Object.freeze({
  // v3.3
  DRAFT:               'DRAFT',
  INVENTORY_PENDING:   'INVENTORY_PENDING',
  INVENTORY_REJECTED:  'INVENTORY_REJECTED',
  AWAITING_PAYMENT:    'AWAITING_PAYMENT',
  PAID:                'PAID',
  PACKING:             'PACKING',
  AWAITING_PICKUP:     'AWAITING_PICKUP',
  PICKED_UP:           'PICKED_UP',
  DELIVERING:          'DELIVERING',
  DELIVERED:           'DELIVERED',
  CANCELLED:           'CANCELLED',
  // Legacy (pre-v3.3) — still supported
  PENDING:             'PENDING',
  CONFIRMED:           'CONFIRMED',
  REJECTED:            'REJECTED',
});

// Roles allowed to drive each transition. 'admin' (+ 'super_admin') can always.
const ALLOWED = {
  // from → { to: [roles] }
  DRAFT: {
    INVENTORY_PENDING: ['system', 'ctv'],
    CANCELLED:         ['ctv'],
  },
  INVENTORY_PENDING: {
    AWAITING_PAYMENT:   ['warehouse_staff'],
    INVENTORY_REJECTED: ['warehouse_staff'],
    CANCELLED:          ['ctv'],
  },
  AWAITING_PAYMENT: {
    PAID:      ['system', 'admin', 'super_admin'],
    CANCELLED: ['ctv', 'admin'],
  },
  PAID: {
    PACKING: ['warehouse_staff', 'system'],
  },
  PACKING: {
    AWAITING_PICKUP: ['warehouse_staff'],
  },
  AWAITING_PICKUP: {
    PICKED_UP: ['ctv'],
  },
  PICKED_UP: {
    DELIVERING: ['ctv'],
  },
  DELIVERING: {
    DELIVERED: ['ctv', 'system'],
  },
};

// Status → timestamp column to stamp when we land on it.
const STAMP_ON_ARRIVAL = {
  DRAFT:               'draftedAt',
  INVENTORY_PENDING:   null,
  AWAITING_PAYMENT:    'inventoryConfirmedAt',
  PAID:                'paidAt',
  PACKING:             'packingStartedAt',
  AWAITING_PICKUP:     'packedAt',
  PICKED_UP:           'pickedUpAt',
  DELIVERING:          null,
  DELIVERED:           'deliveredAt',
  CANCELLED:           'cancelledAt',
};

function isAllowed(from, to, role) {
  // Admin override
  if (role === 'admin' || role === 'super_admin') {
    return Boolean(ALLOWED[from] && ALLOWED[from][to]);
  }
  const allowed = ALLOWED[from] && ALLOWED[from][to];
  return Array.isArray(allowed) && allowed.includes(role);
}

function generatePickupCode() {
  // 12-char base32-ish — easy to scan, hard to guess
  return crypto.randomBytes(8).toString('base64url').slice(0, 12).toUpperCase();
}

/**
 * Atomically transition a transaction to a new status.
 *
 * @param {number} txId
 * @param {string} toStatus   one of Status.*
 * @param {object} opts
 * @param {number} opts.actorId
 * @param {string} opts.actorRole
 * @param {string} [opts.note]
 * @param {object} [opts.data]  extra fields to write on Transaction
 *                               (e.g. { inventoryRejectedReason: '...' })
 * @returns {Promise<Transaction>}
 */
async function applyTransition(txId, toStatus, opts) {
  const { actorId, actorRole, note, data = {} } = opts;
  if (!actorRole) throw new Error('actorRole is required for status transition');

  return prisma.$transaction(async (tx) => {
    const current = await tx.transaction.findUnique({ where: { id: txId } });
    if (!current) throw new Error(`Transaction ${txId} not found`);
    const fromStatus = current.status;

    if (!isAllowed(fromStatus, toStatus, actorRole)) {
      const err = new Error(
        `Transition ${fromStatus} → ${toStatus} not allowed for role '${actorRole}'`
      );
      err.code = 'INVALID_TRANSITION';
      err.from = fromStatus;
      err.to = toStatus;
      throw err;
    }

    const updateData = { status: toStatus, ...data };

    // Auto-stamp the canonical arrival timestamp if not provided
    const stampCol = STAMP_ON_ARRIVAL[toStatus];
    if (stampCol && !(stampCol in data)) {
      updateData[stampCol] = new Date();
    }

    // Track actor for certain transitions
    if (toStatus === Status.AWAITING_PAYMENT) {
      updateData.inventoryConfirmedBy = actorId;
    } else if (toStatus === Status.AWAITING_PICKUP) {
      updateData.packedBy = actorId;
      if (!current.pickupCode) {
        updateData.pickupCode = generatePickupCode();
      }
    } else if (toStatus === Status.CANCELLED) {
      updateData.cancelledBy = actorId;
    }

    const updated = await tx.transaction.update({
      where: { id: txId },
      data: updateData,
    });

    await tx.transactionStatusLog.create({
      data: {
        transactionId: txId,
        fromStatus,
        toStatus,
        actorId: actorId || null,
        actorRole,
        note: note || null,
      },
    });

    return updated;
  });
}

/**
 * Is this transaction commissionable per v3.3 rules?
 *  - New flow: DELIVERED AND (OTP verified OR signature uploaded)
 *  - Legacy:   CONFIRMED (pre-v3.3 imports)
 */
function isCommissionable(tx) {
  if (tx.status === Status.CONFIRMED) return true;
  if (tx.status === Status.DELIVERED) {
    return Boolean(tx.deliveryOtpVerifiedAt || tx.deliverySignatureUrl);
  }
  return false;
}

/**
 * Prisma `where` clause matching commissionable transactions.
 * Use in routes/services that aggregate commission/sales.
 */
const COMMISSIONABLE_WHERE = {
  OR: [
    { status: Status.CONFIRMED }, // legacy
    {
      status: Status.DELIVERED,
      OR: [
        { deliveryOtpVerifiedAt: { not: null } },
        { deliverySignatureUrl:  { not: null } },
      ],
    },
  ],
};

module.exports = {
  Status,
  ALLOWED,
  isAllowed,
  applyTransition,
  generatePickupCode,
  isCommissionable,
  COMMISSIONABLE_WHERE,
};
