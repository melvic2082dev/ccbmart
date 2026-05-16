import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Award, BookOpen, Coffee, Compass, Gift, HandHeart, Home, MapPin, Mountain, Palmtree,
  RefreshCcw, ShieldCheck, Soup, Star as StarIcon, Sun, Tag, Truck, Wallet, Wheat,
} from 'lucide-react';
import { SectionHead, Star } from './primitives';
import { CATEGORIES, type Category } from './categories';

const ICONS = { wheat: Wheat, soup: Soup, coffee: Coffee, mountain: Mountain, sun: Sun, palmtree: Palmtree, home: Home, gift: Gift, tag: Tag, compass: Compass } as const;

// Map CMS-stored icon name → lucide component for TrustBar items.
const TRUST_ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  ShieldCheck, Truck, RefreshCcw, HandHeart, Award, Wallet,
  Coffee, Wheat, MapPin, Star: StarIcon, Gift, BookOpen,
};

export type TrustItemData = { id: number; title: string; subtitle: string; iconName: string };

export function TrustBar({ items: cmsItems }: { items?: TrustItemData[] } = {}) {
  const fallback = [
    { icon: <ShieldCheck size={22} />, title: 'Nguồn gốc rõ ràng', sub: 'Xuất xứ từ hội viên CCB, có chứng nhận' },
    { icon: <Truck size={22} />,        title: 'Giao hàng 24 giờ', sub: 'Miễn phí đơn từ 300.000 ₫' },
    { icon: <RefreshCcw size={22} />,   title: 'Đổi trả 7 ngày',   sub: 'Không hài lòng, hoàn tiền 100%' },
    { icon: <HandHeart size={22} />,    title: '1% cho đồng đội',  sub: 'Hỗ trợ CCB khó khăn trên toàn quốc' },
  ];
  const items = cmsItems && cmsItems.length > 0
    ? cmsItems.map((it) => {
        const IconCmp = TRUST_ICON_MAP[it.iconName] ?? ShieldCheck;
        return { icon: <IconCmp size={22} />, title: it.title, sub: it.subtitle };
      })
    : fallback;
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
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 19, color: 'var(--ink-1)' }}>{it.title}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--ink-3)', marginTop: 2, lineHeight: 1.4 }}>{it.sub}</div>
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

export function CategoryStrip({ categories }: { categories?: Category[] } = {}) {
  // Show 8 categories on the homepage strip — first 8 entries
  const cats = (categories ?? CATEGORIES).slice(0, 8);
  return (
    <section style={{ background: 'var(--paper-0)', padding: '64px 0', borderBottom: '1px solid var(--line)' }}>
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
                  fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 16,
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

export type PromoData = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  imageUrl?: string | null;
  endDate?: string | null;
  primaryCtaText?: string;
  primaryCtaHref?: string;
  secondaryCtaText?: string | null;
  secondaryCtaHref?: string | null;
  isActive?: boolean;
};

function useCountdown(targetIso: string | null) {
  // Server render + first client render must agree → start with null, fill in after mount.
  // Take the ISO string (stable across renders) instead of a Date — passing a fresh `new Date()`
  // each render would change the dep reference and re-run the effect every tick → infinite loop.
  const [parts, setParts] = useState<{ d: string; h: string; m: string; s: string } | null>(null);

  useEffect(() => {
    if (!targetIso) { setParts(null); return; }
    const targetMs = new Date(targetIso).getTime();
    if (isNaN(targetMs)) { setParts(null); return; }
    const compute = () => {
      const diff = targetMs - Date.now();
      const safe = Math.max(0, diff);
      const days = Math.floor(safe / 86400000);
      const h = Math.floor((safe % 86400000) / 3600000);
      const m = Math.floor((safe % 3600000) / 60000);
      const s = Math.floor((safe % 60000) / 1000);
      const pad = (n: number) => String(n).padStart(2, '0');
      setParts({ d: pad(Math.min(99, days)), h: pad(h), m: pad(m), s: pad(s) });
    };
    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  return parts;
}

export function PromoBanner({ data }: { data?: PromoData } = {}) {
  const eyebrow = data?.eyebrow ?? 'Kỷ niệm 30/4 · Chương trình lớn';
  const title = data?.title;
  const subtitle = data?.subtitle ?? 'Từ 20/4 đến 02/5/2026. Ưu đãi đặc biệt cho thành viên CCB Mart và đồng đội Cựu Chiến Binh khi đặt hàng trực tuyến.';
  const primaryCtaText = data?.primaryCtaText ?? 'Xem ưu đãi';
  const primaryCtaHref = data?.primaryCtaHref ?? '#';
  const secondaryCtaText = data?.secondaryCtaText ?? 'Đăng ký thành viên';
  const secondaryCtaHref = data?.secondaryCtaHref ?? '/login';

  const countdown = useCountdown(data?.endDate ?? null);
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
              fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 16,
              letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ccb-gold)',
            }}>{eyebrow}</span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 44, lineHeight: 1.1, margin: 0 }}>
            {title ? title : (
              <>
                Tri ân Cựu Chiến Binh<br/>
                <span style={{ color: 'var(--ccb-gold)' }}>giảm đến 30%</span> toàn hệ thống
              </>
            )}
          </h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 22, lineHeight: 1.6, color: '#F2E8CF', marginTop: 16, maxWidth: 520 }}>
            {subtitle}
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
            <a href={primaryCtaHref} style={{
              background: '#FBF7EE', color: 'var(--ccb-red-deep)',
              fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 22,
              padding: '14px 26px', borderRadius: 4,
            }}>{primaryCtaText}</a>
            {secondaryCtaText && secondaryCtaHref && (
              <Link href={secondaryCtaHref} style={{
                background: 'transparent', color: 'var(--ccb-gold)',
                fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 22,
                padding: '14px 26px', borderRadius: 4,
                border: '1px solid var(--ccb-gold)',
              }}>{secondaryCtaText}</Link>
            )}
          </div>
        </div>

        {data?.imageUrl ? (
          <div style={{ position: 'relative', aspectRatio: '4 / 3', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,248,231,0.2)' }}>
            <Image
              src={data.imageUrl}
              alt="Promo"
              fill
              sizes="(max-width: 1100px) 100vw, 40vw"
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <CountdownBlocks countdown={countdown} />
        )}
      </div>
    </section>
  );
}

