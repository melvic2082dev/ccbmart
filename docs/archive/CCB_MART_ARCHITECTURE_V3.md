# CCB MART - KIEN TRUC & CODE V3 (FINAL)
> 22 models | 66 API endpoints | 33 pages | 4 cron jobs | Full CRUD Config
> Theme: DesignMax (Inter font, blue/indigo, w-16 sidebar, glass-card)

---

## 1. TECH STACK

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16.2.3, React 19, Tailwind 4, Shadcn/UI, Recharts |
| Backend | Express.js 4.21, Prisma 6.6 (SQLite) |
| Auth | JWT 7d + bcrypt |
| Cache | ioredis (optional) + in-memory fallback |
| Queue | BullMQ (optional) + direct fallback |
| Cron | node-cron (4 jobs) |
| Validation | Joi (12 schemas) |
| Upload | multer (5MB, jpg/png/webp) |
| Export | ExcelJS (.xlsx), HTML (.pdf) |

---

## 2. DATABASE - 22 MODELS

### Core:
- **User** (email, passwordHash, role[ctv/agency/admin/member], name, rank[CTV/PP/TP/GDV/GDKD], parentId, isActive)
- **CtvHierarchy** (ctvId, managerId, level[F1/F2/F3])
- **Agency** (userId, name, depositAmount, depositTier)
- **Product** (name, category, price, cogsPct)
- **Customer** (name, phone, ctvId, agencyId, totalSpent)

### Transaction:
- **Transaction** (customerId, ctvId, agencyId, channel[ctv/agency/showroom], totalAmount, cogsAmount, **status[PENDING/CONFIRMED/REJECTED]**, paymentMethod[bank_transfer/cash], bankCode, qrCodeData, confirmedBy, confirmedAt, rejectedReason, cashDepositId)
- **TransactionItem** (transactionId, productId, quantity, unitPrice)
- **PaymentProof** (transactionId @unique, imageUrl, uploadedBy, notes)
- **CashDeposit** (ctvId, amount, transactionIds[JSON], status, confirmedBy)

### Config (CRUD):
- **CommissionConfig** (tier @unique, selfSalePct, f1Pct, f2Pct, f3Pct, fixedSalary)
- **AgencyCommissionConfig** (group @unique [A/B/C], commissionPct, bonusPct)
- **KpiConfig** (rank @unique, minSelfCombo, minPortfolio, fallbackRank)
- **CogsConfig** (phase @unique, name, cogsPct, description)

### Membership:
- **MembershipTier** (name @unique, minDeposit, discountPct, referralPct, monthlyReferralCap)
- **MemberWallet** (userId @unique, tierId, balance, referralCode @unique, referredById, referralEarned, monthlyReferralEarned)
- **DepositHistory** (walletId, amount, method, status)
- **ReferralCommission** (earnerWalletId, sourceWalletId, amount, ratePct, month)

### System:
- **KpiLog** (ctvId, month, selfSales, portfolioSize, rankBefore, rankAfter)
- **RankHistory** (ctvId, oldRank, newRank, reason, changedBy)
- **InventoryWarning** (productId, agencyId, quantity, warningType)
- **SyncLog** (source, recordsSynced, status)
- **Notification** (userId, type, title, content, isRead)

---

## 3. COMMISSION LOGIC (N+1 FIXED)

```
CTV:  20% self, 0 F1/F2/F3, 0 luong
PP:   20% self, 5M luong
TP:   30% self, 10% F1, 10M luong
GDV:  35% self, 10% F1, 5% F2, 18M luong
GDKD: 38% self, 10% F1, 5% F2, 3% F3, 30M luong

CHI TINH status='CONFIRMED'
2 queries + in-memory tree + LRU cache (1000 entries)
```

---

## 4. PAYMENT CONFIRMATION

```
CTV tao don -> Transaction(PENDING) + QR code (bank) hoac thu tien mat
CTV upload anh CK -> PaymentProof
Admin duyet -> CONFIRMED -> tinh commission + notify CTV
Admin tu choi -> REJECTED + ly do -> notify CTV

Tien mat: CTV gop nhieu don -> CashDeposit -> Admin duyet

Cron (6h): >24h nhac nho, >48h khoa tai khoan
```

---

## 5. MEMBERSHIP/REFERRAL

| Tier | Min Deposit | Discount | Referral | Cap/thang |
|------|------------|----------|----------|-----------|
| Green | 0 | 0% | 0% | 0 |
| Basic | 200k | 3% | 0% | 0 |
| Standard | 500k | 7% | 2% | 500k |
| VIP Gold | 2M | 12% | 5% | 500k |

Referral: 1 cap, khong multi-level, reset cap ngay 1/thang

---

## 6. CONFIG CRUD (MOI)

### Frontend: /admin/config (4 tabs)

| Tab | Chuc nang |
|-----|-----------|
| CTV Commission | Edit inline, them, xoa (CTV/GDKD khong xoa duoc) |
| KPI Rules | Edit minSelfCombo, minPortfolio, fallbackRank dropdown |
| Agency Commission | Edit commissionPct + bonusPct (validate tong <= 30%) |
| COGS Phases | Edit name, cogsPct, description |

Reset mac dinh: POST /api/admin/config/reset-default

