const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { SUPER_ADMIN, OPS_ADMIN } = require('../lib/permissions');

const publicRouter = express.Router();
const adminRouter = express.Router();

// ---- Multer storage for CMS image uploads ----
const cmsUploadDir = path.join(__dirname, '../../uploads/cms');
if (!fs.existsSync(cmsUploadDir)) fs.mkdirSync(cmsUploadDir, { recursive: true });

const cmsStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, cmsUploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const cmsUpload = multer({
  storage: cmsStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// ---- Defaults so first GET has content even before any admin edit ----
const DEFAULT_HERO = {
  eyebrow: 'Hệ thống bán lẻ · Cựu Chiến Binh Việt Nam',
  title: 'Hàng Việt chất lượng, do Cựu Chiến Binh cung cấp.',
  subtitle:
    'CCB Mart mang đặc sản và nhu yếu phẩm từ khắp mọi miền đất nước về tận nhà quý khách — được tuyển chọn, đóng gói và phân phối bởi mạng lưới hội viên Cựu Chiến Binh trên toàn quốc.',
  imageUrl: null,
  primaryCtaText: 'Mua sắm ngay',
  primaryCtaHref: '#featured',
  secondaryCtaText: 'Đăng nhập / Đăng ký →',
  secondaryCtaHref: '/login',
  stat1Value: '2.400+',
  stat1Label: 'Nhà cung cấp Cựu Chiến Binh',
  stat2Value: '63',
  stat2Label: 'Tỉnh / thành phố có mặt',
  stat3Value: '180k+',
  stat3Label: 'Đơn hàng đã giao',
  isActive: true,
};

const DEFAULT_PROMO = {
  eyebrow: 'Kỷ niệm 30/4 · Chương trình lớn',
  title: 'Tri ân Cựu Chiến Binh, giảm đến 30% toàn hệ thống',
  subtitle:
    'Từ 20/4 đến 02/5/2026. Ưu đãi đặc biệt cho Hội viên Hội Cựu Chiến Binh Việt Nam và gia đình khi đặt hàng trực tuyến.',
  imageUrl: null,
  primaryCtaText: 'Xem ưu đãi',
  primaryCtaHref: '#',
  secondaryCtaText: 'Đăng ký Hội viên',
  secondaryCtaHref: '/login',
  isActive: true,
};

async function getOrInitHero() {
  let row = await prisma.landingHero.findFirst({ orderBy: { id: 'asc' } });
  if (!row) row = await prisma.landingHero.create({ data: DEFAULT_HERO });
  return row;
}

async function getOrInitPromo() {
  let row = await prisma.landingPromoBanner.findFirst({ orderBy: { id: 'asc' } });
  if (!row) row = await prisma.landingPromoBanner.create({ data: DEFAULT_PROMO });
  return row;
}

// ---- Public: GET full landing content ----
publicRouter.get('/content', async (_req, res, next) => {
  try {
    const [hero, promo, trustItems, featured, products, categories] = await Promise.all([
      getOrInitHero(),
      getOrInitPromo(),
      prisma.landingTrustItem.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
      }),
      prisma.landingFeaturedProduct.findMany({
        where: { isActive: true },
        orderBy: [{ section: 'asc' }, { displayOrder: 'asc' }],
      }),
      prisma.landingProduct.findMany({
        where: { isActive: true },
        orderBy: [{ categorySlug: 'asc' }, { displayOrder: 'asc' }],
      }),
      prisma.landingCategory.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
      }),
    ]);
    res.json({ hero, promo, trustItems, featured, products, categories });
  } catch (err) {
    next(err);
  }
});

// Public: list all products (used by /category/[slug] and /product/[slug])
publicRouter.get('/products', async (_req, res, next) => {
  try {
    const products = await prisma.landingProduct.findMany({
      where: { isActive: true },
      orderBy: [{ categorySlug: 'asc' }, { displayOrder: 'asc' }],
    });
    res.json(products);
  } catch (err) {
    next(err);
  }
});

// Public: list all categories
publicRouter.get('/categories', async (_req, res, next) => {
  try {
    const categories = await prisma.landingCategory.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
    res.json(categories);
  } catch (err) {
    next(err);
  }
});

// All admin routes go through auth + role guard
adminRouter.use(authenticate);
adminRouter.use(authorize(SUPER_ADMIN, OPS_ADMIN));

// ---- Admin: image upload ----
adminRouter.post('/upload', cmsUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const url = `/uploads/cms/${req.file.filename}`;
  res.json({ url });
});

