# CCB Mart Architecture — C12.4

**Phiên bản:** C12.4 (kế thừa V12.2: eKYC, Invoices, Auto-Transfer, Tax Engine, OTP, Cap 5%, B2B)

---

## 1. Nguyên tắc tài chính (C12.4)

> **TẤT CẢ khoản thù lao / hoa hồng / phí đều do CCB Mart chi trả từ doanh thu bán hàng.**
> Không có chuyển tiền trực tiếp giữa các đối tác (mentor ↔ mentee, F1 ↔ F2, v.v.).

Điều này áp dụng cho:
- Hoa hồng bán hàng cá nhân
- Lương cứng (cap 5% doanh thu tháng)
- Phí đào tạo (hoá đơn B2B giữa HKD)
- **Phí quản lý F1/F2/F3** (C12.4)
- **Phí sau thoát ly Level 1/2/3** (C12.4)
- Quỹ thị trường, team bonus, thưởng KPI

Mọi giao dịch được ghi log tại CCB Mart và đối soát qua `AutoTransferLog` + `Invoice` + các bảng C12.4 mới.

---

## 2. Phí quản lý trong nhóm (F1/F2/F3) — C12.4

Đây KHÔNG phải cascading commission trên doanh số đội (như F1/F2/F3 cũ đã gỡ ở V12.1).
Đây là **phí quản lý** mà CCB Mart chi trả cho cấp trên trên doanh số **COMBO BÁN LẺ TRỰC TIẾP** của cấp dưới (không đệ quy đội).

### Bảng tỷ lệ

| Loại | Cấp nhận      | Tỷ lệ | Trên                                    |
|------|---------------|-------|------------------------------------------|
| F1   | TP trở lên    | 10%   | Combo bán lẻ trực tiếp của F1 (cấp dưới trực tiếp) |
| F2   | GĐV trở lên   | 5%    | Combo bán lẻ trực tiếp của F2 (cấp dưới gián tiếp 1 bậc) |
| F3   | GĐKD          | 3%    | Combo bán lẻ trực tiếp của F3 (cấp dưới gián tiếp 2 bậc) |

### Điều kiện bắt buộc

Cấp trên muốn nhận phí quản lý phải có **≥ 20h đào tạo/tháng** (tính từ `TrainingLog` đã VERIFIED,
`trainerId = user.id`, sum `durationMinutes ≥ 1200`).

### Service

- `services/managementFee.js`
  - `calculateMonthlyManagementFees(month)` — scan toàn bộ CTV active, tìm uplines 1/2/3, check rank + training hours, tạo record trong bảng `management_fees`.
  - `getReceivedManagementFeesSummary(userId, month)` — summary { f1, f2, f3, total }.
  - `getTrainerMinutes(userId, month)` — helper tính training hours của mentor.

Service recompute-safe: xoá record PENDING cũ của tháng rồi tạo lại.

### API

**CTV:**
- `GET /api/ctv/management-fees?month=YYYY-MM` — list phí quản lý user hiện tại nhận được.

**Admin:**
- `GET /api/admin/management-fees?month=&level=&status=&userId=` — list toàn bộ.
- `POST /api/admin/management-fees/process-monthly { month }` — trigger tính lại cho tháng.
- `POST /api/admin/management-fees/:id/mark-paid` — đánh dấu đã trả.

---

## 3. Phí quản lý sau thoát ly (2 giai đoạn) — C12.4

### Bối cảnh

Khi mentee (ví dụ TP) đạt cấp ngang/vượt mentor (GĐV), mentee **thoát ly** khỏi mentor cũ:
- B2BContract với mentor cũ bị terminate.
- Mentee được đăng ký làm HKD (nếu chưa).
- **parentId của mentee được chuyển lên grandParent** (cấp trên của mentor cũ) — mentee KHÔNG còn treo lơ lửng.
- Tạo mới B2BContract với grandParent.
- Ghi `BreakawayLog` với cửa sổ 12 tháng (`expireAt = breakawayAt + 12m`).

