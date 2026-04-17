# CCB Mart — Architecture C13.2.1

> Phiên bản: **C13.2.1** · Ngày: 2026-04-17 · Kế thừa từ C12.4 + V13.1/V13.2.1 MasterDoc
> Phạm vi: các thay đổi đã áp dụng vào codebase worktree `compassionate-greider` sau chuỗi BA feedback.

---

## 1. Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────────────────────┐
│                        CCB Mart Platform                        │
│                                                                 │
│  Frontend (Next.js 16.2 + Turbopack + React 19 + Tailwind 4)    │
│       ↕  REST JSON                                              │
│  Backend (Express + Prisma 6.19 + SQLite dev.db)                │
│       ↕                                                         │
│  Redis (cache/queue, in-memory fallback khi không có REDIS_*)   │
└─────────────────────────────────────────────────────────────────┘

Role primary (User.role): admin · ctv · agency · member
Capability flag (multi-role):
   • User.isMember              → đồng thời là Member (mua hàng cá nhân)
   • User.isBusinessHousehold   → đã đăng ký HKD
```

### Điểm kiến trúc mới C13.2.1
1. **Multi-role single-table**: 1 User có thể đồng thời là CTV + Member, kết nối qua `MemberWallet.userId` unique 1-1.
2. **Self-referral guard** ở `services/transaction.js` — CTV không được tự bán cho chính mình (match theo phone).
3. **Schema extensions**: Transaction bổ sung reconciliation fields, MemberWallet + MembershipTier + DepositHistory + ReferralLog, BusinessHousehold mở rộng với HĐ B2B + bank info, Notification.
4. **Thuật ngữ thống nhất theo V13.2.1**: "Thoát ly" → "Team vượt cấp", "Lương cứng" → "Thù lao DV duy trì", "F1/F2/F3" → "Cấp 1/2/3 dẫn dắt".

---

## 2. Database schema (Prisma)

### 2.1 Core entities
| Model | Trọng yếu |
|---|---|
| `User` | `role`, `rank`, `parentId` (self-ref hierarchy), `isMember`, `isBusinessHousehold`, `kycStatus`, `kyc*` fields |
| `CtvHierarchy` | Quan hệ F1/F2/F3 đã tính sẵn (denormalized) để query nhanh |
| `Agency` | `depositAmount`, `depositTier`, `address` (để trích `region`) |
| `BusinessHousehold` | **MỚI**: `dealerContractNo/SignedAt/ExpiredAt/TermMonths/PdfUrl`, `trainingContractNo/SignedAt/ExpiredAt/TermMonths/PdfUrl`, `bankName/bankAccountNo/bankAccountHolder`, `trainingLineRegistered` |
| `B2BContract` | Hợp đồng đào tạo trainer ↔ trainee |

### 2.2 Transaction + Reconciliation
```
Transaction
  ├─ status          ['PENDING', 'CONFIRMED', 'REJECTED']
  ├─ paymentMethod   ['cash', 'bank_transfer', 'momo', 'zalopay']
  ├─ bankCode        (nullable)
  ├─ ctvSubmittedAt  (timer đối soát)
  ├─ confirmedBy     (admin id)
  ├─ confirmedAt, rejectedReason
  └─ cashDepositId → CashDeposit.id

PaymentProof   (1-1 Transaction, có imageUrl)
CashDeposit    (batch nhiều giao dịch cash, status PENDING/CONFIRMED/REJECTED)
```

### 2.3 Member system (C13.2.1 mới thêm)
```
MembershipTier (BASIC/SILVER/GOLD, minDeposit, pointsRate)
MemberWallet   (1-1 User, referralCode unique, balance, points, tier)
   ├─ totalDeposited, totalSpent, referralCap=500000
   └─ deposits: DepositHistory[]
