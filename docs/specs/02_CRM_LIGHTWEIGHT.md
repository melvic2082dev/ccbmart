# Spec 02 — CRM nhẹ cho CTV: Lead + Pipeline + Follow-up

**Status:** Draft for implementation
**Author:** Claude (per Willy Minh request)
**Date:** 2026-05-15
**Estimated effort:** 6–9 dev days (solo)
**Depends on:** None (độc lập với Product M0). Có thể chạy song song.

---

## 1. Vấn đề & mục tiêu

### 1.1 Hiện trạng
- `Customer` model = ai ĐÃ MUA (`schema.prisma:212-228`). Có `firstPurchase`, `totalSpent`.
- Không có entity cho "lead" (người quan tâm chưa mua). CTV nhớ trong Zalo / sổ giấy / Excel.
- Không có communication log: CTV gọi/nhắn khách hôm nào, nội dung gì → mất dấu.
- Không có follow-up reminder: CTV quên gọi lại lead nguội → mất deal.
- KPI hiện đo `selfSales` (số combo bán được) — không đo conversion rate, không thấy được lead funnel.

### 1.2 Đòn bẩy
Với MLM, **conversion rate** là biến số có tác động lớn nhất tới revenue mỗi CTV. Tăng conversion từ 10% → 15% = +50% doanh thu mà không cần thêm lead. CRM nhẹ giải quyết:
- Track lead → contacted → qualified → won/lost
- Auto-reminder follow-up theo SLA
- Notification cho manager khi member team có deal sắp closing

### 1.3 Mục tiêu M0 (in scope)
1. Lead model + lifecycle (5 stage)
2. Activity log (call/zalo/meet) gắn với Lead hoặc Customer
3. CTV dashboard: My Leads + Today's tasks + Follow-up reminders
4. Notification flow: assigned, stale, won, lost
5. Convert Lead → Customer khi closing thành công

### 1.4 Out of scope (M1)
- Email automation / drip campaigns
- Bulk import lead từ CSV (M0 cho phép thêm 1-1)
- Lead scoring auto (manual stage transitions là đủ)
- Calendar integration (Google Calendar, etc)
- Mobile push notifications (Web Push đã có, dùng tạm)

---

## 2. Schema

### 2.1 Model mới

```prisma
model Lead {
  id              Int       @id @default(autoincrement())
  name            String
  phone           String
  zaloName        String?   @map("zalo_name")
  email           String?
  source          String    // 'referral' | 'fb_ads' | 'zalo' | 'event' | 'walk_in' | 'other'
  sourceDetail    String?   @map("source_detail")  // free text
  interestNote    String?   @map("interest_note") @db.Text
  estimatedValue  Decimal?  @map("estimated_value") @db.Decimal(15, 0)
  stage           String    @default("NEW") // NEW | CONTACTED | QUALIFIED | NEGOTIATING | WON | LOST
  lostReason      String?   @map("lost_reason")
  assignedCtvId   Int       @map("assigned_ctv_id")
  customerId      Int?      @map("customer_id")  // set when converted to customer
  nextActionAt    DateTime? @map("next_action_at")
  nextActionNote  String?   @map("next_action_note")
  lastContactedAt DateTime? @map("last_contacted_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  closedAt        DateTime? @map("closed_at")

  assignedCtv User           @relation("AssignedLeads", fields: [assignedCtvId], references: [id])
  customer    Customer?      @relation(fields: [customerId], references: [id])
  activities  LeadActivity[]

  @@unique([phone, assignedCtvId])  // 1 CTV không trùng lead cùng SĐT
  @@index([assignedCtvId])
  @@index([assignedCtvId, stage])
  @@index([nextActionAt])
  @@index([stage])
  @@map("leads")
}

model LeadActivity {
  id          Int      @id @default(autoincrement())
  leadId      Int?     @map("lead_id")
  customerId  Int?     @map("customer_id")  // có thể gắn vào customer (sau khi convert)
  ctvId       Int      @map("ctv_id")
  type        String   // 'CALL' | 'ZALO' | 'SMS' | 'EMAIL' | 'MEET' | 'NOTE'
  outcome     String?  // 'ANSWERED' | 'NO_ANSWER' | 'BUSY' | 'NOT_INTERESTED' | 'WANT_INFO' | 'PROMISED_BUY'
  durationMin Int?     @map("duration_min")
  notes       String   @db.Text
  occurredAt  DateTime @default(now()) @map("occurred_at")
  createdAt   DateTime @default(now()) @map("created_at")

  lead     Lead?     @relation(fields: [leadId], references: [id])
  customer Customer? @relation("CustomerActivities", fields: [customerId], references: [id])
  ctv      User      @relation("CtvActivities", fields: [ctvId], references: [id])

  @@index([leadId])
  @@index([customerId])
  @@index([ctvId])
  @@index([ctvId, occurredAt])
  @@map("lead_activities")
}
```

