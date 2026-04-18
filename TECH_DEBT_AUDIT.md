# CCB Mart — Tech Debt & Risk Audit

> Ngày đánh giá: 2026-04-18 | Phiên bản code: V13.3.1

---

## 1. Nợ Kỹ Thuật

### 🔴 Critical

#### C1 — 42 PrismaClient instances riêng lẻ
- **Vị trí:** Mỗi file trong `backend/src/` đều chạy `new PrismaClient()`
- **Vấn đề:** 42 connection pool riêng biệt, SQLite không hỗ trợ nhiều writer đồng thời. Khi load cao, các pool này cạnh tranh WAL lock → deadlock / SQLITE_BUSY.
- **Khắc phục:** Singleton PrismaClient tại `backend/src/lib/prisma.js`, export và import lại trong tất cả modules.

#### C2 — Webhook Momo/ZaloPay KHÔNG verify signature
- **Vị trí:** [`backend/src/server.js:104-130`](backend/src/server.js)
- **Vấn đề:** `verifyMomoSignature` và `verifyZaloPayCallback` đã được implement trong `payment.js` nhưng **không được gọi** trong webhook handler. Bất kỳ HTTP request nào tới `/webhook/momo/ipn` với `resultCode: 0` đều confirm deposit thành công.
- **Rủi ro:** Attacker có thể fake payment để nạp tiền tùy ý vào ví.
- **Khắc phục:** Thêm signature verification trước khi xử lý mọi webhook.

#### C3 — OTP trả về trong HTTP response (không gửi SMS/Zalo)
- **Vị trí:** [`backend/src/services/otpService.js:28-30`](backend/src/services/otpService.js)
- **Vấn đề:** OTP xác nhận buổi đào tạo được return về response cho frontend hiển thị — có nghĩa là trainer có thể xem và tự điền OTP, phá vỡ mục đích xác nhận của trainee.
- **Khắc phục:** Tích hợp Zalo OA API hoặc SMS gateway (Twilio, VIETTEL SMS) để gửi OTP tới số điện thoại trainee.

#### C4 — JWT secret hardcoded fallback
- **Vị trí:** [`backend/src/middleware/auth.js:3`](backend/src/middleware/auth.js)
- **Vấn đề:** `JWT_SECRET || 'ccb-mart-secret-key-2026'` — nếu biến môi trường không được set, server dùng secret cố định đã public trong repo. Check production chỉ ở `NODE_ENV === 'production'`, bỏ qua staging/testing.
- **Khắc phục:** Bỏ fallback hardcode, throw ngay khi `JWT_SECRET` chưa set bất kể môi trường.

---

### 🟠 High

#### H1 — N+1 queries trong calculateMonthlyManagementFees
- **Vị trí:** [`backend/src/services/managementFee.js:139-169`](backend/src/services/managementFee.js)
- **Vấn đề:** Loop qua từng CTV active → gọi `getPersonalComboRevenue()` (1 query) + `getUplineChain()` (3 queries: user → f1 → f2 → f3) + `hasEnoughTraining()` (1 query). Với 500 CTVs = **~2500 queries/lần chạy**.
- **Khắc phục:** Load tất cả CTV users + training minutes + transactions một lần, xử lý in-memory.

#### H2 — N+1 queries trong getSubtreeRevenue (Breakaway)
- **Vị trí:** [`backend/src/services/breakaway.js:163-193`](backend/src/services/breakaway.js)
- **Vấn đề:** BFS query từng level subtree với `prisma.user.findMany({ where: { parentId: pid } })` — O(depth × width) queries. Với cây sâu 5 level và 1000 nodes = hàng trăm queries.
- **Khắc phục:** Load toàn bộ CTV tree một lần, BFS in-memory.

#### H3 — N+1 queries trong autoRankUpdate
- **Vị trí:** [`backend/src/jobs/autoRankUpdate.js:80-145`](backend/src/jobs/autoRankUpdate.js)
- **Vấn đề:** Loop qua từng CTV, gọi `calculateMonthlyKpi()` → aggregate query, rồi `getDescendantCount()` → load ALL CTVs lại từ DB. Mỗi CTV = 2 queries → 1000 CTVs = 2000 queries.
- **Khắc phục:** Load tất cả transactions và CTV tree một lần trước vòng lặp.

#### H4 — KiotViet sync hoàn toàn là mock
- **Vị trí:** [`backend/src/services/kiotviet-sync.js:4-22`](backend/src/services/kiotviet-sync.js), [`syncQueue.js:82-101`](backend/src/queues/syncQueue.js)
- **Vấn đề:** `simulateSync()` và `executeBatchSync()` chỉ tạo SyncLog với số records ngẫu nhiên (`Math.random()`), không gọi KiotViet API thực. Data trong DB không đến từ KiotViet.
- **Khắc phục:** Implement KiotViet REST API client thực sự.

