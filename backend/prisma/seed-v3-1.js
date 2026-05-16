/**
 * Standalone seed for v3.1 additions only (suppliers, variants, batches, leads).
 * Run: node prisma/seed-v3-1.js
 * Safe to re-run — uses upsert/skip-on-conflict patterns.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('[v3.1 seed] starting...');

  const allProducts = await prisma.product.findMany();
  if (allProducts.length === 0) {
    console.log('[v3.1 seed] No products — run main seed first.');
    return;
  }

  // Slugs + metadata for first 5 products
  for (const p of allProducts.slice(0, 5)) {
    if (!p.slug) {
      try {
        await prisma.product.update({
          where: { id: p.id },
          data: {
            slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) + '-' + p.id,
            brand: 'CCB Mart',
            origin: 'Việt Nam',
            description: `${p.name} - sản phẩm chất lượng cao từ hệ sinh thái CCB.`,
            status: 'ACTIVE',
          },
        });
      } catch (e) { /* skip */ }
    }
  }

  // Suppliers — upsert by tax code
  const supplierDefs = [
    { taxCode: 'HKD-001-2026', name: 'Hộ kinh doanh Nguyễn Văn A (CCB Sơn La)', type: 'ccb_household', contactPhone: '0912345678', address: 'Mộc Châu, Sơn La' },
    { taxCode: 'HKD-002-2026', name: 'Hộ kinh doanh Trần Văn B (CCB Đồng Tháp)', type: 'ccb_household', contactPhone: '0987654321', address: 'Cao Lãnh, Đồng Tháp' },
    { taxCode: '0301234567', name: 'CTY TNHH Phân phối Phương Nam', type: 'external', contactPhone: '0281234567', address: 'Quận 1, TP.HCM' },
  ];
  const suppliers = [];
  for (const sd of supplierDefs) {
    const s = await prisma.supplier.upsert({
      where: { taxCode: sd.taxCode },
      update: {},
      create: { ...sd, isActive: true },
    });
    suppliers.push(s);
  }
  console.log(`[v3.1 seed] ${suppliers.length} suppliers ready`);

  // Variants for first 3 NS/FMCG products
  const targets = allProducts.filter((p) => ['NS', 'FMCG'].includes(p.category)).slice(0, 3);
  let skuCounter = 1;
  let variantsCreated = 0;
  for (const p of targets) {
    for (const size of ['small', 'large']) {
      const sku = `SKU-${p.id}-${size}`;
      const existing = await prisma.productVariant.findUnique({ where: { sku } });
      if (existing) { skuCounter++; continue; }
      const multiplier = size === 'large' ? 1.8 : 1.0;
      const v = await prisma.productVariant.create({
        data: {
          productId: p.id,
          sku,
          name: `${p.name} — ${size === 'small' ? 'quy cách nhỏ' : 'quy cách lớn'}`,
          unit: p.unit,
          basePrice: Math.round(Number(p.price) * multiplier),
          cogsPct: Number(p.cogsPct),
          attributes: { size },
          status: 'ACTIVE',
          sortOrder: size === 'small' ? 1 : 2,
        },
      });
      variantsCreated++;

      // Batch
      const supplier = p.category === 'NS' ? suppliers[0] : suppliers[2];
      const cost = Math.round(Number(p.price) * multiplier * Number(p.cogsPct));
      const expDate = new Date(); expDate.setMonth(expDate.getMonth() + 6);
      const qty = size === 'small' ? 100 : 50;
      await prisma.inventoryBatch.create({
        data: {
          variantId: v.id,
          supplierId: supplier.id,
          batchNo: `B-${v.id}-001`,
          qtyReceived: qty, qtyAvailable: qty,
          costPerUnit: cost, expDate, status: 'ACTIVE',
        },
      });
    }
  }
  console.log(`[v3.1 seed] ${variantsCreated} variants + batches`);

  // Leads (30 across 2 CTVs)
  const ctvs = await prisma.user.findMany({ where: { role: 'ctv' }, take: 2 });
  if (ctvs.length === 0) {
    console.log('[v3.1 seed] No CTVs — skipping leads');
  } else {
    const stages = [
      ...Array(10).fill('NEW'),
      ...Array(8).fill('CONTACTED'),
      ...Array(5).fill('QUALIFIED'),
      ...Array(3).fill('NEGOTIATING'),
      ...Array(2).fill('WON'),
      ...Array(2).fill('LOST'),
    ];
    const sources = ['referral', 'zalo', 'fb_ads', 'event', 'walk_in'];
    let leadsCreated = 0;
    for (let i = 0; i < 30; i++) {
      const ctv = ctvs[i % ctvs.length];
      const stage = stages[i];
      const isClosed = ['WON', 'LOST'].includes(stage);
      const created = new Date(); created.setDate(created.getDate() - (i * 2));
      try {
        await prisma.lead.create({
          data: {
            name: `Khách lead ${i + 1}`,
            phone: `099${String(1000000 + i).padStart(7, '0')}`,
            source: sources[i % sources.length],
            interestNote: 'Quan tâm combo TPCN 2 tháng',
            estimatedValue: 1800000,
            stage,
            lostReason: stage === 'LOST' ? 'price' : null,
            assignedCtvId: ctv.id,
            createdAt: created,
            lastContactedAt: stage === 'NEW' ? null : new Date(created.getTime() + 86400000),
            closedAt: isClosed ? new Date() : null,
            nextActionAt: !isClosed && stage !== 'NEW' ? new Date(Date.now() + 86400000) : null,
            nextActionNote: !isClosed && stage !== 'NEW' ? 'Gọi follow-up' : null,
          },
        });
        leadsCreated++;
      } catch (e) { /* unique constraint collision: skip */ }
    }
    console.log(`[v3.1 seed] ${leadsCreated} leads created`);
  }

  console.log('[v3.1 seed] done.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
