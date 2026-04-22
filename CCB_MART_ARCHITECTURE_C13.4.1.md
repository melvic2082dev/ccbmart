# CCB Mart — Architecture C13.4.1

**Version:** C13.4.1
**Date:** 19/04/2026
**Release tag:** v1.0.3
**Scope:** Cập nhật kiến trúc sau toàn bộ 8 rounds audit + fix (rc1 → rc6 → v1.0.2 → v1.0.3)

---

## 1. Tổng quan hệ thống

### 1.1. Tech stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn/ui, Recharts, Lucide React |
| **Backend** | Node.js 20, Express.js |
| **Database** | PostgreSQL 16 (via Prisma ORM) |
| **Cache** | Redis 7 (optional) + in-memory Map fallback |
| **Queue** | BullMQ (Redis) + synchronous fallback |
| **Auth** | JWT (HS256, env-based secret, 7d expiry) + DB isActive check mỗi request |
| **Payments** | Momo (HMAC-SHA256), ZaloPay (HMAC-SHA256) |
| **Storage** | Local disk / S3-ready abstraction |
| **Sync** | KiotViet webhook (HMAC-verified) + scheduled pull |
| **Container** | Docker, Docker Compose (dev + prod) |
| **Reverse proxy** | Nginx (SSE-aware, SSL template) |
| **CI/CD** | GitHub Actions (3 jobs: test + PostgreSQL service, build, lint) |

### 1.2. Mô hình kinh doanh

- **CTV 5 ranks**: CTV → PP (Phó Phòng) → TP (Trưởng Phòng) → GDV (Giám Đốc Vùng) → GDKD (Giám Đốc Kinh Doanh)
- **Hệ thống phân cấp**: direct / indirect2 / indirect3 (tối đa 3 tầng hoa hồng)
- **Agency (Đại lý)**: 2 groups, commission + bonus riêng
- **Hộ kinh doanh (HKD)**: hợp đồng dealer + training với CTV
- **Membership (Thành viên)**: 4 hạng thẻ GREEN / BASIC / STANDARD / VIP_GOLD, referral code, nạp tiền, referral cap 2M VND/tháng
- **eKYC**: xác minh danh tính với 3 ràng buộc duy nhất (CCCD, deviceId, IP)

---

## 2. Kiến trúc Backend

### 2.1. Config management

**File:** `backend/src/config/index.js`

- **Centralized config object** — toàn bộ settings qua một entry point duy nhất
- **Env-based secrets** — không hardcode; `dotenv.config()` load `.env` tự động
- **Fail-fast production guards**:
  - `JWT_SECRET` bắt buộc; kiểm tra danh sách weak defaults (`ccb-mart-change-this-secret`, `dev-only-change-in-prod`, `secret`) → `process.exit(1)` nếu vi phạm trong production
  - `DATABASE_URL` bắt buộc khi `NODE_ENV=production`
  - `ALLOWED_ORIGINS` bắt buộc khi `NODE_ENV=production`
- **Config domains**: `port`, `db.url`, `jwt` (`secret`, `expiresIn`), `cors.origins[]`, `redis` (`host`, `port`, `password`, `url`), `storage` (`type`, `s3.bucket`, `s3.region`), `payment.momo` (`partnerCode`, `accessKey`, `secretKey`), `payment.zalopay` (`appId`, `key1`, `key2`), `kiotviet` (`clientId`, `clientSecret`, `retailer`, `webhookSecret`)

### 2.2. Database

- **PostgreSQL 16** (migrated từ SQLite ở Phase 1)
- **Prisma ORM** — type-safe client, migrations, seed
- **Decimal precision** — tất cả money fields: `Decimal @db.Decimal(15, 0)` (VND integers) hoặc `Decimal @db.Decimal(5, 4)` (rates/percentages)
- **40 models** (xem 2.2.1)
- **Composite + single-column indexes** trên query paths phổ biến: `(ctvId, status)`, `(ctvId, createdAt)`, `(channel, createdAt)`, `(targetType, targetId)`, `(role, isActive)`, `(userId, isRead)`, `(status, expireAt)` …

#### 2.2.1. Danh sách 40 models