DepositHistory (amount, method, status, confirmedBy/At)
ReferralLog    (referrerId → refereeId, month, bonusAmount, sunsetAt)
```

### 2.4 Breakaway (Team vượt cấp)
```
BreakawayLog (1 User = 1 log; oldParentId, newParentId, expireAt = +12 tháng, status ACTIVE/EXPIRED)
BreakawayFee (level=1 (3%) / 2 (2%) / 3 (1% GĐKD) · 12 tháng · pay to `toUserId`)
```

### 2.5 Phí quản lý & đào tạo
```
CommissionConfig       (tier, selfSalePct, fixedSalary = Thù lao DV duy trì)
AgencyCommissionConfig (group A/B/C, commissionPct, bonusPct)
FeeConfig              (M0-M5, minCombo, maxCombo, feeAmount)
ManagementFee          (level 1/2/3 = Cấp 1/2/3 dẫn dắt, amount, month, status PENDING/PAID)
Invoice                (feeTier M0-M5, amount, status DRAFT/SENT/PAID, pdfUrl)
```

### 2.6 Audit & Ops
`RankHistory` · `PromotionEligibility` · `TeamBonus` · `KpiLog` · `TrainingLog` (mentor + mentee confirm) · `AutoTransferLog` · `TaxRecord` · `SyncLog` · `Notification`

---

## 3. Backend API (Admin routes)

| Path | Method | Chức năng | Từ bản |
|---|---|---|---|
| `/admin/dashboard` | GET | Stats + chart 6 tháng | C12.4 |
| `/admin/ctvs` | GET | List với `isMember`, `memberWallet`, training hours tháng này | **C13.2.1** |
| `/admin/ctv-tree` | GET | Tree org chart | C12.4 |
| `/admin/ctv/:id/details` | GET | Profile + KPI 12m + rankHistory + mgmtFees + **trainingSummary 6m** + **memberActivity** | **C13.2.1** |
| `/admin/ctv` | POST | Tạo CTV thủ công | **C13.2.1** |
| `/admin/ctv/:id/reassign` | POST | Chuyển parent + audit trail (RankHistory) | **C13.2.1** (mở rộng reason) |
| `/admin/ctv/:id/rank` | POST | Đổi rank + notification | C12.4 |
| `/admin/ctv/:id/toggle-active` | POST | Kích hoạt/ngừng + audit | **C13.2.1** |
| `/admin/ctv/export` | GET | Excel 15 cột gồm thù lao tháng trước | **C13.2.1** |
| `/admin/notifications/bulk` | POST | Gửi thông báo hàng loạt | **C13.2.1** |
| `/admin/agencies` | GET | List + `region`, `rankTier` (Kim cương/Vàng/Bạc/Đồng), `monthlyRevenue`, `currentInventory`, `creditRemaining`, `lowStockCount` | **C13.2.1** |
| `/admin/agencies/:id/details` | GET | Finance card + velocity + warnings | **C13.2.1** |
| `/admin/agencies/:id/transactions` | GET | Last N days | **C13.2.1** |
| `/admin/agencies/:id/restock-suggestions` | GET | Đề xuất nhập dựa trên tốc độ bán | **C13.2.1** |
| `/admin/agencies/:id/transactions/export` | GET | Excel đối soát | **C13.2.1** |
| `/admin/business-household` | GET | List + `warnings[]` (HĐ hết hạn/chưa có TK NH/chưa ĐK ngành) | **C13.2.1** |
| `/admin/business-household/:id/details` | GET | Contract + bank + 12 tháng phí đào tạo + B2B | **C13.2.1** |
| `/admin/business-household/:id/renew` | POST | Gia hạn HĐ Đại lý/DV đào tạo | **C13.2.1** |
| `/admin/business-household/:id/update-bank` | POST | Cập nhật TK ngân hàng | **C13.2.1** |
| `/admin/breakaway-logs` | GET | List với `monthsRemaining` | C12.4 |
| `/admin/breakaway-fees?month=YYYY-MM` | GET | Phí tháng + byLevel {L1, L2, L3} | C12.4 (seed bổ sung L3) |
| `/admin/reconciliation/*` | GET/POST | Đối soát giao dịch + cash deposits | C12.4 |

### Middleware chuẩn
- `authenticate` (JWT, 7 ngày exp) + `authorize('admin')`
- `validate(Joi schemas)` — bổ sung C13.2.1: `createCtv`, `toggleActiveCtv`, `bulkNotify`, `reassignCtv` (thêm `reason`)
- `rateLimiter` (express-rate-limit) toàn cục
- `cache` (ioredis hoặc in-memory fallback)

---

## 4. Frontend pages (Next.js App Router)

### 4.1 Sidebar — 6 nhóm Việt có dấu
```
VẬN HÀNH           Dashboard · Đối soát
NHÂN SỰ & ĐỐI TÁC  CTV · Đại lý · HKD · Team vượt cấp
THÀNH VIÊN          Thành viên · Nạp tiền TV · Hạng thẻ
ĐÀO TẠO & PHÍ      Phí đào tạo · Log đào tạo · Phí quản lý
TÀI CHÍNH & THUẾ   Hóa đơn · Auto Transfer · Thuế TNCN
CẤU HÌNH & BÁO CÁO eKYC · Import · Cấu hình · Báo cáo · Thông báo (badge unread)
```

### 4.2 Map page → capability
| Page | Search | Filter | Pagination | Checkbox | Detail Modal | Export | Mở rộng khác |
|---|:--:|:--:|:--:|:--:|:--:|:--:|---|
| `/admin/ctv` | ✓ | Rank/Manager/Status | 15/trang | ✓ | 6 tabs | xlsx | Context menu tree, toggle active |
| `/admin/agencies` | ✓ | Tier/Region/Revenue/Warning | 20/trang | ✓ | 4 tabs | xlsx | Rank (Kim cương/Vàng/Bạc/Đồng), restock |
| `/admin/business-household` | — | — | — | — | 3 tabs | — | Cảnh báo HĐ, TK NH, gia hạn HĐ |
| `/admin/breakaway-logs` | — | Tháng | — | — | mini-modal | — | Thanh tiến trình 12m, alert sắp hết |
| `/admin/invoices` | ✓ | Status/Tháng | 15/trang | — | — | csv | — |
| `/admin/transfers` | — | Status | — | — | — | — | Retry + Retry-all cho FAILED |
| `/admin/tax` | — | Tháng | 10/trang | — | cert modal | xml (mock) | Nút xem/xuất chứng từ |
| `/admin/kyc` | ✓ | — | 10/trang | — | image viewer | — | Xem CCCD trước/sau |
| `/admin/training-logs` | — | Status | — | — | — | — | Tổng giờ mentor 20h/tháng |
| `/admin/management-fees` | — | Tháng | — | — | mini-modal | — | Cấp 1/2/3 (bỏ F1/F2/F3), ngày nộp + chứng từ |
| `/admin/fee-config` | — | — | — | — | — | — | Mentor Bonus Pool 6.5% (T1/T2/Pool chung) |
| `/admin/config` | — | — | — | — | — | — | Acting Manager, Fast-Track, Soft Salary, Referral |
| `/admin/reconciliation` | — | Phương thức | — | — | image proof | — | Stats + cash deposits |

### 4.3 Shared components
`DashboardLayout` · `Sidebar` (có unread badge + tree context menu) · `Dialog` (Base UI) · `Tabs` · `Table` · `Badge` · `Button` · `Input` · `Label`

---

## 5. Seed data (dev)

```
Users: 61 CTV (1 GĐKD + 4 GĐV + 8 TP + 16 PP + 32 CTV) + 15 pure Member + 3 Agency + 1 Admin = 80
MemberWallet: 35 (20 CTV kiêm nhiệm + 15 Member thuần)
HKD: 3 (Nguyễn Văn Hùng / Trần Thị Mai / Phạm Hoàng Nam — đủ hợp đồng + bank + 2 cảnh báo)
Agencies: 3 (Bình Thạnh/Thủ Đức/Gò Vấp)
Transactions: 500 (channel ctv/agency/showroom) + 30 PENDING mới cho đối soát
CashDeposits: 3 PENDING (batch 4 giao dịch/phiếu)
PaymentProof: ~60% bank-transfer PENDING có ảnh mock
BreakawayLog: 3 (2 ACTIVE có L3 GĐKD 1%, 1 EXPIRED)
BreakawayFee: 15 records 3 tháng (L1/L2/L3 đủ)
ManagementFee: 20 records F1/F2/F3
Invoice: 20 (DRAFT/SENT/PAID/CANCELLED)
AutoTransferLog: 30 (mix SUCCESS/PENDING/FAILED)
TaxRecord: 15
TrainingLog: 10 (PENDING + VERIFIED)
KpiLog: 27 (9 CTV × 3 tháng)
DepositHistory: 40+
ReferralLog: 12
```

Reset lệnh: `rm -f prisma/dev.db && npx prisma db push --accept-data-loss && npm run seed`

---

## 6. Đánh giá hoàn thành BA feedback

| Batch | Tính năng | Trạng thái |
|---|---|---|
| **CTV** | 5-tab detail modal, filters, checkbox, bulk notify, create, toggle, reassign audit, export, training alert, tree context menu | ✅ |
| **Agencies** | Detail modal (finance/warnings/30d/restock), rank tier, filters, bulk notify, export | ✅ |
| **HKD** | Contract fields (2 HĐ), bank info, renew, update-bank, warnings, detail modal 3 tabs | ✅ |
| **Team vượt cấp** | Rename, thuật ngữ, thanh tiến trình 12m, alert sắp hết, L3 GĐKD 1%, payment detail mini-modal | ✅ |
| **Reconciliation** | Schema mở rộng + 30 PENDING + 3 cash deposits mock | ✅ |
| **Invoice** | Pagination, search, month filter, CSV export, đổi "Tier" → "Mốc phí" | ✅ |
| **Auto Transfer** | Chú thích bên chuyển, Retry + Retry-all cho FAILED | ✅ |
| **Thuế TNCN** | Cột "Ngày nộp", nút xem/xuất chứng từ, pagination, xuất XML (mock) | ✅ |
| **eKYC** | Search, pagination, modal xem ảnh CCCD front/back | ✅ |
| **Cấu hình** | Thêm Pool 6.5%, Acting Manager, Fast-Track, Soft Salary, Referral · đổi "Lương cứng" → "Thù lao DV duy trì" | ✅ |
| **Phí DV đào tạo** | Bỏ chú thích "thay thế F1/F2/F3", thêm section Mentor Bonus Pool + hệ số K | ✅ |
| **Log đào tạo** | Bảng tổng giờ mentor 20h/tháng với trạng thái ✅/⚠️/🔴 | ✅ |
| **Phí quản lý** | Đổi F1/F2/F3 → Cấp 1/2/3, bỏ C12.4, Alert info ngắn gọn, thêm ngày chi trả + chứng từ, icon log đào tạo | ✅ |
| **Ngôn ngữ** | Toàn bộ UI dấu tiếng Việt, dịch "Proof" → "Chứng từ" và tương tự | ✅ |
| **Member system** | 4 model mới (Tier/Wallet/Deposit/Referral), self-referral guard, multi-role badge | ✅ |

### Chưa làm (để backlog)
- Drag & drop trong cây tổ chức CTV (P3).
- Endpoint thật cho `Retry transfer`, `Xuất XML thuế chuẩn TCT`, `Mentor Pool computed real-time`. Hiện dùng mock client-side.
- Backend endpoint bulk-notify cho Agency hiện reuse `/admin/notifications/bulk` — OK.
- Màn hình `/admin/link-account` (gộp member ↔ ctv thủ công) — không cần vì multi-role single-table đã giải quyết.
- Màn hình `/admin/members` P0 bổ sung chi tiết (tab Lịch sử nạp/chi tiêu, điểm tích lũy) — có API `/admin/membership/wallets` sẵn, cần UI iteration tiếp.

---

## 7. Deploy & chạy local

```bash
# Backend
cd backend
rm -f prisma/dev.db
npx prisma db push --accept-data-loss
npm run seed
npm run dev                      # http://localhost:4000

# Frontend
cd frontend
npm install
npm run dev                       # http://localhost:3000

# Tài khoản test
admin@ccbmart.vn          / admin123      (Admin)
ctv1@ccbmart.vn           / ctv123        (GĐKD + Member SILVER)
gdv1@ccbmart.vn           / ctv123        (GĐV)
member1..15@ccbmart.vn    / member123     (Member thuần)
agency1..3@ccbmart.vn     / agency123     (Đại lý)
```

---

## 8. Phụ lục — Quy ước thuật ngữ V13.2.1

| Cũ (V12.x / C12.4) | Mới (V13.2.1) |
|---|---|
| Thoát ly | Team vượt cấp / Quản lý vượt cấp |
| Lương cứng | Thù lao DV duy trì |
| F1 / F2 / F3 | Cấp 1 / Cấp 2 / Cấp 3 dẫn dắt |
| User thoát ly | Người vượt cấp |
| F1 cũ / F2 cũ | Người dẫn dắt cấp 1 cũ / cấp 2 cũ |
| Phí thoát ly | Phí quản lý sau vượt cấp |
| Hoa hồng F1/F2/F3 | Thay bằng Phí DV đào tạo (M0-M5 cố định) + Pool 6.5% cố vấn |
| Tier (M0-M5) | Mốc phí |
| Proof | Chứng từ |
| Bao cao / Thong bao / Dang xuat / Xin chao | Báo cáo / Thông báo / Đăng xuất / Xin chào |

---

*Tài liệu này phản ánh trạng thái codebase tại worktree `compassionate-greider` ngày 2026-04-17, sau khi áp dụng chuỗi 11+ batch BA feedback. Các thay đổi có thể git log tra cứu.*
