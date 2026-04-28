// Central config: all categories + sample products. Used by Header / CategoryStrip /
// /category/[slug] / /product/[slug] so the navigation lights up consistently
// and every menu link lands somewhere meaningful.

import type { Product } from './ProductGrid';

export type CategoryTone = 'red' | 'olive' | 'gold' | 'paper';

export type Category = {
  slug: string;
  name: string;
  shortName?: string;
  icon: 'wheat' | 'soup' | 'coffee' | 'mountain' | 'sun' | 'palmtree' | 'home' | 'gift' | 'tag' | 'compass';
  tone: CategoryTone;
  description: string;
  productCount: number;
  filters: { regions: { label: string; count: number; checked?: boolean }[] };
};

export type ProductDetail = Product & {
  slug: string;
  category: string;
  brand: string;
  origin: string;
  weight: string;
  certifications: string;
  distributor: string;
  description: string;
  thumbs: string[];
};

export const CATEGORIES: Category[] = [
  {
    slug: 'gao-luong-thuc',
    name: 'Gạo & Lương thực',
    icon: 'wheat',
    tone: 'gold',
    description: 'Gạo thơm, gạo đặc sản, nếp cái hoa vàng, miến dong… tuyển chọn từ các vùng canh tác của hội viên Cựu Chiến Binh trên toàn quốc.',
    productCount: 97,
    filters: { regions: [{ label: 'Miền Bắc', count: 34, checked: true }, { label: 'Miền Trung', count: 18 }, { label: 'Miền Nam', count: 45, checked: true }] },
  },
  {
    slug: 'mam-gia-vi',
    name: 'Mắm & Gia vị',
    icon: 'soup',
    tone: 'red',
    description: 'Nước mắm cốt cá cơm, mắm tôm, mắm ruốc, muối ớt và gia vị truyền thống ba miền do hội viên CCB sản xuất theo quy trình thủ công.',
    productCount: 64,
    filters: { regions: [{ label: 'Miền Bắc', count: 14 }, { label: 'Miền Trung', count: 28, checked: true }, { label: 'Miền Nam', count: 22, checked: true }] },
  },
  {
    slug: 'tra-ca-phe',
    name: 'Trà & Cà phê',
    icon: 'coffee',
    tone: 'olive',
    description: 'Trà Shan Tuyết cổ thụ, chè Tân Cương, cà phê Buôn Ma Thuột. Mỗi sản phẩm đến từ một vùng nguyên liệu CCB Mart trực tiếp bao tiêu.',
    productCount: 52,
    filters: { regions: [{ label: 'Miền Bắc', count: 30, checked: true }, { label: 'Miền Trung', count: 8 }, { label: 'Tây Nguyên', count: 14, checked: true }] },
  },
  {
    slug: 'dac-san-vung-mien',
    name: 'Đặc sản vùng miền',
    icon: 'compass',
    tone: 'olive',
    description: 'Đặc sản theo vùng miền — từ thịt khô Tây Bắc, mè xửng Huế đến tôm khô Bạc Liêu. Danh mục tổng hợp ba miền.',
    productCount: 138,
    filters: { regions: [{ label: 'Miền Bắc', count: 48, checked: true }, { label: 'Miền Trung', count: 39, checked: true }, { label: 'Miền Nam', count: 51, checked: true }] },
  },
  {
    slug: 'dac-san-mien-bac',
    name: 'Đặc sản miền Bắc',
    icon: 'mountain',
    tone: 'olive',
    description: 'Trà Tân Cương, chè Shan Tuyết, mật ong rừng Yên Bái, miến dong Cao Bằng… đặc sản 18 tỉnh phía Bắc do hội viên CCB cung ứng.',
    productCount: 48,
    filters: { regions: [{ label: 'Hà Nội', count: 12, checked: true }, { label: 'Hà Giang', count: 9 }, { label: 'Cao Bằng', count: 7, checked: true }] },
  },
  {
    slug: 'dac-san-mien-trung',
    name: 'Đặc sản miền Trung',
    icon: 'sun',
    tone: 'gold',
    description: 'Tré Huế, mè xửng, nem chua Thanh Hoá, mắm cá cơm Phan Thiết — vị mặn mòi của 19 tỉnh miền Trung.',
    productCount: 39,
    filters: { regions: [{ label: 'Huế', count: 10, checked: true }, { label: 'Đà Nẵng', count: 9 }, { label: 'Phú Yên', count: 6, checked: true }] },
  },
  {
    slug: 'dac-san-mien-nam',
    name: 'Đặc sản miền Nam',
    icon: 'palmtree',
    tone: 'red',
    description: 'Tôm khô Bạc Liêu, kẹo dừa Bến Tre, mật ong U Minh, gạo ST25 Sóc Trăng — đặc sản 19 tỉnh phía Nam.',
    productCount: 51,
    filters: { regions: [{ label: 'Sóc Trăng', count: 11, checked: true }, { label: 'Bến Tre', count: 9, checked: true }, { label: 'Cà Mau', count: 8 }] },
  },
  {
    slug: 'do-gia-dung',
    name: 'Đồ gia dụng',
    icon: 'home',
    tone: 'paper',
    description: 'Ấm chén Bát Tràng, nồi gang Cao Bằng, đồ gốm sứ thủ công — đồ gia dụng truyền thống làng nghề Việt.',
    productCount: 42,
    filters: { regions: [{ label: 'Bát Tràng', count: 18, checked: true }, { label: 'Phù Lãng', count: 8 }, { label: 'Bình Dương', count: 6, checked: true }] },
  },
  {
    slug: 'qua-tang-ccb',
    name: 'Quà tặng CCB',
    icon: 'gift',
    tone: 'red',
    description: 'Hộp quà Tết, combo đặc sản, quà tri ân — đóng gói trang trọng, sẵn sàng làm quà biếu cho dịp lễ và gia đình CCB.',
    productCount: 28,
    filters: { regions: [{ label: 'Combo cao cấp', count: 12, checked: true }, { label: 'Combo phổ thông', count: 10, checked: true }, { label: 'Quà cá nhân', count: 6 }] },
  },
  {
    slug: 'hang-khuyen-mai',
    name: 'Hàng khuyến mãi',
    icon: 'tag',
    tone: 'red',
    description: 'Sản phẩm đang giảm giá toàn hệ thống — cập nhật mỗi tuần. Ưu đãi đặc biệt cho Hội viên CCB và gia đình.',
    productCount: 35,
    filters: { regions: [{ label: 'Đang khuyến mãi', count: 35, checked: true }] },
  },
];

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

