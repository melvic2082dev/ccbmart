// =======================================================================
// V13.4 Partner Payout Engine
// -----------------------------------------------------------------------
// CCB Mart là bên chi trả duy nhất. Mỗi tháng, engine này tính tổng các
// khoản phải trả cho từng đối tác (PP+) và sinh:
//   - Một Invoice cho mỗi loại payout (SALES_COMMISSION, MAINTENANCE_FEE,
//     MANAGEMENT_FEE_LEVEL1/2/3, OVERRIDE_FEE).
//   - Một PayoutLog tổng hợp per (partner, month).
//
// Nguyên tắc cốt lõi: KHÔNG có chuyển tiền trainee→trainer hoặc giữa hai
// đối tác. Mọi hoá đơn đều có fromParty="CCB Mart" và toUserId=partnerId.
// =======================================================================

const prisma = require('../lib/prisma');
const { calculateKFactor } = require('./trainingFee');
const { calculateCtvCommission } = require('./commission');
const {
  calculateMonthlyManagementFees,
  getReceivedManagementFeesSummary,
  getTrainerMinutes,
  MIN_TRAINING_MINUTES_PER_MONTH,
} = require('./managementFee');
const { processMonthlyBreakawayFees } = require('./breakaway');

// Lương cố định hàng tháng — chỉ trả khi đối tác có ≥ 20h log đào tạo.
const MAINTENANCE_FEE_BY_RANK = {
  PP: 5_000_000,
  TP: 10_000_000,
  GDV: 18_000_000,
  GDKD: 30_000_000,
};

const PARTNER_RANKS = ['PP', 'TP', 'GDV', 'GDKD'];

const PAYOUT_DESCRIPTIONS = {
  SALES_COMMISSION: (month) => `Hoa hồng bán lẻ tháng ${month}`,
  MAINTENANCE_FEE: (month) => `Lương cố định tháng ${month}`,
  MANAGEMENT_FEE_LEVEL1: (month) => `Phí quản lý cấp 1 (10%) tháng ${month}`,
  MANAGEMENT_FEE_LEVEL2: (month) => `Phí quản lý cấp 2 (5%) tháng ${month}`,
  MANAGEMENT_FEE_LEVEL3: (month) => `Phí quản lý cấp 3 (3%) tháng ${month}`,
  OVERRIDE_FEE: (month) => `Phí thoát ly tháng ${month}`,
};

function getMaintenanceFeeByRank(rank) {
  return MAINTENANCE_FEE_BY_RANK[rank] || 0;
}

async function hasValidTrainingLog(userId, month) {
  const minutes = await getTrainerMinutes(userId, month);
  return minutes >= MIN_TRAINING_MINUTES_PER_MONTH;
}

async function nextInvoiceSeq(month) {
  const prefix = `CCB-${month.replace('-', '')}`;
  const last = await prisma.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  });
  if (!last) return { prefix, seq: 1 };
  const lastSeq = parseInt(last.invoiceNumber.split('-').pop(), 10);
  return { prefix, seq: Number.isFinite(lastSeq) ? lastSeq + 1 : 1 };
}

/**
 * Process monthly payout for all active partners.
 *
 * Idempotent: re-running the same month re-uses any existing PayoutLog row
 * (upserted) and appends new Invoice rows with continuing sequence numbers.
 *
 * @param {string} month - YYYY-MM
 * @returns {Promise<{month, kFactor, partnersProcessed, totalDisbursed, results}>}
 */
