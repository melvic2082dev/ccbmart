# Spec 01 — Product M0: Variant + Supplier + Batch

**Status:** Draft for implementation
**Author:** Claude (per Willy Minh request)
**Date:** 2026-05-15
**Estimated effort:** 8–12 dev days (solo)
**Depends on:** Hardening §3.1 (test scaffolding) ideally complete first; not a hard block

---

## 1. Vấn đề & mục tiêu

### 1.1 Hiện trạng
- `Product` model phẳng: chỉ `name, category, price, cogsPct, unit` (`schema.prisma:142-154`)
- `TransactionItem` **đã có trong schema** nhưng **KHÔNG được dùng** trong flow CTV submit hiện tại (`backend/src/services/transaction.js:75-91` set thẳng `totalAmount = COMBO_PRICE` từ env, không insert item)
- Toàn bộ giao dịch hiện đại diện cho 1 combo cố định 1.8M VND, không track sản phẩm chi tiết
- Không có khái niệm SKU/variant, supplier, lô hàng, hạn sử dụng (ngoài `InventoryWarning` rời rạc)

### 1.2 Mục tiêu M0
Cho phép catalog có:
1. **Variant**: 1 product nhiều quy cách (gạo 5kg vs 10kg) — mỗi variant có SKU + giá riêng
2. **Supplier**: track nhà cung cấp (đặc biệt: CCB hộ kinh doanh) + giá nhập
3. **Inventory Batch**: theo lô — biết hạn sử dụng + cost thực tế từng lô (FIFO khi giảm tồn)
4. **Wire Transaction**: chuyển flow combo-fixed → item-based (giữ backward-compat cho data cũ)

### 1.3 Out of scope M0 (để M1)
- Pricing rules theo rank/region/qty
- Product bundle (combo cấu thành từ nhiều SKU)
- Multi-warehouse / chuyển kho
- Returns / refunds chi tiết

---

## 2. Schema thay đổi

### 2.1 Models mới

```prisma
model Supplier {
  id            Int      @id @default(autoincrement())
  name          String
  type          String   // 'ccb_household' | 'external'
  taxCode       String?  @unique @map("tax_code")
  contactName   String?  @map("contact_name")
  contactPhone  String?  @map("contact_phone")
  address       String?
  bankAccount   String?  @map("bank_account")
  bankName      String?  @map("bank_name")
  // Link to BusinessHousehold for CCB suppliers (existing model)
  householdId   Int?     @unique @map("household_id")
  isActive      Boolean  @default(true) @map("is_active")
  notes         String?  @db.Text
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  household        BusinessHousehold? @relation(fields: [householdId], references: [id])
  supplierProducts SupplierProduct[]
  batches          InventoryBatch[]

  @@index([type])
  @@index([isActive])
  @@map("suppliers")
}

model ProductVariant {
  id            Int      @id @default(autoincrement())
  productId     Int      @map("product_id")
  sku           String   @unique
  name          String   // e.g. "Gạo ST25 — túi 5kg"
  attributes    Json?    // { size: '5kg', color: 'red', ... }
  unit          String   // 'túi', 'hộp', 'chai'
  basePrice     Decimal  @map("base_price") @db.Decimal(15, 0)
  cogsPct       Decimal  @map("cogs_pct") @db.Decimal(5, 4)
  weightGrams   Int?     @map("weight_grams")
  imageUrl      String?  @map("image_url")
  status        String   @default("ACTIVE") // DRAFT | ACTIVE | DEPLETED | ARCHIVED
  sortOrder     Int      @default(0) @map("sort_order")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  product          Product           @relation(fields: [productId], references: [id])
  supplierProducts SupplierProduct[]
  batches          InventoryBatch[]
  transactionItems TransactionItem[]

  @@index([productId])
  @@index([status])
  @@index([productId, status])
  @@map("product_variants")
}

model SupplierProduct {
  id              Int      @id @default(autoincrement())
  supplierId      Int      @map("supplier_id")
  variantId       Int      @map("variant_id")
  costPerUnit     Decimal  @map("cost_per_unit") @db.Decimal(15, 0)
  minimumOrderQty Int      @default(1) @map("minimum_order_qty")
  leadTimeDays    Int?     @map("lead_time_days")
  isPreferred     Boolean  @default(false) @map("is_preferred")
  validFrom       DateTime @default(now()) @map("valid_from")
  validUntil      DateTime? @map("valid_until")

  supplier Supplier       @relation(fields: [supplierId], references: [id])
  variant  ProductVariant @relation(fields: [variantId], references: [id])

  @@unique([supplierId, variantId, validFrom])
  @@index([variantId])
  @@index([supplierId])
  @@map("supplier_products")
}

model InventoryBatch {
  id            Int      @id @default(autoincrement())
  variantId     Int      @map("variant_id")
  supplierId    Int?     @map("supplier_id")
  batchNo       String   @map("batch_no")
  qtyReceived   Int      @map("qty_received")
  qtyAvailable  Int      @map("qty_available")
  costPerUnit   Decimal  @map("cost_per_unit") @db.Decimal(15, 0)
  mfgDate       DateTime? @map("mfg_date")
  expDate       DateTime? @map("exp_date")
  receivedAt    DateTime @default(now()) @map("received_at")
  agencyId      Int?     @map("agency_id") // null = trung tâm
  status        String   @default("ACTIVE") // ACTIVE | DEPLETED | EXPIRED | RECALLED
  notes         String?  @db.Text

  variant  ProductVariant @relation(fields: [variantId], references: [id])
  supplier Supplier?      @relation(fields: [supplierId], references: [id])
  agency   Agency?        @relation("AgencyBatches", fields: [agencyId], references: [id])

  @@unique([variantId, batchNo])
  @@index([variantId])
  @@index([variantId, status])
  @@index([expDate])
  @@map("inventory_batches")
}
```

