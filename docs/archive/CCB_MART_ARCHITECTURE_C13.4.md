# CCB Mart — Architecture C13.4

**Version:** C13.4
**Date:** 19/04/2026
**Scope:** Tổng hợp kiến trúc sau 7 phases tái kiến trúc (Phase 0–6)

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
| **Auth** | JWT (HS256, env-based secret, 7d expiry) |
| **Payments** | Momo (HMAC-SHA256), ZaloPay (HMAC-SHA256) |
| **Storage** | Local disk / S3-ready abstraction |
| **Sync** | KiotViet webhook + scheduled pull |
| **Container** | Docker, Docker Compose |

### 1.2. Mô hình kinh doanh

- **CTV 5 ranks**: CTV → PP (Phó Phòng) → TP (Trưởng Phòng) → GDV (Giám Đốc Vùng) → GDKD (Giám Đốc Kinh Doanh)
- **Hệ thống phân cấp**: direct / indirect2 / indirect3 (tối đa 3 tầng hoa hồng)
- **Agency (Đại lý)**: 2 groups, commission + bonus riêng
- **Hộ kinh doanh (HKD)**: hợp đồng dealer + training với CTV
- **Membership (Thành viên)**: 4 hạng thẻ GREEN / BASIC / STANDARD / VIP_GOLD, referral code, nạp tiền, referral cap 2M VND/tháng
- **eKYC**: xác minh danh tính với 3 ràng buộc duy nhất (CCCD, deviceId, IP)

---

## 2. Kiến trúc Backend

### 2.1. Config management (Phase 0)

File: `backend/src/config/index.js`

- **Centralized config object** — toàn bộ settings qua một entry point
- **Env-based secrets** — không hardcode; JWT_SECRET fail-fast nếu thiếu
- **dotenv** — `dotenv.config()` load `.env` tự động
- **Production guards** — `DATABASE_URL` + `ALLOWED_ORIGINS` bắt buộc khi `NODE_ENV=production`
- **Config domains**: `port`, `db.url`, `jwt`, `cors.origins[]`, `redis`, `storage`, `payment.momo`, `payment.zalopay`, `kiotviet`

### 2.2. Database (Phase 1)

- **PostgreSQL 16** (migrate từ SQLite)
- **Prisma ORM** — type-safe client, migrations, seed
- **Decimal precision** — tất cả money fields dùng `Decimal @db.Decimal(15, 0)` (VND integers) hoặc `Decimal @db.Decimal(5, 4)` (rates/percentages)
- **40 models** (xem danh sách mục 2.2.1)
- **Composite indexes** trên các query paths phổ biến: `(ctvId, status)`, `(ctvId, createdAt)`, `(channel, createdAt)`, `(targetType, targetId)` …

#### 2.2.1. Danh sách models

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

### 2.3. Services layer

| Service | Mô tả |
|---|---|
| `commission.js` | Tính hoa hồng CTV (DB-driven rates, cache 5 min) |
| `breakaway.js` | Logic thoát ly 2-phase: giai đoạn tạm thời + chính thức |
| `managementFee.js` | Chi phí quản lý F1/F2/F3 (yêu cầu ≥ 20h đào tạo/tháng) |
| `trainingFee.js` | Phí đào tạo M0–M5 theo bảng tier, K-factor theo giờ |
| `soft-salary.js` | Lương cứng mềm với hard cap 5% tổng quỹ lương |
| `membership.js` | Đăng ký thẻ, referral, deposit reserve 70/30, cap hàng tháng |
| `cache.js` | Redis + in-memory fallback; `getCachedOrCompute(key, ttl, fn)` |
| `eventEmitter.js` | Node.js EventEmitter singleton cho SSE real-time |
| `storage.js` | Abstraction local + S3-ready (`uploadFile`, `deleteFile`) |
| `payment.js` | Momo (HMAC-SHA256) + ZaloPay (HMAC-SHA256) payment creation + verification |
| `kiotviet-sync.js` | Pull sản phẩm/đơn hàng từ KiotViet API |
| `kycService.js` | eKYC: xác minh AUTO, check 3 unique (CCCD, deviceId, IP), manual override |
| `taxEngine.js` | Tính thuế TNCN 10% trên thu nhập hoa hồng |
| `autoTransfer.js` | Auto transfer hoa hồng với retry logic (max 3) |
| `transaction.js` | Tạo/xác nhận/từ chối giao dịch |
| `notification.js` | Tạo in-app notification |
| `pushNotification.js` | Web Push subscription + send |
| `promotion.js` | Đánh giá điều kiện thăng hạng |
| `team-bonus.js` | Thưởng team (cash + loyalty points) |
| `otpService.js` | OTP cho xác nhận TrainingLog (throttle + block) |
| `treeValidator.js` | Kiểm tra vòng tròn trong cây phân cấp CTV |

