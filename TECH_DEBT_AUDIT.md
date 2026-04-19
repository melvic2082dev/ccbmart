# CCB Mart — Tech Debt Audit Report

**Ngày:** 18/04/2026  
**Phiên bản:** C13.3.1  
**Đánh giá bởi:** Claude AI (theo yêu cầu Willy Minh)

---

## I. TÓM TẮT

Hệ thống CCB Mart hiện ở trạng thái **MVP/demo** — đủ để demo cho investor và test flow nghiệp vụ, nhưng chưa sẵn sàng cho production 1,000 users real-time. Có 3 nhóm rủi ro chính: (1) SQLite single-writer bottleneck, (2) dữ liệu nghiệp vụ hardcode trong source code, (3) không có automated tests.

**Mức độ nghiêm trọng tổng thể:** 🔴 CHƯA SẴN SÀNG PRODUCTION

---

## II. NỢ KỸ THUẬT CHI TIẾT

### 1. 🔴 DATABASE: SQLite — Single-Writer Lock

**File:** `backend/prisma/schema.prisma` (line 6: `provider = "sqlite"`)

**Vấn đề:** SQLite chỉ cho phép 1 write operation tại 1 thời điểm. Khi 1,000 users đồng thời tạo transaction, đặt đơn, nạp tiền — tất cả write queries xếp hàng tuần tự.

**Rủi ro với 1,000 users:**
- Latency tăng 10-50x khi có nhiều concurrent writes
- `SQLITE_BUSY` errors khi timeout (default 5s)
- Webhook Momo/ZaloPay bị timeout → mất payment confirmation
- Commission calculation (heavy queries) block toàn bộ DB

**Khắc phục:**
- **Ngắn hạn:** Chuyển sang PostgreSQL (chỉ đổi provider trong schema.prisma + connection string)
- **Dài hạn:** Read replicas + connection pooling (PgBouncer)
- **Ước lượng:** 2-4 giờ migration

---

### 2. 🔴 BẢO MẬT: JWT Secret Hardcode

**File:** `backend/src/middleware/auth.js` (line 3)
```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'ccb-mart-secret-key-2026';
```

**Vấn đề:** Secret key nằm trong source code, push lên GitHub public repo. Bất kỳ ai có repo đều có thể forge JWT token → truy cập admin panel.

**Rủi ro:** Toàn quyền truy cập hệ thống — tạo/sửa/xóa CTV, duyệt commission, xem dữ liệu tài chính.

**Lưu ý tích cực:** Code đã có warning log khi chạy production mà không set env var (line 5-6). Chỉ cần set `JWT_SECRET` env var là an toàn.

**Khắc phục:** Set `JWT_SECRET` qua environment variable, xóa fallback string.

---

### 3. 🔴 TESTING: 0 Test Files

**Scan kết quả:** Không tìm thấy file `.test.js`, `.spec.js`, hoặc config jest/mocha/vitest.

**Rủi ro:**
- Commission calculation sai → trả lương/hoa hồng thiếu/thừa → thiệt hại tài chính
- Breakaway logic (phức tạp nhất hệ thống) không được verify
- Refactoring bất kỳ service nào đều có thể break silently

**Ưu tiên test theo rủi ro tài chính:**
1. `commission.js` — personal commission, management fee, salary fund cap 5%
2. `breakaway.js` — 2-phase fees (L1=3%, L2=2%, L3=1%), parent reassignment
3. `trainingFee.js` — K-factor (min 0.7), fixed fee tiers M0-M5
4. `membership.js` — deposit 30% reserve, referral cap 2M/month
5. `soft-salary.js` — salary fund distribution

---

### 4. 🟡 COMMISSION RATES: Hardcode trong Source Code

**File:** `backend/src/services/commission.js` (lines 5-11)
```javascript
const COMMISSION_RATES = {
  CTV:  { selfSale: 0.20, fixedSalary: 0 },
  PP:   { selfSale: 0.20, fixedSalary: 5000000 },
  TP:   { selfSale: 0.30, fixedSalary: 10000000 },
  GDV:  { selfSale: 0.35, fixedSalary: 18000000 },
  GDKD: { selfSale: 0.38, fixedSalary: 30000000 },
};
```

