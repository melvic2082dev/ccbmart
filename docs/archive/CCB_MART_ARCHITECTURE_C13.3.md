# CCB MART — ARCHITECTURE C13.3

**Version:** C13.3 (code) tương ứng Master Doc **V13.3**
**Ngày:** 2026-04-17
**Branch:** `claude/cranky-shaw-299637` → merge `main`
**Base trước:** C13.2.1 (commit `2551d5f`)
**Stack:** Node.js 20 · Express · Prisma · SQLite (dev) · Next.js 15 · React · Tailwind · shadcn/ui

---

## 0. Tóm tắt thay đổi so với C13.2.1

| # | Hạng mục | C13.2.1 | **C13.3** |
|---|----------|---------|-----------|
| 1 | Referral cap | 500.000đ/tháng | **2.000.000đ/tháng** (đồng nhất 4 hạng thẻ) |
| 2 | Phí mentor | Pool 6.5% (T1 3% + T2 2% + Pool 1.5%) | **Bỏ Pool độc lập**. Chỉ còn F1 10% + F2 5% + F3 3% và 3%+2%+1% sau thoát ly — chi từ quỹ hiện có |
| 3 | Cổ đông | Không mô tả | **X-WISE 31% · Bà Nhàn 20% · Bà An Nhiên 20%** (29% còn lại: quỹ phát triển & đối tác chiến lược) |
| 4 | Thanh khoản | Toàn bộ `balance` khả dụng | **70% `availableBalance` · 30% `reserveBalance`** trên mỗi phiếu nạp |
| 5 | eKYC | CCCD + ảnh | **"3 duy nhất":** CCCD (`@unique`) + `deviceId` + `ipAddress`, chặn trùng trên user khác |
| 6 | 20h đào tạo | Đã có logic `MIN_TRAINING_MINUTES_PER_MONTH` | **Giữ nguyên** (1200 phút = 20h, enforce đầy đủ trong `managementFee.js`) |
| 7 | Hạng thẻ | 3 hạng (BASIC/SILVER/GOLD) | **4 hạng:** GREEN / BASIC / STANDARD / VIP_GOLD |

---

## 1. Cơ cấu cổ đông (V13.3 mới)

| Cổ đông | Tỷ lệ | Vai trò |
|--------|------|---------|
| **X-WISE** (holding) | 31% | Vận hành, công nghệ, thương hiệu, supply-chain |
| **Bà Nhàn** | 20% | Đồng sáng lập, quan hệ đối tác Hikari/Nhà máy |
| **Bà An Nhiên** | 20% | Đồng sáng lập, R&D sản phẩm TPCN |
| Quỹ phát triển + đối tác chiến lược | 29% | ESOP, mở chuỗi, M&A thương hiệu |
| **Tổng** | 100% | |

Nguyên tắc: mọi khoản thù lao/HH/phí (F1/F2/F3, breakaway, mentor) đều do **CCB Mart** chi trả từ doanh thu bán hàng. Không có chuyển tiền ngang giữa đối tác.

---

## 2. Schema thay đổi (Prisma)

### 2.1 User — eKYC "3 duy nhất"
```
idNumber      String?  @unique @map("id_number")  // ← thêm @unique
kycDeviceId   String?  @map("kyc_device_id")     // mới
kycIpAddress  String?  @map("kyc_ip_address")    // mới
```

### 2.2 MembershipTier — 4 hạng + metadata
```
name                  // GREEN / BASIC / STANDARD / VIP_GOLD (@unique)
minDeposit            // ngưỡng nạp
pointsRate            // % điểm
discountPct           // mới: % giảm giá khi mua
referralPct           // mới: % HH giới thiệu
monthlyReferralCap    // mới: mặc định 2_000_000
color                 // UI badge
```

Seed V13.3:

| Hạng | minDeposit | Points | Discount | Referral | Cap/tháng |
|------|-----------:|-------:|---------:|---------:|----------:|
| GREEN     | 0          | 1.0% | 0% | 1.0% | 2.000.000đ |
| BASIC     | 2.000.000  | 1.5% | 2% | 1.5% | 2.000.000đ |
| STANDARD  | 10.000.000 | 2.0% | 5% | 2.0% | 2.000.000đ |
| VIP_GOLD  | 30.000.000 | 3.0% | 8% | 3.0% | 2.000.000đ |

