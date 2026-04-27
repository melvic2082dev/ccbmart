// Idempotent: adds a handful of sample notifications for ctv1@ccbmart.vn
// so /ctv/notifications isn't empty when QAing. Skips if the user already
// has any notifications.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ctv1 = await prisma.user.findUnique({ where: { email: 'ctv1@ccbmart.vn' } });
  if (!ctv1) throw new Error('ctv1@ccbmart.vn not found — run add-test-accounts.js first');

  const existing = await prisma.notification.count({ where: { userId: ctv1.id } });
  if (existing > 0) {
    console.log(`Skip: ctv1 already has ${existing} notification(s)`);
    return;
  }

  console.log(`--- Seeding sample notifications for ctv1 (id ${ctv1.id}) ---`);
  console.log(`DB: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@') || '(not set!)'}`);

  const now = new Date();
  const minutesAgo = (m) => new Date(now.getTime() - m * 60 * 1000);

  const samples = [
    {
      type: 'COMMISSION_PAID',
      title: 'Hoa hồng tháng 4/2026 đã được thanh toán',
      content: 'CCB Mart đã chuyển 30.000.000đ lương cứng + hoa hồng cho tài khoản của bạn. Vui lòng kiểm tra mục Hoá đơn để xem chi tiết.',
      isRead: false,
      createdAt: minutesAgo(15),
    },
    {
      type: 'BREAKAWAY_FEE_RECEIVED',
      title: 'Phí thoát ly tháng này: 2.650.000đ',
      content: 'Bạn nhận được phí thoát ly từ 4 nhánh trong tháng 4/2026 (L1: 1.500.000đ, L2: 1.100.000đ, L3: 50.000đ).',
      isRead: false,
      createdAt: minutesAgo(120),
    },
    {
      type: 'PROMOTION_ELIGIBLE',
      title: 'Bạn đủ điều kiện duy trì cấp GĐKD',
      content: 'KPI tháng 4/2026: 50/50 combo cá nhân, 1.250/1.000 combo nhánh. Cấp bậc GĐKD được duy trì cho tháng tới.',
      isRead: true,
      createdAt: minutesAgo(60 * 24),
    },
    {
      type: 'TRAINING_REMINDER',
      title: 'Nhắc nhở đào tạo tháng 4/2026',
      content: 'Bạn đã hoàn thành 18/20 giờ đào tạo. Còn 2 giờ nữa để đạt điều kiện nhận phí quản lý F1/F2/F3.',
      isRead: false,
      createdAt: minutesAgo(60 * 36),
    },
    {
      type: 'NEW_TRANSACTION',
      title: 'Giao dịch mới #411 đã được xác nhận',
      content: 'Khách hàng OK đã được ghi nhận. Số tiền: 1.800.000đ. Hoa hồng cá nhân của bạn: 684.000đ.',
      isRead: true,
      createdAt: minutesAgo(60 * 48),
    },
    {
      type: 'KYC_UPDATE',
      title: 'Hồ sơ eKYC chờ bổ sung',
      content: 'Vui lòng cập nhật ảnh CCCD mặt sau trong mục eKYC để duy trì trạng thái hoạt động.',
      isRead: true,
      createdAt: minutesAgo(60 * 72),
    },
  ];

  for (const n of samples) {
    await prisma.notification.create({
      data: { userId: ctv1.id, ...n },
    });
  }

  console.log(`✓ Created ${samples.length} notifications for ctv1`);
  console.log(`  Unread: ${samples.filter(s => !s.isRead).length}`);
}

main()
  .catch(e => { console.error('FAILED:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
