# CCB Mart — Lộ Trình Tái Kiến Trúc

**Ngày:** 18/04/2026  
**Phiên bản hiện tại:** C13.3.1  
**Mục tiêu:** Production-ready cho 1,000+ concurrent users  
**Nguyên tắc:** Mỗi phase hoàn thành là nền tảng cho phase tiếp theo. Không skip.

---

## TỔNG QUAN 7 PHASES

```
Phase 0: Environment & Config         ▓░░░░░░  (1 ngày)
Phase 1: Database Migration            ▓▓░░░░░  (2-3 ngày)
Phase 2: Testing Foundation            ▓▓▓░░░░  (3-4 ngày)
Phase 3: Security Hardening            ▓▓▓▓░░░  (2-3 ngày)
Phase 4: Business Logic Refactor       ▓▓▓▓▓░░  (3-4 ngày)
Phase 5: Performance & Scalability     ▓▓▓▓▓▓░  (3-4 ngày)
Phase 6: Production Deployment         ▓▓▓▓▓▓▓  (2-3 ngày)
                                       ─────────────────
                                       Tổng: 16-22 ngày
```

---

## PHASE 0: Environment & Config Foundation (1 ngày)

### Tại sao làm đầu tiên?
Mọi phase sau đều cần environment variables, config management, và .env files. Nếu không chuẩn hóa trước, mỗi phase phải xử lý config riêng lẻ, dễ conflict.

### Deliverables

**0.1 — Tạo `.env.example` chuẩn**
```env
# Server
NODE_ENV=development
PORT=4000

# Database (Phase 1 sẽ dùng)
DATABASE_URL="postgresql://user:pass@localhost:5432/ccbmart"

# Auth
JWT_SECRET=          # REQUIRED - generate: openssl rand -hex 64
JWT_EXPIRES_IN=24h

# CORS
ALLOWED_ORIGINS=http://localhost:3000

# Cache (Phase 5 sẽ dùng)
REDIS_HOST=
REDIS_PORT=6379
REDIS_PASSWORD=

# Payment
MOMO_PARTNER_CODE=
MOMO_ACCESS_KEY=
MOMO_SECRET_KEY=
ZALOPAY_APP_ID=
ZALOPAY_KEY1=
ZALOPAY_KEY2=

# KiotViet Sync
KIOTVIET_CLIENT_ID=
KIOTVIET_CLIENT_SECRET=
KIOTVIET_RETAILER=

# File Storage (Phase 5 sẽ dùng)
STORAGE_TYPE=local
S3_BUCKET=
S3_REGION=
```

**0.2 — Cài `dotenv` + config loader**

Tạo `backend/src/config/index.js`:
```javascript
require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000'),
  
  db: {
    url: process.env.DATABASE_URL,
  },
  
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  
  cors: {
    origins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
  },
  
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
};

// Validate required vars
const required = ['JWT_SECRET'];
if (config.env === 'production') {
  required.push('DATABASE_URL', 'ALLOWED_ORIGINS');
}
for (const key of required) {
  if (!process.env[key]) {
    console.error(`FATAL: Missing required env var: ${key}`);
    process.exit(1);
  }
}

module.exports = config;
```

**0.3 — Thêm `.env` vào `.gitignore`**

Đảm bảo secrets không bao giờ lên GitHub.

**0.4 — Refactor tất cả hardcode config**

Thay thế:
- `middleware/auth.js`: `JWT_SECRET || 'ccb-mart-secret-key-2026'` → `config.jwt.secret`
- `server.js`: CORS origin logic → `config.cors.origins`
- `server.js`: PORT → `config.port`
- `services/cache.js`: Redis config → `config.redis`

### Kết quả Phase 0
✅ Tất cả config tập trung 1 file  
✅ Secrets ra khỏi source code  
✅ `.env.example` làm template cho mọi môi trường  
✅ Phase 1-6 chỉ cần thêm config vào `config/index.js`, không sửa nhiều file  

---

## PHASE 1: Database Migration — SQLite → PostgreSQL (2-3 ngày)

### Tại sao làm thứ 2?
SQLite là bottleneck nghiêm trọng nhất. Mọi optimization (cache, query tuning, connection pooling) đều vô nghĩa trên SQLite vì single-writer lock. Phase 2 (testing) cần DB ổn định để viết integration tests.