### 2.3 MemberWallet — thanh khoản 70/30
```
balance            Float  // tổng (= available + reserve)
availableBalance   Float  // 70% — khả dụng
reserveBalance     Float  // 30% — khoá thanh khoản
referralCap        Float  @default(2_000_000)   // V13.3
referralEarned     Float  // tổng HH referral đã nhận (lifetime)
monthlyReferralEarned Float // reset 1st hằng tháng (cron `resetReferralCap`)
referrals          MemberWallet[]  // self-relation
```

### 2.4 ReferralCommission — mới
```
earnerWalletId  Int   // ví người nhận hoa hồng
sourceWalletId  Int   // ví người được giới thiệu (nguồn phát sinh)
amount          Float
ratePct         Float
month           String  // YYYY-MM
```

### 2.5 DepositHistory — thêm `notes`
Để `rejectDeposit` ghi lý do từ chối.

---

## 3. Luồng Deposit (70/30 liquidity)

```
Member tạo phiếu nạp 10.000.000đ
  → DepositHistory(status=PENDING)
  → Admin confirm
    → availableBalance += 7.000.000
    → reserveBalance   += 3.000.000
    → balance          += 10.000.000
    → totalDeposited   += 10.000.000
    → (nếu có referrer) → processReferralCommission
         • commission = deposit × referrer.tier.referralPct
         • capRemaining = tier.monthlyReferralCap − monthlyReferralEarned
         • actual = min(commission, capRemaining)
         • referrer.availableBalance += actual  (không khoá 30%)
         • referrer.monthlyReferralEarned += actual
         • ReferralCommission.create(...)
```

**File:** `backend/src/services/membership.js` — hằng số `RESERVE_RATE = 0.30`.

---

## 4. Luồng F1/F2/F3 (managementFee.js)

V13.3 **không đổi logic**, vẫn enforce 20h đào tạo:

```js
MIN_TRAINING_MINUTES_PER_MONTH = 20 * 60;   // 1200

for each (CTV có doanh số tháng):
  revenue = getPersonalComboRevenue(ctvId, month);
  for level in [F1:10%, F2:5%, F3:3%]:
    upline = getUplineChain(ctvId)[level-1];
    if (!upline || !rankAtLeast(upline.rank, minRank)) continue;
    if (!await hasEnoughTraining(upline.id)) continue;   // ← 20h gate
    ManagementFee.create({ toUser: upline, amount: revenue * pct, month });
```

Tương tự cho `BreakawayFee` (12 tháng đầu sau thoát ly): 3% F1 cũ + 2% F2 cũ + 1% GĐKD (chỉ khi GĐKD không trùng F1/F2 cũ).

---

## 5. eKYC "3 duy nhất" (V13.3)

**File:** `backend/src/services/kycService.js`

```
submitKyc(userId, { idNumber, idFrontImage, idBackImage, deviceId, ipAddress }):
  // 1) CCCD unique (DB-level @unique + runtime check)
  if User.findFirst({ idNumber, NOT: {id: userId} }) → throw
  // 2) Device unique
  if User.findFirst({ kycDeviceId, NOT: {id: userId} }) → throw
  // 3) IP unique
  if User.findFirst({ kycIpAddress, NOT: {id: userId} }) → throw
  User.update({ idNumber, kycDeviceId, kycIpAddress, kycStatus: 'SUBMITTED', ... })
```

Route (`backend/src/routes/kyc.js`):
- `deviceId` lấy từ body hoặc `X-Device-Id` header
- `ipAddress` lấy từ `X-Forwarded-For` → `socket.remoteAddress` → `req.ip`

---

## 6. Cấu trúc thư mục (snapshot)

