const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = require('../lib/prisma');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticate);
router.use(authorize('admin'));

async function parseExcel(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const rows = [];
  const headers = [];
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) {
      row.eachCell((cell, colNum) => { headers[colNum] = String(cell.value || '').trim(); });
    } else {
      const obj = {};
      row.eachCell((cell, colNum) => {
        if (headers[colNum]) obj[headers[colNum]] = cell.value;
      });
      if (Object.keys(obj).length > 0) rows.push(obj);
    }
  });
  return rows;
}

// POST /ctv - Import CTVs from Excel
router.post('/ctv', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Can upload file Excel' });
    const rows = await parseExcel(req.file.buffer);
    const results = { success: [], failed: [], passwords: [], total: rows.length };

    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        try {
          if (!row.email || !row.name) throw new Error('Thieu email hoac name');
          const existing = await tx.user.findUnique({ where: { email: row.email } });
          if (existing) throw new Error('Email da ton tai');
          let parentId = null;
          if (row.parentEmail) {
            const parent = await tx.user.findUnique({ where: { email: row.parentEmail } });
            if (parent) parentId = parent.id;
          }
          const plainPassword = crypto.randomBytes(12).toString('hex');
          const passwordHash = await bcrypt.hash(plainPassword, 10);
          await tx.user.create({
            data: { email: row.email, passwordHash, role: 'ctv', name: row.name, phone: row.phone || null, rank: row.rank || 'CTV', parentId },
          });
          results.success.push(row.email);
          results.passwords.push({ email: row.email, password: plainPassword });
        } catch (err) { results.failed.push({ email: row.email || 'N/A', error: err.message }); }
      }
    });
    await prisma.importLog.create({ data: { type: 'ctv', fileName: req.file.originalname, totalRows: results.total, successRows: results.success.length, failedRows: results.failed.length, importedBy: req.user.id, details: JSON.stringify(results.failed) } });
    res.json(results);
  } catch (err) { console.error('[import]', err); res.status(500).json({ error: 'Internal server error' }); }
});

// POST /products - Import products
router.post('/products', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Can upload file Excel' });
    const rows = await parseExcel(req.file.buffer);
    const results = { success: [], failed: [], total: rows.length };

    for (const row of rows) {
      try {
        if (!row.name || !row.price) throw new Error('Thieu name hoac price');
        await prisma.product.create({
          data: { name: row.name, category: row.category || 'FMCG', price: parseFloat(row.price), cogsPct: parseFloat(row.cogsPct || 0.5), unit: row.unit || 'cai' },
        });
        results.success.push(row.name);
      } catch (err) { results.failed.push({ name: row.name || 'N/A', error: err.message }); }
    }
    await prisma.importLog.create({ data: { type: 'product', fileName: req.file.originalname, totalRows: results.total, successRows: results.success.length, failedRows: results.failed.length, importedBy: req.user.id, details: JSON.stringify(results.failed) } });
    res.json(results);
  } catch (err) { console.error('[import]', err); res.status(500).json({ error: 'Internal server error' }); }
});

// POST /members - Import members
router.post('/members', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Can upload file Excel' });
    const rows = await parseExcel(req.file.buffer);
    const results = { success: [], failed: [], passwords: [], total: rows.length };

    const greenTier = await prisma.membershipTier.findFirst({ orderBy: { minDeposit: 'asc' } });
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    for (const row of rows) {
      try {
        if (!row.email || !row.name) throw new Error('Thieu email hoac name');
        const existing = await prisma.user.findUnique({ where: { email: row.email } });
        if (existing) throw new Error('Email da ton tai');
        const plainPassword = crypto.randomBytes(12).toString('hex');
        const passwordHash = await bcrypt.hash(plainPassword, 10);
        const user = await prisma.user.create({ data: { email: row.email, passwordHash, role: 'member', name: row.name, phone: row.phone || null } });
        const codeBytes = crypto.randomBytes(6);
        const code = 'CCB_' + Array.from(codeBytes).map(b => chars[b % chars.length]).join('');
        await prisma.memberWallet.create({ data: { userId: user.id, tierId: greenTier?.id || 1, referralCode: code } });
        results.success.push(row.email);
        results.passwords.push({ email: row.email, password: plainPassword });
      } catch (err) { results.failed.push({ email: row.email || 'N/A', error: err.message }); }
    }
    await prisma.importLog.create({ data: { type: 'member', fileName: req.file.originalname, totalRows: results.total, successRows: results.success.length, failedRows: results.failed.length, importedBy: req.user.id, details: JSON.stringify(results.failed) } });
    res.json(results);
  } catch (err) { console.error('[import]', err); res.status(500).json({ error: 'Internal server error' }); }
});

// GET /templates/:type - Download Excel template
router.get('/templates/:type', async (req, res) => {
  const templates = {
    ctv: [{ email: 'ctv@example.com', name: 'Nguyen Van A', phone: '0901234567', parentEmail: 'manager@example.com', rank: 'CTV' }],
    products: [{ name: 'San pham A', category: 'FMCG', price: 100000, cogsPct: 0.5, unit: 'cai' }],
    members: [{ email: 'member@example.com', name: 'Tran Thi B', phone: '0912345678' }],
  };
  const data = templates[req.params.type];
  if (!data) return res.status(404).json({ error: 'Template not found' });

  try {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Template');
    ws.columns = Object.keys(data[0]).map(k => ({ header: k, key: k }));
    data.forEach(row => ws.addRow(row));
    const buf = await wb.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=template_${req.params.type}.xlsx`);
    res.send(buf);
  } catch (err) { console.error('[import/template]', err); res.status(500).json({ error: 'Internal server error' }); }
});

// GET /logs - Import history
router.get('/logs', async (req, res) => {
  try {
    const logs = await prisma.importLog.findMany({
      include: { importer: { select: { name: true } } },
      orderBy: { importedAt: 'desc' },
      take: 50,
    });
    res.json(logs);
  } catch (err) { console.error('[import]', err); res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;
