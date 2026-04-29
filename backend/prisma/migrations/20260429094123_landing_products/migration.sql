-- CreateTable
CREATE TABLE "landing_products" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "category_slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "art" TEXT NOT NULL DEFAULT '',
    "tone" TEXT NOT NULL DEFAULT 'paper',
    "price" INTEGER NOT NULL DEFAULT 0,
    "was" INTEGER,
    "rating" DECIMAL(2,1) NOT NULL DEFAULT 4.7,
    "sold" TEXT NOT NULL DEFAULT '0',
    "region" TEXT NOT NULL DEFAULT '',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "badges" JSONB,
    "image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "landing_products_slug_key" ON "landing_products"("slug");

-- CreateIndex
CREATE INDEX "landing_products_category_slug_is_active_display_order_idx" ON "landing_products"("category_slug", "is_active", "display_order");

-- CreateIndex
CREATE INDEX "landing_products_is_active_idx" ON "landing_products"("is_active");
