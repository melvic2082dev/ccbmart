const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomPhone() {
  return `09${Math.floor(10000000 + Math.random() * 90000000)}`;
}

const FIRST_NAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương'];
const LAST_NAMES = ['Anh', 'Bình', 'Cường', 'Dũng', 'Hà', 'Hải', 'Hương', 'Khoa', 'Lan', 'Linh', 'Mai', 'Minh', 'Nam', 'Phong', 'Quân', 'Sơn', 'Thảo', 'Trang', 'Tuấn', 'Vy'];
const MIDDLE_NAMES = ['Văn', 'Thị', 'Đức', 'Minh', 'Thanh', 'Hoàng', 'Ngọc', 'Kim', 'Quốc', 'Xuân'];

function randomName() {
  return `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${MIDDLE_NAMES[Math.floor(Math.random() * MIDDLE_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`;
}

async function main() {
  console.log('🌱 Seeding database (V12.1)...');

  // Clean existing data (order matters for foreign keys)
  await prisma.trainingLog.deleteMany();
  await prisma.b2BContract.deleteMany();
  await prisma.businessHousehold.deleteMany();
  await prisma.feeConfig.deleteMany();
  await prisma.transactionItem.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.inventoryWarning.deleteMany();
  await prisma.kpiLog.deleteMany();
  await prisma.rankHistory.deleteMany();
  await prisma.promotionEligibility.deleteMany();
  await prisma.teamBonus.deleteMany();
  await prisma.ctvHierarchy.deleteMany();
  await prisma.syncLog.deleteMany();
  await prisma.agencyCommissionConfig.deleteMany();
  await prisma.commissionConfig.deleteMany();
  await prisma.agency.deleteMany();
  await prisma.user.deleteMany();
  await prisma.product.deleteMany();

  const passwordHash = await bcrypt.hash('admin123', 10);
  const ctvHash = await bcrypt.hash('ctv123', 10);
  const agencyHash = await bcrypt.hash('agency123', 10);

  // 1. Admin user
  const admin = await prisma.user.create({
    data: {
      email: 'admin@ccbmart.vn',
      passwordHash,
      role: 'admin',
      name: 'Admin CCB Mart',
      phone: '0901000000',
    },
  });
  console.log('✅ Admin created');

  // 2. CTV Hierarchy: GDKD -> GDV -> TP -> PP -> CTV
  const gdkd = await prisma.user.create({
    data: {
      email: 'ctv1@ccbmart.vn',
      passwordHash: ctvHash,
      role: 'ctv',
      name: 'Nguyễn Văn Hùng',
      phone: '0901100001',
      rank: 'GDKD',
      isBusinessHousehold: true,
    },
  });

  const gdv1 = await prisma.user.create({
    data: {
      email: 'ctv2@ccbmart.vn',
      passwordHash: ctvHash,
      role: 'ctv',
      name: 'Trần Thị Mai',
      phone: '0901100002',
      rank: 'GDV',
      parentId: gdkd.id,
      isBusinessHousehold: true,
    },
  });

  const gdv2 = await prisma.user.create({
    data: {
      email: 'ctv3@ccbmart.vn',
      passwordHash: ctvHash,
      role: 'ctv',
      name: 'Lê Đức Phong',
      phone: '0901100003',
      rank: 'GDV',
      parentId: gdkd.id,
    },
  });

  const tp1 = await prisma.user.create({
    data: {
      email: 'ctv4@ccbmart.vn',
      passwordHash: ctvHash,
      role: 'ctv',
      name: 'Phạm Hoàng Nam',
      phone: '0901100004',
      rank: 'TP',
      parentId: gdv1.id,
      isBusinessHousehold: true,
    },
  });

  const tp2 = await prisma.user.create({
    data: {
      email: 'ctv5@ccbmart.vn',
      passwordHash: ctvHash,
      role: 'ctv',
      name: 'Hoàng Ngọc Lan',
      phone: '0901100005',
      rank: 'TP',
      parentId: gdv1.id,
    },
  });

  const tp3 = await prisma.user.create({
    data: {
      email: 'ctv6@ccbmart.vn',
      passwordHash: ctvHash,
      role: 'ctv',
      name: 'Vũ Thanh Sơn',
      phone: '0901100006',
      rank: 'TP',
      parentId: gdv2.id,
    },
  });

  // PP level
  const pps = [];
  const ppParents = [tp1, tp1, tp2, tp2, tp3, tp3];
  for (let i = 0; i < 6; i++) {
    const pp = await prisma.user.create({
      data: {
        email: `pp${i + 1}@ccbmart.vn`,
        passwordHash: ctvHash,
        role: 'ctv',
        name: randomName(),
        phone: randomPhone(),
        rank: 'PP',
        parentId: ppParents[i].id,
      },
    });
    pps.push(pp);
  }

  // CTV level (regular CTVs under PPs)
  const ctvs = [];
  for (let i = 0; i < 18; i++) {
    const parentPP = pps[i % pps.length];
    const ctv = await prisma.user.create({
      data: {
        email: `ctv_regular${i + 1}@ccbmart.vn`,
        passwordHash: ctvHash,
        role: 'ctv',
        name: randomName(),
        phone: randomPhone(),
        rank: 'CTV',
        parentId: parentPP.id,
      },
    });
    ctvs.push(ctv);
  }

  // All CTV users for transaction assignment
  const allCtvUsers = [gdkd, gdv1, gdv2, tp1, tp2, tp3, ...pps, ...ctvs];
  console.log(`✅ ${allCtvUsers.length} CTV users created (hierarchy: GDKD→GDV→TP→PP→CTV)`);

  // 3. Build CtvHierarchy records
  for (const ctv of allCtvUsers) {
    if (!ctv.parentId) continue;
    await prisma.ctvHierarchy.create({
      data: { ctvId: ctv.id, managerId: ctv.parentId, level: 'F1' },
    });
    const parent = await prisma.user.findUnique({ where: { id: ctv.parentId } });
    if (parent?.parentId) {
      await prisma.ctvHierarchy.create({
        data: { ctvId: ctv.id, managerId: parent.parentId, level: 'F2' },
      });
      const grandparent = await prisma.user.findUnique({ where: { id: parent.parentId } });
      if (grandparent?.parentId) {
        await prisma.ctvHierarchy.create({
          data: { ctvId: ctv.id, managerId: grandparent.parentId, level: 'F3' },
        });
      }
    }
  }
  console.log('✅ CTV hierarchy records created');

  // 4. Agency users
  const agencyUser1 = await prisma.user.create({
    data: { email: 'agency1@ccbmart.vn', passwordHash: agencyHash, role: 'agency', name: 'Đại lý Bình Thạnh', phone: '0902200001' },
  });
  const agencyUser2 = await prisma.user.create({
    data: { email: 'agency2@ccbmart.vn', passwordHash: agencyHash, role: 'agency', name: 'Đại lý Thủ Đức', phone: '0902200002' },
  });
  const agencyUser3 = await prisma.user.create({
    data: { email: 'agency3@ccbmart.vn', passwordHash: agencyHash, role: 'agency', name: 'Đại lý Gò Vấp', phone: '0902200003' },
  });

  const agency1 = await prisma.agency.create({
    data: { userId: agencyUser1.id, name: 'Đại lý Bình Thạnh', depositAmount: 100000000, depositTier: '100tr', address: '123 Điện Biên Phủ, Bình Thạnh, TP.HCM' },
  });
  const agency2 = await prisma.agency.create({
    data: { userId: agencyUser2.id, name: 'Đại lý Thủ Đức', depositAmount: 300000000, depositTier: '300tr', address: '456 Võ Văn Ngân, Thủ Đức, TP.HCM' },
  });
  const agency3 = await prisma.agency.create({
    data: { userId: agencyUser3.id, name: 'Đại lý Gò Vấp', depositAmount: 50000000, depositTier: '50tr', address: '789 Quang Trung, Gò Vấp, TP.HCM' },
  });
  const agencies = [agency1, agency2, agency3];
  console.log('✅ 3 agencies created');

  // 5. Commission configs (V12.1: NO F1/F2/F3)
  await prisma.commissionConfig.createMany({
    data: [
      { tier: 'CTV',  selfSalePct: 0.20, fixedSalary: 0,        isSoftSalary: false },
      { tier: 'PP',   selfSalePct: 0.20, fixedSalary: 5000000,  isSoftSalary: true },
      { tier: 'TP',   selfSalePct: 0.30, fixedSalary: 10000000, isSoftSalary: true },
      { tier: 'GDV',  selfSalePct: 0.35, fixedSalary: 18000000, isSoftSalary: true },
      { tier: 'GDKD', selfSalePct: 0.38, fixedSalary: 30000000, isSoftSalary: true },
    ],
  });

  await prisma.agencyCommissionConfig.createMany({
    data: [
      { group: 'A', commissionPct: 0.08, bonusPct: 0.02 },
      { group: 'B', commissionPct: 0.15, bonusPct: 0.03 },
      { group: 'C', commissionPct: 0.20, bonusPct: 0.05 },
    ],
  });
  console.log('✅ Commission configs created (V12.1: no F1/F2/F3)');

  // 6. Fee Config (V12.1: Phí DV đào tạo)
  await prisma.feeConfig.createMany({
    data: [
      { tier: 'M0', minCombo: 0,   maxCombo: 49,   feeAmount: 0,       description: 'Không phí' },
      { tier: 'M1', minCombo: 50,  maxCombo: 99,   feeAmount: 1500000, description: '50-99 combo nhánh' },
      { tier: 'M2', minCombo: 100, maxCombo: 199,  feeAmount: 3000000, description: '100-199 combo nhánh' },
      { tier: 'M3', minCombo: 200, maxCombo: 299,  feeAmount: 4500000, description: '200-299 combo nhánh' },
      { tier: 'M4', minCombo: 300, maxCombo: 399,  feeAmount: 6000000, description: '300-399 combo nhánh' },
      { tier: 'M5', minCombo: 400, maxCombo: null,  feeAmount: 7500000, description: '400+ combo nhánh' },
    ],
  });
  console.log('✅ Fee config (M0-M5) created');

  // 7. Business Households (for PP, TP, GĐV)
  await prisma.businessHousehold.createMany({
    data: [
      { userId: gdkd.id, businessName: 'HKD Nguyễn Văn Hùng', taxCode: '0301234567', businessLicense: 'GP-2024-001', status: 'active' },
      { userId: gdv1.id, businessName: 'HKD Trần Thị Mai', taxCode: '0301234568', businessLicense: 'GP-2024-002', status: 'active' },
      { userId: tp1.id, businessName: 'HKD Phạm Hoàng Nam', taxCode: '0301234569', businessLicense: 'GP-2024-003', status: 'active' },
    ],
  });
  console.log('✅ 3 Business Households created');

  // 8. B2B Contracts
  const now = new Date();
  const oneYearLater = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  await prisma.b2BContract.createMany({
    data: [
      { contractNo: 'B2B-2024-001', trainerId: gdkd.id, traineeId: gdv1.id, expiredAt: oneYearLater, status: 'active' },
      { contractNo: 'B2B-2024-002', trainerId: gdkd.id, traineeId: gdv2.id, expiredAt: oneYearLater, status: 'active' },
      { contractNo: 'B2B-2024-003', trainerId: gdv1.id, traineeId: tp1.id, expiredAt: oneYearLater, status: 'active' },
      { contractNo: 'B2B-2024-004', trainerId: gdv1.id, traineeId: tp2.id, expiredAt: oneYearLater, status: 'active' },
      { contractNo: 'B2B-2024-005', trainerId: gdv2.id, traineeId: tp3.id, expiredAt: oneYearLater, status: 'active' },
    ],
  });
  console.log('✅ 5 B2B Contracts created');

  // 9. Training Logs (10 records, mix PENDING/VERIFIED)
  const trainingLogData = [
    { trainerId: gdkd.id, traineeId: gdv1.id, daysAgo: 2, duration: 60, content: 'Kỹ năng quản lý đội ngũ cấp GĐV', status: 'VERIFIED' },
    { trainerId: gdkd.id, traineeId: gdv2.id, daysAgo: 3, duration: 90, content: 'Chiến lược phát triển vùng miền Tây', status: 'VERIFIED' },
    { trainerId: gdv1.id, traineeId: tp1.id, daysAgo: 1, duration: 45, content: 'Kỹ năng bán hàng combo TPCN', status: 'PENDING' },
    { trainerId: gdv1.id, traineeId: tp2.id, daysAgo: 4, duration: 60, content: 'Quy trình đào tạo CTV mới', status: 'VERIFIED' },
    { trainerId: gdv2.id, traineeId: tp3.id, daysAgo: 5, duration: 30, content: 'Sử dụng hệ thống CCB Mart', status: 'PENDING' },
    { trainerId: tp1.id, traineeId: pps[0].id, daysAgo: 1, duration: 45, content: 'Kỹ năng chốt đơn online', status: 'PENDING' },
    { trainerId: tp1.id, traineeId: pps[1].id, daysAgo: 7, duration: 60, content: 'Xây dựng mạng lưới khách hàng', status: 'VERIFIED' },
    { trainerId: tp2.id, traineeId: pps[2].id, daysAgo: 3, duration: 90, content: 'Workshop sản phẩm mới Q2/2026', status: 'VERIFIED' },
    { trainerId: tp3.id, traineeId: pps[4].id, daysAgo: 2, duration: 30, content: 'Hướng dẫn app CCB Mart', status: 'PENDING' },
    { trainerId: gdkd.id, traineeId: gdv1.id, daysAgo: 10, duration: 120, content: 'Review chiến lược Q1 & kế hoạch Q2', status: 'VERIFIED' },
  ];
  for (const log of trainingLogData) {
    const sessionDate = new Date();
    sessionDate.setDate(sessionDate.getDate() - log.daysAgo);
    await prisma.trainingLog.create({
      data: {
        trainerId: log.trainerId,
        traineeId: log.traineeId,
        sessionDate,
        durationMinutes: log.duration,
        content: log.content,
        mentorConfirmed: true,
        menteeConfirmed: log.status === 'VERIFIED',
        status: log.status,
        verifiedBy: log.status === 'VERIFIED' ? admin.id : null,
        verifiedAt: log.status === 'VERIFIED' ? new Date() : null,
      },
    });
  }
  console.log('✅ 10 Training Logs created (mix PENDING/VERIFIED)');

  // 10. Products
  const products = await Promise.all([
    prisma.product.create({ data: { name: 'Combo Sức khỏe Vàng (TPCN)', category: 'TPCN', price: 2000000, cogsPct: 0.35, unit: 'combo' } }),
    prisma.product.create({ data: { name: 'Kardi Q10 - Hỗ trợ tim mạch', category: 'TPCN', price: 698000, cogsPct: 0.26, unit: 'hộp' } }),
    prisma.product.create({ data: { name: 'Canxi Nano K2 - Xương khớp', category: 'TPCN', price: 450000, cogsPct: 0.30, unit: 'hộp' } }),
    prisma.product.create({ data: { name: 'Trà Sâm Hàn Quốc', category: 'TPCN', price: 380000, cogsPct: 0.32, unit: 'hộp' } }),
    prisma.product.create({ data: { name: 'Rau củ Hikari (2kg)', category: 'NS', price: 80000, cogsPct: 0.85, unit: 'gói' } }),
    prisma.product.create({ data: { name: 'Gạo Hikari ST25 (5kg)', category: 'NS', price: 150000, cogsPct: 0.80, unit: 'bao' } }),
    prisma.product.create({ data: { name: 'Suất ăn Hikari', category: 'NS', price: 35000, cogsPct: 0.86, unit: 'suất' } }),
    prisma.product.create({ data: { name: 'Trái cây Hikari (1kg)', category: 'NS', price: 65000, cogsPct: 0.82, unit: 'gói' } }),
    prisma.product.create({ data: { name: 'Viên giặt nhập khẩu', category: 'FMCG', price: 82000, cogsPct: 0.43, unit: 'túi' } }),
    prisma.product.create({ data: { name: 'Tẩy toilet đa năng', category: 'FMCG', price: 55000, cogsPct: 0.45, unit: 'chai' } }),
    prisma.product.create({ data: { name: 'Nước lau sàn hữu cơ', category: 'FMCG', price: 68000, cogsPct: 0.42, unit: 'chai' } }),
    prisma.product.create({ data: { name: 'Sốt ớt Thái Sriracha', category: 'GiaVi', price: 45000, cogsPct: 0.55, unit: 'chai' } }),
    prisma.product.create({ data: { name: 'Tương ớt Hàn Quốc Gochujang', category: 'GiaVi', price: 89000, cogsPct: 0.50, unit: 'hũ' } }),
    prisma.product.create({ data: { name: 'Dầu hào Thái Premium', category: 'GiaVi', price: 65000, cogsPct: 0.52, unit: 'chai' } }),
    prisma.product.create({ data: { name: 'Nước sốt Hikari đặc biệt', category: 'CheBien', price: 120000, cogsPct: 0.45, unit: 'chai' } }),
  ]);
  console.log(`✅ ${products.length} products created`);

  // 11. Customers (100)
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const customers = [];

  for (let i = 0; i < 100; i++) {
    const isCtvCustomer = i < 60;
    const isAgencyCustomer = i >= 60 && i < 80;

    const customer = await prisma.customer.create({
      data: {
        name: randomName(),
        phone: randomPhone(),
        ctvId: isCtvCustomer ? allCtvUsers[i % allCtvUsers.length].id : null,
        agencyId: isAgencyCustomer ? agencies[i % agencies.length].id : null,
        firstPurchase: randomDate(threeMonthsAgo, now),
        totalSpent: 0,
      },
    });
    customers.push(customer);
  }
  console.log('✅ 100 customers created');

  // 12. Transactions (500, spread across 3 months)
  let txnCount = 0;
  const comboProduct = products[0];

  for (let i = 0; i < 500; i++) {
    const channel = i < 300 ? 'ctv' : i < 400 ? 'agency' : 'showroom';
    const txnDate = randomDate(threeMonthsAgo, now);

    let ctvId = null;
    let agencyId = null;
    let customerId = null;
    let totalAmount = 0;
    let cogsAmount = 0;
    const items = [];

    if (channel === 'ctv') {
      ctvId = allCtvUsers[i % allCtvUsers.length].id;
      customerId = customers[i % 60].id;

      if (Math.random() < 0.7) {
        const qty = Math.floor(Math.random() * 3) + 1;
        totalAmount = comboProduct.price * qty;
        cogsAmount = totalAmount * comboProduct.cogsPct;
        items.push({ productId: comboProduct.id, quantity: qty, unitPrice: comboProduct.price, totalPrice: totalAmount });
      } else {
        const numProducts = Math.floor(Math.random() * 3) + 1;
        for (let j = 0; j < numProducts; j++) {
          const prod = products[Math.floor(Math.random() * products.length)];
          const qty = Math.floor(Math.random() * 3) + 1;
          const lineTotal = prod.price * qty;
          totalAmount += lineTotal;
          cogsAmount += lineTotal * prod.cogsPct;
          items.push({ productId: prod.id, quantity: qty, unitPrice: prod.price, totalPrice: lineTotal });
        }
      }
    } else if (channel === 'agency') {
      agencyId = agencies[i % agencies.length].id;
      customerId = customers[60 + (i % 20)].id;

      const numProducts = Math.floor(Math.random() * 4) + 1;
      for (let j = 0; j < numProducts; j++) {
        const prod = products[Math.floor(Math.random() * products.length)];
        const qty = Math.floor(Math.random() * 5) + 1;
        const lineTotal = prod.price * qty;
        totalAmount += lineTotal;
        cogsAmount += lineTotal * prod.cogsPct;
        items.push({ productId: prod.id, quantity: qty, unitPrice: prod.price, totalPrice: lineTotal });
      }
    } else {
      customerId = customers[80 + (i % 20)].id;

      if (Math.random() < 0.5) {
        const suatAn = products[6];
        const qty = Math.floor(Math.random() * 5) + 1;
        totalAmount = suatAn.price * qty;
        cogsAmount = totalAmount * suatAn.cogsPct;
        items.push({ productId: suatAn.id, quantity: qty, unitPrice: suatAn.price, totalPrice: totalAmount });
      } else {
        const numProducts = Math.floor(Math.random() * 3) + 1;
        for (let j = 0; j < numProducts; j++) {
          const prod = products[Math.floor(Math.random() * products.length)];
          const qty = Math.floor(Math.random() * 3) + 1;
          const lineTotal = prod.price * qty;
          totalAmount += lineTotal;
          cogsAmount += lineTotal * prod.cogsPct;
          items.push({ productId: prod.id, quantity: qty, unitPrice: prod.price, totalPrice: lineTotal });
        }
      }
    }

    await prisma.transaction.create({
      data: {
        kiotvietOrderId: `KV-${String(txnDate.getFullYear()).slice(2)}${String(txnDate.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(4, '0')}`,
        customerId,
        ctvId,
        agencyId,
        channel,
        totalAmount,
        cogsAmount,
        createdAt: txnDate,
        items: { create: items },
      },
    });

    if (customerId) {
      await prisma.customer.update({
        where: { id: customerId },
        data: { totalSpent: { increment: totalAmount } },
      });
    }

    txnCount++;
  }
  console.log(`✅ ${txnCount} transactions created`);

  // 13. KPI Logs
  const keyCtvsForKpi = [gdkd, gdv1, gdv2, tp1, tp2, tp3, ...pps.slice(0, 3)];
  for (let monthOffset = 2; monthOffset >= 0; monthOffset--) {
    const d = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    for (const ctv of keyCtvsForKpi) {
      const selfSales = Math.floor(Math.random() * 30) + 35;
      const portfolioSize = ctv.rank === 'GDKD' ? 1100 + Math.floor(Math.random() * 200) :
                            ctv.rank === 'GDV' ? 550 + Math.floor(Math.random() * 100) :
                            ctv.rank === 'TP' ? 150 + Math.floor(Math.random() * 50) :
                            ctv.rank === 'PP' ? 50 + Math.floor(Math.random() * 20) : 0;

      await prisma.kpiLog.create({
        data: { ctvId: ctv.id, month: monthStr, selfSales, portfolioSize, rankBefore: ctv.rank, rankAfter: ctv.rank },
      });
    }
  }
  console.log('✅ KPI logs created');

  // 14. Rank History
  await prisma.rankHistory.createMany({
    data: [
      { ctvId: gdv1.id, oldRank: 'TP', newRank: 'GDV', reason: 'Đạt KPI thăng cấp: 50 combo cá nhân + 550 portfolio', changedBy: 'System', changedAt: new Date(now.getFullYear(), now.getMonth() - 2, 1) },
      { ctvId: tp1.id, oldRank: 'PP', newRank: 'TP', reason: 'Đạt KPI thăng cấp: 50 combo cá nhân + 150 portfolio', changedBy: 'System', changedAt: new Date(now.getFullYear(), now.getMonth() - 1, 15) },
      { ctvId: pps[0].id, oldRank: 'CTV', newRank: 'PP', reason: 'Đạt KPI thăng cấp: 50 combo cá nhân', changedBy: 'System', changedAt: new Date(now.getFullYear(), now.getMonth() - 1, 1) },
    ],
  });
  console.log('✅ Rank history created');

  // 15. Inventory Warnings
  const warningData = [
    { productId: products[4].id, agencyId: agency1.id, quantity: 5, warningType: 'expiring_soon', daysUntilExpiry: 10 },
    { productId: products[5].id, agencyId: agency1.id, quantity: 2, warningType: 'low_stock', daysUntilExpiry: 30 },
    { productId: products[7].id, agencyId: agency2.id, quantity: 8, warningType: 'expiring_soon', daysUntilExpiry: 3 },
    { productId: products[6].id, agencyId: agency2.id, quantity: 15, warningType: 'expiring_soon', daysUntilExpiry: 1 },
    { productId: products[9].id, agencyId: agency3.id, quantity: 3, warningType: 'low_stock', daysUntilExpiry: 60 },
    { productId: products[1].id, agencyId: null, quantity: 10, warningType: 'expiring_soon', daysUntilExpiry: 12 },
    { productId: products[11].id, agencyId: agency1.id, quantity: 20, warningType: 'expiring_soon', daysUntilExpiry: 5 },
  ];

  for (const w of warningData) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + w.daysUntilExpiry);
    await prisma.inventoryWarning.create({
      data: { productId: w.productId, agencyId: w.agencyId, quantity: w.quantity, expiryDate, warningType: w.warningType },
    });
  }
  console.log('✅ Inventory warnings created');

  // 16. Sync Logs
  for (let i = 0; i < 10; i++) {
    await prisma.syncLog.create({
      data: {
        source: 'kiotviet',
        recordsSynced: Math.floor(Math.random() * 100) + 20,
        status: Math.random() > 0.1 ? 'success' : 'partial',
        syncedAt: randomDate(threeMonthsAgo, now),
      },
    });
  }
  console.log('✅ Sync logs created');

  // 17. T+1 Promotion Eligibility
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const nextMonthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;

  await prisma.promotionEligibility.createMany({
    data: [
      { ctvId: gdv1.id, currentRank: 'GDV', targetRank: 'GDKD', effectiveMonth: nextMonthStr, status: 'pending' },
      { ctvId: tp1.id,  currentRank: 'TP',  targetRank: 'GDV',  effectiveMonth: nextMonthStr, status: 'pending' },
    ],
  });
  console.log('✅ Promotion eligibility created (T+1)');

  // 18. Team Bonuses
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

  await prisma.teamBonus.createMany({
    data: [
      { ctvId: gdkd.id, month: prevMonth, teamRevenue: 1800000000, bonusAmount: 18000000, tier: 'gold' },
      { ctvId: gdv1.id, month: prevMonth, teamRevenue: 620000000,  bonusAmount: 6200000,  tier: 'silver' },
      { ctvId: gdv2.id, month: prevMonth, teamRevenue: 410000000,  bonusAmount: 4100000,  tier: 'bronze' },
      { ctvId: gdkd.id, month: currentMonth, teamRevenue: 980000000, bonusAmount: 9800000, tier: 'silver' },
    ],
  });
  console.log('✅ Team bonuses created');

  console.log('\n🎉 Seed complete (V12.1)!');
  console.log('📧 Login credentials:');
  console.log('   admin@ccbmart.vn / admin123');
  console.log('   ctv1@ccbmart.vn / ctv123 (GĐKD)');
  console.log('   ctv2@ccbmart.vn / ctv123 (GĐV)');
  console.log('   agency1@ccbmart.vn / agency123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
