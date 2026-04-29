// Seed initial demo data for community-focused homepage blocks.
// Run: npx tsx scripts/seed-landing-community.ts (from backend/)
// Idempotent for the singleton (whyUs auto-inits via API).
// For lists: only inserts if table is empty so re-running won't dup.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COMMUNITY_PHOTOS = [
  { caption: 'Trao 50 phần quà cho gia đình CCB khó khăn dịp 27/7 — Hà Giang', impactValue: '50', impactLabel: 'Suất quà 27/7', displayOrder: 0 },
  { caption: 'Đoàn CCB Mart thăm và tặng vật tư y tế tại bệnh viện 175', impactValue: '12.000.000 ₫', impactLabel: 'Vật tư y tế', displayOrder: 1 },
  { caption: 'Đóng gói đặc sản tại HTX CCB Sóc Trăng — vụ gạo ST25 mới', impactValue: '2.4 tấn', impactLabel: 'Gạo bao tiêu', displayOrder: 2 },
  { caption: 'Họp mặt CCB Quân khu 7 — kết nối nhà cung cấp đặc sản miền Đông', impactValue: '38', impactLabel: 'CCB tham dự', displayOrder: 3 },
];

const NOW = new Date();
const monthsAgo = (n: number) => {
  const d = new Date(NOW);
  d.setMonth(d.getMonth() - n);
  return d;
};

const FUND_ENTRIES = [
  { occurredAt: monthsAgo(0), type: 'in', amount: 18_500_000, description: 'Trích 1% doanh thu tháng 4 (đơn online)', balance: 84_300_000, displayOrder: 0 },
  { occurredAt: monthsAgo(0), type: 'out', amount: 12_000_000, description: 'Trao 12 phần quà CCB Hà Giang (300k/suất)', balance: 65_800_000, displayOrder: 1 },
  { occurredAt: monthsAgo(1), type: 'in', amount: 22_100_000, description: 'Trích 1% doanh thu tháng 3', balance: 77_800_000, displayOrder: 2 },
  { occurredAt: monthsAgo(1), type: 'out', amount: 15_000_000, description: 'Hỗ trợ chi phí mổ tim CCB Lê Văn N. — Đắk Lắk', balance: 55_700_000, displayOrder: 3 },
  { occurredAt: monthsAgo(2), type: 'in', amount: 19_300_000, description: 'Trích 1% doanh thu tháng 2', balance: 70_700_000, displayOrder: 4 },
  { occurredAt: monthsAgo(3), type: 'out', amount: 8_500_000, description: 'Quà Tết 17 hộ CCB neo đơn (500k/hộ)', balance: 51_400_000, displayOrder: 5 },
];

const TESTIMONIALS = [
  {
    name: 'Ông Trần Văn Hùng',
    location: 'Hải Phòng',
    unit: 'CCB Quân khu 3',
    body: 'CCB Mart giúp tôi bán được chè Tân Cương do chính tay vườn nhà làm ra, tới tận Hà Nội và Sài Gòn. Bà con tin tưởng vì có thương hiệu đồng đội mình đảm bảo.',
    verified: true, displayOrder: 0,
  },
  {
    name: 'Bà Nguyễn Thị Lan',
    location: 'Đà Nẵng',
    unit: 'Vợ liệt sĩ — CCB',
    body: 'Mỗi đơn hàng trên CCB Mart đều ghi rõ 1% trích quỹ. Tháng trước nhà tôi nhận được phần hỗ trợ lúc đứa cháu nội ốm — không ngờ lại chính từ khoản tiền đó.',
    verified: true, displayOrder: 1,
  },
  {
    name: 'Ông Lê Đức Minh',
    location: 'Sóc Trăng',
    unit: 'Chủ nhiệm HTX CCB',
    body: 'Mười năm trước bà con trồng lúa ST25 phải tự tìm đầu ra. Bây giờ qua CCB Mart, mỗi vụ mùa đều có đơn đặt trước. Đồng đội giúp đồng đội.',
    verified: true, displayOrder: 2,
  },
];

async function main() {
  // whyUs auto-inits via API on first GET — skip here.

  const existingPhotos = await prisma.landingCommunityPhoto.count();
  if (existingPhotos === 0) {
    await prisma.landingCommunityPhoto.createMany({ data: COMMUNITY_PHOTOS });
    console.log(`+ Seeded ${COMMUNITY_PHOTOS.length} community photos`);
  } else {
    console.log(`= Community photos already has ${existingPhotos} rows, skip`);
  }

  const existingFund = await prisma.landingFundEntry.count();
  if (existingFund === 0) {
    await prisma.landingFundEntry.createMany({ data: FUND_ENTRIES });
    console.log(`+ Seeded ${FUND_ENTRIES.length} fund entries`);
  } else {
    console.log(`= Fund entries already has ${existingFund} rows, skip`);
  }

  const existingTestimonials = await prisma.landingTestimonial.count();
  if (existingTestimonials === 0) {
    await prisma.landingTestimonial.createMany({ data: TESTIMONIALS });
    console.log(`+ Seeded ${TESTIMONIALS.length} testimonials`);
  } else {
    console.log(`= Testimonials already has ${existingTestimonials} rows, skip`);
  }

  // Demo producer info on a few hero products (first 6 products across categories).
  // Idempotent — only updates if producerName is null.
  const demoProducers = [
    { slug: 'gao-st25-soc-trang', producerName: 'Ông Hồ Quang Cua', producerHometown: 'Sóc Trăng', producerUnit: 'CCB Quân khu 9', producerContribution: 1870 },
    { slug: 'nuoc-mam-phu-quoc', producerName: 'Ông Nguyễn Văn Thành', producerHometown: 'Phú Quốc, Kiên Giang', producerUnit: 'CCB Hải quân Vùng 5', producerContribution: 1250 },
    { slug: 'tra-shan-tuyet-ha-giang', producerName: 'Ông Lý Văn Páo', producerHometown: 'Hoàng Su Phì, Hà Giang', producerUnit: 'CCB Quân khu 2', producerContribution: 2400 },
    { slug: 'che-tan-cuong-thai-nguyen', producerName: 'Ông Hoàng Bình', producerHometown: 'Tân Cương, Thái Nguyên', producerUnit: 'CCB Quân đoàn 1', producerContribution: 1100 },
    { slug: 'ca-phe-buon-ma-thuot', producerName: 'Ông Y Tul Niê', producerHometown: 'Buôn Ma Thuột, Đắk Lắk', producerUnit: 'CCB Quân khu 5', producerContribution: 1320 },
    { slug: 'mat-ong-rung-u-minh', producerName: 'Ông Trần Thanh Hải', producerHometown: 'U Minh, Cà Mau', producerUnit: 'CCB Quân khu 9', producerContribution: 1450 },
  ];
  let producerUpdated = 0;
  for (const p of demoProducers) {
    const existing = await prisma.landingProduct.findUnique({ where: { slug: p.slug } });
    if (existing && !existing.producerName) {
      await prisma.landingProduct.update({
        where: { slug: p.slug },
        data: {
          producerName: p.producerName,
          producerHometown: p.producerHometown,
          producerUnit: p.producerUnit,
          producerContribution: p.producerContribution,
        },
      });
      producerUpdated++;
    }
  }
  console.log(`+ Set producer info on ${producerUpdated} products`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
