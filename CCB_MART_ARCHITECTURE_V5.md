# CCB MART - KIEN TRUC V5 (FINAL)
> 22 models | 66 API endpoints | 33 pages | 4 cron jobs
> Theme: DesignMax (dark sidebar, light/dark mode, responsive)

---

## 1. TECH STACK

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16.2.3, React 19, Tailwind 4, Shadcn/UI, Recharts |
| Backend | Express.js 4.21, Prisma 6.6 (SQLite) |
| Auth | JWT 7d + bcrypt |
| Cache | ioredis (optional) + in-memory LRU fallback |
| Queue | BullMQ (optional) + direct fallback |
| Cron | node-cron (4 jobs) |
| Validation | Joi (12 schemas) |
| Upload | multer (5MB, jpg/png/webp) |
| Export | ExcelJS (.xlsx), HTML (.pdf) |

---

## 2. DATABASE - 22 MODELS

### Core:
- **User** (email, passwordHash, role[ctv/agency/admin/member], name, rank[CTV/PP/TP/GDV/GDKD], parentId, isActive)
  - @@index([parentId]), @@index([rank]), @@index([role,isActive])
- **CtvHierarchy** (ctvId, managerId, level[F1/F2/F3])
- **Agency** (userId, name, depositAmount, depositTier)
- **Product** (name, category, price, cogsPct)
- **Customer** (name, phone, ctvId, agencyId, totalSpent)

### Transaction + Payment:
- **Transaction** (customerId, ctvId, agencyId, channel, totalAmount, cogsAmount, **status[PENDING/CONFIRMED/REJECTED]**, paymentMethod[bank_transfer/cash], bankCode, qrCodeData, confirmedBy, confirmedAt, rejectedReason, cashDepositId)
  - @@index([ctvId]), @@index([status]), @@index([ctvId,status])
- **TransactionItem** (transactionId, productId, quantity, unitPrice)
- **PaymentProof** (transactionId @unique, imageUrl, uploadedBy, notes)
- **CashDeposit** (ctvId, amount, transactionIds[JSON], status, confirmedBy)

### Config (Full CRUD):
- **CommissionConfig** (tier @unique, selfSalePct, f1Pct, f2Pct, f3Pct, fixedSalary)
- **AgencyCommissionConfig** (group @unique, commissionPct, bonusPct)
- **KpiConfig** (rank @unique, minSelfCombo, minPortfolio, fallbackRank)
- **CogsConfig** (phase @unique, name, cogsPct, description)

### Membership:
- **MembershipTier** (name @unique, minDeposit, discountPct, referralPct, monthlyReferralCap)
- **MemberWallet** (userId @unique, tierId, balance, referralCode @unique, referredById, referralEarned, monthlyReferralEarned)
- **DepositHistory** (walletId, amount, method, status)
- **ReferralCommission** (earnerWalletId, sourceWalletId, amount, ratePct, month)

### System:
- **KpiLog** (ctvId, month, selfSales, portfolioSize) @@unique([ctvId,month])
- **RankHistory** (ctvId, oldRank, newRank, reason, changedBy)
- **InventoryWarning** (productId, agencyId, quantity, warningType)
- **SyncLog** (source, recordsSynced, status)
- **Notification** (userId, type, title, content, isRead) @@index([userId,isRead])

---

## 3. COMMISSION (N+1 FIXED)

```
CTV:  20% self, 0 luong        | PP:  20% self, 5M luong
TP:   30% self, 10% F1, 10M    | GDV: 35% self, 10% F1, 5% F2, 18M
GDKD: 38% self, 10% F1, 5% F2, 3% F3, 30M

CHI TINH status='CONFIRMED'
2 queries + in-memory tree + LRU cache (1000 entries)
```

---

## 4. PAYMENT CONFIRMATION

```
CTV tao don -> PENDING + QR (bank) hoac thu tien mat
CTV upload anh CK -> PaymentProof
Admin duyet -> CONFIRMED -> commission + notify
Admin tu choi -> REJECTED + ly do

Tien mat: CTV gop don -> CashDeposit -> Admin duyet
Cron 6h: >24h nhac, >48h khoa TK
```

---

## 5. MEMBERSHIP/REFERRAL

| Tier | Min Deposit | Discount | Referral | Cap/thang |
|------|------------|----------|----------|-----------|
| Green | 0 | 0% | 0% | 0 |
| Basic | 200k | 3% | 0% | 0 |
| Standard | 500k | 7% | 2% | 500k |
| VIP Gold | 2M | 12% | 5% | 500k |

1 cap referral, reset cap ngay 1/thang, khong tu gioi thieu

---

## 6. CONFIG CRUD (4 TABS)

| Tab | CRUD | Endpoints |
|-----|------|-----------|
| CTV Commission | Create/Read/Update/Delete | GET/POST/PUT/DELETE /api/admin/config/commission |
| KPI Rules | Read/Update | GET/PUT /api/admin/config/kpi/:rank |
| Agency Commission | Read/Update | GET/PUT /api/admin/config/agency/:group (validate <=30%) |
| COGS Phases | Read/Update | GET/PUT /api/admin/config/cogs/:phase |
| Reset All | - | POST /api/admin/config/reset-default |

---

## 7. ALL 66 API ENDPOINTS

