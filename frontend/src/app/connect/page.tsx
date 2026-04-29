'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Phone, Search } from 'lucide-react';
import { LandingShell } from '@/components/landing/LandingShell';

const TEAL_BG = '#E8F4F8';
const ZALO = '#0068FF';
const ZALO_DARK = '#0050C8';
const OLIVE_DARK = '#3F4F23';
const DEEP_RED = '#8B0000';

type Category = 'gao' | 'rau' | 'thit' | 'hai-san' | 'gia-vi' | 'tra-cf' | 'khac';

const CATEGORY_LABELS: Record<Category, string> = {
  'gao':      '🍚 Gạo · Lương thực',
  'rau':      '🌿 Rau · Củ · Quả',
  'thit':     '🍖 Thịt · Trứng · Sữa',
  'hai-san':  '🐟 Hải sản · Cá · Tôm',
  'gia-vi':   '🧂 Gia vị · Mắm',
  'tra-cf':   '☕ Trà · Cà phê',
  'khac':     '📦 Khác',
};

type Listing = {
  id: string;
  category: Category;
  iconEmoji: string;
  productName: string;
  veteranName: string;
  province: string;
  region: 'bac' | 'trung' | 'nam';
  priceText: string;
  priceNote: string;
  callTimes: string;
};

const LISTINGS: Listing[] = [
  // GẠO
  { id: '1', category: 'gao', iconEmoji: '🍚', productName: 'Gạo tẻ thường — vụ Đông Xuân', veteranName: 'bác Hùng', province: 'Hưng Yên', region: 'bac', priceText: '15.000₫', priceNote: '/ kg · tối thiểu 10 kg', callTimes: 'bác trực điện thoại 7h–20h' },
  { id: '2', category: 'gao', iconEmoji: '🍚', productName: 'Gạo nếp cái hoa vàng', veteranName: 'bác Đại', province: 'Hải Dương', region: 'bac', priceText: '28.000₫', priceNote: '/ kg · 5 kg trở lên', callTimes: 'bác chốt đơn buổi sáng' },
  { id: '3', category: 'gao', iconEmoji: '🌾', productName: 'Gạo lứt huyết rồng hữu cơ', veteranName: 'bác Năm', province: 'An Giang', region: 'nam', priceText: '38.000₫', priceNote: '/ kg · đóng túi 2 kg', callTimes: 'bác giao đến TP. HCM 2 lần/tuần' },
  { id: '4', category: 'gao', iconEmoji: '🍚', productName: 'Gạo ST24 mới gặt', veteranName: 'bác Bảy', province: 'Sóc Trăng', region: 'nam', priceText: '32.000₫', priceNote: '/ kg · vụ mới 2026', callTimes: 'bác có xe tải nhỏ trong miền Tây' },
  { id: '5', category: 'gao', iconEmoji: '🥖', productName: 'Bún khô gạo lức', veteranName: 'bác Tám', province: 'Phú Yên', region: 'trung', priceText: '45.000₫', priceNote: '/ kg · gói 500g', callTimes: 'bác giao theo đơn 5 kg trở lên' },

  // RAU
  { id: '10', category: 'rau', iconEmoji: '🌿', productName: 'Rau củ sạch theo mùa', veteranName: 'bác Tư', province: 'Sóc Sơn, Hà Nội', region: 'bac', priceText: '18.000₫', priceNote: '/ combo 5 loại rau', callTimes: 'bác chốt đơn sáng, giao trong ngày' },
  { id: '11', category: 'rau', iconEmoji: '🥬', productName: 'Cải bắp Đà Lạt sạch', veteranName: 'bác Sáu', province: 'Lâm Đồng', region: 'trung', priceText: '12.000₫', priceNote: '/ kg · không dùng thuốc', callTimes: 'giao Hà Nội + TP. HCM bằng đường lạnh' },
  { id: '12', category: 'rau', iconEmoji: '🍅', productName: 'Cà chua bi vườn nhà', veteranName: 'bác Tâm', province: 'Mộc Châu, Sơn La', region: 'bac', priceText: '35.000₫', priceNote: '/ kg · hộp 500g', callTimes: 'bác giao xe khách Sơn La – Hà Nội mỗi 3 ngày' },
  { id: '13', category: 'rau', iconEmoji: '🥒', productName: 'Dưa chuột nếp Yên Bái', veteranName: 'bác Hải', province: 'Yên Bái', region: 'bac', priceText: '20.000₫', priceNote: '/ kg · giòn ngọt', callTimes: 'bác chốt đơn cuối tuần' },
  { id: '14', category: 'rau', iconEmoji: '🍠', productName: 'Khoai lang Nhật ruột vàng', veteranName: 'bác Hoà', province: 'Đắk Lắk', region: 'trung', priceText: '22.000₫', priceNote: '/ kg · vụ mới', callTimes: 'bác giao theo xe đường dài' },
  { id: '15', category: 'rau', iconEmoji: '🌶', productName: 'Ớt sừng vàng Hưng Yên', veteranName: 'bác Lâm', province: 'Hưng Yên', region: 'bac', priceText: '40.000₫', priceNote: '/ kg', callTimes: 'bác có vườn nhỏ tại Khoái Châu' },

  // THỊT · TRỨNG · SỮA
  { id: '20', category: 'thit', iconEmoji: '🥚', productName: 'Trứng gà ta thả vườn', veteranName: 'bác Ba', province: 'Thái Nguyên', region: 'bac', priceText: '4.500₫', priceNote: '/ quả · khay 30 quả', callTimes: 'bác giao trong 50 km quanh Thái Nguyên' },
  { id: '21', category: 'thit', iconEmoji: '🐔', productName: 'Gà ri Đông Tảo', veteranName: 'bác Việt', province: 'Khoái Châu, Hưng Yên', region: 'bac', priceText: '180.000₫', priceNote: '/ kg · gà sống', callTimes: 'bác làm sẵn nếu yêu cầu' },
  { id: '22', category: 'thit', iconEmoji: '🥩', productName: 'Thịt bò một nắng', veteranName: 'bác Khánh', province: 'Phú Yên', region: 'trung', priceText: '320.000₫', priceNote: '/ kg · gói hút chân không', callTimes: 'bác giao toàn quốc bằng EMS' },
  { id: '23', category: 'thit', iconEmoji: '🐷', productName: 'Thịt heo bản (lợn cắp nách)', veteranName: 'bác Thái', province: 'Hà Giang', region: 'bac', priceText: '160.000₫', priceNote: '/ kg · nuôi thả tự nhiên', callTimes: 'bác có xe đông lạnh đi Hà Nội mỗi 5 ngày' },
  { id: '24', category: 'thit', iconEmoji: '🥛', productName: 'Sữa dê tươi', veteranName: 'bác Quang', province: 'Mộc Châu, Sơn La', region: 'bac', priceText: '40.000₫', priceNote: '/ chai 500ml', callTimes: 'bác chỉ giao Hà Nội — đặt trước 2 ngày' },

  // HẢI SẢN
  { id: '30', category: 'hai-san', iconEmoji: '🐟', productName: 'Cá thu một nắng', veteranName: 'bác Thắng', province: 'Quảng Bình', region: 'trung', priceText: '380.000₫', priceNote: '/ kg · phơi truyền thống', callTimes: 'bác có thuyền nhỏ, giao theo lô' },
  { id: '31', category: 'hai-san', iconEmoji: '🦐', productName: 'Tôm khô Cà Mau loại 1', veteranName: 'bác Hai', province: 'Cà Mau', region: 'nam', priceText: '850.000₫', priceNote: '/ kg · đóng hộp', callTimes: 'bác giao toàn quốc bằng EMS' },
  { id: '32', category: 'hai-san', iconEmoji: '🐡', productName: 'Mực một nắng Phú Quốc', veteranName: 'bác Phú', province: 'Phú Quốc, Kiên Giang', region: 'nam', priceText: '420.000₫', priceNote: '/ kg · loại to', callTimes: 'bác giao theo chuyến tàu mỗi tuần' },
  { id: '33', category: 'hai-san', iconEmoji: '🐠', productName: 'Cá kho làng Vũ Đại', veteranName: 'bác Hoà', province: 'Hà Nam', region: 'bac', priceText: '550.000₫', priceNote: '/ niêu 1 kg', callTimes: 'bác có lò kho riêng, đặt trước 1 ngày' },

  // GIA VỊ · MẮM
  { id: '40', category: 'gia-vi', iconEmoji: '🧂', productName: 'Mắm tôm Ba Làng', veteranName: 'bác Lực', province: 'Thanh Hoá', region: 'trung', priceText: '120.000₫', priceNote: '/ chai 500ml', callTimes: 'bác giao theo xe khách Thanh Hoá — Hà Nội' },
  { id: '41', category: 'gia-vi', iconEmoji: '🌶', productName: 'Tương ớt Mường Khương', veteranName: 'bác Tùng', province: 'Lào Cai', region: 'bac', priceText: '85.000₫', priceNote: '/ chai 250ml', callTimes: 'bác giao theo xe đông lạnh' },
  { id: '42', category: 'gia-vi', iconEmoji: '🌰', productName: 'Hạt dổi rừng Hoà Bình', veteranName: 'bác Mạnh', province: 'Hoà Bình', region: 'bac', priceText: '950.000₫', priceNote: '/ kg · loại đặc biệt', callTimes: 'bác chỉ có theo mùa thu hoạch' },
  { id: '43', category: 'gia-vi', iconEmoji: '🧄', productName: 'Tỏi đen Lý Sơn', veteranName: 'bác Bình', province: 'Quảng Ngãi', region: 'trung', priceText: '480.000₫', priceNote: '/ kg · ủ 60 ngày', callTimes: 'bác đóng gói chân không, giao toàn quốc' },

  // TRÀ · CÀ PHÊ
  { id: '50', category: 'tra-cf', iconEmoji: '☕', productName: 'Cà phê Robusta rang xay', veteranName: 'bác Nhân', province: 'Buôn Ma Thuột, Đắk Lắk', region: 'trung', priceText: '180.000₫', priceNote: '/ kg · vừa rang', callTimes: 'bác có lò rang riêng, đặt trước 2 ngày' },
  { id: '51', category: 'tra-cf', iconEmoji: '🍵', productName: 'Trà Tân Cương đặc biệt', veteranName: 'bác Thắng', province: 'Thái Nguyên', region: 'bac', priceText: '280.000₫', priceNote: '/ kg · chè khô', callTimes: 'bác có vườn 2 hecta, hái chính vụ' },
  { id: '52', category: 'tra-cf', iconEmoji: '🍃', productName: 'Trà Shan tuyết cổ thụ', veteranName: 'bác Páo', province: 'Hà Giang', region: 'bac', priceText: '650.000₫', priceNote: '/ kg · thu hoạch tay', callTimes: 'bác giao theo lô từng đợt' },

  // KHÁC
  { id: '60', category: 'khac', iconEmoji: '🍯', productName: 'Mật ong rừng U Minh', veteranName: 'bác Kha', province: 'Cà Mau', region: 'nam', priceText: '380.000₫', priceNote: '/ chai 500ml', callTimes: 'bác giao toàn quốc bằng EMS' },
  { id: '61', category: 'khac', iconEmoji: '🥥', productName: 'Đường thốt nốt nguyên chất', veteranName: 'bác Lý', province: 'An Giang', region: 'nam', priceText: '95.000₫', priceNote: '/ kg · đóng hộp', callTimes: 'bác giao theo chuyến xe miền Tây' },
  { id: '62', category: 'khac', iconEmoji: '🍶', productName: 'Rượu cần Ê Đê', veteranName: 'bác Y Tul', province: 'Đắk Lắk', region: 'trung', priceText: '320.000₫', priceNote: '/ chum 5 lít', callTimes: 'bác đóng gói cẩn thận, giao toàn quốc' },
  { id: '63', category: 'khac', iconEmoji: '🥜', productName: 'Hạt điều rang muối Bình Phước', veteranName: 'bác Phong', province: 'Bình Phước', region: 'nam', priceText: '260.000₫', priceNote: '/ kg · vụ mới', callTimes: 'bác có lò rang riêng' },
];

