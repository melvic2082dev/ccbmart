/**
 * Backfill `regionGroup` for every LandingProduct based on free-text
 * `region` or `producerHometown`. Runs against both local DB (default)
 * and prod (via API mirror — see mirror-local-to-prod.ts).
 *
 * Usage: npx tsx scripts/backfill-region-group.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Province → region group. Northern + Northern-mountain → 'bac'.
// Central + Central coast + Tây Nguyên → 'trung' (3-region scheme).
// Southern → 'nam'. Anything not matched → null ("Không thuộc vùng miền nào").
const PROVINCE_TO_GROUP: Record<string, 'bac' | 'trung' | 'nam'> = {
  // Bắc bộ
  'hà nội': 'bac', 'hanoi': 'bac', 'ha noi': 'bac',
  'hà giang': 'bac', 'cao bằng': 'bac', 'bắc kạn': 'bac',
  'lạng sơn': 'bac', 'lào cai': 'bac', 'yên bái': 'bac',
  'thái nguyên': 'bac', 'phú thọ': 'bac', 'vĩnh phúc': 'bac',
  'bắc giang': 'bac', 'bắc ninh': 'bac', 'hải dương': 'bac',
  'hưng yên': 'bac', 'hà nam': 'bac', 'nam định': 'bac',
  'thái bình': 'bac', 'ninh bình': 'bac', 'quảng ninh': 'bac',
  'hải phòng': 'bac', 'điện biên': 'bac', 'lai châu': 'bac',
  'sơn la': 'bac', 'hòa bình': 'bac', 'tuyên quang': 'bac',
  // Trung bộ
  'thanh hóa': 'trung', 'nghệ an': 'trung', 'hà tĩnh': 'trung',
  'quảng bình': 'trung', 'quảng trị': 'trung', 'huế': 'trung', 'thừa thiên huế': 'trung',
  'đà nẵng': 'trung', 'quảng nam': 'trung', 'quảng ngãi': 'trung',
  'bình định': 'trung', 'phú yên': 'trung', 'khánh hòa': 'trung',
  'ninh thuận': 'trung', 'bình thuận': 'trung',
  // Tây Nguyên — gộp vào Trung theo chuẩn 3 miền
  'kon tum': 'trung', 'gia lai': 'trung', 'đắk lắk': 'trung',
  'đắk nông': 'trung', 'lâm đồng': 'trung', 'buôn ma thuột': 'trung',
  // Nam bộ
  'tp. hcm': 'nam', 'tp.hcm': 'nam', 'tphcm': 'nam',
  'hồ chí minh': 'nam', 'sài gòn': 'nam',
  'bình phước': 'nam', 'bình dương': 'nam', 'đồng nai': 'nam',
  'tây ninh': 'nam', 'bà rịa': 'nam', 'vũng tàu': 'nam', 'bà rịa - vũng tàu': 'nam',
  'long an': 'nam', 'tiền giang': 'nam', 'bến tre': 'nam',
  'trà vinh': 'nam', 'vĩnh long': 'nam', 'đồng tháp': 'nam',
  'an giang': 'nam', 'kiên giang': 'nam', 'cần thơ': 'nam',
  'hậu giang': 'nam', 'sóc trăng': 'nam', 'bạc liêu': 'nam',
  'cà mau': 'nam', 'phú quốc': 'nam',
};

function inferGroup(text: string): 'bac' | 'trung' | 'nam' | null {
  const lc = text.toLowerCase();
  for (const [province, group] of Object.entries(PROVINCE_TO_GROUP)) {
    if (lc.includes(province)) return group;
  }
  // Generic regional keywords
  if (lc.includes('miền bắc') || lc.includes('tây bắc') || lc.includes('đông bắc')) return 'bac';
  if (lc.includes('miền trung') || lc.includes('tây nguyên')) return 'trung';
  if (lc.includes('miền nam') || lc.includes('miền tây')) return 'nam';
  return null;
}

async function main() {
  const products = await prisma.landingProduct.findMany();
  let updated = 0;
  let unchanged = 0;
  let nullCount = 0;
  for (const p of products) {
    if (p.regionGroup) {
      unchanged++;
      continue;
    }
    const haystack = `${p.region ?? ''} ${p.producerHometown ?? ''} ${p.origin ?? ''}`.trim();
    const group = inferGroup(haystack);
    if (group !== p.regionGroup) {
      await prisma.landingProduct.update({ where: { id: p.id }, data: { regionGroup: group } });
      updated++;
      if (!group) nullCount++;
    }
  }
  console.log(`✓ Updated ${updated} products (${nullCount} marked as "no region"); ${unchanged} already had regionGroup.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
