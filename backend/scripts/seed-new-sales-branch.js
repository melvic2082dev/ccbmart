/**
 * Seed nhánh CTV sales mới theo yêu cầu (giữ nguyên các nhánh cũ).
 *
 *   Vũ Hoàng Quỳnh                 (GDKD)
 *   └── Trịnh Thanh Bình           (GDV)
 *       ├── Trần Thị Thu Nga       (TP)   1988 — sales bảo hiểm 6 năm
 *       │   └── Cao Nguyên Hoàng   (PP)   1987 — sales ngân hàng + bảo hiểm
 *       │       └── Trịnh Duy Anh  (PP)   1995 — sales bảo hiểm
 *       └── Thanh Trâm             (TP)   1986
 *           └── Mai Thị Thuần      (PP)   1989
 *               └── Phạm Trung Đức (PP)   1987
 *
 * Idempotent: upserts theo email.
 *
 * Usage:  cd backend && node scripts/seed-new-sales-branch.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'sales1234';

function emailFor(name) {
  // Strip diacritics + lowercase + dot-separate
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '.')
    + '@ccbmart.vn';
}

function phoneFor(seed) {
  // Stable per-name phone number for demo
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `09${String(10000000 + (h % 90000000)).slice(0, 8)}`;
}

const TREE = [
  {
    name: 'Vũ Hoàng Quỳnh',     rank: 'GDKD', parent: null,
    bio: null,                   birthYear: null,
  },
  {
    name: 'Trịnh Thanh Bình',   rank: 'GDV',  parent: 'Vũ Hoàng Quỳnh',
    bio: null,                   birthYear: null,
  },
  {
    name: 'Trần Thị Thu Nga',   rank: 'TP',   parent: 'Trịnh Thanh Bình',
    bio: 'Kinh nghiệm sales bảo hiểm 6 năm.', birthYear: 1988,
  },
  {
    name: 'Cao Nguyên Hoàng',   rank: 'PP',   parent: 'Trần Thị Thu Nga',
    bio: 'Kinh nghiệm sales ngân hàng và bảo hiểm.', birthYear: 1987,
  },
  {
    name: 'Trịnh Duy Anh',      rank: 'PP',   parent: 'Cao Nguyên Hoàng',
    bio: 'Kinh nghiệm sales bảo hiểm.', birthYear: 1995,
  },
  {
    name: 'Thanh Trâm',         rank: 'TP',   parent: 'Trịnh Thanh Bình',
    bio: null,                   birthYear: 1986,
  },
  {
    name: 'Mai Thị Thuần',      rank: 'PP',   parent: 'Thanh Trâm',
    bio: null,                   birthYear: 1989,
  },
  {
    name: 'Phạm Trung Đức',     rank: 'PP',   parent: 'Mai Thị Thuần',
    bio: null,                   birthYear: 1987,
  },
];

async function main() {
  console.log('=== Seed new sales branch (Vũ Hoàng Quỳnh → ...) ===\n');
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const idByName = new Map();

  for (const node of TREE) {
    const email = emailFor(node.name);
    const parentId = node.parent ? idByName.get(node.parent) || null : null;
    if (node.parent && !parentId) {
      console.warn(`  ⚠ parent "${node.parent}" not yet created — skipping ${node.name}`);
      continue;
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: node.name,
        rank: node.rank,
        parentId,
        bio: node.bio,
        birthYear: node.birthYear,
        // Don't touch password/isActive/etc. on re-run.
      },
      create: {
        email,
        passwordHash,
        name: node.name,
        phone: phoneFor(node.name),
        role: 'ctv',
        rank: node.rank,
        parentId,
        isActive: true,
        bio: node.bio,
        birthYear: node.birthYear,
        fixedSalaryEnabled: true, // default rank salary applies
      },
    });

    idByName.set(node.name, user.id);

    const parentTxt = node.parent ? `← ${node.parent}` : '(root)';
    const bioTxt = node.bio ? ` · "${node.bio.slice(0, 50)}…"` : '';
    const yearTxt = node.birthYear ? ` · ${node.birthYear}` : '';
    console.log(`  [${String(user.id).padStart(3)}] ${node.rank.padEnd(4)} ${node.name.padEnd(22)} ${parentTxt}${yearTxt}${bioTxt}`);
  }

  console.log('\nDefault password (tất cả 8 user):', DEFAULT_PASSWORD);
  console.log('\nDone.');
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