```
backend/
  prisma/
    schema.prisma          ← + kycDeviceId, kycIpAddress, availableBalance, reserveBalance, ReferralCommission, MembershipTier mới
    seed.js                ← 4 tiers (Green/Basic/Standard/VIP_GOLD), deviceId/IP, 70/30 split
  src/
    services/
      membership.js        ← RESERVE_RATE=0.30, cap 2M, referralCommission
      kycService.js        ← 3 duy nhất
      managementFee.js     ← 20h enforce (giữ nguyên)
      breakaway.js
      commission.js
    routes/
      kyc.js               ← truyền deviceId + IP
      members.js
      adminMembership.js
    jobs/
      resetReferralCap.js  ← reset monthlyReferralEarned 1st every month

frontend/
  src/app/
    admin/
      config/page.tsx            ← thay Pool 6.5% → F1/F2/F3 + sau thoát ly
      fee-config/page.tsx        ← bỏ Pool 6.5% card, diễn giải F1/F2/F3
      membership/tiers/page.tsx  ← 4 hạng
      ctv/modals.tsx             ← cap 2.000.000đ
      business-household/modals.tsx  ← label "Phí quản lý (F1/F2/F3)"
    member/dashboard/page.tsx    ← màu 4 tiers
    register/page.tsx            ← badge 4 tiers
```

---

## 7. Danh sách file đã sửa (C13.2.1 → C13.3)

Backend:
- `backend/prisma/schema.prisma`
- `backend/prisma/seed.js`
- `backend/src/services/membership.js` (rewrite)
- `backend/src/services/kycService.js` (rewrite — add 3-unique)
- `backend/src/routes/kyc.js` (pass deviceId/IP)
- `backend/src/middleware/validate.js` (deposit method: + momo/zalopay)

Frontend:
- `frontend/src/app/admin/config/page.tsx`
- `frontend/src/app/admin/fee-config/page.tsx`
- `frontend/src/app/admin/membership/tiers/page.tsx`
- `frontend/src/app/admin/ctv/modals.tsx`
- `frontend/src/app/admin/business-household/modals.tsx`
- `frontend/src/app/member/dashboard/page.tsx`
- `frontend/src/app/register/page.tsx`

Docs:
- `CCB_MART_ARCHITECTURE_C13.3.md` (this file)

---

## 8. Kiểm thử / Acceptance

- [ ] `npx prisma db push` → schema mới đồng bộ
- [ ] `npm run seed` → 4 tiers + wallets split 70/30 + eKYC users có deviceId/IP
- [ ] `npm run build` (frontend) → không lỗi typescript
- [ ] Login `admin@ccbmart.vn / admin123`
- [ ] `/admin/membership/tiers` hiển thị đúng 4 hạng, cột "Cap/tháng" = 2.000.000đ
- [ ] `/admin/config` card phí quản lý F1/F2/F3, không còn Pool 6.5%
- [ ] `/admin/fee-config` diễn giải F1/F2/F3 + sau thoát ly
- [ ] API `POST /api/kyc/submit` yêu cầu `deviceId` (tự fill từ header nếu thiếu); chặn trùng CCCD/device/IP giữa 2 user khác nhau
- [ ] API `POST /api/admin/membership/deposits/:id/confirm`: ví nhận 70% vào `availableBalance`, 30% vào `reserveBalance`
- [ ] `calculateMonthlyManagementFees(month)`: skip upline có `trainerMinutes < 1200`

---

## 9. Tham chiếu Master Doc V13.3

| Mục Master Doc | Đặc tả | Triển khai |
|----------------|--------|------------|
| 3.x Cơ cấu cổ đông | X-WISE 31% / Nhàn 20% / An Nhiên 20% | §1 doc này |
| 6.x Thanh khoản | Khoá 30% quỹ nạp | `membership.confirmDeposit` |
| 7.x Hoa hồng | F1/F2/F3 + sau thoát ly, bỏ Pool 6.5% | `services/managementFee.js` + `services/breakaway.js` |
| 8.x Đào tạo | 20h/tháng điều kiện phí quản lý | `managementFee.MIN_TRAINING_MINUTES_PER_MONTH` |
| 9.x eKYC | 3 duy nhất | `services/kycService.submitKyc` |
| 10.x Thẻ thành viên | 4 hạng + cap 2tr | `MembershipTier` + seed |

---

**C13.3 — Ready to deploy.**
