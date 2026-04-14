const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * V12.2: Submit KYC documents for a user.
 */
async function submitKyc(userId, { idNumber, idFrontImage, idBackImage }) {
  if (!idNumber || !idFrontImage || !idBackImage) {
    throw new Error('idNumber, idFrontImage, idBackImage are required');
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      idNumber,
      idFrontImage,
      idBackImage,
      kycStatus: 'SUBMITTED',
      kycSubmittedAt: new Date(),
      kycRejectReason: null,
    },
    select: {
      id: true,
      name: true,
      kycStatus: true,
      kycSubmittedAt: true,
    },
  });
}

/**
 * V12.2: Get KYC status for a user.
 */
async function getKycStatus(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      kycStatus: true,
      kycSubmittedAt: true,
      kycVerifiedAt: true,
      kycRejectReason: true,
      idNumber: true,
      idFrontImage: true,
      idBackImage: true,
    },
  });
  if (!user) throw new Error('User not found');
  return user;
}

/**
 * V12.2: Admin verifies or rejects a KYC submission.
 */
async function verifyKyc(userId, { approved, reason }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  return prisma.user.update({
    where: { id: userId },
    data: {
      kycStatus: approved ? 'VERIFIED' : 'REJECTED',
      kycVerifiedAt: approved ? new Date() : null,
      kycRejectReason: approved ? null : (reason || 'Thông tin không hợp lệ'),
    },
    select: {
      id: true,
      name: true,
      kycStatus: true,
      kycVerifiedAt: true,
      kycRejectReason: true,
    },
  });
}

/**
 * V12.2: List all users pending KYC review.
 */
async function listPendingKyc() {
  return prisma.user.findMany({
    where: { kycStatus: 'SUBMITTED' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      rank: true,
      idNumber: true,
      idFrontImage: true,
      idBackImage: true,
      kycSubmittedAt: true,
    },
    orderBy: { kycSubmittedAt: 'asc' },
  });
}

module.exports = {
  submitKyc,
  getKycStatus,
  verifyKyc,
  listPendingKyc,
};
