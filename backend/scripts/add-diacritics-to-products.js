// Idempotent: rewrites product names + units from non-diacritic Vietnamese
// to proper-diacritic Vietnamese. Matches by current name/unit; if a row
// already has the new value (from a prior run) the update is a no-op.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const NAME_MAP = {
  'Combo Suc khoe Vang (TPCN)':    'Combo Sức khỏe Vàng (TPCN)',
  'Kardi Q10 - Ho tro tim mach':   'Kardi Q10 - Hỗ trợ tim mạch',
  'Canxi Nano K2 - Xuong khop':    'Canxi Nano K2 - Xương khớp',
  'Tra Sam Han Quoc':              'Trà Sâm Hàn Quốc',
  'Rau cu Hikari (2kg)':           'Rau củ Hikari (2kg)',
  'Gao Hikari ST25 (5kg)':         'Gạo Hikari ST25 (5kg)',
  'Suat an Hikari':                'Suất ăn Hikari',
  'Trai cay Hikari (1kg)':         'Trái cây Hikari (1kg)',
  'Vien giat nhap khau':           'Viên giặt nhập khẩu',
  'Tay toilet da nang':            'Tẩy toilet đa năng',
  'Nuoc lau san huu co':           'Nước lau sàn hữu cơ',
  'Sot ot Thai Sriracha':          'Sốt ớt Thái Sriracha',
  'Tuong ot Han Quoc Gochujang':   'Tương ớt Hàn Quốc Gochujang',
  'Dau hao Thai Premium':          'Dầu hào Thái Premium',
  'Nuoc sot Hikari dac biet':      'Nước sốt Hikari đặc biệt',
};

const UNIT_MAP = {
  'suat': 'suất',
  'goi':  'gói',
  'hop':  'hộp',
  'tui':  'túi',
  'hu':   'hũ',
};

async function main() {
  console.log('--- Adding diacritics to product names + units ---');
  console.log(`DB: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@') || '(not set!)'}`);

  let nameUpdates = 0;
  for (const [oldName, newName] of Object.entries(NAME_MAP)) {
    const r = await prisma.product.updateMany({ where: { name: oldName }, data: { name: newName } });
    if (r.count > 0) {
      console.log(`✓ "${oldName}" → "${newName}" (${r.count} row)`);
      nameUpdates += r.count;
    }
  }

  let unitUpdates = 0;
  for (const [oldUnit, newUnit] of Object.entries(UNIT_MAP)) {
    const r = await prisma.product.updateMany({ where: { unit: oldUnit }, data: { unit: newUnit } });
    if (r.count > 0) {
      console.log(`✓ unit "${oldUnit}" → "${newUnit}" (${r.count} row)`);
      unitUpdates += r.count;
    }
  }

  console.log(`\n=== DONE === ${nameUpdates} names, ${unitUpdates} units updated`);
}

main()
  .catch(e => { console.error('FAILED:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
