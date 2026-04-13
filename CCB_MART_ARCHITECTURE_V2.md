# CCB MART - FULL ARCHITECTURE & CODE DOCUMENTATION v2

> Cap nhat: Bo sung toan bo co che xac nhan tien ve cong ty cho kenh CTV
> Gui DeepSeek review

---

## 1. TONG QUAN KIEN TRUC

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 16)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ CTV Panel│  │Agency    │  │Admin     │              │
│  │ Dashboard│  │Dashboard │  │Dashboard │              │
│  │ Tao don  │  │Inventory │  │Doi soat  │ ← MOI       │
│  │ Giao dich│  │Txns      │  │CTV Mgmt  │              │
│  │ Nop tien │  │Notifs    │  │Reports   │              │
│  │ Notifs   │  │          │  │Config    │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│                    ↕ REST API                            │
└─────────────────────────────────────────────────────────┘
                         │
┌─────────────────────────────────────────────────────────┐
│                   BACKEND (Express.js)                   │
│                                                         │
│  Middleware: CORS → RateLimit → JSON → Auth → Validate  │
│                                                         │
│  Routes:                                                │
│  ├── /api/auth           (login, me)                    │
│  ├── /api/ctv            (dashboard, tree, customers)   │
│  ├── /api/ctv/transactions ← MOI (create, proof, cash) │
│  ├── /api/agency         (dashboard, inventory)         │
│  ├── /api/admin          (dashboard, ctvs, reports)     │
│  ├── /api/admin/reconciliation ← MOI (confirm/reject)  │
│  ├── /api/admin/reports  (export excel/pdf)             │
│  ├── /api/notifications  (CRUD)                        │
│  └── /webhook/kiotviet   (order sync)                  │
│                                                         │
│  Services:                                              │
│  ├── commission.js   (LRU cache, 2Q, CONFIRMED only)   │
│  ├── transaction.js  ← MOI (QR, proof, cash deposit)  │
│  ├── cache.js        (Redis/memory fallback)           │
│  ├── treeValidator.js(cycle detection)                 │
│  └── notification.js (alerts + notifications)          │
│                                                         │
│  Jobs:                                                  │
│  ├── autoRankUpdate.js   (cron 1st/month)              │
│  └── checkUnsubmittedCash.js ← MOI (cron every 6h)    │
│                                                         │
│  Queues:                                                │
│  └── syncQueue.js        (BullMQ/fallback)             │
└─────────────────────────────────────────────────────────┘
                         │
┌─────────────────────────────────────────────────────────┐
│  SQLite (16 models, 15+ indexes)                        │
│  + Redis (optional cache + queue)                       │
└─────────────────────────────────────────────────────────┘
```

### Cau truc thu muc

```
backend/src/
├── server.js
├── middleware/
│   ├── auth.js              (JWT + authorize)
│   ├── rateLimiter.js       (global 100/15m, login 5/15m)
│   └── validate.js          (Joi schemas)
├── services/
│   ├── commission.js        (N+1 fixed, LRU, CONFIRMED only)
│   ├── transaction.js       ← MOI (QR code, confirm, cash deposit)
│   ├── cache.js             (Redis + in-memory fallback)
│   ├── treeValidator.js     (cycle detection)
│   └── notification.js      (alerts system)
├── jobs/
│   ├── autoRankUpdate.js    (monthly cron)
│   └── checkUnsubmittedCash.js ← MOI (6h cron)
├── queues/
│   └── syncQueue.js         (BullMQ + fallback)
└── routes/
    ├── auth.js
    ├── admin.js             (12 endpoints)
    ├── ctv.js               (5 endpoints)
    ├── ctvTransactions.js   ← MOI (7 endpoints)
    ├── agency.js            (3 endpoints)
    ├── reconciliation.js    ← MOI (7 endpoints)
    ├── notifications.js     (3 endpoints)
    └── reports.js           (2 export endpoints)

frontend/src/app/
├── login/
├── ctv/
│   ├── dashboard/
│   ├── sales/create/        ← MOI (tao don ban hang)
│   ├── transactions/        (cap nhat: tabs theo status)
│   ├── cash/                ← MOI (nop tien mat)
│   ├── customers/
│   ├── products/
│   └── notifications/
├── agency/
│   ├── dashboard/
│   ├── inventory/
│   ├── transactions/
│   └── notifications/
└── admin/
    ├── dashboard/
    ├── reconciliation/      ← MOI (doi soat giao dich)
    ├── ctv/
    ├── agencies/
    ├── config/
    ├── reports/             (co nut Export Excel/PDF)
    └── notifications/
