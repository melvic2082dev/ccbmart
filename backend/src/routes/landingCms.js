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
  title: 'CCB Mart — Nơi đồng đội gửi gắm tâm huyết',
  subtitle: 'Đặc sản từ tay lính — Mỗi đơn hàng là một nghĩa cử',
  imageUrl: null,
  primaryCtaText: 'Xem sản phẩm — Ủng hộ đồng đội',
  primaryCtaHref: '#san-pham',
  secondaryCtaText: 'Câu chuyện dự án',
  secondaryCtaHref: '/about',
  stat1Value: '2.400+',
  stat1Label: 'Nhà cung cấp Cựu Chiến Binh',
  stat2Value: '47',
  stat2Label: 'Gia đình CCB đã được hỗ trợ',
  stat3Value: '123 tr',
  stat3Label: 'Quỹ Vì đồng đội đã chi',
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

// ---- Defaults for new singleton/list blocks ----
const DEFAULT_WHY_US = {
  eyebrow: 'Câu chuyện CCB Mart',
  title: 'Tại sao chúng tôi làm dự án này?',
  body:
    'CCB Mart sinh ra từ trăn trở của những người lính trở về đời thường: nhiều đồng đội năm xưa nay tuổi đã cao, vẫn miệt mài làm nông, chăn nuôi, sản xuất đặc sản quê hương — nhưng đầu ra lại bấp bênh. Mỗi sản phẩm trên kệ hàng là một câu chuyện, mỗi đơn hàng là một nghĩa cử: 1% doanh thu được trích vào quỹ "Vì đồng đội" để hỗ trợ Cựu Chiến Binh khó khăn trên toàn quốc.',
  imageUrl: null,
  isActive: true,
};

async function getOrInitWhyUs() {
  let row = await prisma.landingWhyUs.findFirst({ orderBy: { id: 'asc' } });
  if (!row) row = await prisma.landingWhyUs.create({ data: DEFAULT_WHY_US });
  return row;
}

// ---- Public: GET full landing content ----
publicRouter.get('/content', async (_req, res, next) => {
  try {
    const [hero, promo, whyUs, trustItems, featured, products, categories, communityPhotos, fundEntries, testimonials] = await Promise.all([
      getOrInitHero(),
      getOrInitPromo(),
      getOrInitWhyUs(),
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
      prisma.landingCommunityPhoto.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
      }),
      prisma.landingFundEntry.findMany({
        where: { isActive: true },
        orderBy: { occurredAt: 'desc' },
        take: 12,
      }),
      prisma.landingTestimonial.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
      }),
    ]);
    res.json({ hero, promo, whyUs, trustItems, featured, products, categories, communityPhotos, fundEntries, testimonials });
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
    const [hero, promo, whyUs, trustItems, featured] = await Promise.all([
      getOrInitHero(),
      getOrInitPromo(),
      getOrInitWhyUs(),
      prisma.landingTrustItem.findMany({ orderBy: { displayOrder: 'asc' } }),
      prisma.landingFeaturedProduct.findMany({
        orderBy: [{ section: 'asc' }, { displayOrder: 'asc' }],
      }),
    ]);
    res.json({ hero, promo, whyUs, trustItems, featured });
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

// ---- Why-Us singleton ----
const WHY_US_FIELDS = ['eyebrow', 'title', 'body', 'imageUrl', 'isActive'];
adminRouter.put('/why-us', async (req, res, next) => {
  try {
    const current = await getOrInitWhyUs();
    const data = pick(req.body, WHY_US_FIELDS);
    const updated = await prisma.landingWhyUs.update({ where: { id: current.id }, data });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ---- Community photos CRUD ----
const COMMUNITY_PHOTO_FIELDS = ['imageUrl', 'caption', 'impactValue', 'impactLabel', 'displayOrder', 'isActive'];

adminRouter.get('/community-photos', async (_req, res, next) => {
  try {
    const items = await prisma.landingCommunityPhoto.findMany({ orderBy: { displayOrder: 'asc' } });
    res.json(items);
  } catch (err) { next(err); }
});

adminRouter.post('/community-photos', async (req, res, next) => {
  try {
    const data = pick(req.body, COMMUNITY_PHOTO_FIELDS);
    if (!data.caption) return res.status(400).json({ error: 'caption is required' });
    if ('displayOrder' in data) data.displayOrder = parseInt(data.displayOrder, 10) || 0;
    const item = await prisma.landingCommunityPhoto.create({ data });
    res.json(item);
  } catch (err) { next(err); }
});

adminRouter.put('/community-photos/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = pick(req.body, COMMUNITY_PHOTO_FIELDS);
    if ('displayOrder' in data) data.displayOrder = parseInt(data.displayOrder, 10) || 0;
    const item = await prisma.landingCommunityPhoto.update({ where: { id }, data });
    res.json(item);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Photo not found' });
    next(err);
  }
});

adminRouter.delete('/community-photos/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.landingCommunityPhoto.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Photo not found' });
    next(err);
  }
});

