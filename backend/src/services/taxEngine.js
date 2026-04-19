const { calculateCtvCommission } = require('./commission');

const prisma = require('../lib/prisma');

// TNCN flat rate for HKD / professional services income
const TAX_RATE = 0.10; // 10%

// Monthly income below this threshold is tax-exempt (100M VND/year ÷ 12)
// Configurable via TAX_EXEMPT_THRESHOLD env var
const TAX_EXEMPT_THRESHOLD = parseInt(process.env.TAX_EXEMPT_THRESHOLD || '8333333');

/**
 * V12.2: Calculate tax for a single user in a given month.
 * Taxable income = commission + training fee + fixed salary + team bonus.
 */
async function calculateTax(userId, month) {
  const commissionData = await calculateCtvCommission(userId, month);
  if (!commissionData) {
    return { userId, month, taxableIncome: 0, taxAmount: 0 };
  }

  const taxableIncome = commissionData.totalIncome || 0;

  if (taxableIncome < TAX_EXEMPT_THRESHOLD) {
    return { userId, month, taxableIncome, taxAmount: 0, rate: 0, exempt: true };
  }

  const taxAmount = Math.floor(taxableIncome * TAX_RATE);

  return {
    userId,
    month,
    taxableIncome,
    taxAmount,
    rate: TAX_RATE,
    exempt: false,
    breakdown: {
      selfCommission: commissionData.selfCommission,
      trainingFee: commissionData.trainingFee,
      fixedSalary: commissionData.fixedSalary,
      teamBonus: commissionData.teamBonus,
    },
  };
}

/**
 * V12.2: Cron-style end-of-month tax processing for all eligible CTVs.
 */
async function processMonthlyTax(month) {
  const users = await prisma.user.findMany({
    where: { role: 'ctv', isActive: true },
  });

  // Calculate taxes outside the transaction (read-only)
  const taxData = [];
  for (const user of users) {
    const tax = await calculateTax(user.id, month);
    if (tax.taxableIncome > 0) taxData.push({ user, tax });
  }

  // Atomic write: upsert all tax records in a single transaction
  const created = await prisma.$transaction(
    taxData.map(({ user, tax }) =>
      prisma.taxRecord.upsert({
        where: { userId_month: { userId: user.id, month } },
        create: {
          userId: user.id,
          month,
          taxableIncome: tax.taxableIncome,
          taxAmount: tax.taxAmount,
          status: 'PENDING',
        },
        update: {
          taxableIncome: tax.taxableIncome,
          taxAmount: tax.taxAmount,
        },
      })
    )
  );

  const totalTax = taxData.reduce((sum, { tax }) => sum + tax.taxAmount, 0);

  return {
    month,
    recordsCreated: created.length,
    totalTaxCollected: totalTax,
  };
}

/**
 * V12.2: Generate tax report for a specific HKD (Business Household).
 * Used by HKDs for tax declaration with local tax authority.
 */
async function generateTaxReport(hkdId, month) {
  const hkd = await prisma.user.findUnique({
    where: { id: hkdId },
    include: { businessHousehold: true },
  });
  if (!hkd) throw new Error('HKD not found');

  const record = await prisma.taxRecord.findUnique({
    where: { userId_month: { userId: hkdId, month } },
  });

  return {
    hkdId,
    hkdName: hkd.name,
    businessName: hkd.businessHousehold?.businessName,
    taxCode: hkd.businessHousehold?.taxCode,
    month,
    taxableIncome: record?.taxableIncome || 0,
    taxAmount: record?.taxAmount || 0,
    status: record?.status || 'NONE',
    generatedAt: new Date(),
  };
}

module.exports = {
  calculateTax,
  processMonthlyTax,
  generateTaxReport,
  TAX_RATE,
  TAX_EXEMPT_THRESHOLD,
};
