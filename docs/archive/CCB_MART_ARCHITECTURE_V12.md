# CCB Mart System Architecture V12.1

## Tong quan thay doi V12.1

V12.1 la ban nang cap lon, **xoa bo hoan toan mo hinh hoa hong da cap F1/F2/F3** va thay the bang **Phi DV dao tao co dinh theo moc doanh so nhanh**. He thong chuyen tu MLM-style commission sang mo hinh B2B dao tao hop phap.

### Thay doi chinh:
1. **Xoa F1/F2/F3** tu CommissionConfig, commission.js, frontend
2. **Them Phi DV dao tao** (FeeConfig M0-M5) voi he so K dieu chinh
3. **Them Ho kinh doanh (HKD)** cho CTV cap cao
4. **Them Hop dong B2B** (B2BContract) giua mentor-mentee
5. **Them Nhat ky dao tao** (TrainingLog) de ghi nhan phien dao tao
6. **Co che Breakaway** khi mentee dat cap ngang/vuot mentor

---

## Kien truc he thong

### Stack
- **Frontend**: Next.js 16 + React 19 + Tailwind CSS 4 + shadcn/ui
- **Backend**: Express.js + Prisma ORM + SQLite
- **Queue**: BullMQ + Redis (sync jobs)
- **Auth**: JWT + bcrypt

### Database Models (Prisma)

#### Core Models (tu V6):
- `User` - nguoi dung (admin, ctv, agency, member)
- `Agency` - dai ly
- `Product` - san pham
- `Transaction` / `TransactionItem` - giao dich
- `Customer` - khach hang
- `CommissionConfig` - cau hinh hoa hong (**V12.1: xoa f1Pct, f2Pct, f3Pct**)
- `AgencyCommissionConfig` - hoa hong dai ly
- `KpiLog` - nhat ky KPI
- `RankHistory` - lich su thay doi cap bac
- `PromotionEligibility` - T+1 promotion
- `TeamBonus` - thuong doi nhom
- `CtvHierarchy` - cay quan ly
- `InventoryWarning` - canh bao ton kho
- `SyncLog` - nhat ky dong bo

#### Models moi V12.1:
- **`FeeConfig`** - Bang moc phi DV dao tao (M0-M5)
  - tier (unique), minCombo, maxCombo (nullable), feeAmount, description, isActive
- **`BusinessHousehold`** - Ho kinh doanh
  - userId (unique), businessName, taxCode, businessLicense, status
- **`B2BContract`** - Hop dong B2B dao tao
  - contractNo (unique), trainerId, traineeId, signedAt, expiredAt, status
- **`TrainingLog`** - Nhat ky dao tao
  - trainerId, traineeId, sessionDate, durationMinutes, content, status (PENDING/VERIFIED)

#### User model update:
- Them `isBusinessHousehold` Boolean (default false)

---

## He thong hoa hong V12.1

### CTV Commission (thay doi lon)

| Cap bac | HH Tu ban | Luong cung | Phi DV dao tao |
|---------|-----------|------------|----------------|
| CTV     | 20%       | 0          | -              |
| PP      | 20%       | 5,000,000  | Theo moc M0-M5 |
| TP      | 30%       | 10,000,000 | Theo moc M0-M5 |
| GDV     | 35%       | 18,000,000 | Theo moc M0-M5 |
| GDKD    | 38%       | 30,000,000 | Theo moc M0-M5 |

**Xoa bo**: f1Pct, f2Pct, f3Pct (hoa hong da cap)

### Phi DV Dao tao (thay the F1/F2/F3)

| Tier | Min combo | Max combo | Phi co dinh |
|------|-----------|-----------|-------------|
| M0   | 0         | 49        | 0           |
| M1   | 50        | 99        | 1,500,000   |
| M2   | 100       | 199       | 3,000,000   |
| M3   | 200       | 299       | 4,500,000   |
| M4   | 300       | 399       | 6,000,000   |
| M5   | 400+      | -         | 7,500,000   |

### He so K (K Factor)
- **Cong thuc**: K = (3% x Tong DT kenh CTV) / (Tong phi DV ly thuyet)
- **Toi thieu**: K = 0.7
- **Phi thuc nhan** = Phi co dinh (theo moc) x K

### Cong thuc tong thu nhap:
```
Tong thu nhap = HH ca nhan + Phi DV dao tao x K + Luong cung + Thuong doi nhom
```

---

## API Routes

