const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { calculateSalaryFundStatus } = require('../services/commission');

const router = express.Router();
const prisma = require('../lib/prisma');

router.use(authenticate);
router.use(authorize('admin'));

/**
 * Generate financial report data
 */
async function generateFinancialReport(months = 6) {
  const now = new Date();
  const reports = [];
  const fixedCosts = 30000000; // 30M fixed monthly

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const dEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    const txns = await prisma.transaction.findMany({
      where: { createdAt: { gte: d, lt: dEnd } },
    });

    const revenue = { ctv: 0, agency: 0, showroom: 0, total: 0 };
    let cogs = 0;
    for (const t of txns) {
      revenue[t.channel] += t.totalAmount;
      revenue.total += t.totalAmount;
      cogs += t.cogsAmount;
    }

    const grossProfit = revenue.total - cogs;
    const ctvCost = revenue.ctv * 0.40;
    const agencyCost = revenue.agency * 0.20;
    const sf = await calculateSalaryFundStatus(monthStr);
    const opex = revenue.total * 0.14 + fixedCosts;
    const netProfit = grossProfit - ctvCost - agencyCost - sf.totalFixedSalary - opex;

    reports.push({
      month: monthStr,
      revenue,
      cogs,
      grossProfit,
      grossMargin: revenue.total > 0 ? ((grossProfit / revenue.total) * 100).toFixed(1) : '0',
      ctvCost,
      agencyCost,
      fixedSalaries: sf.totalFixedSalary,
      salaryFundPct: sf.usagePercent,
      opex,
      netProfit,
      netMargin: revenue.total > 0 ? ((netProfit / revenue.total) * 100).toFixed(1) : '0',
      transactionCount: txns.length,
    });
  }

  return reports;
}

function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' VND';
}

// Export Excel
router.get('/export/excel', async (req, res) => {
  try {
    const { months = 6 } = req.query;
    const report = await generateFinancialReport(parseInt(months));

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CCB Mart';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('Bao cao tai chinh');

    // Title
    ws.mergeCells('A1:H1');
    const titleCell = ws.getCell('A1');
    titleCell.value = 'BAO CAO TAI CHINH CCB MART';
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center' };

    ws.mergeCells('A2:H2');
    ws.getCell('A2').value = `Thoi gian: ${report[0]?.month} - ${report[report.length - 1]?.month}`;
    ws.getCell('A2').alignment = { horizontal: 'center' };

    // Headers
    const headerRow = ws.addRow([]);
    ws.addRow([
      'Thang',
      'Doanh thu CTV',
      'Doanh thu Dai ly',
      'Doanh thu Showroom',
      'Tong doanh thu',
      'COGS',
      'LN gop',
      'Bien LN gop (%)',
      'Chi phi CTV',
      'Chi phi Dai ly',
      'Luong co dinh',
      'OPEX',
      'LN rong',
      'Bien LN rong (%)',
      'So giao dich',
    ]);

    const headerRowNum = ws.lastRow.number;
    ws.getRow(headerRowNum).font = { bold: true };
    ws.getRow(headerRowNum).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
    ws.getRow(headerRowNum).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Data rows
    for (const row of report) {
      ws.addRow([
        row.month,
        row.revenue.ctv,
        row.revenue.agency,
        row.revenue.showroom,
        row.revenue.total,
        row.cogs,
        row.grossProfit,
        parseFloat(row.grossMargin),
        row.ctvCost,
        row.agencyCost,
        row.fixedSalaries,
        row.opex,
        row.netProfit,
        parseFloat(row.netMargin),
        row.transactionCount,
      ]);
    }

    // Format currency columns
    const currencyCols = [2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13];
    for (const col of currencyCols) {
      ws.getColumn(col).numFmt = '#,##0';
      ws.getColumn(col).width = 18;
    }
    ws.getColumn(1).width = 12;
    ws.getColumn(8).width = 14;
    ws.getColumn(14).width = 14;
    ws.getColumn(15).width = 14;

    // Summary row
    ws.addRow([]);
    const summaryRow = ws.addRow([
      'TONG',
      report.reduce((s, r) => s + r.revenue.ctv, 0),
      report.reduce((s, r) => s + r.revenue.agency, 0),
      report.reduce((s, r) => s + r.revenue.showroom, 0),
      report.reduce((s, r) => s + r.revenue.total, 0),
      report.reduce((s, r) => s + r.cogs, 0),
      report.reduce((s, r) => s + r.grossProfit, 0),
      '',
      report.reduce((s, r) => s + r.ctvCost, 0),
      report.reduce((s, r) => s + r.agencyCost, 0),
      report.reduce((s, r) => s + r.fixedSalaries, 0),
      report.reduce((s, r) => s + r.opex, 0),
      report.reduce((s, r) => s + r.netProfit, 0),
      '',
      report.reduce((s, r) => s + r.transactionCount, 0),
    ]);
    summaryRow.font = { bold: true };
    summaryRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=ccbmart-financial-report-${new Date().toISOString().slice(0, 10)}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('[Export] Excel error:', err);
    console.error("[route]", err); res.status(500).json({ error: "Internal server error" });
  }
});