**Vấn đề:** Mỗi lần thay đổi tỷ lệ hoa hồng (đã xảy ra nhiều lần V9→V13.3) phải sửa code + deploy lại. DB đã có bảng `CommissionConfig` nhưng chưa sync 2 chiều — code luôn dùng object hardcode.

**Khắc phục:** Đọc rates từ `CommissionConfig` table, dùng hardcode làm fallback. Admin UI đã có trang config.

---

### 5. 🟡 CORS: Chỉ Allow localhost

**File:** `backend/src/server.js` (lines 40-46)
```javascript
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.startsWith('http://localhost:')) return callback(null, true);
    callback(new Error('Not allowed'));
  },
}));
```

**Vấn đề:** Khi deploy production (domain thật), frontend sẽ bị CORS block hoàn toàn.

**Khắc phục:** Thêm whitelist production domains vào env var `ALLOWED_ORIGINS`.

---

### 6. 🟡 N+1 QUERIES trong Admin Routes

**File:** `backend/src/routes/admin.js`

Có 18+ chỗ gọi `prisma.*.findMany()` — nhiều chỗ query trong loop (ví dụ: lấy danh sách CTV → rồi loop query transaction từng người).

**Rủi ro với 1,000 users:** Dashboard admin load chậm 5-10s, có thể timeout.

**Khắc phục:** Dùng `include` relations hoặc raw SQL aggregation. Cache layer (`cache.js`) đã có sẵn — cần áp dụng rộng hơn.

---

### 7. 🟡 VALIDATION: Chưa Đủ Phủ

**File:** `backend/src/middleware/validate.js`

**Tích cực:** Đã có Joi validation middleware với 9 schemas (login, reassignCtv, changeRank, updateCommission, pagination, reportQuery, syncRequest, webhookOrder, memberRegister, memberDeposit).

**Thiếu:** Nhiều route trong `admin.js`, `ctv.js`, `agency.js` chưa dùng validate middleware. Request body không validated → risk injection/crash.

---

### 8. 🟡 RATE LIMITING: Config Quá Rộng

**File:** `backend/src/middleware/rateLimiter.js`

**Tích cực:** Đã có 3 tầng rate limit (global 1000/15min, login 5/15min, API 200/15min).

**Vấn đề:** `loginLimiter` đã define nhưng chưa apply vào route `/api/auth/login` (chỉ `globalLimiter` được mount ở server.js). Ai đó có thể brute-force password với 1000 requests/15 phút.

---

### 9. 🟢 PAYMENT WEBHOOKS: Thiếu Signature Verification

**File:** `backend/src/server.js` (lines 104-117, 128-130)

**Momo webhook:** Nhận IPN, parse `resultCode` và update deposit — nhưng không verify HMAC signature. Ai đó có thể POST fake IPN → confirm deposit giả.

**ZaloPay webhook:** Trả `return_code: 1` (success) cho mọi request mà không process gì — placeholder code.

---

### 10. 🟢 SEED DATA: Demo-Only

**File:** `backend/prisma/seed.js`

Password tất cả users demo: `admin123` (bcrypt hash). Seed data tạo CTV/Agency/Admin với dữ liệu giả.

**Không phải bug** — đây là demo data đúng mục đích. Chỉ cần đảm bảo không chạy seed trên production.

---

## III. ĐÁNH GIÁ RỦI RO: 1,000 USERS REAL-TIME

| Thành phần | Hiện tại | 1,000 users | Hành động |
|---|---|---|---|
| **Database** | SQLite (single-writer) | 🔴 CRASH — write queue timeout | Chuyển PostgreSQL |
| **Sessions** | JWT stateless | ✅ OK | — |
| **Rate Limit** | 1000 req/15min global | 🟡 Quá rộng cho 1,000 users | Tune per-endpoint |
| **Cache** | In-memory Map (no Redis) | 🟡 Memory leak risk >5000 entries | Deploy Redis |
| **Auto-refresh** | 60s polling | 🟡 1,000 users × 1 req/60s = 17 req/s | Chuyển WebSocket/SSE |
| **Commission calc** | Sync, heavy queries | 🔴 Timeout với nhiều CTV | Background job + cache |
| **File uploads** | Local disk `/uploads` | 🟡 Mất khi deploy lại | Chuyển S3/CloudStorage |
| **Push notifications** | Web Push API | ✅ OK | — |
| **Audit logs** | Fire-and-forget + 90-day cleanup | ✅ OK | — |

