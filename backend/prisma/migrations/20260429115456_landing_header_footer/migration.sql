-- CreateTable
CREATE TABLE "landing_header" (
    "id" SERIAL NOT NULL,
    "hotline" TEXT NOT NULL DEFAULT '1900 6868',
    "shipping_note" TEXT NOT NULL DEFAULT 'Miễn phí giao hàng đơn trên 300.000 ₫',
    "search_placeholder" TEXT NOT NULL DEFAULT 'Tìm gạo, nước mắm, trà Shan Tuyết…',
    "utility_links" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_header_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_footer" (
    "id" SERIAL NOT NULL,
    "hotline" TEXT NOT NULL DEFAULT '1900 6868',
    "hotline_note" TEXT NOT NULL DEFAULT 'Đường dây ưu tiên dành cho Cựu Chiến Binh — 7:00 đến 21:00 mỗi ngày.',
    "address_line1" TEXT NOT NULL DEFAULT 'Số 19 đường Lê Đức Thọ',
    "address_line2" TEXT NOT NULL DEFAULT 'Mỹ Đình 2, Nam Từ Liêm, Hà Nội',
    "address_hours" TEXT NOT NULL DEFAULT 'Mở cửa 8:00 — 20:00',
    "commitments" JSONB NOT NULL DEFAULT '[]',
    "copyright" TEXT NOT NULL DEFAULT '© 2026 CCB Mart — Hệ thống bán lẻ của cộng đồng Cựu Chiến Binh Việt Nam',
    "verified_badge" TEXT NOT NULL DEFAULT 'Hội CCB Việt Nam xác nhận',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_footer_pkey" PRIMARY KEY ("id")
);
