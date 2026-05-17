/**
 * One-off: reset toàn bộ catalog theo yêu cầu của user.
 *
 *   - Xoá sạch products + variants + batches + supplier_products + transaction_items
 *     + inventory_warnings (cascade thủ công theo đúng thứ tự FK).
 *   - Rename kho LLQ → "Kho Hikari" (giữ address 555 Lạc Long Quân).
 *   - Update địa chỉ kho NTS → "137 Nguyễn Ngọc Vũ, Thanh Xuân, Hà Nội".
 *   - Tạo 7 sản phẩm mới (chiết khấu 65% → cogsPct=0.35 trừ nước ép cà chua).
 *   - Mỗi product 1 variant (SKU = CCB-{slug}).
 *   - Link variant → supplier theo region (BAC).
 *   - Tạo 1 lô khởi điểm cho mỗi variant (qty 200, hạn 12 tháng).
 *
 * Usage:  cd backend && node scripts/reset-catalog.js
 *
 * Idempotent: nếu đã chạy rồi (catalog đã ở trạng thái mong muốn), chạy lại
 * vẫn ra cùng kết quả (re-deletes + re-creates).
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function slugify(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const COGS_DEFAULT = 0.35; // giá nhập = 35% giá bán (chiết khấu 65%)

const NEW_PRODUCTS = [
  { name: 'Canxi',                                    price: 320_000, cogsPct: COGS_DEFAULT, category: 'TPCN',   unit: 'hộp', warehouseCode: 'NTS' },
  { name: 'Q10',                                      price: 690_000, cogsPct: COGS_DEFAULT, category: 'TPCN',   unit: 'hộp', warehouseCode: 'NTS' },
  { name: 'Nước uống collagen trà hoa vàng',          price: 690_000, cogsPct: COGS_DEFAULT, category: 'TPCN',   unit: 'hộp', warehouseCode: 'NTS' },
  { name: 'Xịt khoáng dưỡng ẩm',                       price: 120_000, cogsPct: COGS_DEFAULT, category: 'MyPham', unit: 'chai', warehouseCode: 'NTS' },
  { name: 'Xịt họng',                                 price: 120_000, cogsPct: COGS_DEFAULT, category: 'TPCN',   unit: 'chai', warehouseCode: 'NTS' },
  { name: 'Xịt khoáng body hoa hồng',                 price: 120_000, cogsPct: COGS_DEFAULT, category: 'MyPham', unit: 'chai', warehouseCode: 'NTS' },
  // Nước ép cà chua: giá nhập 12k, giá bán 18k → cogsPct = 12/18 ≈ 0.6667
  { name: 'Nước ép cà chua',                          price:  18_000, cogsPct: 12_000 / 18_000, category: 'NS', unit: 'hộp', warehouseCode: 'LLQ' },
];

async function main() {
  console.log('=== Reset catalog ===\n');

  // ---------- Step 1: Update warehouses ----------
  console.log('[1] Update warehouses');
  // LLQ → "Kho Hikari" (giữ address 555 LLQ)
  await prisma.warehouse.update({
    where: { code: 'LLQ' },
    data: { name: 'Kho Hikari', address: '555 Lạc Long Quân, Tây Hồ, Hà Nội' },
  });
  // NTS → địa chỉ mới
  await prisma.warehouse.update({
    where: { code: 'NTS' },
    data: { name: 'Kho Ngã Tư Sở', address: '137 Nguyễn Ngọc Vũ, Trung Hoà, Cầu Giấy, Hà Nội' },
  });
  const whs = await prisma.warehouse.findMany({ orderBy: { id: 'asc' } });
  whs.forEach((w) => console.log(`    [${w.id}] ${w.code} — ${w.name} (${w.address})`));

  // ---------- Step 2: Wipe product-related data ----------
  console.log('\n[2] Wipe existing product data');
  // Order matters: FK chain
  const r1 = await prisma.transactionItem.deleteMany({});
  console.log(`    transactionItem deleted: ${r1.count}`);
  const r2 = await prisma.inventoryWarning.deleteMany({});
  console.log(`    inventoryWarning deleted: ${r2.count}`);
  const r3 = await prisma.supplierProduct.deleteMany({});
  console.log(`    supplierProduct deleted: ${r3.count}`);
  const r4 = await prisma.inventoryBatch.deleteMany({});
  console.log(`    inventoryBatch deleted: ${r4.count}`);
  const r5 = await prisma.productVariant.deleteMany({});
  console.log(`    productVariant deleted: ${r5.count}`);
  const r6 = await prisma.product.deleteMany({});
  console.log(`    product deleted: ${r6.count}`);

  // ---------- Step 3: Create new products ----------
  console.log('\n[3] Create new products');
  const supplierBac = await prisma.supplier.findFirst({ where: { taxCode: 'CCB-SUP-BAC' } });
  if (!supplierBac) throw new Error('Supplier CCB-SUP-BAC not found. Run populate-product-catalog.js first.');

  const whByCode = {};
  for (const w of whs) whByCode[w.code] = w;

  const validFrom = new Date('2026-01-01T00:00:00Z');
  const expDate = new Date(Date.now() + 365 * 86400000);
  const mfgDate = new Date(Date.now() - 7 * 86400000);

  for (const p of NEW_PRODUCTS) {
    const wh = whByCode[p.warehouseCode];
    const slug = slugify(p.name);
    const cost = Math.round(p.price * p.cogsPct);

    const product = await prisma.product.create({
      data: {
        name: p.name,
        slug,
        category: p.category,
        unit: p.unit,
        price: p.price,
        cogsPct: p.cogsPct,
        status: 'ACTIVE',
        region: 'BAC', // cả 2 kho đều ở Hà Nội
        warehouseId: wh.id,
      },
    });

    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `CCB-${slug.toUpperCase()}`.slice(0, 64),
        name: p.name,
        unit: p.unit,
        basePrice: p.price,
        cogsPct: p.cogsPct,
        status: 'ACTIVE',
        sortOrder: 0,
      },
    });

    await prisma.supplierProduct.create({
      data: {
        supplierId: supplierBac.id,
        variantId: variant.id,
        costPerUnit: cost,
        validFrom,
        isPreferred: true,
        minimumOrderQty: 1,
      },
    });

    await prisma.inventoryBatch.create({
      data: {
        variantId: variant.id,
        supplierId: supplierBac.id,
        batchNo: `LOT-2026-INIT-${product.id}`,
        qtyReceived: 200,
        qtyAvailable: 200,
        costPerUnit: cost,
        mfgDate,
        expDate,
        status: 'ACTIVE',
      },
    });

    console.log(
      `    #${product.id} ${p.name.padEnd(38)} giá=${p.price.toString().padStart(7)} cost=${cost.toString().padStart(6)} kho=${wh.code}  variant=${variant.sku}`
    );
  }

  console.log('\nDone.');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