### 2.4. Routes

#### 2.4.1. Admin sub-modules (Phase 4 split từ 691-line admin.js)

```
backend/src/routes/admin/
  index.js       — mount tất cả sub-modules + auth guard
  dashboard.js   — metrics, salary fund, KPI summary
  ctv.js         — CRUD CTV, reassign, rank change, toggle-active
  commission.js  — commission config CRUD, bulk recalc
  promotion.js   — promotion eligibility management
  team.js        — team bonus management
  fees.js        — fee config management
  sync.js        — KiotViet sync trigger
```

#### 2.4.2. Tất cả routes

```
/api/auth                    — login, /me, logout
/api/ctv                     — CTV dashboard, tree, customers, products
/api/ctv/transactions        — CTV tạo/xem giao dịch
/api/agency                  — Agency dashboard, inventory, transactions
/api/admin                   — Admin (split 8 modules)
/api/admin/reconciliation    — Đối soát thanh toán
/api/admin/membership        — Tiers, wallets, deposits (audited)
/api/admin/config            — CommissionConfig/KPI/Agency/COGS (audited)
/api/admin/import            — Bulk import CTV/product/member
/api/admin/fee-config        — FeeConfig tiers (audited)
/api/admin/business-household — HKD + B2B contracts
/api/admin/reports           — Báo cáo tổng hợp
/api/admin/audit-logs        — Nhật ký hệ thống (xem + filter)
/api/members                 — Member portal
/api/training-logs           — Training session logs + OTP
/api/notifications           — In-app notifications
/api                         — kyc, invoices, tax, monthlyReport (role-scoped paths)
/api/events                  — SSE stream (GET, token auth)
/api/health                  — Basic health check
/api/payment/momo/create     — Tạo lệnh thanh toán Momo
/api/payment/zalopay/create  — Tạo lệnh thanh toán ZaloPay
/webhook/momo/ipn            — Momo IPN callback (HMAC verified)
/webhook/zalopay/callback    — ZaloPay callback (MAC verified)
/webhook/kiotviet/order      — KiotViet order webhook
/uploads/*                   — Static file serving
```

### 2.5. Middleware stack

```
app.use(helmet())                    // HTTP security headers
app.use(cors({...}))                 // CORS với whitelist origins
app.use(express.json())              // Body parser
app.use('/api/', globalLimiter)      // Global: 1000 req/15min/IP
→ loginLimiter                       // Login: 5 attempts/15min/IP
→ apiLimiter                         // API mutants: 200 req/15min/IP
→ authenticate (auth.js)             // JWT Bearer token verify
→ authorize(role) (auth.js)          // Role-based access control
→ validate(schema) (validate.js)     // Joi schema validation
→ auditLog(action, target) (auditLog.js) // Mutation audit logging
app.use(errorHandler)                // Centralized error handler
```

**Middleware files:**
- `auth.js` — `authenticate` + `authorize(role)` — JWT verify, user attach
- `rateLimiter.js` — `globalLimiter` / `loginLimiter` / `apiLimiter` (3 tiers)
- `validate.js` — Joi validation factory + **33 schemas** (login, reassignCtv, changeRank, updateCommission, pagination, createTransaction, confirmTransaction, updateFeeConfig, updateKpi, updateAgencyCommission, updateCogs, resetPassword, webhookOrder, memberDeposit, memberTier, kycSubmit, kycVerify, auditLogQuery, contractTerminate, awardTitle, adminSync, monthQuery, …)
- `auditLog.js` — fire-and-forget write, sensitive field strip, 4000-char truncate
- `errorHandler.js` — `AppError` class + `asyncHandler` wrapper + centralized Express error handler

