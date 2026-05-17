/**
 * One-off: import ảnh từ /photos/ vào avatar của 8 user nhánh mới.
 *
 * Tên file → tên user (match theo tên không dấu, lowercase, dấu cách → "_"):
 *   cao_nguyen_hoang.jpg     → Cao Nguyên Hoàng
 *   duy_anh.jpg              → Trịnh Duy Anh
 *   mai_thi_thuan.jpg        → Mai Thị Thuần
 *   pham_trung_duc.jpg       → Phạm Trung Đức
 *   thanh_tram.jpg           → Thanh Trâm
 *   tran_thi_thu_nga.jpg     → Trần Thị Thu Nga
 *   vu_hoang_quynh.jpg       → Vũ Hoàng Quỳnh   (file .jpg newer hơn .jpeg)
 *
 * Trịnh Thanh Bình hiện chưa có ảnh trong /photos/ — bỏ qua, giữ gradient.
 *
 * Idempotent: cleanup avatar cũ (nếu có) trước khi copy ảnh mới.
 *
 * Usage:  cd backend && node scripts/import-avatars-from-photos.js
 */

const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PHOTOS_DIR  = path.join(__dirname, '..', '..', 'photos');
const AVATAR_DIR  = path.join(__dirname, '..', 'uploads', 'avatars');

function normName(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .toLowerCase().trim()
    .replace(/\s+/g, '_');
}

const MANUAL_MAP = {
  // Photo file basename (no ext)   →  user name in DB
  'cao_nguyen_hoang':   'Cao Nguyên Hoàng',
  'duy_anh':            'Trịnh Duy Anh',
  'mai_thi_thuan':      'Mai Thị Thuần',
  'pham_trung_duc':     'Phạm Trung Đức',
  'thanh_tram':         'Thanh Trâm',
  'tran_thi_thu_nga':   'Trần Thị Thu Nga',
  'vu_hoang_quynh':     'Vũ Hoàng Quỳnh',
};

async function main() {
  console.log('=== Import avatars from /photos/ ===\n');

  fs.mkdirSync(AVATAR_DIR, { recursive: true });

  // Gather candidate files; for users with multiple files (e.g. .jpg + .jpeg),
  // pick the one with the most recent mtime — matches "user replaced it later".
  const files = fs.readdirSync(PHOTOS_DIR).filter(f => /\.(jpe?g|png|webp|gif)$/i.test(f));
  const candidates = new Map(); // base → { path, mtime }
  for (const f of files) {
    const base = path.basename(f, path.extname(f)).toLowerCase();
    const full = path.join(PHOTOS_DIR, f);
    const stat = fs.statSync(full);
    const existing = candidates.get(base);
    if (!existing || stat.mtimeMs > existing.mtime) {
      candidates.set(base, { path: full, mtime: stat.mtimeMs, ext: path.extname(f).toLowerCase() });
    }
  }

  let ok = 0, skip = 0;
  for (const [base, userName] of Object.entries(MANUAL_MAP)) {
    const cand = candidates.get(base);
    if (!cand) {
      console.log(`  ⚠ Không tìm thấy ảnh cho "${userName}" (base="${base}"), bỏ qua.`);
      skip++;
      continue;
    }
    const user = await prisma.user.findFirst({ where: { name: userName } });
    if (!user) {
      console.log(`  ✗ User "${userName}" không tồn tại trong DB.`);
      skip++;
      continue;
    }

    // Cleanup previous avatar file (nếu có)
    if (user.avatarUrl && user.avatarUrl.startsWith('/uploads/avatars/')) {
      const prev = path.join(__dirname, '..', user.avatarUrl);
      try { fs.unlinkSync(prev); } catch {}
    }

    // Copy mới với tên deterministic theo user id
    const ext = cand.ext || '.jpg';
    const dest = path.join(AVATAR_DIR, `ctv-${user.id}-photos-import${ext}`);
    fs.copyFileSync(cand.path, dest);
    const url = `/uploads/avatars/${path.basename(dest)}`;

    await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: url } });
    console.log(`  ✓ [${String(user.id).padStart(3)}] ${userName.padEnd(22)} ← ${path.basename(cand.path)}`);
    ok++;
  }

  console.log(`\n${ok} avatar set, ${skip} skipped.`);
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