| Group | # | Key endpoints |
|-------|---|--------------|
| Auth | 2 | login (rate limit 5/15m), me |
| CTV Dashboard | 5 | dashboard(cache 5m), tree(cache), customers, transactions, products |
| CTV Transactions | 7 | create(QR), upload-proof(multer), pending, history, pending-cash, cash-deposit, pending-count |
| Agency | 3 | dashboard(cache), inventory, transactions |
| Admin Dashboard | 12 | dashboard(cache), ctvs, ctv-tree, reassign(cycle-check), rank(notify), agencies, reports(cache), kpi-logs, rank-evaluation, sync |
| Admin Reconciliation | 7 | pending, confirm, reject, stats, cash-deposits CRUD |
| Admin Config | 11 | commission CRUD, kpi RU, agency RU, cogs RU, reset-default |
| Admin Membership | 7 | tiers RU, deposits confirm/reject, referral-report, wallets |
| Member | 6 | register(public), wallet, deposit, transactions, referral-stats, redeem-code |
| Export | 2 | excel(.xlsx), pdf(.html) |
| Notifications | 3 | list, mark-read, mark-all |
| Webhook | 1 | kiotviet/order |
| Health | 1 | health check |

---

## 8. CRON JOBS (4)

| Job | Schedule | Description |
|-----|----------|-------------|
| autoRankUpdate | 00:05 1st/month | KPI eval -> promote/demote CTV |
| checkUnsubmittedCash | Every 6h | Remind >24h, lock >48h cash hold |
| resetReferralCap | 00:00 1st/month | Reset monthlyReferralEarned = 0 |
| syncQueue Worker | Realtime | KiotViet webhook processing |

---

## 9. FRONTEND - 33 PAGES + THEME

### Theme DesignMax:
- **Font**: Inter (Google Fonts)
- **Sidebar**: Dark navy (#0f172a), expand/collapse (w-16 ↔ w-56)
  - Collapsed: icon-only, hover tooltip
  - Expanded: icon + label, ChevronLeft to collapse
  - Mobile: hamburger menu (lg:hidden) + drawer overlay w-72
  - Active: #334155, Hover: #1e293b, Icons: gray-400 → white
  - Logo: gradient from-blue-500 to-blue-700
- **Dark Mode**: Toggle (Moon/Sun icon) in sidebar bottom
  - Light: bg #f8fafc, card #fff, text #1e293b
  - Dark: bg #0b1120, card #162032, text #f1f5f9, border #1e293b
  - CSS overrides for hardcoded Tailwind gray/slate classes
  - Saved to localStorage, persists across sessions
- **Cards**: rounded-2xl, border-gray-100, shadow-sm
- **Effects**: glass-card, gradient-border, floating-card
- **Responsive**: Mobile-first, sidebar overlay on mobile, grid cols adjust

### Pages (33):
| Role | # | Pages |
|------|---|-------|
| Auth | 2 | /login, /register |
| CTV | 8 | dashboard, sales/create, transactions(tabs), cash, customers, products, notifications |
| Agency | 4 | dashboard, inventory, transactions, notifications |
| Admin | 12 | dashboard, reconciliation, ctv, agencies, membership/{wallets,deposits,tiers,referrals}, config(4 tabs CRUD), reports(export), notifications |
| Member | 5 | dashboard(wallet+referral), topup(QR), transactions, referral, notifications |

---

## 10. FILE STRUCTURE

```
backend/src/
  server.js (12 route mounts, 4 cron jobs)
  middleware/ (auth.js, rateLimiter.js, validate.js)
  services/ (commission.js, transaction.js, membership.js, cache.js, treeValidator.js, notification.js)
  jobs/ (autoRankUpdate.js, checkUnsubmittedCash.js, resetReferralCap.js)
  queues/ (syncQueue.js)
  routes/ (auth, admin, ctv, ctvTransactions, agency, reconciliation, config, members, adminMembership, notifications, reports)

frontend/src/
  lib/api.ts (66+ methods)
  components/ (Sidebar[expand+dark+responsive], DashboardLayout[responsive], NotificationsPage)
  app/ (login, register, ctv/*, agency/*, admin/*, member/*)
```

---

## 11. SEED DATA

| Data | Count |
|------|-------|
| Admin | 1 (admin@ccbmart.vn / admin123) |
| CTV | 30 (ctv1@ / ctv123) |
| Agency | 3 (agency1@ / agency123) |
| Member | 20 (member1@ / member123) |
| Products | 15 |
| Customers | 100 |
| Transactions CONFIRMED | 500 |
| Transactions PENDING | 10 + 4 proofs |
| KPI Config | 5 ranks |
| COGS Config | 4 phases |
| Membership Tiers | 4 |
| Deposit History | 30 |

---

## 12. SECURITY

| Feature | Detail |
|---------|--------|
| JWT | env var required in production |
| Rate limit | 1000/15m global, 5/15m login |
| Joi | All write endpoints validated |
| Upload | 5MB max, image only |
| Cycle detect | CTV reassign validation |
| Cash control | Auto-lock >48h |
| Commission | CONFIRMED only |
| Config protect | CTV/GDKD tiers undeletable |
| Agency cap | commission+bonus <= 30% |

---

## 13. DIEM LUU Y CHO DEEPSEEK

1. SQLite (dev) -> production can PostgreSQL
2. Redis optional -> in-memory fallback hoat dong tot
3. Commission rates hardcoded + DB table (chua sync 2 chieu)
4. Upload local /uploads/ -> production can S3
5. QR text-based -> production can VietQR API
6. Transaction.status default='CONFIRMED' cho backward compat
7. CashDeposit.transactionIds la JSON string (SQLite)
8. Dark mode dung CSS class .dark + CSS variable overrides
9. Sidebar responsive: desktop fixed, mobile drawer overlay
10. Sidebar expand/collapse persisted localStorage
11. Font Inter via Google Fonts CDN (khong bundle)
12. Config CRUD co reset-default endpoint
