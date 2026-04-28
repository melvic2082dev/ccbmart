// Enrich ctv1 (and team) with rich mock data so the CTV dashboard, monthly
// report, transactions, and invoice pages have something to render.
// Idempotent-ish: won't crash on re-run; the customers it creates use
// distinct phone numbers so duplicates don't blow up the unique index.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const COMBO_PRICE = parseInt(process.env.COMBO_PRICE || '1800000', 10);

// Spread events across the last N months ending in the current month
function monthDate(monthsAgo, day = 1, hour = 10) {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  d.setDate(day);
  d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
  return d;
}
function monthStr(monthsAgo) {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function main() {
  console.log('--- Enriching ctv1 + team with mock data ---');

  // Resolve CTV ids
  const ctvList = await prisma.user.findMany({
    where: { email: { in: ['ctv1@ccbmart.vn', 'ctv2@ccbmart.vn', 'ctv3@ccbmart.vn', 'ctv4@ccbmart.vn', 'ctv5@ccbmart.vn', 'ctv6@ccbmart.vn'] } },
    select: { id: true, email: true, rank: true },
  });
  const byEmail = Object.fromEntries(ctvList.map(c => [c.email, c]));
  const ctv1 = byEmail['ctv1@ccbmart.vn'];
  const ctv2 = byEmail['ctv2@ccbmart.vn'];
  const ctv3 = byEmail['ctv3@ccbmart.vn'];
  const ctv4 = byEmail['ctv4@ccbmart.vn'];
  const ctv5 = byEmail['ctv5@ccbmart.vn'];
  const ctv6 = byEmail['ctv6@ccbmart.vn'];
  if (!ctv1) throw new Error('ctv1 not found — run scripts/add-test-accounts.js first');

  const owners = [ctv1, ctv2, ctv3, ctv4, ctv5, ctv6].filter(Boolean);
  const ctv1Direct = [ctv2, ctv3].filter(Boolean);

  // 1. Customers — ~10 per CTV in team
  const firstNames = ['Lan', 'Hà', 'Mai', 'Hùng', 'Nam', 'Sơn', 'Linh', 'Phương', 'Tuấn', 'Vy', 'An', 'Bình'];
  const lastNames  = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Ngô'];
  let customerSeq = 0;
  for (const owner of owners) {
    const targetCount = owner.id === ctv1.id ? 12 : 6;
    for (let i = 0; i < targetCount; i++) {
      customerSeq++;
      const phone = `0939${String(900000 + customerSeq).padStart(6, '0').slice(-6)}`;
      const name = `${lastNames[customerSeq % lastNames.length]} ${firstNames[customerSeq % firstNames.length]} ${i + 1}`;
      await prisma.customer.upsert({
        where: { phone },
        update: { ctvId: owner.id, name },
        create: { phone, name, ctvId: owner.id, createdAt: monthDate(Math.floor(Math.random() * 5)) },
      });
    }
  }
  console.log(`✓ ${customerSeq} customers upserted across team`);

  // 2. Transactions — spread across 6 months for ctv1 + team. Each 1 combo = COMBO_PRICE.
  let txCount = 0;
  for (const owner of owners) {
    const customers = await prisma.customer.findMany({ where: { ctvId: owner.id }, take: 12 });
    if (!customers.length) continue;
    const monthsToFill = 6;
    for (let m = 0; m < monthsToFill; m++) {
      // GĐKD: ~6 tx/month, GĐV: ~5, TP: ~4
      const txPerMonth = owner.rank === 'GDKD' ? 6 : owner.rank === 'GDV' ? 5 : 4;
      for (let i = 0; i < txPerMonth; i++) {
        const customer = customers[(m * txPerMonth + i) % customers.length];
        const day = 5 + Math.floor(Math.random() * 23);
        const method = ['bank_transfer', 'cash', 'momo', 'zalopay'][Math.floor(Math.random() * 4)];
        await prisma.transaction.create({
          data: {
            ctvId: owner.id,
            customerId: customer.id,
            channel: 'ctv',
            totalAmount: COMBO_PRICE,
            cogsAmount: Math.round(COMBO_PRICE * 0.5),
            status: 'CONFIRMED',
            paymentMethod: method,
            bankCode: method === 'bank_transfer' ? ['VCB', 'TCB', 'BIDV', 'MB'][Math.floor(Math.random() * 4)] : null,
            ctvSubmittedAt: monthDate(m, day, 10),
            confirmedAt: monthDate(m, day, 14),
            createdAt: monthDate(m, day, 10),
          },
        });
        txCount++;
      }
    }
  }
  console.log(`✓ ${txCount} confirmed transactions created across 6 months`);

  // 3. Cash deposits — 4 historical deposits + 2 pending for ctv1 (so the
  //    "Phiếu nộp tiền chờ" badge has something) and 2 historical for ctv2.
  const cashTx = await prisma.transaction.findMany({
    where: { ctvId: ctv1.id, paymentMethod: 'cash', cashDepositId: null },
    take: 12,
    orderBy: { createdAt: 'asc' },
  });
  let depositCount = 0;
  for (let i = 0; i < Math.min(6, Math.floor(cashTx.length / 2)); i++) {
    const slice = cashTx.slice(i * 2, i * 2 + 2);
    if (!slice.length) break;
    const amount = slice.reduce((s, t) => s + Number(t.totalAmount), 0);
    const isPending = i >= 4;
    const dep = await prisma.cashDeposit.create({
      data: {
        ctvId: ctv1.id,
        amount,
        transactionIds: JSON.stringify(slice.map(t => t.id)),
        depositedAt: slice[slice.length - 1].createdAt,
        status: isPending ? 'PENDING' : 'CONFIRMED',
        confirmedAt: isPending ? null : new Date(slice[slice.length - 1].createdAt.getTime() + 86400000),
        notes: `Nộp tiền lần ${i + 1}`,
      },
    });
    await prisma.transaction.updateMany({
      where: { id: { in: slice.map(t => t.id) } },
      data: { cashDepositId: dep.id },
    });
    depositCount++;
  }
  console.log(`✓ ${depositCount} cash deposits for ctv1`);

  // 4. KPI logs — make sure ctv1 has 6 months of KPI data
  for (let m = 0; m < 6; m++) {
    const month = monthStr(m);
    const selfSales = 4 + Math.floor(Math.random() * 6); // 4–9 combos
    const portfolio = 30 + Math.floor(Math.random() * 20);
    await prisma.kpiLog.upsert({
      where: { ctvId_month: { ctvId: ctv1.id, month } },
      update: { selfSales, portfolioSize: portfolio },
      create: {
        ctvId: ctv1.id,
        month,
        selfSales,
        portfolioSize: portfolio,
        rankBefore: 'GDKD',
        rankAfter: 'GDKD',
      },
    });
  }
  console.log('✓ 6 months of KPI logs for ctv1');

  // 5. Loyalty points — skipped (schema requires non-trivial point math).

  console.log('\n=== ENRICH DONE ===');
  console.log(`ctv1 should now show: monthly revenue (6 months), ${depositCount} cash deposits, KPI 6 months,`);
  console.log(`management_fees and breakaway_fees already populated by previous scripts.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