async function processMonthlyPayout(month) {
  // Pre-compute downstream tables so summaries below have data to read.
  await calculateMonthlyManagementFees(month);
  await processMonthlyBreakawayFees(month).catch(() => null);

  const kResult = await calculateKFactor(month);
  const kFactor = Number(kResult.kFactor) || 1;

  const partners = await prisma.user.findMany({
    where: { isActive: true, rank: { in: PARTNER_RANKS } },
    select: { id: true, name: true, rank: true },
    orderBy: { id: 'asc' },
  });

  let { prefix, seq } = await nextInvoiceSeq(month);
  const results = [];

  for (const partner of partners) {
    const hasLog = await hasValidTrainingLog(partner.id, month);

    const breakdown = [];

    // 1) Sales commission (rank-based on personal retail revenue)
    const commissionResult = await calculateCtvCommission(partner.id, month).catch(() => null);
    const salesCommission = Math.floor(
      Number(commissionResult?.baseCommission ?? commissionResult?.totalAmount ?? 0)
    );
    if (salesCommission > 0) {
      breakdown.push({ type: 'SALES_COMMISSION', amount: salesCommission });
    }

    // 2) Maintenance fee (only if 20h training log)
    if (hasLog) {
      const maintenanceFee = getMaintenanceFeeByRank(partner.rank);
      if (maintenanceFee > 0) {
        breakdown.push({ type: 'MAINTENANCE_FEE', amount: maintenanceFee });
      }
    }

    // 3) Management fees L1/L2/L3 — managementFee.js already enforces 20h per upline
    const mgmt = await getReceivedManagementFeesSummary(partner.id, month);
    const f1 = Math.floor(Number(mgmt.f1 || 0));
    const f2 = Math.floor(Number(mgmt.f2 || 0));
    const f3 = Math.floor(Number(mgmt.f3 || 0));
    if (f1 > 0) breakdown.push({ type: 'MANAGEMENT_FEE_LEVEL1', amount: f1 });
    if (f2 > 0) breakdown.push({ type: 'MANAGEMENT_FEE_LEVEL2', amount: f2 });
    if (f3 > 0) breakdown.push({ type: 'MANAGEMENT_FEE_LEVEL3', amount: f3 });

    // 4) Override fee — sum BreakawayFee rows where this partner is recipient
    const overrideRows = await prisma.breakawayFee.findMany({
      where: { toUserId: partner.id, month },
      select: { amount: true },
    });
    const overrideFee = overrideRows.reduce(
      (sum, r) => sum + Math.floor(Number(r.amount || 0)),
      0
    );
    if (overrideFee > 0) {
      breakdown.push({ type: 'OVERRIDE_FEE', amount: overrideFee });
    }

    if (breakdown.length === 0) continue;

    // Apply K-factor uniformly across the breakdown
    if (kFactor < 1) {
      for (const item of breakdown) {
        item.amount = Math.floor(item.amount * kFactor);
      }
    }

    const totalAmount = breakdown.reduce((s, b) => s + b.amount, 0);
    if (totalAmount <= 0) continue;

    // 5) Issue one Invoice per payout type
    const invoices = [];
    for (const item of breakdown) {
      if (item.amount <= 0) continue;
      const invoiceNumber = `${prefix}-${String(seq).padStart(4, '0')}`;
      seq++;

      const inv = await prisma.invoice.create({
        data: {
          fromParty: 'CCB Mart',
          toUserId: partner.id,
          amount: item.amount,
          feeTier: item.type,
          payoutType: item.type,
          month,
          description: PAYOUT_DESCRIPTIONS[item.type](month),
          invoiceNumber,
          status: 'SENT',
        },
      });
      invoices.push({ id: inv.id, invoiceNumber, type: item.type, amount: item.amount });
    }

    // 6) Upsert PayoutLog summary
    const payoutLog = await prisma.payoutLog.upsert({
      where: { partnerId_month: { partnerId: partner.id, month } },
      create: {
        partnerId: partner.id,
        partnerName: partner.name,
        partnerRank: partner.rank,
        month,
        totalAmount,
        breakdown,
        hasValidLog: hasLog,
        kFactor,
        status: 'PROCESSED',
      },
      update: {
        partnerName: partner.name,
        partnerRank: partner.rank,
        totalAmount,
        breakdown,
        hasValidLog: hasLog,
        kFactor,
        status: 'PROCESSED',
        processedAt: new Date(),
      },
    });

    results.push({
      partnerId: partner.id,
      partnerName: partner.name,
      partnerRank: partner.rank,
      hasValidLog: hasLog,
      totalAmount,
      breakdown,
      invoices,
      payoutLogId: payoutLog.id,
    });
  }

  return {
    month,
    kFactor,
    partnersProcessed: results.length,
    totalDisbursed: results.reduce((s, r) => s + r.totalAmount, 0),
    results,
  };
}

module.exports = {
  MAINTENANCE_FEE_BY_RANK,
  PARTNER_RANKS,
  PAYOUT_DESCRIPTIONS,
  getMaintenanceFeeByRank,
  hasValidTrainingLog,
  processMonthlyPayout,
};