const REGION_LABELS: Record<'all' | 'bac' | 'trung' | 'nam', string> = {
  all:   'Tất cả miền',
  bac:   'Miền Bắc',
  trung: 'Miền Trung & Tây Nguyên',
  nam:   'Miền Nam',
};

export default function ConnectAllPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | Category>('all');
  const [region, setRegion] = useState<'all' | 'bac' | 'trung' | 'nam'>('all');

  const filtered = useMemo(() => {
    return LISTINGS.filter((l) => {
      if (category !== 'all' && l.category !== category) return false;
      if (region !== 'all' && l.region !== region) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        l.productName.toLowerCase().includes(q) ||
        l.veteranName.toLowerCase().includes(q) ||
        l.province.toLowerCase().includes(q)
      );
    });
  }, [search, category, region]);

  return (
    <LandingShell>
      <main style={{
        background: TEAL_BG,
        minHeight: 'calc(100vh - 200px)',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px 96px' }}>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', display: 'flex', gap: 8 }}>
            <Link href="/" style={{ color: 'var(--ccb-red)' }}>Trang chủ</Link>
            <span style={{ color: 'var(--ink-4)' }}>/</span>
            <span>Nhu yếu phẩm CCB</span>
          </div>

          {/* Hero */}
          <header style={{ marginTop: 24, marginBottom: 36, maxWidth: 820 }}>
            <div style={{
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13,
              letterSpacing: '0.10em', textTransform: 'uppercase', color: ZALO_DARK,
              marginBottom: 12,
            }}>
              ★ Hậu phương · CCB Mart kết nối, KHÔNG bán trực tiếp ★
            </div>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontWeight: 800,
              fontSize: 'clamp(32px, 4vw, 48px)', lineHeight: 1.15, margin: '0 0 16px',
            }}>
              Danh bạ {LISTINGS.length}+ nhu yếu phẩm từ đồng đội
            </h1>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: 19, lineHeight: 1.65,
              color: 'var(--ink-2)', margin: '0 0 16px',
            }}>
              Mua tận gốc · Giá do đồng đội báo · Hãy gọi hoặc nhắn Zalo trực tiếp với bác CCB.
            </p>
            <span style={{
              display: 'inline-block',
              background: '#FFFFFF',
              border: '1px dashed var(--ink-4)',
              color: 'var(--ink-2)',
              padding: '8px 18px', borderRadius: 999,
              fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
            }}>
              ⚠ CCB Mart không thu phí — không trung gian thanh toán
            </span>
          </header>

          {/* Filters */}
          <div style={{
            background: '#FFFFFF', border: '1px solid #C8E0E5', borderRadius: 12,
            padding: 20, marginBottom: 24,
            display: 'grid', gridTemplateColumns: '1fr', gap: 16,
          }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên sản phẩm, tên CCB hoặc tỉnh thành…"
                style={{
                  width: '100%', padding: '14px 14px 14px 44px',
                  border: '1px solid var(--line-strong)', borderRadius: 8,
                  fontFamily: 'var(--font-body)', fontSize: 16, background: '#fff',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {/* Category chips */}
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Danh mục</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Chip active={category === 'all'} onClick={() => setCategory('all')}>Tất cả</Chip>
                  {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
                    <Chip key={c} active={category === c} onClick={() => setCategory(c)}>{CATEGORY_LABELS[c]}</Chip>
                  ))}
                </div>
              </div>

              {/* Region chips */}
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vùng miền</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(Object.keys(REGION_LABELS) as ('all' | 'bac' | 'trung' | 'nam')[]).map((r) => (
                    <Chip key={r} active={region === r} onClick={() => setRegion(r)}>{REGION_LABELS[r]}</Chip>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Result count */}
          <div style={{ fontSize: 15, color: 'var(--ink-2)', marginBottom: 16 }}>
            Tìm thấy <strong style={{ color: 'var(--ink-1)' }}>{filtered.length}</strong> nhu yếu phẩm.
            {filtered.length === 0 && ' Vui lòng thử bộ lọc khác.'}
          </div>

          {/* Grid */}
          {filtered.length > 0 && (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20,
            }}>
              {filtered.map((l) => <ConnectListCard key={l.id} listing={l} />)}
            </div>
          )}
        </div>
      </main>
    </LandingShell>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: active ? ZALO : '#fff',
        color: active ? '#fff' : 'var(--ink-2)',
        border: `1.5px solid ${active ? ZALO : '#C8E0E5'}`,
        padding: '8px 14px', borderRadius: 999,
        fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
        cursor: 'pointer', whiteSpace: 'nowrap',
        transition: 'all 0.15s ease',
      }}
    >
      {children}
    </button>
  );
}