### Giai đoạn 1 (12 tháng đầu sau thoát ly)

Tính trên **toàn doanh số nhánh thoát** (subtree của user thoát ly) mỗi tháng:

| Level | Người nhận                         | Tỷ lệ |
|-------|------------------------------------|-------|
| L1    | F1 cũ (mentor trực tiếp)           | 3%    |
| L2    | F2 cũ (mentor gián tiếp = grandParent tại thời điểm thoát ly) | 2%    |
| L3    | GĐKD — **chỉ khi GĐKD không phải F1/F2 cũ** | 1%    |

Cả ba cấp đều do CCB Mart chi trả; L3 được trả **từ quỹ công ty** (không khấu vào nhánh nào khác).

### Giai đoạn 2 (tháng 13 trở đi)

`BreakawayLog.status = EXPIRED`. Cơ chế trở về mặc định:
- Phí quản lý F1=10% / F2=5% / F3=3% tính với cấp trên **MỚI** (đã là grandParent từ lúc thoát ly).

### Service

- `services/breakaway.js`
  - `handleBreakaway(traineeId, mentorId)` — terminate contract cũ, update parentId → grandParent, tạo contract mới, tạo BreakawayLog (upsert theo `userId` unique).
  - `processMonthlyBreakawayFees(month)` — scan BreakawayLog ACTIVE, tính subtree revenue, tạo BreakawayFee records; đồng thời đánh dấu EXPIRED cho log đã quá 12 tháng.
  - `getReceivedBreakawayFeesSummary(userId, month)` — summary { level1, level2, level3, total }.
  - `getSubtreeRevenue(rootUserId, month)` — BFS thu thập toàn bộ subtree id và sum doanh số.

### API

**CTV:**
- `GET /api/ctv/breakaway-fees?month=YYYY-MM` — list phí sau thoát ly user hiện tại nhận.

**Admin:**
- `GET /api/admin/breakaway-logs?status=ACTIVE|EXPIRED` — list các nhánh thoát ly + monthsRemaining.
- `GET /api/admin/breakaway-fees?month=&level=&status=&userId=` — list records.
- `POST /api/admin/breakaway/process-monthly { month }` — trigger tính phí cho tháng.
- `POST /api/admin/breakaway-fees/:id/mark-paid` — đánh dấu đã trả.

---

## 4. Trực thuộc sau thoát ly (C12.4)

**Quy tắc:** Khi mentee thoát ly khỏi mentor, `User.parentId` được set = `mentor.parentId` (= grandParent).
Nếu grandParent không tồn tại (mentor là root), parentId = null và mentee trở thành root mới.

Logic này ở `services/breakaway.js → handleBreakaway()`. Điều này đảm bảo:
1. Cây hierarchy luôn liên thông (không có node lơ lửng).
2. Cấp trên mới tự động trở thành mentor mới (với B2BContract mới tạo tự động).
3. Sau 12 tháng, các phí F1/F2/F3 mặc định đã trỏ đúng cấp trên mới.

---

## 5. Monthly Report API — C12.4

### `GET /api/ctv/monthly-report?month=YYYY-MM`

**Response fields:**
```json
{
  "userId": 2,
  "month": "2026-04",
  "personalRevenue":        15000000,
  "teamRevenue":           120000000,
  "selfCommission":         3000000,
  "fixedSalary":           18000000,
  "managementFeeReceived": { "f1": 2500000, "f2": 800000, "f3": 0, "total": 3300000 },
  "breakawayFeeReceived":  { "level1": 900000, "level2": 600000, "level3": 0, "total": 1500000 },
  "marketFundReceived":     500000,
  "trainingFeeReceived":   6000000,
  "teamBonus":             4100000,
  "feePaid":               1500000,
  "totalIncome":          34900000,
  "tax":                   3490000,
  "netIncome":            31410000,
  "invoiceLinks": [ /* … */ ]
}
```

Tất cả các khoản trong `totalIncome` đều do CCB Mart chi trả từ doanh thu bán hàng.