```

---

## 2. DATABASE SCHEMA (16 models)

### Models cu (giu nguyen tu v1):
- **User** (id, email, passwordHash, role, name, rank, parentId, isActive + indexes)
- **CtvHierarchy** (ctvId, managerId, level F1/F2/F3)
- **Agency** (userId, name, depositAmount, depositTier)
- **CommissionConfig** (tier CTV/PP/TP/GDV/GDKD, rates, fixedSalary)
- **AgencyCommissionConfig** (group A/B/C, commissionPct, bonusPct)
- **Product** (name, category, price, cogsPct)
- **TransactionItem** (transactionId, productId, qty, price)
- **Customer** (name, phone, ctvId/agencyId, totalSpent)
- **KpiLog** (ctvId, month, selfSales, portfolioSize, @@unique ctvId+month)
- **RankHistory** (ctvId, oldRank, newRank, reason, changedBy)
- **InventoryWarning** (productId, agencyId, quantity, warningType)
- **SyncLog** (source, recordsSynced, status)
- **Notification** (userId, type, title, content, isRead)

### Model Transaction (DA CAP NHAT):

```prisma
model Transaction {
  id              Int       @id @default(autoincrement())
  kiotvietOrderId String?   // Ma don tu KiotViet
  customerId      Int?
  ctvId           Int?
  agencyId        Int?
  channel         String    // ctv, agency, showroom
  totalAmount     Float
  cogsAmount      Float
  status          String    @default("CONFIRMED") // PENDING, CONFIRMED, REJECTED ← MOI
  paymentMethod   String?   // bank_transfer, cash ← MOI
  bankCode        String?   // 4 so cuoi TK ← MOI
  qrCodeData      String?   // QR base64 ← MOI
  bankReference   String?   // Ma tham chieu NH ← MOI
  ctvSubmittedAt  DateTime? // Thoi gian CTV tao ← MOI
  confirmedBy     Int?      // Admin xac nhan ← MOI
  confirmedAt     DateTime? // Thoi gian xac nhan ← MOI
  rejectedReason  String?   // Ly do tu choi ← MOI
  cashDepositId   Int?      // Link toi phieu nop tien ← MOI
  createdAt       DateTime  @default(now())

  // Relations
  customer     Customer?
  ctv          User?         @relation("CtvTransactions")
  agency       Agency?       @relation("AgencyTransactions")
  items        TransactionItem[]
  paymentProof PaymentProof? ← MOI
  cashDeposit  CashDeposit?  ← MOI

  // Indexes (15+)
  @@index([ctvId])
  @@index([agencyId])
  @@index([channel])
  @@index([createdAt])
  @@index([status])           ← MOI
  @@index([ctvId, status])    ← MOI
  @@index([ctvId, createdAt])
  @@index([agencyId, createdAt])
  @@index([channel, createdAt])
}
```

### Models MOI:

```prisma
model PaymentProof {
  id            Int       @id @default(autoincrement())
  transactionId Int       @unique
  imageUrl      String    // /uploads/proof_xxx.jpg
  uploadedBy    Int       // CTV userId
  uploadedAt    DateTime  @default(now())
  notes         String?

  transaction   Transaction @relation(...)
}

model CashDeposit {
  id             Int       @id @default(autoincrement())
  ctvId          Int
  amount         Float     // Tong tien nop
  transactionIds String    // JSON array: [1,2,3]
  depositedAt    DateTime  @default(now())
  confirmedBy    Int?      // Admin ID
  confirmedAt    DateTime?
  status         String    @default("PENDING") // PENDING, CONFIRMED, REJECTED
  notes          String?

  ctv            User      @relation("CtvDeposits")
  confirmAdmin   User?     @relation("AdminConfirmedDeposits")
  transactions   Transaction[]

  @@index([ctvId])
  @@index([status])
}
```

---

## 3. PAYMENT CONFIRMATION FLOW (CO CHE MOI)

### 3.1 Flow CTV ban hang qua Chuyen khoan:

```
CTV tao don ──→ Transaction(PENDING, bank_transfer)
     │              │
     │              ├── QR code duoc tao (VietQR format)
     │              ├── Noi dung CK: "CCB TX{id}"
     │              └── Notify admin: "GD moi #{id}"
     │
