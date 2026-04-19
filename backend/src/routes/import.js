const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = require('../lib/prisma');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticate);
router.use(authorize('admin'));

// POST /ctv - Import CTVs from Excel
router.post('/ctv', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Can upload file Excel' });
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    const results = { success: [], failed: [], total: rows.length };
    const defaultHash = await bcrypt.hash('ctv123', 10);

    for (const row of rows) {
      try {
        if (!row.email || !row.name) throw new Error('Thieu email hoac name');
        const existing = await prisma.user.findUnique({ where: { email: row.email } });
        if (existing) throw new Error('Email da ton tai');
        let parentId = null;
        if (row.parentEmail) {
          const parent = await prisma.user.findUnique({ where: { email: row.parentEmail } });
          if (parent) parentId = parent.id;
        }
        await prisma.user.create({
          data: { email: row.email, passwordHash: defaultHash, role: 'ctv', name: row.name, phone: row.phone || null, rank: row.rank || 'CTV', parentId },
        });
        results.success.push(row.email);
      } catch (err) { results.failed.push({ email: row.email || 'N/A', error: err.message }); }
    }
    await prisma.importLog.create({ data: { type: 'ctv', fileName: req.file.originalname, totalRows: results.total, successRows: results.success.length, failedRows: results.failed.length, importedBy: req.user.id, details: JSON.stringify(results.failed) } });
    res.json(results);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /products - Import products
router.post('/products', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Can upload file Excel' });
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
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
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /members - Import members
router.post('/members', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Can upload file Excel' });
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    const results = { success: [], failed: [], total: rows.length };
    const defaultHash = await bcrypt.hash('member123', 10);

    const greenTier = await prisma.membershipTier.findFirst({ orderBy: { minDeposit: 'asc' } });

    for (const row of rows) {
      try {
        if (!row.email || !row.name) throw new Error('Thieu email hoac name');
        const existing = await prisma.user.findUnique({ where: { email: row.email } });
        if (existing) throw new Error('Email da ton tai');
        const user = await prisma.user.create({ data: { email: row.email, passwordHash: defaultHash, role: 'member', name: row.name, phone: row.phone || null } });
        const code = `CCB_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        await prisma.memberWallet.create({ data: { userId: user.id, tierId: greenTier?.id || 1, referralCode: code } });
        results.success.push(row.email);
      } catch (err) { results.failed.push({ email: row.email || 'N/A', error: err.message }); }
    }
    await prisma.importLog.create({ data: { type: 'member', fileName: req.file.originalname, totalRows: results.total, successRows: results.success.length, failedRows: results.failed.length, importedBy: req.user.id, details: JSON.stringify(results.failed) } });
    res.json(results);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /templates/:type - Download Excel template
router.get('/templates/:type', (req, res) => {
  const templates = {
    ctv: [{ email: 'ctv@example.com', name: 'Nguyen Van A', phone: '0901234567', parentEmail: 'manager@example.com', rank: 'CTV' }],
    products: [{ name: 'San pham A', category: 'FMCG', price: 100000, cogsPct: 0.5, unit: 'cai' }],
    members: [{ email: 'member@example.com', name: 'Tran Thi B', phone: '0912345678' }],
  };
  const data = templates[req.params.type];
  if (!data) return res.status(404).json({ error: 'Template not found' });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=template_${req.params.type}.xlsx`);
  res.send(Buffer.from(buf));
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
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
