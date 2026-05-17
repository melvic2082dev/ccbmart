/**
 * v3.3 mockup seed: batches tồn kho + leads.
 *
 * - Mỗi variant nhận 2 lô (1 cũ hạn dài, 1 mới — vài lô đặt hạn sắp hết
 *   để tab "Sắp hết hạn (30 ngày)" có hàng).
 * - Supplier khớp với region của Product (BAC/TRUNG/NAM).
 * - 12 leads mockup phân bố đều các stage, assign cho CTV random.
 *
 * Idempotent: upsert theo `batchNo` (unique trên variant) và check name+phone
 * cho leads (tránh trùng).
 *
 * Usage:  cd backend && node scripts/seed-inventory-and-leads.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Seeded RNG so re-runs produce same data
let rngState = 12345;
function rng() {
  rngState = (rngState * 9301 + 49297) % 233280;
  return rngState / 233280;
}
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const rngInt = (lo, hi) => Math.floor(rng() * (hi - lo + 1)) + lo;
const daysFromNow = (d) => new Date(Date.now() + d * 86400000);

async function seedBatches() {
  console.log('\n=== Seeding inventory batches ===');
  const variants = await prisma.productVariant.findMany({
    include: { product: { select: { id: true, name: true, region: true, price: true, cogsPct: true } } },
  });
  const suppliers = await prisma.supplier.findMany({ where: { type: 'ccb_household' } });
  const supplierByRegion = {};
  for (const s of suppliers) {
    if (s.taxCode === 'CCB-SUP-BAC')   supplierByRegion.BAC = s;
    if (s.taxCode === 'CCB-SUP-TRUNG') supplierByRegion.TRUNG = s;
    if (s.taxCode === 'CCB-SUP-NAM')   supplierByRegion.NAM = s;
  }

  let created = 0, updated = 0;
  for (const v of variants) {
    const region = v.product.region || 'TRUNG';
    const supplier = supplierByRegion[region] || suppliers[0];
    const baseCost = Math.round(Number(v.product.price) * Number(v.product.cogsPct));

    // 2 lô: lô cũ + lô mới
    const lots = [
      {
        batchNo: `LOT-2026-V${v.id}-001`,
        qtyReceived: rngInt(120, 280),
        receivedAt: daysFromNow(-rngInt(30, 60)),
        mfgDate: daysFromNow(-rngInt(45, 75)),
        expDate: daysFromNow(rngInt(180, 540)),
      },
      {
        batchNo: `LOT-2026-V${v.id}-002`,
        qtyReceived: rngInt(60, 180),
        receivedAt: daysFromNow(-rngInt(5, 15)),
        mfgDate: daysFromNow(-rngInt(15, 25)),
        // 30% lô mới đặt hạn sắp hết (5-25 ngày) → để demo "Sắp hết hạn"
        expDate: rng() < 0.3 ? daysFromNow(rngInt(5, 25)) : daysFromNow(rngInt(180, 365)),
      },
    ];

    for (const lot of lots) {
      // qtyAvailable: 60-100% qtyReceived (đã bán một phần)
      const sold = Math.round(lot.qtyReceived * rngInt(0, 40) / 100);
      const qtyAvailable = lot.qtyReceived - sold;

      const existing = await prisma.inventoryBatch.findUnique({
        where: { variantId_batchNo: { variantId: v.id, batchNo: lot.batchNo } },
      });
      if (existing) {
        await prisma.inventoryBatch.update({
          where: { id: existing.id },
          data: {
            qtyReceived: lot.qtyReceived,
            qtyAvailable,
            costPerUnit: baseCost,
            supplierId: supplier.id,
            mfgDate: lot.mfgDate,
            expDate: lot.expDate,
            receivedAt: lot.receivedAt,
            status: 'ACTIVE',
          },
        });
        updated++;
      } else {
        await prisma.inventoryBatch.create({
          data: {
            variantId: v.id,
            supplierId: supplier.id,
            batchNo: lot.batchNo,
            qtyReceived: lot.qtyReceived,
            qtyAvailable,
            costPerUnit: baseCost,
            mfgDate: lot.mfgDate,
            expDate: lot.expDate,
            receivedAt: lot.receivedAt,
            status: 'ACTIVE',
          },
        });
        created++;
      }
    }
  }

  const total = await prisma.inventoryBatch.count();
  const expiring = await prisma.inventoryBatch.count({
    where: { expDate: { lte: daysFromNow(30) }, status: 'ACTIVE' },
  });
  console.log(`  created=${created}  updated=${updated}  total now=${total}  sắp hết hạn (30 ngày)=${expiring}`);
}

async function seedLeads() {
  console.log('\n=== Seeding leads ===');

  const ctvs = await prisma.user.findMany({ where: { role: 'ctv', isActive: true }, select: { id: true, name: true } });
  if (ctvs.length === 0) {
    console.log('  (no CTVs to assign; skipping)');
    return;
  }

  const MOCK_LEADS = [
    { name: 'Bùi Thị Hoa',     phone: '0901112301', source: 'facebook', stage: 'NEW',         estimatedValue: 1200000, interestNote: 'Hỏi giá combo TPCN cho mẹ' },
    { name: 'Trần Quốc Bảo',   phone: '0901112302', source: 'zalo',     stage: 'CONTACTED',   estimatedValue: 800000,  interestNote: 'Đã gọi 1 lần, hẹn cuối tuần' },
    { name: 'Lê Văn Đạt',      phone: '0901112303', source: 'phone',    stage: 'QUALIFIED',   estimatedValue: 3500000, interestNote: 'Quan tâm gạo ST25 + nước mắm — số lượng lớn' },
    { name: 'Phạm Thị Hằng',   phone: '0901112304', source: 'referral', stage: 'NEGOTIATING', estimatedValue: 2200000, interestNote: 'Đang so sánh giá với Bách Hoá Xanh' },
    { name: 'Hoàng Minh Tuấn', phone: '0901112305', source: 'walk_in',  stage: 'WON',         estimatedValue: 1800000, interestNote: 'Đã chốt 1 combo Tết' },
    { name: 'Nguyễn Thị Lan',  phone: '0901112306', source: 'zalo',     stage: 'WON',         estimatedValue: 2700000, interestNote: 'Khách thân quen 6 tháng' },
    { name: 'Vũ Đình Khải',    phone: '0901112307', source: 'facebook', stage: 'LOST',        estimatedValue: 500000,  interestNote: 'Hết quan tâm, chuyển sang shop khác' },
    { name: 'Đỗ Thu Trang',    phone: '0901112308', source: 'admin',    stage: 'NEW',         estimatedValue: 450000,  interestNote: 'Mới điền form qua landing' },
    { name: 'Mai Văn Sơn',     phone: '0901112309', source: 'referral', stage: 'CONTACTED',   estimatedValue: 1500000, interestNote: 'Anh trai CTV giới thiệu' },
    { name: 'Trịnh Hồng Nhung',phone: '0901112310', source: 'phone',    stage: 'QUALIFIED',   estimatedValue: 4200000, interestNote: 'Mua biếu đối tác — TPCN + trà' },
    { name: 'Lý Thanh Phú',    phone: '0901112311', source: 'facebook', stage: 'NEGOTIATING', estimatedValue: 1100000, interestNote: 'Xin giảm 5% — đang xin duyệt' },
    { name: 'Cao Bảo Anh',     phone: '0901112312', source: 'other',    stage: 'NEW',         estimatedValue: 700000,  interestNote: 'Khách lẻ, chưa rõ nhu cầu' },
  ];

  let created = 0, skipped = 0;
  for (const lead of MOCK_LEADS) {
    // Check existing by phone (idempotent)
    const existing = await prisma.lead.findFirst({ where: { phone: lead.phone } });
    if (existing) { skipped++; continue; }

    const ctv = pick(ctvs);
    const isTerminal = lead.stage === 'WON' || lead.stage === 'LOST';
    await prisma.lead.create({
      data: {
        name: lead.name,
        phone: lead.phone,
        source: lead.source,
        stage: lead.stage,
        estimatedValue: lead.estimatedValue,
        assignedCtvId: ctv.id,
        interestNote: lead.interestNote,
        closedAt: isTerminal ? daysFromNow(-rngInt(1, 10)) : null,
      },
    });
    created++;
  }

  const total = await prisma.lead.count();
  console.log(`  created=${created}  skipped(existed)=${skipped}  total leads=${total}`);
}

async function main() {
  await seedBatches();
  await seedLeads();
  await prisma.$disconnect();
  console.log('\nDone.');
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
