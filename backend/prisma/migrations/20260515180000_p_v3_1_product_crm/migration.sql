-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "last_contacted_at" TIMESTAMP(3),
ADD COLUMN     "lifecycle_stage" TEXT NOT NULL DEFAULT 'NEW',
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "total_orders" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "brand" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "origin" TEXT,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "transaction_items" ADD COLUMN     "batch_id" INTEGER,
ADD COLUMN     "unit_cogs" DECIMAL(15,0),
ADD COLUMN     "variant_id" INTEGER;

-- CreateTable
CREATE TABLE "suppliers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "tax_code" TEXT,
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "address" TEXT,
    "bank_account" TEXT,
    "bank_name" TEXT,
    "household_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "attributes" JSONB,
    "unit" TEXT NOT NULL,
    "base_price" DECIMAL(15,0) NOT NULL,
    "cogs_pct" DECIMAL(5,4) NOT NULL,
    "weight_grams" INTEGER,
    "image_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_products" (
    "id" SERIAL NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "variant_id" INTEGER NOT NULL,
    "cost_per_unit" DECIMAL(15,0) NOT NULL,
    "minimum_order_qty" INTEGER NOT NULL DEFAULT 1,
    "lead_time_days" INTEGER,
    "is_preferred" BOOLEAN NOT NULL DEFAULT false,
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMP(3),

    CONSTRAINT "supplier_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_batches" (
    "id" SERIAL NOT NULL,
    "variant_id" INTEGER NOT NULL,
    "supplier_id" INTEGER,
    "batch_no" TEXT NOT NULL,
    "qty_received" INTEGER NOT NULL,
    "qty_available" INTEGER NOT NULL,
    "cost_per_unit" DECIMAL(15,0) NOT NULL,
    "mfg_date" TIMESTAMP(3),
    "exp_date" TIMESTAMP(3),
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agency_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,

    CONSTRAINT "inventory_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "zalo_name" TEXT,
    "email" TEXT,
    "source" TEXT NOT NULL,
    "source_detail" TEXT,
    "interest_note" TEXT,
    "estimated_value" DECIMAL(15,0),
    "stage" TEXT NOT NULL DEFAULT 'NEW',
    "lost_reason" TEXT,
    "assigned_ctv_id" INTEGER NOT NULL,
    "customer_id" INTEGER,
    "next_action_at" TIMESTAMP(3),
    "next_action_note" TEXT,
    "last_contacted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_activities" (
    "id" SERIAL NOT NULL,
    "lead_id" INTEGER,
    "customer_id" INTEGER,
    "ctv_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "outcome" TEXT,
    "duration_min" INTEGER,
    "notes" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_tax_code_key" ON "suppliers"("tax_code");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_household_id_key" ON "suppliers"("household_id");

-- CreateIndex
CREATE INDEX "suppliers_type_idx" ON "suppliers"("type");

-- CreateIndex
CREATE INDEX "suppliers_is_active_idx" ON "suppliers"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "product_variants_product_id_idx" ON "product_variants"("product_id");

-- CreateIndex
CREATE INDEX "product_variants_status_idx" ON "product_variants"("status");

-- CreateIndex
CREATE INDEX "product_variants_product_id_status_idx" ON "product_variants"("product_id", "status");

-- CreateIndex
CREATE INDEX "supplier_products_variant_id_idx" ON "supplier_products"("variant_id");

-- CreateIndex
CREATE INDEX "supplier_products_supplier_id_idx" ON "supplier_products"("supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_products_supplier_id_variant_id_valid_from_key" ON "supplier_products"("supplier_id", "variant_id", "valid_from");

-- CreateIndex
CREATE INDEX "inventory_batches_variant_id_idx" ON "inventory_batches"("variant_id");

-- CreateIndex
CREATE INDEX "inventory_batches_variant_id_status_idx" ON "inventory_batches"("variant_id", "status");

-- CreateIndex
CREATE INDEX "inventory_batches_exp_date_idx" ON "inventory_batches"("exp_date");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_batches_variant_id_batch_no_key" ON "inventory_batches"("variant_id", "batch_no");

-- CreateIndex
CREATE INDEX "leads_assigned_ctv_id_idx" ON "leads"("assigned_ctv_id");

-- CreateIndex
CREATE INDEX "leads_assigned_ctv_id_stage_idx" ON "leads"("assigned_ctv_id", "stage");

-- CreateIndex
CREATE INDEX "leads_next_action_at_idx" ON "leads"("next_action_at");

-- CreateIndex
CREATE INDEX "leads_stage_idx" ON "leads"("stage");

-- CreateIndex
CREATE UNIQUE INDEX "leads_phone_assigned_ctv_id_key" ON "leads"("phone", "assigned_ctv_id");

-- CreateIndex
CREATE INDEX "lead_activities_lead_id_idx" ON "lead_activities"("lead_id");

-- CreateIndex
CREATE INDEX "lead_activities_customer_id_idx" ON "lead_activities"("customer_id");

-- CreateIndex
CREATE INDEX "lead_activities_ctv_id_idx" ON "lead_activities"("ctv_id");

-- CreateIndex
CREATE INDEX "lead_activities_ctv_id_occurred_at_idx" ON "lead_activities"("ctv_id", "occurred_at");

-- CreateIndex
CREATE INDEX "customers_ctv_id_idx" ON "customers"("ctv_id");

-- CreateIndex
CREATE INDEX "customers_lifecycle_stage_idx" ON "customers"("lifecycle_stage");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE INDEX "transaction_items_variant_id_idx" ON "transaction_items"("variant_id");

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "business_households"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "inventory_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_ctv_id_fkey" FOREIGN KEY ("assigned_ctv_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_ctv_id_fkey" FOREIGN KEY ("ctv_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