### 2.2 Sửa model cũ

#### Product
```prisma
model Product {
  id          Int      @id @default(autoincrement())
  name        String
  slug        String   @unique  // NEW — match LandingProduct.slug
  category    String
  description String?  @db.Text  // NEW
  brand       String?           // NEW
  origin      String?           // NEW — vùng miền
  price       Decimal  @db.Decimal(15, 0)  // KEEP — sẽ deprecate sau khi all variants live
  cogsPct     Decimal  @map("cogs_pct") @db.Decimal(5, 4)  // KEEP — fallback
  unit        String
  status      String   @default("ACTIVE")  // NEW — DRAFT | ACTIVE | ARCHIVED
  createdAt   DateTime @default(now()) @map("created_at")  // NEW
  updatedAt   DateTime @updatedAt @map("updated_at")  // NEW

  variants          ProductVariant[]     // NEW
  transactionItems  TransactionItem[]
  inventoryWarnings InventoryWarning[]

  @@index([category])
  @@index([slug])
  @@index([status])
  @@map("products")
}
```

#### TransactionItem (thêm variantId, vẫn giữ productId)
```prisma
model TransactionItem {
  id            Int      @id @default(autoincrement())
  transactionId Int      @map("transaction_id")
  productId     Int      @map("product_id")
  variantId     Int?     @map("variant_id")  // NEW — null cho data legacy combo
  batchId       Int?     @map("batch_id")    // NEW — track lô đã trừ
  quantity      Int
  unitPrice     Decimal  @map("unit_price") @db.Decimal(15, 0)
  unitCogs      Decimal? @map("unit_cogs") @db.Decimal(15, 0)  // NEW — cost thực tế từ batch
  totalPrice    Decimal  @map("total_price") @db.Decimal(15, 0)

  transaction Transaction     @relation(fields: [transactionId], references: [id])
  product     Product         @relation(fields: [productId], references: [id])
  variant     ProductVariant? @relation(fields: [variantId], references: [id])
  batch       InventoryBatch? @relation(fields: [batchId], references: [id])

  @@index([transactionId])
  @@index([productId])
  @@index([variantId])
  @@map("transaction_items")
}
```

