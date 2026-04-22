# CCB Mart — Architecture C13.3.1

**Date:** 2026-04-17
**Scope:** Audit Log system + consolidation of C13.3 (Commission/Membership) and admin dashboard UX changes.

---

## 1. Tổng quan changes

| Track | Phạm vi |
|---|---|
| **C13.3 — Hoa hồng & Membership** | Referral cap 2 triệu/tháng; 4 hạng thẻ (GREEN/BASIC/STANDARD/VIP_GOLD); eKYC "3 duy nhất" (CCCD + deviceId + IP); reserve 70/30 (available/reserve); enforce 20h đào tạo/tháng cho mentor F1/F2/F3 |
| **Dashboard UI** | Giao diện admin chuyển sang tiếng Việt; bảng Lợi nhuận theo kênh; các card mục tiêu tháng; bảng tổng lương cứng |
| **C13.3.1 — Audit Log (bản này)** | Bảng AuditLog, middleware ghi log, API, UI xem log, cron xoá log > 90 ngày |

---

## 2. C13.3 recap (đã merge trước)

### 2.1. Referral & Membership
- **MembershipTier** có 4 hạng: `GREEN`, `BASIC`, `STANDARD`, `VIP_GOLD` (thay 3 hạng cũ).
- **Referral cap**: `monthlyReferralCap` = 2,000,000 VND/tháng/ví (trên cả `MembershipTier` và `MemberWallet`).
- **Reset cap**: cron `resetReferralCap.js` chạy 00:00 ngày 1 mỗi tháng, set `monthlyReferralEarned = 0`.
- **Wallet liquidity**: `MemberWallet.availableBalance` (70%) + `reserveBalance` (30%), tổng = `balance`.

### 2.2. eKYC "3 duy nhất"
- CCCD: `User.idNumber` — `@unique`.
- Device: `User.kycDeviceId`.
- IP: `User.kycIpAddress`.
- Khi submit eKYC, cả 3 fields được check unique để chống gian lận.

### 2.3. F1/F2/F3 Management fee
- Điều kiện chi phí quản lý: cấp trên có `>= 20h` đào tạo/tháng.
- Rates: F1 = 10%, F2 = 5%, F3 = 3% trên combo bán lẻ trực tiếp của cấp dưới.
- Chỉ F1/F2/F3 (không tính F4+).

---

## 3. Dashboard UI changes recap

- Toàn bộ admin sidebar và dashboard title sang tiếng Việt.
- Thêm bảng **"Lợi nhuận theo kênh"** (CTV / Agency / Showroom).
- Thêm 4 cards **"Mục tiêu tháng"** (doanh thu, đơn hàng, CTV active, thành viên mới).
- Thêm bảng **"Tổng hợp lương cứng"** chia theo cấp bậc.

---

## 4. Audit Log System (C13.3.1)

### 4.1. Data model

```prisma
model AuditLog {
  id          Int      @id @default(autoincrement())
  userId      Int?     // null = system action (CRON_JOB)
  action      String   // LOGIN, LOGOUT, LOGIN_FAILED, RANK_CHANGE, REASSIGN,
                       // DEPOSIT_CONFIRM, DEPOSIT_REJECT, CONFIG_CHANGE,
                       // DATA_EXPORT, CRON_JOB, CTV_ACTIVATE, CTV_DEACTIVATE, CTV_CREATE
  targetType  String?  // User, Transaction, CommissionConfig, MembershipTier, DepositHistory, …
  targetId    Int?
  oldValue    String?  // JSON (sanitized)
  newValue    String?  // JSON (sanitized)
  ipAddress   String?
  userAgent   String?
  status      String   @default("SUCCESS") // SUCCESS | FAILURE
  metadata    String?
  createdAt   DateTime @default(now())

  user        User?    @relation("AuditLogs", fields: [userId], references: [id])

  @@index([userId])
  @@index([action])
  @@index([createdAt])
  @@index([targetType, targetId])
  @@map("audit_logs")
}
```

### 4.2. Middleware — `backend/src/middleware/auditLog.js`

- **`auditLog(action, targetType)`** — middleware factory.
  - Gắn vào từng mutation route; wrap `res.json`/`res.send` để capture status.
  - Fire-and-forget: không block response (ghi async vào DB).
  - Tự strip sensitive fields: `passwordHash`, `password`, `token`, `bankAccount`, `bankAccountNo`, `idNumber`, `idFrontImage`, `idBackImage`, `kycIpAddress`, `otpCode`.
  - Truncate JSON payload ở 4000 ký tự để tránh bom DB.