### 2.6. Jobs & Queues (Cron)

| Job | Schedule | Mô tả |
|---|---|---|
| `autoRankUpdate.js` | Cuối tháng | Đánh giá KPI và cập nhật rank CTV |
| `checkUnsubmittedCash.js` | Hàng ngày | Cảnh báo cash chưa nộp |
| `resetReferralCap.js` | 00:00 ngày 1 mỗi tháng | Reset `monthlyReferralEarned = 0` |
| `auditLogCleanup.js` | 02:00 hàng ngày | Xoá AuditLog > 90 ngày; ghi CRON_JOB log |
| `commissionCalculation.js` | On-demand queue | BullMQ worker; fallback synchronous nếu không có Redis |

**Queues:**
- `backend/src/queues/syncQueue.js` — BullMQ `sync-queue`, xử lý KiotViet sync jobs (webhook-order, manual-sync)

### 2.7. Cache strategy

| Cache key pattern | TTL | Mô tả |
|---|---|---|
| `commission-rates:*` | 5 min | Commission rates từ DB (`CommissionConfig`) |
| `salary-fund:YYYY-MM` | 5 min | Tổng quỹ lương tháng |
| `admin:dashboard:*` | varies | Dashboard metrics tổng hợp |
| `kpi:*` | 60s | KPI summary per CTV |
| `ctv:dashboard:*` | 120s | CTV dashboard data |

**Strategy**: `getCachedOrCompute(key, ttl, fn)` — check Redis → check in-memory Map → compute + store. Auto-fallback nếu Redis không available.

### 2.8. Real-time (SSE — Phase 5)

**Endpoint**: `GET /api/events`
- Auth: Bearer header hoặc `?token=` query param (EventSource compatible)
- Keep-alive: `: ping` mỗi 30s

**Events phát ra:**

| Event | Trigger |
|---|---|
| `transaction:new` | Giao dịch mới được xác nhận |
| `commission:calculated` | Commission recalc hoàn tất (từ BullMQ worker) |
| `config:changed` | Admin thay đổi config (CommissionConfig, KPI, …) |

**Frontend hook**: `frontend/src/hooks/useSSE.ts` — subscribe/unsubscribe, reconnect logic.

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
  import                   — Bulk import
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

## 4. Security

### 4.1. HTTP security (Phase 3)

- **Helmet** — Content-Security-Policy, X-Frame-Options, HSTS, XSS protection headers
- **CORS whitelist** — `ALLOWED_ORIGINS` env var; `localhost:*` allowed in dev only

### 4.2. Authentication & Authorization

- **JWT** — HS256, secret từ `JWT_SECRET` env var (fail-fast nếu thiếu)
- **Token expiry** — 7d default (`JWT_EXPIRES_IN`)
- **Role-based** — `authorize('admin')`, `authorize('ctv')`, `authorize('agency')` middleware

### 4.3. Rate limiting (3 tiers)

| Limiter | Max | Window |
|---|---|---|
| `globalLimiter` | 1000 req | 15 min / IP |
| `loginLimiter` | 5 attempts | 15 min / IP |
| `apiLimiter` | 200 req | 15 min / IP |

### 4.4. Input validation

- **Joi schemas** — 33 schemas trong `validate.js`
- **Validation middleware** — `validate(schema)` wrapper, `abortEarly: false`, `stripUnknown: true`
- Applied trên 11+ route files (Phase 3)

### 4.5. Webhook verification (Phase 3)

- **Momo IPN** — HMAC-SHA256 signature verify trước khi xử lý
- **ZaloPay callback** — MAC verify trước khi xử lý
- Reject với 401 / `return_code: -1` nếu signature sai

### 4.6. Audit logging (C13.3.1)