CTV upload anh chup CK ──→ PaymentProof(imageUrl)
     │
Admin xem anh + xac nhan ──→ Transaction(CONFIRMED)
     │                           │
     │                           ├── Customer.totalSpent += amount
     │                           ├── Invalidate cache (commission, dashboard)
     │                           └── Notify CTV: "GD #{id} da xac nhan"
     │
     └── HOAC Admin tu choi ──→ Transaction(REJECTED)
                                    └── Notify CTV: "GD #{id} bi tu choi. Ly do: ..."
```

### 3.2 Flow CTV ban hang thu Tien mat:

```
CTV tao don ──→ Transaction(PENDING, cash)
     │
     │ (CTV giu tien mat)
     │
CTV gop nhieu don → POST /cash-deposit ──→ CashDeposit(PENDING)
     │                                         │
     │                                         ├── Link transactions → cashDepositId
     │                                         └── Notify admin: "CTV nop {amount}"
     │
Admin xac nhan phieu nop ──→ CashDeposit(CONFIRMED)
     │                           │
     │                           ├── Tat ca transactions → CONFIRMED
     │                           ├── Customer.totalSpent += amount (each)
     │                           ├── Invalidate cache
     │                           └── Notify CTV: "Phieu #{id} da xac nhan"
```

### 3.3 Cron job kiem tra CTV giu tien (moi 6h):

```
Cron (0 */6 * * *) ──→ Tim cash txns PENDING > 24h
     │
     ├── 24h - 48h: Gui nhac nho CTV
     │
     └── > 48h: KHOA tai khoan CTV (isActive = false)
                  └── Notify admin: "CTV {name} bi khoa do giu tien"
```

### 3.4 Commission chi tinh CONFIRMED:

```javascript
// TRUOC (loi): tinh tat ca transactions
where: { channel: 'ctv', createdAt: ... }

// SAU (da fix): chi tinh CONFIRMED
where: { channel: 'ctv', status: 'CONFIRMED', createdAt: ... }
```

---

## 4. BACKEND API ENDPOINTS (TOAN BO)

### Auth (2 endpoints)
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/login | Login (email, password) → JWT 7d |
| GET | /api/auth/me | Current user info |

### CTV Dashboard (5 endpoints)
| Method | Path | Cache | Description |
|--------|------|-------|-------------|
| GET | /api/ctv/dashboard | 5min | Revenue, combos, commission, chart |
| GET | /api/ctv/tree | 5min | Team hierarchy (2Q + in-memory) |
| GET | /api/ctv/customers | - | Customer list |
| GET | /api/ctv/transactions | - | Paginated (old, giu tuong thich) |
| GET | /api/ctv/products | - | Product catalog |

### CTV Transactions - MOI (7 endpoints)
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/ctv/transactions/create | Tao don ban hang (QR + notify) |
| POST | /api/ctv/transactions/:id/upload-proof | Upload anh chup CK (multer, 5MB) |
| GET | /api/ctv/transactions/pending | DS giao dich PENDING |
| GET | /api/ctv/transactions/history | Lich su GD (filter by status) |
| GET | /api/ctv/transactions/pending-cash | DS tien mat chua nop |
| POST | /api/ctv/transactions/cash-deposit | Tao phieu nop tien mat |
| GET | /api/ctv/transactions/pending-count | Count pending (sidebar badge) |

### Admin Dashboard (12 endpoints)
| Method | Path | Cache | Description |
|--------|------|-------|-------------|
| GET | /api/admin/dashboard | 5min | Revenue, costs, salary fund |
| GET | /api/admin/ctvs | - | All CTVs (_count optimized) |
| GET | /api/admin/ctv-tree | 5min | Full hierarchy (1Q + memory) |
| POST | /api/admin/ctv/:id/reassign | - | Reassign (cycle validation) |
| POST | /api/admin/ctv/:id/rank | - | Change rank (+ notification) |
| GET | /api/admin/agencies | - | Agencies (groupBy revenue) |
| GET | /api/admin/config/commission | - | Commission rates |
| PUT | /api/admin/config/commission/:tier | - | Update rates |
| GET | /api/admin/reports/financial | 10min | Monthly P&L |
| GET | /api/admin/kpi-logs | - | Last 50 KPI logs |
| POST | /api/admin/rank-evaluation | - | Manual trigger auto-rank |
| POST | /api/admin/sync | - | KiotViet sync (via queue) |

### Admin Reconciliation - MOI (7 endpoints)
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/admin/reconciliation/pending | DS GD cho duyet (filter by PT) |
| POST | /api/admin/reconciliation/:id/confirm | Xac nhan GD |
| POST | /api/admin/reconciliation/:id/reject | Tu choi GD (can ly do) |
| GET | /api/admin/reconciliation/stats | Thong ke doi soat |
| GET | /api/admin/reconciliation/cash-deposits/pending | DS phieu nop tien cho |
| POST | /api/admin/reconciliation/cash-deposits/:id/confirm | Duyet phieu nop |
| POST | /api/admin/reconciliation/cash-deposits/:id/reject | Tu choi phieu nop |

### Admin Reports (2 export endpoints)
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/admin/reports/export/excel | Download .xlsx (ExcelJS) |
| GET | /api/admin/reports/export/pdf | HTML report (print-to-PDF) |

### Notifications (3 endpoints)
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/notifications | Paginated (unreadOnly filter) |
| POST | /api/notifications/:id/read | Mark as read |
| POST | /api/notifications/read-all | Mark all as read |

### Webhook (1 endpoint)
| Method | Path | Description |
|--------|------|-------------|
| POST | /webhook/kiotviet/order | KiotViet order webhook |

**TONG: 46 API endpoints**

---

## 5. SERVICES CHI TIET

### 5.1 transaction.js (MOI)

```
Config:
  BANK_ACCOUNT = { bankName: 'Vietcombank', accountNo: '1903698888', accountName: 'CONG TY TNHH CCB MART' }
  COMBO_PRICE = 2,000,000 VND
  COMBO_COGS_PCT = 50%