- **`logAudit(data)`** — call trực tiếp cho cron jobs hoặc non-HTTP contexts.
- **`sanitize(obj)`** — helper dùng để strip sensitive fields trong any object.

### 4.3. Routes được log (mutations only)

| Route | Action | TargetType |
|---|---|---|
| `POST /api/auth/login` | `LOGIN` / `LOGIN_FAILED` | `User` |
| `POST /api/auth/logout` | `LOGOUT` | `User` |
| `POST /api/admin/ctv` | `CTV_CREATE` | `User` |
| `POST /api/admin/ctv/:id/reassign` | `REASSIGN` | `User` |
| `POST /api/admin/ctv/:id/rank` | `RANK_CHANGE` | `User` |
| `POST /api/admin/ctv/:id/toggle-active` | `CTV_TOGGLE_ACTIVE` | `User` |
| `PUT /api/admin/config/commission/:tier` | `CONFIG_CHANGE` | `CommissionConfig` |
| `POST /api/admin/config/commission` | `CONFIG_CHANGE` | `CommissionConfig` |
| `DELETE /api/admin/config/commission/:tier` | `CONFIG_CHANGE` | `CommissionConfig` |
| `PUT /api/admin/config/kpi/:rank` | `CONFIG_CHANGE` | `Kpi` |
| `PUT /api/admin/config/agency/:group` | `CONFIG_CHANGE` | `AgencyCommissionConfig` |
| `PUT /api/admin/config/cogs/:phase` | `CONFIG_CHANGE` | `CogsConfig` |
| `POST /api/admin/config/reset-default` | `CONFIG_CHANGE` | `Config` |
| `PUT /api/admin/fee-config/:tier` | `CONFIG_CHANGE` | `FeeConfig` |
| `PUT /api/admin/membership/tiers/:id` | `CONFIG_CHANGE` | `MembershipTier` |
| `POST /api/admin/membership/deposits/:id/confirm` | `DEPOSIT_CONFIRM` | `DepositHistory` |
| `POST /api/admin/membership/deposits/:id/reject` | `DEPOSIT_REJECT` | `DepositHistory` |
| Cron cleanup | `CRON_JOB` | `AuditLog` |

GET endpoints (read-only) **không** được log.

### 4.4. Routes — `backend/src/routes/auditLogs.js` (admin-only)

- `GET /api/admin/audit-logs`
  - Query params: `page`, `limit` (max 200), `userId`, `action`, `targetType`, `status`, `dateFrom`, `dateTo`, `search`.
  - Returns `{ logs, total, page, totalPages, limit }` với user relation joined.
- `GET /api/admin/audit-logs/actions`
  - Returns distinct action names (dùng cho dropdown filter).

### 4.5. Cron cleanup — `backend/src/jobs/auditLogCleanup.js`

- Schedule: `0 2 * * *` (02:00 mỗi ngày).
- `cleanupOldAuditLogs()` → DELETE WHERE `createdAt < now() - 90 days`.
- Sau khi xoá, tự ghi 1 log `CRON_JOB` với `metadata.deleted` = số records xoá.

### 4.6. Frontend — `/admin/audit-logs`

- Path: `frontend/src/app/admin/audit-logs/page.tsx`.
- Sidebar icon: `ScrollText` (lucide-react), label "Nhật ký hệ thống", group "Cấu hình & báo cáo".
- UI:
  - Bộ lọc: dropdown action, status (SUCCESS/FAILURE), date range, user ID, search text.
  - Table 7 cột: Thời gian, Người thực hiện (tên + ID hoặc "Hệ thống"), Hành động (label tiếng Việt), Đối tượng, Giá trị (truncate 80 ký tự), IP, Trạng thái (badge xanh/đỏ).
  - Click row → expand hiển thị JSON đầy đủ của `oldValue`, `newValue`, `metadata`, `userAgent`.
  - Pagination (mặc định 20/trang).
- `api.ts` client methods:
  - `api.adminAuditLogs(params)`
  - `api.adminAuditLogActions()`
  - `api.logout()`

---

## 5. Full updated project structure

### 5.1. Backend models (Prisma)