#### BusinessHousehold thêm relation ngược
```prisma
model BusinessHousehold {
  // ... existing fields ...
  supplier Supplier?  // NEW
}
```

#### Agency thêm relation ngược
```prisma
model Agency {
  // ... existing fields ...
  batches InventoryBatch[] @relation("AgencyBatches")  // NEW
}
```

---

## 3. Migration plan

### 3.1 File
`backend/prisma/migrations/20260520_p_m0_product_variant_supplier/migration.sql`

### 3.2 Order
1. Create tables `suppliers`, `product_variants`, `supplier_products`, `inventory_batches`
2. Add columns to `products`: `slug`, `description`, `brand`, `origin`, `status`, `created_at`, `updated_at`
3. Add columns to `transaction_items`: `variant_id`, `batch_id`, `unit_cogs`
4. Backfill `products.slug` from existing rows: `slug = lower(replace(name, ' ', '-')) || '-' || id`
5. Backfill `products.status = 'ACTIVE'` for all existing
6. Make `products.slug` UNIQUE NOT NULL
7. Create indexes

### 3.3 Rollback
`backend/prisma/migrations/rollback_p_m0.sql`:
```sql
ALTER TABLE transaction_items DROP COLUMN variant_id, DROP COLUMN batch_id, DROP COLUMN unit_cogs;
ALTER TABLE products DROP COLUMN slug, DROP COLUMN description, DROP COLUMN brand,
  DROP COLUMN origin, DROP COLUMN status, DROP COLUMN created_at, DROP COLUMN updated_at;
DROP TABLE inventory_batches;
DROP TABLE supplier_products;
DROP TABLE product_variants;
DROP TABLE suppliers;
```

### 3.4 Data seeding
- Cập nhật `backend/prisma/seed.js`:
  - Tạo 5 Supplier mẫu (3 ccb_household + 2 external)
  - Mỗi product có 2-3 variant
  - Mỗi variant có 1 batch active 100 qty

---

## 4. Impact lên Transaction flow

### 4.1 Hiện tại (combo fixed)
`backend/src/services/transaction.js:75-91`:
```javascript
const totalAmount = COMBO_PRICE;                  // env
const cogsAmount = totalAmount * COMBO_COGS_PCT;  // env
// → tạo Transaction, KHÔNG tạo TransactionItem
```

### 4.2 Sau M0 (item-based, backward-compat)

#### 4.2.1 Service mới: `backend/src/services/inventory.js`
```javascript
// FIFO trừ batch
async function allocateBatch(variantId, quantity, agencyId = null) {
  return prisma.$transaction(async (tx) => {
    const batches = await tx.inventoryBatch.findMany({
      where: { variantId, agencyId, status: 'ACTIVE', qtyAvailable: { gt: 0 } },
      orderBy: [{ expDate: 'asc' }, { receivedAt: 'asc' }],
    });
    const allocations = [];
    let remaining = quantity;
    for (const b of batches) {
      if (remaining <= 0) break;
      const take = Math.min(b.qtyAvailable, remaining);
      await tx.inventoryBatch.update({
        where: { id: b.id },
        data: {
          qtyAvailable: b.qtyAvailable - take,
          status: b.qtyAvailable - take === 0 ? 'DEPLETED' : 'ACTIVE',
        },
      });
      allocations.push({ batchId: b.id, qty: take, costPerUnit: b.costPerUnit });
      remaining -= take;
    }
    if (remaining > 0) throw new Error(`Insufficient stock for variant ${variantId}, short ${remaining}`);
    return allocations;
  });
}
```

#### 4.2.2 Sửa `transaction.js:createCtvTransaction`
Thêm parameter `items: [{ variantId, quantity }]`. Backward-compat: nếu items rỗng → fallback COMBO mode (giữ behavior cũ).