#### H5 — Không có test nào
- **Vị trí:** Toàn bộ `backend/`
- **Vấn đề:** Không có file `.test.js` hay `.spec.js` nào. Logic nghiệp vụ phức tạp (commission, breakaway, management fee, tax) hoàn toàn không được kiểm thử tự động.
- **Rủi ro:** Một thay đổi nhỏ trong `commission.js` hay `breakaway.js` có thể sai số tiền mà không ai biết cho đến khi thanh toán cuối tháng.
- **Khắc phục:** Unit test cho tất cả services tính tiền, integration test cho các flow payment.

#### H6 — handleBreakaway không atomic
- **Vị trí:** [`backend/src/services/breakaway.js:53-157`](backend/src/services/breakaway.js)
- **Vấn đề:** Chuỗi 5 DB writes (terminate contract → upsert businessHousehold → update parentId → create B2BContract → upsert breakawayLog) không nằm trong `prisma.$transaction()`. Nếu server crash giữa chừng, dữ liệu bị inconsistent.
- **Khắc phục:** Wrap trong `prisma.$transaction([...])`.

#### H7 — Password minimum length quá yếu
- **Vị trí:** [`backend/src/middleware/validate.js:29`](backend/src/middleware/validate.js)
- **Vấn đề:** `password: Joi.string().min(3)` — 3 ký tự là không đủ cho hệ thống tài chính.
- **Khắc phục:** Tối thiểu 8 ký tự, enforce uppercase + số.

---

### 🟡 Medium

#### M1 — Polling 60s thay vì WebSocket/SSE
- **Vị trí:** [`frontend/src/components/Sidebar.tsx:159`](frontend/src/components/Sidebar.tsx), [`ctv/dashboard/page.tsx:106`](frontend/src/app/ctv/dashboard/page.tsx), [`agency/dashboard/page.tsx:38`](frontend/src/app/agency/dashboard/page.tsx)
- **Vấn đề:** Mỗi tab mở đều poll `/api/notifications` + dashboard mỗi 60 giây. 200 users online = 200 requests/phút tới DB chỉ riêng notifications.
- **Khắc phục:** SSE endpoint cho notifications, chỉ poll dashboard khi tab active.

#### M2 — JWT 7 ngày, không có refresh token
- **Vị trí:** [`backend/src/routes/auth.js:51`](backend/src/routes/auth.js)
- **Vấn đề:** Token sống 7 ngày không có khả năng revoke (logout chỉ là client-side xoá localStorage). Nếu token bị đánh cắp, attacker có access trong 7 ngày.
- **Khắc phục:** Access token 15 phút + refresh token 7 ngày với blacklist trong Redis.

#### M3 — Rate limiter comment và giá trị không khớp
- **Vị trí:** [`backend/src/middleware/rateLimiter.js:3-4`](backend/src/middleware/rateLimiter.js)
- **Vấn đề:** Comment nói "100 requests per 15 minutes per IP" nhưng `max: 1000`. Comment sai có thể dẫn đến hiểu lầm khi review security.

#### M4 — Fixed costs hardcoded, không nhất quán giữa các routes
- **Vị trí:** [`backend/src/routes/admin.js:52`](backend/src/routes/admin.js) vs [`backend/src/routes/admin.js:343`](backend/src/routes/admin.js) vs [`backend/src/routes/reports.js:18`](backend/src/routes/reports.js)
- **Vấn đề:** `26000000 + 2000000 + 2000000` (admin.js dashboard) vs `30000000` (admin.js reports vs reports.js). Số liệu khác nhau, dashboard và báo cáo hiển thị lợi nhuận ròng khác nhau.
- **Khắc phục:** Centralize vào một config object hoặc DB record.

#### M5 — `autoRankUpdate` không filter CONFIRMED transactions
- **Vị trí:** [`backend/src/jobs/autoRankUpdate.js:42-52`](backend/src/jobs/autoRankUpdate.js)
- **Vấn đề:** `calculateMonthlyKpi()` aggregate tất cả transactions (bao gồm PENDING, REJECTED) khi tính combo count để xét rank. CTV có thể bị rank up nhờ transactions chưa confirm.
- **Khắc phục:** Thêm `status: 'CONFIRMED'` vào where clause.

