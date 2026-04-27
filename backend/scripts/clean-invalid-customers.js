// Idempotent: deletes Customer rows that look like accidental QA test data
// (phone shorter than 10 digits OR doesn't start with 0) and have zero
// totalSpent (no real transactions). Safe on prod — anyone with real
// transactions is left alone.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Cleaning invalid test customers ---');
  console.log(`DB: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@') || '(not set!)'}`);

  const candidates = await prisma.customer.findMany({
    where: { totalSpent: 0 },
    select: { id: true, name: true, phone: true, ctvId: true },
  });

  const invalid = candidates.filter(
    (c) => !/^0\d{9}$/.test(c.phone || '')
  );

  if (invalid.length === 0) {
    console.log('No invalid customers to delete.');
    return;
  }

  for (const c of invalid) {
    console.log(`  - id=${c.id} ctvId=${c.ctvId} name="${c.name}" phone="${c.phone}"`);
  }

  const result = await prisma.customer.deleteMany({
    where: { id: { in: invalid.map((c) => c.id) } },
  });
  console.log(`\nDeleted ${result.count} customer row(s).`);
}

main()
  .catch((e) => { console.error('FAILED:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