### Deliverables

**1.1 — Setup PostgreSQL**
- Local: Docker Compose (đã có `docker-compose.yml`)
- Production: Managed PostgreSQL (Supabase / Neon / RDS)

```yaml
# docker-compose.yml - thêm service
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ccbmart
      POSTGRES_USER: ccbmart
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
```

**1.2 — Đổi Prisma provider**

```prisma
datasource db {
  provider = "postgresql"    // was "sqlite"
  url      = env("DATABASE_URL")
}
```

**1.3 — Sửa schema incompatibilities**

SQLite → PostgreSQL thường gặp:
- `@default(autoincrement())` → OK, Prisma handles
- `DateTime` fields → PostgreSQL dùng `timestamptz`, cần review
- `String` không có max length → Thêm `@db.VarChar(255)` cho fields quan trọng
- `Float` cho tiền → Chuyển `Decimal` cho chính xác (commission, salary, amounts)

Quan trọng nhất — chuyển **tất cả fields tiền** sang `Decimal`:
```prisma
model Transaction {
  totalAmount    Decimal  @db.Decimal(15, 0)  // VND không có phần thập phân
  cogsAmount     Decimal  @db.Decimal(15, 0)
  // ...
}

model CommissionConfig {
  selfSalePct    Decimal  @db.Decimal(5, 4)   // 0.2000 = 20%
  // ...
}
```

**1.4 — Fresh migration**
```bash
npx prisma migrate reset
npx prisma migrate dev --name init_postgresql
npx prisma db seed
```

**1.5 — Smoke test tất cả routes**
- Login/register
- CTV tạo đơn
- Admin dashboard load
- Commission calculation
- Membership deposit

**1.6 — Data migration script (nếu có data thật)**

Nếu đã có data production trên SQLite, viết script chuyển:
```javascript
// scripts/migrate-sqlite-to-pg.js
// Read from SQLite → Transform → Insert to PostgreSQL
```

### Kết quả Phase 1
✅ PostgreSQL chạy local + production  
✅ Schema 35 models migrate thành công  
✅ Decimal precision cho tất cả fields tiền  
✅ Seed data hoạt động trên PostgreSQL  
✅ Concurrent writes không còn bị lock  

---

## PHASE 2: Testing Foundation (3-4 ngày)

### Tại sao làm thứ 3?
Phase 3 (security) và Phase 4 (refactor business logic) sẽ thay đổi code quan trọng. Không có tests = mỗi thay đổi đều có thể break commission/breakaway mà không ai biết. Tests phải có TRƯỚC khi refactor.

### Deliverables

**2.1 — Setup Jest + test utilities**

```bash
npm install -D jest @types/jest supertest
```

```javascript
// backend/jest.config.js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  setupFilesAfterSetup: ['./tests/setup.js'],
  coveragePathIgnorePatterns: ['/node_modules/', '/prisma/'],
};
```

```javascript
// backend/tests/setup.js
// Dùng test database riêng
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL 
  || 'postgresql://ccbmart:test@localhost:5432/ccbmart_test';
```

**2.2 — Prisma test helper**

```javascript
// backend/tests/helpers/prisma.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDatabase() {
  // Xóa theo thứ tự dependency (child trước parent)
  const tables = [
    'AuditLog', 'BreakawayFee', 'BreakawayLog', 'ManagementFee',
    'ReferralCommission', 'DepositHistory', 'MemberWallet',
    'Transaction', 'KpiLog', 'RankHistory', 'TrainingLog',
    'Invoice', 'TaxRecord', 'TeamBonus', 'LoyaltyPoint',
    'User', 'Agency', 'Product', 'Customer',
  ];
  for (const table of tables) {
    await prisma[table[0].toLowerCase() + table.slice(1)].deleteMany();
  }
}

module.exports = { prisma, cleanDatabase };
```

**2.3 — Unit tests cho business logic (ƯU TIÊN CAO NHẤT)**

Thứ tự theo rủi ro tài chính:

