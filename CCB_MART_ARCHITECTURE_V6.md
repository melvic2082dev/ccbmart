# CCB MART (X-WISE) - KIEN TRUC V6
> 24 models | 80+ API endpoints | 34 pages | 4 cron jobs | PWA + Push + Payment + Import
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
| Upload | multer (5MB image, 10MB excel) |
| Export | ExcelJS (.xlsx), HTML (.pdf) |
| Import | xlsx (parse Excel) |
| PWA | Service Worker + manifest.json |
| Push | web-push (VAPID) |
| Payment | Momo API + ZaloPay API (test mode) |
| QR | qrcode lib |

---

## 2. DATABASE - 24 MODELS

### Core (5):
- **User** (email, passwordHash, role[ctv/agency/admin/member], name, rank, parentId, isActive)
- **CtvHierarchy** (ctvId, managerId, level[F1/F2/F3])
- **Agency** (userId, name, depositAmount, depositTier)
- **Product** (name, category, price, cogsPct)
- **Customer** (name, phone, ctvId, agencyId, totalSpent)

### Transaction + Payment (4):
- **Transaction** (channel, totalAmount, status[PENDING/CONFIRMED/REJECTED], paymentMethod, bankCode, qrCodeData, confirmedBy, rejectedReason, cashDepositId)
- **TransactionItem** (transactionId, productId, quantity)
- **PaymentProof** (transactionId @unique, imageUrl, uploadedBy)
- **CashDeposit** (ctvId, amount, transactionIds[JSON], status)

### Config CRUD (4):
- **CommissionConfig** (tier @unique, selfSalePct, f1/f2/f3Pct, fixedSalary)
- **AgencyCommissionConfig** (group @unique, commissionPct, bonusPct)
- **KpiConfig** (rank @unique, minSelfCombo, minPortfolio, fallbackRank)
- **CogsConfig** (phase @unique, name, cogsPct, description)

### Membership (4):
- **MembershipTier** (name, minDeposit, discountPct, referralPct, monthlyReferralCap)
- **MemberWallet** (userId, tierId, balance, referralCode, referredById, referralEarned)
- **DepositHistory** (walletId, amount, method[bank_transfer/cash/momo/zalopay], status, **provider, providerTxId**)
- **ReferralCommission** (earnerWalletId, sourceWalletId, amount, ratePct, month)

### System (5):
- **KpiLog** (ctvId, month, selfSales, portfolioSize) @@unique([ctvId,month])
- **RankHistory** (ctvId, oldRank, newRank, reason, changedBy)
- **InventoryWarning** (productId, agencyId, quantity, warningType)
- **SyncLog** (source, recordsSynced, status)
- **Notification** (userId, type, title, content, isRead)

### V6 New (2):
- **PushSubscription** (userId, endpoint @unique, p256dh, auth, userAgent)
- **ImportLog** (type[ctv/product/member], fileName, totalRows, successRows, failedRows, importedBy, details[JSON])

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
Admin duyet -> CONFIRMED -> commission + notify + push
Admin tu choi -> REJECTED + ly do -> notify + push

Tien mat: CTV gop don -> CashDeposit -> Admin duyet
Cron 6h: >24h nhac (push), >48h khoa TK (push)
```

---

## 5. MEMBERSHIP/REFERRAL

| Tier | Min Deposit | Discount | Referral | Cap/thang |
|------|------------|----------|----------|-----------|
| Green | 0 | 0% | 0% | 0 |
| Basic | 200k | 3% | 0% | 0 |
| Standard | 500k | 7% | 2% | 500k |
| VIP Gold | 2M | 12% | 5% | 500k |

---

## 6. PWA (V6 NEW)

```
manifest.json:
  name: "X-WISE - CCB Mart"
  display: standalone
  theme_color: #3b82f6
  background_color: #0f172a
  icons: 192x192, 512x512

sw.js (Service Worker):
  - Cache static assets (/, manifest.json)
  - Network-first for /api/ calls
  - Push notification handler (show + click-to-open)
  - Auto-register on page load

layout.tsx:
  - <link rel="manifest">
  - <meta name="theme-color">
  - <link rel="apple-touch-icon">
  - Service worker registration script