### 2.2 Sửa model cũ

#### Customer — thêm lifecycle + last contact
```prisma
model Customer {
  // ... existing fields ...
  lifecycleStage  String   @default("NEW") @map("lifecycle_stage") // NEW | ACTIVE | DORMANT | CHURNED
  lastContactedAt DateTime? @map("last_contacted_at")
  totalOrders     Int      @default(0) @map("total_orders")
  notes           String?  @db.Text

  activities LeadActivity[] @relation("CustomerActivities")  // NEW
  leads      Lead[]                                          // NEW (khi convert)
}
```

#### User — relations ngược
```prisma
model User {
  // ... existing ...
  assignedLeads Lead[]         @relation("AssignedLeads")
  activities    LeadActivity[] @relation("CtvActivities")
}
```

---

## 3. Lifecycle & state machine

```
   NEW ──┐
         ├──> CONTACTED ──> QUALIFIED ──> NEGOTIATING ──> WON ──> (auto convert to Customer)
         │                                            └─> LOST
         └──> LOST (no contact, no interest)
```

**Quy tắc:**
- `NEW` → `CONTACTED`: bất kỳ activity nào có outcome khác null
- `CONTACTED` → `QUALIFIED`: CTV manual click "Đủ điều kiện" (có nhu cầu thật + ngân sách)
- `QUALIFIED` → `NEGOTIATING`: CTV bắt đầu đàm phán giá/combo
- `NEGOTIATING` → `WON`: CTV tạo Transaction từ lead này (PENDING hoặc CONFIRMED đều count)
- Bất kỳ → `LOST`: CTV manual close + chọn `lostReason`

**Khi WON:**
- Tạo `Customer` (nếu phone chưa tồn tại) — link `lead.customerId`
- Set `lead.closedAt = now()`
- Set `customer.lifecycleStage = 'ACTIVE'`
- Activities cũ của lead tiếp tục tracking với `lead.id` (không di chuyển)

**Stale rule (background job):**
- `NEW` không có activity trong 24h → tạo Notification cho CTV (reminder)
- `CONTACTED` / `QUALIFIED` / `NEGOTIATING` quá 7 ngày không có activity → Notification "lead nguội"
- Sau 30 ngày stale → auto move `LOST` với `lostReason='auto_stale'`

---

## 4. Notification flow

### 4.1 Trigger events
| Event | Recipient | Channel | Template |
|---|---|---|---|
| Lead assigned (admin gán hoặc CTV tự tạo) | CTV được gán | In-app + Push | "Bạn có lead mới: {name} ({phone}). Hành động đầu tiên trước {now+24h}" |
| `nextActionAt` đến hạn | CTV được gán | In-app + Push | "Đến giờ follow-up {leadName} — {nextActionNote}" |
| Lead stale 7 ngày | CTV + Manager trực tiếp | In-app | "{leadName} đã không tương tác 7 ngày" |
| Lead WON | CTV + Manager F1 + Manager F2 | In-app | "🎉 {ctvName} vừa close {leadName} ({estValue} ₫)" |
| Lead LOST với reason='price' | Admin | In-app | "Lead {name} thua vì giá — xem có nên review pricing" |

### 4.2 Implementation
- Reuse `backend/src/services/notification.js` + `pushNotification.js` (đã có Web Push)
- Add new module `backend/src/services/leadNotifier.js`:
  - `onLeadCreated(leadId)`
  - `onLeadStageChanged(leadId, oldStage, newStage)`
  - `onLeadDueAction(leadId)` — gọi từ cron
- Cron job mới trong `backend/src/jobs/leadFollowUpJob.js`:
  - Mỗi 15 phút: query `Lead.nextActionAt <= now + 15m AND nextActionAt > last_run`
  - Mỗi 1h: query lead stale (CONTACTED/QUALIFIED/NEGOTIATING, lastContactedAt < now-7d)
  - Mỗi 0:30 daily: auto-LOST lead stale > 30d
- Schedule trong `backend/src/server.js` (cùng pattern với existing `scheduleAutoRankJob`)

---

## 5. UI surface

### 5.1 CTV (Frontend `frontend/src/app/ctv/`)

