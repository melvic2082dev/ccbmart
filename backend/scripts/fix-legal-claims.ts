/**
 * One-shot script to update CMS DB rows that still contain the old
 * "Hội CCB Việt Nam xác nhận" / "Hội CCB Việt Nam bảo trợ" /
 * "cộng đồng Cựu Chiến Binh Việt Nam" copy. After this we are
 * compliant: CCB Mart is a project of Ban liên lạc Trung đoàn E29,
 * not Hội CCB Việt Nam.
 *
 * Usage (local):  npx tsx scripts/fix-legal-claims.ts
 * Usage (prod):   set DATABASE_URL to prod and run the same.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  let touched = 0;

  // 1) LandingFooter — verifiedBadge + copyright + address
  const footers = await prisma.landingFooter.findMany();
  for (const f of footers) {
    const updates: { verifiedBadge?: string; copyright?: string; addressLine1?: string; addressLine2?: string } = {};
    if (
      f.verifiedBadge === 'Hội CCB Việt Nam xác nhận' ||
      /Hội CCB|Hội Cựu Chiến Binh/.test(f.verifiedBadge ?? '')
    ) {
      updates.verifiedBadge = 'Ban liên lạc Trung đoàn E29 vận hành';
    }
    if (
      /cộng đồng Cựu Chiến Binh Việt Nam|Hệ thống bán lẻ của cộng đồng/.test(f.copyright ?? '')
    ) {
      updates.copyright = '© 2026 CCB Mart — Một dự án của Ban liên lạc Trung đoàn E29';
    }
    if (/Lê Đức Thọ|Mỹ Đình|Nam Từ Liêm/.test(`${f.addressLine1 ?? ''} ${f.addressLine2 ?? ''}`)) {
      updates.addressLine1 = 'Số 555 Lạc Long Quân';
      updates.addressLine2 = 'Tây Hồ, Hà Nội';
    }
    if (Object.keys(updates).length > 0) {
      await prisma.landingFooter.update({ where: { id: f.id }, data: updates });
      console.log(`✓ Updated LandingFooter#${f.id}:`, updates);
      touched++;
    }
  }

  // 2) LandingPromo — subtitle + secondaryCtaText
  const promos = await prisma.landingPromoBanner.findMany();
  for (const p of promos) {
    const updates: { subtitle?: string; secondaryCtaText?: string } = {};
    if (/Hội viên Hội Cựu Chiến Binh|Hội Cựu Chiến Binh Việt Nam/.test(p.subtitle ?? '')) {
      updates.subtitle = 'Từ 20/4 đến 02/5/2026. Ưu đãi đặc biệt cho thành viên CCB Mart và đồng đội Cựu Chiến Binh khi đặt hàng trực tuyến.';
    }
    if (p.secondaryCtaText === 'Đăng ký Hội viên') {
      updates.secondaryCtaText = 'Đăng ký thành viên';
    }
    if (Object.keys(updates).length > 0) {
      await prisma.landingPromoBanner.update({ where: { id: p.id }, data: updates });
      console.log(`✓ Updated LandingPromo#${p.id}:`, updates);
      touched++;
    }
  }

  // 3) LandingProduct — certifications text + description
  const products = await prisma.landingProduct.findMany();
  for (const p of products) {
    const updates: { certifications?: string; description?: string } = {};
    if (p.certifications && /CCB xác nhận|Hội CCB/.test(p.certifications)) {
      updates.certifications = p.certifications.replace(/Hội CCB xác nhận/g, 'đồng đội tin dùng').replace(/CCB xác nhận/g, 'đồng đội tin dùng');
    }
    if (p.description && /Hội Cựu Chiến Binh|hội viên Hội Cựu Chiến/.test(p.description)) {
      updates.description = p.description
        .replace(/hội viên Hội Cựu Chiến Binh/g, 'các Cựu Chiến Binh')
        .replace(/Hội Cựu Chiến Binh/g, 'đồng đội Cựu Chiến Binh');
    }
    if (Object.keys(updates).length > 0) {
      await prisma.landingProduct.update({ where: { id: p.id }, data: updates });
      console.log(`✓ Updated LandingProduct#${p.id} (${p.slug})`);
      touched++;
    }
  }

  console.log(`\n✓ Done. ${touched} rows updated.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
