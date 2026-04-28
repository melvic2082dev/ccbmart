'use client';

import './landing.css';
import { Header } from './Header';
import { Hero } from './Hero';
import { ProductGrid, type Product } from './ProductGrid';
import { CategoryStrip, CommunityVoices, Footer, PromoBanner, RegionStrip, TrustBar } from './Sections';

const featured: Product[] = [
  { id: 'p1', name: 'Gạo ST25 Sóc Trăng — Túi 5 kg', art: 'GẠO\nST25', tone: 'gold',  price: 187000, was: 220000, rating: 4.9, sold: '1.2k', region: 'Sóc Trăng',  badges: [{ label: '−15%', variant: 'red' }, { label: 'Hot', variant: 'gold' }], verified: true },
  { id: 'p2', name: 'Nước mắm nhỉ cá cơm 35 độ — 500 ml',                art: 'MẮM\nCÁ CƠM',  tone: 'red',   price: 95000,                 rating: 4.8, sold: '860', region: 'Phú Quốc',   badges: [{ label: 'Đặc sản', variant: 'soft' }], verified: true },
  { id: 'p3', name: 'Trà Shan Tuyết cổ thụ Hà Giang — 200 g',            art: 'TRÀ\nSHAN TUYẾT', tone: 'olive', price: 240000, was: 280000, rating: 5.0, sold: '420', region: 'Hà Giang',   badges: [{ label: 'CCB chọn', variant: 'oliveSoft' }], verified: true },
  { id: 'p4', name: 'Cà phê Robusta rang xay — 500 g',                   art: 'CÀ PHÊ\nBUÔN MA THUỘT', tone: 'paper', price: 132000,                rating: 4.7, sold: '2.1k', region: 'Đắk Lắk',    badges: [{ label: 'Bán chạy', variant: 'red' }] },
  { id: 'p5', name: 'Mật ong rừng U Minh — Chai 500 ml',                  art: 'MẬT ONG\nRỪNG', tone: 'gold',  price: 175000,                 rating: 4.9, sold: '530', region: 'Cà Mau',     badges: [{ label: 'Mới', variant: 'gold' }], verified: true },
  { id: 'p6', name: 'Tôm khô Bạc Liêu loại 1 — 250 g',                   art: 'TÔM KHÔ\nBẠC LIÊU', tone: 'red',   price: 320000, was: 360000, rating: 4.8, sold: '310', region: 'Bạc Liêu',   badges: [{ label: '−11%', variant: 'red' }] },
  { id: 'p7', name: 'Chè Tân Cương Thái Nguyên — Hộp 200 g',             art: 'CHÈ\nTÂN CƯƠNG', tone: 'olive', price: 110000,                 rating: 4.7, sold: '980', region: 'Thái Nguyên', badges: [{ label: 'CCB chọn', variant: 'oliveSoft' }], verified: true },
  { id: 'p8', name: 'Hạt điều rang muối Bình Phước — Hộp 400 g',         art: 'HẠT ĐIỀU\nBÌNH PHƯỚC', tone: 'paper', price: 165000,                 rating: 4.8, sold: '1.5k', region: 'Bình Phước', badges: [{ label: 'Bán chạy', variant: 'red' }] },
];

const deals: Product[] = [
  { id: 'd1', name: 'Combo bữa cơm gia đình — Gạo + Mắm + Trà',         art: 'COMBO\nBỮA CƠM', tone: 'red',   price: 389000, was: 460000, rating: 4.9, sold: '210', badges: [{ label: '−15%', variant: 'red' }, { label: 'Combo', variant: 'gold' }] },
  { id: 'd2', name: 'Quà Tết CCB — Hộp đặc sản 4 món',                   art: 'QUÀ TẾT\nCCB',   tone: 'gold',  price: 580000, was: 690000, rating: 5.0, sold: '95',  badges: [{ label: '−16%', variant: 'red' }], verified: true },
  { id: 'd3', name: 'Hộp gia vị ba miền — Mắm tôm, mắm ruốc, muối ớt',  art: 'GIA VỊ\nBA MIỀN', tone: 'olive', price: 215000, was: 260000, rating: 4.8, sold: '180', badges: [{ label: '−17%', variant: 'red' }] },
  { id: 'd4', name: 'Bộ ấm chén tử sa Bát Tràng — 6 chén',                art: 'ẤM CHÉN\nBÁT TRÀNG', tone: 'paper', price: 720000, was: 850000, rating: 4.9, sold: '60',  badges: [{ label: '−15%', variant: 'red' }, { label: 'Hand-made', variant: 'oliveSoft' }] },
];

export function LandingPage() {
  return (
    <div className="ccb-landing">
      <Header cartCount={0} />
      <Hero />
      <TrustBar />
      <CategoryStrip />
      <ProductGrid id="featured" eyebrow="Hàng tuyển chọn" title="Sản phẩm nổi bật" products={featured} />
      <PromoBanner />
      <ProductGrid eyebrow="Giảm giá tuần này" title="Ưu đãi đặc biệt" products={deals} />
      <RegionStrip />
      <CommunityVoices />
      <Footer />

      <style>{`
        @media (max-width: 880px) {
          .ccb-hero-grid { grid-template-columns: 1fr !important; }
          .ccb-hero-visual { height: 460px !important; }
          .ccb-promo-grid { grid-template-columns: 1fr !important; }
          .ccb-footer-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 540px) {
          .ccb-footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