### Backend APIs:
```
GET    /api/admin/config/commission
POST   /api/admin/config/commission       (them moi)
PUT    /api/admin/config/commission/:tier  (sua)
DELETE /api/admin/config/commission/:tier  (xoa, tru CTV/GDKD)
GET    /api/admin/config/kpi
PUT    /api/admin/config/kpi/:rank        (upsert)
GET    /api/admin/config/agency
PUT    /api/admin/config/agency/:group    (validate <= 30%)
GET    /api/admin/config/cogs
PUT    /api/admin/config/cogs/:phase      (upsert)
POST   /api/admin/config/reset-default    (reset tat ca)
```

---

## 7. ALL 66 API ENDPOINTS

| Group | Count | Endpoints |
|-------|-------|-----------|
| Auth | 2 | login, me |
| CTV Dashboard | 5 | dashboard(cache), tree(cache), customers, transactions, products |
| CTV Transactions | 7 | create(QR), upload-proof, pending, history, pending-cash, cash-deposit, pending-count |
| Agency | 3 | dashboard(cache), inventory, transactions |
| Admin Dashboard | 12 | dashboard(cache), ctvs, ctv-tree(cache), reassign, rank, agencies, commission, update-commission, reports(cache), kpi-logs, rank-evaluation, sync |
| Admin Reconciliation | 7 | pending, confirm, reject, stats, cash-deposits/pending, cash-deposits/confirm, cash-deposits/reject |
| Admin Config | 11 | commission(CRUD), kpi(RU), agency(RU), cogs(RU), reset-default |
| Admin Membership | 7 | tiers(RU), deposits(confirm/reject), referral-report, wallets |
| Member | 6 | register, wallet, deposit, transactions, referral-stats, redeem-code |
| Export | 2 | excel, pdf |
| Notifications | 3 | list, mark-read, mark-all-read |
| Webhook | 1 | kiotviet/order |
| Health | 1 | health check |

---

## 8. CRON JOBS (4)

| Job | Schedule | Mo ta |
|-----|----------|-------|
| autoRankUpdate | 00:05 1st/month | KPI -> thang/ha cap CTV |
| checkUnsubmittedCash | Every 6h | Nhac 24h, khoa 48h |
| resetReferralCap | 00:00 1st/month | Reset monthlyReferralEarned |
| syncQueue Worker | Realtime | KiotViet webhook |

---

## 9. FRONTEND - 33 PAGES

### Theme DesignMax:
- Font: Inter (Google Fonts)
- Sidebar: Fixed w-16, white bg, border-r border-gray-100
- Logo: Gradient circle from-indigo-500 to-purple-600
- Active: bg-indigo-50 text-indigo-600
- Background: #f8fafc
- Cards: rounded-2xl, border-gray-100
- Buttons: Gradient from-blue-500 to-indigo-500
- Effects: glass-card, gradient-border, floating-card, animate-float

### Pages:
- /login, /register
- /ctv/* (8 pages): dashboard, sales/create, transactions, cash, customers, products, notifications
- /agency/* (4 pages): dashboard, inventory, transactions, notifications
- /admin/* (12 pages): dashboard, reconciliation, ctv, agencies, membership/{wallets,deposits,tiers,referrals}, **config (4 tabs CRUD)**, reports, notifications
- /member/* (5 pages): dashboard, topup, transactions, referral, notifications

---

## 10. FILE STRUCTURE

```
backend/src/
  server.js (11 route mounts, 4 cron jobs)
  middleware/ (auth.js, rateLimiter.js, validate.js)
  services/ (commission.js, transaction.js, membership.js, cache.js, treeValidator.js, notification.js)
  jobs/ (autoRankUpdate.js, checkUnsubmittedCash.js, resetReferralCap.js)
  queues/ (syncQueue.js)
  routes/ (auth, admin, ctv, ctvTransactions, agency, reconciliation, config, members, adminMembership, notifications, reports)

frontend/src/
  lib/api.ts (66 API methods)
  components/ (Sidebar w-16, DashboardLayout ml-16, NotificationsPage)
  app/ (login, register, ctv/*, agency/*, admin/*, member/*)
```

---

## 11. SEED DATA

| Data | Count |
|------|-------|
| Admin | 1 (admin@ccbmart.vn / admin123) |
| CTV | 30 (ctv1@ / ctv123, rank GDKD->CTV) |
| Agency | 3 (agency1@ / agency123) |
| Member | 20 (member1@ / member123, 4 tiers) |
| Products | 15 |
| Customers | 100 |
| Transactions CONFIRMED | 500 |
| Transactions PENDING | 10 + 4 payment proofs |
| KPI Config | 5 ranks |
| COGS Config | 4 phases |
| Membership Tiers | 4 |
| Deposit History | 30 |
| Referral Commissions | ~10 |

---

## 12. SECURITY

- JWT: env var required in production
- Rate limit: 1000/15m global, 5/15m login
- Joi validation on all write endpoints
- File upload: 5MB max, image only
- Cycle detection on CTV reassign
- Cash hold: auto-lock >48h
- Commission: CONFIRMED only
- Config: CTV/GDKD tiers protected from deletion
- Agency: commission+bonus <= 30% enforced
