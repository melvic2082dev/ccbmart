# Gap Analysis: Code C12.4 vs MasterDoc V13.2.1

## 1. Phiên bản nguồn

- **Code:** C12.4 — commit `1b003d8` (repo `ccb-mart-system`)
- **Doc:** V13.2.1 — file `CCB_Mart_Master_Doc_V13_2_1.docx` (Google Drive, 17/04/2026)

---

## 2. Tóm tắt Executive

| Metric | Số lượng |
|--------|---------|
| Mục khớp hoàn toàn | **28** |
| Mục lệch nhẹ (logic đúng nhưng thiếu chi tiết) | **9** |
| Mục hoàn toàn thiếu trong code | **14** |
| Tổng gap cần xử lý | **23** |

### Top 5 Priority Fix

1. **Hệ số K chưa áp lên phí quản lý F1/F2/F3** — Doc 7.9 nói K áp cho TẤT CẢ phí DV đào tạo + phí quản lý; code chỉ áp K cho trainingFee, KHÔNG áp cho managementFee. → **Sai logic tài chính, ảnh hưởng dòng tiền.**

2. **Soft Salary chưa implement đúng** — Doc 7.8 nói khi quỹ thù lao > 5% DT kênh CTV, phải giảm thù lao cố định + bù bằng thù lao hiệu suất. Code chỉ prorate tuyến tính (capFactor), không có phần bù hiệu suất. → **Thiếu incentive cho người quản lý.**

3. **Fast-Track hoàn toàn thiếu** — Doc 7.7: 200% KPI → T+1 lên hạng ngay. Code `autoRankUpdate.js` không có logic Fast-Track. → **Không thể thăng tiến nhanh như doc hứa.**

4. **Điều kiện lên hạng GĐV/GĐKD sai** — Doc 7.3: GĐV cần "3 tháng: 50cb + 10 TP/PP + nhóm ≥550cb"; code `determineRankByKpi()` chỉ check `selfCombos >= 50 && portfolioSize >= 550` (không check 10 TP/PP, không check 3 tháng liên tiếp, dùng portfolioSize thay vì combo nhóm). → **Người không đủ ĐK vẫn được lên hạng.**

5. **Acting Manager Bonus, Hội đồng CTV, Quỹ phát triển thị trường 1% — hoàn toàn thiếu** — 3 feature quan trọng từ V13.0+ chưa có code. → **Gap lớn về governance và incentive.**

---

## 3. Data Model Gaps

### Bảng 1 — Models hiện có

| Model | MasterDoc V13.2.1 yêu cầu | Code C12.4 có? | Trạng thái | Cần làm |
|-------|---------------------------|----------------|------------|---------|
| User | ranks CTV/PP/TP/GDV/GDKD, parentId, eKYC, isBusinessHousehold | ✓ | **OK** | — |
| CommissionConfig | Hoa hồng bán lẻ: CTV 20%, PP 20%, TP 30%, GDV 35%, GDKD 38% | ✓ | **OK** — khớp Doc 7.3 | — |
| CommissionConfig.fixedSalary | PP 5tr, TP 10tr, GDV 18tr, GDKD 30tr | ✓ | **OK** — GĐV = 18tr đã update V12.5 | — |
| ManagementFee | F1 10%, F2 5%, F3 3%; fromUserId, toUserId, level, month, status | ✓ | **OK** | — |
| BreakawayLog | userId (unique), oldParentId, newParentId, 12-month window | ✓ | **OK** | — |
| BreakawayFee | L1 3%, L2 2%, L3 1% (GĐKD only if ≠ F1/F2) | ✓ | **OK** | — |
| B2BContract | trainer/trainee, terminate on breakaway | ✓ | **OK** | — |
| TrainingLog | OTP, admin verified, duration minutes | ✓ | **OK** | — |
| Invoice | Fee tiers M0-M5 | ✓ | **OK** | — |
| TaxRecord | 10% TNCN, month, status | ✓ | **OK** | — |
| FeeConfig | M0-M5 tiers | ✓ | **OK** | — |
| TeamBonus | team revenue thresholds | ✓ | **Lệch** | Doc không nói rõ team bonus tiers; code dùng 300M/600M/1B × 1%. Cần confirm với Doc |
| KpiLog | selfSales, portfolioSize, rankBefore/After | ✓ | **Thiếu fields** | Thiếu `teamComboCount`, `consecutiveMonths` cho ĐK 3 tháng |
| PromotionEligibility | T+1 promotion | ✓ | **Không dùng** | Có model nhưng `autoRankUpdate` thay rank ngay lập tức thay vì queue T+1 |

