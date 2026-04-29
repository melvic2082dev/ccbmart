// One-shot seed: copy hardcoded CATEGORIES from frontend/categories.ts → DB.
// Run: npx tsx scripts/seed-landing-categories.ts (from backend/)
// Idempotent — uses upsert on slug.

import { PrismaClient } from '@prisma/client';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { CATEGORIES } from '../../frontend/src/components/landing/categories';

const prisma = new PrismaClient();

type SeedCategory = {
  slug: string;
  name: string;
  shortName?: string;
  icon: string;
  tone: string;
  description: string;
  productCount: number;
  filters: { regions: { label: string; count: number; checked?: boolean }[] };
};

async function main() {
  console.log(`Seeding ${CATEGORIES.length} categories...`);
  let created = 0, updated = 0;

  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = CATEGORIES[i] as SeedCategory;
    const data = {
      slug: c.slug,
      name: c.name,
      shortName: c.shortName ?? null,
      icon: c.icon,
      tone: c.tone,
      description: c.description,
      productCount: c.productCount ?? 0,
      filters: c.filters as object,
      displayOrder: i,
      isActive: true,
    };

    const existing = await prisma.landingCategory.findUnique({ where: { slug: c.slug } });
    if (existing) {
      await prisma.landingCategory.update({ where: { slug: c.slug }, data });
      updated++;
    } else {
      await prisma.landingCategory.create({ data });
      created++;
    }
  }

  console.log(`Done. created=${created} updated=${updated}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