```

---

## 7. PUSH NOTIFICATIONS (V6 NEW)

### Backend:
```
services/pushNotification.js:
  - web-push with VAPID keys (optional, disabled without keys)
  - sendPushNotification(userId, title, body, data)
  - subscribeUser(userId, subscription, userAgent)
  - unsubscribeUser(endpoint)

Endpoints:
  POST /api/notifications/subscribe
  POST /api/notifications/unsubscribe
```

### Triggers:
| Event | Gui cho | Emoji |
|-------|---------|-------|
| Transaction confirmed | CTV | ✅ |
| Transaction rejected | CTV | ❌ |
| Rank promoted | CTV | 🎉 |
| Rank demoted | CTV | 📉 |
| Cash reminder >24h | CTV | ⏰ |
| Account locked >48h | CTV + Admin | 🔒 |
| New pending transaction | Admin | 🆕 |
| Salary fund warning | Admin | ⚠️ |

### Frontend (sw.js):
```
push event -> showNotification(title, body, icon, vibrate)
notificationclick -> clients.openWindow(url)
```

---

## 8. MOMO / ZALOPAY (V6 NEW)

### Backend:
```
services/payment.js:
  createMomoPayment(amount, orderId, returnUrl, notifyUrl)
    -> POST https://test-payment.momo.vn/v2/gateway/api/create
    -> Returns { payUrl, qrCodeUrl }

  createZaloPayPayment(amount, orderId, returnUrl, callbackUrl)
    -> POST https://sb-openapi.zalopay.vn/v2/create
    -> Returns { order_url, appTransId }

  verifyMomoSignature(data, signature)
  verifyZaloPayCallback(data, mac)

Endpoints:
  POST /api/payment/momo/create (auth)
  POST /api/payment/zalopay/create (auth)
  POST /webhook/momo/ipn (public, verify signature)
  POST /webhook/zalopay/callback (public, verify mac)

DepositHistory updated:
  provider: 'momo' | 'zalopay' | null
  providerTxId: string (ma giao dich tu provider)
```

### .env (test mode):
```
MOMO_PARTNER_CODE=MOMO_TEST
MOMO_ACCESS_KEY=...
MOMO_SECRET_KEY=...
ZALOPAY_APP_ID=2553
ZALOPAY_KEY1=...
ZALOPAY_KEY2=...
```

---

## 9. IMPORT EXCEL (V6 NEW)

### Backend:
```
routes/import.js (multer memoryStorage + xlsx):
  POST /api/admin/import/ctv      (email, name, phone, parentEmail, rank)
  POST /api/admin/import/products  (name, category, price, cogsPct, unit)
  POST /api/admin/import/members   (email, name, phone)
  GET  /api/admin/import/templates/:type  (download .xlsx template)
  GET  /api/admin/import/logs      (import history)

Logic:
  - Parse Excel buffer with xlsx
  - Validate each row
  - Create records, skip duplicates
  - Return { success[], failed[], total }
  - Save ImportLog with details JSON
```

### Frontend:
```
/admin/import (3 tabs: CTV | San pham | Thanh vien)
  - Download template button
  - Upload zone (drag or click)
  - Import button
  - Result table: success count, failed rows with error messages