### Bảng 1b — Models THIẾU hoàn toàn

| Model cần có | MasterDoc yêu cầu | Code có? | Cần làm |
|-------------|-------------------|----------|---------|
| **ActingManagerAssignment** | Doc 7.10: Acting Manager Bonus 50%, tối đa 6 tháng | ✗ | Tạo model: assigneeId, originalRoleUserId, startDate, endDate, bonusPct=0.5, maxMonths=6 |
| **CtvCouncilMember** | Doc 7.11: Hội đồng CTV 5 thành viên, nhiệm kỳ 1 năm | ✗ | Tạo model: userId, term, electedAt, expiredAt, role |
| **MarketDevelopmentFund** | Doc 7.5: 1% quỹ phát triển thị trường cho GĐKD | ✗ | Hiện level 3 = 1% trong BreakawayFee đã cover phần "GĐKD 1%", nhưng cần tách riêng để tracking rõ ràng |
| **SoftSalaryAdjustment** | Doc 7.8: Soft Salary log khi prorate | ✗ | Tạo model: userId, month, originalSalary, adjustedSalary, performanceBonus, kFactor |
| **FastTrackRequest** | Doc 7.7: 200% KPI → T+1 lên hạng | ✗ | Tạo model: userId, requestedRank, nominatedById, approvedById, status, kpiMultiple |
| **MembershipTier** | Doc 14.5: Green/Basic/Standard/VIP Gold | ✓ (có trong membership schema) | OK — đã có |
| **ReferralBonus** | Doc 14.7: Referral bonus 0.5%/3%/1% theo nhóm A/B/C | ✓ (partial) | Cần thêm product group mapping |
| **TrainingCredibilityScore** | Doc 7.6: Điểm tín nhiệm log 100 điểm | ✗ | Tạo model: userId, score (default 100), penalties[], suspendedUntil |
| **ProfessionalTitle** / Danh hiệu chuyên gia | Doc V13.0 có nhắc nhưng V13.2.1 không chi tiết | ✗ | Chưa cần — V13.2.1 không define rõ |
| **LoyaltyPoint** | Doc 14.5 nhắc "điểm tích lũy" | ✗ | Chưa thấy trong code; cần model cho hệ thống điểm |

---

## 4. Business Rules Gaps

### Bảng 2 — Tỷ lệ, công thức, điều kiện