#### 5.1.1 Dashboard widget (sửa `dashboard/page.tsx`)
Thêm 3 card trên đầu:
- **Hôm nay cần làm**: count lead có `nextActionAt < end_of_day` + button "Xem"
- **Lead theo stage**: bar chart (NEW: 5, CONTACTED: 12, QUALIFIED: 3, NEGOTIATING: 2, WON tháng: 8, LOST tháng: 4)
- **Conversion rate tháng**: WON / (WON + LOST) × 100% với so sánh tháng trước

#### 5.1.2 Trang mới `/ctv/leads/page.tsx`
- Bảng leads của CTV này
- Filter: stage, source, có/không có nextActionAt
- Sort: nextActionAt asc (default), createdAt desc, estimatedValue desc
- Row click → mở slideover panel lead detail
- Button "+ Thêm lead" → modal form

#### 5.1.3 Trang mới `/ctv/leads/[id]/page.tsx` (hoặc slideover)
- Lead info (editable)
- Timeline activities (mới → cũ)
- Form "Ghi log mới": type, outcome, duration, notes
- Button "Chuyển stage" với dropdown
- Button "Đặt follow-up" → set `nextActionAt + note`
- Button "🎉 Đã chốt deal" → mở form tạo Transaction (prefill customerName + phone) → khi save Transaction, auto WON + link customer

#### 5.1.4 Sửa `/ctv/customers/page.tsx`
- Thêm column `lifecycleStage`, `lastContactedAt`
- Click row → mở activity timeline của customer (đã convert từ lead nào)

### 5.2 Admin (Frontend `frontend/src/app/admin/`)
- Trang mới `/admin/leads/page.tsx`: tổng leads toàn hệ thống, filter by CTV/stage/source
- Trang mới `/admin/reports/conversion/page.tsx`: conversion funnel by rank, by source, by month
- Sidebar nav add 2 items

### 5.3 Backend routes mới: `backend/src/routes/leads.js`
```
GET    /api/ctv/leads             — list leads của CTV hiện tại (auth)
POST   /api/ctv/leads             — tạo lead
GET    /api/ctv/leads/:id         — detail + activities
PUT    /api/ctv/leads/:id         — update lead
POST   /api/ctv/leads/:id/activities  — thêm activity
POST   /api/ctv/leads/:id/stage   — chuyển stage (validate transition)
POST   /api/ctv/leads/:id/won     — convert WON + tạo transaction
GET    /api/ctv/leads/today       — leads với nextActionAt <= end_of_day
GET    /api/admin/leads           — admin all leads (paginated)
GET    /api/admin/reports/conversion  — conversion stats
```

Mount + validate (Joi schemas) + writeLimiter trên mutate endpoints.

---

## 6. Conversion → Transaction integration

Khi CTV click "Đã chốt deal":
1. Form prefill: `customerName=lead.name`, `customerPhone=lead.phone`
2. Sau khi tạo Transaction (qua `transaction.js:createCtvTransaction`):
   ```javascript
   await prisma.$transaction(async (tx) => {
     await tx.lead.update({
       where: { id: leadId },
       data: { stage: 'WON', customerId: createdTxn.customerId, closedAt: new Date() },
     });
     await tx.customer.update({
       where: { id: createdTxn.customerId },
       data: { lifecycleStage: 'ACTIVE' },
     });
   });
   ```
3. Trigger `onLeadStageChanged(leadId, 'NEGOTIATING', 'WON')` → notification.

---

## 7. Migration

### 7.1 File
`backend/prisma/migrations/20260525_p_crm_lead_activity/migration.sql`

### 7.2 Steps
1. Create `leads` + `lead_activities` tables
2. Add columns to `customers`: `lifecycle_stage`, `last_contacted_at`, `total_orders`, `notes`
3. Backfill `customers.lifecycle_stage`:
   - `ACTIVE` nếu `totalSpent > 0` và last transaction < 90 days
   - `DORMANT` nếu last transaction 90-365 days
   - `CHURNED` nếu last transaction > 365 days
4. Backfill `customers.total_orders` = count(transactions where confirmed)
5. Create indexes

### 7.3 Rollback
```sql
ALTER TABLE customers DROP COLUMN lifecycle_stage, DROP COLUMN last_contacted_at,
  DROP COLUMN total_orders, DROP COLUMN notes;
DROP TABLE lead_activities;
DROP TABLE leads;
```

### 7.4 Seed
Thêm 30 leads sample phân bố:
- 10 NEW (mới tạo trong tuần)
- 8 CONTACTED (có 1-2 activity)
- 5 QUALIFIED
- 3 NEGOTIATING
- 2 WON (link sang Customer hiện có)
- 2 LOST

