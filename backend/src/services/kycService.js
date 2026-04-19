const prisma = require('../lib/prisma');

/**
 * V13.3: eKYC "3 duy nhất" — 1 CCCD = 1 thiết bị = 1 IP cho 1 user duy nhất.
 * Thực thi:
 *  - idNumber unique ở schema (Prisma @unique)
 *  - deviceId + ipAddress được lưu và validate trùng trên user khác
 */
async function submitKyc(userId, { idNumber, idFrontImage, idBackImage, deviceId, ipAddress }) {
  if (!idNumber || !idFrontImage || !idBackImage) {
    throw new Error('idNumber, idFrontImage, idBackImage are required');
  }
  if (!deviceId || !ipAddress) {
    throw new Error('deviceId va ipAddress bat buoc (V13.3 3 duy nhat)');
  }

  // 1) CCCD duy nhất — cấm trùng với user khác
  const cccdDup = await prisma.user.findFirst({
    where: { idNumber, NOT: { id: userId } },
    select: { id: true, email: true },
  });
  if (cccdDup) {
    throw new Error(`CCCD da duoc su dung boi user khac (userId=${cccdDup.id})`);
  }

  // 2) Thiết bị duy nhất — deviceId đã gán cho user khác thì từ chối
  const devDup = await prisma.user.findFirst({
    where: { kycDeviceId: deviceId, NOT: { id: userId } },
    select: { id: true },
  });
  if (devDup) {
    throw new Error(`Thiet bi da duoc dang ky boi user khac (userId=${devDup.id})`);
  }

  // 3) IP duy nhất — IP đã gắn cho user khác thì từ chối
  const ipDup = await prisma.user.findFirst({
    where: { kycIpAddress: ipAddress, NOT: { id: userId } },
    select: { id: true },
  });
  if (ipDup) {
    throw new Error(`IP da duoc su dung boi user khac (userId=${ipDup.id})`);
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      idNumber,
      idFrontImage,
      idBackImage,
      kycDeviceId: deviceId,
      kycIpAddress: ipAddress,
      kycStatus: 'SUBMITTED',
      kycSubmittedAt: new Date(),
      kycRejectReason: null,
    },
    select: {
      id: true,
      name: true,
      kycStatus: true,
      kycSubmittedAt: true,
      kycDeviceId: true,
      kycIpAddress: true,
    },
  });
}

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
      kycDeviceId: true,
      kycIpAddress: true,
    },
  });
  if (!user) throw new Error('User not found');
  return user;
}

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
      kycDeviceId: true,
      kycIpAddress: true,
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