| Rule | MasterDoc nói | Code implement | Khớp? | Fix |
|------|--------------|----------------|-------|-----|
| Hoa hồng CTV 20% | 20% trên doanh số bán lẻ cá nhân | `COMMISSION_RATES.CTV.selfSale = 0.20` | ✅ | — |
| Hoa hồng PP 20% | 20% | `0.20` | ✅ | — |
| Hoa hồng TP 30% | 30% | `0.30` | ✅ | — |
| Hoa hồng GĐV 35% | 35% | `0.35` | ✅ | — |
| Hoa hồng GĐKD 38% | 38% | `0.38` | ✅ | — |
| Thù lao DV duy trì PP | 5.000.000đ | `5000000` | ✅ | — |
| Thù lao DV duy trì TP | 10.000.000đ | `10000000` | ✅ | — |
| Thù lao DV duy trì GĐV | 18.000.000đ (V12.5 update) | `18000000` | ✅ | — |
| Thù lao DV duy trì GĐKD | 30.000.000đ | `30000000` | ✅ | — |
| F1 = 10% (TP+) | 10% combo bán lẻ trực tiếp F1 | `LEVEL_CONFIG[0] = { level:1, percent:0.10, minRank:'TP' }` | ✅ | — |
| F2 = 5% (GĐV+) | 5% | `{ level:2, percent:0.05, minRank:'GDV' }` | ✅ | — |
| F3 = 3% (GĐKD) | 3% | `{ level:3, percent:0.03, minRank:'GDKD' }` | ✅ | — |
| 20h đào tạo/tháng check F1/F2/F3 | Cấp trên ≥ 20h log VERIFIED | `MIN_TRAINING_MINUTES = 1200`, check `getTrainerMinutes()` | ✅ | — |
| Breakaway L1 = 3% | 3% toàn doanh số nhánh cho F1 cũ | `revenue * 0.03` cho `oldParentId` | ✅ | — |
| Breakaway L2 = 2% | 2% cho F2 cũ (= newParentId) | `revenue * 0.02` cho `newParentId` | ✅ | — |
| Breakaway L3 = 1% GĐKD | 1% chỉ khi GĐKD ≠ F1/F2 cũ | `!isGdkdAsF1 && !isGdkdAsF2` check | ✅ | — |
| Breakaway: parentId → grandParent | Mentee.parentId = mentor.parentId | `data: { parentId: grandParentId ?? null }` | ✅ | — |
| Cap 5% lương cứng | Tổng quỹ thù lao ≤ 5% DT kênh CTV | `salaryFundCap = ctvRevenue * 0.05`, prorate bằng `capFactor` | ⚠️ Thiếu | Code prorate tuyến tính; Doc 7.8 yêu cầu bù bằng "thù lao điều chỉnh theo hiệu suất" |
| **Hệ số K 0.7–1.0** | Áp cho phí DV đào tạo + phí quản lý nhóm khi vượt ngân sách ~18-20% DT | Code chỉ áp K cho `trainingFee` trong `commission.js` L106; **KHÔNG áp cho managementFee** | ❌ Sai | Cần áp K vào cả `calculateMonthlyManagementFees()` |
| **ĐK lên PP** | 50 combo/tháng | `selfCombos >= 50` | ✅ | — |
| **ĐK lên TP** | 50cb + 10 CTV + nhóm ≥150cb | `selfCombos >= 50 && portfolioSize >= 150` | ⚠️ Thiếu | Không check "10 CTV" (số lượng CTV trực thuộc), chỉ dùng portfolioSize |
| **ĐK lên GĐV** | 3 tháng: 50cb + 10 TP/PP + nhóm ≥550cb | `selfCombos >= 50 && portfolioSize >= 550` | ❌ Sai | Thiếu: (1) check "10 TP/PP" trực thuộc, (2) 3 tháng liên tiếp, (3) portfolioSize ≠ combo nhóm |
| **ĐK lên GĐKD** | 3 tháng: 50cb + 10 GĐV/TP + nhóm ≥2000cb | `selfCombos >= 50 && portfolioSize >= 1000` | ❌ Sai | (1) threshold sai: 1000 vs 2000, (2) thiếu check "10 GĐV/TP", (3) thiếu 3 tháng |
| **ĐK duy trì PP** | 50 combo/tháng | Không check duy trì riêng — chỉ re-evaluate rank | ⚠️ | autoRankUpdate hạ cấp nếu không đủ KPI, nhưng logic duy trì nên tách biệt (cho phục hồi tháng kế) |
| **T+1 bổ nhiệm** | Doc 7.12: đạt KPI → xếp hạng tháng sau | `autoRankUpdate` thay rank **ngay lập tức** | ❌ Sai | Phải queue vào `PromotionEligibility` rồi activate tháng sau |
| **Fast-Track** | Doc 7.7: 200% KPI → T+1 lên ngay (thay vì 3 tháng) | Không có | ❌ Thiếu | Cần endpoint + logic đánh giá |
| **Soft Salary** | Doc 7.8: giảm cố định + bù hiệu suất khi > 5% | Chỉ prorate tuyến tính | ⚠️ Thiếu bù | Thêm phần performance bonus |
| **Acting Manager Bonus** | Doc 7.10: 50% thù lao, tối đa 6 tháng | Không có | ❌ Thiếu | Tạo service + model |
| **Referral Cap** | Doc 14.4: 2 triệu/tháng | `resetReferralCap.js` job tồn tại | ✅ | — |
| **Referral Sunset 12 tháng** | Chỉ 12 tháng đầu | Cần verify trong membership service | ⚠️ | Cần kiểm tra logic sunset |
| **Referral bonus theo nhóm A/B/C** | Doc 14.7: A=0.5%, B=3%, C=1% | Không thấy implement | ❌ Thiếu | Cần mapping product group → referral % |
| **Điểm tín nhiệm log** | Doc 7.6: 100 điểm gốc, mỗi vi phạm -20 | Không có | ❌ Thiếu | Tạo model + logic |
| **Tax 10% TNCN** | 10% trên khoản > 2tr cho CTV cá nhân | `calculateTax()` + `TaxRecord` | ✅ | — |
| **Thuế khoán HKD 0.5-3%** | Tax Engine đối soát | Có trong taxEngine.js | ✅ | — |
| **COGS GĐ1 = 50%** | Blended NS + TPCN | Seeded in products, dùng `cogsPct` per product | ✅ | — |
| **CCB Mart chi trả toàn bộ** | Không chuyển tiền giữa đối tác | Code follow nguyên tắc — mọi fee/commission ghi record với CCB Mart là bên chi | ✅ | — |