Functions:
  generateQRData(transactionId, amount) → QR base64 string (qrcode lib)
  createCtvTransaction(ctvId, {customerId, customerName, customerPhone, paymentMethod, bankCode})
    → Validate CTV active
    → Find/create customer
    → Create Transaction(PENDING)
    → Generate QR (if bank_transfer)
    → Notify admins
    → Return {transactionId, qrCodeData, bankAccount, transferContent}

  uploadPaymentProof(transactionId, ctvId, imageUrl, notes)
    → Validate ownership + PENDING status
    → Upsert PaymentProof

  confirmTransaction(transactionId, adminId, notes)
    → Update status → CONFIRMED
    → Customer.totalSpent += amount
    → Invalidate commission cache + dashboard cache
    → Notify CTV

  rejectTransaction(transactionId, adminId, reason)
    → Update status → REJECTED, rejectedReason
    → Notify CTV with reason

  createCashDeposit(ctvId, transactionIds, notes)
    → Validate all txns: same CTV, cash, PENDING, no existing deposit
    → Calculate total
    → Create CashDeposit
    → Link transactions → cashDepositId
    → Notify admins

  confirmCashDeposit(depositId, adminId, notes)
    → Update deposit → CONFIRMED
    → Update all linked transactions → CONFIRMED
    → Customer.totalSpent for each
    → Invalidate caches
    → Notify CTV

  getReconciliationStats()
    → pendingCount, pendingAmount, pendingDeposits
    → avgConfirmTimeHours, pendingByMethod {bank_transfer, cash}
```

### 5.2 commission.js (DA CAP NHAT)

```
THAY DOI CHINH: Chi tinh CONFIRMED transactions

Commission Rates:
  CTV:  20% self, 0 F1/F2/F3, 0 luong
  PP:   20% self, 0 F1/F2/F3, 5M luong
  TP:   30% self, 10% F1, 10M luong
  GDV:  35% self, 10% F1, 5% F2, 18M luong
  GDKD: 38% self, 10% F1, 5% F2, 3% F3, 30M luong

Algorithm (2-3 queries, N+1 fixed):
  Query 1: ALL transactions WHERE channel='ctv' AND status='CONFIRMED' AND month
  Query 2: ALL active CTVs
  → Build revenueMap (ctvId → totalRevenue) in memory
  → Build childrenMap (parentId → [childIds]) in memory
  → Traverse F1 → F2 → F3 in memory
  → LRU cache (1000 entries)

Salary Fund: aggregate WHERE status='CONFIRMED', cap = ctvRevenue * 5%
```

### 5.3 checkUnsubmittedCash.js (MOI)

```
Cron: "0 */6 * * *" (moi 6 gio)