#### M6 — KYC: reject user chia sẻ IP (NAT/VPN)
- **Vị trí:** [`backend/src/services/kycService.js:36-43`](backend/src/services/kycService.js)
- **Vấn đề:** Rule "1 IP = 1 user" sẽ chặn người dùng hợp lệ trong cùng mạng NAT (văn phòng, chung cư), đặc biệt phổ biến ở Việt Nam.
- **Khắc phục:** Dùng IP uniqueness như signal phụ, không phải hard block.

#### M7 — In-memory LRU cache không share giữa instances
- **Vị trí:** [`backend/src/services/commission.js:57`](backend/src/services/commission.js)
- **Vấn đề:** `commissionCache` là in-memory Map trong process. Mỗi Node.js instance có cache riêng, mất khi restart, không invalidate khi scale.

---

### 🔵 Low

#### L1 — PDF generation là placeholder
- **Vị trí:** [`backend/src/services/autoTransfer.js:106-108`](backend/src/services/autoTransfer.js)
- **Vấn đề:** `generateInvoicePDF()` chỉ return placeholder URL string. Hóa đơn PDF thực chưa được tạo.

#### L2 — Referral code dùng `Math.random()`
- **Vị trí:** [`backend/src/services/membership.js:14`](backend/src/services/membership.js), [`backend/src/routes/import.js:84`](backend/src/routes/import.js)
- **Vấn đề:** `Math.random()` không phải cryptographically secure. Dùng `crypto.randomBytes()` thay thế.

#### L3 — 12+ architecture docs ở root repo
- **Vị trí:** `CCB_MART_ARCHITECTURE*.md` (11 files)
- **Vấn đề:** Gây nhiễu khi tìm kiếm, có thể lộ thông tin thiết kế nghiệp vụ nhạy cảm nếu repo public.
- **Khắc phục:** Chuyển vào thư mục `docs/architecture/`.

#### L4 — `dev` script không dùng nodemon
- **Vị trí:** [`backend/package.json:7`](backend/package.json)
- **Vấn đề:** `"dev": "node src/server.js"` — không auto-restart khi code thay đổi, developer phải restart thủ công.

---

## 2. Rủi Ro Với 1000 Users

### 2.1 SQLite Bottleneck

SQLite là file-based database với **một writer tại một thời điểm** (WAL mode cho phép concurrent reads nhưng vẫn single writer). Với 1000 users:

| Tình huống | Hệ quả |
|---|---|
| 42 PrismaClient pools tranh WAL lock | `SQLITE_BUSY: database is locked` errors |
| Tháng cuối: tất cả CTV nhận lương | Hàng trăm UPDATE đồng thời → timeout |
| Cron jobs chạy tháng mới (00:05 ngày 1) | `autoRankUpdate` + `calculateMonthlyManagementFees` + `processMonthlyTax` cùng lúc → DB bị khóa hàng phút |
| Báo cáo admin fetch 6 tháng | 6 × `findMany(transactions)` + 6 × `calculateSalaryFundStatus` = ~15 queries nặng, block writers |

**Khuyến nghị:** Migrate sang PostgreSQL trước khi có >200 concurrent users.

### 2.2 Single Process, Không Clustering

- **Vấn đề:** `node src/server.js` — một process duy nhất, không PM2 cluster, không worker threads.
- **CPU:** Node.js là single-threaded. Khi `autoRankUpdate` chạy (loop 1000 CTVs), event loop bị block → tất cả API calls timeout.
- **Memory:** Commission cache (`LRUCache` + `memoryCache`) nằm trong process, không được giải phóng đúng cách khi full.
- **Khuyến nghị:** PM2 cluster mode với `max_memory_restart`, hoặc tách cron jobs ra worker process riêng.

### 2.3 Polling Thay WebSocket

- **Hiện tại:** 3 components poll mỗi 60 giây (Sidebar notifications, CTV dashboard, Agency dashboard).
- **1000 users online:** ~17 requests/giây chỉ từ background polls.
- **Cộng thêm:** Mỗi notification poll → query `prisma.notification.findMany({ where: { userId, isRead: false } })`.
- **Khuyến nghị:** WebSocket (Socket.io) hoặc SSE cho real-time notifications.

### 2.4 Rate Limiting Chỉ Theo IP

- **Vấn đề:** `globalLimiter` giới hạn 1000 req/15min theo IP. Không có per-user limit.
- **Nguy cơ:** 1 user authenticated có thể spam 1000 requests từ 1 IP (VPN rotation bypass hoàn toàn).
- **Khuyến nghị:** `apiLimiter` (200 req/15min) đã được define nhưng **không được mount** tại các authenticated routes. Mount vào tất cả `/api/ctv/*`, `/api/admin/*`, `/api/members/*`.

### 2.5 Commission Calculation Load All Data