---

## 6. Database Models — C12.4 additions

### `ManagementFee`

```prisma
model ManagementFee {
  id         Int      @id @default(autoincrement())
  fromUserId Int      // cấp dưới tạo doanh số
  toUserId   Int      // cấp trên nhận phí
  level      Int      // 1 (F1=10%), 2 (F2=5%), 3 (F3=3%)
  amount     Float
  month      String   // YYYY-MM
  status     String   @default("PENDING")  // PENDING/PAID
  createdAt  DateTime @default(now())
}
```

### `BreakawayLog`

```prisma
model BreakawayLog {
  id           Int      @id @default(autoincrement())
  userId       Int      @unique   // 1 user = 1 breakaway active
  oldParentId  Int                // mentor cũ (F1 cũ)
  newParentId  Int                // grandParent (= parent mới sau thoát ly)
  breakawayAt  DateTime @default(now())
  expireAt     DateTime           // +12 months
  status       String   @default("ACTIVE")  // ACTIVE/EXPIRED
}
```

### `BreakawayFee`

```prisma
model BreakawayFee {
  id             Int    @id @default(autoincrement())
  breakawayLogId Int
  fromUserId     Int    // user thoát ly
  toUserId       Int    // mentor cũ hoặc GĐKD (level 3)
  level          Int    // 1 (3%), 2 (2%), 3 (1%)
  amount         Float
  month          String // YYYY-MM
  status         String @default("PENDING")
}
```

Relations trên `User`:
- `mgmtFeesFrom`, `mgmtFeesTo`
- `breakawayLog` (1-1, unique), `breakawayOldParent`, `breakawayNewParent`
- `breakawayFeesFrom`, `breakawayFeesTo`

---

## 7. Frontend Pages — C12.4

| Route | Mô tả |
|-------|-------|
| `/ctv/management-fees` | Table phí quản lý F1/F2/F3 user hiện tại nhận được theo tháng |
| `/ctv/breakaway-fees` | Phí sau thoát ly L1/L2/L3 |
| `/ctv/monthly-report` | Báo cáo tháng — đã bổ sung tất cả fields mới |
| `/admin/management-fees` | Toàn bộ phí quản lý, nút "Tính lại tháng", "Đã trả" |
| `/admin/breakaway-logs` | List nhánh thoát ly với timer 12 tháng + list phí tháng |

Sidebar đã bổ sung 2 menu CTV (Phí quản lý, Phí thoát ly) và 2 menu Admin (Phí quản lý, Thoát ly).

---

## 8. Kế thừa V12.2

Toàn bộ tính năng V12.2 được giữ nguyên:

- **eKYC:** `/ctv/kyc`, `/admin/kyc` — KycStatus SUBMITTED/VERIFIED/REJECTED/NEED_MANUAL_REVIEW.
- **Invoices:** phí đào tạo B2B M0-M5, tự động issue khi mentor có mentee ≥ 50 combo.
- **Auto-Transfer:** `AutoTransferLog` — đối soát invoice thanh toán hàng tháng.
- **Tax Engine:** `TaxRecord` — TNCN 10% trên totalIncome.
- **Cap 5% lương cứng:** `calculateSalaryFundStatus()`.
- **B2BContract:** hợp đồng đào tạo giữa HKD.
- **OTP confirm training:** `trainingLog.otpCode` + fallback manual.
- **C12.3 Failover:** admin manual override cho tất cả các bước.

---

## 9. Seed Data C12.4

- 20 `ManagementFee` records (mix level 1/2/3, PAID/PENDING, 3 tháng gần nhất)
- 3 `BreakawayLog` (2 ACTIVE: tp1↔gdv1, tp3↔gdv2; 1 EXPIRED: pps[5]↔tp3)
- 15 `BreakawayFee` records (mix level 1/2/3 cho 2 active logs, 3 tháng)

---

**Login:** `admin@ccbmart.vn / admin123`
**Repo:** `melvic2082dev/ccbmart`