---

## 5. API Route Gaps

### Bảng 3 — API Routes

| Feature | MasterDoc yêu cầu | API có? | Trạng thái | Cần làm |
|---------|-------------------|---------|------------|---------|
| CTV Dashboard | Stats, commission | `GET /api/ctv/dashboard` | ✅ | — |
| CTV Management Fees | Phí QL F1/F2/F3 | `GET /api/ctv/management-fees` | ✅ | — |
| CTV Breakaway Fees | Phí thoát ly | `GET /api/ctv/breakaway-fees` | ✅ | — |
| CTV Monthly Report | Tổng hợp thu nhập | `GET /api/ctv/monthly-report` | ✅ | — |
| CTV Tree | Cây quản lý | `GET /api/ctv/tree` | ✅ | — |
| Admin Management Fees | List, process, mark-paid | 3 routes | ✅ | — |
| Admin Breakaway Logs | List logs | `GET /api/admin/breakaway-logs` | ✅ | — |
| Admin Breakaway Fees | List, process, mark-paid | 3 routes | ✅ | — |
| Admin Rank Evaluation | Auto/manual | `POST /api/admin/rank-evaluation` | ✅ | — |
| eKYC | Submit, verify | Routes trong `kyc.js` | ✅ | — |
| Invoices | B2B invoices | Routes trong `invoices.js` | ✅ | — |
| Tax | Records, reports | Routes trong `tax.js` | ✅ | — |
| **Fast-Track Request** | Submit/approve | ❌ | Thiếu | Tạo `POST /api/ctv/fast-track`, `POST /api/admin/fast-track/:id/approve` |
| **Acting Manager** | Assign/unassign | ❌ | Thiếu | Tạo CRUD routes |
| **CTV Council** | Manage members | ❌ | Thiếu | Tạo CRUD routes |
| **Referral Bonus by Group** | Tính theo nhóm A/B/C | ❌ | Thiếu | Thêm vào membership routes |
| **Training Credibility Score** | Xem/admin manage | ❌ | Thiếu | Tạo routes |
| **K-Factor Dashboard** | Admin xem K hiện tại | ❌ | Thiếu | Tạo `GET /api/admin/k-factor?month=` |
| **Soft Salary Report** | Admin xem prorate detail | ❌ | Thiếu | Tạo `GET /api/admin/soft-salary?month=` |