- **AuditLog model** — 40 fields, 4 indexes, retention 90 ngày
- **13 action types**: LOGIN, LOGOUT, LOGIN_FAILED, RANK_CHANGE, REASSIGN, DEPOSIT_CONFIRM, DEPOSIT_REJECT, CONFIG_CHANGE, DATA_EXPORT, CRON_JOB, CTV_ACTIVATE, CTV_DEACTIVATE, CTV_CREATE
- **Sensitive field strip**: `passwordHash`, `password`, `token`, `bankAccountNo`, `idNumber`, `idFrontImage`, `idBackImage`, `kycIpAddress`, `otpCode` → `[REDACTED]`
- **Fire-and-forget** — không block response; lỗi log `console.error` nhưng không fail request
- **GET endpoints không được log** — chỉ mutations

### 4.7. eKYC "3 duy nhất"

- `User.idNumber` — `@unique` (CCCD)
- `User.kycDeviceId` — device fingerprint
- `User.kycIpAddress` — IP tại thời điểm submit
- Cả 3 checked unique khi submit KYC để chống gian lận

---

## 5. Testing (Phase 2)

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
| `middleware/auth.test.js` | JWT verify, role check, error cases |
| `middleware/validate.test.js` | Schema validation, strip unknown, error messages |
| `routes/auth.routes.test.js` | Login flow, /me, logout, rate limit |

---

## 6. DevOps & Deployment (Phase 5–6)

### 6.1. Docker

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

**Prod**: `docker-compose.prod.yml` (Phase 6) — thêm resource limits, restart policies, volume mounts cho logs.

### 6.2. CI/CD (Phase 6) — GitHub Actions

**File**: `.github/workflows/ci.yml` — 3 jobs chạy song song:

| Job | Steps |
|---|---|
| **test** | Spin up PostgreSQL service, `npm ci`, `prisma generate`, `jest --ci` |
| **build** | `npm run build` cho Next.js frontend |
| **lint** | ESLint + TypeScript check |

### 6.3. Logging (Phase 6)

- **winston** — structured logging
- **JSON transport** — production log format (JSON lines)
- **File transports** — `logs/error.log` (error only) + `logs/combined.log`
- **Console transport** — dev mode (colorized)

### 6.4. Health check

**`GET /api/health`** — basic: `{ status: 'ok', timestamp }`

**`GET /api/health/detailed`** (Phase 6) — extended:
```json
{
  "status": "ok",
  "db": "ok",
  "redis": "ok",
  "uptime": 3600,
  "memory": { "heapUsed": "45 MB", "rss": "80 MB" }
}
```

### 6.5. Database backup (Phase 6)

- **Script**: `scripts/backup.sh` — `pg_dump` compressed, timestamp filename
- **Retention**: 30 ngày (auto-delete old files)
- **Schedule**: Cron daily (production server)

### 6.6. Environment

- `.env.example` — template đầy đủ cho dev
- `.env.production.template` (Phase 6) — template production với tất cả required vars

---

## 7. Nghiệp vụ chính

### 7.1. Commission (Hoa hồng CTV)

- **DB-driven rates** (Phase 4) — `CommissionConfig` table, 5 tiers (CTV/PP/TP/GDV/GDKD)
- **Cache 5 min** — `getCommissionRates()` cache key `commission-rates:all`
- **Fields per tier**: `selfSalePct`, `directPct`, `indirect2Pct`, `indirect3Pct`, `fixedSalary`
- **Combo bán lẻ** — doanh thu net = totalAmount − cogsAmount
- **Admin có thể thay đổi rates** mà không cần deploy; cache invalidate ngay sau khi update

### 7.2. Breakaway (Thoát ly — 2 phases)

- **Phase 1 — Tạm thời**: CTV đạt GDV/GDKD, chia fee với old parent trong N tháng
- **Phase 2 — Chính thức**: Sau hết grace period, full tách khỏi cây cũ
- **BreakawayLog** — track `oldParentId`, `newParentId`, `expireAt`, `status`
- **BreakawayFee** — phí chia theo level trong thời gian tạm thời

### 7.3. Management Fee (Phí quản lý)

