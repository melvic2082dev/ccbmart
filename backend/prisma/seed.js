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
  console.log('🌱 Seeding database (C12.4)...');

  // Clean existing data (order matters for foreign keys)
  // C13.3.1
  if (prisma.auditLog) await prisma.auditLog.deleteMany();
  if (prisma.notification) await prisma.notification.deleteMany();
  // Member-related tables (reference User) — delete BEFORE user.deleteMany below
  if (prisma.referralCommission) await prisma.referralCommission.deleteMany();
  if (prisma.depositHistory) await prisma.depositHistory.deleteMany();
  if (prisma.referralLog) await prisma.referralLog.deleteMany();
  if (prisma.memberWallet) await prisma.memberWallet.deleteMany();
  if (prisma.membershipTier) await prisma.membershipTier.deleteMany();
  // C12.4 new tables first
  if (prisma.breakawayFee) await prisma.breakawayFee.deleteMany();
  if (prisma.breakawayLog) await prisma.breakawayLog.deleteMany();
  if (prisma.managementFee) await prisma.managementFee.deleteMany();
  // V12.2 tables
  if (prisma.taxRecord) await prisma.taxRecord.deleteMany();
  if (prisma.autoTransferLog) await prisma.autoTransferLog.deleteMany();
  if (prisma.invoice) await prisma.invoice.deleteMany();
  await prisma.trainingLog.deleteMany();
  await prisma.b2BContract.deleteMany();
  await prisma.businessHousehold.deleteMany();
  await prisma.feeConfig.deleteMany();
  if (prisma.paymentProof) await prisma.paymentProof.deleteMany();
  await prisma.transactionItem.deleteMany();
  await prisma.transaction.deleteMany();
  if (prisma.cashDeposit) await prisma.cashDeposit.deleteMany();
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

  // 2. CTV Hierarchy — V13.2.1 "Tiêu chuẩn": 1 GĐKD + 4 GĐV + 8 TP + 16 PP + 32 CTV = 61 người
  // (Mỗi GĐV có 2 TP, mỗi TP có 2 PP, mỗi PP có 2 CTV)
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

  // 4 GDV dưới GDKD
  const gdvs = [];
  const gdvNames = [
    { name: 'Trần Thị Mai',      phone: '0901100002' },
    { name: 'Lê Đức Phong',      phone: '0901100003' },
    { name: 'Phạm Ngọc Hoa',     phone: '0901100004' },
    { name: 'Hoàng Minh Tuấn',   phone: '0901100005' },
  ];
  for (let i = 0; i < 4; i++) {
    const gdv = await prisma.user.create({
      data: {
        email: `gdv${i + 1}@ccbmart.vn`,
        passwordHash: ctvHash,
        role: 'ctv',
        name: gdvNames[i].name,
        phone: gdvNames[i].phone,
        rank: 'GDV',
        parentId: gdkd.id,
        isBusinessHousehold: i < 2, // 2 GĐV đầu là HKD
      },
    });
    gdvs.push(gdv);
  }

  // 8 TP (2 / GDV)
  const tps = [];
  for (let i = 0; i < 8; i++) {
    const parent = gdvs[Math.floor(i / 2)];
    const tp = await prisma.user.create({
      data: {
        email: `tp${i + 1}@ccbmart.vn`,
        passwordHash: ctvHash,
        role: 'ctv',
        name: randomName(),
        phone: randomPhone(),
        rank: 'TP',
        parentId: parent.id,
        isBusinessHousehold: i < 2,
      },
    });
    tps.push(tp);
  }

  // 16 PP (2 / TP)
  const pps = [];
  for (let i = 0; i < 16; i++) {
    const parent = tps[Math.floor(i / 2)];
    const pp = await prisma.user.create({
      data: {
        email: `pp${i + 1}@ccbmart.vn`,
        passwordHash: ctvHash,
        role: 'ctv',
        name: randomName(),
        phone: randomPhone(),
        rank: 'PP',
        parentId: parent.id,
      },
    });
    pps.push(pp);
  }

  // 32 CTV (2 / PP)
  const ctvs = [];
  for (let i = 0; i < 32; i++) {
    const parent = pps[Math.floor(i / 2)];
    const ctv = await prisma.user.create({
      data: {
        email: `ctv_regular${i + 1}@ccbmart.vn`,
        passwordHash: ctvHash,
        role: 'ctv',
        name: randomName(),
        phone: randomPhone(),
        rank: 'CTV',
        parentId: parent.id,
      },
    });
    ctvs.push(ctv);
  }

  // Aliases for backward compatibility with the rest of the seed
  const gdv1 = gdvs[0], gdv2 = gdvs[1];
  const tp1 = tps[0], tp2 = tps[1], tp3 = tps[2];

  const allCtvUsers = [gdkd, ...gdvs, ...tps, ...pps, ...ctvs];
  console.log(`✅ ${allCtvUsers.length} CTV users created — V13.2.1 Tiêu chuẩn: 1 GĐKD + ${gdvs.length} GĐV + ${tps.length} TP + ${pps.length} PP + ${ctvs.length} CTV`);

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

  // 7. Business Households (for PP, TP, GĐV) — with contract + bank info
  const nowSeed = new Date();
  function contractDates(monthsAgoSigned, termMonths = 12) {
    const signed = new Date(nowSeed.getFullYear(), nowSeed.getMonth() - monthsAgoSigned, 15);
    const expired = new Date(signed);
    expired.setMonth(expired.getMonth() + termMonths);
    return { signed, expired };
  }
  const hkdSeeds = [
    {
      userId: gdkd.id, name: 'HKD Nguyễn Văn Hùng', tax: '0301234567', license: 'GP-2024-001',
      signedOffset: 10, termMonths: 24,
      bank: { name: 'Vietcombank', accNo: '0071000123456', holder: 'NGUYEN VAN HUNG' },
      trainingRegistered: true,
    },
    {
      userId: gdv1.id, name: 'HKD Trần Thị Mai', tax: '0301234568', license: 'GP-2024-002',
      signedOffset: 13, termMonths: 12, // sắp hết hạn
      bank: { name: 'Techcombank', accNo: '19036998888', holder: 'TRAN THI MAI' },
      trainingRegistered: true,
    },
    {
      userId: tp1.id, name: 'HKD Phạm Hoàng Nam', tax: '0301234569', license: 'GP-2024-003',
      signedOffset: 3, termMonths: 12,
      bank: null, // chưa cập nhật TK ngân hàng
      trainingRegistered: false, // chưa đăng ký ngành đào tạo
    },
  ];
  for (let i = 0; i < hkdSeeds.length; i++) {
    const h = hkdSeeds[i];
    const { signed: dealerSigned, expired: dealerExpired } = contractDates(h.signedOffset, h.termMonths);
    const { signed: trainingSigned, expired: trainingExpired } = contractDates(h.signedOffset, h.termMonths);
    await prisma.businessHousehold.create({
      data: {
        userId: h.userId,
        businessName: h.name,
        taxCode: h.tax,
        businessLicense: h.license,
        status: 'active',
        dealerContractNo: `CCB-DL-${2024 + Math.floor(i / 3)}-${String(i + 1).padStart(3, '0')}`,
        dealerSignedAt: dealerSigned,
        dealerExpiredAt: dealerExpired,
        dealerTermMonths: h.termMonths,
        dealerPdfUrl: `/uploads/hkd/${h.userId}/dealer-contract.pdf`,
        trainingContractNo: `CCB-DT-${2024 + Math.floor(i / 3)}-${String(i + 1).padStart(3, '0')}`,
        trainingSignedAt: trainingSigned,
        trainingExpiredAt: trainingExpired,
        trainingTermMonths: h.termMonths,
        trainingPdfUrl: `/uploads/hkd/${h.userId}/training-contract.pdf`,
        bankName: h.bank?.name || null,
        bankAccountNo: h.bank?.accNo || null,
        bankAccountHolder: h.bank?.holder || null,
        trainingLineRegistered: h.trainingRegistered,
      },
    });
  }
  console.log(`✅ ${hkdSeeds.length} Business Households created (with contract + bank info)`);

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

  // =======================================================================
  // V12.2 ADDITIONS: eKYC, Invoices, Auto-Transfer, Tax Records
  // =======================================================================

  // 19. eKYC — 5 users VERIFIED, 5 SUBMITTED (pending review)
  const kycVerifiedUsers = [gdkd, gdv1, gdv2, tp1, tp2];
  for (const u of kycVerifiedUsers) {
    await prisma.user.update({
      where: { id: u.id },
      data: {
        idNumber: `0790${String(u.id).padStart(9, '0')}`,
        idFrontImage: `/uploads/kyc/${u.id}_front.jpg`,
        idBackImage: `/uploads/kyc/${u.id}_back.jpg`,
        // V13.3: 3 duy nhất — deviceId + IP
        kycDeviceId: `DEV-${u.id}-${Math.random().toString(36).slice(2, 10)}`,
        kycIpAddress: `192.168.${(u.id % 250) + 1}.${(u.id * 7) % 250 + 1}`,
        kycStatus: 'VERIFIED',
        kycSubmittedAt: new Date(now.getFullYear(), now.getMonth() - 1, 10),
        kycVerifiedAt: new Date(now.getFullYear(), now.getMonth() - 1, 12),
      },
    });
  }
  const kycSubmittedUsers = [tp3, pps[0], pps[1], pps[2], pps[3]];
  for (const u of kycSubmittedUsers) {
    await prisma.user.update({
      where: { id: u.id },
      data: {
        idNumber: `0790${String(u.id).padStart(9, '0')}`,
        idFrontImage: `/uploads/kyc/${u.id}_front.jpg`,
        idBackImage: `/uploads/kyc/${u.id}_back.jpg`,
        kycDeviceId: `DEV-${u.id}-${Math.random().toString(36).slice(2, 10)}`,
        kycIpAddress: `10.0.${(u.id % 250) + 1}.${(u.id * 3) % 250 + 1}`,
        kycStatus: 'SUBMITTED',
        kycSubmittedAt: new Date(),
      },
    });
  }
  console.log('✅ eKYC: 5 VERIFIED + 5 SUBMITTED');

  // 20. Invoices (20 records, mix of status)
  const invoiceStatuses = ['DRAFT', 'SENT', 'PAID', 'CANCELLED'];
  const feeTiers = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5'];
  const feeAmounts = { M0: 0, M1: 1500000, M2: 3000000, M3: 4500000, M4: 6000000, M5: 7500000 };
  const contracts = await prisma.b2BContract.findMany();

  const invoices = [];
  for (let i = 0; i < 20; i++) {
    const contract = contracts[i % contracts.length];
    const tier = feeTiers[(i % 5) + 1]; // skip M0
    const amount = Math.floor(feeAmounts[tier] * 0.85); // apply ~K factor
    const issuedMonth = new Date(now.getFullYear(), now.getMonth() - (i % 3), 28);
    const status = invoiceStatuses[i % 4];
    const seq = String(i + 1).padStart(4, '0');
    const mm = String(issuedMonth.getMonth() + 1).padStart(2, '0');
    const yy = issuedMonth.getFullYear();

    const inv = await prisma.invoice.create({
      data: {
        contractId: contract.id,
        fromUserId: contract.traineeId,
        toUserId: contract.trainerId,
        amount,
        feeTier: tier,
        invoiceNumber: `CCB-${yy}${mm}-${seq}`,
        issuedAt: issuedMonth,
        pdfUrl: `/uploads/invoices/CCB-${yy}${mm}-${seq}.pdf`,
        status,
      },
    });
    invoices.push(inv);
  }
  console.log('✅ 20 Invoices created (mix DRAFT/SENT/PAID/CANCELLED)');

  // 21. AutoTransferLog (30 records)
  const transferStatuses = ['PENDING', 'SUCCESS', 'SUCCESS', 'SUCCESS', 'FAILED'];
  for (let i = 0; i < 30; i++) {
    const contract = contracts[i % contracts.length];
    const status = transferStatuses[i % transferStatuses.length];
    const amount = Math.floor(Math.random() * 6000000) + 500000;
    const refInvoice = invoices[i % invoices.length];
    await prisma.autoTransferLog.create({
      data: {
        fromUserId: contract.traineeId,
        toUserId: contract.trainerId,
        amount: status === 'FAILED' ? 0 : amount,
        reference: refInvoice?.id,
        transferDate: new Date(now.getFullYear(), now.getMonth(), Math.max(1, 28 - i)),
        status,
        errorMessage: status === 'FAILED' ? 'Số dư không đủ thực hiện auto-transfer' : null,
      },
    });
  }
  console.log('✅ 30 AutoTransferLog records created');

  // 22. TaxRecord (15 records across key CTVs × 3 months)
  const taxUsers = [gdkd, gdv1, gdv2, tp1, tp2];
  let taxCreated = 0;
  for (let monthOffset = 0; monthOffset < 3 && taxCreated < 15; monthOffset++) {
    const d = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    for (const user of taxUsers) {
      if (taxCreated >= 15) break;
      const taxableIncome = Math.floor(Math.random() * 25000000) + 8000000;
      const taxAmount = Math.floor(taxableIncome * 0.10);
      await prisma.taxRecord.create({
        data: {
          userId: user.id,
          month: monthStr,
          taxableIncome,
          taxAmount,
          status: taxCreated % 3 === 0 ? 'PAID' : 'PENDING',
        },
      });
      taxCreated++;
    }
  }
  console.log(`✅ ${taxCreated} TaxRecord entries created`);

  // =======================================================================
  // C12.4 ADDITIONS: Management Fees (F1/F2/F3) + Breakaway Logs + Fees
  // -----------------------------------------------------------------------
  // Nguyên tắc: TẤT CẢ khoản thù lao/HH/phí đều do CCB Mart chi trả từ
  // doanh thu bán hàng. Không có chuyển tiền giữa đối tác.
  // =======================================================================

  // 23. ManagementFee — 20 records (mix F1/F2/F3, mix PAID/PENDING)
  // F1 (10% - TP+): upline là TP/GDV/GDKD, from = PP/CTV
  // F2 (5%  - GDV+): upline là GDV/GDKD
  // F3 (3%  - GDKD): upline là GDKD
  const mgmtFeeSeeds = [];

  // F1 records: TPs nhận 10% combo revenue của các PP/CTV dưới
  // tp1 nhận từ pps[0], pps[1]
  mgmtFeeSeeds.push({ fromId: pps[0].id, toId: tp1.id, level: 1, pct: 0.10 });
  mgmtFeeSeeds.push({ fromId: pps[1].id, toId: tp1.id, level: 1, pct: 0.10 });
  mgmtFeeSeeds.push({ fromId: pps[2].id, toId: tp2.id, level: 1, pct: 0.10 });
  mgmtFeeSeeds.push({ fromId: pps[3].id, toId: tp2.id, level: 1, pct: 0.10 });
  mgmtFeeSeeds.push({ fromId: pps[4].id, toId: tp3.id, level: 1, pct: 0.10 });
  mgmtFeeSeeds.push({ fromId: ctvs[0].id, toId: pps[0].id, level: 1, pct: 0.10 }); // PP is actually below TP — but demo

  // F2 records: GDV nhận 5%
  mgmtFeeSeeds.push({ fromId: tp1.id, toId: gdv1.id, level: 2, pct: 0.05 });
  mgmtFeeSeeds.push({ fromId: tp2.id, toId: gdv1.id, level: 2, pct: 0.05 });
  mgmtFeeSeeds.push({ fromId: tp3.id, toId: gdv2.id, level: 2, pct: 0.05 });
  mgmtFeeSeeds.push({ fromId: pps[0].id, toId: gdv1.id, level: 2, pct: 0.05 });
  mgmtFeeSeeds.push({ fromId: pps[2].id, toId: gdv1.id, level: 2, pct: 0.05 });
  mgmtFeeSeeds.push({ fromId: pps[4].id, toId: gdv2.id, level: 2, pct: 0.05 });

  // F3 records: GDKD nhận 3%
  mgmtFeeSeeds.push({ fromId: gdv1.id, toId: gdkd.id, level: 3, pct: 0.03 });
  mgmtFeeSeeds.push({ fromId: gdv2.id, toId: gdkd.id, level: 3, pct: 0.03 });
  mgmtFeeSeeds.push({ fromId: tp1.id, toId: gdkd.id, level: 3, pct: 0.03 });
  mgmtFeeSeeds.push({ fromId: tp2.id, toId: gdkd.id, level: 3, pct: 0.03 });
  mgmtFeeSeeds.push({ fromId: tp3.id, toId: gdkd.id, level: 3, pct: 0.03 });
  mgmtFeeSeeds.push({ fromId: pps[0].id, toId: gdkd.id, level: 3, pct: 0.03 });
  mgmtFeeSeeds.push({ fromId: pps[1].id, toId: gdkd.id, level: 3, pct: 0.03 });
  mgmtFeeSeeds.push({ fromId: pps[2].id, toId: gdkd.id, level: 3, pct: 0.03 });

  let mgmtCreated = 0;
  for (let i = 0; i < mgmtFeeSeeds.length; i++) {
    const s = mgmtFeeSeeds[i];
    // Random "combo revenue" base giữa 15-60 triệu → amount = base * pct
    const baseRevenue = Math.floor(Math.random() * 45000000) + 15000000;
    const amount = Math.floor(baseRevenue * s.pct);
    const monthOffset = i % 3;
    const d = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    await prisma.managementFee.create({
      data: {
        fromUserId: s.fromId,
        toUserId: s.toId,
        level: s.level,
        amount,
        month: monthStr,
        status: i % 3 === 0 ? 'PAID' : 'PENDING',
      },
    });
    mgmtCreated++;
  }
  console.log(`✅ ${mgmtCreated} ManagementFee records created (F1/F2/F3)`);

  // 24. BreakawayLog — 3 records (2 ACTIVE, 1 EXPIRED)
  //    Dùng các user đã có trong hệ thống. Giả lập:
  //    - tp1 thoát ly khỏi gdv1 (2 tháng trước, ACTIVE, còn 10 tháng)
  //    - tp3 thoát ly khỏi gdv2 (5 tháng trước, ACTIVE, còn 7 tháng)
  //    - pps[5] thoát ly khỏi tp3 (14 tháng trước, EXPIRED)
  // Deeper hierarchy for L3 test: pps[0] → TP1 → GDV1 → GDKD
  // When pps[0] vượt cấp, oldParent=TP1, newParent=GDV1 → GDKD vẫn được nhận L3 (1%)
  const breakawaySeeds = [
    { userId: tp1.id, oldParentId: gdv1.id, newParentId: gdkd.id, monthsAgo: 2, status: 'ACTIVE' },
    // L3 eligible: oldParent=tp3, newParent=gdv2 (GĐKD không ở trong)
    { userId: pps[4].id, oldParentId: tp3.id, newParentId: gdv2.id, monthsAgo: 5, status: 'ACTIVE' },
    { userId: pps[5].id, oldParentId: tp3.id, newParentId: gdv2.id, monthsAgo: 14, status: 'EXPIRED' },
  ];

  const createdBreakawayLogs = [];
  for (const s of breakawaySeeds) {
    const breakawayAt = new Date(now.getFullYear(), now.getMonth() - s.monthsAgo, 15);
    const expireAt = new Date(breakawayAt);
    expireAt.setMonth(expireAt.getMonth() + 12);

    const log = await prisma.breakawayLog.create({
      data: {
        userId: s.userId,
        oldParentId: s.oldParentId,
        newParentId: s.newParentId,
        breakawayAt,
        expireAt,
        status: s.status,
      },
    });
    createdBreakawayLogs.push(log);
  }
  console.log(`✅ ${createdBreakawayLogs.length} BreakawayLog records created (2 ACTIVE, 1 EXPIRED)`);

  // 25. BreakawayFee — 15 records across 3 months for the 2 active logs
  let breakFeeCreated = 0;
  const activeLogs = createdBreakawayLogs.filter((l) => l.status === 'ACTIVE');
  for (let monthOffset = 0; monthOffset < 3 && breakFeeCreated < 15; monthOffset++) {
    const d = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    for (const log of activeLogs) {
      if (breakFeeCreated >= 15) break;
      // Random subtree revenue giữa 30-100 triệu
      const revenue = Math.floor(Math.random() * 70000000) + 30000000;

      // Level 1: 3% cho oldParent
      await prisma.breakawayFee.create({
        data: {
          breakawayLogId: log.id,
          fromUserId: log.userId,
          toUserId: log.oldParentId,
          level: 1,
          amount: Math.floor(revenue * 0.03),
          month: monthStr,
          status: breakFeeCreated % 3 === 0 ? 'PAID' : 'PENDING',
        },
      });
      breakFeeCreated++;
      if (breakFeeCreated >= 15) break;

      // Level 2: 2% cho newParent (F2 cũ)
      if (log.newParentId !== log.oldParentId) {
        await prisma.breakawayFee.create({
          data: {
            breakawayLogId: log.id,
            fromUserId: log.userId,
            toUserId: log.newParentId,
            level: 2,
            amount: Math.floor(revenue * 0.02),
            month: monthStr,
            status: breakFeeCreated % 3 === 0 ? 'PAID' : 'PENDING',
          },
        });
        breakFeeCreated++;
      }
      if (breakFeeCreated >= 15) break;

      // Level 3: 1% cho GĐKD nếu GĐKD không phải old/new parent
      if (gdkd.id !== log.oldParentId && gdkd.id !== log.newParentId) {
        await prisma.breakawayFee.create({
          data: {
            breakawayLogId: log.id,
            fromUserId: log.userId,
            toUserId: gdkd.id,
            level: 3,
            amount: Math.floor(revenue * 0.01),
            month: monthStr,
            status: breakFeeCreated % 3 === 0 ? 'PAID' : 'PENDING',
          },
        });
        breakFeeCreated++;
      }
    }
  }
  console.log(`✅ ${breakFeeCreated} BreakawayFee records created`);

  // 23. Reconciliation mockup data (Đối soát)
  // 23.1 — PENDING CTV transactions (bank transfer + cash)
  // Distribute so a few CTVs have multiple cash txns (for batch deposit testing)
  const ctvSellers = [gdv1, gdv2, tp1, tp2, tp3, ...pps.slice(0, 4), ...ctvs.slice(0, 8)];
  const cashConcentrators = [tp1.id, tp2.id, pps[0].id]; // these 3 get multiple cash txns
  const combo = products[0]; // Combo Sức khoẻ Vàng
  const pendingTxnIds = [];
  const pendingCashByCtv = new Map(); // ctvId -> [{id, amount}]

  for (let i = 0; i < 30; i++) {
    // 40% of txns go to cash-concentrators as cash → they'll have 3-4 cash txns each
    const useConcentrator = i < 12; // first 12 go to concentrators as cash
    const seller = useConcentrator
      ? ctvSellers.find(s => s.id === cashConcentrators[i % cashConcentrators.length]) || ctvSellers[0]
      : ctvSellers[(i + 5) % ctvSellers.length];
    const customer = customers[i % customers.length];
    const paymentMethod = useConcentrator
      ? 'cash'
      : (i % 3 === 0 ? 'bank_transfer' : i % 3 === 1 ? 'momo' : 'zalopay');
    const qty = 1 + Math.floor(Math.random() * 3);
    const totalAmount = combo.price * qty;
    const cogsAmount = totalAmount * combo.cogsPct;
    const hoursAgo = Math.floor(Math.random() * 72) + 1; // 1-72h wait
    const submittedAt = new Date(Date.now() - hoursAgo * 3600 * 1000);

    const tx = await prisma.transaction.create({
      data: {
        kiotvietOrderId: `KV-PEND-${String(i + 1).padStart(4, '0')}`,
        customerId: customer.id,
        ctvId: seller.id,
        channel: 'ctv',
        totalAmount,
        cogsAmount,
        status: 'PENDING',
        paymentMethod,
        bankCode: paymentMethod === 'bank_transfer' ? 'VCB' : null,
        ctvSubmittedAt: submittedAt,
        createdAt: submittedAt,
        items: { create: [{ productId: combo.id, quantity: qty, unitPrice: combo.price, totalPrice: totalAmount }] },
      },
    });
    pendingTxnIds.push(tx.id);

    // Payment proof for ~60% of bank transfer txns (mock image URL)
    if (paymentMethod === 'bank_transfer' && Math.random() < 0.6) {
      await prisma.paymentProof.create({
        data: {
          transactionId: tx.id,
          imageUrl: `https://placehold.co/600x800/10b981/white?text=Bien+lai+TX${tx.id}`,
          uploadedBy: seller.id,
          notes: i % 4 === 0 ? `Đã CK lúc ${submittedAt.toLocaleTimeString('vi-VN')}` : null,
        },
      });
    }

    // Track cash txns per CTV for deposit grouping
    if (paymentMethod === 'cash') {
      if (!pendingCashByCtv.has(seller.id)) pendingCashByCtv.set(seller.id, []);
      pendingCashByCtv.get(seller.id).push({ id: tx.id, amount: totalAmount });
    }
  }
  console.log(`✅ ${pendingTxnIds.length} PENDING CTV transactions created (mock đối soát)`);

  // 23.2 — PENDING cash deposits (batch cash txns per CTV)
  let depositsCreated = 0;
  for (const [ctvId, txList] of pendingCashByCtv.entries()) {
    if (txList.length < 2) continue; // only batch when ≥2 cash txns

    const txIds = txList.map(t => t.id);
    const total = txList.reduce((s, t) => s + t.amount, 0);
    const hoursAgo = Math.floor(Math.random() * 48) + 2;

    const deposit = await prisma.cashDeposit.create({
      data: {
        ctvId,
        amount: total,
        transactionIds: JSON.stringify(txIds),
        status: 'PENDING',
        depositedAt: new Date(Date.now() - hoursAgo * 3600 * 1000),
        notes: 'Nộp tiền mặt gom từ các đơn bán tuần này',
      },
    });
    await prisma.transaction.updateMany({
      where: { id: { in: txIds } },
      data: { cashDepositId: deposit.id },
    });
    depositsCreated++;
  }
  console.log(`✅ ${depositsCreated} PENDING cash deposits created`);

  // 23.3 — A few CONFIRMED/REJECTED txns for history view
  const confirmed = await prisma.transaction.findMany({
    where: { channel: 'ctv', status: 'CONFIRMED' },
    take: 10,
  });
  // Mark pre-existing CTV transactions as CONFIRMED with a stamped confirmation
  await prisma.transaction.updateMany({
    where: { channel: 'ctv', status: 'CONFIRMED', confirmedBy: null },
    data: {
      confirmedBy: admin.id,
      confirmedAt: new Date(Date.now() - 24 * 3600 * 1000),
      paymentMethod: 'bank_transfer',
    },
  });

  // 2 REJECTED examples
  if (confirmed.length >= 2) {
    await prisma.transaction.update({
      where: { id: confirmed[0].id },
      data: {
        status: 'REJECTED',
        rejectedReason: 'Chứng từ không khớp — số tiền CK lệch 100.000đ',
        confirmedBy: admin.id,
        confirmedAt: new Date(Date.now() - 12 * 3600 * 1000),
        paymentMethod: 'bank_transfer',
      },
    });
    await prisma.transaction.update({
      where: { id: confirmed[1].id },
      data: {
        status: 'REJECTED',
        rejectedReason: 'CTV chưa tải bằng chứng thanh toán',
        confirmedBy: admin.id,
        confirmedAt: new Date(Date.now() - 6 * 3600 * 1000),
        paymentMethod: 'bank_transfer',
      },
    });
    console.log('✅ 2 REJECTED sample transactions created');
  }

  // 24. Membership — tiers + wallets (V13.3: 4 hạng Green/Basic/Standard/VIP Gold)
  // Clean + reseed member tables
  if (prisma.referralCommission) await prisma.referralCommission.deleteMany();
  if (prisma.depositHistory) await prisma.depositHistory.deleteMany();
  if (prisma.referralLog)    await prisma.referralLog.deleteMany();
  if (prisma.memberWallet)   await prisma.memberWallet.deleteMany();
  if (prisma.membershipTier) await prisma.membershipTier.deleteMany();

  // V13.3: 4 hạng thẻ thành viên, cap referral 2tr/tháng (đồng nhất)
  const tiers = await Promise.all([
    prisma.membershipTier.create({ data: {
      name: 'GREEN',    minDeposit: 0,           pointsRate: 0.01, discountPct: 0.00, referralPct: 0.01, monthlyReferralCap: 2_000_000, color: 'green',
      description: 'Hạng khởi đầu — tích 1% điểm, referral 1%',
    } }),
    prisma.membershipTier.create({ data: {
      name: 'BASIC',    minDeposit: 2_000_000,   pointsRate: 0.015, discountPct: 0.02, referralPct: 0.015, monthlyReferralCap: 2_000_000, color: 'slate',
      description: 'Nạp từ 2tr — tích 1.5%, giảm 2%',
    } }),
    prisma.membershipTier.create({ data: {
      name: 'STANDARD', minDeposit: 10_000_000,  pointsRate: 0.02, discountPct: 0.05, referralPct: 0.02, monthlyReferralCap: 2_000_000, color: 'blue',
      description: 'Nạp từ 10tr — tích 2%, giảm 5%',
    } }),
    prisma.membershipTier.create({ data: {
      name: 'VIP_GOLD', minDeposit: 30_000_000,  pointsRate: 0.03, discountPct: 0.08, referralPct: 0.03, monthlyReferralCap: 2_000_000, color: 'amber',
      description: 'VIP Gold — nạp từ 30tr, tích 3%, giảm 8%, ưu đãi VIP',
    } }),
  ]);
  const tierByMin = tiers.sort((a, b) => b.minDeposit - a.minDeposit);

  function pickTier(deposit) {
    return tierByMin.find(t => deposit >= t.minDeposit) || tierByMin[tierByMin.length - 1];
  }
  function genRefCode() {
    const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let s = 'CCB_';
    for (let i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)];
    return s;
  }

  // 24.1 — Gán MemberWallet cho 20 CTV (multi-role: vừa bán vừa mua)
  // V13.3: balance = available + reserve (70/30)
  const ctvMembers = [gdkd, gdv1, gdv2, tp1, tp2, tp3, ...pps.slice(0, 6), ...ctvs.slice(0, 8)];
  let walletCount = 0;
  for (const u of ctvMembers) {
    const deposit = Math.floor(Math.random() * 30_000_000);
    const tier = pickTier(deposit);
    const balance = Math.floor(deposit * 0.6);
    const available = Math.floor(balance * 0.7);
    const reserve = balance - available;
    await prisma.memberWallet.create({
      data: {
        userId: u.id,
        tierId: tier.id,
        balance,
        availableBalance: available,
        reserveBalance: reserve,
        points: Math.floor(deposit * tier.pointsRate),
        referralCode: genRefCode(),
        totalDeposited: deposit,
        totalSpent: Math.floor(deposit * 0.4),
      },
    });
    await prisma.user.update({ where: { id: u.id }, data: { isMember: true } });
    walletCount++;
  }

  // 24.2 — Tạo 15 Member thuần (role=member, không phải CTV)
  const memberHash = await bcrypt.hash('member123', 10);
  const pureMembers = [];
  for (let i = 0; i < 15; i++) {
    const deposit = Math.floor(Math.random() * 25_000_000);
    const tier = pickTier(deposit);
    const user = await prisma.user.create({
      data: {
        email: `member${i + 1}@ccbmart.vn`,
        passwordHash: memberHash,
        role: 'member',
        name: randomName(),
        phone: randomPhone(),
        isMember: true,
      },
    });
    const pureBalance = Math.floor(deposit * 0.7);
    const pureAvail = Math.floor(pureBalance * 0.7);
    const pureReserve = pureBalance - pureAvail;
    await prisma.memberWallet.create({
      data: {
        userId: user.id,
        tierId: tier.id,
        balance: pureBalance,
        availableBalance: pureAvail,
        reserveBalance: pureReserve,
        points: Math.floor(deposit * tier.pointsRate),
        referralCode: genRefCode(),
        totalDeposited: deposit,
        totalSpent: Math.floor(deposit * 0.3),
      },
    });
    pureMembers.push(user);
    walletCount++;
  }
  console.log(`✅ ${walletCount} MemberWallets (${ctvMembers.length} CTV+Member kiêm nhiệm, ${pureMembers.length} Member thuần)`);

  // 24.3 — Deposit history mẫu
  const allWallets = await prisma.memberWallet.findMany();
  let depositLogCount = 0;
  for (const w of allWallets.slice(0, 20)) {
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const amount = 500_000 + Math.floor(Math.random() * 5_000_000);
      const isConfirmed = Math.random() > 0.3;
      await prisma.depositHistory.create({
        data: {
          walletId: w.id,
          amount,
          method: ['bank_transfer', 'momo', 'zalopay'][Math.floor(Math.random() * 3)],
          status: isConfirmed ? 'CONFIRMED' : 'PENDING',
          reference: `DEP-${Date.now().toString().slice(-8)}-${i}`,
          confirmedBy: isConfirmed ? admin.id : null,
          confirmedAt: isConfirmed ? randomDate(threeMonthsAgo, now) : null,
          createdAt: randomDate(threeMonthsAgo, now),
        },
      });
      depositLogCount++;
    }
  }
  console.log(`✅ ${depositLogCount} DepositHistory entries`);

  // 24.4 — ReferralLog mẫu (member giới thiệu lẫn nhau, V13.3 cap 2tr/tháng)
  let refCount = 0;
  for (let i = 0; i < 12; i++) {
    const referrer = pureMembers[i % pureMembers.length];
    const referee = pureMembers[(i + 3) % pureMembers.length];
    if (referrer.id === referee.id) continue;
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const sunsetAt = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    await prisma.referralLog.create({
      data: {
        referrerId: referrer.id,
        refereeId: referee.id,
        month,
        bonusAmount: 50_000 + Math.floor(Math.random() * 300_000),
        sunsetAt,
      },
    });
    refCount++;
  }
  console.log(`✅ ${refCount} ReferralLog entries`);

  // 25 — AuditLog mẫu (C13.3.1)
  const auditActions = [
    { action: 'LOGIN', targetType: 'User' },
    { action: 'LOGIN', targetType: 'User' },
    { action: 'LOGOUT', targetType: 'User' },
    { action: 'LOGIN_FAILED', targetType: 'User', status: 'FAILURE' },
    { action: 'RANK_CHANGE', targetType: 'User' },
    { action: 'REASSIGN', targetType: 'User' },
    { action: 'DEPOSIT_CONFIRM', targetType: 'DepositHistory' },
    { action: 'DEPOSIT_CONFIRM', targetType: 'DepositHistory' },
    { action: 'DEPOSIT_REJECT', targetType: 'DepositHistory' },
    { action: 'CONFIG_CHANGE', targetType: 'CommissionConfig' },
    { action: 'CONFIG_CHANGE', targetType: 'MembershipTier' },
    { action: 'CONFIG_CHANGE', targetType: 'FeeConfig' },
    { action: 'CTV_TOGGLE_ACTIVE', targetType: 'User' },
    { action: 'CTV_CREATE', targetType: 'User' },
    { action: 'CRON_JOB', targetType: 'AuditLog', userId: null },
    { action: 'CRON_JOB', targetType: 'Rank', userId: null },
    { action: 'CRON_JOB', targetType: 'ReferralCap', userId: null },
    { action: 'DATA_EXPORT', targetType: 'Report' },
    { action: 'DATA_EXPORT', targetType: 'Invoice' },
    { action: 'LOGIN_FAILED', targetType: 'User', status: 'FAILURE' },
  ];
  const sampleIps = ['118.69.45.12', '113.160.22.5', '42.116.88.77', '14.232.164.91', '171.224.180.4'];
  const sampleUAs = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1',
  ];
  let auditCount = 0;
  for (let i = 0; i < auditActions.length; i++) {
    const a = auditActions[i];
    const uid = a.userId !== undefined ? a.userId : (i % 3 === 0 ? admin.id : gdkd.id);
    const createdAt = new Date(now.getTime() - (i * 3 + Math.random() * 12) * 60 * 60 * 1000);
    await prisma.auditLog.create({
      data: {
        userId: uid,
        action: a.action,
        targetType: a.targetType,
        targetId: a.targetType === 'User' ? gdkd.id : (i + 1),
        newValue: a.action === 'RANK_CHANGE'
          ? JSON.stringify({ newRank: 'GDV', reason: 'Đạt KPI tháng 3' })
          : a.action === 'CONFIG_CHANGE'
            ? JSON.stringify({ fixedSalary: 8000000 })
            : a.action === 'DEPOSIT_CONFIRM'
              ? JSON.stringify({ amount: 5000000, method: 'bank_transfer' })
              : null,
        ipAddress: a.action === 'CRON_JOB' ? null : sampleIps[i % sampleIps.length],
        userAgent: a.action === 'CRON_JOB' ? null : sampleUAs[i % sampleUAs.length],
        status: a.status || 'SUCCESS',
        metadata: JSON.stringify({
          method: a.action === 'CRON_JOB' ? 'cron' : 'POST',
          path: `/api/admin/...`,
          ...(a.status === 'FAILURE' ? { error: 'Invalid credentials' } : {}),
        }),
        createdAt,
      },
    });
    auditCount++;
  }
  console.log(`✅ ${auditCount} AuditLog entries`);

  console.log('\n🎉 Seed complete (C13.3.1)!');
  console.log('📧 Login credentials:');
  console.log('   admin@ccbmart.vn / admin123');
  console.log('   ctv1@ccbmart.vn / ctv123 (GĐKD, KYC VERIFIED)');
  console.log('   ctv2@ccbmart.vn / ctv123 (GĐV, KYC VERIFIED)');
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