---

## 8. Phasing

| Phase | Việc | Days |
|---|---|---|
| **C0a** | Schema + migration + seed | 1 |
| **C0b** | Backend routes + leadNotifier + cron job | 2 |
| **C0c** | CTV UI: dashboard widget + leads list + lead detail | 2 |
| **C0d** | Conversion flow (lead → transaction → customer) | 1 |
| **C0e** | Admin UI: all-leads + conversion report | 1 |
| **C0f** | Tests + smoke + ship to staging | 1 |
| **Total** | | **8 days** |

---

## 9. Acceptance criteria

- [ ] CTV tạo lead mới qua form, mặc định stage=NEW
- [ ] CTV ghi activity (CALL outcome=NO_ANSWER) → stage auto chuyển CONTACTED
- [ ] CTV set `nextActionAt = ngày mai 10:00` → 9:45 sáng hôm sau nhận notification
- [ ] Lead không tương tác 7 ngày → notification "nguội" cho CTV + manager F1
- [ ] CTV click "Đã chốt deal" → form transaction mở với customer prefilled → submit → lead.stage=WON, customer được tạo, link đúng
- [ ] Admin view all leads, filter CTV/stage/source
- [ ] Conversion report hiển thị: WON/(WON+LOST) × 100% per CTV per month
- [ ] Lead UNIQUE constraint: cùng CTV không tạo 2 lead trùng phone
- [ ] Khác CTV được phép có cùng phone (lead chia sẻ giữa nhánh)
- [ ] Soft-lost: lead stale 30 ngày → cron auto LOST với reason='auto_stale'
- [ ] Test coverage routes/leads.js + leadNotifier.js ≥ 70%

---

## 10. Risk & mitigation

| Risk | Mitigation |
|---|---|
| CTV không chịu nhập lead vào hệ thống (thói quen dùng Zalo) | Onboarding training; show conversion rate ngay trên dashboard để tạo motivation; gắn KPI bonus theo "lead activity per week" |
| Spam notification → CTV mute | Limit max 5 notification/day per CTV; rollup multiple stale leads thành 1 notification |
| Duplicate lead khi import từ Excel sau | Phase M0 không có import; M1 dùng phone+name fuzzy match |
| Lead bị "ăn cắp" giữa các CTV (lead chia sẻ phone) | Đã set `@@unique([phone, assignedCtvId])` cho phép cùng phone nhiều CTV; thêm rule: cùng UPLINE thì alert "lead đã được người khác trong team contact" |
| Cron `leadFollowUpJob` chạy chậm khi nhiều lead | Index `(assignedCtvId, stage, nextActionAt)` + chunk 500 mỗi pass |

---

## 11. Files thay đổi (tổng kết)

**Backend (7):**
- `backend/prisma/schema.prisma` (+~60 lines)
- `backend/prisma/migrations/20260525_p_crm_lead_activity/migration.sql` (new)
- `backend/prisma/migrations/rollback_p_crm.sql` (new)
- `backend/prisma/seed.js` (+~40 lines for 30 leads)
- `backend/src/services/leadNotifier.js` (new)
- `backend/src/jobs/leadFollowUpJob.js` (new)
- `backend/src/routes/leads.js` (new)
- `backend/src/server.js` (+1 mount, +1 schedule)
- `backend/__tests__/services/leadNotifier.test.js` (new)
- `backend/__tests__/routes/leads.test.js` (new)

**Frontend (6):**
- `frontend/src/app/ctv/dashboard/page.tsx` (modify — add 3 cards)
- `frontend/src/app/ctv/leads/page.tsx` (new)
- `frontend/src/app/ctv/leads/[id]/page.tsx` (new)
- `frontend/src/app/ctv/customers/page.tsx` (modify — add columns)
- `frontend/src/app/admin/leads/page.tsx` (new)
- `frontend/src/app/admin/reports/conversion/page.tsx` (new)
- `frontend/src/lib/api.ts` (+lead endpoints)
- `frontend/src/components/ctv/Sidebar.tsx` (+1 item)
- `frontend/src/components/admin/Sidebar.tsx` (+2 items)

---

## 12. KPI tác động kỳ vọng

Target sau 3 tháng triển khai (giả định CTV tích cực dùng):
- Conversion rate tăng 30–50% (từ baseline còn chưa đo được)
- Trung bình activity/lead trước khi WON: 3–5
- Lead-to-WON cycle time: < 14 days median
- Stale rate (LOST do auto_stale): < 20% tổng LOST

→ Đo bằng `/admin/reports/conversion` mới.