```javascript
async function createCtvTransaction({ ctvId, customerName, customerPhone, paymentMethod, items }) {
  // ... customer create logic (unchanged) ...

  let totalAmount, cogsAmount, itemRows = [];

  if (items && items.length > 0) {
    // NEW item-based flow
    const variantIds = items.map(i => i.variantId);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds }, status: 'ACTIVE' },
    });
    if (variants.length !== variantIds.length) throw new Error('Variant inactive or not found');

    totalAmount = 0; cogsAmount = 0;
    for (const it of items) {
      const v = variants.find(x => x.id === it.variantId);
      const lineTotal = Number(v.basePrice) * it.quantity;
      // allocate from FIFO batches
      const allocs = await allocateBatch(v.id, it.quantity);
      const lineCogs = allocs.reduce((s, a) => s + Number(a.costPerUnit) * a.qty, 0);
      totalAmount += lineTotal;
      cogsAmount += lineCogs;
      // each allocation = one TransactionItem row to preserve batch traceability
      for (const a of allocs) {
        itemRows.push({
          productId: v.productId,
          variantId: v.id,
          batchId: a.batchId,
          quantity: a.qty,
          unitPrice: v.basePrice,
          unitCogs: a.costPerUnit,
          totalPrice: Number(v.basePrice) * a.qty,
        });
      }
    }
  } else {
    // LEGACY combo mode (preserve)
    totalAmount = COMBO_PRICE;
    cogsAmount = totalAmount * COMBO_COGS_PCT;
  }

  const tx = await prisma.transaction.create({
    data: { customerId, ctvId, channel: 'ctv', totalAmount, cogsAmount, status: 'PENDING', /* ... */ },
  });
  if (itemRows.length > 0) {
    await prisma.transactionItem.createMany({
      data: itemRows.map(r => ({ ...r, transactionId: tx.id })),
    });
  }
  return tx;
}
```

#### 4.2.3 Khi REJECT transaction → trả batch về kho
Trong `confirmCtvTransaction` (hoặc `rejectCtvTransaction`): nếu status đổi sang REJECTED, gọi `restoreBatch(transactionId)` increment lại `qtyAvailable`.

### 4.3 Commission impact
`commission.js` hiện đọc `totalAmount` từ Transaction → KHÔNG thay đổi.
`cogsAmount` → KHÔNG thay đổi (vẫn lưu tổng).
→ **0 thay đổi trong commission engine.** Chỉ cách tính `cogsAmount` đầu vào đổi (từ %fixed → tổng `unit_cogs` từ batch).

### 4.4 Report impact
`monthlyReport.js` cần thêm breakdown by variant nếu muốn:
- Top 10 SKU bán chạy
- Margin per SKU (price - actual_cogs)
- Slow-moving inventory (batches with qty > 0 + last_sale > 30 days)

→ Optional, không block ship M0.

---

## 5. Admin UI

### 5.1 Trang mới (3 trang)
| Route | File | Chức năng |
|---|---|---|
| `/admin/products` | `frontend/src/app/admin/products/page.tsx` | List products + variants tree, status filter, search |
| `/admin/products/[id]` | `frontend/src/app/admin/products/[id]/page.tsx` | Edit product + manage variants inline |
| `/admin/suppliers` | `frontend/src/app/admin/suppliers/page.tsx` | List + CRUD suppliers (CCB household auto-linked) |
| `/admin/inventory` | `frontend/src/app/admin/inventory/page.tsx` | Batch view: active/expiring/depleted, FIFO check |

### 5.2 Trang sửa (1 trang)
| Route | Change |
|---|---|
| `/admin/dashboard` | Thêm card "Top variants" + "Batches sắp hết hạn (30 ngày)" |

### 5.3 API routes mới
`backend/src/routes/products.js`:
- `GET /api/admin/products` — list + filter
- `POST /api/admin/products` — create
- `PUT /api/admin/products/:id` — update
- `POST /api/admin/products/:id/variants` — add variant
- `PUT /api/admin/variants/:id` — update variant
- `POST /api/admin/variants/:id/batches` — receive new batch
- `GET /api/admin/inventory` — batches list with filters
- `GET /api/admin/suppliers`, `POST`, `PUT`, `DELETE` (soft)

Mount in `backend/src/server.js`. Apply existing `validate` middleware (Joi) + `writeLimiter`.

---

## 6. Phasing

