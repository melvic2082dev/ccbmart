-- Rollback for 20260515180000_p_v3_1_product_crm
-- WARNING: Will delete all data in new tables. Run only on dev/staging.

BEGIN;

-- Drop new tables (in dependency order)
DROP TABLE IF EXISTS "lead_activities";
DROP TABLE IF EXISTS "leads";
DROP TABLE IF EXISTS "inventory_batches";
DROP TABLE IF EXISTS "supplier_products";
DROP TABLE IF EXISTS "product_variants";
DROP TABLE IF EXISTS "suppliers";

-- Revert column additions on existing tables
ALTER TABLE "transaction_items"
  DROP COLUMN IF EXISTS "batch_id",
  DROP COLUMN IF EXISTS "unit_cogs",
  DROP COLUMN IF EXISTS "variant_id";

ALTER TABLE "customers"
  DROP COLUMN IF EXISTS "last_contacted_at",
  DROP COLUMN IF EXISTS "lifecycle_stage",
  DROP COLUMN IF EXISTS "notes",
  DROP COLUMN IF EXISTS "total_orders";

ALTER TABLE "products"
  DROP COLUMN IF EXISTS "brand",
  DROP COLUMN IF EXISTS "created_at",
  DROP COLUMN IF EXISTS "description",
  DROP COLUMN IF EXISTS "origin",
  DROP COLUMN IF EXISTS "slug",
  DROP COLUMN IF EXISTS "status",
  DROP COLUMN IF EXISTS "updated_at";

-- Remove the migration record so prisma migrate dev can re-apply if needed
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20260515180000_p_v3_1_product_crm';

COMMIT;