`User`, `CtvHierarchy`, `Agency`, `CommissionConfig`, `AgencyCommissionConfig`, `FeeConfig`, `BusinessHousehold`, `B2BContract`, `TrainingLog`, `Invoice`, `AutoTransferLog`, `AdminManualAction`, `TaxRecord`, `Product`, `Transaction`, `PaymentProof`, `CashDeposit`, `TransactionItem`, `Customer`, `KpiLog`, `RankHistory`, `PromotionEligibility`, `TeamBonus`, `InventoryWarning`, `ManagementFee`, `BreakawayLog`, `BreakawayFee`, `SyncLog`, `Notification`, `MembershipTier`, `MemberWallet`, `ReferralCommission`, `DepositHistory`, `ReferralLog`, **`AuditLog` (new)**.

### 5.2. Backend routes

```
/api/auth             — login, me, logout (new)
/api/ctv              — CTV dashboard, tree, customers, products
/api/ctv/transactions — CTV mutations
/api/agency           — Agency operations
/api/admin            — Admin (CTV, dashboard, config mutations — now audited)
/api/admin/audit-logs — NEW (list + distinct actions)
/api/admin/reconciliation
/api/admin/membership — Tiers, wallets, deposits (now audited)
/api/admin/config     — Commission/KPI/Agency/COGS (now audited)
/api/admin/import
/api/admin/fee-config — Fee tiers (now audited)
/api/admin/business-household
/api/admin/reports
/api/admin/failover   — Manual override (C12.3)
/api/training-logs
/api/notifications
/api (kyc, invoices, tax, monthlyReport)
```

### 5.3. Backend jobs (cron)

- `autoRankUpdate.js` — rank KPI cuối tháng.
- `checkUnsubmittedCash.js` — kiểm tra cash không nộp.
- `resetReferralCap.js` — reset `monthlyReferralEarned` ngày 1.
- `auditLogCleanup.js` **(new)** — xoá AuditLog > 90 ngày, 02:00 hàng ngày.

### 5.4. Frontend admin pages

```
/admin/dashboard
/admin/reconciliation
/admin/ctv
/admin/agencies
/admin/business-household
/admin/breakaway-logs
/admin/membership/wallets
/admin/membership/deposits
/admin/membership/tiers
/admin/membership/referrals
/admin/fee-config
/admin/training-logs
/admin/management-fees
/admin/salary-report
/admin/invoices
/admin/transfers
/admin/tax
/admin/kyc
/admin/import
/admin/config
/admin/reports
/admin/audit-logs          ← NEW
/admin/notifications
```

### 5.5. Sidebar groups (admin)

1. **Vận hành** — Dashboard, Đối soát.
2. **Nhân sự & đối tác** — CTV, Đại lý, HKD, Team vượt cấp.
3. **Thành viên** — Thành viên, Nạp tiền TV, Hạng thẻ.
4. **Đào tạo & phí** — Phí đào tạo, Log đào tạo, Phí quản lý, Báo cáo lương cứng.
5. **Tài chính & thuế** — Hóa đơn, Auto Transfer, Thuế TNCN.
6. **Cấu hình & báo cáo** — eKYC, Import, Cấu hình, Báo cáo, **Nhật ký hệ thống** (new), Thông báo.

---

## 6. Security & retention

- **Sanitization**: sensitive fields never persisted (strip before stringify).
- **Retention**: 90 ngày. Chính sách đủ cho điều tra sự cố ngắn hạn; dài hạn cần export ra data lake (future).
- **Access control**: endpoints `/api/admin/audit-logs/*` yêu cầu `authenticate` + `authorize('admin')`.
- **Fire-and-forget write**: không block response nếu DB chậm; lỗi log được `console.error` nhưng không fail request.

---

## 7. Testing checklist

- [ ] `prisma db push` áp dụng schema không lỗi.
- [ ] Seed tạo ≥20 AuditLog entries mẫu (LOGIN, LOGIN_FAILED, RANK_CHANGE, DEPOSIT_*, CONFIG_CHANGE, CRON_JOB).
- [ ] Login admin → thấy log LOGIN mới nhất trong `/admin/audit-logs`.
- [ ] Confirm/Reject member deposit → thấy log `DEPOSIT_CONFIRM`/`DEPOSIT_REJECT`.
- [ ] Change rank CTV → thấy log `RANK_CHANGE` với targetId = CTV id.
- [ ] Filter theo action/date range/user ID hoạt động đúng.
- [ ] Click row → expand full JSON.
- [ ] Sensitive fields (password, token, idNumber) → `[REDACTED]` trong newValue.
- [ ] Badge SUCCESS xanh, FAILURE đỏ.
- [ ] Pagination navigate đúng.
- [ ] Cron cleanup xoá records cũ (manual test: tạo record với createdAt > 90 ngày, chạy cleanup, verify deleted).