---

## 6. Frontend Page Gaps

### Bảng 4 — Frontend Pages

| Page | MasterDoc yêu cầu | Code có? | Trạng thái | Cần làm |
|------|-------------------|----------|------------|---------|
| `/ctv/dashboard` | Dashboard CTV | ✅ | OK | — |
| `/ctv/management-fees` | Phí QL F1/F2/F3 | ✅ | OK | — |
| `/ctv/breakaway-fees` | Phí thoát ly | ✅ | OK | — |
| `/ctv/monthly-report` | Báo cáo tháng | ✅ | OK | — |
| `/ctv/kyc` | eKYC submit | ✅ | OK | — |
| `/ctv/invoices` | Xem invoices | ✅ | OK | — |
| `/admin/dashboard` | Admin overview | ✅ | OK | — |
| `/admin/management-fees` | Admin phí QL | ✅ | OK | — |
| `/admin/breakaway-logs` | Admin thoát ly | ✅ | OK | — |
| `/admin/kyc` | Admin KYC | ✅ | OK | — |
| `/admin/tax` | Admin thuế | ✅ | OK | — |
| `/member/dashboard` | Member dashboard | ✅ | OK | — |
| `/member/referral` | Giới thiệu | ✅ | OK | — |
| `/member/topup` | Nạp tiền | ✅ | OK | — |
| **`/ctv/fast-track`** | Request fast-track | ❌ | Thiếu | Tạo page |
| **`/admin/fast-track`** | Approve fast-track | ❌ | Thiếu | Tạo page |
| **`/admin/acting-manager`** | Quản lý acting | ❌ | Thiếu | Tạo page |
| **`/admin/ctv-council`** | Quản lý hội đồng | ❌ | Thiếu | Tạo page |
| **`/admin/k-factor`** | Xem hệ số K | ❌ | Thiếu | Tạo page (hoặc widget trong dashboard) |
| **`/admin/soft-salary`** | Chi tiết soft salary | ❌ | Thiếu | Tạo page |
| **`/admin/training-credibility`** | Điểm tín nhiệm | ❌ | Thiếu | Tạo page |

---

## 7. Services & Cron Job Gaps

### Bảng 5 — Services & Cron Jobs

| Job / Service | MasterDoc yêu cầu | Có? | Trạng thái | Cần làm |
|--------------|-------------------|-----|------------|---------|
| `autoRankUpdate.js` | Đánh giá KPI hàng tháng (1st of month) | ✅ | **Logic sai** — xem mục 4 | Fix ĐK lên hạng, thêm 3 tháng liên tiếp, thêm check số TP/PP |
| `resetReferralCap.js` | Reset cap 2tr/tháng | ✅ | OK | — |
| `checkUnsubmittedCash.js` | Kiểm tra tiền mặt | ✅ | OK | — |
| `managementFee.js` | Tính phí quản lý hàng tháng | ✅ | **Thiếu K-factor** | Áp `calculateKFactor()` vào amount |
| `breakaway.js` | Tính phí thoát ly + handle breakaway | ✅ | OK | — |
| `commission.js` | Tính commission + salary cap | ✅ | **Soft Salary thiếu bù** | Thêm performance bonus |
| `trainingFee.js` | Phí DV đào tạo M0-M5 + K factor | ✅ | OK | — |
| **Cron: T+1 Promotion** | Doc 7.12: activate pending promotions | ❌ | Thiếu | Tạo job chạy đầu tháng: activate `PromotionEligibility.status='pending'` |
| **Cron: Expire BreakawayLog** | Tự EXPIRED khi > 12 tháng | ⚠️ | Chỉ expire khi `processMonthlyBreakawayFees` được gọi | Tạo cron riêng hoặc trigger khi run |
| **Service: Fast-Track** | Evaluate 200% KPI | ❌ | Thiếu | Tạo `fastTrack.js` |
| **Service: Acting Manager** | Assign/calculate 50% bonus | ❌ | Thiếu | Tạo `actingManager.js` |
| **Service: Training Credibility** | Score 100, -20/vi phạm, suspend < 50 | ❌ | Thiếu | Tạo `trainingCredibility.js` |
| **Service: Referral Bonus by Group** | 0.5% / 3% / 1% theo A/B/C | ❌ | Thiếu | Thêm vào `membership.js` |

