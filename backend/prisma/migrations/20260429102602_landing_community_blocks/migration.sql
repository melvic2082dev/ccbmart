-- AlterTable
ALTER TABLE "landing_products" ADD COLUMN     "producer_contribution" INTEGER,
ADD COLUMN     "producer_hometown" TEXT,
ADD COLUMN     "producer_name" TEXT,
ADD COLUMN     "producer_unit" TEXT;

-- CreateTable
CREATE TABLE "landing_why_us" (
    "id" SERIAL NOT NULL,
    "eyebrow" TEXT NOT NULL DEFAULT 'Câu chuyện CCB Mart',
    "title" TEXT NOT NULL DEFAULT 'Tại sao chúng tôi làm dự án này?',
    "body" TEXT NOT NULL,
    "image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_why_us_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_community_photos" (
    "id" SERIAL NOT NULL,
    "image_url" TEXT,
    "caption" TEXT NOT NULL,
    "impact_value" TEXT,
    "impact_label" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_community_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_fund_entries" (
    "id" SERIAL NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "balance" INTEGER,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_fund_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_testimonials" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "unit" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL,
    "photo_url" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "landing_community_photos_is_active_display_order_idx" ON "landing_community_photos"("is_active", "display_order");

-- CreateIndex
CREATE INDEX "landing_fund_entries_is_active_occurred_at_idx" ON "landing_fund_entries"("is_active", "occurred_at");

-- CreateIndex
CREATE INDEX "landing_testimonials_is_active_display_order_idx" ON "landing_testimonials"("is_active", "display_order");