// Export PDF (HTML-based, no puppeteer dependency)
router.get('/export/pdf', async (req, res) => {
  try {
    const { months = 6 } = req.query;
    const report = await generateFinancialReport(parseInt(months));

    // Generate HTML report that can be printed to PDF by the browser
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Bao cao tai chinh CCB Mart</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
    h1 { text-align: center; color: #10b981; }
    .subtitle { text-align: center; margin-bottom: 30px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
    th { background: #10b981; color: white; padding: 10px 6px; text-align: right; border: 1px solid #ddd; }
    th:first-child { text-align: left; }
    td { padding: 8px 6px; border: 1px solid #ddd; text-align: right; }
    td:first-child { text-align: left; font-weight: bold; }
    tr:nth-child(even) { background: #f9fafb; }
    .summary { font-weight: bold; background: #f3f4f6 !important; }
    .negative { color: #ef4444; }
    .positive { color: #10b981; }
    .footer { margin-top: 30px; text-align: center; color: #999; font-size: 11px; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>BAO CAO TAI CHINH CCB MART</h1>
  <div class="subtitle">${report[0]?.month} - ${report[report.length - 1]?.month}</div>
  <table>
    <thead>
      <tr>
        <th>Thang</th>
        <th>Doanh thu</th>
        <th>COGS</th>
        <th>LN gop</th>
        <th>Bien LN gop</th>
        <th>Chi phi CTV</th>
        <th>Chi phi DL</th>
        <th>Luong CD</th>
        <th>LN rong</th>
        <th>Bien LN rong</th>
      </tr>
    </thead>
    <tbody>
      ${report.map(r => `
      <tr>
        <td>${r.month}</td>
        <td>${formatVND(r.revenue.total)}</td>
        <td>${formatVND(r.cogs)}</td>
        <td class="${r.grossProfit >= 0 ? 'positive' : 'negative'}">${formatVND(r.grossProfit)}</td>
        <td>${r.grossMargin}%</td>
        <td>${formatVND(r.ctvCost)}</td>
        <td>${formatVND(r.agencyCost)}</td>
        <td>${formatVND(r.fixedSalaries)}</td>
        <td class="${r.netProfit >= 0 ? 'positive' : 'negative'}">${formatVND(r.netProfit)}</td>
        <td>${r.netMargin}%</td>
      </tr>`).join('')}
      <tr class="summary">
        <td>TONG</td>
        <td>${formatVND(report.reduce((s, r) => s + r.revenue.total, 0))}</td>
        <td>${formatVND(report.reduce((s, r) => s + r.cogs, 0))}</td>
        <td>${formatVND(report.reduce((s, r) => s + r.grossProfit, 0))}</td>
        <td>-</td>
        <td>${formatVND(report.reduce((s, r) => s + r.ctvCost, 0))}</td>
        <td>${formatVND(report.reduce((s, r) => s + r.agencyCost, 0))}</td>
        <td>${formatVND(report.reduce((s, r) => s + r.fixedSalaries, 0))}</td>
        <td>${formatVND(report.reduce((s, r) => s + r.netProfit, 0))}</td>
        <td>-</td>
      </tr>
    </tbody>
  </table>
  <div class="footer">
    CCB Mart - Bao cao tu dong | Ngay tao: ${new Date().toLocaleDateString('vi-VN')}
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename=ccbmart-report-${new Date().toISOString().slice(0, 10)}.html`);
    res.send(html);
  } catch (err) {
    console.error('[Export] PDF error:', err);
    console.error("[route]", err); res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
