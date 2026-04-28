import Link from 'next/link';
import {
  Coffee, Compass, Gift, HandHeart, Home, MapPin, Mountain, Palmtree,
  RefreshCcw, ShieldCheck, Soup, Sun, Tag, Truck, Wheat,
} from 'lucide-react';
import { SectionHead, Star } from './primitives';
import { CATEGORIES } from './categories';

const ICONS = { wheat: Wheat, soup: Soup, coffee: Coffee, mountain: Mountain, sun: Sun, palmtree: Palmtree, home: Home, gift: Gift, tag: Tag, compass: Compass } as const;

export function TrustBar() {
  const items = [
    { icon: <ShieldCheck size={22} />, title: 'Nguồn gốc rõ ràng', sub: 'Xuất xứ từ hội viên CCB, có chứng nhận' },
    { icon: <Truck size={22} />,        title: 'Giao hàng 24 giờ', sub: 'Miễn phí đơn từ 300.000 ₫' },
    { icon: <RefreshCcw size={22} />,   title: 'Đổi trả 7 ngày',   sub: 'Không hài lòng, hoàn tiền 100%' },
    { icon: <HandHeart size={22} />,    title: '1% cho đồng đội',  sub: 'Hỗ trợ CCB khó khăn trên toàn quốc' },
  ];
  return (
    <section style={{ background: 'var(--paper-1)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto', padding: 24,
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
        {items.map((it) => (
          <div key={it.title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{
              width: 44, height: 44, flex: 'none',
              borderRadius: 6, background: '#FFFFFF',
              border: '1px solid var(--line)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--ccb-olive)',
            }}>{it.icon}</div>
            <div>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14, color: 'var(--ink-1)' }}>{it.title}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, lineHeight: 1.4 }}>{it.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

type Tone = 'red' | 'olive' | 'gold' | 'paper';
const tones: Record<Tone, { bg: string; fg: string }> = {
  red:   { bg: 'var(--ccb-red-tint)',   fg: 'var(--ccb-red)' },
  olive: { bg: 'var(--ccb-olive-tint)', fg: 'var(--ccb-olive)' },
  gold:  { bg: '#F5E9C9',               fg: 'var(--ccb-gold-dark)' },
  paper: { bg: 'var(--paper-1)',        fg: 'var(--ink-2)' },
};

export function CategoryStrip() {
  // Show 8 categories on the homepage strip — first 8 entries from the central config
  const cats = CATEGORIES.slice(0, 8);
  return (
    <section style={{ background: 'var(--paper-0)', padding: '40px 0', borderBottom: '1px solid var(--line)' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 24px' }}>
        <SectionHead eyebrow="Danh mục nổi bật" title="Mua sắm theo nhóm hàng" link="Xem tất cả danh mục" />
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12, marginTop: 24,
        }}>
          {cats.map((c) => {
            const t = tones[c.tone];
            const Icon = ICONS[c.icon];
            return (
              <Link key={c.slug} href={`/category/${c.slug}`} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                padding: '16px 8px',
                border: '1px solid var(--line)', borderRadius: 8,
                background: '#FFFFFF', transition: 'all .15s ease-out',
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: t.bg, color: t.fg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}><Icon size={28} /></div>
                <div style={{
                  fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12,
                  color: 'var(--ink-1)', textAlign: 'center', lineHeight: 1.25,
                }}>{c.name}</div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function PromoBanner() {
  return (
    <section style={{ background: 'var(--ccb-red)', color: '#FFF8E7' }}>
      <div style={{
        maxWidth: 1600, margin: '0 auto', padding: '56px 24px',
        display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 48, alignItems: 'center',
      }} className="ccb-promo-grid">
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Star size={14} color="var(--ccb-gold)" />
            <span style={{
              fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12,
              letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ccb-gold)',
            }}>Kỷ niệm 30/4 · Chương trình lớn</span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 44, lineHeight: 1.1, margin: 0 }}>
            Tri ân Cựu Chiến Binh<br/>
            <span style={{ color: 'var(--ccb-gold)' }}>giảm đến 30%</span> toàn hệ thống
          </h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, lineHeight: 1.6, color: '#F2E8CF', marginTop: 16, maxWidth: 520 }}>
            Từ 20/4 đến 02/5/2026. Ưu đãi đặc biệt cho Hội viên Hội Cựu Chiến Binh Việt Nam và gia đình khi đặt hàng trực tuyến.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
            <a href="#" style={{
              background: '#FBF7EE', color: 'var(--ccb-red-deep)',
              fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 16,
              padding: '14px 26px', borderRadius: 4,
            }}>Xem ưu đãi</a>
            <Link href="/login" style={{
              background: 'transparent', color: 'var(--ccb-gold)',
              fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 16,
              padding: '14px 26px', borderRadius: 4,
              border: '1px solid var(--ccb-gold)',
            }}>Đăng ký Hội viên</Link>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[['12','Ngày'],['08','Giờ'],['23','Phút'],['45','Giây']].map(([n,l]) => (
            <div key={l} style={{
              background: 'var(--ccb-red-deep)', borderRadius: 8,
              padding: '20px 12px', textAlign: 'center',
              border: '1px solid rgba(255,248,231,0.1)',
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 40, lineHeight: 1, color: 'var(--ccb-gold)' }}>{n}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 6, color: '#F2E8CF' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function RegionStrip() {
  const regions = [
    { name: 'Miền Bắc',   cities: 'Hà Nội · Hải Phòng · Hà Giang · Lào Cai', count: '18 tỉnh', href: '/category/dac-san-mien-bac' },
    { name: 'Miền Trung', cities: 'Đà Nẵng · Huế · Quảng Nam · Nghệ An',     count: '19 tỉnh', href: '/category/dac-san-mien-trung' },
    { name: 'Miền Nam',   cities: 'TP. HCM · Cần Thơ · Sóc Trăng · An Giang', count: '19 tỉnh', href: '/category/dac-san-mien-nam' },
  ];
  return (
    <section style={{ background: 'var(--paper-0)', padding: '56px 0', borderBottom: '1px solid var(--line)' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 24px' }}>
        <SectionHead eyebrow="Trên toàn quốc" title="Đặc sản ba miền, gửi về tận nhà" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 28 }}>
          {regions.map((r, i) => (
            <Link key={r.name} href={r.href} style={{
              position: 'relative', overflow: 'hidden',
              border: '1px solid var(--line)', borderRadius: 8,
              background: i === 1 ? 'var(--ccb-olive)' : '#FFFFFF',
              color: i === 1 ? '#FBF7EE' : 'var(--ink-1)',
              padding: '32px 28px',
              display: 'flex', flexDirection: 'column', minHeight: 200,
            }}>
              <div style={{
                fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 11,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: i === 1 ? 'var(--ccb-gold)' : 'var(--ccb-red)',
              }}>{r.count}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 36, lineHeight: 1.1, marginTop: 8 }}>{r.name}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, marginTop: 12, opacity: 0.85, flex: 1 }}>{r.cities}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, marginTop: 16,
                display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={14} /> Khám phá đặc sản →
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CommunityVoices() {
  const quotes = [
    {
      name: 'Ông Trần Văn Hùng',
      role: 'CCB Quân khu 3 · Hải Phòng',
      body: 'CCB Mart giúp tôi bán được chè Tân Cương do chính tay vườn nhà làm ra, tới tận Hà Nội và Sài Gòn. Bà con tin tưởng vì có thương hiệu Cựu Chiến Binh đảm bảo.',
    },
    {
      name: 'Bà Nguyễn Thị Lan',
      role: 'Khách hàng thân thiết · Đà Nẵng',
      body: 'Tôi đặt gạo và nước mắm cho cả gia đình từ CCB Mart. Hàng thật, giá rõ ràng, nhân viên giao hàng lễ phép. Cảm thấy như mua từ người quen.',
    },
    {
      name: 'Ông Lê Đức Minh',
      role: 'Chủ nhiệm HTX CCB · Sóc Trăng',
      body: 'Mười năm trước bà con trồng lúa ST25 phải tự tìm đầu ra. Bây giờ qua CCB Mart, mỗi vụ mùa đều có đơn đặt trước. Đồng đội giúp đồng đội.',
    },
  ];
  return (
    <section style={{ background: 'var(--paper-1)', padding: '64px 0', borderBottom: '1px solid var(--line)' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 24px' }}>
        <SectionHead eyebrow="Tiếng nói cộng đồng" title="Đồng đội giúp đồng đội" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginTop: 28 }}>
          {quotes.map((q) => (
            <figure key={q.name} style={{
              background: '#FFFFFF', border: '1px solid var(--line)', borderRadius: 8,
              padding: 24, margin: 0, display: 'flex', flexDirection: 'column', gap: 16,
            }}>
              <Star size={20} />
              <blockquote style={{
                fontFamily: 'var(--font-display)', fontWeight: 400, fontStyle: 'italic',
                fontSize: 17, lineHeight: 1.5, color: 'var(--ink-1)', margin: 0, flex: 1,
              }}>&ldquo;{q.body}&rdquo;</blockquote>
              <figcaption style={{ display: 'flex', gap: 12, alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: 14 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', background: 'var(--ccb-olive)', color: '#FBF7EE',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16,
                }}>{q.name.split(' ').pop()![0]}</div>
                <div>
                  <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13, color: 'var(--ink-1)' }}>{q.name}</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{q.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const cols: { h: string; items: { label: string; href: string }[] }[] = [
    { h: 'CCB Mart',     items: [
      { label: 'Về chúng tôi', href: '/about' },
      { label: 'Mạng lưới cửa hàng', href: '/stores' },
      { label: 'Hội viên CCB', href: '/about' },
      { label: 'Tuyển dụng', href: '#' },
      { label: 'Liên hệ', href: '/about' },
    ] },
    { h: 'Mua sắm',      items: [
      { label: 'Tất cả danh mục', href: '/category/gao-luong-thuc' },
      { label: 'Đặc sản ba miền', href: '/category/dac-san-vung-mien' },
      { label: 'Hàng khuyến mãi', href: '/category/hang-khuyen-mai' },
      { label: 'Quà tặng', href: '/category/qua-tang-ccb' },
      { label: 'Thẻ Hội viên', href: '/login' },
    ] },
    { h: 'Hỗ trợ',       items: [
      { label: 'Chính sách giao hàng', href: '#' },
      { label: 'Chính sách đổi trả', href: '#' },
      { label: 'Phương thức thanh toán', href: '/cart' },
      { label: 'Câu hỏi thường gặp', href: '#' },
      { label: 'Tra cứu đơn hàng', href: '#' },
    ] },
    { h: 'Nhà cung cấp', items: [
      { label: 'Trở thành đối tác', href: '/about' },
      { label: 'Quy chuẩn sản phẩm', href: '/about' },
      { label: 'Hỗ trợ Cựu Chiến Binh khởi nghiệp', href: '/about' },
      { label: 'Đăng ký gian hàng', href: '/login' },
    ] },
  ];
  return (
    <footer style={{ background: 'var(--ccb-olive-dark)', color: '#E8E4D4' }}>
      <div className="ccb-stripe" />
      <div style={{ maxWidth: 1600, margin: '0 auto', padding: '56px 24px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr repeat(4, 1fr)', gap: 32 }} className="ccb-footer-grid">
          <div>
            <div style={{ background: 'var(--paper-0)', padding: '12px 16px', borderRadius: 6, display: 'inline-block' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ccb-mart-logo.png" alt="CCB Mart" style={{ height: 36, width: 'auto', display: 'block' }} />
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.6, marginTop: 16, color: '#D4CFBE' }}>
              Hệ thống bán lẻ và phân phối của cộng đồng Cựu Chiến Binh Việt Nam. Đồng hành cùng bà con trên khắp mọi miền Tổ quốc.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.h}>
              <div style={{
                fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13,
                letterSpacing: '0.04em', textTransform: 'uppercase', color: '#FBF7EE', marginBottom: 14,
              }}>{c.h}</div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {c.items.map((it) => (
                  <li key={it.label}><Link href={it.href} style={{ color: '#D4CFBE', fontSize: 13, fontFamily: 'var(--font-body)' }}>{it.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{
          borderTop: '1px solid rgba(251,247,238,0.1)', marginTop: 40, paddingTop: 20,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#B8B3A2' }}>
            © {new Date().getFullYear()} CCB Mart · Hệ thống bán lẻ Cựu Chiến Binh Việt Nam.
          </div>
          <div style={{ display: 'flex', gap: 18, fontFamily: 'var(--font-body)', fontSize: 12 }}>
            <a href="#" style={{ color: '#B8B3A2' }}>Điều khoản sử dụng</a>
            <a href="#" style={{ color: '#B8B3A2' }}>Chính sách bảo mật</a>
            <a href="#" style={{ color: '#B8B3A2' }}>Sơ đồ trang</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
