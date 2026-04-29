// One-shot seed: copy hardcoded PRODUCTS from frontend/categories.ts → DB.
// Run: npx tsx scripts/seed-landing-products.ts (from backend/)
// Idempotent — uses upsert on slug. Safe to re-run.

import { PrismaClient } from '@prisma/client';
import path from 'path';

// Import directly from the frontend source — tsx strips types.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { PRODUCTS } from '../../frontend/src/components/landing/categories';

const prisma = new PrismaClient();

type SeedProduct = {
  slug: string;
  category: string;
  name: string;
  art?: string;
  tone?: string;
  price: number;
  was?: number;
  rating?: number;
  sold?: string;
  region?: string;
  verified?: boolean;
  badges?: { label: string; variant: string }[];
  brand?: string;
  origin?: string;
  weight?: string;
  certifications?: string;
  distributor?: string;
  description?: string;
  thumbs?: string[];
};

async function main() {
  console.log(`Seeding ${PRODUCTS.length} products from categories.ts...`);
  let created = 0, updated = 0, skipped = 0;

  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i] as SeedProduct;
    if (!p.slug || !p.category || !p.name) { skipped++; continue; }

    const data = {
      slug: p.slug,
      categorySlug: p.category,
      name: p.name,
      art: p.art ?? '',
      tone: p.tone ?? 'paper',
      price: Math.round(p.price ?? 0),
      was: p.was ? Math.round(p.was) : null,
      rating: p.rating ?? 4.7,
      sold: p.sold ?? '0',
      region: p.region ?? '',
      verified: p.verified ?? false,
      badges: p.badges ?? null,
      brand: p.brand ?? '—',
      origin: p.origin ?? '—',
      weight: p.weight ?? '—',
      certifications: p.certifications ?? '—',
      distributor: p.distributor ?? '—',
      description: p.description ?? '',
      thumbs: p.thumbs ?? ['Mặt trước', 'Đóng gói', 'Cận cảnh', 'Vùng nguyên liệu'],
      displayOrder: i,
      isActive: true,
    };

    const existing = await prisma.landingProduct.findUnique({ where: { slug: p.slug } });
    if (existing) {
      await prisma.landingProduct.update({ where: { slug: p.slug }, data });
      updated++;
    } else {
      await prisma.landingProduct.create({ data });
      created++;
    }
  }

  console.log(`Done. created=${created} updated=${updated} skipped=${skipped}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
