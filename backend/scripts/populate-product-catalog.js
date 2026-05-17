/**
 * Populate product catalog with region, warehouse, supplier, and variant data.
 *
 * One-off script for v3.2 — assigns every existing Product to:
 *   - a region (BAC | TRUNG | NAM) — detected from name if possible, else random
 *   - a warehouse (1 of 3 hardcoded HN warehouses)
 *   - a default ProductVariant (1 per product) if missing
 *   - a SupplierProduct link to the region-matching supplier
 *
 * Idempotent: re-running upserts warehouses/suppliers and only fills missing
 * region/warehouseId/variant/supplier_product rows.
 *
 * Usage:  cd backend && node scripts/populate-product-catalog.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ---------- region detection ----------

// VN-language → no diacritics, lowercase. Map keyword → region code.
const REGION_KEYWORDS = {
  BAC: [
    'ha noi', 'hanoi', 'sapa', 'sa pa', 'bac giang', 'bac ninh', 'hai phong',
    'hai duong', 'nam dinh', 'ninh binh', 'thanh hoa', 'nghe an', 'ha tinh',
    'quang ninh', 'cao bang', 'yen bai', 'tuyen quang', 'ha giang', 'son la',
    'hoa binh', 'phu tho', 'vinh phuc', 'thai nguyen', 'lao cai', 'bac kan',
    'lang son', 'dien bien', 'lai chau', 'hung yen', 'ha nam', 'thai binh',
    'mien bac',
  ],
  TRUNG: [
    'hue', 'da nang', 'danang', 'quang nam', 'quang ngai', 'binh dinh',
    'phu yen', 'khanh hoa', 'nha trang', 'quy nhon', 'hoi an', 'quang binh',
    'quang tri', 'dak lak', 'dak nong', 'gia lai', 'kon tum', 'lam dong',
    'da lat', 'dalat', 'buon me thuot', 'pleiku', 'ninh thuan', 'phan thiet',
    'binh thuan', 'mien trung',
  ],
  NAM: [
    'sai gon', 'saigon', 'tphcm', 'tp hcm', 'ho chi minh', 'st25', 'soc trang',
    'bac lieu', 'ca mau', 'can tho', 'an giang', 'kien giang', 'phu quoc',
    'hau giang', 'vinh long', 'dong thap', 'tien giang', 'ben tre', 'tra vinh',
    'long an', 'tay ninh', 'binh phuoc', 'vung tau', 'bien hoa', 'dong nai',
    'binh duong', 'mien nam',
  ],
};

function normalize(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, (m) => (m === 'đ' ? 'd' : 'D'))
    .toLowerCase();
}

function detectRegion(name) {
  const n = normalize(name);
  for (const [region, keywords] of Object.entries(REGION_KEYWORDS)) {
    for (const kw of keywords) {
      if (n.includes(kw)) return region;
    }
  }
  return null;
}

// Deterministic pseudo-random based on product id (so re-runs produce same
// assignment for products that didn't get a region from name detection).
function seededPick(seed, arr) {
  // simple LCG
  const x = (seed * 9301 + 49297) % 233280;
  return arr[Math.abs(x) % arr.length];
}

// ---------- main ----------

async function main() {
  console.log('=== v3.2 populate-product-catalog ===\n');

  // 1) Upsert 3 warehouses (Hà Nội)
  const warehouses = await Promise.all([
    prisma.warehouse.upsert({
      where: { code: 'LLQ' },
      update: {},
      create: { code: 'LLQ', name: 'Kho Lạc Long Quân', address: '555 Lạc Long Quân, Tây Hồ, Hà Nội' },
    }),
    prisma.warehouse.upsert({
      where: { code: 'TC' },
      update: {},
      create: { code: 'TC',  name: 'Kho Times City',     address: 'Times City, 458 Minh Khai, Hai Bà Trưng, Hà Nội' },
    }),
    prisma.warehouse.upsert({
      where: { code: 'NTS' },
      update: {},
      create: { code: 'NTS', name: 'Kho Ngã Tư Sở',     address: 'Ngã Tư Sở, Thanh Xuân, Hà Nội' },
    }),
  ]);
  console.log(`[warehouses] ${warehouses.length} warehouses upserted:`);
  warehouses.forEach((w) => console.log(`  [${w.id}] ${w.code} — ${w.name}`));

  // 2) Upsert 3 suppliers (one per region)
  const supplierData = [
    { region: 'BAC',   name: 'HKD Nông sản Miền Bắc',  address: 'KCN Bắc Thăng Long, Hà Nội',          taxCode: 'CCB-SUP-BAC' },
    { region: 'TRUNG', name: 'HKD Đặc sản Miền Trung', address: 'KCN Hòa Khánh, Đà Nẵng',              taxCode: 'CCB-SUP-TRUNG' },
    { region: 'NAM',   name: 'HKD Nông sản Miền Nam',  address: 'KCN Tân Bình, TP. Hồ Chí Minh',       taxCode: 'CCB-SUP-NAM' },
  ];
  const suppliers = {};
  for (const sd of supplierData) {
    const s = await prisma.supplier.upsert({
      where: { taxCode: sd.taxCode },
      update: {},
      create: {
        name: sd.name,
        type: 'ccb_household',
        taxCode: sd.taxCode,
        address: sd.address,
        contactName: 'Đại diện HKD',
        contactPhone: '0900000000',
        isActive: true,
      },
    });
    suppliers[sd.region] = s;
  }
  console.log(`\n[suppliers] 3 suppliers upserted:`);
  Object.entries(suppliers).forEach(([r, s]) => console.log(`  [${s.id}] ${r} → ${s.name}`));

  // 3) For each product: detect region, assign warehouse, create variant, create supplier_product
  const products = await prisma.product.findMany({ include: { variants: true } });
  console.log(`\n[products] processing ${products.length}…\n`);

  const stats = { BAC: 0, TRUNG: 0, NAM: 0, warehouseDist: { LLQ: 0, TC: 0, NTS: 0 } };

  for (const p of products) {
    let region = p.region || detectRegion(p.name);
    if (!region) {
      region = seededPick(p.id, ['BAC', 'TRUNG', 'NAM']);
    }
    stats[region]++;

    const wh = p.warehouseId
      ? warehouses.find((w) => w.id === p.warehouseId) || seededPick(p.id + 7, warehouses)
      : seededPick(p.id + 7, warehouses);
    stats.warehouseDist[wh.code]++;

    // Update product with region + warehouse
    await prisma.product.update({
      where: { id: p.id },
      data: { region, warehouseId: wh.id },
    });

    // Ensure at least one variant exists
    let variant = p.variants[0];
    if (!variant) {
      const sku = `SKU-AUTO-${p.id}`;
      variant = await prisma.productVariant.create({
        data: {
          productId: p.id,
          sku,
          name: p.name,
          unit: p.unit,
          basePrice: p.price,
          cogsPct: p.cogsPct,
          status: 'ACTIVE',
          sortOrder: 0,
        },
      });
    }

    // Link variant to region-matching supplier (idempotent via unique constraint)
    const supplier = suppliers[region];
    const costPerUnit = Math.round(Number(p.price) * Number(p.cogsPct));
    const validFrom = new Date('2026-01-01T00:00:00Z');
    await prisma.supplierProduct.upsert({
      where: {
        supplierId_variantId_validFrom: {
          supplierId: supplier.id,
          variantId: variant.id,
          validFrom,
        },
      },
      update: { costPerUnit },
      create: {
        supplierId: supplier.id,
        variantId: variant.id,
        costPerUnit,
        validFrom,
        isPreferred: true,
        minimumOrderQty: 1,
      },
    });

    console.log(
      `  [${String(p.id).padStart(3)}] ${p.name.padEnd(42)} → region=${region.padEnd(5)} kho=${wh.code.padEnd(3)} variant=${variant.sku} supplier=${supplier.name}`
    );
  }

  console.log(`\n[stats] region:`, stats);

  await prisma.$disconnect();
  console.log('\nDone.');
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
