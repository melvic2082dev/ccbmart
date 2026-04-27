// Idempotent: seeds BreakawayLog + BreakawayFee for the CURRENT month so
// /ctv/breakaway-fees isn't empty when ctv1@ccbmart.vn (GDKD top) views it.
// Skips entire run if ctv1 already has fees in current month.
//
// Usage:
//   set -a && source /Users/mooncat/Secrets/ccb/railway-staging.json && set +a
//   node scripts/add-breakaway-test-data.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  console.log(`--- Seeding breakaway test data for ${monthStr} ---`);
  console.log(`DB: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@') || '(not set!)'}`);

  const emails = ['ctv1@ccbmart.vn', 'ctv2@ccbmart.vn', 'ctv4@ccbmart.vn', 'ctv5@ccbmart.vn', 'ctv6@ccbmart.vn', 'ctv_regular1@ccbmart.vn'];
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true, parentId: true },
  });
  const by = Object.fromEntries(users.map(u => [u.email, u]));
  const required = ['ctv1@ccbmart.vn', 'ctv2@ccbmart.vn', 'ctv4@ccbmart.vn', 'ctv5@ccbmart.vn', 'ctv6@ccbmart.vn', 'ctv_regular1@ccbmart.vn'];
  for (const e of required) if (!by[e]) throw new Error(`Missing user ${e} — run add-test-accounts.js first`);

  const ctv1 = by['ctv1@ccbmart.vn'];
  const ctv2 = by['ctv2@ccbmart.vn'];
  const ctv4 = by['ctv4@ccbmart.vn'];
  const ctv5 = by['ctv5@ccbmart.vn'];
  const ctv6 = by['ctv6@ccbmart.vn'];
  const reg1 = by['ctv_regular1@ccbmart.vn'];

  // Per-fee dedupe inside the loop handles re-runs; no whole-script skip.

  // breakawayAt = last month so April fees fall inside the 12-month window
  const breakawayAt = new Date(now);
  breakawayAt.setDate(breakawayAt.getDate() - 30);
  const expireAt = new Date(breakawayAt);
  expireAt.setFullYear(expireAt.getFullYear() + 1);

  // Status EXPIRED so the monthly cron in services/breakaway.js skips them
  // (where: { status: 'ACTIVE' }). Fees we create manually still display on
  // the read endpoint, which doesn't filter on log status.
  const logStatus = 'EXPIRED';

  // Scenarios: each entry creates one BreakawayLog (if not exists) and a set
  // of BreakawayFee records for the current month.
  // Goal: make ctv1 see fees at all 3 levels in April 2026.
  const scenarios = [
    {
      broken: ctv2,                  // GDV directly under ctv1 → ctv1 = F1 cũ
      oldParentId: ctv1.id,
      newParentId: ctv6.id,
      fees: [
        { toUserId: ctv1.id, level: 1, amount: 1500000, fromUserId: ctv2.id },
      ],
    },
    {
      broken: ctv4,                  // TP under ctv2 → ctv2 = F1, ctv1 = F2
      oldParentId: ctv2.id,
      newParentId: ctv6.id,
      fees: [
        { toUserId: ctv2.id, level: 1, amount: 900000, fromUserId: ctv4.id },
        { toUserId: ctv1.id, level: 2, amount: 600000, fromUserId: ctv4.id },
      ],
    },
    {
      broken: ctv5,                  // TP under ctv2 → ctv2 = F1, ctv1 = F2
      oldParentId: ctv2.id,
      newParentId: ctv6.id,
      fees: [
        { toUserId: ctv2.id, level: 1, amount: 750000, fromUserId: ctv5.id },
        { toUserId: ctv1.id, level: 2, amount: 500000, fromUserId: ctv5.id },
      ],
    },
    {
      broken: reg1,                  // CTV deep in chain → pp1=L1, ctv4=L2, ctv1=L3
      oldParentId: reg1.parentId,
      newParentId: ctv6.id,
      fees: [
        { toUserId: reg1.parentId, level: 1, amount: 150000, fromUserId: reg1.id },
        { toUserId: ctv4.id,       level: 2, amount: 100000, fromUserId: reg1.id },
        { toUserId: ctv1.id,       level: 3, amount:  50000, fromUserId: reg1.id },
      ],
    },
  ];

  let createdLogs = 0;
  let createdFees = 0;

  for (const s of scenarios) {
    let log = await prisma.breakawayLog.findUnique({ where: { userId: s.broken.id } });
    if (!log) {
      log = await prisma.breakawayLog.create({
        data: {
          userId: s.broken.id,
          oldParentId: s.oldParentId,
          newParentId: s.newParentId,
          breakawayAt,
          expireAt,
          status: logStatus,
        },
      });
      createdLogs++;
    }

    for (const f of s.fees) {
      const dup = await prisma.breakawayFee.findFirst({
        where: { breakawayLogId: log.id, month: monthStr, toUserId: f.toUserId, level: f.level, fromUserId: f.fromUserId },
      });
      if (dup) continue;
      await prisma.breakawayFee.create({
        data: {
          breakawayLogId: log.id,
          fromUserId: f.fromUserId,
          toUserId: f.toUserId,
          level: f.level,
          amount: f.amount,
          month: monthStr,
          status: 'PENDING',
        },
      });
      createdFees++;
    }
  }

  console.log(`\n=== DONE ===`);
  console.log(`New BreakawayLog: ${createdLogs}`);
  console.log(`New BreakawayFee: ${createdFees}`);
  console.log(`\nctv1 (GDKD) view in ${monthStr}:`);
  console.log(`  L1 (3% F1 cũ) — 1,500,000đ from ctv2 breakaway`);
  console.log(`  L2 (2% F2 cũ) — 1,100,000đ from ctv4 + ctv5 breakaway (600k + 500k)`);
  console.log(`  L3 (1% GĐKD)  —    50,000đ from ctv_regular1 breakaway`);
  console.log(`  Tổng: 2,650,000đ`);
}

main()
  .catch(e => { console.error('FAILED:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