// ---- Fund entries CRUD ----
const FUND_FIELDS = ['occurredAt', 'type', 'amount', 'description', 'balance', 'displayOrder', 'isActive'];
const VALID_FUND_TYPES = new Set(['in', 'out']);

adminRouter.get('/fund-entries', async (_req, res, next) => {
  try {
    const items = await prisma.landingFundEntry.findMany({ orderBy: { occurredAt: 'desc' } });
    res.json(items);
  } catch (err) { next(err); }
});

function normalizeFundPayload(body) {
  const data = pick(body, FUND_FIELDS);
  if ('occurredAt' in data && data.occurredAt) data.occurredAt = new Date(data.occurredAt);
  if ('amount' in data) data.amount = parseInt(data.amount, 10) || 0;
  if ('balance' in data) data.balance = data.balance === null || data.balance === '' ? null : parseInt(data.balance, 10);
  if ('displayOrder' in data) data.displayOrder = parseInt(data.displayOrder, 10) || 0;
  if (data.type && !VALID_FUND_TYPES.has(data.type)) return { error: 'type must be "in" or "out"' };
  return { data };
}

adminRouter.post('/fund-entries', async (req, res, next) => {
  try {
    const r = normalizeFundPayload(req.body);
    if (r.error) return res.status(400).json({ error: r.error });
    if (!r.data.occurredAt || !r.data.type || !r.data.description) {
      return res.status(400).json({ error: 'occurredAt, type, description are required' });
    }
    const item = await prisma.landingFundEntry.create({ data: r.data });
    res.json(item);
  } catch (err) { next(err); }
});

adminRouter.put('/fund-entries/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const r = normalizeFundPayload(req.body);
    if (r.error) return res.status(400).json({ error: r.error });
    const item = await prisma.landingFundEntry.update({ where: { id }, data: r.data });
    res.json(item);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Entry not found' });
    next(err);
  }
});

adminRouter.delete('/fund-entries/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.landingFundEntry.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Entry not found' });
    next(err);
  }
});

// ---- Testimonials CRUD ----
const TESTIMONIAL_FIELDS = ['name', 'location', 'unit', 'body', 'photoUrl', 'verified', 'displayOrder', 'isActive'];

adminRouter.get('/testimonials', async (_req, res, next) => {
  try {
    const items = await prisma.landingTestimonial.findMany({ orderBy: { displayOrder: 'asc' } });
    res.json(items);
  } catch (err) { next(err); }
});

adminRouter.post('/testimonials', async (req, res, next) => {
  try {
    const data = pick(req.body, TESTIMONIAL_FIELDS);
    if (!data.name || !data.body) return res.status(400).json({ error: 'name and body are required' });
    if ('displayOrder' in data) data.displayOrder = parseInt(data.displayOrder, 10) || 0;
    const item = await prisma.landingTestimonial.create({ data });
    res.json(item);
  } catch (err) { next(err); }
});

adminRouter.put('/testimonials/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = pick(req.body, TESTIMONIAL_FIELDS);
    if ('displayOrder' in data) data.displayOrder = parseInt(data.displayOrder, 10) || 0;
    const item = await prisma.landingTestimonial.update({ where: { id }, data });
    res.json(item);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Testimonial not found' });
    next(err);
  }
});

adminRouter.delete('/testimonials/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.landingTestimonial.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Testimonial not found' });
    next(err);
  }
});

// ---- Catalog products CRUD ----
const PRODUCT_FIELDS = [
  'slug', 'categorySlug', 'name', 'art', 'tone', 'price', 'was',
  'rating', 'sold', 'region', 'verified', 'badges', 'imageUrl',
  'brand', 'origin', 'weight', 'certifications', 'distributor', 'description', 'thumbs',
  'producerName', 'producerHometown', 'producerUnit', 'producerContribution', 'producerPhotoUrl',
  'isActive', 'displayOrder',
];
const VALID_TONES = new Set(['paper', 'red', 'olive', 'gold']);

function normalizeProductPayload(body) {
  const data = pick(body, PRODUCT_FIELDS);
  if ('price' in data) data.price = Math.round(Number(data.price) || 0);
  if ('was' in data) data.was = data.was === null || data.was === '' ? null : Math.round(Number(data.was));
  if ('rating' in data) data.rating = Number(data.rating) || 0;
  if ('displayOrder' in data) data.displayOrder = parseInt(data.displayOrder, 10) || 0;
  if ('producerContribution' in data) {
    data.producerContribution = data.producerContribution === null || data.producerContribution === ''
      ? null : Math.round(Number(data.producerContribution));
  }
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