// ---- Admin: full content (same as public + inactive items) ----
adminRouter.get('/', async (_req, res, next) => {
  try {
    const [hero, promo, trustItems, featured] = await Promise.all([
      getOrInitHero(),
      getOrInitPromo(),
      prisma.landingTrustItem.findMany({ orderBy: { displayOrder: 'asc' } }),
      prisma.landingFeaturedProduct.findMany({
        orderBy: [{ section: 'asc' }, { displayOrder: 'asc' }],
      }),
    ]);
    res.json({ hero, promo, trustItems, featured });
  } catch (err) {
    next(err);
  }
});

// ---- Hero (singleton) ----
const HERO_FIELDS = [
  'eyebrow', 'title', 'subtitle', 'imageUrl',
  'primaryCtaText', 'primaryCtaHref', 'secondaryCtaText', 'secondaryCtaHref',
  'stat1Value', 'stat1Label', 'stat2Value', 'stat2Label', 'stat3Value', 'stat3Label',
  'isActive',
];

function pick(body, allowed) {
  const out = {};
  for (const k of allowed) {
    if (body[k] !== undefined) out[k] = body[k];
  }
  return out;
}

adminRouter.put('/hero', async (req, res, next) => {
  try {
    const current = await getOrInitHero();
    const data = pick(req.body, HERO_FIELDS);
    const updated = await prisma.landingHero.update({ where: { id: current.id }, data });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ---- Promo banner (singleton) ----
const PROMO_FIELDS = [
  'eyebrow', 'title', 'subtitle', 'imageUrl', 'endDate',
  'primaryCtaText', 'primaryCtaHref', 'secondaryCtaText', 'secondaryCtaHref',
  'isActive',
];
adminRouter.put('/promo', async (req, res, next) => {
  try {
    const current = await getOrInitPromo();
    const data = pick(req.body, PROMO_FIELDS);
    if ('endDate' in data) {
      data.endDate = data.endDate ? new Date(data.endDate) : null;
    }
    const updated = await prisma.landingPromoBanner.update({ where: { id: current.id }, data });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ---- Trust items CRUD ----
const TRUST_FIELDS = ['title', 'subtitle', 'iconName', 'displayOrder', 'isActive'];

adminRouter.post('/trust-items', async (req, res, next) => {
  try {
    const data = pick(req.body, TRUST_FIELDS);
    if (!data.title || !data.subtitle) {
      return res.status(400).json({ error: 'title and subtitle are required' });
    }
    const item = await prisma.landingTrustItem.create({ data });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/trust-items/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = pick(req.body, TRUST_FIELDS);
    const item = await prisma.landingTrustItem.update({ where: { id }, data });
    res.json(item);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Trust item not found' });
    next(err);
  }
});

adminRouter.delete('/trust-items/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.landingTrustItem.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Trust item not found' });
    next(err);
  }
});

// ---- Featured products CRUD ----
const FEATURED_FIELDS = ['section', 'productSlug', 'displayOrder', 'isActive'];
const VALID_SECTIONS = new Set(['featured', 'deals']);

adminRouter.post('/featured-products', async (req, res, next) => {
  try {
    const data = pick(req.body, FEATURED_FIELDS);
    if (!VALID_SECTIONS.has(data.section)) {
      return res.status(400).json({ error: 'section must be "featured" or "deals"' });
    }
    if (!data.productSlug) {
      return res.status(400).json({ error: 'productSlug is required' });
    }
    const item = await prisma.landingFeaturedProduct.create({ data });
    res.json(item);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Product already in this section' });
    }
    next(err);
  }
});

adminRouter.put('/featured-products/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = pick(req.body, FEATURED_FIELDS);
    if (data.section && !VALID_SECTIONS.has(data.section)) {
      return res.status(400).json({ error: 'section must be "featured" or "deals"' });
    }
    const item = await prisma.landingFeaturedProduct.update({ where: { id }, data });
    res.json(item);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Featured product not found' });
    next(err);
  }
});

adminRouter.delete('/featured-products/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.landingFeaturedProduct.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Featured product not found' });
    next(err);
  }
});

// ---- Categories CRUD ----
const CATEGORY_FIELDS = [
  'slug', 'name', 'shortName', 'icon', 'tone', 'description',
  'productCount', 'filters', 'displayOrder', 'isActive',
];
const VALID_ICONS = new Set(['wheat', 'soup', 'coffee', 'mountain', 'sun', 'palmtree', 'home', 'gift', 'tag', 'compass']);

