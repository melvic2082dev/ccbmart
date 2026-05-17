const prisma = require('../lib/prisma');

/**
 * V12.2: OTP for training log confirmation.
 * OTP is a 6-digit code valid for 10 minutes, sent to the trainee to prove
 * the session really took place before the log moves to VERIFIED.
 */

const OTP_TTL_MINUTES = 10;

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Generate and persist an OTP for a training log.
 */
async function generateOTP(trainingLogId) {
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.trainingLog.update({
    where: { id: trainingLogId },
    data: { otpCode: code, otpExpiresAt: expiresAt },
  });

  // In production: send OTP via SMS/Zalo to the trainee. Do not expose OTP in response.
  return { trainingLogId, message: 'OTP sent', expiresAt };
}

/**
 * Verify the OTP submitted by the trainee.
 * On success the training log is marked menteeConfirmed=true and status=VERIFIED.
 */
const OTP_MAX_FAIL = 5;

async function verifyOTP(trainingLogId, submittedCode) {
  const log = await prisma.trainingLog.findUnique({ where: { id: trainingLogId } });
  if (!log) throw new Error('Training log not found');
  if (!log.otpCode) throw new Error('No OTP issued for this log');

  if (log.otpBlockedUntil && new Date() < log.otpBlockedUntil) {
    throw new Error('OTP bị khóa do nhập sai quá nhiều lần. Vui lòng thử lại sau.');
  }

  if (log.otpExpiresAt && new Date() > log.otpExpiresAt) {
    throw new Error('OTP đã hết hạn');
  }

  if (log.otpCode !== submittedCode) {
    const newFailCount = (log.otpFailCount || 0) + 1;
    const blocked = newFailCount >= OTP_MAX_FAIL;
    await prisma.trainingLog.update({
      where: { id: trainingLogId },
      data: {
        otpFailCount: newFailCount,
        ...(blocked ? { otpBlockedUntil: new Date(Date.now() + 30 * 60 * 1000) } : {}),
      },
    });
    throw new Error(blocked ? 'OTP bị khóa do nhập sai quá nhiều lần' : 'OTP không chính xác');
  }

  return prisma.trainingLog.update({
    where: { id: trainingLogId },
    data: {
      menteeConfirmed: true,
      status: 'VERIFIED',
      verifiedAt: new Date(),
      otpCode: null,
      otpExpiresAt: null,
      otpFailCount: 0,
      otpBlockedUntil: null,
    },
  });
}

// ============================================================
// v3.3: Delivery OTP for Transactions
// ============================================================

const crypto = require('crypto');
const logger = require('./logger');

const DELIVERY_OTP_TTL_MINUTES = 10;
const DELIVERY_OTP_MAX_FAIL = 5;
const DELIVERY_OTP_BLOCK_MINUTES = 30;
const OTP_SALT = process.env.OTP_SALT || 'ccbmart-dev-salt-please-rotate';

function hashOTP(code) {
  return crypto.createHash('sha256').update(OTP_SALT + ':' + code).digest('hex');
}

/**
 * Generate a 6-digit delivery OTP for a transaction, store its hash, and
 * (in production) send via SMS/Zalo to the customer phone. In dev we log
 * the plaintext code so the developer can test the flow.
 */
async function generateDeliveryOTP(transactionId) {
  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { customer: { select: { phone: true, name: true } } },
  });
  if (!tx) throw new Error('Transaction not found');
  if (tx.status !== 'DELIVERING') {
    throw new Error(`Cannot send OTP — transaction status is ${tx.status}, expected DELIVERING`);
  }

  if (tx.deliveryOtpBlockedUntil && new Date() < tx.deliveryOtpBlockedUntil) {
    throw new Error('OTP bị khóa do nhập sai quá nhiều lần. Vui lòng thử lại sau.');
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const hash = hashOTP(code);

  await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      deliveryOtpHash: hash,
      deliveryOtpSentAt: new Date(),
      deliveryOtpAttempts: 0,
    },
  });

  // TODO: integrate SMS/Zalo provider (eSMS, Speedsms, Zalo Notification Service).
  // For now: log to console in dev so the developer/tester can read the code.
  if (process.env.NODE_ENV !== 'production') {
    logger.info(
      `[delivery-otp] tx=${transactionId} customer=${tx.customer?.phone || '?'} code=${code} (expires in ${DELIVERY_OTP_TTL_MINUTES}m)`
    );
  }

  return {
    transactionId,
    sentTo: tx.customer?.phone || null,
    expiresAt: new Date(Date.now() + DELIVERY_OTP_TTL_MINUTES * 60 * 1000),
    // Expose code in dev only (for automated tests / Postman); never in prod.
    devCode: process.env.NODE_ENV !== 'production' ? code : undefined,
  };
}

/**
 * Verify the delivery OTP submitted by the CTV (entered by the customer
 * verbally or via SMS). Caller is responsible for promoting the transaction
 * to DELIVERED on success (typically via orderFlow.applyTransition).
 */
async function verifyDeliveryOTP(transactionId, submittedCode) {
  const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!tx) throw new Error('Transaction not found');
  if (!tx.deliveryOtpHash) throw new Error('Chưa gửi OTP cho đơn này');

  if (tx.deliveryOtpBlockedUntil && new Date() < tx.deliveryOtpBlockedUntil) {
    throw new Error('OTP bị khóa do nhập sai quá nhiều lần. Vui lòng thử lại sau.');
  }

  if (tx.deliveryOtpSentAt) {
    const expiresAt = new Date(tx.deliveryOtpSentAt.getTime() + DELIVERY_OTP_TTL_MINUTES * 60 * 1000);
    if (new Date() > expiresAt) {
      throw new Error('OTP đã hết hạn — vui lòng gửi lại');
    }
  }

  const submittedHash = hashOTP(String(submittedCode).trim());
  if (submittedHash !== tx.deliveryOtpHash) {
    const newAttempts = (tx.deliveryOtpAttempts || 0) + 1;
    const blocked = newAttempts >= DELIVERY_OTP_MAX_FAIL;
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        deliveryOtpAttempts: newAttempts,
        ...(blocked
          ? { deliveryOtpBlockedUntil: new Date(Date.now() + DELIVERY_OTP_BLOCK_MINUTES * 60 * 1000) }
          : {}),
      },
    });
    throw new Error(
      blocked
        ? `OTP bị khóa ${DELIVERY_OTP_BLOCK_MINUTES} phút do nhập sai quá nhiều lần`
        : `OTP không chính xác (${DELIVERY_OTP_MAX_FAIL - newAttempts} lần thử còn lại)`
    );
  }

  // Success — mark verified. Caller will apply DELIVERING → DELIVERED transition.
  await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      deliveryOtpVerifiedAt: new Date(),
      deliveryOtpHash: null, // one-shot use
    },
  });

  return { transactionId, verified: true };
}

module.exports = {
  // legacy training OTP
  generateOTP,
  verifyOTP,
  OTP_TTL_MINUTES,
  // v3.3 delivery OTP
  generateDeliveryOTP,
  verifyDeliveryOTP,
  DELIVERY_OTP_TTL_MINUTES,
};
