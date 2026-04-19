const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');

// V13.3: Thanh khoản — khóa 30% trên mỗi phiếu nạp
const RESERVE_RATE = 0.30;
const AVAILABLE_RATE = 1 - RESERVE_RATE;

async function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = 'CCB_';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    const existing = await prisma.memberWallet.findUnique({ where: { referralCode: code } });
    if (!existing) return code;
  }
  throw new Error('Failed to generate unique referral code');
}

async function determineTier(depositAmount) {
  const tiers = await prisma.membershipTier.findMany({ orderBy: { minDeposit: 'desc' } });
  for (const tier of tiers) {
    if (depositAmount >= Number(tier.minDeposit)) return tier;
  }
  return tiers[tiers.length - 1];
}

async function registerMember({ email, password, name, phone, depositAmount = 0, referralCode }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('Email da duoc su dung');

  let referrerWallet = null;
  if (referralCode) {
    referrerWallet = await prisma.memberWallet.findUnique({ where: { referralCode } });
    if (!referrerWallet) throw new Error('Ma gioi thieu khong hop le');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const tier = await determineTier(depositAmount);
  const myReferralCode = await generateReferralCode();

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, passwordHash, role: 'member', name, phone, isMember: true },
    });

    const wallet = await tx.memberWallet.create({
      data: {
        userId: user.id,
        tierId: tier.id,
        balance: 0,
        availableBalance: 0,
        reserveBalance: 0,
        totalDeposited: 0,
        referralCode: myReferralCode,
        referredById: referrerWallet?.id || null,
      },
    });

    let deposit = null;
    if (depositAmount > 0) {
      deposit = await tx.depositHistory.create({
        data: {
          walletId: wallet.id,
          amount: depositAmount,
          method: 'bank_transfer',
          status: 'PENDING',
        },
      });
    }

    return { user, wallet, deposit };
  });

  return {
    userId: result.user.id,
    walletId: result.wallet.id,
    referralCode: myReferralCode,
    tier: tier.name,
    depositId: result.deposit?.id || null,
  };
}

async function processReferralCommission(walletId, depositAmount) {
  const wallet = await prisma.memberWallet.findUnique({
    where: { id: walletId },
    include: { referredBy: { include: { tier: true } } },
  });

  if (!wallet?.referredBy) return null;

  const referrer = wallet.referredBy;
  const rate = Number(referrer.tier?.referralPct) || 0;
  const cap = Number(referrer.tier?.monthlyReferralCap) || 0;

  if (rate <= 0 || cap <= 0) return null;

  const commission = depositAmount * rate;
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Fast-path check to avoid unnecessary transaction overhead
  const preRemaining = cap - (Number(referrer.monthlyReferralEarned) || 0);
  if (preRemaining <= 0) return null;

  const result = await prisma.$transaction(async (tx) => {
    const freshReferrer = await tx.memberWallet.findUnique({
      where: { id: referrer.id },
      select: { monthlyReferralEarned: true },
    });
    const remaining = cap - (Number(freshReferrer?.monthlyReferralEarned) || 0);
    if (remaining <= 0) return null;

    const actualCommission = Math.min(commission, remaining);

    const commissionRecord = await tx.referralCommission.create({
      data: { earnerWalletId: referrer.id, sourceWalletId: walletId, amount: actualCommission, ratePct: rate, month },
    });
    await tx.memberWallet.update({
      where: { id: referrer.id },
      data: {
        balance: { increment: actualCommission },
        availableBalance: { increment: actualCommission },
        referralEarned: { increment: actualCommission },
        monthlyReferralEarned: { increment: actualCommission },
      },
    });
    return { commissionId: commissionRecord.id, amount: actualCommission, referrerId: referrer.id };
  }, { isolationLevel: 'Serializable' });

  return result;
}

async function confirmDeposit(depositId, adminId) {
  const deposit = await prisma.depositHistory.findUnique({
    where: { id: depositId },
    include: { wallet: true },
  });
  if (!deposit) throw new Error('Phieu nap tien khong ton tai');
  if (deposit.status !== 'PENDING') throw new Error('Phieu nap tien khong o trang thai PENDING');

  // V13.3: split 70/30 vào available/reserve
  const availableAdd = Math.floor(Number(deposit.amount) * AVAILABLE_RATE);
  const reserveAdd = Number(deposit.amount) - availableAdd;

  await prisma.depositHistory.update({
    where: { id: depositId },
    data: { status: 'CONFIRMED', confirmedBy: adminId, confirmedAt: new Date() },
  });

  const wallet = await prisma.memberWallet.update({
    where: { id: deposit.walletId },
    data: {
      balance: { increment: deposit.amount },
      availableBalance: { increment: availableAdd },
      reserveBalance: { increment: reserveAdd },
      totalDeposited: { increment: deposit.amount },
    },
  });

  const newTier = await determineTier(wallet.totalDeposited);
  if (newTier.id !== wallet.tierId) {
    await prisma.memberWallet.update({
      where: { id: wallet.id },
      data: { tierId: newTier.id },
    });
  }

  const referralResult = await processReferralCommission(wallet.id, Number(deposit.amount));

  return {
    walletId: wallet.id,
    depositAmount: deposit.amount,
    availableAdded: availableAdd,
    reserveAdded: reserveAdd,
    newBalance: wallet.balance,
    referralResult,
  };
}

async function rejectDeposit(depositId, adminId, reason) {
  const deposit = await prisma.depositHistory.findUnique({ where: { id: depositId } });
  if (!deposit) throw new Error('Phieu nap tien khong ton tai');
  if (deposit.status !== 'PENDING') throw new Error('Phieu nap tien khong o trang thai PENDING');

  await prisma.depositHistory.update({
    where: { id: depositId },
    data: { status: 'REJECTED', confirmedBy: adminId, confirmedAt: new Date(), notes: reason },
  });
}

async function getWalletDetails(userId) {
  const wallet = await prisma.memberWallet.findUnique({
    where: { userId },
    include: {
      tier: true,
      referredBy: { select: { referralCode: true, user: { select: { name: true } } } },
      _count: { select: { referrals: true } },
    },
  });
  if (!wallet) throw new Error('Khong tim thay vi');
  return wallet;
}

async function getReferralStats(userId) {
  const wallet = await prisma.memberWallet.findUnique({
    where: { userId },
    include: {
      tier: true,
      referrals: {
        include: {
          user: { select: { name: true, createdAt: true } },
          tier: { select: { name: true } },
        },
      },
    },
  });
  if (!wallet) throw new Error('Khong tim thay vi');

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const monthlyCommissions = await prisma.referralCommission.findMany({
    where: { earnerWalletId: wallet.id, month },
  });

  const earnedThisMonth = monthlyCommissions.reduce((s, c) => s + Number(c.amount), 0);
  const cap = Number(wallet.tier?.monthlyReferralCap) || 0;
  const capRemaining = Math.max(0, cap - earnedThisMonth);

  return {
    referralCode: wallet.referralCode,
    totalReferrals: wallet.referrals.length,
    referrals: wallet.referrals.map(r => ({
      name: r.user.name,
      tier: r.tier?.name || null,
      joinedAt: r.user.createdAt,
    })),
    totalEarned: wallet.referralEarned,
    earnedThisMonth,
    monthlyReferralCap: cap,
    capRemaining,
    referralPct: wallet.tier?.referralPct || 0,
  };
}

module.exports = {
  RESERVE_RATE,
  AVAILABLE_RATE,
  generateReferralCode,
  determineTier,
  registerMember,
  processReferralCommission,
  confirmDeposit,
  rejectDeposit,
  getWalletDetails,
  getReferralStats,
};
