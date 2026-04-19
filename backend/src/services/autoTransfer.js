const { calculateTrainingFee, calculateKFactor } = require('./trainingFee');

const prisma = require('../lib/prisma');

/**
 * V12.2: Process monthly auto-transfer for all ACTIVE B2B contracts.
 * For each contract, compute the trainee's branch training fee, apply K factor,
 * create Invoice + AutoTransferLog entries. This is the core settlement for
 * Phí DV Đào tạo (training service fee).
 *
 * @param {string} month - YYYY-MM
 * @param {number} year
 */
async function processMonthlyTransfer(month, year) {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const contracts = await prisma.b2BContract.findMany({
    where: { status: 'active' },
    include: {
      trainer: { select: { id: true, name: true, rank: true } },
      trainee: { select: { id: true, name: true, rank: true } },
    },
  });

  const kResult = await calculateKFactor(monthStr);
  const kFactor = kResult.kFactor;

  const invoicesCreated = [];
  const transfersCreated = [];
  let totalAmount = 0;
  let seq = 1;

  for (const contract of contracts) {
    try {
      const feeResult = await calculateTrainingFee(contract.traineeId, monthStr);
      const actualAmount = Math.floor(feeResult.feeAmount * kFactor);

      if (actualAmount <= 0) continue;

      // Check for existing invoice to avoid duplicates
      const existing = await prisma.invoice.findFirst({
        where: {
          contractId: contract.id,
          issuedAt: {
            gte: new Date(`${monthStr}-01`),
            lt: new Date(year, month, 1),
          },
        },
      });
      if (existing) {
        invoicesCreated.push(existing);
        continue;
      }

      const invoiceNumber = `CCB-${year}${String(month).padStart(2, '0')}-${String(seq).padStart(4, '0')}`;
      seq++;

      const invoice = await prisma.invoice.create({
        data: {
          contractId: contract.id,
          fromUserId: contract.traineeId,
          toUserId: contract.trainerId,
          amount: actualAmount,
          feeTier: feeResult.tier,
          invoiceNumber,
          pdfUrl: `/uploads/invoices/${invoiceNumber}.pdf`,
          status: 'SENT',
        },
      });
      invoicesCreated.push(invoice);

      const transfer = await prisma.autoTransferLog.create({
        data: {
          fromUserId: contract.traineeId,
          toUserId: contract.trainerId,
          amount: actualAmount,
          reference: invoice.id,
          status: 'SUCCESS',
        },
      });
      transfersCreated.push(transfer);
      totalAmount += actualAmount;
    } catch (err) {
      await prisma.autoTransferLog.create({
        data: {
          fromUserId: contract.traineeId,
          toUserId: contract.trainerId,
          amount: 0,
          status: 'FAILED',
          errorMessage: err.message,
        },
      });
    }
  }

  return {
    month: monthStr,
    kFactor,
    invoicesCreated: invoicesCreated.length,
    transfersCreated: transfersCreated.length,
    totalAmount,
  };
}

/**
 * Generate invoice PDF.
 * Currently returns a placeholder path — PDF generation requires pdfkit or puppeteer.
 * Install pdfkit and implement real generation before using in production.
 */
async function generateInvoicePDF(invoiceId) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { fromUser: true, toUser: true, contract: true },
  });
  if (!invoice) throw new Error('Invoice not found');

  // PDF generation not yet implemented — would require pdfkit/puppeteer
  const pdfUrl = `/uploads/invoices/${invoice.invoiceNumber}.pdf`;
  console.warn(`[AutoTransfer] generateInvoicePDF: PDF file not actually generated for ${invoice.invoiceNumber}. Install pdfkit to enable real PDF creation.`);

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { pdfUrl },
  });
  return { invoiceId, pdfUrl, invoiceNumber: invoice.invoiceNumber, generated: false, message: 'PDF generation not implemented — placeholder URL stored' };
}

module.exports = {
  processMonthlyTransfer,
  generateInvoicePDF,
};