```

---

## 10. ALL 80+ API ENDPOINTS

| Group | # | Key endpoints |
|-------|---|--------------|
| Auth | 2 | login, me |
| CTV Dashboard | 5 | dashboard(cache), tree(cache), customers, transactions, products |
| CTV Transactions | 7 | create(QR), upload-proof, pending, history, pending-cash, cash-deposit, pending-count |
| Agency | 3 | dashboard(cache), inventory, transactions |
| Admin Dashboard | 12 | dashboard, ctvs, ctv-tree, reassign, rank, agencies, reports, kpi-logs, rank-evaluation, sync |
| Admin Reconciliation | 7 | pending, confirm, reject, stats, cash-deposits CRUD |
| Admin Config | 11 | commission CRUD, kpi RU, agency RU, cogs RU, reset-default |
| Admin Membership | 7 | tiers, deposits confirm/reject, referral-report, wallets |
| Admin Import | 5 | ctv, products, members, templates, logs |
| Member | 6 | register, wallet, deposit, transactions, referral-stats, redeem-code |
| Payment | 2 | momo/create, zalopay/create |
| Push | 2 | subscribe, unsubscribe |
| Export | 2 | excel, pdf |
| Notifications | 3 | list, mark-read, mark-all |
| Webhooks | 3 | kiotviet/order, momo/ipn, zalopay/callback |
| Health | 1 | health |

---

## 11. CRON JOBS (4)

| Job | Schedule | Description |
|-----|----------|-------------|
| autoRankUpdate | 00:05 1st/month | KPI -> promote/demote CTV |
| checkUnsubmittedCash | Every 6h | Remind >24h, lock >48h |
| resetReferralCap | 00:00 1st/month | Reset monthlyReferralEarned |
| syncQueue Worker | Realtime | KiotViet webhook |

---

## 12. FRONTEND - 34 PAGES

### Theme:
- Font: Inter | Sidebar: dark #0f172a, expand/collapse
- Dark mode toggle | Responsive (mobile drawer)
- Effects: glass-card, gradient-border, floating-card

### Pages:
| Role | # | Pages |
|------|---|-------|
| Auth | 2 | /login, /register |
| CTV | 8 | dashboard, sales/create, transactions(tabs), cash, customers, products, notifications |
| Agency | 4 | dashboard, inventory, transactions, notifications |
| Admin | 13 | dashboard, reconciliation, ctv, agencies, membership/{wallets,deposits,tiers,referrals}, **import**, config(4tabs), reports(export), notifications |
| Member | 5 | dashboard(wallet), topup, transactions, referral, notifications |

---

## 13. FILE STRUCTURE

```
backend/src/
  server.js (13 route mounts, 4 cron, payment webhooks, push endpoints)
  middleware/ (auth, rateLimiter, validate)
  services/ (commission, transaction, membership, cache, treeValidator, notification, pushNotification, payment)
  jobs/ (autoRankUpdate, checkUnsubmittedCash, resetReferralCap)
  queues/ (syncQueue)
  routes/ (auth, admin, ctv, ctvTransactions, agency, reconciliation, config, members, adminMembership, notifications, reports, import)

frontend/
  public/ (manifest.json, sw.js, icons/)
  src/lib/api.ts (80+ methods)
  src/components/ (Sidebar, DashboardLayout, NotificationsPage)
  src/app/ (login, register, ctv/*, agency/*, admin/*, member/*)
```

---

## 14. SEED DATA

| Data | Count |
|------|-------|
| Admin | 1 |
| CTV | 30 |
| Agency | 3 |
| Member | 20 |
| Products | 15 |
| Customers | 100 |
| Transactions | 510 (500 confirmed + 10 pending) |
| KPI/COGS Config | 5 + 4 |
| Membership Tiers | 4 |
| Deposits | 30 |

---

## 15. SECURITY

| Feature | Detail |
|---------|--------|
| JWT | env var in production |
| Rate limit | 1000/15m global, 5/15m login |
| Joi | All write endpoints |
| Upload | 5MB image, 10MB excel |
| Cycle detect | CTV reassign |
| Cash control | Auto-lock >48h |
| Commission | CONFIRMED only |
| Config protect | CTV/GDKD undeletable, agency <=30% |
| Webhook verify | Momo signature, ZaloPay MAC |
| Push | VAPID keys required |
| PWA | HTTPS required (production) |

---

## 16. LUU Y CHO DEEPSEEK

1. SQLite (dev) -> PostgreSQL (prod)
2. Redis/BullMQ optional -> fallback hoat dong
3. Push notification can VAPID keys trong .env
4. Momo/ZaloPay dang test mode, can merchant account cho prod
5. PWA can HTTPS de install (localhost OK cho dev)
6. Import Excel max 10MB, xu ly dong bo (khong queue)
7. Service Worker cache static only, API luon network-first
8. Icons hien la SVG placeholder, can thay PNG thuc cho prod
9. Commission rates hardcoded + DB (chua sync 2 chieu)
10. Dark mode dung .dark class + CSS variable overrides
11. Sidebar responsive: desktop expand/collapse, mobile drawer
12. Font Inter qua Google Fonts CDN
