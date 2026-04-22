# CCB Mart System Architecture V12.2

> Phiên bản cập nhật từ V12.1 — tập trung vào tự động hoá luồng tài chính
> (hoá đơn điện tử, auto-transfer, thuế TNCN), định danh eKYC và bảo mật OTP.

## Tổng quan thay đổi V12.2

1. **eKYC** — xác minh danh tính CCCD cho CTV trước khi active toàn phần.
2. **Hoá đơn điện tử + Auto-Transfer** — mỗi tháng hệ thống tự tạo `Invoice` và
   `AutoTransferLog` theo B2B contract, áp K factor, ghi nhận trạng thái
   PENDING/SUCCESS/FAILED.
3. **Tax Engine 10% TNCN** — tự tính thuế cuối tháng cho toàn bộ CTV (cá nhân
   và HKD), xuất báo cáo cho cơ quan thuế.
4. **OTP cho Training Log** — trainee phải nhập OTP 6 số (TTL 10 phút) để
   xác nhận buổi đào tạo, chống gian lận.
5. **Cap 5% lương cứng** — khi tổng lương cứng vượt 5% doanh thu kênh CTV
   toàn hệ thống, tất cả lương cứng sẽ được scale down theo tỷ lệ và log vào
   `SyncLog`.
6. **B2BContract termination tracking** — thêm `terminatedBy` để audit
   hành vi terminate (admin vs auto breakaway).
7. **Monthly Report API** — CTV xem báo cáo tháng cá nhân tổng hợp gồm doanh
   số, phí DV nhận/trả, thuế, invoice.

## Giữ nguyên V12.1

Tất cả logic V12.1 được giữ nguyên:

- Chức danh chuyên nghiệp: CTV, PP, TP, GDV, GDKD (không MLM F1/F2/F3).
- Phí DV đào tạo (M0-M5) theo số combo nhánh.
- Salary fund cap 5% + soft salary.
- T+1 promotion.
- Team bonus (bronze/silver/gold).
- HKD (Business Household) với tax code.
- B2B Contract và Training Log (mentor/mentee).
- Kênh bán: CTV / Agency / Showroom.
- PWA + push notification + Momo/ZaloPay + Import Excel.

## Bổ sung V12.2

### 1. eKYC (Electronic Know-Your-Customer)

Thêm 7 field KYC trên `User`:
- `kycStatus` (PENDING/SUBMITTED/VERIFIED/REJECTED)
- `kycSubmittedAt`, `kycVerifiedAt`, `kycRejectReason`
- `idNumber`, `idFrontImage`, `idBackImage`

Luồng:
1. CTV upload CCCD + 2 ảnh → `kycStatus = SUBMITTED`.
2. Admin xem danh sách pending, verify hoặc reject với lý do.
3. Sau khi VERIFIED, CTV có thể ký B2B contract.

### 2. Auto Transfer & Hóa đơn điện tử

Model mới:

- **Invoice**: hoá đơn điện tử ghi nhận phí DV đào tạo giữa trainer và trainee
  trong 1 tháng. Gồm `invoiceNumber` format `CCB-YYYYMM-NNNN`, `feeTier` (M0-M5),
  `amount` (sau K factor), `status` (DRAFT/SENT/PAID/CANCELLED) và `pdfUrl`.
- **AutoTransferLog**: log chuyển khoản tự động, `status` PENDING/SUCCESS/FAILED,
  có `errorMessage` khi thất bại, `reference` trỏ về `invoiceId`.

Luồng chạy hàng tháng (trigger bằng API `POST /api/admin/invoices/process-monthly`):
1. Lấy tất cả `B2BContract` ACTIVE.
2. Với mỗi contract, gọi `calculateTrainingFee(traineeId, month)` + `calculateKFactor(month)`.
3. Sinh `Invoice` với `invoiceNumber` tuần tự.
4. Sinh `AutoTransferLog` ghi nhận trạng thái, trỏ `reference` về invoice.
5. Trả về summary: `invoicesCreated`, `transfersCreated`, `totalAmount`, `kFactor`.

### 3. OTP cho Training Log