Logic:
  1. Tim cash txns PENDING, khong co cashDepositId, > 24h
  2. Group by CTV
  3. 24h-48h: Gui notification nhac nho
  4. > 48h: Khoa tai khoan (isActive = false)
     → Notify CTV: "Tai khoan bi khoa"
     → Notify admins: "CTV {name} bi khoa"
```

### 5.4 Cac services khac (khong doi)

- **cache.js**: Redis + in-memory fallback, getCachedOrCompute, invalidateCache
- **treeValidator.js**: wouldCreateCycle, validateReassignment, getDescendantCount
- **notification.js**: createNotification, notifyAdmins, sendSalaryWarning, sendRankChangeNotification
- **autoRankUpdate.js**: Cron 00:05 ngay 1/thang, determineRankByKpi, KPI thresholds
- **syncQueue.js**: BullMQ + direct fallback, webhook order processing

---

## 6. FRONTEND PAGES (24 pages)

### CTV (8 pages):
| Page | Path | Mo ta |
|------|------|-------|
| Dashboard | /ctv/dashboard | Revenue, combos, commission, chart |
| **Tao don** | **/ctv/sales/create** | **4-step wizard: KH → PT → QR/Cash → Done** |
| **Giao dich** | **/ctv/transactions** | **Tabs: Tat ca / Cho duyet / Da duyet / Tu choi** |
| **Nop tien mat** | **/ctv/cash** | **Chon GD cash → Tao phieu nop** |
| Khach hang | /ctv/customers | Customer list |
| San pham | /ctv/products | Product catalog |
| Thong bao | /ctv/notifications | Notification center |

### Agency (4 pages): Khong doi

### Admin (7 pages):
| Page | Path | Mo ta |
|------|------|-------|
| Dashboard | /admin/dashboard | Revenue, costs, salary fund |
| **Doi soat** | **/admin/reconciliation** | **Tab GD + Tab Nop tien | Stats | Confirm/Reject** |
| Quan ly CTV | /admin/ctv | CTV table + tree |
| Dai ly | /admin/agencies | Agency list |
| Cau hinh | /admin/config | Commission rates, KPI thresholds |
| Bao cao | /admin/reports | P&L charts + **Export Excel/PDF** |
| Thong bao | /admin/notifications | Notification center |

### Chi tiet trang CTV Tao don (/ctv/sales/create):

```
Step 1: Nhap ten + SDT khach hang
Step 2: Chon PT thanh toan (Chuyen khoan / Tien mat)
  - Chuyen khoan: Nhap 4 so cuoi TK (tuy chon)
  - Tien mat: Hien canh bao 24h/48h
Step 3: Ket qua
  - Hien QR code + thong tin CK (neu bank_transfer)
  - Upload anh chup chuyen khoan
  - Hoac huong dan nop tien mat (neu cash)
Step 4: Hoan tat
```

### Chi tiet trang Admin Doi soat (/admin/reconciliation):

```
Stats cards: GD cho duyet | Tong tien | TG cho TB | Phieu nop cho
Tab 1 - Giao dich: Table voi filter (CK/TM)
  → Moi dong: ID, CTV, Khach, So tien, PT, 4 so, TG, Xem anh, [Duyet] [Tu choi]
  → Modal xem anh PaymentProof
  → Modal tu choi (nhap ly do)
Tab 2 - Nop tien mat: DS CashDeposit PENDING
  → Moi phieu: CTV, so tien, so GD, TG nop, [Xac nhan]