```
tests/
├── __tests__/
│   ├── services/
│   │   ├── commission.test.js        ★★★ (20 test cases)
│   │   ├── breakaway.test.js         ★★★ (15 test cases)
│   │   ├── managementFee.test.js     ★★☆ (10 test cases)
│   │   ├── trainingFee.test.js       ★★☆ (8 test cases)
│   │   ├── soft-salary.test.js       ★★☆ (8 test cases)
│   │   ├── membership.test.js        ★☆☆ (10 test cases)
│   │   └── taxEngine.test.js         ★☆☆ (5 test cases)
│   ├── middleware/
│   │   ├── auth.test.js              (5 test cases)
│   │   └── validate.test.js          (5 test cases)
│   └── routes/
│       ├── auth.routes.test.js       (8 test cases)
│       └── admin.routes.test.js      (10 test cases)
```

**Ví dụ test quan trọng cho commission.js:**
```javascript
describe('calculateCtvCommission', () => {
  // Personal commission by rank
  test('CTV rank gets 20% personal commission', async () => { ... });
  test('GDKD rank gets 38% personal commission', async () => { ... });
  
  // Salary fund cap
  test('Total salary fund capped at 5% of CTV revenue', async () => { ... });
  test('Soft salary distributes proportionally when over cap', async () => { ... });
  
  // Management fees
  test('F1 management fee = 10% of direct report combo', async () => { ... });
  test('F2 management fee = 5%', async () => { ... });
  test('F3 management fee = 3%', async () => { ... });
  test('Management fee requires 20h training/month', async () => { ... });
  
  // Edge cases
  test('Zero revenue returns zero commission', async () => { ... });
  test('New CTV with no transactions', async () => { ... });
});
```

**Ví dụ test quan trọng cho breakaway.js:**
```javascript
describe('handleBreakaway', () => {
  test('GDKD breakaway moves parentId to grandParent', async () => { ... });
  test('Phase 1: months 1-12 charge L1=3% L2=2% L3=1%', async () => { ... });
  test('Phase 2: after 12 months revert to standard rates', async () => { ... });
  test('F1/F2 exclusion: old reports skip breakaway fee', async () => { ... });
  test('findTopGdkdUser traverses tree correctly', async () => { ... });
});
```

**2.4 — npm scripts**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --forceExit"
  }
}
```

### Kết quả Phase 2
✅ Jest configured với test database riêng  
✅ ~90 test cases phủ toàn bộ business logic tài chính  
✅ Mỗi commit sau này chạy `npm test` để catch regression  
✅ An tâm refactor ở Phase 3-4 vì có safety net  

---

## PHASE 3: Security Hardening (2-3 ngày)

### Tại sao làm thứ 4?
Phase 0 đã di chuyển secrets ra env vars. Bây giờ cần hardening toàn diện. Phải làm trước Phase 4 (refactor) vì refactor có thể vô tình mở thêm lỗ hổng nếu security chưa chặt.

### Deliverables

**3.1 — Helmet + Security Headers**
```bash
npm install helmet
```
```javascript
// server.js
const helmet = require('helmet');
app.use(helmet());
```

**3.2 — Apply rate limiters đúng route**

Hiện tại `loginLimiter` đã define nhưng chưa dùng:
```javascript
// routes/auth.js
const { loginLimiter } = require('../middleware/rateLimiter');
router.post('/login', loginLimiter, validate(schemas.login), async (req, res) => { ... });
```

Thêm rate limit cho sensitive routes:
```javascript
// Tạo thêm limiters
const passwordResetLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 3 });
const paymentLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
```

**3.3 — Momo Webhook HMAC Verification**
```javascript
// server.js - Momo IPN handler
app.post('/webhook/momo/ipn', async (req, res) => {
  const { signature, ...data } = req.body;
  const expectedSig = crypto.createHmac('sha256', config.momo.secretKey)
    .update(/* Momo signature string */)
    .digest('hex');
  
  if (signature !== expectedSig) {
    console.warn('[Momo] Invalid signature');
    return res.status(403).end();
  }
  // ... process payment
});
```

**3.4 — Input validation mở rộng**

Thêm Joi schemas cho tất cả routes chưa có:

| Route file | Endpoints thiếu validate | Priority |
|---|---|---|
| `admin.js` (691 lines) | ~15 endpoints | ★★★ |
| `ctv.js` | ~8 endpoints | ★★☆ |
| `agency.js` | ~5 endpoints | ★★☆ |
| `members.js` | ~4 endpoints | ★☆☆ |
| `reconciliation.js` | ~3 endpoints | ★☆☆ |

**3.5 — SQL Injection protection**

Prisma ORM đã handle phần lớn, nhưng kiểm tra:
- Raw queries (`prisma.$queryRaw`) → dùng tagged template literals
- Bất kỳ string concatenation nào trong query

**3.6 — Audit log cho security events**
```javascript
// Log tất cả: login thất bại, đổi mật khẩu, đổi role, xóa user
// Middleware auditLog.js đã có → chỉ cần đảm bảo phủ hết sensitive routes
```

### Kết quả Phase 3
✅ Helmet security headers  
✅ Rate limit đúng mọi sensitive endpoint  
✅ Payment webhook verified  
✅ Input validation phủ 100% routes  
✅ Chạy lại tests Phase 2 → all green  

---

## PHASE 4: Business Logic Refactor (3-4 ngày)

### Tại sao làm thứ 5?
DB đã stable (Phase 1), tests bảo vệ regression (Phase 2), security đã chặt (Phase 3). Giờ an toàn để refactor core business logic mà không sợ break hoặc tạo lỗ hổng.

### Deliverables

**4.1 — Commission rates: Hardcode → Database-driven**

Hiện tại `COMMISSION_RATES` object trong `commission.js` là source of truth. DB có `CommissionConfig` table nhưng không được dùng.

```javascript
// TRƯỚC (hardcode)
const COMMISSION_RATES = {
  CTV:  { selfSale: 0.20, fixedSalary: 0 },
  // ...
};