---

## 8. V13.2.1 New Features chưa có ở C12.4

Danh sách features mới xuất hiện từ V13.0 → V13.2.1 mà code C12.4 chưa implement:

| # | Feature | Doc Section | Mức độ | Ghi chú |
|---|---------|------------|--------|---------|
| 1 | **Fast-Track** (200% KPI → T+1) | 7.7 | HIGH | Core business promise |
| 2 | **Soft Salary** (bù hiệu suất khi > 5%) | 7.8 | HIGH | Code có cap 5% nhưng thiếu phần bù |
| 3 | **Hệ số K áp cho phí quản lý** | 7.9 | CRITICAL | Ảnh hưởng tài chính trực tiếp |
| 4 | **Acting Manager Bonus** (50%, 6 tháng) | 7.10 | MEDIUM | Governance feature |
| 5 | **Hội đồng CTV** (5 thành viên) | 7.11 | LOW | Governance — có thể manual ban đầu |
| 6 | **Điểm tín nhiệm log đào tạo** | 7.6 | MEDIUM | Anti-fraud |
| 7 | **AI chống log ảo** (fingerprint, IP, GPS) | 7.6 | LOW | Cần AI service riêng, GĐ2+ |
| 8 | **Referral Bonus theo nhóm A/B/C** (0.5%/3%/1%) | 14.7 | MEDIUM | Membership feature |
| 9 | **Role Guard** (1 GD = 1 vai trò hưởng lợi) | 14.3 | MEDIUM | Cần enforce trong Partner Payout |
| 10 | **Thẻ thành viên 4 hạng** (Green/Basic/Standard/VIP Gold) | 14.5 | LOW | Membership tier đã có cơ bản |
| 11 | **Quản trị thanh khoản** (khóa 30% quỹ nạp trước) | 14.10 | MEDIUM | Finance control |
| 12 | **ĐK lên hạng: 3 tháng liên tiếp** cho GĐV/GĐKD | 7.3 | HIGH | Logic sai trong autoRankUpdate |
| 13 | **ĐK lên hạng: check số CTV/TP/PP trực thuộc** | 7.3 | HIGH | Thiếu trong determineRankByKpi |
| 14 | **Quỹ phát triển thị trường 1%** (GĐKD) | 7.5 | LOW | BreakawayFee L3 đã cover phần nào |

---

## 9. Kế hoạch triển khai

### Phase 1 — Critical (Tài chính + Logic sai) — Sprint 1-2

| # | Task | Est |
|---|------|-----|
| 1.1 | Fix Hệ số K: áp K vào `calculateMonthlyManagementFees()` | 2h |
| 1.2 | Fix ĐK lên hạng GĐV: thêm check 10 TP/PP, 3 tháng liên tiếp | 4h |
| 1.3 | Fix ĐK lên GĐKD: threshold 2000 (not 1000), check 10 GĐV/TP, 3 tháng | 4h |
| 1.4 | Fix ĐK lên TP: thêm check 10 CTV | 2h |
| 1.5 | Fix T+1 promotion: dùng `PromotionEligibility` thay vì update rank ngay | 4h |
| 1.6 | Tạo cron job activate pending promotions đầu tháng | 2h |
| 1.7 | Unit tests cho tất cả rules trên | 4h |

### Phase 2 — High Priority (Business Rules) — Sprint 3-4

