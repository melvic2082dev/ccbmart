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

module.exports = {
  generateOTP,
  verifyOTP,
  OTP_TTL_MINUTES,
};