adminRouter.get('/categories', async (_req, res, next) => {
  try {
    const items = await prisma.landingCategory.findMany({ orderBy: { displayOrder: 'asc' } });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/categories', async (req, res, next) => {
  try {
    const data = pick(req.body, CATEGORY_FIELDS);
    if (!data.slug || !data.name) {
      return res.status(400).json({ error: 'slug and name are required' });
    }
    if (data.icon && !VALID_ICONS.has(data.icon)) {
      return res.status(400).json({ error: 'Invalid icon' });
    }
    if (data.tone && !VALID_TONES.has(data.tone)) {
      return res.status(400).json({ error: 'Invalid tone' });
    }
    if ('productCount' in data) data.productCount = parseInt(data.productCount, 10) || 0;
    if ('displayOrder' in data) data.displayOrder = parseInt(data.displayOrder, 10) || 0;
    const item = await prisma.landingCategory.create({ data });
    res.json(item);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Slug already exists' });
    next(err);
  }
});

adminRouter.put('/categories/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = pick(req.body, CATEGORY_FIELDS);
    if (data.icon && !VALID_ICONS.has(data.icon)) {
      return res.status(400).json({ error: 'Invalid icon' });
    }
    if (data.tone && !VALID_TONES.has(data.tone)) {
      return res.status(400).json({ error: 'Invalid tone' });
    }
    if ('productCount' in data) data.productCount = parseInt(data.productCount, 10) || 0;
    if ('displayOrder' in data) data.displayOrder = parseInt(data.displayOrder, 10) || 0;
    const item = await prisma.landingCategory.update({ where: { id }, data });
    res.json(item);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Category not found' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Slug already exists' });
    next(err);
  }
});

adminRouter.delete('/categories/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.landingCategory.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Category not found' });
    next(err);
  }
});

// ---- Catalog products CRUD ----
const PRODUCT_FIELDS = [
  'slug', 'categorySlug', 'name', 'art', 'tone', 'price', 'was',
  'rating', 'sold', 'region', 'verified', 'badges', 'imageUrl',
  'brand', 'origin', 'weight', 'certifications', 'distributor', 'description', 'thumbs',
  'isActive', 'displayOrder',
];
const VALID_TONES = new Set(['paper', 'red', 'olive', 'gold']);

function normalizeProductPayload(body) {
  const data = pick(body, PRODUCT_FIELDS);
  if ('price' in data) data.price = Math.round(Number(data.price) || 0);
  if ('was' in data) data.was = data.was === null || data.was === '' ? null : Math.round(Number(data.was));
  if ('rating' in data) data.rating = Number(data.rating) || 0;
  if ('displayOrder' in data) data.displayOrder = parseInt(data.displayOrder, 10) || 0;
  if (data.tone && !VALID_TONES.has(data.tone)) {
    return { error: 'tone must be one of: paper, red, olive, gold' };
  }
  return { data };
}

adminRouter.get('/products', async (req, res, next) => {
  try {
    const { search = '', category = '', page = '1', limit = '50' } = req.query;
    const pageN = Math.max(1, parseInt(page, 10) || 1);
    const limitN = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { region: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.categorySlug = category;

    const [items, total] = await Promise.all([
      prisma.landingProduct.findMany({
        where,
        orderBy: [{ categorySlug: 'asc' }, { displayOrder: 'asc' }, { id: 'asc' }],
        skip: (pageN - 1) * limitN,
        take: limitN,
      }),
      prisma.landingProduct.count({ where }),
    ]);
    res.json({ items, total, page: pageN, limit: limitN });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/products', async (req, res, next) => {
  try {
    const r = normalizeProductPayload(req.body);
    if (r.error) return res.status(400).json({ error: r.error });
    if (!r.data.slug || !r.data.name || !r.data.categorySlug) {
      return res.status(400).json({ error: 'slug, name, categorySlug are required' });
    }
    const item = await prisma.landingProduct.create({ data: r.data });
    res.json(item);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Slug already exists' });
    next(err);
  }
});

adminRouter.put('/products/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const r = normalizeProductPayload(req.body);
    if (r.error) return res.status(400).json({ error: r.error });
    const item = await prisma.landingProduct.update({ where: { id }, data: r.data });
    res.json(item);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Product not found' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Slug already exists' });
    next(err);
  }
});

adminRouter.delete('/products/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.landingProduct.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Product not found' });
    next(err);
  }
});

module.exports = { publicRouter, adminRouter };