### Admin Routes
| Method | Path | Mo ta |
|--------|------|-------|
| GET | /api/admin/dashboard | Dashboard tong hop |
| GET | /api/admin/ctvs | Danh sach CTV |
| GET | /api/admin/ctv-tree | Cay CTV |
| GET | /api/admin/agencies | Danh sach dai ly |
| GET | /api/admin/config/commission | Cau hinh hoa hong |
| PUT | /api/admin/config/commission/:tier | Cap nhat hoa hong |
| **GET** | **/api/admin/fee-config** | **Danh sach moc phi (V12.1)** |
| **PUT** | **/api/admin/fee-config/:tier** | **Cap nhat moc phi (V12.1)** |
| **GET** | **/api/admin/business-household** | **Danh sach HKD (V12.1)** |
| **POST** | **/api/admin/business-household** | **Thao tac HKD (V12.1)** |
| **GET** | **/api/training-logs/admin** | **Nhat ky dao tao (V12.1)** |
| **POST** | **/api/training-logs/admin/verify/:id** | **Xac nhan dao tao (V12.1)** |

### CTV Routes
| Method | Path | Mo ta |
|--------|------|-------|
| GET | /api/ctv/dashboard | Dashboard CTV |
| GET | /api/ctv/tree | Cay quan ly |
| **GET** | **/api/training-logs/my** | **Nhat ky dao tao cua toi (V12.1)** |
| **POST** | **/api/training-logs** | **Tao phien dao tao (V12.1)** |
| **POST** | **/api/training-logs/:id/confirm** | **Mentee xac nhan (V12.1)** |

---

## Frontend Pages

### Pages moi V12.1:
- `/admin/fee-config` - Quan ly moc phi DV dao tao M0-M5
- `/admin/business-household` - Quan ly Ho kinh doanh
- `/admin/training-logs` - Nhat ky dao tao + xac nhan

### Pages cap nhat:
- `/admin/config` - Xoa cot F1/F2/F3, them bang Fee Config
- `/ctv/dashboard` - Xoa F1/F2/F3 commission breakdown, them "Phi DV dao tao" + "Thuong doi nhom"

### Sidebar menu moi (admin):
- HKD (Business Household)
- Phi dao tao (Fee Config)
- NK Dao tao (Training Logs)

---

## Backend Services

### services/commission.js (cap nhat V12.1)
- Xoa F1/F2/F3 logic hoan toan
- `calculateCtvCommission()` chi tinh: selfCommission + trainingFee + fixedSalary + teamBonus
- Tich hop `trainingFee.js` de tinh phi dao tao

### services/trainingFee.js (moi V12.1)
- `calculateTrainingFee(traineeId, month)` - tinh phi theo moc combo nhanh
- `calculateKFactor(month)` - tinh he so K
- `countBranchCombos(userId, startDate, endDate)` - dem combo nhanh

### services/breakaway.js (moi V12.1)
- `shouldBreakaway(traineeRank, mentorRank)` - kiem tra dieu kien breakaway
- `handleBreakaway(traineeId, mentorId)` - xu ly breakaway (cham dut hop dong, tao HKD doc lap)

---

## Seed Data V12.1

- 1 Admin + 30 CTV (hierarchy GDKD->GDV->TP->PP->CTV)
- 3 Agencies
- 5 CommissionConfig (khong co F1/F2/F3)
- 6 FeeConfig (M0-M5)
- 3 BusinessHousehold (GDKD, GDV, TP)
- 5 B2BContract
- 10 TrainingLog (mix PENDING/VERIFIED)
- 15 Products, 100 Customers, 500 Transactions

### Login:
- Admin: admin@ccbmart.vn / admin123
- CTV (GDKD): ctv1@ccbmart.vn / ctv123
- CTV (GDV): ctv2@ccbmart.vn / ctv123
- Agency: agency1@ccbmart.vn / agency123

---

## Luong nghiep vu chinh

### 1. Tinh thu nhap CTV hang thang
```
1. Tinh HH ca nhan = Doanh so x selfSalePct
2. Tinh combo nhanh (ca nhan + downline)
3. Tim moc phi M0-M5 tuong ung
4. Tinh K factor = (3% x Tong DT) / (Tong phi ly thuyet), min 0.7
5. Phi DV dao tao = Phi co dinh x K
6. Luong cung (soft salary, gioi han 5% DT kenh CTV)
7. Thuong doi nhom (neu du dieu kien)
8. Tong = 1 + 5 + 6 + 7
```

### 2. Breakaway
```
1. Khi mentee dat cap ngang/vuot mentor
2. Tu dong cham dut hop dong B2B
3. Dang ky mentee la HKD doc lap
4. Xoa parent relationship
```

### 3. Xac nhan dao tao
```
1. Mentor tao phien dao tao (TrainingLog)
2. Mentee xac nhan (menteeConfirmed)
3. Admin xac nhan/tu choi (status -> VERIFIED/REJECTED)
4. Chi tinh phi cho phien da VERIFIED
```