- **Vị trí:** [`backend/src/services/commission.js:79-92`](backend/src/services/commission.js)
- **Vấn đề:** `calculateCtvCommission()` load **ALL CONFIRMED CTV transactions** trong tháng + **ALL active CTVs** vào memory mỗi lần gọi. Với 1000 CTVs và 50k transactions/tháng: ~50MB per calculation, cache chỉ giữ 1000 entries.
- **Cạm bẫy:** Khi cache miss (sau restart), 100 dashboard requests đồng thời sẽ trigger 100 lần load 50k transactions.
- **Khuyến nghị:** Cache warming sau restart, lazy load per-CTV thay vì load all.

### 2.6 Cron Jobs Chạy Trong Main Process

| Job | Schedule | Tác động |
|---|---|---|
| `autoRankUpdate` | 1st/month 00:05 | Loop N CTVs, N queries |
| `checkUnsubmittedCash` | Hàng ngày | Scan tất cả pending transactions |
| `resetReferralCap` | Tháng mới | UPDATE tất cả member wallets |
| `auditLogCleanup` | Hàng tuần | DELETE audit logs cũ |

Tất cả chạy trong event loop chính → spike CPU/DB vào thời điểm cố định → latency tăng đột biến cho toàn bộ users đang online.

---

## 3. Hardcode & Mockup Cần Thay Thế Trước Production

### 3.1 Business Constants Hardcoded Trong Code

| Constant | Giá trị | Vị trí | Vấn đề |
|---|---|---|---|
| `COMMISSION_RATES` | CTV 20%, PP 20%+5M, TP 30%+10M, GDV 35%+18M, GDKD 38%+30M | `commission.js:5-11` | Thay đổi rate → phải deploy lại |
| `AGENCY_COMMISSION` | A:8%, B:15%, C:20% | `commission.js:14-18` | Không thể config theo từng agency |
| `COMBO_PRICE` | 2,000,000 VND | `transaction.js:15`, `autoRankUpdate.js:52` | Giá combo thay đổi → sai rank calculation |
| `TAX_RATE` | 10% flat | `taxEngine.js:7`, `monthlyReport.js:118` | Luật thuế thay đổi → deploy lại |
| `MIN_TRAINING_MINUTES` | 20h/tháng | `managementFee.js:22` | Policy thay đổi → deploy lại |
| `FEE_TIERS` M0-M5 | 0/1.5M/3M/4.5M/6M/7.5M | `trainingFee.js:5-12` | Code có fallback từ DB nhưng hardcode vẫn tồn tại |
| Breakaway rates | 3%/2%/1% | `breakaway.js:244-282` | Không thể config |
| Team bonus rates | 0.5%/1%/1.5%/2% | `team-bonus.js:71-74` | Không thể config |
| Loyalty point rate | 1 point = 500 VND | `team-bonus.js:141` | Không thể config |
| Salary fund cap | 5% of CTV revenue | `soft-salary.js:29`, `commission.js:270` | Policy cố định |
| Promotion thresholds | 500M/2B/5B VND | `promotion.js:68,76,84` | Không thể config |
| Fixed overhead costs | 26M + 2M + 2M VND | `admin.js:52` | Không nhất quán với `reports.js:18` |
| xwise/e29/logistics/marketing | 5%/1%/3%/3% | `admin.js:47-50` | Business costs cứng trong code |

### 3.2 Mock/Placeholder Cần Replace Trước Live

| Vấn đề | Vị trí | Mô tả |
|---|---|---|
| **KiotViet sync là fake** | `kiotviet-sync.js:4-22`, `syncQueue.js:83` | `simulateSync()` tạo số ngẫu nhiên, không gọi API thực. Toàn bộ tính năng sync không hoạt động. |
| **OTP gửi qua API response** | `otpService.js:28-30`, `trainingLogs.js:116` | OTP được return trong response thay vì SMS/Zalo. Training confirmation flow vô nghĩa về bảo mật. |
| **PDF invoice là placeholder** | `autoTransfer.js:106-109` | `generateInvoicePDF()` chỉ return fake URL string. Không có PDF thực. |
| **MoMo dùng test endpoint** | `payment.js:17` | URL `test-payment.momo.vn` — sẽ cần switch sang production endpoint. |
| **ZaloPay dùng sandbox** | `payment.js:52` | URL `sb-openapi.zalopay.vn` — sandbox endpoint. |
| **MOMO_TEST partner code** | `payment.js:5` | Fallback `MOMO_TEST` không có credentials thực. |

### 3.3 Secrets / Credentials

