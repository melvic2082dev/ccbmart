const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomPhone() {
  return `09${Math.floor(10000000 + Math.random() * 90000000)}`;
}

// V13.4 maintenance fee per partner rank — kept in sync with partnerPayoutEngine.MAINTENANCE_FEE_BY_RANK
function getMaintenanceForRank(rank) {
  return ({ PP: 5_000_000, TP: 10_000_000, GDV: 18_000_000, GDKD: 30_000_000 })[rank] || 0;
}

const FIRST_NAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương'];
const LAST_NAMES = ['Anh', 'Bình', 'Cường', 'Dũng', 'Hà', 'Hải', 'Hương', 'Khoa', 'Lan', 'Linh', 'Mai', 'Minh', 'Nam', 'Phong', 'Quân', 'Sơn', 'Thảo', 'Trang', 'Tuấn', 'Vy'];
const MIDDLE_NAMES = ['Văn', 'Thị', 'Đức', 'Minh', 'Thanh', 'Hoàng', 'Ngọc', 'Kim', 'Quốc', 'Xuân'];

function randomName() {
  return `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${MIDDLE_NAMES[Math.floor(Math.random() * MIDDLE_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`;
}

async function main() {
  console.log('Seeding database (V10)...');

  // Clean existing data (reverse dependency order)
  await prisma.professionalTitle.deleteMany();
  await prisma.loyaltyPoint.deleteMany();
  await prisma.teamBonus.deleteMany();
  await prisma.promotionEligibility.deleteMany();
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

  // 1. Admin users (V13.4+: super_admin + 5 sub-role demo accounts)
  const admin = await prisma.user.create({
    data: {
      email: 'admin@ccbmart.vn',
      passwordHash,
      role: 'super_admin',
      name: 'Super Admin CCB Mart',
      phone: '0901000000',
    },
  });
  const adminSubRoles = [
    { email: 'ops@ccbmart.vn',      role: 'ops_admin',      name: 'Quản lý vận hành' },
    { email: 'partner@ccbmart.vn',  role: 'partner_admin',  name: 'Quản lý đối tác' },
    { email: 'member@ccbmart.vn',   role: 'member_admin',   name: 'Quản lý thành viên' },
    { email: 'training@ccbmart.vn', role: 'training_admin', name: 'Quản lý đào tạo' },
    { email: 'finance@ccbmart.vn',  role: 'finance_admin',  name: 'Quản lý tài chính' },
  ];
  for (let i = 0; i < adminSubRoles.length; i++) {
    const r = adminSubRoles[i];
    await prisma.user.create({
      data: {
        email: r.email,
        passwordHash,
        role: r.role,
        name: r.name,
        phone: `09010000${String(i + 1).padStart(2, '0')}`,
      },
    });
  }
  console.log(`Admin created: 1 super_admin + ${adminSubRoles.length} sub-role demo users`);

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
  console.log(`${allCtvUsers.length} CTV users created (hierarchy: GDKD->GDV->TP->PP->CTV)`);

  // 3. Build CtvHierarchy records (V10: DIRECT/INDIRECT2/INDIRECT3)
  for (const ctv of allCtvUsers) {
    if (!ctv.parentId) continue;
    // Direct relationship (thanh vien truc tiep)
    await prisma.ctvHierarchy.create({
      data: { ctvId: ctv.id, managerId: ctv.parentId, level: 'DIRECT' },
    });
    // Indirect level 2 - parent's parent (gian tiep cap 2)
    const parent = await prisma.user.findUnique({ where: { id: ctv.parentId } });
    if (parent?.parentId) {
      await prisma.ctvHierarchy.create({
        data: { ctvId: ctv.id, managerId: parent.parentId, level: 'INDIRECT2' },
      });
      // Indirect level 3 - grandparent's parent (gian tiep cap 3)
      const grandparent = await prisma.user.findUnique({ where: { id: parent.parentId } });
      if (grandparent?.parentId) {
        await prisma.ctvHierarchy.create({
          data: { ctvId: ctv.id, managerId: grandparent.parentId, level: 'INDIRECT3' },
        });
      }
    }
  }
  console.log('CTV hierarchy records created');

  // 4. Agency users
  const agencyUser1 = await prisma.user.create({
    data: {
      email: 'agency1@ccbmart.vn',
      passwordHash: agencyHash,
      role: 'agency',
      name: 'Dai ly Binh Thanh',
      phone: '0902200001',
    },
  });
  const agencyUser2 = await prisma.user.create({
    data: {
      email: 'agency2@ccbmart.vn',
      passwordHash: agencyHash,
      role: 'agency',
      name: 'Dai ly Thu Duc',
      phone: '0902200002',
    },
  });
  const agencyUser3 = await prisma.user.create({
    data: {
      email: 'agency3@ccbmart.vn',
      passwordHash: agencyHash,
      role: 'agency',
      name: 'Dai ly Go Vap',
      phone: '0902200003',
    },
  });

  const agency1 = await prisma.agency.create({
    data: { userId: agencyUser1.id, name: 'Dai ly Binh Thanh', depositAmount: 100000000, depositTier: '100tr', address: '123 Dien Bien Phu, Binh Thanh, TP.HCM' },
  });
  const agency2 = await prisma.agency.create({
    data: { userId: agencyUser2.id, name: 'Dai ly Thu Duc', depositAmount: 300000000, depositTier: '300tr', address: '456 Vo Van Ngan, Thu Duc, TP.HCM' },
  });
  const agency3 = await prisma.agency.create({
    data: { userId: agencyUser3.id, name: 'Dai ly Go Vap', depositAmount: 50000000, depositTier: '50tr', address: '789 Quang Trung, Go Vap, TP.HCM' },
  });
  const agencies = [agency1, agency2, agency3];
  console.log('3 agencies created');

  // 5. Commission configs (V10: directPct/indirect2Pct/indirect3Pct)
  await prisma.commissionConfig.createMany({
    data: [
      { tier: 'CTV',  selfSalePct: 0.20, directPct: 0,    indirect2Pct: 0,    indirect3Pct: 0,    fixedSalary: 0 },
      { tier: 'PP',   selfSalePct: 0.20, directPct: 0,    indirect2Pct: 0,    indirect3Pct: 0,    fixedSalary: 5000000 },
      { tier: 'TP',   selfSalePct: 0.30, directPct: 0.10, indirect2Pct: 0,    indirect3Pct: 0,    fixedSalary: 10000000 },
      { tier: 'GDV',  selfSalePct: 0.35, directPct: 0.10, indirect2Pct: 0.05, indirect3Pct: 0,    fixedSalary: 18000000 },
      { tier: 'GDKD', selfSalePct: 0.38, directPct: 0.10, indirect2Pct: 0.05, indirect3Pct: 0.03, fixedSalary: 30000000 },
    ],
  });

  await prisma.agencyCommissionConfig.createMany({
    data: [
      { group: 'A', commissionPct: 0.08, bonusPct: 0.02 },
      { group: 'B', commissionPct: 0.15, bonusPct: 0.03 },
      { group: 'C', commissionPct: 0.20, bonusPct: 0.05 },
    ],
  });
  console.log('Commission configs created');

  // 6. Products
  const products = await Promise.all([
    prisma.product.create({ data: { name: 'Combo Suc khoe Vang (TPCN)', category: 'TPCN', price: 2000000, cogsPct: 0.35, unit: 'combo' } }),
    prisma.product.create({ data: { name: 'Kardi Q10 - Ho tro tim mach', category: 'TPCN', price: 698000, cogsPct: 0.26, unit: 'hop' } }),
    prisma.product.create({ data: { name: 'Canxi Nano K2 - Xuong khop', category: 'TPCN', price: 450000, cogsPct: 0.30, unit: 'hop' } }),
    prisma.product.create({ data: { name: 'Tra Sam Han Quoc', category: 'TPCN', price: 380000, cogsPct: 0.32, unit: 'hop' } }),
    prisma.product.create({ data: { name: 'Rau cu Hikari (2kg)', category: 'NS', price: 80000, cogsPct: 0.85, unit: 'goi' } }),
    prisma.product.create({ data: { name: 'Gao Hikari ST25 (5kg)', category: 'NS', price: 150000, cogsPct: 0.80, unit: 'bao' } }),
    prisma.product.create({ data: { name: 'Suat an Hikari', category: 'NS', price: 35000, cogsPct: 0.86, unit: 'suat' } }),
    prisma.product.create({ data: { name: 'Trai cay Hikari (1kg)', category: 'NS', price: 65000, cogsPct: 0.82, unit: 'goi' } }),
    prisma.product.create({ data: { name: 'Vien giat nhap khau', category: 'FMCG', price: 82000, cogsPct: 0.43, unit: 'tui' } }),
    prisma.product.create({ data: { name: 'Tay toilet da nang', category: 'FMCG', price: 55000, cogsPct: 0.45, unit: 'chai' } }),
    prisma.product.create({ data: { name: 'Nuoc lau san huu co', category: 'FMCG', price: 68000, cogsPct: 0.42, unit: 'chai' } }),
    prisma.product.create({ data: { name: 'Sot ot Thai Sriracha', category: 'GiaVi', price: 45000, cogsPct: 0.55, unit: 'chai' } }),
    prisma.product.create({ data: { name: 'Tuong ot Han Quoc Gochujang', category: 'GiaVi', price: 89000, cogsPct: 0.50, unit: 'hu' } }),
    prisma.product.create({ data: { name: 'Dau hao Thai Premium', category: 'GiaVi', price: 65000, cogsPct: 0.52, unit: 'chai' } }),
    prisma.product.create({ data: { name: 'Nuoc sot Hikari dac biet', category: 'CheBien', price: 120000, cogsPct: 0.45, unit: 'chai' } }),
  ]);
  console.log(`${products.length} products created`);

  // 7. Customers (100)
  const now = new Date();
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
  console.log('100 customers created');

  // 8. Transactions (500, spread across 3 months)
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
  console.log(`${txnCount} transactions created`);

  // 9. KPI Logs
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
  console.log('KPI logs created');

  // 10. Rank History
  await prisma.rankHistory.createMany({
    data: [
      { ctvId: gdv1.id, oldRank: 'TP', newRank: 'GDV', reason: 'Dat dieu kien bo nhiem T+1: du tieu chi thang truoc', changedBy: 'System (T+1)', changedAt: new Date(now.getFullYear(), now.getMonth() - 2, 1) },
      { ctvId: tp1.id, oldRank: 'PP', newRank: 'TP', reason: 'Dat dieu kien bo nhiem T+1: du tieu chi thang truoc', changedBy: 'System (T+1)', changedAt: new Date(now.getFullYear(), now.getMonth() - 1, 15) },
      { ctvId: pps[0].id, oldRank: 'CTV', newRank: 'PP', reason: 'Dat dieu kien bo nhiem T+1: 5 thanh vien truc tiep dat >=10 combo', changedBy: 'System (T+1)', changedAt: new Date(now.getFullYear(), now.getMonth() - 1, 1) },
    ],
  });
  console.log('Rank history created');

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
      data: { productId: w.productId, agencyId: w.agencyId, quantity: w.quantity, expiryDate, warningType: w.warningType },
    });
  }
  console.log('Inventory warnings created');

  // 12. Pending CTV transactions
  const pendingTxns = [];
  for (let i = 0; i < 10; i++) {
    const ctv = allCtvUsers[i % allCtvUsers.length];
    const customer = customers[i % 60];
    const isBankTransfer = i < 6;
    const hoursAgo = i < 3 ? 2 : i < 6 ? 12 : i < 8 ? 30 : 50;
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
        items: { create: [{ productId: products[0].id, quantity: 1, unitPrice: 2000000, totalPrice: 2000000 }] },
      },
    });
    pendingTxns.push(txn);
  }

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
  console.log('10 pending CTV transactions + 4 payment proofs created');

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
  console.log('Sync logs created');

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
  console.log('KPI + COGS config created');

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
  console.log('4 membership tiers created');

  // 16. Member users + wallets
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
        balance: Number(tier.minDeposit) + Math.floor(Math.random() * 500000),
        totalDeposit: Number(tier.minDeposit) + Math.floor(Math.random() * 1000000),
        referralCode: code,
        referredById: i >= 5 ? memberWallets[i % 5].id : null,
      },
    });
    memberWallets.push(wallet);
  }
  console.log('20 member users + wallets created');

  // 17. Deposit history
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
  console.log('30 deposit history records created');

  // 18. Referral commissions
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  for (let i = 5; i < 15; i++) {
    const earner = memberWallets[i % 5];
    const source = memberWallets[i];
    const rate = tiers[i % 4].referralPct;
    if (Number(rate) > 0) {
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
  console.log('Referral commissions created');

  // ===== V10 NEW SEED DATA =====

  // 19. PromotionEligibility (2 PENDING, 1 ACTIVATED)
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthStr = currentMonth;

  await prisma.promotionEligibility.createMany({
    data: [
      {
        ctvId: pps[0].id,
        targetRank: 'TP',
        qualifiedMonth: thisMonthStr,
        effectiveDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
        status: 'PENDING',
      },
      {
        ctvId: pps[1].id,
        targetRank: 'TP',
        qualifiedMonth: thisMonthStr,
        effectiveDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
        status: 'PENDING',
      },
      {
        ctvId: tp1.id,
        targetRank: 'GDV',
        qualifiedMonth: lastMonthStr,
        effectiveDate: new Date(now.getFullYear(), now.getMonth(), 1),
        status: 'ACTIVATED',
        approvedBy: admin.id,
        approvedAt: new Date(now.getFullYear(), now.getMonth() - 1, 28),
      },
    ],
  });
  console.log('3 PromotionEligibility records created');

  // 20. TeamBonus (3 PAID, 2 PENDING)
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const twoMonthsAgoStr = `${twoMonthsAgo.getFullYear()}-${String(twoMonthsAgo.getMonth() + 1).padStart(2, '0')}`;

  await prisma.teamBonus.createMany({
    data: [
      { ctvId: gdkd.id, month: twoMonthsAgoStr, directMemberCount: 2, teamRevenue: 50000000, bonusRate: 0.005, bonusAmount: 250000, cashAmount: 0, pointAmount: 250000, status: 'PAID', paidAt: twoMonthsAgo },
      { ctvId: gdv1.id, month: twoMonthsAgoStr, directMemberCount: 2, teamRevenue: 30000000, bonusRate: 0.005, bonusAmount: 150000, cashAmount: 0, pointAmount: 150000, status: 'PAID', paidAt: twoMonthsAgo },
      { ctvId: tp1.id, month: lastMonthStr, directMemberCount: 2, teamRevenue: 20000000, bonusRate: 0.005, bonusAmount: 100000, cashAmount: 0, pointAmount: 100000, status: 'PAID', paidAt: lastMonth },
      { ctvId: gdkd.id, month: thisMonthStr, directMemberCount: 2, teamRevenue: 55000000, bonusRate: 0.005, bonusAmount: 275000, cashAmount: 0, pointAmount: 275000, status: 'PENDING' },
      { ctvId: gdv1.id, month: thisMonthStr, directMemberCount: 2, teamRevenue: 32000000, bonusRate: 0.005, bonusAmount: 160000, cashAmount: 0, pointAmount: 160000, status: 'PENDING' },
    ],
  });
  console.log('5 TeamBonus records created');

  // 21. LoyaltyPoints (20 records)
  const loyaltyUsers = [gdkd, gdv1, gdv2, tp1, tp2, tp3, ...pps.slice(0, 4)];
  const loyaltySources = ['TEAM_BONUS', 'PERSONAL_PURCHASE', 'MILESTONE'];
  for (let i = 0; i < 20; i++) {
    const user = loyaltyUsers[i % loyaltyUsers.length];
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    await prisma.loyaltyPoint.create({
      data: {
        userId: user.id,
        points: Math.floor(Math.random() * 500) + 100,
        source: loyaltySources[i % loyaltySources.length],
        expiresAt,
        usedAt: i < 5 ? randomDate(threeMonthsAgo, now) : null,
        createdAt: randomDate(threeMonthsAgo, now),
      },
    });
  }
  console.log('20 LoyaltyPoint records created');

  // 22. ProfessionalTitle (2 records)
  const titleExpiry = new Date();
  titleExpiry.setFullYear(titleExpiry.getFullYear() + 1);

  await prisma.professionalTitle.createMany({
    data: [
      {
        userId: gdkd.id,
        title: 'EXPERT_LEADER',
        directCount: 2,
        renewedAt: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        expiresAt: titleExpiry,
        isActive: true,
      },
      {
        userId: gdv1.id,
        title: 'SENIOR_EXPERT',
        directCount: 2,
        renewedAt: new Date(now.getFullYear(), now.getMonth() - 2, 1),
        expiresAt: titleExpiry,
        isActive: true,
      },
    ],
  });
  console.log('2 ProfessionalTitle records created');

  // ============================================================
  // V13.4 MODELS: FeeConfig, BusinessHousehold, B2BContract,
  // TrainingLog, Invoice (CCB Mart → partner), PayoutLog, TaxRecord,
  // ManagementFee, BreakawayLog, BreakawayFee, AuditLog, ReferralLog,
  // AdminManualAction
  // ============================================================

  // 16. FeeConfig (training fee tiers M0-M5)
  await prisma.feeConfig.createMany({
    data: [
      { tier: 'M0', minCombo: 0,  maxCombo: 0,  feeAmount: 0,       description: 'Chưa đạt' },
      { tier: 'M1', minCombo: 1,  maxCombo: 5,  feeAmount: 500000,  description: 'Mốc 1' },
      { tier: 'M2', minCombo: 6,  maxCombo: 10, feeAmount: 1000000, description: 'Mốc 2' },
      { tier: 'M3', minCombo: 11, maxCombo: 20, feeAmount: 2000000, description: 'Mốc 3' },
      { tier: 'M4', minCombo: 21, maxCombo: 50, feeAmount: 3500000, description: 'Mốc 4' },
      { tier: 'M5', minCombo: 51, maxCombo: null, feeAmount: 5000000, description: 'Mốc cao nhất' },
    ],
  });
  console.log('6 FeeConfig records created');

  // 17. BusinessHousehold (5 HKD for GDKD/GDV/TP level users)
  const hkdUsers = [gdkd, gdv1, gdv2, tp1, tp2];
  for (let i = 0; i < hkdUsers.length; i++) {
    const u = hkdUsers[i];
    const signed = new Date(now); signed.setMonth(signed.getMonth() - 6);
    const expired = new Date(signed); expired.setFullYear(expired.getFullYear() + 1);
    await prisma.businessHousehold.create({
      data: {
        userId: u.id,
        businessName: `HKD ${u.name}`,
        taxCode: `010${100000 + i}`,
        businessLicense: `BL-${2025}${String(i + 1).padStart(4, '0')}`,
        status: 'active',
        dealerContractNo: `DL-2025-${String(i + 1).padStart(3, '0')}`,
        dealerSignedAt: signed,
        dealerExpiredAt: expired,
        dealerTermMonths: 12,
        trainingContractNo: `DT-2025-${String(i + 1).padStart(3, '0')}`,
        trainingSignedAt: signed,
        trainingExpiredAt: expired,
        trainingTermMonths: 12,
        bankName: 'Vietcombank',
        bankAccountNo: `00710${String(i).padStart(7, '0')}`,
        bankAccountHolder: u.name.toUpperCase(),
        trainingLineRegistered: i < 3,
      },
    });
    await prisma.user.update({ where: { id: u.id }, data: { isBusinessHousehold: true } });
  }
  console.log('5 BusinessHousehold records created');

  // 18. B2BContract (5 contracts: GDKD<->GDV, GDV<->TP, TP<->PP)
  const contractPairs = [
    { trainer: gdkd, trainee: gdv1 },
    { trainer: gdkd, trainee: gdv2 },
    { trainer: gdv1, trainee: tp1 },
    { trainer: gdv2, trainee: tp2 },
    { trainer: tp1,  trainee: pps[0] },
  ];
  const contracts = [];
  for (let i = 0; i < contractPairs.length; i++) {
    const p = contractPairs[i];
    const signed = new Date(now); signed.setMonth(signed.getMonth() - 4);
    const expired = new Date(signed); expired.setFullYear(expired.getFullYear() + 1);
    const c = await prisma.b2BContract.create({
      data: {
        contractNo: `B2B-2025-${String(i + 1).padStart(4, '0')}`,
        trainerId: p.trainer.id,
        traineeId: p.trainee.id,
        signedAt: signed,
        expiredAt: expired,
        status: 'active',
      },
    });
    contracts.push(c);
  }
  console.log('5 B2BContract records created');

  // 19. TrainingLog (10 logs: various statuses)
  for (let i = 0; i < 10; i++) {
    const p = contractPairs[i % contractPairs.length];
    const sessionDate = new Date(now);
    sessionDate.setDate(sessionDate.getDate() - (30 - i * 2));
    await prisma.trainingLog.create({
      data: {
        trainerId: p.trainer.id,
        traineeId: p.trainee.id,
        sessionDate,
        durationMinutes: 60 + (i % 3) * 30,
        content: `Buổi đào tạo #${i + 1}: Kỹ năng tư vấn sản phẩm và xử lý phản đối khách hàng`,
        menteeConfirmed: i % 3 !== 0,
        mentorConfirmed: true,
        status: i < 6 ? 'VERIFIED' : (i < 9 ? 'PENDING' : 'REJECTED'),
        verifiedBy: i < 6 ? admin.id : null,
        verifiedAt: i < 6 ? sessionDate : null,
      },
    });
  }
  console.log('10 TrainingLog records created');

  // 20. Invoice (8 invoices: CCB Mart → partner per V13.4)
  const invTiers = ['MAINTENANCE_FEE', 'MANAGEMENT_FEE_LEVEL1', 'MANAGEMENT_FEE_LEVEL2', 'SALES_COMMISSION', 'OVERRIDE_FEE', 'MAINTENANCE_FEE', 'MANAGEMENT_FEE_LEVEL1', 'MANAGEMENT_FEE_LEVEL3'];
  const amounts = [10000000, 5000000, 2500000, 1500000, 800000, 18000000, 4000000, 30000000];
  const invMonth = currentMonth;
  const invMonthPrefix = `CCB-${invMonth.replace('-', '')}`;
  for (let i = 0; i < 8; i++) {
    const c = contracts[i % contracts.length];
    const issued = new Date(now);
    issued.setDate(issued.getDate() - (20 - i * 2));
    const tier = invTiers[i];
    await prisma.invoice.create({
      data: {
        contractId: c.id,
        fromParty: 'CCB Mart',
        toUserId: c.trainerId,
        amount: amounts[i],
        feeTier: tier,
        payoutType: tier,
        month: invMonth,
        description: `${tier.replace(/_/g, ' ')} — tháng ${invMonth}`,
        invoiceNumber: `${invMonthPrefix}-${String(i + 1).padStart(4, '0')}`,
        issuedAt: issued,
        status: i < 5 ? 'PAID' : (i < 7 ? 'SENT' : 'DRAFT'),
      },
    });
  }
  console.log('8 Invoice records created');

  // 21. PayoutLog (6 partner-month payout summaries)
  const payoutPartners = [tp1, tp2, gdv1, gdv2, gdkd, pps[0]];
  for (let i = 0; i < payoutPartners.length; i++) {
    const p = payoutPartners[i];
    const breakdown = [
      { type: 'SALES_COMMISSION', amount: 1500000 + i * 200000 },
      { type: 'MAINTENANCE_FEE', amount: getMaintenanceForRank(p.rank) },
    ];
    const total = breakdown.reduce((s, b) => s + b.amount, 0);
    await prisma.payoutLog.create({
      data: {
        partnerId: p.id,
        partnerName: p.name,
        partnerRank: p.rank,
        month: invMonth,
        totalAmount: total,
        breakdown,
        hasValidLog: i < 4,
        kFactor: 1.0,
        status: 'PROCESSED',
      },
    });
  }
  console.log(`${payoutPartners.length} PayoutLog records created`);

  // 22. TaxRecord (TNCN 10% monthly for GDKD/GDV/TP)
  const taxUsers = [gdkd, gdv1, gdv2, tp1, tp2];
  const curMonthStr = currentMonth;
  const _prev = new Date(now); _prev.setMonth(_prev.getMonth() - 1);
  const prevMonthStr = `${_prev.getFullYear()}-${String(_prev.getMonth() + 1).padStart(2, '0')}`;
  for (const u of taxUsers) {
    const income = 15000000 + Math.floor(Math.random() * 25000000);
    await prisma.taxRecord.create({
      data: { userId: u.id, month: prevMonthStr, taxableIncome: income, taxAmount: income * 0.1, status: 'PAID' },
    });
    const income2 = 15000000 + Math.floor(Math.random() * 25000000);
    await prisma.taxRecord.create({
      data: { userId: u.id, month: curMonthStr, taxableIncome: income2, taxAmount: income2 * 0.1, status: 'PENDING' },
    });
  }
  console.log(`${taxUsers.length * 2} TaxRecord records created`);

  // 23. ManagementFee (F1/F2/F3 fees flowing up the hierarchy)
  const mgmtPairs = [
    { from: pps[0], to: tp1,  level: 1, amt: 500000 },
    { from: pps[0], to: gdv1, level: 2, amt: 300000 },
    { from: pps[0], to: gdkd, level: 3, amt: 150000 },
    { from: pps[1], to: tp1,  level: 1, amt: 450000 },
    { from: pps[2], to: tp2,  level: 1, amt: 600000 },
    { from: pps[2], to: gdv2, level: 2, amt: 350000 },
    { from: ctvs[0], to: pps[0], level: 1, amt: 200000 },
    { from: ctvs[0], to: tp1,  level: 2, amt: 120000 },
  ];
  for (const p of mgmtPairs) {
    await prisma.managementFee.create({
      data: {
        fromUserId: p.from.id,
        toUserId: p.to.id,
        level: p.level,
        amount: p.amt,
        month: curMonthStr,
        status: 'PENDING',
      },
    });
  }
  console.log(`${mgmtPairs.length} ManagementFee records created`);

  // 24. BreakawayLog + BreakawayFee (2 breakaways with fees)
  const expireAt = new Date(now); expireAt.setFullYear(expireAt.getFullYear() + 1);
  const bLog1 = await prisma.breakawayLog.create({
    data: { userId: pps[3].id, oldParentId: tp2.id, newParentId: gdv2.id, expireAt, status: 'ACTIVE' },
  });
  const bLog2 = await prisma.breakawayLog.create({
    data: { userId: pps[5].id, oldParentId: tp3.id, newParentId: gdv2.id, expireAt, status: 'ACTIVE' },
  });
  const bFees = [
    { logId: bLog1.id, from: pps[3].id, to: tp2.id,  level: 1, amt: 300000 },
    { logId: bLog1.id, from: pps[3].id, to: gdv2.id, level: 2, amt: 200000 },
    { logId: bLog1.id, from: pps[3].id, to: gdkd.id, level: 3, amt: 100000 },
    { logId: bLog2.id, from: pps[5].id, to: tp3.id,  level: 1, amt: 250000 },
  ];
  for (const f of bFees) {
    await prisma.breakawayFee.create({
      data: {
        breakawayLogId: f.logId, fromUserId: f.from, toUserId: f.to, level: f.level, amount: f.amt,
        month: curMonthStr, status: 'PENDING',
      },
    });
  }
  console.log('2 BreakawayLog + 4 BreakawayFee records created');

  // 25. AuditLog (15 diverse audit entries)
  const auditActions = [
    { userId: admin.id, action: 'LOGIN', targetType: null, targetId: null, status: 'SUCCESS' },
    { userId: admin.id, action: 'CONFIG_CHANGE', targetType: 'CommissionConfig', targetId: 1, status: 'SUCCESS', oldValue: '{"rate":0.1}', newValue: '{"rate":0.12}' },
    { userId: admin.id, action: 'DEPOSIT_CONFIRM', targetType: 'DepositHistory', targetId: 1, status: 'SUCCESS' },
    { userId: gdkd.id, action: 'LOGIN', targetType: null, targetId: null, status: 'SUCCESS' },
    { userId: gdkd.id, action: 'LOGIN_FAILED', targetType: null, targetId: null, status: 'FAILURE', metadata: '{"reason":"wrong_password"}' },
    { userId: admin.id, action: 'RANK_CHANGE', targetType: 'User', targetId: pps[0].id, oldValue: '"PP"', newValue: '"TP"', status: 'SUCCESS' },
    { userId: admin.id, action: 'CTV_ACTIVATE', targetType: 'User', targetId: ctvs[0].id, status: 'SUCCESS' },
    { userId: admin.id, action: 'DATA_EXPORT', targetType: 'Transaction', targetId: null, status: 'SUCCESS', metadata: '{"count":120}' },
    { userId: null, action: 'CRON_JOB', targetType: 'AuditLogCleanup', targetId: null, status: 'SUCCESS' },
    { userId: null, action: 'CRON_JOB', targetType: 'AutoRank', targetId: null, status: 'SUCCESS' },
    { userId: admin.id, action: 'REASSIGN', targetType: 'User', targetId: pps[3].id, oldValue: `{"parentId":${tp2.id}}`, newValue: `{"parentId":${gdv2.id}}`, status: 'SUCCESS' },
    { userId: admin.id, action: 'DEPOSIT_REJECT', targetType: 'DepositHistory', targetId: 2, status: 'SUCCESS', metadata: '{"reason":"invalid_proof"}' },
    { userId: gdv1.id, action: 'LOGOUT', targetType: null, targetId: null, status: 'SUCCESS' },
    { userId: admin.id, action: 'CTV_DEACTIVATE', targetType: 'User', targetId: ctvs[5].id, status: 'SUCCESS', metadata: '{"reason":"inactive_90d"}' },
    { userId: admin.id, action: 'CONFIG_CHANGE', targetType: 'MembershipTier', targetId: 1, status: 'SUCCESS' },
  ];
  for (let i = 0; i < auditActions.length; i++) {
    const d = new Date(now); d.setHours(d.getHours() - (auditActions.length - i) * 3);
    await prisma.auditLog.create({
      data: {
        ...auditActions[i],
        ipAddress: '192.168.1.' + (10 + i),
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Safari/537.36',
        createdAt: d,
      },
    });
  }
  console.log(`${auditActions.length} AuditLog records created`);

  // 26. AdminManualAction (3 actions)
  await prisma.adminManualAction.createMany({
    data: [
      { adminId: admin.id, actionType: 'VERIFY_TRAINING', targetType: 'TrainingLog', targetId: 1, oldStatus: 'PENDING', newStatus: 'VERIFIED', reason: 'OTP timeout — xác minh thủ công' },
      { adminId: admin.id, actionType: 'MARK_PAYOUT_PROCESSED', targetType: 'PayoutLog', targetId: 5, oldStatus: 'PENDING', newStatus: 'PROCESSED', reason: 'Ngân hàng xác nhận đã chuyển' },
      { adminId: admin.id, actionType: 'ISSUE_INVOICE', targetType: 'Invoice', targetId: 8, oldStatus: 'DRAFT', newStatus: 'SENT', reason: 'Phát hành thủ công sau khi sửa thông tin' },
    ],
  });
  console.log('3 AdminManualAction records created');

  console.log('\nSeed complete! (V13 full)');
  console.log('Login credentials:');
  console.log('   admin@ccbmart.vn / admin123 (super_admin)');
  console.log('   ops@ccbmart.vn / admin123 (ops_admin)');
  console.log('   partner@ccbmart.vn / admin123 (partner_admin)');
  console.log('   member@ccbmart.vn / admin123 (member_admin)');
  console.log('   training@ccbmart.vn / admin123 (training_admin)');
  console.log('   finance@ccbmart.vn / admin123 (finance_admin)');
  console.log('   ctv1@ccbmart.vn / ctv123 (GDKD)');
  console.log('   ctv2@ccbmart.vn / ctv123 (GDV)');
  console.log('   agency1@ccbmart.vn / agency123');
  console.log('   member1@ccbmart.vn / member123 (Green)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