Thêm `otpCode` và `otpExpiresAt` trên `TrainingLog`:
- Mentor call `POST /api/training-logs/:id/request-otp` → service sinh mã 6 số (TTL 10 phút).
- Mentee call `POST /api/training-logs/:id/confirm` body `{ otp }` → service verify; nếu
  đúng và chưa hết hạn thì set `menteeConfirmed = true`, `status = VERIFIED`,
  clear OTP fields.

### 4. Cap 5% lương cứng (trong `commission.js`)

Trong `calculateCtvCommission()`:
1. Đọc `calculateSalaryFundStatus(month)`:
   - `salaryFundCap = 5% * ctvRevenue`
   - `totalFixedSalary = Σ fixedSalary của tất cả PP/TP/GDV/GDKD active`
2. Nếu `totalFixedSalary > salaryFundCap`:
   - `capFactor = salaryFundCap / totalFixedSalary`
   - Log warning vào `SyncLog` (source: `commission-5pct-cap`)
3. `effectiveSalary = floor(rates.fixedSalary * capFactor)`

Hiệu ứng: khi hệ thống phát triển tới mức vượt cap, tất cả lương cứng sẽ được
scale down đồng đều, đảm bảo quỹ không vượt 5% DT.

### 5. Tax Engine (10% TNCN)

Model mới **TaxRecord**: unique theo `(userId, month)`, chứa `taxableIncome`,
`taxAmount`, `status` (PENDING/PAID).

Service `taxEngine.js`:
- `calculateTax(userId, month)` — trả `taxableIncome` = commission + training
  fee + lương cứng + team bonus; `taxAmount = floor(taxableIncome * 0.10)`.
- `processMonthlyTax(month)` — upsert record cho toàn bộ CTV active, tổng
  hợp `totalTaxCollected`.
- `generateTaxReport(hkdId, month)` — xuất báo cáo cho HKD kèm tax code.

### 6. B2BContract termination

Thêm `terminatedBy` (id admin/hệ thống). API:
`POST /api/admin/contracts/:id/terminate` body `{ reason }`.

Khi CTV breakaway (chuyển nhánh), service breakaway sẽ auto-call endpoint này
với reason `"breakaway"`.

### 7. Monthly Report API

`GET /api/ctv/monthly-report?month=YYYY-MM` trả về:

```
{
  personalRevenue,    // doanh số cá nhân
  teamRevenue,        // doanh số nhánh (tới F2)
  selfCommission,
  fixedSalary,        // đã apply cap 5%
  teamBonus,
  feeReceived,        // Σ invoice where toUserId = self
  feePaid,            // Σ invoice where fromUserId = self
  netIncome,          // commission + salary + bonus + feeReceived - feePaid
  tax,                // 10% netIncome
  netAfterTax,
  invoiceLinks: []    // danh sách invoice liên quan
}
```

## Database Models (cập nhật)

### User (mở rộng V12.2)

```prisma
model User {
  // ... V12.1 fields ...
  kycStatus       String    @default("PENDING")
  kycSubmittedAt  DateTime?
  kycVerifiedAt   DateTime?
  kycRejectReason String?
  idNumber        String?
  idFrontImage    String?
  idBackImage     String?
  invoicesFrom    Invoice[]         @relation("InvoicesFrom")
  invoicesTo      Invoice[]         @relation("InvoicesTo")
  transfersFrom   AutoTransferLog[] @relation("TransfersFrom")
  transfersTo     AutoTransferLog[] @relation("TransfersTo")
  taxRecords      TaxRecord[]
}
```

### B2BContract (mở rộng)

```prisma
model B2BContract {
  // ... V12.1 fields ...
  terminatedBy  Int?       // V12.2: who terminated
  invoices      Invoice[]
}
```

### TrainingLog (mở rộng)

```prisma
model TrainingLog {
  // ... V12.1 fields ...
  otpCode       String?
  otpExpiresAt  DateTime?
}
```

### Invoice (mới)

```prisma
model Invoice {
  id            Int      @id @default(autoincrement())
  contractId    Int?
  fromUserId    Int
  toUserId      Int
  amount        Float
  feeTier       String   // M0-M5
  invoiceNumber String   @unique
  issuedAt      DateTime @default(now())
  pdfUrl        String?
  status        String   @default("DRAFT")
}
```

### AutoTransferLog (mới)

```prisma
model AutoTransferLog {
  id           Int      @id @default(autoincrement())
  fromUserId   Int
  toUserId     Int
  amount       Float
  transferDate DateTime @default(now())
  reference    Int?     // invoiceId
  status       String   @default("PENDING")
  errorMessage String?
}
```