```

---

## 7. NOTIFICATION TYPES (TOAN BO)

| Type | Trigger | Gui cho |
|------|---------|---------|
| NEW_TRANSACTION | CTV tao don moi | Admin |
| TRANSACTION_CONFIRMED | Admin duyet GD | CTV |
| TRANSACTION_REJECTED | Admin tu choi GD | CTV |
| CASH_DEPOSIT | CTV nop tien mat | Admin |
| CASH_DEPOSIT_CONFIRMED | Admin duyet phieu nop | CTV |
| CASH_REMINDER | Cron: cash > 24h | CTV |
| ACCOUNT_LOCKED | Cron: cash > 48h | CTV + Admin |
| RANK_CHANGE | Auto rank hoac admin | CTV |
| RANK_UPDATE_REPORT | Cron rank monthly | Admin |
| SALARY_WARNING | Dashboard load (>=80%) | Admin |

---

## 8. SECURITY

| Feature | Chi tiet |
|---------|----------|
| JWT | 7d expiry, env var required in production |
| Rate limit | Global 100/15m, Login 5/15m |
| Validation | Joi schemas on all write endpoints |
| File upload | multer: 5MB max, jpg/png/webp only |
| Cycle detection | wouldCreateCycle before CTV reassign |
| Cash control | Auto-lock CTV account after 48h hold |
| Commission | Only CONFIRMED transactions counted |

---

## 9. CRON JOBS

| Job | Schedule | Description |
|-----|----------|-------------|
| autoRankUpdate | 00:05 ngay 1/thang | Danh gia KPI + thang/ha cap CTV |
| checkUnsubmittedCash | Moi 6h | Nhac nho 24h, khoa TK 48h |

---

## 10. PERFORMANCE OPTIMIZATIONS

| Van de | Giai phap | Ket qua |
|--------|-----------|---------|
| N+1 Query commission | 2 queries + in-memory tree | 50+ queries → 2 |
| Dashboard load cham | Redis/in-memory cache TTL 5min | < 200ms |
| CTV tree recursive DB | 1 query + in-memory build | O(n) thay vi O(n^2) |
| Admin /ctvs N+1 count | Prisma _count include | 30+ queries → 1 |
| Admin /agencies N+1 | groupBy batch aggregate | N+1 → 2 |
| Khong co DB indexes | 15+ indexes tren Transaction, User, KpiLog | Query nhanh 10x |

---

## 11. DEPLOYMENT

```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
  api:
    build: ./backend (Node 20 Alpine)
    ports: ["4000:4000"]
    env: JWT_SECRET, REDIS_HOST=redis
    depends_on: [redis]
```

```
# .env.example
PORT=4000
JWT_SECRET=change-this-in-production
REDIS_HOST=localhost (optional)
DATABASE_URL=file:./prisma/dev.db
```

---

## 12. BANG TONG HOP VAN DE DA FIX

| # | Van de | Trang thai | Giai phap |
|---|--------|-----------|-----------|
| 1 | N+1 Query commission | ✅ | 2Q + LRU cache + in-memory tree |
| 2 | Thieu auto rank | ✅ | Cron job 1st/month + manual trigger |
| 3 | Thieu Redis cache | ✅ | Redis + in-memory fallback, TTL 5min |
| 4 | Thieu queue sync | ✅ | BullMQ + direct fallback |
| 5 | Thieu cycle validation | ✅ | wouldCreateCycle + validateReassignment |
| 6 | Thieu DB indexes | ✅ | 15+ indexes |
| 7 | Thieu notifications | ✅ | 10 notification types + bell badge |
| 8 | Thieu export bao cao | ✅ | Excel (ExcelJS) + PDF (HTML) |
| 9 | Security issues | ✅ | JWT env + rate limiting + Joi |
| 10 | **Thieu xac nhan tien CTV** | **✅** | **Full payment confirmation system** |
| 11 | **CTV khong tao duoc don** | **✅** | **POST /create + QR code** |
| 12 | **Khong doi soat** | **✅** | **Admin reconciliation dashboard** |
| 13 | **CTV giu tien mat** | **✅** | **Cron 6h: nhac 24h, khoa 48h** |
| 14 | **Commission tinh PENDING** | **✅** | **Chi tinh status=CONFIRMED** |
| 15 | **Khong upload bang chung** | **✅** | **multer + PaymentProof model** |
| 16 | **Khong nop tien mat** | **✅** | **CashDeposit batch system** |

---

## 13. DIEM CAN LUU Y CHO DEEPSEEK REVIEW

1. **Database la SQLite** (dev). Production nen chuyen PostgreSQL.
2. **Redis optional** - khong co Redis van chay duoc voi in-memory cache.
3. **BullMQ optional** - fallback direct execution.
4. **Commission rates hardcoded** trong code + co CommissionConfig table (chua sync 2 chieu).
5. **File upload** luu local disk (`/uploads/`). Production nen dung S3/MinIO.
6. **QR code** hien tai la text-based. Production nen dung VietQR API thuc.
7. **Auto rank cron** chay trong process. Production nen tach worker rieng.
8. **Export PDF** dung HTML (browser print). Khong dung Puppeteer de tranh dependency nang.
9. **Transaction.status default = 'CONFIRMED'** cho backward compatibility voi data cu (agency/showroom channel). Chi CTV channel moi tao PENDING.
10. **CashDeposit.transactionIds** luu dang JSON string vi SQLite khong ho tro array native.
