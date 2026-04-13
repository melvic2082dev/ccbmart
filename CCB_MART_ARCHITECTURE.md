# CCB MART - FULL ARCHITECTURE & CODE DOCUMENTATION

> Tài liệu mô tả toàn bộ kiến trúc, logic nghiệp vụ và source code của hệ thống CCB Mart.
> Dùng để review bởi CTO DeepSeek.

---

## MỤC LỤC

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Tech Stack](#2-tech-stack)
3. [Database Schema](#3-database-schema)
4. [Backend Source Code](#4-backend-source-code)
5. [Frontend Source Code](#5-frontend-source-code)
6. [Deployment Config](#6-deployment-config)
7. [Các vấn đề đã fix](#7-các-vấn-đề-đã-fix)

---

## 1. TỔNG QUAN KIẾN TRÚC

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 16)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ CTV Panel│  │Agency    │  │Admin     │              │
│  │ Dashboard│  │Dashboard │  │Dashboard │              │
│  │ Tree     │  │Inventory │  │CTV Mgmt  │              │
│  │ Customers│  │Txns      │  │Reports   │              │
│  │ Products │  │          │  │Config    │              │
│  │ Notifs   │  │Notifs    │  │Notifs    │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│                    ↕ REST API (fetch)                    │
└─────────────────────────────────────────────────────────┘
                         │
┌─────────────────────────────────────────────────────────┐
│                   BACKEND (Express.js)                   │
│                                                         │
│  ┌─────────────────── Middleware ──────────────────────┐ │
│  │ CORS → RateLimit → JSON → Auth → Authorize → Valid │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌──────────── Routes ─────────────┐                    │
│  │ /api/auth      (login, me)      │                    │
│  │ /api/ctv       (dashboard, tree)│                    │
│  │ /api/agency    (dashboard, inv) │                    │
│  │ /api/admin     (12 endpoints)   │                    │
│  │ /api/notifications (CRUD)       │                    │
│  │ /api/admin/reports (export)     │                    │
│  │ /webhook/kiotviet/order         │                    │
│  └─────────────────────────────────┘                    │
│                                                         │
│  ┌──────────── Services ───────────┐                    │
│  │ commission.js  (LRU cache, 2Q)  │                    │
│  │ cache.js       (Redis/memory)   │                    │
│  │ treeValidator.js (cycle detect) │                    │
│  │ notification.js (CRUD + alerts) │                    │
│  └─────────────────────────────────┘                    │
│                                                         │
│  ┌──────────── Jobs/Queues ────────┐                    │
│  │ autoRankUpdate.js (cron 1st/mo) │                    │
│  │ syncQueue.js (BullMQ/fallback)  │                    │
│  └─────────────────────────────────┘                    │
│                                                         │
│                    ↕ Prisma ORM                          │
└─────────────────────────────────────────────────────────┘
                         │
┌─────────────────────────────────────────────────────────┐
│                SQLite (dev) / PostgreSQL (prod)          │
│  14 models: User, Transaction, Notification, etc.       │
│  13+ indexes for performance                            │
└─────────────────────────────────────────────────────────┘
                         │
┌─────────────────────────────────────────────────────────┐
│           Redis (optional) - Cache + BullMQ             │
│  Dashboard cache (TTL 5min)                             │
│  Commission LRU cache (1000 entries)                    │
│  Sync job queue (3 retries, exponential backoff)        │
└─────────────────────────────────────────────────────────┘
```

### Cấu trúc thư mục

```
ccbmart/
├── docker-compose.yml
├── backend/
│   ├── package.json
│   ├── Dockerfile
│   ├── .env.example
│   ├── prisma/
│   │   ├── schema.prisma          (14 models, 13+ indexes)
│   │   ├── seed.js                (30 CTVs, 500 txns, etc.)
│   │   └── dev.db                 (SQLite)
│   └── src/
│       ├── server.js              (Entry point)
│       ├── middleware/
│       │   ├── auth.js            (JWT authenticate + authorize)
│       │   ├── rateLimiter.js     (global/login/api limits)
│       │   └── validate.js        (Joi schemas)
│       ├── services/
│       │   ├── commission.js      (N+1 fixed, LRU cache)
│       │   ├── cache.js           (Redis + in-memory fallback)
│       │   ├── treeValidator.js   (cycle detection)
│       │   └── notification.js    (alerts system)
│       ├── jobs/
│       │   └── autoRankUpdate.js  (monthly cron)
│       ├── queues/
│       │   └── syncQueue.js       (BullMQ + fallback)
│       └── routes/
│           ├── auth.js
│           ├── admin.js           (12 endpoints)
│           ├── ctv.js             (5 endpoints)
│           ├── agency.js          (3 endpoints)
│           ├── notifications.js   (3 endpoints)
│           └── reports.js         (2 export endpoints)
└── frontend/
    ├── package.json
    └── src/
        ├── lib/api.ts             (API client + helpers)
        ├── components/
        │   ├── Sidebar.tsx        (role-based nav + bell badge)
        │   ├── DashboardLayout.tsx
        │   └── NotificationsPage.tsx
        └── app/
            ├── login/page.tsx
            ├── admin/  (dashboard, ctv, agencies, config, reports, notifications)
            ├── ctv/    (dashboard, customers, transactions, products, notifications)
            └── agency/ (dashboard, inventory, transactions, notifications)
```

---

## 2. TECH STACK

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js 4.21
- **ORM**: Prisma 6.6 (SQLite dev, PostgreSQL prod-ready)
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **Cache**: ioredis (optional, in-memory fallback)
- **Queue**: BullMQ (optional, direct execution fallback)
- **Cron**: node-cron
- **Validation**: Joi
- **Rate Limiting**: express-rate-limit
- **Export**: ExcelJS (xlsx), HTML (pdf)

### Frontend
- **Framework**: Next.js 16.2.3 (App Router)
- **UI**: React 19, Tailwind CSS 4, Shadcn/UI
- **Charts**: Recharts 3.8
- **Icons**: Lucide React

---

## 3. DATABASE SCHEMA

### File: `backend/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model User {
  id            Int      @id @default(autoincrement())
  email         String   @unique
  passwordHash  String   @map("password_hash")
  role          String   // ctv, agency, admin
  name          String
  phone         String?
  rank          String?  // CTV, PP, TP, GDV, GDKD
  parentId      Int?     @map("parent_id")
  agencyId      Int?     @map("agency_id")
  isActive      Boolean  @default(true) @map("is_active")
  createdAt     DateTime @default(now()) @map("created_at")

  parent        User?    @relation("UserHierarchy", fields: [parentId], references: [id])
  children      User[]   @relation("UserHierarchy")
  agency        Agency?  @relation("AgencyUser", fields: [agencyId], references: [id])

  managedCtvs   CtvHierarchy[] @relation("Manager")
  asCtvEntry    CtvHierarchy[] @relation("Ctv")
  transactions  Transaction[]  @relation("CtvTransactions")
  customers     Customer[]     @relation("CtvCustomers")
  kpiLogs       KpiLog[]
  rankHistory   RankHistory[]
  ownedAgency   Agency?        @relation("AgencyOwner")
  notifications Notification[]

  @@index([parentId])
  @@index([rank])
  @@index([role])
  @@index([role, isActive])
  @@map("users")
}

model CtvHierarchy {
  id          Int      @id @default(autoincrement())
  ctvId       Int      @map("ctv_id")
  managerId   Int      @map("manager_id")
  level       String   // F1, F2, F3
  appointedAt DateTime @default(now()) @map("appointed_at")
  ctv         User     @relation("Ctv", fields: [ctvId], references: [id])
  manager     User     @relation("Manager", fields: [managerId], references: [id])
  @@map("ctv_hierarchy")
}

model Agency {
  id              Int      @id @default(autoincrement())
  userId          Int      @unique @map("user_id")
  name            String
  depositAmount   Float    @map("deposit_amount")
  depositTier     String   @map("deposit_tier") // 50tr, 100tr, 300tr
  address         String?
  user            User     @relation("AgencyOwner", fields: [userId], references: [id])
  users           User[]   @relation("AgencyUser")
  transactions    Transaction[] @relation("AgencyTransactions")
  customers       Customer[]    @relation("AgencyCustomers")
  inventoryWarnings InventoryWarning[]
  @@map("agencies")
}

model CommissionConfig {
  id          Int    @id @default(autoincrement())
  tier        String @unique // CTV, PP, TP, GDV, GDKD
  selfSalePct Float  @map("self_sale_pct")
  f1Pct       Float  @map("f1_pct")
  f2Pct       Float  @map("f2_pct")
  f3Pct       Float  @map("f3_pct")
  fixedSalary Float  @map("fixed_salary")
  @@map("commission_config")
}

model AgencyCommissionConfig {
  id            Int    @id @default(autoincrement())
  group         String @unique // A, B, C
  commissionPct Float  @map("commission_pct")
  bonusPct      Float  @map("bonus_pct")
  @@map("agency_commission_config")
}

model Product {
  id       Int    @id @default(autoincrement())
  name     String
  category String // NS, TPCN, FMCG, GiaVi, CheBien, TienLoi
  price    Float
  cogsPct  Float  @map("cogs_pct")
  unit     String
  transactionItems TransactionItem[]
  inventoryWarnings InventoryWarning[]
  @@map("products")
}

model Transaction {
  id              Int      @id @default(autoincrement())
  kiotvietOrderId String?  @map("kiotviet_order_id")
  customerId      Int?     @map("customer_id")
  ctvId           Int?     @map("ctv_id")
  agencyId        Int?     @map("agency_id")
  channel         String   // ctv, agency, showroom
  totalAmount     Float    @map("total_amount")
  cogsAmount      Float    @map("cogs_amount")
  createdAt       DateTime @default(now()) @map("created_at")
  customer        Customer?  @relation(fields: [customerId], references: [id])
  ctv             User?      @relation("CtvTransactions", fields: [ctvId], references: [id])
  agency          Agency?    @relation("AgencyTransactions", fields: [agencyId], references: [id])
  items           TransactionItem[]

  @@index([ctvId])
  @@index([agencyId])
  @@index([channel])
  @@index([createdAt])
  @@index([ctvId, createdAt])
  @@index([agencyId, createdAt])
  @@index([channel, createdAt])
  @@map("transactions")
}

model TransactionItem {
  id            Int    @id @default(autoincrement())
  transactionId Int    @map("transaction_id")
  productId     Int    @map("product_id")
  quantity      Int
  unitPrice     Float  @map("unit_price")
  totalPrice    Float  @map("total_price")
  transaction   Transaction @relation(fields: [transactionId], references: [id])
  product       Product     @relation(fields: [productId], references: [id])
  @@index([transactionId])
  @@index([productId])
  @@map("transaction_items")
}

model Customer {
  id            Int      @id @default(autoincrement())
  name          String
  phone         String?
  ctvId         Int?     @map("ctv_id")
  agencyId      Int?     @map("agency_id")
  firstPurchase DateTime? @map("first_purchase")
  totalSpent    Float    @default(0) @map("total_spent")
  ctv           User?    @relation("CtvCustomers", fields: [ctvId], references: [id])
  agency        Agency?  @relation("AgencyCustomers", fields: [agencyId], references: [id])
  transactions  Transaction[]
  @@map("customers")
}

model KpiLog {
  id            Int    @id @default(autoincrement())
  ctvId         Int    @map("ctv_id")
  month         String // YYYY-MM
  selfSales     Int    @map("self_sales")
  portfolioSize Int    @map("portfolio_size")
  rankBefore    String @map("rank_before")
  rankAfter     String @map("rank_after")
  ctv           User   @relation(fields: [ctvId], references: [id])
  @@unique([ctvId, month])
  @@index([month])
  @@map("kpi_logs")
}

model RankHistory {
  id        Int      @id @default(autoincrement())
  ctvId     Int      @map("ctv_id")
  oldRank   String   @map("old_rank")
  newRank   String   @map("new_rank")
  reason    String
  changedAt DateTime @default(now()) @map("changed_at")
  changedBy String   @map("changed_by")
  ctv       User     @relation(fields: [ctvId], references: [id])
  @@map("rank_history")
}

model InventoryWarning {
  id          Int      @id @default(autoincrement())
  productId   Int      @map("product_id")
  agencyId    Int?     @map("agency_id")
  quantity    Int
  expiryDate  DateTime @map("expiry_date")
  warningType String   @map("warning_type")
  createdAt   DateTime @default(now()) @map("created_at")
  product     Product  @relation(fields: [productId], references: [id])
  agency      Agency?  @relation(fields: [agencyId], references: [id])
  @@map("inventory_warnings")
}

model SyncLog {
  id            Int      @id @default(autoincrement())
  source        String
  recordsSynced Int      @map("records_synced")
  syncedAt      DateTime @default(now()) @map("synced_at")
  status        String
  @@map("sync_logs")
}

model Notification {
  id        Int      @id @default(autoincrement())
  userId    Int      @map("user_id")
  type      String   // RANK_CHANGE, TRANSACTION_CONFIRMED, SALARY_WARNING, INVENTORY_WARNING
  title     String
  content   String
  metadata  String?  // JSON string
  isRead    Boolean  @default(false) @map("is_read")
  createdAt DateTime @default(now()) @map("created_at")
  user      User     @relation(fields: [userId], references: [id])
  @@index([userId])
  @@index([userId, isRead])
  @@index([createdAt])
  @@map("notifications")
}
```

### Seed Data (tóm tắt từ `prisma/seed.js`)
- 1 Admin (admin@ccbmart.vn / admin123)
- 30 CTVs: 1 GDKD → 2 GDV → 3 TP → 6 PP → 18 CTV
- 3 Agencies (50tr, 100tr, 300tr deposit tiers)
- 15 Products (NS, TPCN, FMCG, GiaVi, CheBien, TienLoi)
- 100 Customers (60% CTV, 20% agency, 20% showroom)
- 500 Transactions (3 tháng, 60% CTV, 20% agency, 20% showroom)
- KPI Logs, Rank History, Inventory Warnings

---

## 4. BACKEND SOURCE CODE

### 4.1 Entry Point: `backend/src/server.js`

```javascript
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const ctvRoutes = require('./routes/ctv');
const agencyRoutes = require('./routes/agency');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const reportRoutes = require('./routes/reports');
const { globalLimiter } = require('./middleware/rateLimiter');
const { validate, schemas } = require('./middleware/validate');
const { initRedis } = require('./services/cache');
const { initSyncQueue, addSyncJob } = require('./queues/syncQueue');
const { scheduleAutoRankJob } = require('./jobs/autoRankUpdate');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.startsWith('http://localhost:')) return callback(null, true);
    callback(new Error('Not allowed'));
  },
  credentials: true,
}));
app.use(express.json());
app.use('/api/', globalLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/ctv', ctvRoutes);
app.use('/api/agency', agencyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin/reports', reportRoutes);

app.post('/webhook/kiotviet/order', validate(schemas.webhookOrder), async (req, res) => {
  try {
    await addSyncJob('webhook-order', { order: req.body });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[Webhook] Error:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function start() {
  await initRedis();
  await initSyncQueue();
  scheduleAutoRankJob();
  app.listen(PORT, () => {
    console.log(`CCB Mart API running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
```

### 4.2 Middleware

#### `middleware/auth.js` - JWT Authentication
```javascript
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'ccb-mart-secret-key-2026';

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('FATAL: JWT_SECRET must be set via environment variable in production');
  process.exit(1);
}

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
```

#### `middleware/rateLimiter.js` - Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');
const globalLimiter = rateLimit({ windowMs: 15*60*1000, max: 100 });
const loginLimiter = rateLimit({ windowMs: 15*60*1000, max: 5 });
const apiLimiter = rateLimit({ windowMs: 15*60*1000, max: 200 });
```

#### `middleware/validate.js` - Joi Validation
- `login`: email + password(3-100)
- `reassignCtv`: newParentId (int|null)
- `changeRank`: newRank (CTV|PP|TP|GDV|GDKD) + reason
- `updateCommission`: selfSalePct/f1Pct/f2Pct/f3Pct (0-1) + fixedSalary
- `webhookOrder`: id + totalAmount + optional fields

### 4.3 Services

#### `services/commission.js` - Commission Calculator (N+1 FIX)

**Logic nghiệp vụ:**
```
CTV:  20% self, 0 F1/F2/F3, 0 lương
PP:   20% self, 0 F1/F2/F3, 5M lương
TP:   30% self, 10% F1, 0 F2/F3, 10M lương
GDV:  35% self, 10% F1, 5% F2, 0 F3, 18M lương
GDKD: 38% self, 10% F1, 5% F2, 3% F3, 30M lương
```

**Thuật toán tối ưu (2-3 queries thay vì N+1):**
1. Query 1: Lấy TẤT CẢ transactions trong tháng (`channel = 'ctv'`)
2. Query 2: Lấy TẤT CẢ CTVs active
3. Build `revenueMap` (ctvId → totalRevenue) trong memory
4. Build `childrenMap` (parentId → [childIds]) trong memory
5. Duyệt cây F1 → F2 → F3 hoàn toàn trong memory

```javascript
class LRUCache {
  constructor(maxSize = 1000) { this.maxSize = maxSize; this.cache = new Map(); }
  get(key) { /* move to end */ }
  set(key, value) { /* evict oldest if full */ }
  clear() { this.cache.clear(); }
  invalidatePattern(pattern) { /* delete matching keys */ }
}

async function calculateCtvCommission(ctvId, month) {
  const cacheKey = `commission:${ctvId}:${month}`;
  const cached = commissionCache.get(cacheKey);
  if (cached) return cached;

  // Query 1: ALL transactions for month
  const allTransactions = await prisma.transaction.findMany({
    where: { channel: 'ctv', createdAt: { gte: startDate, lt: endDate } },
    select: { id: true, totalAmount: true, ctvId: true },
  });

  // Query 2: ALL active CTVs
  const allCtv = await prisma.user.findMany({
    where: { role: 'ctv', isActive: true },
    select: { id: true, parentId: true, rank: true, name: true },
  });

  // Build maps in memory
  const revenueMap = new Map();
  for (const tx of allTransactions) {
    revenueMap.set(tx.ctvId, (revenueMap.get(tx.ctvId) || 0) + tx.totalAmount);
  }

  const childrenMap = new Map();
  for (const ctv of allCtv) {
    if (ctv.parentId !== null) {
      if (!childrenMap.has(ctv.parentId)) childrenMap.set(ctv.parentId, []);
      childrenMap.get(ctv.parentId).push(ctv.id);
    }
  }

  // In-memory tree traversal: F1 → F2 → F3
  const f1Ids = childrenMap.get(ctvId) || [];
  for (const f1Id of f1Ids) {
    f1Commission += (revenueMap.get(f1Id) || 0) * rates.f1;
    const f2Ids = childrenMap.get(f1Id) || [];
    for (const f2Id of f2Ids) {
      f2Commission += (revenueMap.get(f2Id) || 0) * rates.f2;
      const f3Ids = childrenMap.get(f2Id) || [];
      for (const f3Id of f3Ids) {
        f3Commission += (revenueMap.get(f3Id) || 0) * rates.f3;
      }
    }
  }

  // Cache result in LRU
  commissionCache.set(cacheKey, result);
  return result;
}

// Batch version: tính commission cho TẤT CẢ CTVs chỉ với 2 queries
async function calculateAllCtvCommissions(month) { ... }

// Salary fund: aggregate query thay vì fetch all
async function calculateSalaryFundStatus(month) {
  const ctvRevenueResult = await prisma.transaction.aggregate({
    where: { channel: 'ctv', createdAt: { gte: startDate, lt: endDate } },
    _sum: { totalAmount: true },
  });
  // salaryFundCap = ctvRevenue * 5%
  // warning: OK / WARNING (>=80%) / CRITICAL (>=100%)
}
```

#### `services/cache.js` - Redis + In-Memory Fallback

```javascript
let redis = null;
const memoryCache = new Map();

async function initRedis() {
  if (process.env.REDIS_HOST) {
    redis = new Redis({ host, port, password, retryStrategy(times) { ... } });
  }
}

async function getCachedOrCompute(key, ttlSeconds, computeFn) {
  // Try Redis → Try memoryCache → Compute → Store
  if (redis) {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);
  } else {
    const entry = memoryCache.get(key);
    if (entry && entry.expiresAt > Date.now()) return entry.value;
  }
  const fresh = await computeFn();
  // Store with TTL (redis.setex or memoryCache with expiry)
  return fresh;
}

async function invalidateCache(pattern) {
  // Redis: keys(pattern) + del
  // Memory: prefix match + delete
}
```

#### `services/treeValidator.js` - Chống Circular Reference

```javascript
function wouldCreateCycle(ctvId, newParentId, allCtv) {
  // Walk up from newParentId → root
  // If encounter ctvId → cycle detected
  let current = newParentId;
  while (current !== null) {
    if (current === ctvId) return true;
    current = parentMap.get(current);
  }
  return false;
}

async function validateReassignment(ctvId, newParentId) {
  // 1. Self-assignment check
  // 2. Both exist + role check
  // 3. Active check
  // 4. Circular reference check
  return { valid: true/false, error?: string };
}

async function getDescendantCount(ctvId) {
  // BFS traversal to count all descendants (portfolio size)
}
```

#### `services/notification.js` - Notification System

```javascript
// Types: RANK_CHANGE, TRANSACTION_CONFIRMED, SALARY_WARNING, INVENTORY_WARNING

async function createNotification(userId, type, title, content, metadata) { ... }
async function notifyAdmins(type, title, content, metadata) { ... }
async function sendSalaryWarning(usagePercent, totalFixedSalary, salaryFundCap) { ... }
async function sendRankChangeNotification(ctvId, oldRank, newRank, reason) { ... }
async function getUserNotifications(userId, { page, limit, unreadOnly }) {
  // Parallel: notifications + total + unreadCount
  return { notifications, total, unreadCount, page, totalPages };
}
async function markAsRead(notificationId, userId) { ... }
async function markAllAsRead(userId) { ... }
```

### 4.4 Jobs & Queues

#### `jobs/autoRankUpdate.js` - Auto Rank Cron

```javascript
// Cron: "5 0 1 * *" = 00:05 ngày 1 hàng tháng
// Lock: isRunning flag chống chạy trùng

function determineRankByKpi(selfCombos, portfolioSize) {
  if (selfCombos >= 50 && portfolioSize >= 1000) return 'GDKD';
  if (selfCombos >= 50 && portfolioSize >= 550) return 'GDV';
  if (selfCombos >= 50 && portfolioSize >= 150) return 'TP';
  if (selfCombos >= 50) return 'PP';
  return 'CTV';
}

async function calculateMonthlyKpi(ctvId, month) {
  // selfCombos = Math.floor(totalSales / 2,000,000)
  // portfolioSize = getDescendantCount(ctvId)
}

async function runRankEvaluation(triggeredBy) {
  // 1. Get all active CTVs
  // 2. For each: calculate KPI → determine new rank
  // 3. If changed: update user + create RankHistory + send notification
  // 4. Upsert KpiLog for all CTVs
  // 5. Invalidate commission cache
  // 6. Send admin report notification
  return { promoted[], demoted[], unchanged, errors[] };
}
```

#### `queues/syncQueue.js` - BullMQ Queue

```javascript
// Falls back to direct execution if Redis unavailable

async function initSyncQueue() {
  if (REDIS_HOST) → BullMQ Queue + Worker (concurrency: 1)
  else → console.log('sync will run directly')
}

async function addSyncJob(type, data) {
  if (useQueue) → queue.add(type, data, { attempts: 3, backoff: exponential })
  else → processSyncJob(data) directly
}

async function processWebhookOrder(data) {
  // Check duplicate kiotvietOrderId
  // Create Transaction
  // Invalidate caches
}

async function executeBatchSync(data) {
  // Create SyncLog
  // Invalidate all caches
}
```

### 4.5 Routes

#### `routes/auth.js`
| Method | Path | Middleware | Description |
|--------|------|-----------|-------------|
| POST | /login | loginLimiter, validate(login) | Email/password → JWT token (7d) |
| GET | /me | Bearer token | Current user info |

#### `routes/admin.js` (12 endpoints)
| Method | Path | Cache | Description |
|--------|------|-------|-------------|
| GET | /dashboard | 5min | Revenue, costs, salary fund, 6-month chart |
| GET | /ctvs | - | All CTVs with _count (optimized, no N+1) |
| GET | /ctv-tree | 5min | Full hierarchy (1 query + in-memory build) |
| POST | /ctv/:id/reassign | - | Move CTV (with cycle validation) |
| POST | /ctv/:id/rank | - | Change rank (with notification) |
| GET | /agencies | - | All agencies (batch aggregate revenues) |
| GET | /config/commission | - | Commission rates |
| PUT | /config/commission/:tier | - | Update rates |
| GET | /reports/financial | 10min | Monthly P&L |
| GET | /kpi-logs | - | Last 50 KPI logs |
| POST | /rank-evaluation | - | Manual trigger auto-rank |
| POST | /sync | - | Trigger KiotViet sync (via queue) |
| GET | /sync-history | - | Sync logs |

#### `routes/ctv.js` (5 endpoints)
| Method | Path | Cache | Description |
|--------|------|-------|-------------|
| GET | /dashboard | 5min | Revenue, combos, commission, chart |
| GET | /tree | 5min | Team hierarchy (2 queries + in-memory) |
| GET | /customers | - | Customer list |
| GET | /transactions | - | Paginated transactions |
| GET | /products | - | Product catalog |

#### `routes/agency.js` (3 endpoints)
| Method | Path | Cache | Description |
|--------|------|-------|-------------|
| GET | /dashboard | 5min | Revenue, commission, warnings, chart |
| GET | /inventory | - | Inventory warnings |
| GET | /transactions | - | Paginated transactions |

#### `routes/notifications.js` (3 endpoints)
| Method | Path | Description |
|--------|------|-------------|
| GET | / | Paginated notifications (unreadOnly filter) |
| POST | /:id/read | Mark single as read |
| POST | /read-all | Mark all as read |

#### `routes/reports.js` (2 export endpoints)
| Method | Path | Description |
|--------|------|-------------|
| GET | /export/excel | Download .xlsx (ExcelJS) |
| GET | /export/pdf | HTML report (browser print-to-PDF) |

---

## 5. FRONTEND SOURCE CODE

### 5.1 API Client: `frontend/src/lib/api.ts`

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// fetchAPI: Bearer token from localStorage, auto-redirect on 401
// fetchBlob: For binary downloads (Excel)

export const api = {
  // Auth
  login, me,
  // CTV (5 endpoints)
  ctvDashboard, ctvTree, ctvCustomers, ctvTransactions, ctvProducts,
  // Agency (3 endpoints)
  agencyDashboard, agencyInventory, agencyTransactions,
  // Admin (12 endpoints)
  adminDashboard, adminCtvs, adminCtvTree, adminAgencies,
  adminCommissionConfig, adminUpdateCommission, adminReports,
  adminKpiLogs, adminReassignCtv, adminChangeRank, adminSync,
  adminRunRankEvaluation,
  // Export (download triggers)
  adminExportExcel, adminExportPdf,
  // Notifications (3 endpoints)
  notifications, markNotificationRead, markAllNotificationsRead,
};
```

### 5.2 Components

- **Sidebar.tsx**: Role-based nav (ctv/agency/admin), collapsible, Bell icon with unread badge (polls every 60s)
- **DashboardLayout.tsx**: Auth guard + role validation + greeting
- **NotificationsPage.tsx**: Reusable notification list with type badges, mark-read, pagination

### 5.3 Pages (20 pages)

**Admin** (6 pages):
- `/admin/dashboard` - Revenue cards, channel chart, profit chart, salary fund monitor, cost breakdown
- `/admin/ctv` - CTV table + expandable tree
- `/admin/agencies` - Agency table with deposits, revenue, warnings
- `/admin/config` - Commission rates, KPI thresholds, COGS, salary fund rules
- `/admin/reports` - P&L charts + table + **Excel/PDF export buttons**
- `/admin/notifications` - Notification center

**CTV** (5 pages):
- `/ctv/dashboard` - Revenue, combos, commission breakdown, team tree
- `/ctv/customers` - Customer list
- `/ctv/transactions` - Order history
- `/ctv/products` - Product catalog by category
- `/ctv/notifications` - Notification center

**Agency** (4 pages):
- `/agency/dashboard` - Revenue, commission estimate, inventory warnings
- `/agency/inventory` - Low stock / expiry alerts
- `/agency/transactions` - Order history
- `/agency/notifications` - Notification center

---

## 6. DEPLOYMENT CONFIG

### `docker-compose.yml`
```yaml
services:
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes: [redis-data:/data]
    command: redis-server --appendonly yes

  api:
    build: ./backend
    ports: ["4000:4000"]
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET:-ccb-mart-change-this-secret}
      - REDIS_HOST=redis
    depends_on: [redis]
```

### `backend/Dockerfile`
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

### `.env.example`
```
PORT=4000
NODE_ENV=development
JWT_SECRET=ccb-mart-super-secret-key-change-in-production-2026
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
DATABASE_URL=file:./prisma/dev.db
```

---

## 7. CÁC VẤN ĐỀ ĐÃ FIX

| # | Vấn đề | Trạng thái | Giải pháp |
|---|--------|-----------|-----------|
| 1 | N+1 Query commission | ✅ DONE | 2-3 queries + LRU cache (1000 entries) + in-memory tree |
| 2 | Thiếu auto rank | ✅ DONE | Cron job (00:05 ngày 1/tháng) + manual trigger API |
| 3 | Thiếu Redis cache | ✅ DONE | Redis + in-memory fallback, TTL 5min dashboards |
| 4 | Thiếu queue sync | ✅ DONE | BullMQ + direct execution fallback |
| 5 | Thiếu cycle validation | ✅ DONE | wouldCreateCycle() + validateReassignment() |
| 6 | Thiếu DB indexes | ✅ DONE | 13+ indexes trên Transaction, User, KpiLog |
| 7 | Thiếu notifications | ✅ DONE | Model + Service + API + Frontend (bell badge) |
| 8 | Thiếu export báo cáo | ✅ DONE | Excel (ExcelJS) + PDF (HTML) |
| 9 | Security issues | ✅ DONE | JWT env enforcement + rate limiting + Joi validation |

### Performance Benchmark (ước tính)
- Commission calculator: **50+ queries → 2-3 queries** (giảm ~95%)
- Dashboard load: **uncached → cached 5min** (< 200ms sau lần đầu)
- CTV tree build: **recursive DB queries → 1 query + in-memory** (giảm ~90%)
- Admin /ctvs: **N+1 (count per CTV) → _count include** (1 query)
- Admin /agencies: **N+1 (revenue per agency) → groupBy batch** (2 queries)

### Điểm cần lưu ý cho DeepSeek review
1. Database hiện tại là SQLite (dev). Production nên chuyển sang PostgreSQL.
2. Redis là optional - không có Redis vẫn chạy được với in-memory cache.
3. BullMQ queue cũng optional - fallback direct execution.
4. Auto rank cron chạy trong process - production nên tách worker riêng.
5. Export PDF dùng HTML (browser print) - không dùng Puppeteer để tránh dependency nặng.
6. Commission rates hardcoded trong code + có CommissionConfig table (chưa sync 2 chiều).