### TaxRecord (mới)

```prisma
model TaxRecord {
  id             Int      @id @default(autoincrement())
  userId         Int
  month          String   // YYYY-MM
  taxableIncome  Float
  taxAmount      Float    // 10% TNCN
  status         String   @default("PENDING")

  @@unique([userId, month])
}
```

## API Routes (bổ sung)

### eKYC
- `POST /api/kyc/submit` — CTV upload
- `GET  /api/kyc/status` — CTV check
- `GET  /api/admin/kyc/pending` — admin list
- `POST /api/admin/kyc/verify/:userId` — admin verify/reject

### Invoice & Auto Transfer
- `GET  /api/admin/invoices?status=&page=`
- `POST /api/admin/invoices/process-monthly` — chạy cron tháng
- `GET  /api/admin/invoices/:id/pdf` — sinh PDF
- `GET  /api/admin/transfers?status=&page=`
- `GET  /api/ctv/invoices/my` — CTV xem hoá đơn của mình
- `POST /api/admin/contracts/:id/terminate` — terminate contract

### Tax
- `GET  /api/admin/tax?month=&status=`
- `POST /api/admin/tax/process` body `{ month }`
- `GET  /api/admin/tax/report/:hkdId?month=` — báo cáo HKD
- `POST /api/admin/tax/mark-paid/:id`
- `GET  /api/ctv/tax/preview?month=` — CTV preview

### Training Log OTP
- `POST /api/training-logs/:id/request-otp` — sinh OTP
- `POST /api/training-logs/:id/confirm` body `{ otp }` — verify

### Monthly Report
- `GET  /api/ctv/monthly-report?month=` — báo cáo tháng cá nhân

## Backend Services (mới)

- `services/autoTransfer.js` — `processMonthlyTransfer`, `generateInvoicePDF`.
- `services/taxEngine.js` — `calculateTax`, `processMonthlyTax`, `generateTaxReport`.
- `services/kycService.js` — `submitKyc`, `getKycStatus`, `verifyKyc`, `listPendingKyc`.
- `services/otpService.js` — `generateOTP`, `verifyOTP` (TTL 10 phút).
- `services/commission.js` — mở rộng với logic cap 5% và log SyncLog.

## Frontend Pages (mới)

Admin:
- `/admin/invoices` — bảng hoá đơn + filter status + nút "Chạy auto-transfer tháng".
- `/admin/transfers` — `AutoTransferLog` với stats tổng SUCCESS/FAILED.
- `/admin/kyc` — danh sách pending KYC, verify/reject inline.
- `/admin/tax` — `TaxRecord` theo tháng, button "Tính thuế tháng", mark paid.

CTV:
- `/ctv/kyc` — submit KYC + xem trạng thái.
- `/ctv/invoices` — hoá đơn của tôi (nhận & trả).
- `/ctv/monthly-report` — báo cáo tháng cá nhân.

Sidebar cập nhật với 4 mục admin mới (eKYC, Hoa don, Auto Transfer, Thue TNCN)
và 3 mục CTV mới (eKYC, Hoa don, Bao cao thang).

## Seed Data V12.2

- **20 Invoice** (mix DRAFT/SENT/PAID/CANCELLED), số CCB-YYYYMM-NNNN.
- **30 AutoTransferLog** (mix PENDING/SUCCESS/FAILED với error message).
- **15 TaxRecord** (mix PENDING/PAID, trải qua 3 tháng).
- **5 User KYC VERIFIED**: gdkd, gdv1, gdv2, tp1, tp2.
- **5 User KYC SUBMITTED** (pending review): tp3, pp1-pp4.

## Thứ tự migrate V12.1 → V12.2

1. `npx prisma db push --force-reset` (thêm models mới + cột KYC/OTP/terminatedBy).
2. `npx prisma db seed` (re-seed với data V12.2).
3. Restart backend để load routes mới.
4. Frontend rebuild để load pages mới.

Login:
- `admin@ccbmart.vn / admin123`
- `ctv1@ccbmart.vn / ctv123` (GĐKD, KYC VERIFIED)
- `ctv2@ccbmart.vn / ctv123` (GĐV, KYC VERIFIED)