// SAU (DB-driven với cache)
const { getCachedOrCompute } = require('./cache');

async function getCommissionRates() {
  return getCachedOrCompute('commission:rates', 300, async () => {
    const dbRates = await prisma.commissionConfig.findMany();
    if (dbRates.length > 0) {
      return Object.fromEntries(
        dbRates.map(r => [r.rank, {
          selfSale: Number(r.selfSalePct),
          direct: Number(r.directPct),
          indirect2: Number(r.indirect2Pct),
          indirect3: Number(r.indirect3Pct),
          fixedSalary: Number(r.fixedSalary),
        }])
      );
    }
    // Fallback cho lần đầu (seed chưa có config)
    return DEFAULT_COMMISSION_RATES;
  });
}
```

Admin thay đổi rates → invalidate cache → hiệu lực ngay, không cần deploy lại.

**4.2 — Agency commission: Tương tự DB-driven**

`AGENCY_COMMISSION` (A/B/C groups) → `AgencyCommissionConfig` table.

**4.3 — Training fee tiers: Đã có fallback DB → hoàn thiện**

`trainingFee.js` đã có pattern "DB first, hardcode fallback". Các service khác nên follow cùng pattern.

**4.4 — Tách `admin.js` (691 lines) thành modules**

File quá lớn, khó maintain:

```
routes/
├── admin/
│   ├── index.js          (router aggregator)
│   ├── dashboard.js      (KPI, charts, P&L)
│   ├── ctv.js            (CTV management)
│   ├── commission.js     (commission config, calculation)
│   ├── promotion.js      (rank promotion, eligibility)
│   ├── management.js     (management fees, breakaway)
│   └── reports.js        (monthly reports, exports)
```

**4.5 — Error handling chuẩn hóa**

Tạo error classes + global error handler:
```javascript
// middleware/errorHandler.js
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message, code: err.code });
  }
  console.error('[Unhandled]', err);
  // Audit log cho unhandled errors
  res.status(500).json({ error: 'Internal server error' });
}
```

Thay thế tất cả `try/catch` rải rác → `throw new AppError(...)` + global handler.

**4.6 — Chạy lại TOÀN BỘ tests**

Mỗi refactor step → `npm test`. Nếu fail → fix trước khi tiếp.

### Kết quả Phase 4
✅ Commission/Agency rates admin thay đổi real-time qua UI  
✅ Admin routes chia module rõ ràng  
✅ Error handling nhất quán  
✅ Tất cả tests vẫn pass  

---

## PHASE 5: Performance & Scalability (3-4 ngày)

### Tại sao làm thứ 6?
PostgreSQL đã handle concurrent writes (Phase 1). Business logic đã clean (Phase 4). Giờ optimize cho throughput cao.

### Deliverables

**5.1 — Redis Cache deployment**

```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