| Group | Models |
|---|---|
| **Core** | `User`, `CtvHierarchy`, `Agency` |
| **Config** | `CommissionConfig`, `AgencyCommissionConfig`, `KpiConfig`, `CogsConfig`, `FeeConfig` |
| **Sales** | `Transaction`, `TransactionItem`, `Product`, `Customer`, `PaymentProof`, `CashDeposit` |
| **KPI / Rank** | `KpiLog`, `RankHistory`, `PromotionEligibility` |
| **Training** | `TrainingLog`, `B2BContract`, `BusinessHousehold` |
| **Finance** | `Invoice`, `AutoTransferLog`, `TaxRecord`, `ManagementFee`, `TeamBonus` |
| **Breakaway** | `BreakawayLog`, `BreakawayFee` |
| **Membership** | `MembershipTier`, `MemberWallet`, `DepositHistory`, `ReferralCommission` |
| **Loyalty** | `LoyaltyPoint`, `ProfessionalTitle` |
| **Ops** | `SyncLog`, `ImportLog`, `InventoryWarning`, `Notification`, `PushSubscription` |
| **Security** | `AuditLog`, `AdminManualAction` |

### 2.3. Prisma singleton pattern

**File:** `backend/src/lib/prisma.js`

```js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
module.exports = prisma;
```

Một instance duy nhất được share toàn bộ backend — tránh connection pool exhaustion. Import: `require('../lib/prisma')`.

### 2.4. Services layer (22 services)

| Service | Mô tả |
|---|---|
| `commission.js` | Tính hoa hồng CTV (DB-driven rates, cache 5 min) |
| `breakaway.js` | Logic thoát ly 2-phase: tạm thời + chính thức; atomic `$transaction` |
| `managementFee.js` | Chi phí quản lý F1/F2/F3 (yêu cầu ≥ 20h đào tạo/tháng) |
| `trainingFee.js` | Phí đào tạo M0–M5 theo bảng tier, K-factor theo giờ; filter status `CONFIRMED` |
| `soft-salary.js` | Lương cứng mềm với hard cap 5% tổng quỹ lương; dedup theo ctvId |
| `membership.js` | Đăng ký thẻ, referral Serializable tx, deposit reserve 70/30, monthly cap |
| `cache.js` | Redis + in-memory Map fallback; `getCachedOrCompute(key, ttl, fn)` |
| `eventEmitter.js` | Node.js EventEmitter singleton cho SSE real-time |
| `logger.js` | Winston structured logger (JSON + file + colorized console) |
| `storage.js` | Abstraction local + S3-ready (`uploadFile`, `deleteFile`) |
| `payment.js` | Momo/ZaloPay payment creation (HMAC-SHA256) + signature verification; key guard |
| `kiotviet-sync.js` | Pull sản phẩm/đơn hàng từ KiotViet API |
| `kycService.js` | eKYC: xác minh AUTO, check 3 unique (CCCD, deviceId, IP), manual override |
| `taxEngine.js` | Thuế TNCN 10%; exempt threshold 8,333,333 VND/tháng (env configurable) |
| `autoTransfer.js` | Auto transfer hoa hồng với retry logic (max 3) |
| `transaction.js` | Tạo/xác nhận/từ chối giao dịch; atomic `updateMany` + count guard |
| `notification.js` | Tạo in-app notification |
| `pushNotification.js` | Web Push subscription + send |
| `promotion.js` | Đánh giá điều kiện thăng hạng |
| `team-bonus.js` | Thưởng team (cash + loyalty points) |
| `otpService.js` | OTP 6-digit cho xác nhận TrainingLog; 5 lần sai → block 30 phút |
| `treeValidator.js` | Kiểm tra vòng tròn trong cây phân cấp CTV |

### 2.5. Routes

#### 2.5.1. Admin sub-modules (split từ 691-line admin.js)

```
backend/src/routes/admin/
  index.js       — mount tất cả sub-modules + authenticate/authorize('admin') guard
  dashboard.js   — metrics, salary fund, KPI summary
  ctv.js         — CRUD CTV, reassign, rank change, toggle-active, bulk notifications (≤500)
  commission.js  — commission config CRUD, bulk recalc
  promotion.js   — promotion eligibility management
  team.js        — team bonus management
  fees.js        — fee config management
  sync.js        — KiotViet sync trigger
```

