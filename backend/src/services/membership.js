const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

/**
 * Generate unique referral code: CCB_XXXXXX
 */
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

/**
 * Determine membership tier based on deposit amount
 */
async function determineTier(depositAmount) {
  const tiers = await prisma.membershipTier.findMany({ orderBy: { minDeposit: 'desc' } });
  for (const tier of tiers) {
    if (depositAmount >= tier.minDeposit) return tier;
  }
  return tiers[tiers.length - 1]; // fallback to lowest tier
}

/**
 * Register a new member
 */
async function registerMember({ email, password, name, phone, depositAmount = 0, referralCode }) {
  // Check email not taken
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('Email da duoc su dung');

  // Validate referral code if provided
  let referrerWallet = null;
  if (referralCode) {
    referrerWallet = await prisma.memberWallet.findUnique({ where: { referralCode } });
    if (!referrerWallet) throw new Error('Ma gioi thieu khong hop le');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const tier = await determineTier(depositAmount);
  const myReferralCode = await generateReferralCode();

  // Create user + wallet in transaction
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, passwordHash, role: 'member', name, phone },
    });

    const wallet = await tx.memberWallet.create({
      data: {
        userId: user.id,
        tierId: tier.id,
        balance: 0,
        totalDeposit: 0,
        referralCode: myReferralCode,
        referredById: referrerWallet?.id || null,
      },
    });

    // Create initial deposit if amount > 0
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

/**
 * Process referral commission when a deposit is confirmed
 */
async function processReferralCommission(walletId, depositAmount) {
  const wallet = await prisma.memberWallet.findUnique({
    where: { id: walletId },
    include: { referredBy: { include: { tier: true } } },
  });

  if (!wallet?.referredBy) return null; // No referrer

  const referrer = wallet.referredBy;
  const rate = referrer.tier.referralPct;
  const cap = referrer.tier.monthlyReferralCap;

  if (rate <= 0 || cap <= 0) return null; // Tier doesn't support referral

  const commission = depositAmount * rate;
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Check monthly cap
  const remaining = cap - referrer.monthlyReferralEarned;
  if (remaining <= 0) return null; // Cap reached

  const actualCommission = Math.min(commission, remaining);

  // Create commission record + update referrer wallet
  const [commissionRecord] = await prisma.$transaction([
    prisma.referralCommission.create({
      data: {
        earnerWalletId: referrer.id,
        sourceWalletId: walletId,
        amount: actualCommission,
        ratePct: rate,
        month,
      },
    }),
    prisma.memberWallet.update({
      where: { id: referrer.id },
      data: {
        balance: { increment: actualCommission },
        referralEarned: { increment: actualCommission },
        monthlyReferralEarned: { increment: actualCommission },
      },
    }),
  ]);

  return { commissionId: commissionRecord.id, amount: actualCommission, referrerId: referrer.id };
}

/**
 * Confirm a member deposit
 */
async function confirmDeposit(depositId, adminId) {
  const deposit = await prisma.depositHistory.findUnique({
    where: { id: depositId },
    include: { wallet: true },
  });
  if (!deposit) throw new Error('Phieu nap tien khong ton tai');
  if (deposit.status !== 'PENDING') throw new Error('Phieu nap tien khong o trang thai PENDING');

  // Update deposit status
  await prisma.depositHistory.update({
    where: { id: depositId },
    data: { status: 'CONFIRMED', confirmedBy: adminId, confirmedAt: new Date() },
  });

  // Credit wallet + update total deposit
  const wallet = await prisma.memberWallet.update({
    where: { id: deposit.walletId },
    data: {
      balance: { increment: deposit.amount },
      totalDeposit: { increment: deposit.amount },
    },
  });

  // Check if tier should upgrade
  const newTier = await determineTier(wallet.totalDeposit);
  if (newTier.id !== wallet.tierId) {
    await prisma.memberWallet.update({
      where: { id: wallet.id },
      data: { tierId: newTier.id },
    });
  }

  // Process referral commission
  const referralResult = await processReferralCommission(wallet.id, deposit.amount);

  return { walletId: wallet.id, newBalance: wallet.balance + deposit.amount, referralResult };
}

/**
 * Reject a member deposit
 */
async function rejectDeposit(depositId, adminId, reason) {
  const deposit = await prisma.depositHistory.findUnique({ where: { id: depositId } });
  if (!deposit) throw new Error('Phieu nap tien khong ton tai');
  if (deposit.status !== 'PENDING') throw new Error('Phieu nap tien khong o trang thai PENDING');

  await prisma.depositHistory.update({
    where: { id: depositId },
    data: { status: 'REJECTED', confirmedBy: adminId, confirmedAt: new Date(), notes: reason },
  });
}

/**
 * Get wallet details for a member
 */
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

/**
 * Get referral statistics for a member
 */
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

  const earnedThisMonth = monthlyCommissions.reduce((s, c) => s + c.amount, 0);
  const capRemaining = Math.max(0, wallet.tier.monthlyReferralCap - earnedThisMonth);

  return {
    referralCode: wallet.referralCode,
    totalReferrals: wallet.referrals.length,
    referrals: wallet.referrals.map(r => ({
      name: r.user.name,
      tier: r.tier.name,
      joinedAt: r.user.createdAt,
    })),
    totalEarned: wallet.referralEarned,
    earnedThisMonth,
    monthlyReferralCap: wallet.tier.monthlyReferralCap,
    capRemaining,
    referralPct: wallet.tier.referralPct,
  };
}

module.exports = {
  generateReferralCode,
  determineTier,
  registerMember,
  processReferralCommission,
  confirmDeposit,
  rejectDeposit,
  getWalletDetails,
  getReferralStats,
};
