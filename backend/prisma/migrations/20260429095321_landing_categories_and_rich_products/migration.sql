-- AlterTable
ALTER TABLE "landing_products" ADD COLUMN     "brand" TEXT NOT NULL DEFAULT '—',
ADD COLUMN     "certifications" TEXT NOT NULL DEFAULT '—',
ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "distributor" TEXT NOT NULL DEFAULT '—',
ADD COLUMN     "origin" TEXT NOT NULL DEFAULT '—',
ADD COLUMN     "thumbs" JSONB,
ADD COLUMN     "weight" TEXT NOT NULL DEFAULT '—';

-- CreateTable
CREATE TABLE "landing_categories" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'tag',
    "tone" TEXT NOT NULL DEFAULT 'paper',
    "description" TEXT NOT NULL,
    "product_count" INTEGER NOT NULL DEFAULT 0,
    "filters" JSONB,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "landing_categories_slug_key" ON "landing_categories"("slug");

-- CreateIndex
CREATE INDEX "landing_categories_is_active_display_order_idx" ON "landing_categories"("is_active", "display_order");