#### 2.5.2. Tất cả routes (server.js)

```
/api/auth                           — login, /me, logout
/api/ctv                            — CTV dashboard, tree, customers, products
/api/ctv/transactions               — CTV tạo/xem giao dịch
/api/agency                         — Agency dashboard, inventory, transactions
/api/admin                          — Admin (split 8 modules)
/api/admin/reconciliation           — Đối soát thanh toán
/api/members                        — Member portal
/api/admin/membership               — Tiers, wallets, deposits
/api/admin/config                   — CommissionConfig/KPI/Agency/COGS
/api/admin/import                   — Bulk import CTV/product/member
/api/admin/fee-config               — FeeConfig tiers
/api/admin/business-household       — HKD + B2B contracts
/api/training-logs                  — Training session logs + OTP
/api/notifications                  — In-app notifications (per user)
/api/admin/reports                  — Báo cáo tổng hợp
/api (kyc, invoices, tax, monthlyReport)  — role-scoped sub-paths
/api/admin/audit-logs               — Nhật ký hệ thống (admin)
/api/health                         — Basic + detailed health check
/api/notifications/subscribe        — Web Push subscribe
/api/notifications/unsubscribe      — Web Push unsubscribe
/api/payment/momo/create            — Tạo lệnh thanh toán Momo
/api/payment/zalopay/create         — Tạo lệnh thanh toán ZaloPay
/api/uploads/kyc                    — Upload KYC image (POST, authenticated)
/api/uploads/kyc/:filename          — Serve KYC image (GET, authenticated)
/webhook/momo/ipn                   — Momo IPN callback (HMAC-SHA256 verified)
/webhook/zalopay/callback           — ZaloPay callback (MAC verified)
/webhook/kiotviet/order             — KiotViet order webhook (HMAC-SHA256 verified)
/uploads/*                          — Static files (non-sensitive; /uploads/kyc blocked)
/api/events                         — SSE stream (GET, Bearer or ?token=)
```

### 2.6. Middleware stack

```
app.set('trust proxy', 1)            // Nginx/LB — real client IP cho rate limiter
app.use(helmet())                    // HTTP security headers (CSP, HSTS, X-Frame, XSS)
app.use(cors({...}))                 // Whitelist origins từ ALLOWED_ORIGINS env
app.use(express.json({ limit:'1mb' })) // Body parser
app.use('/uploads/kyc', 403 block)   // Chặn direct static access tới KYC files
app.use('/uploads', express.static)  // Non-sensitive uploads
app.use('/api/', globalLimiter)      // Global: 1000 req/15min/IP
→ loginLimiter                       // Login: 5 attempts/15min/IP
→ apiLimiter                         // Payment endpoints: 200 req/15min/IP
→ authenticate (auth.js)             // JWT Bearer verify + DB isActive check mỗi request
→ authorize(role) (auth.js)          // Role-based access control (admin/ctv/agency)
→ validate(schema) (validate.js)     // Joi schema validation (34 schemas)
→ auditLog(action, target) (auditLog.js) // Fire-and-forget mutation audit logging
app.use(errorHandler)                // Centralized error handler (sau tất cả routes)
```

**Middleware files:**

| File | Chức năng |
|---|---|
| `auth.js` | `authenticate`: JWT verify → DB `user.findUnique` isActive check → 401 nếu deactivated. `authorize(role)`: check role + isActive |
| `rateLimiter.js` | 3 tiers: `globalLimiter` (1000/15min), `loginLimiter` (5/15min), `apiLimiter` (200/15min) — `standardHeaders: true` |
| `validate.js` | Joi validation factory; 34 schemas; `abortEarly: false`, `stripUnknown: true` |
| `auditLog.js` | Fire-and-forget write; `SENSITIVE_FIELDS` strip → `[REDACTED]`; 4000-char truncate |
| `errorHandler.js` | `AppError` class + `asyncHandler` wrapper + Express centralized error handler |

### 2.7. Jobs & Queues

#### Cron jobs (5)