| Secret | Fallback hiện tại | Nguy cơ |
|---|---|---|
| `JWT_SECRET` | `'ccb-mart-secret-key-2026'` (hardcoded, public trong repo) | Token forgery |
| `JWT_SECRET` trong docker-compose | `'ccb-mart-change-this-secret'` | Default production secret |
| `MOMO_ACCESS_KEY/SECRET_KEY` | Empty string `''` | Silent payment failures |
| `ZALOPAY_KEY1/KEY2` | Empty string `''` | Silent payment failures |

---

## 4. Roadmap 3 Phase

### Phase 1 — Ổn định & Bảo mật (Tháng 1-2) — **Trước khi có user thực**

**Mục tiêu:** Vá các lỗ hổng bảo mật và lỗi data integrity trước khi onboard user.

| # | Task | Ưu tiên |
|---|---|---|
| 1.1 | Singleton PrismaClient (`lib/prisma.js`) | CRITICAL |
| 1.2 | Verify Momo/ZaloPay webhook signature | CRITICAL |
| 1.3 | Tích hợp SMS/Zalo OA API để gửi OTP thực | CRITICAL |
| 1.4 | Bỏ JWT secret hardcode fallback | CRITICAL |
| 1.5 | Wrap `handleBreakaway()` trong `prisma.$transaction()` | HIGH |
| 1.6 | Filter `status: 'CONFIRMED'` trong KPI calculation | HIGH |
| 1.7 | Mount `apiLimiter` cho authenticated routes | HIGH |
| 1.8 | Password minimum 8 ký tự | HIGH |
| 1.9 | Fix comment `rateLimiter.js` (100 → 1000) | MEDIUM |
| 1.10 | Dùng `crypto.randomBytes()` cho referral code | LOW |

---

### Phase 2 — Performance & Scalability (Tháng 3-4) — **Trước 500 users**

**Mục tiêu:** Loại bỏ N+1 queries, migrate DB, chuẩn bị scale.

| # | Task | Impact |
|---|---|---|
| 2.1 | **Migrate từ SQLite sang PostgreSQL** | Unblock concurrent writes |
| 2.2 | Refactor `calculateMonthlyManagementFees()` — batch queries | -95% DB calls |
| 2.3 | Refactor `getSubtreeRevenue()` (BFS) — load tree once | -90% DB calls |
| 2.4 | Refactor `autoRankUpdate` — pre-load all data | -80% DB calls |
| 2.5 | Tách cron jobs ra separate worker process | Unblock main event loop |
| 2.6 | SSE endpoint cho notifications (replace polling) | -17 req/s |
| 2.7 | PM2 cluster mode (CPU × 4) | 4x throughput |
| 2.8 | Fix inconsistent `fixedCosts` (admin vs reports) | Data accuracy |
| 2.9 | Fix `calculateTeamBonus()` N+1 upserts | -50% DB calls |
| 2.10 | Viết unit tests cho commission, breakaway, managementFee, tax | Prevent regressions |

---

### Phase 3 — Production Readiness (Tháng 5-6) — **Trước 1000 users**

**Mục tiêu:** Implement các tính năng mock thành real, hoàn thiện observability.

| # | Task | Ghi chú |
|---|---|---|
| 3.1 | **Implement KiotViet API client thực** | Thay `simulateSync()` |
| 3.2 | PDF invoice generation (pdfkit/puppeteer) | Thay placeholder URL |
| 3.3 | Switch Momo/ZaloPay sang production endpoints | Sau UAT |
| 3.4 | Refresh token flow (access 15m / refresh 7d) | Security hardening |
| 3.5 | Move business constants vào DB config table | `CommissionConfig` đã có schema |
| 3.6 | Fix KYC IP uniqueness (soft block thay hard block) | UX improvement |
| 3.7 | Chuyển architecture docs vào `docs/architecture/` | Repo hygiene |
| 3.8 | Structured logging (Winston/Pino) thay console.log | Observability |
| 3.9 | Health check endpoint mở rộng (DB ping, Redis ping) | Monitoring |
| 3.10 | Integration tests cho payment flow, breakaway, monthly settlement | CI/CD gate |

---

## Tóm Tắt

| Mức độ | Số vấn đề |
|---|---|
| 🔴 Critical | 4 |
| 🟠 High | 7 |
| 🟡 Medium | 7 |
| 🔵 Low | 4 |

**3 vấn đề phải sửa ngay trước khi có user thực:**
1. Webhook payment không verify signature → risk fraud
2. OTP gửi về API response → training confirmation vô nghĩa
3. 42 PrismaClient instances → SQLITE_BUSY dưới load

**KiotViet sync và PDF invoice là mock hoàn toàn** — cần implement thực trước khi gọi hệ thống là production-ready.