`cache.js` đã có Redis support → chỉ cần set `REDIS_HOST` trong `.env`.

**5.2 — Fix N+1 queries**

Hiện tại `admin.js` có 18+ `findMany` calls, nhiều chỗ query trong loop:

```javascript
// TRƯỚC: N+1
const ctvs = await prisma.user.findMany({ where: { role: 'ctv' } });
for (const ctv of ctvs) {
  const txns = await prisma.transaction.findMany({ where: { ctvId: ctv.id } });
  // ...
}

// SAU: 1 query với include
const ctvs = await prisma.user.findMany({
  where: { role: 'ctv' },
  include: {
    transactions: {
      where: { createdAt: { gte: startOfMonth } },
      select: { totalAmount: true, cogsAmount: true },
    },
    _count: { select: { transactions: true } },
  },
});
```

Các queries cần fix:
- Dashboard KPI aggregation → raw SQL `GROUP BY` thay vì loop
- CTV list + transaction count → `include` + `_count`
- Commission calculation → batch query thay vì per-user
- Management fee scan → single query với joins

**5.3 — Connection pooling**

```env
# .env
DATABASE_URL="postgresql://user:pass@localhost:5432/ccbmart?connection_limit=20&pool_timeout=10"
```

Production: PgBouncer hoặc Prisma Accelerate.

**5.4 — Polling → WebSocket/SSE**

Hiện tại frontend poll mỗi 60s. Với 1,000 users = 17 req/s chỉ cho refresh.

```javascript
// backend: Server-Sent Events (đơn giản hơn WebSocket)
app.get('/api/events', authMw, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  
  const listener = (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };
  
  eventEmitter.on('update', listener);
  req.on('close', () => eventEmitter.off('update', listener));
});
```

```typescript
// frontend: EventSource thay setInterval
useEffect(() => {
  const es = new EventSource('/api/events', { withCredentials: true });
  es.onmessage = (e) => {
    const data = JSON.parse(e.data);
    // Update relevant state
  };
  return () => es.close();
}, []);
```

**5.5 — File uploads → S3/Cloud Storage**

```javascript
// services/storage.js
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

async function uploadFile(file, path) {
  if (config.storage.type === 's3') {
    await s3.send(new PutObjectCommand({
      Bucket: config.storage.bucket,
      Key: path,
      Body: file.buffer,
    }));
    return `https://${config.storage.bucket}.s3.amazonaws.com/${path}`;
  }
  // Local fallback for dev
  fs.writeFileSync(`./uploads/${path}`, file.buffer);
  return `/uploads/${path}`;
}
```

**5.6 — Commission calculation → Background job**

Commission nặng không nên block API response:
```javascript
// Khi có transaction mới
await addSyncJob('calculate-commission', { userId, month });

// Job worker
async function processCommissionJob({ userId, month }) {
  const result = await calculateCtvCommission(userId, month);
  await prisma.kpiLog.upsert({ ... });
  eventEmitter.emit('update', { type: 'commission', userId });
}
```

### Kết quả Phase 5
✅ Redis cache giảm DB load 60-70%  
✅ N+1 queries eliminated → dashboard load <1s  
✅ SSE real-time thay polling  
✅ File uploads persistent trên S3  
✅ Commission async → API response <200ms  

---

## PHASE 6: Production Deployment (2-3 ngày)

### Tại sao làm cuối?
Tất cả code đã clean, tested, secure, performant. Giờ chỉ cần infrastructure.

### Deliverables

**6.1 — CI/CD Pipeline (GitHub Actions)**

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: ccbmart_test
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd backend && npm ci
      - run: cd backend && npx prisma migrate deploy
      - run: cd backend && npm run test:ci
      - run: cd frontend && npm ci && npm run build
```

**6.2 — Docker production build**

```dockerfile
# backend/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src
EXPOSE 4000
CMD ["node", "src/server.js"]
```

**6.3 — Monitoring & Alerting**

- Health check endpoint đã có (`/api/health`)
- Thêm: response time tracking, error rate, DB connection pool status
- Alerting: Telegram bot (đã có pattern từ PandaDoc notifier)

**6.4 — Database backups**