// ---- Product database — every category has products, every product has a detail page ----

const M = (over: Partial<ProductDetail>): ProductDetail => ({
  id: over.slug!, slug: over.slug!, name: '', art: '', tone: 'paper', price: 0,
  rating: 4.7, sold: '500', region: '', category: '', verified: false,
  brand: '—', origin: '—', weight: '—', certifications: '—', distributor: '—',
  description: '', thumbs: ['Mặt trước', 'Đóng gói', 'Cận cảnh', 'Vùng nguyên liệu'],
  ...over,
});

export const PRODUCTS: ProductDetail[] = [
  // Gạo & Lương thực
  M({ slug: 'gao-st25-soc-trang', category: 'gao-luong-thuc', name: 'Gạo ST25 Sóc Trăng — Túi 5 kg', art: 'GẠO\nST25', tone: 'gold', price: 187000, was: 220000, rating: 4.9, sold: '1.2k', region: 'Sóc Trăng', verified: true, badges: [{ label: '−15%', variant: 'red' }, { label: 'Hot', variant: 'gold' }], brand: 'Gạo Ông Cua', origin: 'Sóc Trăng', weight: '5 kg / túi', certifications: 'VietGAP, CCB xác nhận', distributor: 'HTX CCB Sóc Trăng', description: 'Gạo ST25 do ông Hồ Quang Cua và cộng sự nghiên cứu, đạt giải Gạo Ngon Nhất Thế Giới 2019. Hiện phân phối qua CCB Mart trực tiếp từ vùng canh tác của hội viên Hội Cựu Chiến Binh tỉnh Sóc Trăng.' }),
  M({ slug: 'nep-cai-hai-hau', category: 'gao-luong-thuc', name: 'Nếp cái hoa vàng Hải Hậu — 2 kg', art: 'NẾP\nCÁI', tone: 'olive', price: 95000, rating: 4.8, sold: '634', region: 'Nam Định', verified: true, brand: 'HTX Hải Hậu', origin: 'Hải Hậu, Nam Định', weight: '2 kg / túi', certifications: 'VietGAP', distributor: 'HTX CCB Hải Hậu', description: 'Nếp cái hoa vàng truyền thống vùng Hải Hậu — hạt tròn mẩy, dẻo thơm, dùng nấu xôi và làm bánh chưng.' }),
  M({ slug: 'gao-lut-huyet-rong', category: 'gao-luong-thuc', name: 'Gạo lứt huyết rồng hữu cơ — 1 kg', art: 'GẠO\nLỨT', tone: 'red', price: 68000, rating: 4.7, sold: '452', region: 'An Giang', brand: 'Hữu cơ An Giang', origin: 'An Giang', weight: '1 kg', certifications: 'Organic Việt Nam', distributor: 'HTX CCB An Giang', description: 'Gạo lứt huyết rồng nguyên cám, giàu chất xơ và sắt — lựa chọn của thực đơn lành mạnh.' }),
  M({ slug: 'mien-dong-cao-bang', category: 'gao-luong-thuc', name: 'Miến dong Cao Bằng — 500 g', art: 'MIẾN\nDONG', tone: 'gold', price: 45000, rating: 4.6, sold: '478', region: 'Cao Bằng', brand: 'Cao Bằng truyền thống', origin: 'Cao Bằng', weight: '500 g', certifications: 'VietGAP', distributor: 'HTX CCB Cao Bằng', description: 'Miến dong làm từ củ dong riềng vùng cao, sợi trong, dai và không phụ gia.' }),
  M({ slug: 'gao-seng-cu-muong-lo', category: 'gao-luong-thuc', name: 'Gạo Séng Cù Mường Lò — 5 kg', art: 'GẠO\nSÉNG', tone: 'olive', price: 215000, was: 250000, rating: 4.9, sold: '298', region: 'Yên Bái', verified: true, badges: [{ label: '−14%', variant: 'red' }], brand: 'Mường Lò', origin: 'Mường Lò, Yên Bái', weight: '5 kg', certifications: 'VietGAP, CCB xác nhận', distributor: 'HTX CCB Mường Lò', description: 'Gạo Séng Cù trồng trên ruộng bậc thang Mường Lò — hạt thon dài, thơm dịu.' }),
  M({ slug: 'bun-kho-phu-yen', category: 'gao-luong-thuc', name: 'Bún khô Phú Yên — 500 g', art: 'BÚN\nKHÔ', tone: 'paper', price: 38000, rating: 4.5, sold: '712', region: 'Phú Yên', brand: 'Phú Yên', origin: 'Phú Yên', weight: '500 g', certifications: '—', distributor: 'HTX CCB Phú Yên', description: 'Bún khô làm từ gạo địa phương, sợi thanh, thích hợp các món bún xào, bún nước.' }),

  // Mắm & Gia vị
  M({ slug: 'nuoc-mam-phu-quoc', category: 'mam-gia-vi', name: 'Nước mắm nhỉ Phú Quốc 40 độ — 500 ml', art: 'NƯỚC MẮM\nPHÚ QUỐC', tone: 'red', price: 125000, rating: 4.9, sold: '1.5k', region: 'Phú Quốc', verified: true, badges: [{ label: 'Chỉ dẫn địa lý', variant: 'soft' }], brand: 'Phú Quốc nguyên chất', origin: 'Phú Quốc, Kiên Giang', weight: '500 ml', certifications: 'Chỉ dẫn địa lý EU', distributor: 'HTX CCB Phú Quốc', description: 'Nước mắm nhỉ ủ chượp từ cá cơm than Phú Quốc, độ đạm 40 — vị thanh, hậu ngọt.' }),
  M({ slug: 'mam-tom-thanh-hoa', category: 'mam-gia-vi', name: 'Mắm tôm Thanh Hoá — Hũ 350 g', art: 'MẮM\nTÔM', tone: 'red', price: 55000, rating: 4.7, sold: '820', region: 'Thanh Hoá', brand: 'Hậu Lộc', origin: 'Hậu Lộc, Thanh Hoá', weight: '350 g', certifications: 'VietGAP', distributor: 'HTX CCB Thanh Hoá', description: 'Mắm tôm chượp truyền thống Thanh Hoá — màu sim đẹp, vị đậm đà cho bún đậu, riêu cua.' }),
  M({ slug: 'mam-ruoc-hue', category: 'mam-gia-vi', name: 'Mắm ruốc Huế — Hũ 250 g', art: 'MẮM\nRUỐC', tone: 'gold', price: 62000, rating: 4.8, sold: '410', region: 'Thừa Thiên Huế', verified: true, brand: 'Ruốc Huế', origin: 'Huế', weight: '250 g', certifications: '—', distributor: 'HTX CCB Huế', description: 'Mắm ruốc Huế làm từ moi (ruốc) tươi muối ủ, vị mặn dịu — không thể thiếu trong bún bò Huế.' }),
  M({ slug: 'muoi-ot-tay-ninh', category: 'mam-gia-vi', name: 'Muối ớt Tây Ninh — Lọ 200 g', art: 'MUỐI\nỚT', tone: 'red', price: 45000, rating: 4.6, sold: '670', region: 'Tây Ninh', brand: 'Tây Ninh', origin: 'Tây Ninh', weight: '200 g', certifications: '—', distributor: 'HTX CCB Tây Ninh', description: 'Muối ớt Tây Ninh đặc trưng — chấm trái cây, khô bò không thể thiếu.' }),
  M({ slug: 'tuong-ban-bac-ninh', category: 'mam-gia-vi', name: 'Tương Bần Bắc Ninh — Chai 500 ml', art: 'TƯƠNG\nBẦN', tone: 'olive', price: 48000, rating: 4.5, sold: '290', region: 'Bắc Ninh', brand: 'Tương Bần truyền thống', origin: 'Bần Yên Nhân, Hưng Yên', weight: '500 ml', certifications: 'VietGAP', distributor: 'HTX CCB Hưng Yên', description: 'Tương bần lên men chum sành — đậm, ngọt hậu, dùng kho cá, chấm rau luộc.' }),
  M({ slug: 'mam-nem-da-nang', category: 'mam-gia-vi', name: 'Mắm nêm Đà Nẵng — Chai 300 ml', art: 'MẮM\nNÊM', tone: 'gold', price: 52000, rating: 4.7, sold: '385', region: 'Đà Nẵng', brand: 'Mắm nêm xứ Quảng', origin: 'Đà Nẵng', weight: '300 ml', certifications: '—', distributor: 'HTX CCB Đà Nẵng', description: 'Mắm nêm cá cơm xay nhuyễn pha thơm tỏi — đặc sản chấm bún mắm, bánh tráng cuốn thịt heo.' }),

  // Trà & Cà phê
  M({ slug: 'tra-shan-tuyet-ha-giang', category: 'tra-ca-phe', name: 'Trà Shan Tuyết cổ thụ Hà Giang — 200 g', art: 'TRÀ\nSHAN TUYẾT', tone: 'olive', price: 240000, was: 280000, rating: 5.0, sold: '420', region: 'Hà Giang', verified: true, badges: [{ label: 'CCB chọn', variant: 'oliveSoft' }], brand: 'Shan Tuyết Hoàng Su Phì', origin: 'Hoàng Su Phì, Hà Giang', weight: '200 g', certifications: 'Organic, Cây cổ thụ 100+ năm', distributor: 'HTX CCB Hà Giang', description: 'Trà Shan Tuyết hái búp non từ cây cổ thụ trên 100 năm tuổi vùng Hoàng Su Phì — vị chát dịu, hậu ngọt, hương hoa nhẹ.' }),
  M({ slug: 'che-tan-cuong-thai-nguyen', category: 'tra-ca-phe', name: 'Chè Tân Cương Thái Nguyên — Hộp 200 g', art: 'CHÈ\nTÂN CƯƠNG', tone: 'olive', price: 110000, rating: 4.7, sold: '980', region: 'Thái Nguyên', verified: true, badges: [{ label: 'CCB chọn', variant: 'oliveSoft' }], brand: 'Tân Cương Hoàng Bình', origin: 'Tân Cương, Thái Nguyên', weight: '200 g', certifications: 'VietGAP, CCB xác nhận', distributor: 'HTX CCB Thái Nguyên', description: 'Chè Tân Cương đệ nhất danh trà — tôm nõn, sao tay theo phương pháp truyền thống, hương cốm thanh tao.' }),
  M({ slug: 'ca-phe-buon-ma-thuot', category: 'tra-ca-phe', name: 'Cà phê Robusta rang xay — 500 g', art: 'CÀ PHÊ\nBUÔN MA THUỘT', tone: 'paper', price: 132000, rating: 4.7, sold: '2.1k', region: 'Đắk Lắk', badges: [{ label: 'Bán chạy', variant: 'red' }], brand: 'Buôn Ma Thuột', origin: 'Đắk Lắk', weight: '500 g', certifications: 'UTZ, Rainforest Alliance', distributor: 'HTX CCB Đắk Lắk', description: 'Cà phê Robusta thu hái chín, rang mộc — vị đậm, hậu đắng cân bằng, phù hợp pha phin truyền thống.' }),
  M({ slug: 'ca-phe-arabica-cau-dat', category: 'tra-ca-phe', name: 'Cà phê Arabica Cầu Đất — 500 g', art: 'ARABICA\nCẦU ĐẤT', tone: 'gold', price: 165000, was: 195000, rating: 4.9, sold: '540', region: 'Lâm Đồng', verified: true, badges: [{ label: '−15%', variant: 'red' }], brand: 'Cầu Đất Farm', origin: 'Cầu Đất, Lâm Đồng', weight: '500 g', certifications: 'Specialty 84+', distributor: 'HTX CCB Lâm Đồng', description: 'Hạt Arabica trồng trên độ cao 1500m, vị chua thanh, hương hoa hồng và cam quít.' }),
  M({ slug: 'tra-cua-ca-phe-da', category: 'tra-ca-phe', name: 'Trà Olong Mộc Châu — Hộp 150 g', art: 'OLONG\nMỘC CHÂU', tone: 'olive', price: 175000, rating: 4.8, sold: '320', region: 'Sơn La', brand: 'Mộc Châu', origin: 'Mộc Châu, Sơn La', weight: '150 g', certifications: 'VietGAP', distributor: 'HTX CCB Sơn La', description: 'Trà olong vò viên Mộc Châu — hậu vị thơm hoa lan, lạnh sảng, pha hãm nhiều lần.' }),
  M({ slug: 'ca-phe-hat-rang-mock', category: 'tra-ca-phe', name: 'Cà phê hạt rang vừa — 1 kg', art: 'CÀ PHÊ\nRANG VỪA', tone: 'red', price: 230000, rating: 4.6, sold: '420', region: 'Đắk Lắk', brand: 'Buôn Hồ', origin: 'Buôn Hồ, Đắk Lắk', weight: '1 kg', certifications: '—', distributor: 'HTX CCB Đắk Lắk', description: 'Hạt rang vừa cho quán cà phê — pha máy hoặc pha phin đều dậy hương.' }),

  // Đặc sản vùng miền
  M({ slug: 'tom-kho-bac-lieu', category: 'dac-san-vung-mien', name: 'Tôm khô Bạc Liêu loại 1 — 250 g', art: 'TÔM KHÔ\nBẠC LIÊU', tone: 'red', price: 320000, was: 360000, rating: 4.8, sold: '310', region: 'Bạc Liêu', badges: [{ label: '−11%', variant: 'red' }], brand: 'Bạc Liêu loại 1', origin: 'Bạc Liêu', weight: '250 g', certifications: '—', distributor: 'HTX CCB Bạc Liêu', description: 'Tôm khô thiên nhiên Bạc Liêu, hong nắng truyền thống — đỏ tự nhiên, vị ngọt đậm.' }),
  M({ slug: 'mat-ong-rung-u-minh', category: 'dac-san-vung-mien', name: 'Mật ong rừng U Minh — Chai 500 ml', art: 'MẬT ONG\nU MINH', tone: 'gold', price: 175000, rating: 4.9, sold: '530', region: 'Cà Mau', verified: true, badges: [{ label: 'Mới', variant: 'gold' }], brand: 'U Minh Hạ', origin: 'U Minh, Cà Mau', weight: '500 ml', certifications: 'CCB xác nhận', distributor: 'HTX CCB Cà Mau', description: 'Mật ong nguyên chất gác kèo rừng tràm U Minh — không pha, không lọc nóng.' }),
  M({ slug: 'me-xung-hue', category: 'dac-san-vung-mien', name: 'Mè xửng Huế — Hộp 400 g', art: 'MÈ XỬNG\nHUẾ', tone: 'gold', price: 78000, rating: 4.7, sold: '460', region: 'Huế', brand: 'Thiên Hương', origin: 'Huế', weight: '400 g', certifications: '—', distributor: 'HTX CCB Huế', description: 'Mè xửng truyền thống cố đô — dẻo, thơm mè rang, không quá ngọt.' }),
  M({ slug: 'cha-cot-thanh-hoa', category: 'dac-san-vung-mien', name: 'Chả cốm Vòng — Hộp 500 g', art: 'CHẢ\nCỐM', tone: 'olive', price: 145000, rating: 4.6, sold: '180', region: 'Hà Nội', brand: 'Cốm Vòng', origin: 'Hà Nội', weight: '500 g', certifications: '—', distributor: 'HTX CCB Hà Nội', description: 'Chả cốm thịt lợn xay trộn cốm tươi, chiên vàng — đặc trưng ẩm thực Hà Nội.' }),
  M({ slug: 'keo-dua-ben-tre', category: 'dac-san-vung-mien', name: 'Kẹo dừa sáp Bến Tre — Hộp 400 g', art: 'KẸO\nDỪA', tone: 'paper', price: 85000, rating: 4.5, sold: '690', region: 'Bến Tre', brand: 'Bến Tre', origin: 'Bến Tre', weight: '400 g', certifications: 'VietGAP', distributor: 'HTX CCB Bến Tre', description: 'Kẹo dừa sáp dẻo, mềm — đặc sản xứ dừa Bến Tre.' }),
  M({ slug: 'banh-pho-nam-dinh', category: 'dac-san-vung-mien', name: 'Bánh phở Nam Định khô — 500 g', art: 'BÁNH PHỞ\nNAM ĐỊNH', tone: 'olive', price: 42000, rating: 4.6, sold: '320', region: 'Nam Định', brand: 'Phở Nam Định', origin: 'Nam Định', weight: '500 g', certifications: '—', distributor: 'HTX CCB Nam Định', description: 'Bánh phở khô Nam Định — sợi mềm, dai, dễ bảo quản.' }),

  // Đặc sản miền Bắc
  M({ slug: 'thit-trau-gac-bep', category: 'dac-san-mien-bac', name: 'Thịt trâu gác bếp Sơn La — 250 g', art: 'TRÂU\nGÁC BẾP', tone: 'red', price: 280000, was: 320000, rating: 4.9, sold: '380', region: 'Sơn La', verified: true, badges: [{ label: '−12%', variant: 'red' }], brand: 'Tây Bắc', origin: 'Sơn La', weight: '250 g', certifications: '—', distributor: 'HTX CCB Sơn La', description: 'Thịt trâu tươi tẩm mắc khén gác bếp 2 tháng — dai, đậm vị núi rừng Tây Bắc.' }),
  M({ slug: 'cha-muc-ha-long', category: 'dac-san-mien-bac', name: 'Chả mực Hạ Long — Hộp 500 g', art: 'CHẢ MỰC\nHẠ LONG', tone: 'olive', price: 195000, rating: 4.8, sold: '240', region: 'Quảng Ninh', verified: true, brand: 'Hạ Long', origin: 'Hạ Long, Quảng Ninh', weight: '500 g', certifications: '—', distributor: 'HTX CCB Quảng Ninh', description: 'Chả mực giã tay Hạ Long — dai sần sật, thơm vị mực tươi.' }),
  M({ slug: 'banh-cu-lai-chau', category: 'dac-san-mien-bac', name: 'Bánh củ Lai Châu — Bịch 1 kg', art: 'BÁNH CỦ\nLAI CHÂU', tone: 'paper', price: 52000, rating: 4.5, sold: '180', region: 'Lai Châu', brand: 'Lai Châu', origin: 'Lai Châu', weight: '1 kg', certifications: '—', distributor: 'HTX CCB Lai Châu', description: 'Bánh củ làm từ củ năng, củ ấu vùng cao — món ăn vặt truyền thống.' }),
  M({ slug: 'mac-mat-cao-bang', category: 'dac-san-mien-bac', name: 'Hạt mắc mật khô Cao Bằng — 100 g', art: 'MẮC\nMẬT', tone: 'olive', price: 65000, rating: 4.6, sold: '150', region: 'Cao Bằng', brand: 'Cao Bằng', origin: 'Cao Bằng', weight: '100 g', certifications: '—', distributor: 'HTX CCB Cao Bằng', description: 'Hạt mắc mật khô — gia vị đặc trưng vịt quay, lợn quay vùng Việt Bắc.' }),

  // Đặc sản miền Trung
  M({ slug: 'tre-hue', category: 'dac-san-mien-trung', name: 'Tré Huế — Lốc 500 g', art: 'TRÉ\nHUẾ', tone: 'gold', price: 95000, rating: 4.7, sold: '320', region: 'Huế', brand: 'Huế', origin: 'Huế', weight: '500 g (10 cây)', certifications: '—', distributor: 'HTX CCB Huế', description: 'Tré Huế thịt heo, riềng, mè rang gói lá ổi — chua nhẹ, ăn kèm bia rất hợp.' }),
  M({ slug: 'nem-chua-thanh-hoa', category: 'dac-san-mien-trung', name: 'Nem chua Thanh Hoá — Hộp 30 cái', art: 'NEM CHUA\nTHANH HOÁ', tone: 'red', price: 120000, rating: 4.8, sold: '420', region: 'Thanh Hoá', verified: true, brand: 'Nem chua Thanh Hoá', origin: 'Thanh Hoá', weight: '30 cái', certifications: '—', distributor: 'HTX CCB Thanh Hoá', description: 'Nem chua Thanh Hoá lên men 3 ngày — chua dịu, thơm tỏi ớt.' }),
  M({ slug: 'banh-it-quang-nam', category: 'dac-san-mien-trung', name: 'Bánh ít lá gai Quảng Nam — Hộp 20 cái', art: 'BÁNH ÍT\nLÁ GAI', tone: 'olive', price: 80000, rating: 4.6, sold: '280', region: 'Quảng Nam', brand: 'Quảng Nam', origin: 'Quảng Nam', weight: '20 cái', certifications: '—', distributor: 'HTX CCB Quảng Nam', description: 'Bánh ít lá gai nhân đậu xanh — món bánh trị tiệc cưới truyền thống miền Trung.' }),
  M({ slug: 'mam-ca-com-phan-thiet', category: 'dac-san-mien-trung', name: 'Mắm cá cơm Phan Thiết — Chai 500 ml', art: 'MẮM CÁ CƠM\nPHAN THIẾT', tone: 'red', price: 110000, rating: 4.7, sold: '350', region: 'Bình Thuận', brand: 'Phan Thiết truyền thống', origin: 'Phan Thiết', weight: '500 ml', certifications: 'Chỉ dẫn địa lý', distributor: 'HTX CCB Bình Thuận', description: 'Mắm cá cơm Phan Thiết ủ chượp 12 tháng — màu cánh gián, vị mặn ngọt cân bằng.' }),

  // Đặc sản miền Nam
  M({ slug: 'gao-jasmine-tien-giang', category: 'dac-san-mien-nam', name: 'Gạo Jasmine Tiền Giang — 5 kg', art: 'JASMINE\nTIỀN GIANG', tone: 'gold', price: 145000, rating: 4.7, sold: '510', region: 'Tiền Giang', brand: 'Jasmine VN', origin: 'Tiền Giang', weight: '5 kg', certifications: 'GlobalGAP', distributor: 'HTX CCB Tiền Giang', description: 'Gạo Jasmine thơm dịu, mềm cơm — phù hợp cơm gia đình miền Nam.' }),
  M({ slug: 'kho-ca-loc-ca-mau', category: 'dac-san-mien-nam', name: 'Khô cá lóc Cà Mau — 500 g', art: 'KHÔ CÁ LÓC\nCÀ MAU', tone: 'red', price: 240000, rating: 4.8, sold: '290', region: 'Cà Mau', verified: true, brand: 'Cà Mau', origin: 'Cà Mau', weight: '500 g', certifications: '—', distributor: 'HTX CCB Cà Mau', description: 'Cá lóc đồng làm khô tự nhiên — thịt ngọt, ít xương, nướng cuốn rau sống rất hợp.' }),
  M({ slug: 'duong-thot-not-an-giang', category: 'dac-san-mien-nam', name: 'Đường thốt nốt An Giang — Hũ 500 g', art: 'ĐƯỜNG\nTHỐT NỐT', tone: 'paper', price: 75000, rating: 4.6, sold: '430', region: 'An Giang', brand: 'An Giang', origin: 'An Giang', weight: '500 g', certifications: 'VietGAP', distributor: 'HTX CCB An Giang', description: 'Đường thốt nốt nguyên chất — vị ngọt thanh, dùng kho cá, nấu chè.' }),
  M({ slug: 'ca-com-kho-vung-tau', category: 'dac-san-mien-nam', name: 'Cá cơm khô Vũng Tàu — 250 g', art: 'CÁ CƠM\nVŨNG TÀU', tone: 'olive', price: 95000, rating: 4.5, sold: '210', region: 'Bà Rịa - Vũng Tàu', brand: 'Vũng Tàu', origin: 'Vũng Tàu', weight: '250 g', certifications: '—', distributor: 'HTX CCB Bà Rịa', description: 'Cá cơm khô Vũng Tàu — nhỏ, dai, rang mè ăn cơm rất tốn.' }),

  // Đồ gia dụng
  M({ slug: 'am-chen-bat-trang', category: 'do-gia-dung', name: 'Bộ ấm chén tử sa Bát Tràng — 6 chén', art: 'ẤM CHÉN\nBÁT TRÀNG', tone: 'paper', price: 720000, was: 850000, rating: 4.9, sold: '60', region: 'Hà Nội', badges: [{ label: '−15%', variant: 'red' }, { label: 'Hand-made', variant: 'oliveSoft' }], brand: 'Bát Tràng', origin: 'Bát Tràng, Hà Nội', weight: '—', certifications: 'Làng nghề Bát Tràng', distributor: 'HTX CCB Bát Tràng', description: 'Bộ ấm chén tử sa làm thủ công Bát Tràng — vẽ men nâu, nung 1300°C, giữ nhiệt tốt.' }),
  M({ slug: 'noi-gang-cao-bang', category: 'do-gia-dung', name: 'Nồi gang đúc Cao Bằng — 24 cm', art: 'NỒI GANG\nCAO BẰNG', tone: 'olive', price: 380000, rating: 4.7, sold: '85', region: 'Cao Bằng', verified: true, brand: 'Đúc Cao Bằng', origin: 'Cao Bằng', weight: '3 kg', certifications: '—', distributor: 'HTX CCB Cao Bằng', description: 'Nồi gang đúc thủ công — giữ nhiệt đều, nấu kho cá ngon hết ý.' }),
  M({ slug: 'binh-gom-phu-lang', category: 'do-gia-dung', name: 'Bình gốm sứ Phù Lãng — Cao 30 cm', art: 'BÌNH GỐM\nPHÙ LÃNG', tone: 'red', price: 450000, rating: 4.8, sold: '40', region: 'Bắc Ninh', brand: 'Phù Lãng', origin: 'Phù Lãng, Bắc Ninh', weight: '—', certifications: 'Làng nghề Phù Lãng', distributor: 'HTX CCB Bắc Ninh', description: 'Bình gốm sứ vuốt tay — men da lươn, dùng cắm hoa hoặc trưng bày.' }),

  // Quà tặng CCB
  M({ slug: 'qua-tet-ccb-hop-4-mon', category: 'qua-tang-ccb', name: 'Quà Tết CCB — Hộp đặc sản 4 món', art: 'QUÀ TẾT\nCCB', tone: 'gold', price: 580000, was: 690000, rating: 5.0, sold: '95', verified: true, badges: [{ label: '−16%', variant: 'red' }], brand: 'CCB Mart', origin: 'Tổng hợp', weight: '~2 kg', certifications: 'CCB xác nhận', distributor: 'CCB Mart', description: 'Hộp quà Tết gồm: Gạo ST25, Trà Shan Tuyết, Mật ong U Minh, Mè xửng Huế — đóng gói trang trọng.' }),
  M({ slug: 'combo-bua-com', category: 'qua-tang-ccb', name: 'Combo bữa cơm gia đình — Gạo + Mắm + Trà', art: 'COMBO\nBỮA CƠM', tone: 'red', price: 389000, was: 460000, rating: 4.9, sold: '210', badges: [{ label: '−15%', variant: 'red' }, { label: 'Combo', variant: 'gold' }], brand: 'CCB Mart', origin: 'Tổng hợp', weight: '~6 kg', certifications: 'CCB xác nhận', distributor: 'CCB Mart', description: 'Combo cho bữa cơm gia đình: Gạo ST25 5kg + Nước mắm Phú Quốc + Chè Tân Cương.' }),
  M({ slug: 'qua-tri-an-ccb', category: 'qua-tang-ccb', name: 'Quà tri ân CCB — Hộp 6 món truyền thống', art: 'QUÀ TRI ÂN\nCCB', tone: 'olive', price: 850000, rating: 5.0, sold: '60', verified: true, brand: 'CCB Mart', origin: 'Tổng hợp', weight: '~3 kg', certifications: 'CCB xác nhận', distributor: 'CCB Mart', description: 'Hộp quà tri ân Cựu Chiến Binh — 6 đặc sản tuyển chọn từ ba miền.' }),

  // Hàng khuyến mãi (re-uses some products with deeper discounts)
  M({ slug: 'combo-gia-vi-ba-mien', category: 'hang-khuyen-mai', name: 'Hộp gia vị ba miền — Mắm tôm, mắm ruốc, muối ớt', art: 'GIA VỊ\nBA MIỀN', tone: 'olive', price: 215000, was: 260000, rating: 4.8, sold: '180', badges: [{ label: '−17%', variant: 'red' }], brand: 'CCB Mart', origin: 'Tổng hợp', weight: '~1.5 kg', certifications: '—', distributor: 'CCB Mart', description: 'Combo 3 loại gia vị 3 miền — món quà gia vị đầy đủ cho gian bếp Việt.' }),
  M({ slug: 'gao-st25-flash-sale', category: 'hang-khuyen-mai', name: 'Gạo ST25 Sóc Trăng — FLASH SALE 5 kg', art: 'ST25\nFLASH SALE', tone: 'red', price: 165000, was: 220000, rating: 4.9, sold: '320', badges: [{ label: '−25%', variant: 'red' }, { label: 'Flash sale', variant: 'gold' }], brand: 'Gạo Ông Cua', origin: 'Sóc Trăng', weight: '5 kg', certifications: 'VietGAP', distributor: 'HTX CCB Sóc Trăng', description: 'Khuyến mãi tuần — gạo ST25 cùng chất lượng giá cực tốt cho hội viên.' }),
];

export function getProductsByCategory(slug: string): ProductDetail[] {
  return PRODUCTS.filter((p) => p.category === slug);
}

export function getProductBySlug(slug: string): ProductDetail | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}
