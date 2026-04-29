-- CreateTable
CREATE TABLE "landing_hero" (
    "id" SERIAL NOT NULL,
    "eyebrow" TEXT NOT NULL DEFAULT 'Hệ thống bán lẻ · Cựu Chiến Binh Việt Nam',
    "title" TEXT NOT NULL DEFAULT 'Hàng Việt chất lượng, do Cựu Chiến Binh cung cấp.',
    "subtitle" TEXT NOT NULL,
    "image_url" TEXT,
    "primary_cta_text" TEXT NOT NULL DEFAULT 'Mua sắm ngay',
    "primary_cta_href" TEXT NOT NULL DEFAULT '#featured',
    "secondary_cta_text" TEXT,
    "secondary_cta_href" TEXT,
    "stat1_value" TEXT NOT NULL DEFAULT '2.400+',
    "stat1_label" TEXT NOT NULL DEFAULT 'Nhà cung cấp Cựu Chiến Binh',
    "stat2_value" TEXT NOT NULL DEFAULT '63',
    "stat2_label" TEXT NOT NULL DEFAULT 'Tỉnh / thành phố có mặt',
    "stat3_value" TEXT NOT NULL DEFAULT '180k+',
    "stat3_label" TEXT NOT NULL DEFAULT 'Đơn hàng đã giao',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_hero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_promo_banner" (
    "id" SERIAL NOT NULL,
    "eyebrow" TEXT NOT NULL DEFAULT 'Chương trình đặc biệt',
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "image_url" TEXT,
    "primary_cta_text" TEXT NOT NULL DEFAULT 'Xem ưu đãi',
    "primary_cta_href" TEXT NOT NULL DEFAULT '#',
    "secondary_cta_text" TEXT,
    "secondary_cta_href" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_promo_banner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_trust_items" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "icon_name" TEXT NOT NULL DEFAULT 'ShieldCheck',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_trust_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_featured_products" (
    "id" SERIAL NOT NULL,
    "section" TEXT NOT NULL,
    "product_slug" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_featured_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "landing_trust_items_is_active_display_order_idx" ON "landing_trust_items"("is_active", "display_order");

-- CreateIndex
CREATE INDEX "landing_featured_products_section_is_active_display_order_idx" ON "landing_featured_products"("section", "is_active", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "landing_featured_products_section_product_slug_key" ON "landing_featured_products"("section", "product_slug");
