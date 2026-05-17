/**
 * Product / Variant / Supplier / Inventory routes (admin)
 * Spec: docs/specs/01_PRODUCT_M0.md §5.3
 */

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditLog');
const { receiveBatch, expiringBatches } = require('../services/inventory');

const router = express.Router();
const prisma = require('../lib/prisma');

// All routes require admin
router.use(authenticate, authorize('admin'));

// ---------- WAREHOUSES (CRUD) ----------

router.get('/warehouses', async (req, res) => {
  const items = await prisma.warehouse.findMany({
    where: req.query.onlyActive === 'false' ? {} : { isActive: true },
    orderBy: { id: 'asc' },
    include: { _count: { select: { products: true, transactions: true, staff: true } } },
  });
  res.json({ items, total: items.length });
});

router.post('/warehouses', async (req, res) => {
  try {
    const { code, name, address, isActive = true } = req.body || {};
    if (!code || !name || !address) return res.status(400).json({ error: 'code, name, address are required' });
    const wh = await prisma.warehouse.create({
      data: { code: code.trim().toUpperCase(), name: name.trim(), address: address.trim(), isActive },
    });
    res.status(201).json(wh);
  } catch (e) {
    res.status(e.code === 'P2002' ? 409 : 400).json({ error: e.code === 'P2002' ? 'Code đã tồn tại' : e.message });
  }
});

router.put('/warehouses/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = {};
    if (req.body.code !== undefined) data.code = String(req.body.code).trim().toUpperCase();
    if (req.body.name !== undefined) data.name = String(req.body.name).trim();
    if (req.body.address !== undefined) data.address = String(req.body.address).trim();
    if (req.body.isActive !== undefined) data.isActive = !!req.body.isActive;
    const wh = await prisma.warehouse.update({ where: { id }, data });
    res.json(wh);
  } catch (e) {
    res.status(e.code === 'P2002' ? 409 : 400).json({ error: e.code === 'P2002' ? 'Code đã tồn tại' : e.message });
  }
});

router.delete('/warehouses/:id', async (req, res) => {
  // Soft delete: set isActive=false (keeps history intact)
  try {
    const id = parseInt(req.params.id, 10);
    const wh = await prisma.warehouse.update({ where: { id }, data: { isActive: false } });
    res.json({ ok: true, warehouse: wh });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ---------- PRODUCTS ----------

router.get('/products', async (req, res) => {
  const { status, category, q, limit = 50, offset = 0 } = req.query;
  const where = {};
  if (status) where.status = status;
  if (category) where.category = category;
  if (q) where.name = { contains: q, mode: 'insensitive' };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        variants: {
          orderBy: { sortOrder: 'asc' },
          include: {
            supplierProducts: {
              include: { supplier: { select: { id: true, name: true, type: true } } },
              orderBy: [{ isPreferred: 'desc' }, { validFrom: 'desc' }],
            },
          },
        },
        warehouse: { select: { id: true, code: true, name: true, address: true } },
      },
      orderBy: { id: 'desc' },
      take: Math.min(parseInt(limit, 10) || 50, 200),
      skip: parseInt(offset, 10) || 0,
    }),
    prisma.product.count({ where }),
  ]);
  res.json({ items, total });
});

router.get('/products/:id', async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: parseInt(req.params.id, 10) },
    include: { variants: { include: { batches: { where: { status: 'ACTIVE' } } } } },
  });
  if (!product) return res.status(404).json({ error: 'Not found' });
  res.json(product);
});

