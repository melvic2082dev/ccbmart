const QRCode = require('qrcode');
const { invalidateCommissionCache } = require('./commission');
const { invalidateCache } = require('./cache');
const { createNotification, notifyAdmins } = require('./notification');

const prisma = require('../lib/prisma');

const BANK_ACCOUNT = {
  bankName: process.env.BANK_NAME || 'Vietcombank',
  accountNo: process.env.BANK_ACCOUNT_NO || '1903698888',
  accountName: process.env.BANK_ACCOUNT_NAME || 'CONG TY TNHH CCB MART',
};

const COMBO_PRICE = parseInt(process.env.COMBO_PRICE || '2000000', 10);
const COMBO_COGS_PCT = parseFloat(process.env.COMBO_COGS_PCT || '0.50');

/**
 * Generate VietQR-style content for bank transfer
 */
async function generateQRData(transactionId, amount) {
  const content = [
    `Ngan hang: ${BANK_ACCOUNT.bankName}`,
    `STK: ${BANK_ACCOUNT.accountNo}`,
    `Chu TK: ${BANK_ACCOUNT.accountName}`,
    `So tien: ${amount.toLocaleString('vi-VN')} VND`,
    `Noi dung: CCB TX${transactionId}`,
  ].join('\n');

  try {
    return await QRCode.toDataURL(content, { width: 300, margin: 2 });
  } catch {
    return null;
  }
}

/**
 * CTV creates a new transaction (sale)
 */
async function createCtvTransaction(ctvId, { customerId, customerName, customerPhone, paymentMethod, bankCode }) {
  // Validate CTV
  const ctv = await prisma.user.findUnique({ where: { id: ctvId } });
  if (!ctv || ctv.role !== 'ctv' || !ctv.isActive) {
    throw new Error('CTV khong hop le hoac da bi khoa');
  }

  // Self-referral guard: CTV không được tự bán cho chính mình
  // Check phone match against CTV's own phone to prevent hoa hồng self-deal
  if (customerPhone && ctv.phone && customerPhone === ctv.phone) {
    throw new Error('Khong the tu ban cho chinh minh — neu mua ca nhan, hay su dung tai khoan Thanh vien');
  }
  if (customerId) {
    const existingCustomer = await prisma.customer.findUnique({ where: { id: customerId } });
    // Block if this customer's phone matches CTV's phone (they ARE the CTV)
    if (existingCustomer && ctv.phone && existingCustomer.phone === ctv.phone) {
      throw new Error('Khach hang nay chinh la CTV — khong duoc tu ban cho chinh minh');
    }
  }

  // Find or create customer
  let customer;
  if (customerId) {
    customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new Error('Khach hang khong ton tai');
  } else if (customerName && customerPhone) {
    customer = await prisma.customer.findFirst({ where: { phone: customerPhone, ctvId } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: { name: customerName, phone: customerPhone, ctvId, firstPurchase: new Date() },
      });
    }
  } else {
    throw new Error('Can cung cap customerId hoac customerName + customerPhone');
  }

  const totalAmount = COMBO_PRICE;
  const cogsAmount = totalAmount * COMBO_COGS_PCT;

  // Create transaction
  const transaction = await prisma.transaction.create({
    data: {
      customerId: customer.id,
      ctvId,
      channel: 'ctv',
      totalAmount,
      cogsAmount,
      status: 'PENDING',
      paymentMethod: paymentMethod || 'bank_transfer',
      bankCode: bankCode || null,
      ctvSubmittedAt: new Date(),
    },
  });

  // Generate QR for bank transfer
  let qrCodeData = null;
  if (paymentMethod === 'bank_transfer') {
    qrCodeData = await generateQRData(transaction.id, totalAmount);
    if (qrCodeData) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { qrCodeData },
      });
    }
  }

  // Update customer totalSpent (will be finalized on confirm)
  // Notify admins
  await notifyAdmins(
    'NEW_TRANSACTION',
    `Giao dich moi #${transaction.id} tu CTV ${ctv.name}`,
    `Khach: ${customer.name}, So tien: ${totalAmount.toLocaleString('vi-VN')} VND, PT: ${paymentMethod}`,
    { transactionId: transaction.id, ctvId, customerId: customer.id }
  );

  return {
    transactionId: transaction.id,
    status: 'PENDING',
    totalAmount,
    paymentMethod,
    qrCodeData,
    bankAccount: paymentMethod === 'bank_transfer' ? BANK_ACCOUNT : null,
    transferContent: `CCB TX${transaction.id}`,
  };
}