| Job | Schedule | Mô tả |
|---|---|---|
| `autoRankUpdate.js` | Cuối tháng | Đánh giá KPI và cập nhật rank CTV |
| `checkUnsubmittedCash.js` | Hàng ngày | Cảnh báo cash chưa nộp |
| `resetReferralCap.js` | 00:00 ngày 1 mỗi tháng | Reset `monthlyReferralEarned = 0` cho tất cả ví |
| `auditLogCleanup.js` | 02:00 hàng ngày | Xoá AuditLog > 90 ngày; ghi CRON_JOB log |
| `commissionCalculation.js` | On-demand queue | BullMQ worker; fallback synchronous nếu không có Redis |

#### Queues

| Queue | File | Mô tả |
|---|---|---|
| `commission-queue` | `jobs/commissionCalculation.js` | BullMQ worker xử lý commission recalc; `closeCommissionWorker()` khi shutdown |
| `sync-queue` | `queues/syncQueue.js` | BullMQ `sync-queue`, xử lý KiotViet sync jobs (webhook-order, manual-sync) |

### 2.8. Cache strategy

| Cache key pattern | TTL | Mô tả |
|---|---|---|
| `commission-rates:*` | 5 min | Commission rates từ DB (`CommissionConfig`) |
| `salary-fund:YYYY-MM` | 5 min | Tổng quỹ lương tháng |
| `admin:dashboard:*` | varies | Dashboard metrics tổng hợp |
| `kpi:*` | 60s | KPI summary per CTV |
| `ctv:dashboard:*` | 120s | CTV dashboard data |

**Strategy**: `getCachedOrCompute(key, ttl, fn)` — Redis → in-memory Map → compute + store. Auto-fallback nếu Redis unavailable.

### 2.9. Real-time SSE

**Endpoint**: `GET /api/events`

- **Auth**: Bearer header hoặc `?token=` query param (browser EventSource API không support custom headers)
- **isActive check**: DB lookup tại thời điểm handshake — account deactivated → 401
- **Keep-alive**: `: ping` comment mỗi 30s
- **Nginx config**: `proxy_buffering off`, `proxy_read_timeout 86400s`, `proxy_http_version 1.1`, `Connection ''`
- **Security note**: Token trong query string xuất hiện trong nginx access log — khuyến nghị redact `$uri` thay `$request` trong log format

**Events:**

| Event | Trigger |
|---|---|
| `transaction:new` | Giao dịch mới được xác nhận |
| `commission:calculated` | Commission recalc hoàn tất (từ BullMQ worker) |
| `config:changed` | Admin thay đổi config (CommissionConfig, KPI, …) |

**Frontend hook**: `frontend/src/hooks/useSSE.ts` — subscribe/unsubscribe, reconnect logic.

### 2.10. Graceful shutdown

```js
const gracefulShutdown = async (signal) => {
  server.close(async () => {
    await closeCommissionWorker();  // BullMQ worker drain
    await prisma.$disconnect();      // Prisma connection pool release
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000); // Force kill sau 10s
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

---

## 3. Kiến trúc Frontend

### 3.1. Framework & tooling

- **Next.js 14 App Router** — file-based routing, Server Components, `'use client'` islands
- **TypeScript** — strict mode
- **Tailwind CSS** + **Shadcn/ui** component library
- **Recharts** — biểu đồ doanh thu, channel breakdown
- **Lucide React** — icon set

### 3.2. Page structure

```
/admin/
  dashboard                — Metrics, channel revenue table, monthly targets, salary summary
  reconciliation           — Đối soát thanh toán
  ctv                      — Danh sách CTV, rank, hierarchy
  agencies                 — Danh sách đại lý
  business-household       — HKD + B2B contracts
  breakaway-logs           — Log thoát ly
  membership/wallets       — Member wallets
  membership/deposits      — Duyệt nạp tiền
  membership/tiers         — Cấu hình hạng thẻ
  fee-config               — Fee config tiers
  training-logs            — Log buổi đào tạo
  management-fees          — Chi phí quản lý
  salary-report            — Tổng hợp lương cứng theo rank
  invoices                 — Hóa đơn
  transfers                — Auto transfer logs
  tax                      — Thuế TNCN
  kyc                      — eKYC approval
  import                   — Bulk import CTV/product/member
  config                   — Commission/KPI/Agency/COGS config
  reports                  — Báo cáo tổng hợp
  audit-logs               — Nhật ký hệ thống
  notifications            — Thông báo

