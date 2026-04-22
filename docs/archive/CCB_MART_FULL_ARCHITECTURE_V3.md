# CCB MART - KIEN TRUC & CODE V3
> 20 models | 59 API endpoints | 33 pages | 4 cron jobs
> Theme: DesignMax (Inter font, blue/indigo primary, w-16 sidebar)

---

## 1. TECH STACK

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16.2.3, React 19, Tailwind 4, Shadcn/UI |
| Backend | Express.js 4.21, Node.js 20 |
| ORM | Prisma 6.6 (SQLite dev, PostgreSQL prod) |
| Auth | JWT 7d + bcrypt |
| Cache | ioredis (optional) + in-memory fallback |
| Queue | BullMQ (optional) + direct fallback |
| Cron | node-cron (4 jobs) |
| Validation | Joi |
| Upload | multer (5MB, jpg/png/webp) |
| QR | qrcode lib |
| Export | ExcelJS (.xlsx), HTML (.pdf) |

---

## 2. DATABASE - 20 MODELS

```
User (id, email, passwordHash, role[ctv/agency/admin/member], name, rank, parentId, isActive)
  @@index([parentId]), @@index([rank]), @@index([role, isActive])

CtvHierarchy (ctvId, managerId, level[F1/F2/F3])
Agency (userId, name, depositAmount, depositTier[50tr/100tr/300tr])
CommissionConfig (tier[CTV/PP/TP/GDV/GDKD], selfSalePct, f1/f2/f3Pct, fixedSalary)
AgencyCommissionConfig (group[A/B/C], commissionPct, bonusPct)
Product (name, category[NS/TPCN/FMCG/GiaVi/CheBien/TienLoi], price, cogsPct)

Transaction (customerId, ctvId, agencyId, channel, totalAmount, cogsAmount,
  status[PENDING/CONFIRMED/REJECTED], paymentMethod[bank_transfer/cash],
  bankCode, qrCodeData, ctvSubmittedAt, confirmedBy, confirmedAt, rejectedReason, cashDepositId)
  @@index([ctvId]), @@index([status]), @@index([ctvId,status]), @@index([ctvId,createdAt])

TransactionItem (transactionId, productId, quantity, unitPrice, totalPrice)
Customer (name, phone, ctvId, agencyId, totalSpent)
KpiLog (ctvId, month, selfSales, portfolioSize, rankBefore, rankAfter) @@unique([ctvId,month])
RankHistory (ctvId, oldRank, newRank, reason, changedBy)
InventoryWarning (productId, agencyId, quantity, warningType)
SyncLog (source, recordsSynced, status)
Notification (userId, type, title, content, isRead) @@index([userId,isRead])
PaymentProof (transactionId @unique, imageUrl, uploadedBy, notes)
CashDeposit (ctvId, amount, transactionIds[JSON], status, confirmedBy)

MembershipTier (name[Green/Basic/Standard/VIP Gold], minDeposit, discountPct, referralPct, monthlyReferralCap)
MemberWallet (userId @unique, customerId, tierId, balance, totalDeposit,
  referralCode @unique, referredById, referralEarned, monthlyReferralEarned)
DepositHistory (walletId, amount, method, status, confirmedBy)
ReferralCommission (earnerWalletId, sourceWalletId, amount, ratePct, month)
```

---

## 3. COMMISSION LOGIC (N+1 FIXED)

```
CTV:  20% self, 0 F1/F2/F3, 0 luong
PP:   20% self, 0 F1/F2/F3, 5M luong
TP:   30% self, 10% F1, 10M luong
GDV:  35% self, 10% F1, 5% F2, 18M luong
GDKD: 38% self, 10% F1, 5% F2, 3% F3, 30M luong

Algorithm: 2 queries + in-memory tree traversal + LRU cache (1000 entries)
Query 1: ALL transactions WHERE channel='ctv' AND status='CONFIRMED' AND month
Query 2: ALL active CTVs
-> Build revenueMap + childrenMap in memory
-> Traverse F1 -> F2 -> F3 in memory
CHI TINH CONFIRMED TRANSACTIONS
```

---

## 4. PAYMENT CONFIRMATION FLOW

### CTV ban hang Chuyen khoan:
```
CTV tao don -> Transaction(PENDING, bank_transfer) + QR code
CTV upload anh CK -> PaymentProof
Admin xem + duyet -> Transaction(CONFIRMED)
  -> Customer.totalSpent += amount
  -> Invalidate cache
  -> Notify CTV
```

### CTV ban hang Tien mat:
```
CTV tao don -> Transaction(PENDING, cash)
CTV gop nhieu don -> POST /cash-deposit -> CashDeposit(PENDING)
Admin duyet phieu -> CashDeposit(CONFIRMED) + all linked txns -> CONFIRMED
```