/**
 * Upload payment proof for a transaction
 */
async function uploadPaymentProof(transactionId, ctvId, imageUrl, notes) {
  const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!tx) throw new Error('Giao dich khong ton tai');
  if (tx.ctvId !== ctvId) throw new Error('Khong co quyen truy cap giao dich nay');
  if (tx.status !== 'PENDING') throw new Error('Giao dich khong o trang thai PENDING');

  const proof = await prisma.paymentProof.upsert({
    where: { transactionId },
    create: { transactionId, imageUrl, uploadedBy: ctvId, notes },
    update: { imageUrl, notes, uploadedAt: new Date() },
  });

  return proof;
}

/**
 * Admin confirms a transaction
 */
async function confirmTransaction(transactionId, adminId, notes) {
  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { customer: true },
  });
  if (!tx) throw new Error('Giao dich khong ton tai');
  if (tx.status !== 'PENDING') throw new Error('Giao dich khong o trang thai PENDING');

  // Atomic: only updates if still PENDING, prevents double-confirm race condition
  const result = await prisma.transaction.updateMany({
    where: { id: transactionId, status: 'PENDING' },
    data: {
      status: 'CONFIRMED',
      confirmedBy: adminId,
      confirmedAt: new Date(),
    },
  });
  if (result.count === 0) throw new Error('Giao dich da duoc xu ly boi admin khac');

  const updated = { ...tx, status: 'CONFIRMED', confirmedBy: adminId, confirmedAt: new Date() };

  // Update customer totalSpent
  if (tx.customerId) {
    await prisma.customer.update({
      where: { id: tx.customerId },
      data: { totalSpent: { increment: tx.totalAmount } },
    });
  }

  // Invalidate caches
  if (tx.ctvId) {
    invalidateCommissionCache(tx.ctvId);
    await invalidateCache(`ctv:dashboard:${tx.ctvId}:*`);
  }
  await invalidateCache('admin:dashboard:*');
  await invalidateCache('admin:reports:*');

  // Notify CTV
  if (tx.ctvId) {
    await createNotification(
      tx.ctvId,
      'TRANSACTION_CONFIRMED',
      `Giao dich #${transactionId} da duoc xac nhan`,
      `So tien: ${tx.totalAmount.toLocaleString('vi-VN')} VND${notes ? '. Ghi chu: ' + notes : ''}`,
      { transactionId, amount: tx.totalAmount }
    );
  }

  return updated;
}

/**
 * Admin rejects a transaction
 */
async function rejectTransaction(transactionId, adminId, reason) {
  const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!tx) throw new Error('Giao dich khong ton tai');
  if (tx.status !== 'PENDING') throw new Error('Giao dich khong o trang thai PENDING');

  const updated = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      status: 'REJECTED',
      rejectedReason: reason,
      confirmedBy: adminId,
      confirmedAt: new Date(),
    },
  });

  // Notify CTV
  if (tx.ctvId) {
    await createNotification(
      tx.ctvId,
      'TRANSACTION_REJECTED',
      `Giao dich #${transactionId} bi tu choi`,
      `Ly do: ${reason}`,
      { transactionId, reason }
    );
  }

  return updated;
}

/**
 * CTV creates a cash deposit (batching multiple cash transactions)
 */
async function createCashDeposit(ctvId, transactionIds, notes) {
  if (!transactionIds || transactionIds.length === 0) {
    throw new Error('Can chon it nhat 1 giao dich');
  }

  // Validate all transactions belong to this CTV, are cash, and PENDING
  const transactions = await prisma.transaction.findMany({
    where: {
      id: { in: transactionIds },
      ctvId,
      paymentMethod: 'cash',
      status: 'PENDING',
      cashDepositId: null,
    },
  });

  if (transactions.length !== transactionIds.length) {
    throw new Error('Mot so giao dich khong hop le (khong phai cash, da duoc xu ly, hoac khong thuoc ve ban)');
  }

  const totalAmount = transactions.reduce((sum, tx) => sum + Number(tx.totalAmount), 0);

  const deposit = await prisma.cashDeposit.create({
    data: {
      ctvId,
      amount: totalAmount,
      transactionIds: JSON.stringify(transactionIds),
      notes,
    },
  });

  // Link transactions to this deposit
  await prisma.transaction.updateMany({
    where: { id: { in: transactionIds } },
    data: { cashDepositId: deposit.id },
  });

  // Notify admins
  await notifyAdmins(
    'CASH_DEPOSIT',
    `CTV nop tien mat: ${totalAmount.toLocaleString('vi-VN')} VND`,
    `${transactionIds.length} giao dich, phieu #${deposit.id}`,
    { depositId: deposit.id, ctvId, amount: totalAmount }
  );

  return { depositId: deposit.id, status: 'PENDING', totalAmount, transactionCount: transactions.length };
}