/ctv/
  dashboard, sales/create, transactions, cash, customers, products,
  kyc, invoices, management-fees, breakaway-fees, monthly-report

/agency/
  dashboard, inventory, transactions
```

### 3.3. Sidebar groups (admin — 6 groups, tiếng Việt)

1. **Vận hành** — Dashboard, Đối soát
2. **Nhân sự & đối tác** — CTV, Đại lý, HKD, Team vượt cấp
3. **Thành viên** — Thành viên, Nạp tiền TV, Hạng thẻ
4. **Đào tạo & phí** — Phí đào tạo, Log đào tạo, Phí quản lý, Báo cáo lương cứng
5. **Tài chính & thuế** — Hóa đơn, Auto Transfer, Thuế TNCN
6. **Cấu hình & báo cáo** — eKYC, Import, Cấu hình, Báo cáo, Thông báo

---

## 4. Security Hardening (sau 8 rounds audit)

### 4.1. Authentication — DB isActive check mỗi request

`authenticate` middleware (`backend/src/middleware/auth.js`) thực hiện **2 bước**:

1. `jwt.verify(token, config.jwt.secret)` — verify signature + expiry
2. `prisma.user.findUnique({ where: { id: decoded.id }, select: { isActive: true } })` — DB lookup real-time
   - `!dbUser` hoặc `dbUser.isActive === false` → **401** (không chỉ dựa vào JWT payload)

SSE endpoint `/api/events` cũng thực hiện isActive DB check tại handshake.

### 4.2. Password policy

- Minimum 8 ký tự (`Joi.string().min(8).max(100)`)
- `memberRegister` schema yêu cầu pattern `(?=.*[A-Z])(?=.*\d)` — ít nhất 1 chữ hoa + 1 số

### 4.3. Rate limiting (3 tiers + trust proxy)

| Limiter | Max | Window | Áp dụng |
|---|---|---|---|
| `globalLimiter` | 1000 req | 15 min / IP | Tất cả `/api/*` |
| `loginLimiter` | 5 attempts | 15 min / IP | `POST /api/auth/login` |
| `apiLimiter` | 200 req | 15 min / IP | Payment endpoints |

`app.set('trust proxy', 1)` — sử dụng real client IP từ X-Forwarded-For (Nginx).

### 4.4. Webhook HMAC verification

| Webhook | Algorithm | Header |
|---|---|---|
| **Momo IPN** `/webhook/momo/ipn` | HMAC-SHA256 | `signature` field trong body |
| **ZaloPay callback** `/webhook/zalopay/callback` | HMAC-SHA256 (key2) | `mac` field trong body |
| **KiotViet order** `/webhook/kiotviet/order` | HMAC-SHA256 | `x-kiotviet-signature` / `x-hub-signature-256` |

Reject với 401 / `return_code: -1` / 403 nếu signature sai hoặc secret chưa cấu hình.

### 4.5. Payment key guards

`services/payment.js`: Momo và ZaloPay đều kiểm tra `accessKey`/`secretKey` (hoặc `key1`/`key2`) trước khi gọi API:

```js
if (!accessKey || !secretKey) {
  console.warn('[Momo] Payment keys not configured — aborting payment creation');
  return { resultCode: -1, message: 'Momo payment not configured' };
}
```

Tránh silent failures khi env vars chưa set.

### 4.6. KYC files — authenticated endpoint

- `/uploads/kyc` path bị **block** cho static serving: `app.use('/uploads/kyc', (req, res) => res.status(403)...)`
- `POST /api/uploads/kyc` — upload, yêu cầu `authenticate`; file lưu với random filename (`Date.now() + randomBytes`)
- `GET /api/uploads/kyc/:filename` — serve file, yêu cầu `authenticate`; dùng `path.basename()` chống path traversal

### 4.7. OTP brute force protection

`services/otpService.js`:
- OTP 6-digit, TTL 10 phút
- Mỗi lần sai tăng `otpFailCount`
- **≥ 5 lần sai** → set `otpBlockedUntil = now + 30 phút`
- Mọi request tiếp theo trong thời gian block → throw error ngay lập tức

### 4.8. Import — random passwords + resilience

`routes/import.js` (CTV + member bulk import):
- Password sinh bằng `crypto.randomBytes(12).toString('hex')` — không dự đoán được
- Pre-hash tất cả passwords **ngoài** transaction (tránh timeout trên batch lớn)
- Per-row try-catch ngoài `$transaction` — PostgreSQL abort toàn bộ tx nếu có lỗi bên trong; per-row cho phép partial success + detailed error report

### 4.9. Bulk notification limit

`routes/admin/ctv.js` — `POST /notifications/bulk`:
- `userIds.length > 500` → **400** `TOO_MANY_RECIPIENTS`
- Tránh DoS từ một admin request gửi notification cho toàn bộ user base

### 4.10. HTTP security headers

**Helmet** — Content-Security-Policy, X-Frame-Options, HSTS, XSS protection, MIME sniffing protection.

**CORS**: whitelist `ALLOWED_ORIGINS`; `localhost:*` chỉ allowed khi không phải production.

### 4.11. Audit logging

- **13 action types**: LOGIN, LOGOUT, LOGIN_FAILED, RANK_CHANGE, REASSIGN, DEPOSIT_CONFIRM, DEPOSIT_REJECT, CONFIG_CHANGE, DATA_EXPORT, CRON_JOB, CTV_ACTIVATE, CTV_DEACTIVATE, CTV_CREATE
- **Sensitive field strip**: `passwordHash`, `password`, `token`, `bankAccount`, `bankAccountNo`, `idNumber`, `idFrontImage`, `idBackImage`, `kycIpAddress`, `otpCode` → `[REDACTED]`
- **Fire-and-forget** — không block response; lỗi log `console.error` nhưng không fail request
- **4000-char truncate** trên `oldValue`/`newValue` để tránh DB bloat
- **Retention**: 90 ngày (cleanup job 02:00 hàng ngày)

### 4.12. eKYC "3 duy nhất"

- `User.idNumber` — `@unique` (CCCD/CMND)
- `User.kycDeviceId` — device fingerprint
- `User.kycIpAddress` — IP tại thời điểm submit
- Cả 3 checked unique khi submit KYC để chống gian lận đa tài khoản

---

## 5. Financial Integrity (sau 8 rounds audit)

### 5.1. Status filter — chỉ đếm CONFIRMED

Tất cả queries tính doanh thu/hoa hồng đều filter `status: 'CONFIRMED'`:

- `transaction.js` — confirmTransaction, confirmCashDeposit
- `commission.js` — tính hoa hồng chỉ trên CONFIRMED transactions
- `trainingFee.js` — tính phí đào tạo chỉ trên CONFIRMED combo (v1.0.3 fix)
- `agency` queries — revenue dashboard chỉ CONFIRMED (v1.0.3 fix)
- `managementFee.js` — basis chỉ trên CONFIRMED direct sales
- `soft-salary.js` — salary fund chỉ trên CONFIRMED revenue

### 5.2. Decimal wrapping — toàn bộ reduce patterns

Tất cả `Array.reduce()` tính tổng tiền đều wrap `Number()` trước khi cộng:

```js
// Đúng (sau fix):
transactions.reduce((sum, t) => sum + Number(t.totalAmount), 0)

// Sai (trước fix — Prisma Decimal object + number = NaN):
transactions.reduce((sum, t) => sum + t.totalAmount, 0)
```

Áp dụng toàn bộ: commission, trainingFee, managementFee, agency dashboard, reports.

### 5.3. Atomic confirms — race condition prevention

**`confirmTransaction`** (`transaction.js`):
```js
const result = await prisma.transaction.updateMany({
  where: { id, status: 'PENDING' },  // chỉ update nếu vẫn PENDING
  data: { status: 'CONFIRMED', confirmedBy: adminId, confirmedAt: new Date() }
});
if (result.count === 0) throw new Error('Giao dich da duoc xu ly boi admin khac');
```

**`confirmCashDeposit`** tương tự: `updateMany` với `status: 'PENDING'` guard.

**`confirmDeposit`** (membership) (`services/membership.js`): atomic `$transaction` — update deposit + wallet balance trong cùng một tx.

### 5.4. Referral cap — Serializable transaction

`services/membership.js` — `processReferralCommission`:
- Fast-path check `preRemaining <= 0` tránh unnecessary tx overhead
- Bên trong `prisma.$transaction` với Serializable isolation: re-read `monthlyReferralEarned` tươi, tính `remaining`, clamp `actualCommission = Math.min(commission, remaining)`
- Chống race condition khi 2 deposit xử lý song song

### 5.5. Tax exempt threshold

`services/taxEngine.js`:
- `TAX_EXEMPT_THRESHOLD = parseInt(process.env.TAX_EXEMPT_THRESHOLD || '8333333')` VND/tháng
- Tương đương 100M VND/năm (ngưỡng PIT theo luật Việt Nam)
- Thu nhập < threshold → `exempt: true`, `taxAmount: 0`
- Thu nhập ≥ threshold → thuế TNCN 10%

### 5.6. Commission — DB-driven + cache

- Rates lưu trong `CommissionConfig` table (5 tiers: CTV/PP/TP/GDV/GDKD)
- `getCommissionRates()` cache key `commission-rates:all`, TTL 5 min
- Admin thay đổi rates → cache invalidate ngay lập tức, không cần deploy
- Fields per tier: `selfSalePct`, `directPct`, `indirect2Pct`, `indirect3Pct`, `fixedSalary`

### 5.7. Breakaway — atomic $transaction

`services/breakaway.js` — phase transition:
- Toàn bộ breakaway state update (BreakawayLog + User parentId + CtvHierarchy cleanup) thực hiện trong `prisma.$transaction`
- Tránh inconsistent state nếu server crash giữa chừng

### 5.8. Soft salary — dedup

`services/soft-salary.js`:
- Group by `ctvId` để dedup — tránh tính trùng lương cứng nếu CTV có nhiều transactions
- Cap 5% tổng quỹ lương → scale down proportionally nếu vượt

---

## 6. Testing

- **Jest** — `testEnvironment: 'node'`, `testTimeout: 10000`
- **9 test files**, ~123 test cases
- **Mock Prisma pattern** — `jest.mock('@prisma/client')` để isolate DB
- **Setup file** — `backend/tests/setup.js`

| Test file | Coverage |
|---|---|
| `services/commission.test.js` | Commission calculation, tiers, direct/indirect |
| `services/breakaway.test.js` | 2-phase breakaway, expiry, fee allocation |
| `services/managementFee.test.js` | F1/F2/F3 rates, 20h training requirement |
| `services/trainingFee.test.js` | M0–M5 tiers, K-factor, hours calculation |
| `services/soft-salary.test.js` | 5% cap enforcement, pool calculation |
| `services/membership.test.js` | Tier upgrade, referral, deposit reserve 70/30, referral cap |
| `middleware/auth.test.js` | JWT verify, role check, isActive, error cases |
| `middleware/validate.test.js` | Schema validation, strip unknown, error messages |
| `routes/auth.routes.test.js` | Login flow, /me, logout, rate limit |

---

## 7. DevOps & Deployment

### 7.1. Docker

**Dev**: `docker-compose.yml`
```yaml
services:
  postgres:  postgres:16-alpine, port 5432
  redis:     redis:7-alpine, port 6379, --appendonly yes
  api:       build ./backend/Dockerfile, port 4000
```

**Backend Dockerfile** (`backend/Dockerfile`):
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npx prisma generate
EXPOSE 4000
CMD ["node", "src/server.js"]
```

**Prod**: `docker-compose.prod.yml` — resource limits, restart policies, volume mounts cho logs.

### 7.2. Nginx

**File**: `nginx/nginx.conf`

- **SSE endpoint** `/api/events`: `proxy_buffering off`, `proxy_read_timeout 86400s`, `Connection ''`, HTTP/1.1
- **API**: proxy_pass → api:4000 với upgrade headers
- **Frontend**: proxy_pass → frontend:3000
- **SSL**: `nginx/nginx.ssl.conf.example` — template cho direct TLS (production thường dùng cloud LB)
- `X-Forwarded-Proto` forwarded từ LB để enforce HTTPS redirects ở app layer

### 7.3. CI/CD — GitHub Actions

**File**: `.github/workflows/ci.yml` — 3 jobs chạy song song:

| Job | Steps |
|---|---|
| **test** | Spin up PostgreSQL service, `npm ci`, `prisma generate`, `jest --ci` |
| **build** | `npm run build` cho Next.js frontend |
| **lint** | ESLint + TypeScript check |

### 7.4. Logging

- **winston** — structured logging
- **JSON transport** — production log format (JSON lines)
- **File transports** — `logs/error.log` (error only) + `logs/combined.log`
- **Console transport** — dev mode (colorized)

### 7.5. Health check

**`GET /api/health`** — basic: `{ status: 'ok', timestamp }`

**`GET /api/health/detailed`** — extended:
```json
{
  "status": "ok",
  "db": "ok",
  "redis": "ok",
  "uptime": 3600,
  "memory": { "heapUsed": "45 MB", "rss": "80 MB" }
}
```

### 7.6. Database backup

- **Script**: `scripts/backup.sh` — `pg_dump` compressed, timestamp filename
- **Retention**: 30 ngày (auto-delete old files)
- **Schedule**: Cron daily (production server)

### 7.7. Environment

- `.env.example` — template đầy đủ cho dev
- `.env.production.template` — template production với tất cả required vars

---

## 8. Changelog C13.4 → C13.4.1 (8 audit rounds)

Sau khi release C13.4, hệ thống trải qua 8 rounds kiểm tra + sửa lỗi trước khi lên v1.0.3:

| Round | Commit | Tóm tắt |
|---|---|---|
| **rc1** (20 issues) | `856e72a` | Missing routes, duplicate customer logic, mock data cleanup, schema updates |
| **CTO #1** (10 fixes) | `5ba92fc` | 10 critical blockers: route gaps, validation, DB query issues |
| **CTO #2** (10 fixes) | `2faf5c3` | KYC auth endpoint (không dùng static), commission pagination, tax exempt threshold 8.3M/month |
| **rc3** (42 issues) | `391d937` | Schema mismatch fixes, SQL table name corrections, security hardening toàn diện |
| **Senior audit** (15 fixes) | `7c7b8a1` | Financial integrity, race conditions (atomic confirms), security edge cases |
| **audit#5** (9 fixes) | `276692c` | HTTPS enforcement, atomic operations, revenue filter CONFIRMED-only, recursion depth guard |
| **audit#6** (9 fixes) | `208e577` | Atomic deposit confirm (`updateMany` guard), import resilience (per-row outside tx), salary dedup |
| **v1.0.2 + v1.0.3** | `b17b33e` + `bb657e5` | Final sweep: status CONFIRMED filters trong trainingFee + agency queries, Decimal `Number()` wrap, atomic breakaway `$transaction` |

**Tổng issues fixed**: ~115+ issues qua 8 rounds

**Phân loại:**
- **Security**: 25+ issues (KYC auth, OTP brute force, payment key guards, webhook HMAC, bulk limit)
- **Financial integrity**: 30+ issues (CONFIRMED filters, Decimal wrapping, atomic confirms, referral cap serializable)
- **Stability/Architecture**: 60+ issues (missing routes, schema mismatch, N+1 queries, import resilience, graceful shutdown)

---

## 9. Known Limitations (accepted)

| Limitation | Lý do chấp nhận |
|---|---|
| OTP gửi qua console log (không phải SMS thật) | Production sẽ integrate SMS/Zalo API — interface đã tách sẵn |
| SSE token lộ trong nginx access log | Đã documented; giải pháp: redact `$uri` trong nginx log_format |
| `autoRankUpdate` chạy cuối tháng chưa phải midnight chính xác | Edge case nhỏ, acceptable cho business cycle hiện tại |
| Import per-row (không atomic toàn bộ batch) | Đánh đổi: partial success tốt hơn all-or-nothing cho batch lớn; admin có thể retry từng row lỗi |
| Redis optional — in-memory cache mất khi restart | Production nên deploy Redis để cache survive restart |
| Prisma singleton không pool-aware trong horizontal scaling | Single instance hiện tại; scale-out cần connection pooler (PgBouncer) |