**Kết luận:** Với 1,000 users real-time, hệ thống sẽ **crash ở database layer** trong vài phút do SQLite write lock. Sau khi chuyển PostgreSQL, bottleneck tiếp theo là N+1 queries và commission calculation chưa được cache đúng.

---

## IV. DỮ LIỆU HARDCODE & MOCK

| Item | File | Loại | Mức độ |
|---|---|---|---|
| Commission rates (5 ranks) | `services/commission.js:5-11` | Hardcode | 🟡 Cần chuyển sang DB |
| Agency commission rates (A/B/C) | `services/commission.js:14-18` | Hardcode | 🟡 Cần chuyển sang DB |
| Training fee tiers M0-M5 | `services/trainingFee.js:25` | Hardcode (có fallback DB) | 🟢 Đã có fallback |
| JWT secret key | `middleware/auth.js:3` | Hardcode | 🔴 Bảo mật |
| Seed passwords `admin123` | `prisma/seed.js:55` | Demo data | 🟢 Đúng mục đích |
| Invoice PDF URL | `services/autoTransfer.js:106` | Placeholder | 🟡 Chưa implement |
| ZaloPay callback | `server.js:129` | Mock (luôn trả success) | 🟡 Chưa implement |
| XML thuế xuất | Frontend mock | Mock client-side | 🟡 Chưa implement |
| CORS origins | `server.js:42` | Hardcode localhost only | 🟡 Cần env var |

---

## V. ĐIỂM TÍCH CỰC (Đã làm tốt)

1. **Validation middleware** có sẵn với Joi — chỉ cần mở rộng phủ
2. **Rate limiting** đã setup 3 tầng — chỉ cần tune và apply đúng route
3. **Cache service** với Redis fallback in-memory — architecture đúng
4. **Audit log** fire-and-forget + auto cleanup 90 ngày — production-ready pattern
5. **Auth middleware** có warning khi thiếu env JWT_SECRET
6. **LRU Cache** cho commission results — đã có performance awareness
7. **Background jobs** (auto rank, cash check, referral reset, audit cleanup) — proper cron pattern
8. **Sync queue** cho KiotViet webhook — async processing đúng cách

---

## VI. ROADMAP KHẮC PHỤC

### Phase 1: Bảo mật (1-2 ngày)
- [ ] Set JWT_SECRET qua env var, xóa fallback hardcode
- [ ] Apply `loginLimiter` vào route `/api/auth/login`
- [ ] Verify Momo webhook HMAC signature
- [ ] Thêm ALLOWED_ORIGINS env var cho CORS

### Phase 2: Database Migration (2-4 ngày)
- [ ] Chuyển SQLite → PostgreSQL
- [ ] Setup connection pooling (PgBouncer)
- [ ] Test tất cả queries trên PostgreSQL
- [ ] Setup database backups

### Phase 3: Testing (3-5 ngày)
- [ ] Unit tests cho commission.js (personal, management fee, salary cap)
- [ ] Unit tests cho breakaway.js (2-phase, parent reassignment)
- [ ] Unit tests cho trainingFee.js (K-factor, fee tiers)
- [ ] Integration tests cho auth flow
- [ ] CI pipeline (GitHub Actions)

### Phase 4: Performance (2-3 ngày)
- [ ] Fix N+1 queries trong admin routes (dùng include/aggregation)
- [ ] Deploy Redis cho cache layer
- [ ] Chuyển commission rates từ hardcode → đọc DB (CommissionConfig)
- [ ] Chuyển polling 60s → WebSocket/SSE cho real-time

### Phase 5: Production-Ready (3-5 ngày)
- [ ] File uploads → S3/Cloud Storage
- [ ] Implement ZaloPay callback thật
- [ ] Invoice PDF generation thật
- [ ] XML thuế export chuẩn TCT
- [ ] Monitoring + alerting (health check đã có)
- [ ] Apply Joi validation cho tất cả routes còn thiếu

---

**Tổng thời gian ước lượng:** 11-19 ngày developer  
**Ưu tiên tuyệt đối:** Phase 1 (bảo mật) + Phase 2 (database) — phải xong trước khi có user thật.