### Cron kiem tra giu tien (moi 6h):
```
> 24h chua nop: Gui nhac nho CTV
> 48h chua nop: KHOA tai khoan CTV (isActive = false) + Notify admin
```

---

## 5. MEMBERSHIP/REFERRAL

### Tiers:
| Tier | Min Deposit | Discount | Referral % | Cap/thang |
|------|------------|----------|-----------|-----------|
| Green | 0 | 0% | 0% | 0 |
| Basic | 200,000 | 3% | 0% | 0 |
| Standard | 500,000 | 7% | 2% | 500,000 |
| VIP Gold | 2,000,000 | 12% | 5% | 500,000 |

### Referral logic:
- Khi deposit duoc confirm -> tinh referral cho nguoi gioi thieu
- Commission = deposit amount x referrer's tier referralPct
- Check monthlyReferralCap truoc khi cong
- Reset cap ve 0 vao ngay 1/thang (cron)
- Khong tu gioi thieu, chi 1 cap (khong multi-level)

### Role Guard:
- CTV commission -> KHONG tinh referral
- Agency margin -> KHONG tinh referral
- Member -> CO tinh referral (neu co referrer)

---

## 6. ALL 59 API ENDPOINTS

### Auth (2)
POST /api/auth/login (rate limit 5/15m)
GET /api/auth/me

### CTV Dashboard (5)
GET /api/ctv/dashboard (cache 5m)
GET /api/ctv/tree (cache 5m)
GET /api/ctv/customers
GET /api/ctv/transactions
GET /api/ctv/products

### CTV Transactions (7)
POST /api/ctv/transactions/create (QR code + notify admin)
POST /api/ctv/transactions/:id/upload-proof (multer 5MB)
GET /api/ctv/transactions/pending
GET /api/ctv/transactions/history?status=
GET /api/ctv/transactions/pending-cash
POST /api/ctv/transactions/cash-deposit
GET /api/ctv/transactions/pending-count

### Agency (3)
GET /api/agency/dashboard (cache 5m)
GET /api/agency/inventory
GET /api/agency/transactions

### Admin Dashboard (12)
GET /api/admin/dashboard (cache 5m)
GET /api/admin/ctvs (_count optimized)
GET /api/admin/ctv-tree (cache 5m, in-memory build)
POST /api/admin/ctv/:id/reassign (cycle validation)
POST /api/admin/ctv/:id/rank (+ notification)
GET /api/admin/agencies (groupBy revenue)
GET /api/admin/config/commission
PUT /api/admin/config/commission/:tier
GET /api/admin/reports/financial (cache 10m)
GET /api/admin/kpi-logs
POST /api/admin/rank-evaluation
POST /api/admin/sync

### Admin Reconciliation (7)
GET /api/admin/reconciliation/pending
POST /api/admin/reconciliation/:id/confirm
POST /api/admin/reconciliation/:id/reject
GET /api/admin/reconciliation/stats
GET /api/admin/reconciliation/cash-deposits/pending
POST /api/admin/reconciliation/cash-deposits/:id/confirm
POST /api/admin/reconciliation/cash-deposits/:id/reject

### Admin Membership (7)
GET /api/admin/membership/tiers
PUT /api/admin/membership/tiers/:id
GET /api/admin/membership/deposits
POST /api/admin/membership/deposits/:id/confirm (+ referral commission)
POST /api/admin/membership/deposits/:id/reject
GET /api/admin/membership/referral-report
GET /api/admin/membership/wallets

### Member (6)
POST /api/members/register (public)
GET /api/members/wallet
POST /api/members/deposit
GET /api/members/transactions
GET /api/members/referral-stats
POST /api/members/redeem-code

### Export (2)
GET /api/admin/reports/export/excel
GET /api/admin/reports/export/pdf

### Notifications (3)
GET /api/notifications
POST /api/notifications/:id/read
POST /api/notifications/read-all

### Webhook (1)
POST /webhook/kiotviet/order

---

## 7. CRON JOBS (4)

| Job | Schedule | Mo ta |
|-----|----------|-------|
| autoRankUpdate | 00:05 ngay 1/thang | KPI -> thang/ha cap CTV |
| checkUnsubmittedCash | Moi 6h | Nhac 24h, khoa TK 48h |
| resetReferralCap | 00:00 ngay 1/thang | Reset monthlyReferralEarned = 0 |
| syncQueue Worker | Realtime | Xu ly KiotViet webhook |

---

## 8. FRONTEND - 33 PAGES