function CountdownBlocks({ countdown }: { countdown: { d: string; h: string; m: string; s: string } | null }) {
  // Use placeholder values (matching server render) until client mounts to avoid hydration mismatch.
  const blocks: [string, string][] = countdown
    ? [[countdown.d, 'Ngày'], [countdown.h, 'Giờ'], [countdown.m, 'Phút'], [countdown.s, 'Giây']]
    : [['12', 'Ngày'], ['08', 'Giờ'], ['23', 'Phút'], ['45', 'Giây']];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      {blocks.map(([n, l]) => (
        <div key={l} style={{
          background: 'var(--ccb-red-deep)', borderRadius: 8,
          padding: '20px 12px', textAlign: 'center',
          border: '1px solid rgba(255,248,231,0.1)',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 40, lineHeight: 1, color: 'var(--ccb-gold)', fontVariantNumeric: 'tabular-nums' }}>{n}</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 6, color: '#F2E8CF' }}>{l}</div>
        </div>
      ))}
    </div>
  );
}

export function RegionStrip() {
  const regions = [
    { name: 'Miền Bắc',   cities: 'Hà Nội · Hải Phòng · Hà Giang · Lào Cai', count: '18 tỉnh', href: '/category/dac-san-mien-bac' },
    { name: 'Miền Trung', cities: 'Đà Nẵng · Huế · Quảng Nam · Nghệ An',     count: '19 tỉnh', href: '/category/dac-san-mien-trung' },
    { name: 'Miền Nam',   cities: 'TP. HCM · Cần Thơ · Sóc Trăng · An Giang', count: '19 tỉnh', href: '/category/dac-san-mien-nam' },
  ];
  return (
    <section style={{ background: 'var(--paper-0)', padding: '80px 0', borderBottom: '1px solid var(--line)' }}>
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
                fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 15,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: i === 1 ? 'var(--ccb-gold)' : 'var(--ccb-red)',
              }}>{r.count}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 36, lineHeight: 1.1, marginTop: 8 }}>{r.name}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 18, marginTop: 12, opacity: 0.85, flex: 1 }}>{r.cities}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 18, marginTop: 16,
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
    <section style={{ background: 'var(--paper-1)', padding: '96px 0', borderBottom: '1px solid var(--line)' }}>
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
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22,
                }}>{q.name.split(' ').pop()![0]}</div>
                <div>
                  <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 18, color: 'var(--ink-1)' }}>{q.name}</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--ink-3)', marginTop: 2 }}>{q.role}</div>
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
      { label: 'Tuyển dụng', href: '/careers' },
      { label: 'Liên hệ', href: '/about' },
    ] },
    { h: 'Mua sắm',      items: [
      { label: 'Tất cả danh mục', href: '/category/gao-luong-thuc' },
      { label: 'Đặc sản ba miền', href: '/category/dac-san-vung-mien' },
      { label: 'Đặc sản miền Bắc', href: '/category/dac-san-mien-bac' },
      { label: 'Đặc sản miền Trung', href: '/category/dac-san-mien-trung' },
      { label: 'Đặc sản miền Nam', href: '/category/dac-san-mien-nam' },
    ] },
    { h: 'Hỗ trợ',       items: [
      { label: 'Câu hỏi thường gặp', href: '/faq' },
      { label: 'Chính sách giao hàng', href: '/shipping-policy' },
      { label: 'Chính sách đổi trả', href: '/return-policy' },
      { label: 'Phương thức thanh toán', href: '/payment-methods' },
      { label: 'Tra cứu đơn hàng', href: '/order-tracking' },
    ] },
    { h: 'Nhà cung cấp', items: [
      { label: 'Trở thành đối tác', href: '/careers' },
      { label: 'Đăng ký gian hàng', href: '/login' },
      { label: 'Tuyển dụng', href: '/careers' },
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
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 18, lineHeight: 1.6, marginTop: 16, color: '#D4CFBE' }}>
              Một dự án của Ban liên lạc Trung đoàn E29 — đồng hành cùng người lính làm kinh tế trên khắp mọi miền Tổ quốc.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.h}>
              <div style={{
                fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 18,
                letterSpacing: '0.04em', textTransform: 'uppercase', color: '#FBF7EE', marginBottom: 14,
              }}>{c.h}</div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {c.items.map((it) => (
                  <li key={it.label}><Link href={it.href} style={{ color: '#D4CFBE', fontSize: 18, fontFamily: 'var(--font-body)' }}>{it.label}</Link></li>
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
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: '#B8B3A2' }}>
            © {new Date().getFullYear()} CCB Mart · Hệ thống bán lẻ Cựu Chiến Binh Việt Nam.
          </div>
          <div style={{ display: 'flex', gap: 18, fontFamily: 'var(--font-body)', fontSize: 16, flexWrap: 'wrap' }}>
            <Link href="/terms" style={{ color: '#B8B3A2' }}>Điều khoản sử dụng</Link>
            <Link href="/privacy" style={{ color: '#B8B3A2' }}>Chính sách bảo mật</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