function ConnectListCard({ listing }: { listing: Listing }) {
  const { iconEmoji, productName, veteranName, province, priceText, priceNote, callTimes } = listing;
  const upperName = veteranName.toUpperCase();
  return (
    <article style={{
      background: '#FFFFFF',
      borderRadius: 14,
      padding: '22px 20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      border: '1px solid #C8E0E5',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ fontSize: 44, lineHeight: 1, flex: 'none' }}>{iconEmoji}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19,
            lineHeight: 1.3, color: 'var(--ink-1)',
          }}>
            {productName}
          </div>
          <div style={{ fontSize: 14, color: OLIVE_DARK, fontWeight: 600, marginTop: 4 }}>
            <span style={{
              display: 'inline-block', background: 'var(--ccb-olive-tint)', color: OLIVE_DARK,
              padding: '1px 6px', borderRadius: 4, fontSize: 11, fontWeight: 700, marginRight: 6,
            }}>CCB</span>
            {veteranName} — {province}
          </div>
        </div>
      </div>

      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 800,
        fontSize: 28, color: DEEP_RED, lineHeight: 1.0, marginTop: 4,
      }}>
        {priceText}
        <small style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', marginTop: 4 }}>
          {priceNote}
        </small>
      </div>

      <a
        href="#"
        className="ccb-zalo-btn"
        onClick={(e) => {
          e.preventDefault();
          alert(`Mở Zalo để kết nối với ${veteranName} (${province})\n\n(Demo — bản chính thức sẽ mở zalo.me/<sdt>)`);
        }}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          minHeight: 52, padding: '12px 18px', marginTop: 'auto',
          background: ZALO, color: '#FFFFFF',
          borderRadius: 10, fontWeight: 800, fontSize: 16,
          fontFamily: 'var(--font-body)',
          boxShadow: '0 4px 14px rgba(0,104,255,0.25)',
        }}
      >
        <span style={{
          width: 24, height: 24, borderRadius: 5,
          background: '#FFFFFF', color: ZALO,
          fontWeight: 900, fontSize: 12,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>Z</span>
        <Phone size={16} />
        GỌI ZALO {upperName}
      </a>

      <div style={{
        fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-2)',
        fontStyle: 'italic',
      }}>
        {callTimes}.
      </div>
    </article>
  );
}