| Phase | Việc | Days |
|---|---|---|
| **M0a** | Schema + migration + seed cập nhật | 2 |
| **M0b** | Backend routes + service inventory.js + tests | 3 |
| **M0c** | Admin UI products + suppliers + inventory | 3 |
| **M0d** | Wire `createCtvTransaction` (feature flag `USE_VARIANT_FLOW`) + tests | 2 |
| **M0e** | Smoke test → flip flag on staging → soak 1 tuần → flip on prod | 1 |
| **Total** | | **11 days** |

---

## 7. Acceptance criteria

- [ ] Migration apply clean trên Postgres dev + staging
- [ ] Rollback SQL test pass
- [ ] Admin tạo được product với 2 variant, gán supplier, nhập 1 batch 100qty
- [ ] CTV submit transaction với `items: [{ variantId, qty }]` → 1 Transaction + N TransactionItem rows, batch qty giảm đúng
- [ ] CTV submit không có items → fallback combo mode (legacy behavior bit-identical)
- [ ] Reject transaction → batch qty restore
- [ ] FIFO test: 2 batches (exp sớm + exp muộn), bán 1 unit → batch exp sớm bị trừ trước
- [ ] Cogs calculation: nếu batch costPerUnit=100k, basePrice=150k, sell 2 unit → cogsAmount=200k (không phải `totalPrice × cogsPct`)
- [ ] Insufficient stock → throw error, transaction rollback (Prisma `$transaction`)
- [ ] Commission engine cho ra cùng số tiền với cùng `totalAmount` trước và sau M0
- [ ] Test coverage `services/inventory.js` ≥ 80%

---

## 8. Risk & mitigation

| Risk | Mitigation |
|---|---|
| Data legacy combo không có TransactionItem → report bị skew | Migration backfill: cho mỗi transaction cũ tạo 1 TransactionItem với productId=0 (sentinel) + variantId=NULL. Report ignore variantId=NULL. |
| Race condition allocate batch đồng thời 2 CTV | `prisma.$transaction` + `SELECT FOR UPDATE` (raw SQL) trong allocateBatch |
| Frontend chưa update form → vẫn submit không items → fallback combo silently | Feature flag `USE_VARIANT_FLOW` default off; bật trên staging trước; document rõ cho team |
| Variant `attributes` JSON khó query | Lưu phẳng các attribute hay query (size, color) thành column riêng nếu cần — không làm sớm |

---

## 9. Files thay đổi (tổng kết)

**Backend (8):**
- `backend/prisma/schema.prisma` (+~80 lines)
- `backend/prisma/migrations/20260520_p_m0_*/migration.sql` (new)
- `backend/prisma/migrations/rollback_p_m0.sql` (new)
- `backend/prisma/seed.js` (+~60 lines for variants/suppliers/batches)
- `backend/src/services/inventory.js` (new ~120 lines)
- `backend/src/services/transaction.js` (modify createCtvTransaction ~40 lines)
- `backend/src/routes/products.js` (new ~180 lines)
- `backend/src/server.js` (+1 line mount)
- `backend/__tests__/services/inventory.test.js` (new)
- `backend/__tests__/services/transaction-variant.test.js` (new)

**Frontend (5):**
- `frontend/src/app/admin/products/page.tsx` (new)
- `frontend/src/app/admin/products/[id]/page.tsx` (new)
- `frontend/src/app/admin/suppliers/page.tsx` (new)
- `frontend/src/app/admin/inventory/page.tsx` (new)
- `frontend/src/lib/api.ts` (+variant/supplier/batch endpoints)

**Sidebar nav:** `frontend/src/components/admin/Sidebar.tsx` add 3 items.

---

## 10. Định nghĩa M1 (sau M0)
- `PriceRule` (rank × region × minQty → discount)
- `ProductBundle` (combo nhiều SKU)
- Returns / refunds với batch restore tự động
- Multi-warehouse + chuyển kho
- Forecast tồn kho (slow-mover, fast-mover)

→ Đợi M0 live ≥ 1 tháng có data thật rồi quyết định.
