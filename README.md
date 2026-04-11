# CCB Mart - Hệ thống Quản lý Chuỗi Bán lẻ Cộng đồng

Hệ thống quản lý nội bộ cho CCB Mart, bao gồm quản lý CTV (Cộng tác viên), đại lý, hoa hồng cascading, báo cáo tài chính và kiểm soát quỹ lương.

## Tech Stack

- **Backend:** Node.js + Express + Prisma ORM + SQLite
- **Frontend:** Next.js 14 (App Router) + Tailwind CSS + Shadcn/ui + Recharts
- **Auth:** JWT, role-based (admin, ctv, agency)

## Cài đặt & Chạy

### Backend (Port 4000)

```bash
cd backend
npm install
npx prisma migrate dev --name init
npx prisma db seed
node src/server.js
```

### Frontend (Port 3000)

```bash
cd frontend
npm install
npm run dev
```

## Tài khoản Demo

| Email | Password | Role | Rank |
|-------|----------|------|------|
| admin@ccbmart.vn | admin123 | Admin | - |
| ctv1@ccbmart.vn | ctv123 | CTV | GĐKD |
| ctv2@ccbmart.vn | ctv123 | CTV | GĐV |
| agency1@ccbmart.vn | agency123 | Đại lý | - |

## Cấu trúc

```
ccb-mart-system/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # 13 tables
│   │   └── seed.js            # 30 CTV, 3 agency, 100 KH, 500 GD
│   └── src/
│       ├── server.js
│       ├── middleware/auth.js   # JWT + role check
│       ├── routes/
│       │   ├── auth.js         # Login, /me
│       │   ├── ctv.js          # Dashboard, tree, customers, transactions
│       │   ├── agency.js       # Dashboard, inventory, transactions
│       │   └── admin.js        # Dashboard, CTV mgmt, agencies, config, reports
│       └── services/
│           ├── commission.js    # Hoa hồng cascading + quỹ lương
│           └── kiotviet-sync.js # Giả lập sync
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── login/           # Đăng nhập
│       │   ├── ctv/             # Dashboard, customers, transactions, products
│       │   ├── agency/          # Dashboard, inventory, transactions
│       │   └── admin/           # Dashboard, CTV mgmt, agencies, config, reports
│       ├── components/
│       │   ├── Sidebar.tsx      # Navigation theo role
│       │   └── DashboardLayout.tsx
│       └── lib/api.ts           # API client + formatVND
└── README.md
```

## Business Rules (từ Master Doc V9)

### Hoa hồng CTV (Cascading)
| Cấp | Tự bán | F1 | F2 | F3 | Lương cứng |
|-----|--------|----|----|----|----|
| CTV | 20% | - | - | - | 0 |
| Phó phòng | 20% | - | - | - | 5 triệu |
| Trưởng phòng | 30% | 10% | - | - | 10 triệu |
| GĐ Vùng | 35% | 10% | 5% | - | 18 triệu |
| GĐ Kinh doanh | 38% | 10% | 5% | 3% | 30 triệu |

### Hoa hồng Đại lý (theo nhóm sản phẩm)
| Nhóm | Mô tả | HH | Max |
|------|-------|----|----|
| A | Nông sản, suất ăn (Traffic Builder) | 8% | +2% bonus |
| B | FMCG, gia vị (Profit Engine) | 15% | +3% bonus |
| C | TPCN, combo (Star Product) | 20% | +5% bonus |

### Thông số chính
- **Combo giá:** 2.000.000 VND
- **COGS blended GĐ1:** 50% (NS 65% × 50% + TPCN 35% × 50%)
- **Điểm thưởng đại lý:** tối đa 5% doanh số
- **Quỹ lương cứng:** ngưỡng 5% DT kênh CTV, cảnh báo 80% và 100%

### KPI Up/Down Rank
- **Thăng cấp:** Tự bán ≥ 50 combo + đủ portfolio
- **Giảm cấp:** Tự động ngày 01 hàng tháng nếu không đạt KPI

## Seed Data

- 30 CTV (hierarchy: 1 GĐKD → 2 GĐV → 3 TP → 6 PP → 18 CTV)
- 3 đại lý (50tr / 100tr / 300tr deposit)
- 100 khách hàng
- 500 giao dịch (3 tháng, mix: 60% CTV + 20% đại lý + 20% showroom)
- 15 sản phẩm (TPCN, nông sản, FMCG, gia vị)
- Inventory warnings (hàng sắp hết hạn)