router.post('/products', async (req, res) => {
  try {
    const { name, slug, category, description, brand, origin, region, warehouseId, price, cogsPct, unit, status } = req.body;
    if (!name || !category || price == null || cogsPct == null || !unit) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (region && !['BAC', 'TRUNG', 'NAM'].includes(region)) {
      return res.status(400).json({ error: "region must be 'BAC' | 'TRUNG' | 'NAM'" });
    }
    const product = await prisma.product.create({
      data: {
        name, slug: slug || null, category, description: description || null,
        brand: brand || null, origin: origin || null,
        region: region || null,
        warehouseId: warehouseId ? parseInt(warehouseId, 10) : null,
        price, cogsPct, unit, status: status || 'ACTIVE',
      },
    });
    logAudit({ userId: req.user.id, action: 'PRODUCT_CREATE', targetType: 'Product', targetId: product.id, status: 'SUCCESS' });
    res.status(201).json(product);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = { ...req.body };
    delete data.id; delete data.variants; delete data.createdAt; delete data.warehouse;
    if (data.region && !['BAC', 'TRUNG', 'NAM'].includes(data.region)) {
      return res.status(400).json({ error: "region must be 'BAC' | 'TRUNG' | 'NAM'" });
    }
    if (data.warehouseId !== undefined) {
      data.warehouseId = data.warehouseId ? parseInt(data.warehouseId, 10) : null;
    }
    const product = await prisma.product.update({ where: { id }, data });
    logAudit({ userId: req.user.id, action: 'PRODUCT_UPDATE', targetType: 'Product', targetId: id, status: 'SUCCESS' });
    res.json(product);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ---------- VARIANTS ----------

router.post('/products/:id/variants', async (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const { sku, name, attributes, unit, basePrice, cogsPct, weightGrams, imageUrl, status, sortOrder } = req.body;
    if (!sku || !name || basePrice == null || cogsPct == null || !unit) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const variant = await prisma.productVariant.create({
      data: {
        productId, sku, name, attributes: attributes || null, unit, basePrice, cogsPct,
        weightGrams: weightGrams || null, imageUrl: imageUrl || null,
        status: status || 'ACTIVE', sortOrder: sortOrder || 0,
      },
    });
    logAudit({ userId: req.user.id, action: 'VARIANT_CREATE', targetType: 'ProductVariant', targetId: variant.id, status: 'SUCCESS' });
    res.status(201).json(variant);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/variants/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = { ...req.body };
    delete data.id; delete data.productId; delete data.batches; delete data.createdAt;
    const variant = await prisma.productVariant.update({ where: { id }, data });
    logAudit({ userId: req.user.id, action: 'VARIANT_UPDATE', targetType: 'ProductVariant', targetId: id, status: 'SUCCESS' });
    res.json(variant);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ---------- INVENTORY BATCHES ----------

router.post('/variants/:id/batches', async (req, res) => {
  try {
    const variantId = parseInt(req.params.id, 10);
    const batch = await receiveBatch({ variantId, ...req.body });
    logAudit({ userId: req.user.id, action: 'BATCH_RECEIVE', targetType: 'InventoryBatch', targetId: batch.id, status: 'SUCCESS' });
    res.status(201).json(batch);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/inventory', async (req, res) => {
  const { status = 'ACTIVE', variantId, agencyId, expiring } = req.query;
  if (expiring) {
    const days = parseInt(expiring, 10) || 30;
    return res.json({ items: await expiringBatches(days) });
  }
  const where = { status };
  if (variantId) where.variantId = parseInt(variantId, 10);
  if (agencyId) where.agencyId = parseInt(agencyId, 10);
  const items = await prisma.inventoryBatch.findMany({
    where,
    include: {
      variant: {
        include: {
          product: {
            include: { warehouse: { select: { id: true, code: true, name: true } } },
          },
        },
      },
      supplier: { select: { id: true, name: true } },
      agency: true,
    },
    orderBy: [{ expDate: 'asc' }, { receivedAt: 'desc' }],
    take: 500,
  });
  res.json({ items });
});

// ---------- SUPPLIERS ----------

router.get('/suppliers', async (req, res) => {
  const { type, isActive } = req.query;
  const where = {};
  if (type) where.type = type;
  if (isActive !== undefined) where.isActive = isActive === 'true';
  const items = await prisma.supplier.findMany({
    where,
    include: { household: true, _count: { select: { batches: true, supplierProducts: true } } },
    orderBy: { name: 'asc' },
  });
  res.json({ items });
});

router.post('/suppliers', async (req, res) => {
  try {
    const supplier = await prisma.supplier.create({ data: req.body });
    logAudit({ userId: req.user.id, action: 'SUPPLIER_CREATE', targetType: 'Supplier', targetId: supplier.id, status: 'SUCCESS' });
    res.status(201).json(supplier);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/suppliers/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = { ...req.body };
    delete data.id; delete data.createdAt;
    const supplier = await prisma.supplier.update({ where: { id }, data });
    logAudit({ userId: req.user.id, action: 'SUPPLIER_UPDATE', targetType: 'Supplier', targetId: id, status: 'SUCCESS' });
    res.json(supplier);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/suppliers/:id', async (req, res) => {
  // Soft delete
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.supplier.update({ where: { id }, data: { isActive: false } });
    logAudit({ userId: req.user.id, action: 'SUPPLIER_DEACTIVATE', targetType: 'Supplier', targetId: id, status: 'SUCCESS' });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
