# Spec 04 — v3.3 Operational Flow Redesign

**Status:** In implementation (MVP)
**Author:** Claude, per Willy + GĐ G feedback
**Date:** 2026-05-17
**Depends on:** v3.1 (Product M0 / Variant / Supplier / Batch / FIFO inventory), v3.2 (Region + Warehouse)

---

## 1. Vấn đề cần giải quyết

Luồng CTV bán hàng hiện tại (`services/transaction.js`) mang tính prototype: tạo Transaction là xong, không kiểm tra tồn kho, không có giai đoạn soạn hàng, không xác nhận khách đã nhận. Hệ quả thực tế (GĐ G feedback):

1. **Rủi ro huỷ đơn sau thanh toán** — khách trả tiền rồi kho mới phát hiện hết hàng.
2. **Nút cổ chai tại kho** — nhiều CTV cùng đến lấy hàng vào giờ cao điểm.
3. **CTV tự bấm "giao thành công"** — không có bằng chứng từ khách, dễ gian lận hoa hồng.
4. **Thuế TNCN per-transaction** — đã được xử lý từ v12.2 (taxEngine aggregate theo tháng), giữ nguyên.

## 2. Nguyên tắc thiết kế (sau khi tham khảo GĐ G)

- **Xác nhận tồn kho TRƯỚC thanh toán**, không giữ hàng theo thời gian cố định.
- **Soạn hàng song song với chờ CTV đến lấy**, có khu vực "chờ pickup".
- **OTP là kênh chính, chữ ký số là kênh dự phòng** cho xác nhận giao hàng.
- **Hoa hồng chỉ được tính khi đơn đạt trạng thái DELIVERED** (có OTP hoặc chữ ký hợp lệ).
- **State machine rõ ràng** — mỗi transition được audit log lại.

## 3. State machine

```
   DRAFT
     │ CTV tạo đơn nháp với danh sách item
     ▼
   INVENTORY_PENDING        (warehouse có 5 phút để xác nhận)
     │ thủ kho ấn "có hàng"
     │                       ├── thủ kho ấn "hết hàng" ──► INVENTORY_REJECTED (terminal)
     ▼
   AWAITING_PAYMENT         (CTV gửi link/QR thanh toán cho khách)
     │ payment webhook hoặc admin xác nhận
     ▼
   PAID
     │ kho auto nhận tín hiệu, bắt đầu soạn
     ▼
   PACKING
     │ thủ kho hoàn tất, sinh mã pickup (UUID/QR)
     ▼
   AWAITING_PICKUP          (CTV đến kho, scan QR)
     │ scan thành công
     ▼
   PICKED_UP
     │ CTV bắt đầu vận chuyển
     ▼
   DELIVERING
     │ CTV request OTP → khách nhập trên app/SMS
     │ HOẶC CTV upload ảnh chữ ký khách
     ▼
   DELIVERED (terminal, được tính hoa hồng)

   CANCELLED — có thể từ bất kỳ trạng thái nào trước PAID (sau PAID phải refund).
```

### 3.1 Allowed transitions (định nghĩa cứng)

| From | To | Actor |
|---|---|---|
| (new) | `DRAFT` | CTV |
| `DRAFT` | `INVENTORY_PENDING` | system (auto sau khi tạo draft) |
| `INVENTORY_PENDING` | `AWAITING_PAYMENT` | warehouse_staff |
| `INVENTORY_PENDING` | `INVENTORY_REJECTED` | warehouse_staff |
| `AWAITING_PAYMENT` | `PAID` | system (payment webhook) hoặc admin |
| `PAID` | `PACKING` | warehouse_staff |
| `PACKING` | `AWAITING_PICKUP` | warehouse_staff |
| `AWAITING_PICKUP` | `PICKED_UP` | CTV (scan QR) |
| `PICKED_UP` | `DELIVERING` | CTV |
| `DELIVERING` | `DELIVERED` | CTV (verified OTP hoặc signature upload) |
| `DRAFT`, `INVENTORY_PENDING`, `AWAITING_PAYMENT` | `CANCELLED` | CTV hoặc admin |

Tất cả transition được ghi vào `TransactionStatusLog`.

### 3.2 Backward compat