| # | Task | Est |
|---|------|-----|
| 2.1 | Implement Fast-Track: model + service + API + frontend | 6h |
| 2.2 | Soft Salary: thêm performance bonus component | 4h |
| 2.3 | Acting Manager Bonus: model + service + API + frontend | 6h |
| 2.4 | Training Credibility Score: model + logic + API | 4h |
| 2.5 | Role Guard enforce trong Payout Engine | 4h |
| 2.6 | Referral Bonus theo nhóm A/B/C | 3h |
| 2.7 | Quản trị thanh khoản 30% | 3h |
| 2.8 | Admin K-Factor + Soft Salary dashboard pages | 4h |

### Phase 3 — Nice-to-have (Governance, UI) — Sprint 5+

| # | Task | Est |
|---|------|-----|
| 3.1 | Hội đồng CTV: model + admin UI | 4h |
| 3.2 | AI chống log ảo (fingerprint, IP, GPS matching) | 16h+ |
| 3.3 | Thẻ thành viên 4 hạng: upgrade từ basic tiers | 4h |
| 3.4 | Admin Training Credibility page | 3h |
| 3.5 | Admin Fast-Track approval page | 3h |
| 3.6 | Admin Acting Manager page | 3h |

---

## 10. Migration Script

### Schema changes cần thiết (Prisma)

```prisma
// 1. Thêm fields vào KpiLog cho 3-month tracking
model KpiLog {
  // ... existing fields
  teamComboCount    Int?    @map("team_combo_count")
  directTpPpCount   Int?    @map("direct_tp_pp_count")  // số TP/PP trực thuộc
  directCtvCount    Int?    @map("direct_ctv_count")     // số CTV trực thuộc
}

// 2. Fast-Track
model FastTrackRequest {
  id              Int      @id @default(autoincrement())
  userId          Int      @map("user_id")
  currentRank     String   @map("current_rank")
  targetRank      String   @map("target_rank")
  kpiMultiple     Float    @map("kpi_multiple")   // >= 2.0
  nominatedById   Int?     @map("nominated_by_id")
  approvedById    Int?     @map("approved_by_id")
  status          String   @default("PENDING")     // PENDING/APPROVED/REJECTED
  createdAt       DateTime @default(now())
  approvedAt      DateTime?
  user            User     @relation(fields: [userId], references: [id])
  @@map("fast_track_requests")
}

// 3. Acting Manager
model ActingManagerAssignment {
  id                Int      @id @default(autoincrement())
  assigneeId        Int      @map("assignee_id")
  originalUserId    Int      @map("original_user_id")
  originalRank      String   @map("original_rank")
  startDate         DateTime @map("start_date")
  endDate           DateTime? @map("end_date")
  maxMonths         Int      @default(6)
  bonusPct          Float    @default(0.5)
  status            String   @default("ACTIVE")  // ACTIVE/COMPLETED/TERMINATED
  @@map("acting_manager_assignments")
}

// 4. Training Credibility
model TrainingCredibilityScore {
  id              Int      @id @default(autoincrement())
  userId          Int      @unique @map("user_id")
  score           Int      @default(100)
  suspendedUntil  DateTime? @map("suspended_until")
  updatedAt       DateTime @updatedAt
  user            User     @relation(fields: [userId], references: [id])
  @@map("training_credibility_scores")
}

// 5. Soft Salary Log
model SoftSalaryAdjustment {
  id                Int      @id @default(autoincrement())
  userId            Int      @map("user_id")
  month             String
  originalSalary    Float    @map("original_salary")
  adjustedSalary    Float    @map("adjusted_salary")
  performanceBonus  Float    @default(0) @map("performance_bonus")
  capFactor         Float    @map("cap_factor")
  @@map("soft_salary_adjustments")
}
```

### Data migration

Không cần migrate dữ liệu cũ — các models mới sẽ bắt đầu từ trống. Chỉ cần:
1. `npx prisma migrate dev --name add-v13-features`
2. Update seed.js để thêm sample data cho models mới
3. Fix `determineRankByKpi()` — existing ranks có thể bị re-evaluate; cần chạy manual review trước khi enable logic mới

---

*Generated: 17/04/2026 — by Claude (audit tool)*