```bash
# Cron: daily backup
0 2 * * * pg_dump ccbmart | gzip > /backups/ccbmart_$(date +%Y%m%d).sql.gz
```

**6.5 — Staging environment**

Staging chạy cùng infrastructure với production nhưng data riêng. Mọi thay đổi test ở staging trước.

**6.6 — Logging chuẩn hóa**

```javascript
// services/logger.js
const winston = require('winston');
const logger = winston.createLogger({
  level: config.env === 'production' ? 'info' : 'debug',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
  ],
});
```

Thay tất cả `console.log` → `logger.info/warn/error`.

### Kết quả Phase 6
✅ CI chạy tests tự động mỗi push  
✅ Docker deployment reproducible  
✅ Monitoring + alerting real-time  
✅ Database backup daily  
✅ Staging environment cho QA  

---

## DEPENDENCY MAP

```
Phase 0 (Config)
    │
    ▼
Phase 1 (PostgreSQL) ──────────────────┐
    │                                   │
    ▼                                   │
Phase 2 (Tests) ◄── cần DB stable      │
    │                                   │
    ├───────────────┐                   │
    ▼               ▼                   │
Phase 3          Phase 4                │
(Security)       (Refactor)             │
    │               │                   │
    └───────┬───────┘                   │
            ▼                           │
        Phase 5 (Performance) ◄─────────┘
            │                 cần PostgreSQL
            ▼                 cho connection pooling
        Phase 6 (Deploy)
```

Phase 3 và Phase 4 có thể chạy **song song** nếu có 2 developers — chúng sửa các files khác nhau. Các phase còn lại phải tuần tự.

---

## CHECKLIST TỔNG HỢP

| # | Task | Phase | Priority | Est. |
|---|---|---|---|---|
| 1 | `.env.example` + config loader | 0 | ★★★ | 2h |
| 2 | Refactor hardcode config → env vars | 0 | ★★★ | 2h |
| 3 | PostgreSQL setup (Docker + schema) | 1 | ★★★ | 4h |
| 4 | Decimal migration cho money fields | 1 | ★★★ | 4h |
| 5 | Prisma migrate + seed trên PostgreSQL | 1 | ★★★ | 2h |
| 6 | Jest setup + test helpers | 2 | ★★★ | 2h |
| 7 | Commission tests (20 cases) | 2 | ★★★ | 6h |
| 8 | Breakaway tests (15 cases) | 2 | ★★★ | 4h |
| 9 | Other service tests (31 cases) | 2 | ★★☆ | 6h |
| 10 | Route integration tests (18 cases) | 2 | ★★☆ | 4h |
| 11 | Helmet + security headers | 3 | ★★★ | 1h |
| 12 | Apply loginLimiter + per-route limits | 3 | ★★★ | 2h |
| 13 | Momo HMAC verification | 3 | ★★★ | 2h |
| 14 | Joi validation cho remaining routes | 3 | ★★☆ | 6h |
| 15 | Commission rates → DB-driven | 4 | ★★☆ | 4h |
| 16 | Split admin.js → modules | 4 | ★★☆ | 4h |
| 17 | Error handling chuẩn hóa | 4 | ★★☆ | 3h |
| 18 | Redis deployment | 5 | ★★☆ | 2h |
| 19 | Fix N+1 queries | 5 | ★★★ | 6h |
| 20 | Polling → SSE | 5 | ★☆☆ | 4h |
| 21 | S3 file uploads | 5 | ★☆☆ | 3h |
| 22 | Commission → background job | 5 | ★★☆ | 4h |
| 23 | GitHub Actions CI | 6 | ★★☆ | 3h |
| 24 | Docker production build | 6 | ★★☆ | 3h |
| 25 | Monitoring + alerting | 6 | ★★☆ | 4h |
| 26 | DB backups + staging | 6 | ★☆☆ | 3h |

---

**Tổng: ~88 giờ = 16-22 ngày (tùy developer speed)**

**Milestone quan trọng:**
- Sau Phase 1: Có thể demo cho investor với DB thật (không còn SQLite)
- Sau Phase 2: An tâm sửa code (có test safety net)
- Sau Phase 4: System logic sạch, admin tự thay đổi rates
- Sau Phase 6: Production-ready cho 1,000+ users
