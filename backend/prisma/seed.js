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
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.importLog.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.cogsConfig.deleteMany();
  await prisma.kpiConfig.deleteMany();
  await prisma.referralCommission.deleteMany();
  await prisma.depositHistory.deleteMany();
  await prisma.memberWallet.deleteMany();
  await prisma.membershipTier.deleteMany();
  await prisma.paymentProof.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.transactionItem.deleteMany();
  await prisma.cashDeposit.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.inventoryWarning.deleteMany();
  await prisma.kpiLog.deleteMany();
  await prisma.rankHistory.deleteMany();
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
    // F1 relationship
    await prisma.ctvHierarchy.create({
      data: { ctvId: ctv.id, managerId: ctv.parentId, level: 'F1' },
    });
    // F2 - parent's parent
    const parent = await prisma.user.findUnique({ where: { id: ctv.parentId } });
    if (parent?.parentId) {
      await prisma.ctvHierarchy.create({
        data: { ctvId: ctv.id, managerId: parent.parentId, level: 'F2' },
      });
      // F3 - grandparent's parent
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
    data: {
      email: 'agency1@ccbmart.vn',
      passwordHash: agencyHash,
      role: 'agency',
      name: 'Đại lý Bình Thạnh',
      phone: '0902200001',
    },
  });
  const agencyUser2 = await prisma.user.create({
    data: {
      email: 'agency2@ccbmart.vn',
      passwordHash: agencyHash,
      role: 'agency',
      name: 'Đại lý Thủ Đức',
      phone: '0902200002',
    },
  });
  const agencyUser3 = await prisma.user.create({
    data: {
      email: 'agency3@ccbmart.vn',
      passwordHash: agencyHash,
      role: 'agency',
      name: 'Đại lý Gò Vấp',
      phone: '0902200003',
    },
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

  // 5. Commission configs
  await prisma.commissionConfig.createMany({
    data: [
      { tier: 'CTV',  selfSalePct: 0.20, f1Pct: 0,    f2Pct: 0,    f3Pct: 0,    fixedSalary: 0 },
      { tier: 'PP',   selfSalePct: 0.20, f1Pct: 0,    f2Pct: 0,    f3Pct: 0,    fixedSalary: 5000000 },
      { tier: 'TP',   selfSalePct: 0.30, f1Pct: 0.10, f2Pct: 0,    f3Pct: 0,    fixedSalary: 10000000 },
      { tier: 'GDV',  selfSalePct: 0.35, f1Pct: 0.10, f2Pct: 0.05, f3Pct: 0,    fixedSalary: 18000000 },
      { tier: 'GDKD', selfSalePct: 0.38, f1Pct: 0.10, f2Pct: 0.05, f3Pct: 0.03, fixedSalary: 30000000 },
    ],
  });

  await prisma.agencyCommissionConfig.createMany({
    data: [
      { group: 'A', commissionPct: 0.08, bonusPct: 0.02 },
      { group: 'B', commissionPct: 0.15, bonusPct: 0.03 },
      { group: 'C', commissionPct: 0.20, bonusPct: 0.05 },
    ],
  });
  console.log('✅ Commission configs created');

  // 6. Products
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

  // 7. Customers (100)
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const customers = [];

  for (let i = 0; i < 100; i++) {
    const isCtvCustomer = i < 60; // 60% CTV customers
    const isAgencyCustomer = i >= 60 && i < 80; // 20% agency customers
    // remaining 20% showroom (no ctv/agency)

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

  // 8. Transactions (500, spread across 3 months)
  // Channel mix: 60% CTV, 20% agency, 20% showroom
  let txnCount = 0;
  const comboProduct = products[0]; // Combo 2tr

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
      customerId = customers[i % 60].id; // CTV customers

      // Most CTV sales are combos (2tr each)
      if (Math.random() < 0.7) {
        const qty = Math.floor(Math.random() * 3) + 1;
        totalAmount = comboProduct.price * qty;
        cogsAmount = totalAmount * comboProduct.cogsPct;
        items.push({ productId: comboProduct.id, quantity: qty, unitPrice: comboProduct.price, totalPrice: totalAmount });
      } else {
        // Mix of other products
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
      // Showroom
      customerId = customers[80 + (i % 20)].id;

      // Showroom sells lots of suất ăn + some retail
      if (Math.random() < 0.5) {
        const suatAn = products[6]; // Suất ăn 35k
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

    const txn = await prisma.transaction.create({
      data: {
        kiotvietOrderId: `KV-${String(txnDate.getFullYear()).slice(2)}${String(txnDate.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(4, '0')}`,
        customerId,
        ctvId,
        agencyId,
        channel,
        totalAmount,
        cogsAmount,
        createdAt: txnDate,
        items: {
          create: items,
        },
      },
    });

    // Update customer totalSpent
    if (customerId) {
      await prisma.customer.update({
        where: { id: customerId },
        data: { totalSpent: { increment: totalAmount } },
      });
    }

    txnCount++;
  }
  console.log(`✅ ${txnCount} transactions created`);

  // 9. KPI Logs (3 months for key CTVs)
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
        data: {
          ctvId: ctv.id,
          month: monthStr,
          selfSales,
          portfolioSize,
          rankBefore: ctv.rank,
          rankAfter: ctv.rank,
        },
      });
    }
  }
  console.log('✅ KPI logs created');

  // 10. Rank History
  await prisma.rankHistory.createMany({
    data: [
      { ctvId: gdv1.id, oldRank: 'TP', newRank: 'GDV', reason: 'Đạt KPI thăng cấp: 50 combo cá nhân + 550 portfolio', changedBy: 'System', changedAt: new Date(now.getFullYear(), now.getMonth() - 2, 1) },
      { ctvId: tp1.id, oldRank: 'PP', newRank: 'TP', reason: 'Đạt KPI thăng cấp: 50 combo cá nhân + 150 portfolio', changedBy: 'System', changedAt: new Date(now.getFullYear(), now.getMonth() - 1, 15) },
      { ctvId: pps[0].id, oldRank: 'CTV', newRank: 'PP', reason: 'Đạt KPI thăng cấp: 50 combo cá nhân', changedBy: 'System', changedAt: new Date(now.getFullYear(), now.getMonth() - 1, 1) },
    ],
  });
  console.log('✅ Rank history created');

  // 11. Inventory Warnings
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
      data: {
        productId: w.productId,
        agencyId: w.agencyId,
        quantity: w.quantity,
        expiryDate,
        warningType: w.warningType,
      },
    });
  }
  console.log('✅ Inventory warnings created');

  // 12. Pending CTV transactions (for payment confirmation demo)
  const pendingTxns = [];
  for (let i = 0; i < 10; i++) {
    const ctv = allCtvUsers[i % allCtvUsers.length];
    const customer = customers[i % 60];
    const isBankTransfer = i < 6;
    const hoursAgo = i < 3 ? 2 : i < 6 ? 12 : i < 8 ? 30 : 50; // varied ages
    const txnDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

    const txn = await prisma.transaction.create({
      data: {
        customerId: customer.id,
        ctvId: ctv.id,
        channel: 'ctv',
        totalAmount: 2000000,
        cogsAmount: 1000000,
        status: 'PENDING',
        paymentMethod: isBankTransfer ? 'bank_transfer' : 'cash',
        bankCode: isBankTransfer ? String(1000 + i) : null,
        ctvSubmittedAt: txnDate,
        createdAt: txnDate,
        items: {
          create: [{ productId: products[0].id, quantity: 1, unitPrice: 2000000, totalPrice: 2000000 }],
        },
      },
    });
    pendingTxns.push(txn);
  }

  // Payment proofs for bank transfer transactions
  for (let i = 0; i < 4; i++) {
    await prisma.paymentProof.create({
      data: {
        transactionId: pendingTxns[i].id,
        imageUrl: `/uploads/demo_proof_${i + 1}.png`,
        uploadedBy: pendingTxns[i].ctvId,
        notes: `Khach chuyen khoan luc ${8 + i}:${30 + i * 5}`,
      },
    });
  }
  console.log('✅ 10 pending CTV transactions + 4 payment proofs created');

  // 13. Sync Logs
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

  // 14. KPI Config + COGS Config
  await prisma.kpiConfig.createMany({
    data: [
      { rank: 'CTV',  minSelfCombo: 0,  minPortfolio: 0,    fallbackRank: 'LOCK' },
      { rank: 'PP',   minSelfCombo: 50, minPortfolio: 0,    fallbackRank: 'CTV' },
      { rank: 'TP',   minSelfCombo: 50, minPortfolio: 150,  fallbackRank: 'PP' },
      { rank: 'GDV',  minSelfCombo: 50, minPortfolio: 550,  fallbackRank: 'TP' },
      { rank: 'GDKD', minSelfCombo: 50, minPortfolio: 1000, fallbackRank: 'GDV' },
    ],
  });
  await prisma.cogsConfig.createMany({
    data: [
      { phase: 'GD1', name: 'GD1 (0-6 thang)',  cogsPct: 0.50, description: 'Blended NS 65% + TPCN 35%' },
      { phase: 'GD2', name: 'GD2 (6-18 thang)',  cogsPct: 0.63, description: 'Mo rong FMCG, gia vi' },
      { phase: 'GD3', name: 'GD3 (18-36 thang)', cogsPct: 0.58, description: 'Danh muc toi uu' },
      { phase: 'GD4', name: 'GD4 (3-5 nam)',     cogsPct: 0.55, description: 'Mature stores' },
    ],
  });
  console.log('✅ KPI + COGS config created');

  // 15. Membership Tiers
  const memberHash = await bcrypt.hash('member123', 10);
  const tierGreen = await prisma.membershipTier.create({
    data: { name: 'Green', minDeposit: 0, discountPct: 0, referralPct: 0, monthlyReferralCap: 0, color: 'gray' },
  });
  const tierBasic = await prisma.membershipTier.create({
    data: { name: 'Basic', minDeposit: 200000, discountPct: 0.03, referralPct: 0, monthlyReferralCap: 0, color: 'blue' },
  });
  const tierStandard = await prisma.membershipTier.create({
    data: { name: 'Standard', minDeposit: 500000, discountPct: 0.07, referralPct: 0.02, monthlyReferralCap: 500000, color: 'purple' },
  });
  const tierVip = await prisma.membershipTier.create({
    data: { name: 'VIP Gold', minDeposit: 2000000, discountPct: 0.12, referralPct: 0.05, monthlyReferralCap: 500000, color: 'amber' },
  });
  console.log('✅ 4 membership tiers created');

  // 15. Member users + wallets
  const memberUsers = [];
  const memberWallets = [];
  const tiers = [tierGreen, tierBasic, tierStandard, tierVip];

  for (let i = 0; i < 20; i++) {
    const tier = tiers[i % 4];
    const user = await prisma.user.create({
      data: {
        email: `member${i + 1}@ccbmart.vn`,
        passwordHash: memberHash,
        role: 'member',
        name: randomName(),
        phone: randomPhone(),
      },
    });
    memberUsers.push(user);

    const code = `CCB_${String(100000 + i).slice(-6).toUpperCase()}`;
    const wallet = await prisma.memberWallet.create({
      data: {
        userId: user.id,
        tierId: tier.id,
        balance: tier.minDeposit + Math.floor(Math.random() * 500000),
        totalDeposit: tier.minDeposit + Math.floor(Math.random() * 1000000),
        referralCode: code,
        referredById: i >= 5 ? memberWallets[i % 5].id : null, // first 5 have no referrer, rest refer to first 5
      },
    });
    memberWallets.push(wallet);
  }
  console.log('✅ 20 member users + wallets created');

  // 16. Deposit history for members
  for (let i = 0; i < 30; i++) {
    const wallet = memberWallets[i % memberWallets.length];
    await prisma.depositHistory.create({
      data: {
        walletId: wallet.id,
        amount: [200000, 500000, 1000000, 2000000][Math.floor(Math.random() * 4)],
        method: Math.random() > 0.3 ? 'bank_transfer' : 'cash',
        status: i < 5 ? 'PENDING' : 'CONFIRMED',
        confirmedBy: i >= 5 ? admin.id : null,
        confirmedAt: i >= 5 ? randomDate(threeMonthsAgo, now) : null,
        createdAt: randomDate(threeMonthsAgo, now),
      },
    });
  }
  console.log('✅ 30 deposit history records created');

  // 17. Referral commissions
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  for (let i = 5; i < 15; i++) {
    const earner = memberWallets[i % 5]; // first 5 wallets are referrers
    const source = memberWallets[i];
    const rate = tiers[i % 4].referralPct;
    if (rate > 0) {
      await prisma.referralCommission.create({
        data: {
          earnerWalletId: earner.id,
          sourceWalletId: source.id,
          amount: Math.floor(Math.random() * 50000) + 10000,
          ratePct: rate,
          month: currentMonth,
          createdAt: randomDate(threeMonthsAgo, now),
        },
      });
    }
  }
  console.log('✅ Referral commissions created');

  console.log('\n🎉 Seed complete!');
  console.log('📧 Login credentials:');
  console.log('   admin@ccbmart.vn / admin123');
  console.log('   ctv1@ccbmart.vn / ctv123 (GDKD)');
  console.log('   ctv2@ccbmart.vn / ctv123 (GDV)');
  console.log('   agency1@ccbmart.vn / agency123');
  console.log('   member1@ccbmart.vn / member123 (Green)');
  console.log('   member2@ccbmart.vn / member123 (Basic)');
  console.log('   member3@ccbmart.vn / member123 (Standard)');
  console.log('   member4@ccbmart.vn / member123 (VIP Gold)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