Các transaction cũ có `status='CONFIRMED'` được coi là **legacy completed**, vẫn được tính hoa hồng. Code đường mới chỉ tính `DELIVERED`. Sau khi cutover, có thể migrate `CONFIRMED → DELIVERED` (không bắt buộc).

## 4. Schema thay đổi (migration `20260517100000_p_v3_3_order_flow`)

### 4.1 Extend `transactions`

```sql
ALTER TABLE transactions
  ADD COLUMN drafted_at              TIMESTAMP(3),
  ADD COLUMN inventory_confirmed_at  TIMESTAMP(3),
  ADD COLUMN inventory_confirmed_by  INTEGER,
  ADD COLUMN inventory_rejected_reason TEXT,
  ADD COLUMN paid_at                 TIMESTAMP(3),
  ADD COLUMN packing_started_at      TIMESTAMP(3),
  ADD COLUMN packed_at               TIMESTAMP(3),
  ADD COLUMN packed_by               INTEGER,
  ADD COLUMN warehouse_id            INTEGER,
  ADD COLUMN pickup_code             TEXT,           -- UUID for QR scanning at warehouse
  ADD COLUMN picked_up_at            TIMESTAMP(3),
  ADD COLUMN delivery_otp_hash       TEXT,           -- sha256(salt+code), never plaintext
  ADD COLUMN delivery_otp_sent_at    TIMESTAMP(3),
  ADD COLUMN delivery_otp_verified_at TIMESTAMP(3),
  ADD COLUMN delivery_otp_attempts   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN delivery_otp_blocked_until TIMESTAMP(3),
  ADD COLUMN delivery_signature_url  TEXT,
  ADD COLUMN delivered_at            TIMESTAMP(3),
  ADD COLUMN cancelled_at            TIMESTAMP(3),
  ADD COLUMN cancelled_by            INTEGER,
  ADD COLUMN cancelled_reason        TEXT;

CREATE UNIQUE INDEX transactions_pickup_code_key ON transactions(pickup_code);
CREATE INDEX transactions_warehouse_id_idx ON transactions(warehouse_id);
ALTER TABLE transactions ADD CONSTRAINT transactions_warehouse_id_fkey
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL;
```

### 4.2 New table `transaction_status_logs`

```sql
CREATE TABLE transaction_status_logs (
  id              SERIAL PRIMARY KEY,
  transaction_id  INTEGER NOT NULL REFERENCES transactions(id),
  from_status     TEXT,
  to_status       TEXT NOT NULL,
  actor_id        INTEGER,
  actor_role      TEXT,
  note            TEXT,
  at              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX transaction_status_logs_tx_idx ON transaction_status_logs(transaction_id);
CREATE INDEX transaction_status_logs_at_idx ON transaction_status_logs(at);
```

### 4.3 Extend `users`

```sql
ALTER TABLE users ADD COLUMN warehouse_id INTEGER;
CREATE INDEX users_warehouse_id_idx ON users(warehouse_id);
ALTER TABLE users ADD CONSTRAINT users_warehouse_id_fkey
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL;
```

Role `warehouse_staff` được thêm vào tập role hợp lệ (constants), không cần migration vì `User.role` đang là `String`.

## 5. Backend

### 5.1 New service `services/orderFlow.js`

Single source of truth cho state machine.

```js
// applyTransition(txId, toStatus, { actorId, actorRole, note, data })
// Atomic: kiểm tra transition hợp lệ, update Transaction, insert StatusLog — trong 1 prisma.$transaction.
```

### 5.2 Extend `services/otpService.js`

Hiện tại chỉ dùng cho training. Thêm:
```js
generateDeliveryOTP(transactionId)
verifyDeliveryOTP(transactionId, code)
```

Hash bằng `sha256(OTP_SALT + code)` (env `OTP_SALT`), TTL 10 phút, fail limit 5 (lock 30 phút).
Trong dev: log code ra console; production: tích hợp SMS provider (deferred).

### 5.3 Routes mới

**`/api/warehouse/*`** (auth: `warehouse_staff` + `admin`):
- `GET  /orders/pending-inventory` — list status=INVENTORY_PENDING
- `POST /orders/:id/confirm-inventory` — → AWAITING_PAYMENT
- `POST /orders/:id/reject-inventory` — → INVENTORY_REJECTED (need reason)
- `GET  /orders/awaiting-packing` — status=PAID
- `POST /orders/:id/start-packing` — → PACKING
- `POST /orders/:id/finish-packing` — → AWAITING_PICKUP (sinh pickup_code)
- `GET  /orders/awaiting-pickup` — status=AWAITING_PICKUP

