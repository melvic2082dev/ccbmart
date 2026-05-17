-- p_v3_2: Region + Warehouse for product catalog
-- Adds Product.region (BAC|TRUNG|NAM), Warehouse table, Product.warehouseId FK.

-- CreateTable
CREATE TABLE "warehouses" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_code_key" ON "warehouses"("code");
CREATE INDEX "warehouses_is_active_idx" ON "warehouses"("is_active");

-- AlterTable: Product
ALTER TABLE "products" ADD COLUMN "region" TEXT;
ALTER TABLE "products" ADD COLUMN "warehouse_id" INTEGER;

-- CreateIndex
CREATE INDEX "products_region_idx" ON "products"("region");
CREATE INDEX "products_warehouse_id_idx" ON "products"("warehouse_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_warehouse_id_fkey"
    FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