/**
 * Admin confirms a cash deposit
 */
async function confirmCashDeposit(depositId, adminId, notes) {
  const deposit = await prisma.cashDeposit.findUnique({ where: { id: depositId } });
  if (!deposit) throw new Error('Phieu nop tien khong ton tai');

  const txIds = JSON.parse(deposit.transactionIds);

  // Atomic: only updates if still PENDING, prevents double-confirm race condition
  const result = await prisma.cashDeposit.updateMany({
    where: { id: depositId, status: 'PENDING' },
    data: {
      status: 'CONFIRMED',
      confirmedBy: adminId,
      confirmedAt: new Date(),
      notes: notes || deposit.notes,
    },
  });
  if (result.count === 0) throw new Error('Phieu nop tien khong o trang thai PENDING hoac da duoc xu ly boi admin khac');

  // Confirm all linked transactions
  await prisma.transaction.updateMany({
    where: { id: { in: txIds } },
    data: {
      status: 'CONFIRMED',
      confirmedBy: adminId,
      confirmedAt: new Date(),
    },
  });

  // Update customer totalSpent for each transaction
  const transactions = await prisma.transaction.findMany({
    where: { id: { in: txIds } },
    select: { customerId: true, totalAmount: true },
  });
  for (const tx of transactions) {
    if (tx.customerId) {
      await prisma.customer.update({
        where: { id: tx.customerId },
        data: { totalSpent: { increment: tx.totalAmount } },
      });
    }
  }

  // Invalidate caches
  invalidateCommissionCache(deposit.ctvId);
  await invalidateCache(`ctv:dashboard:${deposit.ctvId}:*`);
  await invalidateCache('admin:dashboard:*');

  // Notify CTV
  await createNotification(
    deposit.ctvId,
    'CASH_DEPOSIT_CONFIRMED',
    `Phieu nop tien #${depositId} da duoc xac nhan`,
    `So tien: ${deposit.amount.toLocaleString('vi-VN')} VND, ${txIds.length} giao dich`,
    { depositId, amount: deposit.amount }
  );

  return { confirmedTransactions: txIds.length };
}

/**
 * Get reconciliation stats for admin
 */
async function getReconciliationStats() {
  const [pendingTxns, pendingDeposits] = await Promise.all([
    prisma.transaction.findMany({
      where: { status: 'PENDING', channel: 'ctv' },
      select: { totalAmount: true, paymentMethod: true, ctvSubmittedAt: true },
    }),
    prisma.cashDeposit.count({ where: { status: 'PENDING' } }),
  ]);

  const pendingCount = pendingTxns.length;
  const pendingAmount = pendingTxns.reduce((s, t) => s + Number(t.totalAmount), 0);
  const pendingByMethod = { bank_transfer: 0, cash: 0, momo: 0, zalopay: 0 };
  let totalWaitMs = 0;

  for (const t of pendingTxns) {
    const method = t.paymentMethod || 'cash';
    pendingByMethod[method] = (pendingByMethod[method] || 0) + 1;
    if (t.ctvSubmittedAt) {
      totalWaitMs += Date.now() - new Date(t.ctvSubmittedAt).getTime();
    }
  }

  return {
    pendingCount,
    pendingAmount,
    pendingDeposits,
    avgConfirmTimeHours: pendingCount > 0 ? Math.round(totalWaitMs / pendingCount / 3600000 * 10) / 10 : 0,
    pendingByMethod,
  };
}

module.exports = {
  createCtvTransaction,
  uploadPaymentProof,
  confirmTransaction,
  rejectTransaction,
  createCashDeposit,
  confirmCashDeposit,
  getReconciliationStats,
  BANK_ACCOUNT,
  COMBO_PRICE,
};