**`/api/ctv/orders/*`** (auth: `ctv`):
- `POST /ctv/orders/draft` — tạo DRAFT + INVENTORY_PENDING (auto-transition)
- `POST /ctv/orders/:id/initiate-payment` — sinh QR/link thanh toán (mock OK trong MVP)
- `POST /ctv/orders/:id/pickup` — scan pickup_code → PICKED_UP
- `POST /ctv/orders/:id/start-delivery` — → DELIVERING
- `POST /ctv/orders/:id/request-otp` — sinh OTP, log code (dev)
- `POST /ctv/orders/:id/verify-otp` — verify → DELIVERED
- `POST /ctv/orders/:id/upload-signature` — multipart, store URL → DELIVERED
- `POST /ctv/orders/:id/cancel` — → CANCELLED (chỉ trước PAID)
- `GET  /ctv/orders/:id` — chi tiết + status timeline

**`/api/payments/webhook`** (signed/unauthenticated):
- `POST /payments/webhook` — mock endpoint nhận confirmation → AWAITING_PAYMENT → PAID

### 5.4 Commission service update

`services/commission.js` — đổi WHERE clause:

```diff
- WHERE channel = 'ctv' AND status = 'CONFIRMED'
+ WHERE channel = 'ctv' AND status IN ('CONFIRMED', 'DELIVERED')
+   AND (status != 'DELIVERED' OR delivery_otp_verified_at IS NOT NULL OR delivery_signature_url IS NOT NULL)
```

Hoặc đơn giản: tạo function `isCommissionable(tx)` trong orderFlow.js và filter trong JS thay vì SQL.

### 5.5 PIT (taxEngine)

Đã monthly từ v12.2 — **không đổi**. Bonus: thêm cấu hình `TAX_MIN_MONTHLY_INCOME=2000000` để khớp với threshold "2 triệu / tháng" trong feedback GĐ G (nếu user muốn — hiện tại đang là 100M/năm ÷ 12 ≈ 8.3tr/tháng).

## 6. Frontend

### 6.1 Vai trò mới `warehouse_staff`
- Sidebar group "Kho" với items: Chờ xác nhận tồn / Đang soạn / Chờ pickup
- Permissions whitelist các route `/warehouse/*`

### 6.2 New pages
- `/warehouse/dashboard` — bảng tổng 4 cột (theo status)
- `/warehouse/pending-inventory` — list + buttons "Có hàng" / "Hết hàng"
- `/warehouse/packing` — list + button "Bắt đầu / Xong soạn"
- `/warehouse/awaiting-pickup` — list + mã QR pickup
- `/ctv/sales/[id]` — order tracking timeline + actions theo status

### 6.3 OTP & signature UI (CTV side)
- Tab "OTP" — input 6 chữ số, button "Gửi lại"
- Tab "Chữ ký" — `<input type="file" accept="image/*" capture>` (mobile camera)
- Cả hai đều dẫn tới DELIVERED

## 7. Out of scope của MVP v3.3

- SMS/Zalo provider tích hợp thật (OTP log console trong dev)
- Photo signature upload với cloud storage thật (lưu local `backend/uploads/signatures/`)
- Refund flow (cancel sau PAID)
- Color-coded label printing (Sáng/Chiều/Tối — Xanh/Vàng/Đỏ) — chỉ tag text
- Real-time push notification cho thủ kho
- 5-phút SLA enforcement với escalation (chỉ ghi `inventory_confirmed_at`, chưa alert)

## 8. Implementation checklist

- [x] Spec doc (this file)
- [ ] Schema migration
- [ ] `orderFlow.js` state machine service
- [ ] `otpService.js` extension cho delivery OTP
- [ ] Backend routes (warehouse + ctv orders)
- [ ] Commission filter update
- [ ] Sidebar + permissions cho `warehouse_staff`
- [ ] Warehouse pages
- [ ] CTV order tracking page
- [ ] Update populate-product-catalog hoặc seed để có warehouse_staff demo user