### Theme (giong DesignMax):
- Font: Inter (Google Fonts)
- Primary: Blue #3b82f6 / Indigo #6366f1
- Sidebar: Fixed w-16, white bg, border-r border-gray-100
- Active state: bg-indigo-50 text-indigo-600
- Logo: Gradient circle from-indigo-500 to-purple-600
- Background: #f8fafc (surface)
- Cards: rounded-2xl, shadow-sm, border-gray-100
- Buttons: Gradient (from-blue-500 to-indigo-500), shadow-lg
- Effects: glass-card, gradient-border, floating-card, animate-float

### Pages:

| Role | Pages | Paths |
|------|-------|-------|
| Login | 1 | /login |
| Register | 1 | /register |
| CTV | 8 | /ctv/dashboard, sales/create, transactions, cash, customers, products, notifications |
| Agency | 4 | /agency/dashboard, inventory, transactions, notifications |
| Admin | 11 | /admin/dashboard, reconciliation, ctv, agencies, membership/wallets, membership/deposits, membership/tiers, membership/referrals, config, reports, notifications |
| Member | 5 | /member/dashboard, topup, transactions, referral, notifications |

---

## 9. SECURITY

| Feature | Config |
|---------|--------|
| JWT | 7d expiry, env var required in production |
| Rate limit | 1000/15m global, 5/15m login |
| Validation | Joi on all write endpoints |
| File upload | 5MB max, jpg/png/webp only |
| Cycle detect | wouldCreateCycle before CTV reassign |
| Cash control | Auto-lock CTV >48h holding cash |
| Commission | Only CONFIRMED counted |

---

## 10. SEED DATA

| Data | So luong |
|------|---------|
| Admin | 1 (admin@ccbmart.vn / admin123) |
| CTV | 30 (ctv1@ccbmart.vn / ctv123) |
| Agency | 3 (agency1@ccbmart.vn / agency123) |
| Member | 20 (member1@ccbmart.vn / member123) |
| Products | 15 |
| Customers | 100 |
| Transactions (CONFIRMED) | 500 |
| Transactions (PENDING) | 10 |
| Payment Proofs | 4 |
| Membership Tiers | 4 |
| Deposit History | 30 |
| Referral Commissions | ~10 |

---

## 11. FILE STRUCTURE

```
backend/
  prisma/schema.prisma (20 models)
  src/
    server.js (entry, 10 route mounts, 4 cron jobs)
    middleware/
      auth.js (JWT authenticate + authorize)
      rateLimiter.js (1000/15m global, 5/15m login)
      validate.js (10 Joi schemas)
    services/
      commission.js (LRU cache, 2Q, CONFIRMED only)
      transaction.js (QR, proof, confirm, cash deposit)
      membership.js (register, tiers, referral commission)
      cache.js (Redis + in-memory fallback)
      treeValidator.js (cycle detection)
      notification.js (10 notification types)
    jobs/
      autoRankUpdate.js (monthly rank eval)
      checkUnsubmittedCash.js (6h cash check)
      resetReferralCap.js (monthly cap reset)
    queues/
      syncQueue.js (BullMQ + fallback)
    routes/
      auth.js (2 endpoints)
      admin.js (12 endpoints)
      ctv.js (5 endpoints)
      ctvTransactions.js (7 endpoints)
      agency.js (3 endpoints)
      reconciliation.js (7 endpoints)
      members.js (6 endpoints)
      adminMembership.js (7 endpoints)
      notifications.js (3 endpoints)
      reports.js (2 endpoints)

frontend/
  src/
    lib/api.ts (59 API methods + formatVND, fetchMultipart)
    components/
      Sidebar.tsx (w-16 icon-only, designmax style)
      DashboardLayout.tsx (ml-16, surface bg)
      NotificationsPage.tsx (reusable)
    app/
      login/ register/
      ctv/ (8 pages)
      agency/ (4 pages)
      admin/ (11 pages)
      member/ (5 pages)
```

---

## 12. LUU Y CHO DEEPSEEK

1. SQLite (dev) -> production can PostgreSQL
2. Redis optional -> in-memory fallback
3. BullMQ optional -> direct execution fallback
4. Commission rates hardcoded + CommissionConfig table (chua sync 2 chieu)
5. Upload luu local /uploads/ -> production can S3
6. QR code text-based -> production can VietQR API
7. Transaction.status default='CONFIRMED' cho backward compat (agency/showroom)
8. CashDeposit.transactionIds la JSON string (SQLite khong co array)
9. Auto rank chay trong process -> production tach worker
10. Theme da giong designmax: w-16 sidebar, Inter font, blue/indigo, glass-card
