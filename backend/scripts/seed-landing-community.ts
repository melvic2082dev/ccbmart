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

// Concrete Apr 2026 narrative per design spec:
//   Thu  Apr 2026: 2.450.000 ₫ (trích 1% doanh thu)
//   Chi  Apr 2026: 2 suất quà Hà Giang (600k) + Hỗ trợ phẫu thuật Nghệ An (1.400k) = 2.000k
//   Còn  cho May 2026: 450.000 ₫
// Running balance assumes a 1.000.000 ₫ carry-over opening at start of Feb 2026.
const FUND_ENTRIES = [
  // April 2026 (current month) — newest first
  { occurredAt: new Date('2026-04-25T09:00:00.000Z'), type: 'in', amount: 2_450_000, description: 'Trích 1% doanh thu tháng 4/2026 (đơn online + showroom)', balance: 3_230_000, displayOrder: 0 },
  { occurredAt: new Date('2026-04-18T10:30:00.000Z'), type: 'out', amount: 1_400_000, description: 'Hỗ trợ chi phí phẫu thuật CCB tại Nghệ An', balance: 780_000, displayOrder: 1 },
  { occurredAt: new Date('2026-04-08T08:00:00.000Z'), type: 'out', amount: 600_000, description: 'Trao 2 suất quà CCB tại Hà Giang (300.000 ₫/suất)', balance: 2_180_000, displayOrder: 2 },
  // March 2026 history
  { occurredAt: new Date('2026-03-26T09:00:00.000Z'), type: 'in', amount: 2_180_000, description: 'Trích 1% doanh thu tháng 3/2026', balance: 2_780_000, displayOrder: 3 },
  { occurredAt: new Date('2026-03-15T10:00:00.000Z'), type: 'out', amount: 1_500_000, description: 'Hỗ trợ thuốc men CCB Lê Văn N. — Đắk Lắk', balance: 600_000, displayOrder: 4 },
  // February 2026 history
  { occurredAt: new Date('2026-02-28T09:00:00.000Z'), type: 'in', amount: 1_950_000, description: 'Trích 1% doanh thu tháng 2/2026', balance: 2_100_000, displayOrder: 5 },
  { occurredAt: new Date('2026-02-10T10:00:00.000Z'), type: 'out', amount: 850_000, description: 'Quà Tết 3 hộ CCB neo đơn (Cao Bằng, Lạng Sơn)', balance: 150_000, displayOrder: 6 },
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

  // Fund entries are curated monthly narrative — reseed to match the latest design spec.
  await prisma.landingFundEntry.deleteMany({});
  await prisma.landingFundEntry.createMany({ data: FUND_ENTRIES });
  console.log(`+ Reseeded ${FUND_ENTRIES.length} fund entries (Apr 2026 narrative)`);

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