- **Điều kiện**: Cấp trên phải có ≥ 20h đào tạo trong tháng
- **Rates**: F1 = 10%, F2 = 5%, F3 = 3% (chỉ 3 cấp)
- **Basis**: Combo bán lẻ trực tiếp của cấp dưới

### 7.4. Training Fee (Phí đào tạo)

- **Tiers M0–M5** — bảng phí theo số combo/tháng
- **K-factor** — hệ số điều chỉnh theo giờ đào tạo thực tế
- **FeeConfig model** — `minCombo`, `maxCombo`, `feeAmount`

### 7.5. Soft Salary (Lương cứng mềm)

- **Cap 5%** tổng quỹ lương toàn hệ thống
- Nếu tổng lương cứng > 5% doanh thu combo, scale down proportionally

### 7.6. Membership (Thành viên)

| Hạng | Đặc điểm |
|---|---|
| GREEN | Mặc định khi đăng ký |
| BASIC | Nạp tối thiểu, discount + referral pct cơ bản |
| STANDARD | Nạp trung bình, discount + referral pct cao hơn |
| VIP_GOLD | Nạp cao nhất, discount + referral pct tốt nhất |

- **Referral cap**: 2,000,000 VND/tháng/ví (`monthlyReferralCap`)
- **Wallet liquidity**: `availableBalance` (70%) + `reserveBalance` (30%) — tổng = `balance`
- **Referral code** — unique per wallet, hoa hồng giới thiệu theo `referralPct` của tier
- **Nạp tiền**: bank_transfer, cash, Momo, ZaloPay

### 7.7. eKYC

- **AUTO** method — tự động qua API (planned)
- **MANUAL** method — admin review + approve/reject với note
- **3 unique guards**: CCCD (`idNumber`), Device (`kycDeviceId`), IP (`kycIpAddress`)
- **Status flow**: PENDING → SUBMITTED → VERIFIED / REJECTED

### 7.8. Tax (Thuế TNCN)

- **10% PIT** (Personal Income Tax) trên thu nhập hoa hồng
- **TaxRecord** — `taxableIncome`, `taxAmount`, `month`, `status`
- **Báo cáo** xuất cho khai thuế theo tháng

---

## 8. Changelog C13.3.1 → C13.4

### 7 Phases tái kiến trúc

| Phase | Commit | Nội dung |
|---|---|---|
| **Phase 0** | `6dc655a` | Centralized config; secrets ra env vars; dotenv; `.env.example`; fail-fast validation |
| **Phase 1** | `5f81b09` | SQLite → PostgreSQL; Decimal money fields (`15,0` VND + `5,4` rates); Docker Compose postgres + redis service |
| **Phase 2** | `fe2270d` | Jest testing foundation; 9 test files; ~123 test cases; mock Prisma pattern; coverage: commission, breakaway, managementFee, trainingFee, soft-salary, membership, auth, validate, auth routes |
| **Phase 3** | `b91471c` | Helmet; `loginLimiter` applied; Momo HMAC verification; ZaloPay MAC verification; 33 Joi schemas; validation applied to 11 route files |
| **Phase 4** | `0a92b16` | Commission rates DB-driven (`getCommissionRates` + cache 5min); split `admin.js` 691 lines → 8 modules (dashboard, ctv, commission, promotion, team, fees, sync, index); `AppError` + `asyncHandler` + `errorHandler` |
| **Phase 5** | `4c044af` | N+1 query fixes (`Promise.all`, `include`, batch); cache mở rộng (salary fund 5min, KPI 60s, CTV 120s); SSE real-time (`eventEmitter` + `GET /api/events` + `useSSE.ts` hook); storage abstraction (local + S3 ready); commission job queue (BullMQ + fallback); connection pooling config |
| **Phase 6** | `b87c357` | GitHub Actions CI (3 jobs: test+PostgreSQL, build Next.js, lint); Docker (backend + frontend Dockerfiles, `docker-compose.prod.yml`); winston logger (JSON + file transport); health check endpoint (`/api/health/detailed` — DB/Redis ping, uptime, memory); backup script (`pg_dump`, 30-day retention); production `.env` template |
