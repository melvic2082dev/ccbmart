// Idempotent additive seeder — upserts test login accounts only.
// Does NOT delete anything; safe to re-run; safe on prod.
//
// Scope: 6 admin + 6 CTV (with hierarchy) + 3 agency + 4 membership tiers + 4 member (one per tier)
//
// Run locally against Railway env:
//   cd backend
//   railway link              # pick the env (staging or production)
//   railway run node scripts/add-test-accounts.js
//
// Or with explicit DATABASE_URL:
//   DATABASE_URL="postgres://..." node scripts/add-test-accounts.js

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminHash  = await bcrypt.hash('admin123', 10);
  const ctvHash    = await bcrypt.hash('ctv12345', 10);
  const agencyHash = await bcrypt.hash('agency123', 10);
  const memberHash = await bcrypt.hash('member123', 10);

  console.log('--- Adding test accounts (additive, no deletes) ---');
  console.log(`DB: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@') || '(not set!)'}`);

  // 1. Admin: super + 5 sub-roles
  const admins = [
    { email: 'admin@ccbmart.vn',    role: 'super_admin',    name: 'Super Admin CCB Mart',  phone: '0901000000' },
    { email: 'ops@ccbmart.vn',      role: 'ops_admin',      name: 'Quản lý vận hành',      phone: '0901000001' },
    { email: 'partner@ccbmart.vn',  role: 'partner_admin',  name: 'Quản lý đối tác',       phone: '0901000002' },
    { email: 'member@ccbmart.vn',   role: 'member_admin',   name: 'Quản lý thành viên',    phone: '0901000003' },
    { email: 'training@ccbmart.vn', role: 'training_admin', name: 'Quản lý đào tạo',       phone: '0901000004' },
    { email: 'finance@ccbmart.vn',  role: 'finance_admin',  name: 'Quản lý tài chính',     phone: '0901000005' },
  ];
  for (const a of admins) {
    await prisma.user.upsert({
      where: { email: a.email },
      update: { role: a.role, name: a.name, phone: a.phone, passwordHash: adminHash, isActive: true },
      create: { ...a, passwordHash: adminHash },
    });
  }
  console.log(`✓ ${admins.length} admin upserted`);

  // 2. CTV hierarchy: GDKD -> 2 GDV -> 3 TP
  const gdkd = await prisma.user.upsert({
    where: { email: 'ctv1@ccbmart.vn' },
    update: { role: 'ctv', name: 'Nguyễn Văn Hùng', phone: '0901100001', rank: 'GDKD', passwordHash: ctvHash, isActive: true, parentId: null },
    create: { email: 'ctv1@ccbmart.vn', role: 'ctv', name: 'Nguyễn Văn Hùng', phone: '0901100001', rank: 'GDKD', passwordHash: ctvHash },
  });
  const gdv1 = await prisma.user.upsert({
    where: { email: 'ctv2@ccbmart.vn' },
    update: { role: 'ctv', name: 'Trần Thị Mai', phone: '0901100002', rank: 'GDV', passwordHash: ctvHash, isActive: true, parentId: gdkd.id },
    create: { email: 'ctv2@ccbmart.vn', role: 'ctv', name: 'Trần Thị Mai', phone: '0901100002', rank: 'GDV', passwordHash: ctvHash, parentId: gdkd.id },
  });
  const gdv2 = await prisma.user.upsert({
    where: { email: 'ctv3@ccbmart.vn' },
    update: { role: 'ctv', name: 'Lê Đức Phong', phone: '0901100003', rank: 'GDV', passwordHash: ctvHash, isActive: true, parentId: gdkd.id },
    create: { email: 'ctv3@ccbmart.vn', role: 'ctv', name: 'Lê Đức Phong', phone: '0901100003', rank: 'GDV', passwordHash: ctvHash, parentId: gdkd.id },
  });
  await prisma.user.upsert({
    where: { email: 'ctv4@ccbmart.vn' },
    update: { role: 'ctv', name: 'Phạm Hoàng Nam', phone: '0901100004', rank: 'TP', passwordHash: ctvHash, isActive: true, parentId: gdv1.id },
    create: { email: 'ctv4@ccbmart.vn', role: 'ctv', name: 'Phạm Hoàng Nam', phone: '0901100004', rank: 'TP', passwordHash: ctvHash, parentId: gdv1.id },
  });
  await prisma.user.upsert({
    where: { email: 'ctv5@ccbmart.vn' },
    update: { role: 'ctv', name: 'Hoàng Ngọc Lan', phone: '0901100005', rank: 'TP', passwordHash: ctvHash, isActive: true, parentId: gdv1.id },
    create: { email: 'ctv5@ccbmart.vn', role: 'ctv', name: 'Hoàng Ngọc Lan', phone: '0901100005', rank: 'TP', passwordHash: ctvHash, parentId: gdv1.id },
  });
  await prisma.user.upsert({
    where: { email: 'ctv6@ccbmart.vn' },
    update: { role: 'ctv', name: 'Vũ Thanh Sơn', phone: '0901100006', rank: 'TP', passwordHash: ctvHash, isActive: true, parentId: gdv2.id },
    create: { email: 'ctv6@ccbmart.vn', role: 'ctv', name: 'Vũ Thanh Sơn', phone: '0901100006', rank: 'TP', passwordHash: ctvHash, parentId: gdv2.id },
  });
  console.log('✓ 6 CTV upserted (GDKD -> 2 GDV -> 3 TP hierarchy)');

  // 3. Agencies
  const agencies = [
    { email: 'agency1@ccbmart.vn', name: 'Đại lý Bình Thạnh', phone: '0902200001', deposit: 100000000, tier: '100tr', addr: '123 Điện Biên Phủ, Bình Thạnh, TP.HCM' },
    { email: 'agency2@ccbmart.vn', name: 'Đại lý Thủ Đức',   phone: '0902200002', deposit: 300000000, tier: '300tr', addr: '456 Võ Văn Ngân, Thủ Đức, TP.HCM' },
    { email: 'agency3@ccbmart.vn', name: 'Đại lý Gò Vấp',    phone: '0902200003', deposit: 50000000,  tier: '50tr',  addr: '789 Quang Trung, Gò Vấp, TP.HCM' },
  ];
  for (const a of agencies) {
    const u = await prisma.user.upsert({
      where: { email: a.email },
      update: { role: 'agency', name: a.name, phone: a.phone, passwordHash: agencyHash, isActive: true },
      create: { email: a.email, role: 'agency', name: a.name, phone: a.phone, passwordHash: agencyHash },
    });
    await prisma.agency.upsert({
      where: { userId: u.id },
      update: { name: a.name, depositAmount: a.deposit, depositTier: a.tier, address: a.addr },
      create: { userId: u.id, name: a.name, depositAmount: a.deposit, depositTier: a.tier, address: a.addr },
    });
  }
  console.log(`✓ ${agencies.length} agency users + records upserted`);

  // 4. Membership tiers
  const tierDefs = [
    { name: 'Green',    minDeposit: 0,       discountPct: 0,    referralPct: 0,    monthlyReferralCap: 0,      color: 'gray' },
    { name: 'Basic',    minDeposit: 200000,  discountPct: 0.03, referralPct: 0,    monthlyReferralCap: 0,      color: 'blue' },
    { name: 'Standard', minDeposit: 500000,  discountPct: 0.07, referralPct: 0.02, monthlyReferralCap: 500000, color: 'purple' },
    { name: 'VIP Gold', minDeposit: 2000000, discountPct: 0.12, referralPct: 0.05, monthlyReferralCap: 500000, color: 'amber' },
  ];
  const tierRecords = [];
  for (const t of tierDefs) {
    const tr = await prisma.membershipTier.upsert({
      where: { name: t.name },
      update: t,
      create: t,
    });
    tierRecords.push(tr);
  }
  console.log(`✓ ${tierDefs.length} membership tiers upserted`);

  // 5. Member users (4) + wallets — one per tier
  for (let i = 0; i < 4; i++) {
    const tier = tierRecords[i];
    const email = `member${i + 1}@ccbmart.vn`;
    const u = await prisma.user.upsert({
      where: { email },
      update: { role: 'member', name: `Thành viên test ${i + 1}`, phone: `09033000${String(i + 1).padStart(2, '0')}`, passwordHash: memberHash, isActive: true },
      create: { email, role: 'member', name: `Thành viên test ${i + 1}`, phone: `09033000${String(i + 1).padStart(2, '0')}`, passwordHash: memberHash },
    });
    const code = `CCB_TEST${String(i + 1).padStart(2, '0')}`;
    const minDep = Number(tier.minDeposit);
    await prisma.memberWallet.upsert({
      where: { userId: u.id },
      update: { tierId: tier.id, balance: minDep, totalDeposit: minDep, referralCode: code },
      create: { userId: u.id, tierId: tier.id, balance: minDep, totalDeposit: minDep, referralCode: code },
    });
  }
  console.log('✓ 4 member users + wallets upserted');

  console.log('\n=== DONE ===');
  console.log('Test login accounts now available:');
  console.log('  Admin (PW admin123):  admin@ / ops@ / partner@ / member@ / training@ / finance@ ccbmart.vn');
  console.log('  CTV   (PW ctv12345):  ctv1@..ctv6@ccbmart.vn');
  console.log('  Agency(PW agency123): agency1@..agency3@ccbmart.vn');
  console.log('  Member(PW member123): member1@..member4@ccbmart.vn');
}

main()
  .catch((e) => { console.error('FAILED:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
