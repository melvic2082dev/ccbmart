'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Clock, MapPin, Phone, Search } from 'lucide-react';
import { LandingShell } from '@/components/landing/LandingShell';

type Store = {
  name: string;
  addr: string;
  hours: string;
  phone: string;
  dist: string;
  city: string;
  highlight?: boolean;
};

const stores: Store[] = [
  { name: 'CCB Mart Ba Đình',     addr: 'Số 19 Hoàng Diệu, Q. Ba Đình, Hà Nội',     hours: '7:00 — 21:30 · Mở cả tuần', phone: '024 3734 1234', dist: '1.2 km',  city: 'Hà Nội',    highlight: true },
  { name: 'CCB Mart Cầu Giấy',    addr: 'Số 88 Trần Duy Hưng, Q. Cầu Giấy, Hà Nội', hours: '7:00 — 22:00',              phone: '024 3556 7788', dist: '4.5 km',  city: 'Hà Nội' },
  { name: 'CCB Mart Thanh Xuân',  addr: 'Số 234 Nguyễn Trãi, Q. Thanh Xuân, Hà Nội',hours: '6:30 — 22:00',              phone: '024 3858 9900', dist: '6.8 km',  city: 'Hà Nội' },
  { name: 'CCB Mart Long Biên',   addr: 'Số 45 Ngô Gia Tự, Q. Long Biên, Hà Nội',   hours: '7:00 — 21:00',              phone: '024 3827 1122', dist: '8.2 km',  city: 'Hà Nội' },
  { name: 'CCB Mart Hà Đông',     addr: 'Số 120 Quang Trung, Q. Hà Đông, Hà Nội',   hours: '6:30 — 22:30',              phone: '024 3312 4455', dist: '12.4 km', city: 'Hà Nội' },
  { name: 'CCB Mart Hoàn Kiếm',   addr: 'Số 56 Hàng Bài, Q. Hoàn Kiếm, Hà Nội',     hours: '7:00 — 22:00',              phone: '024 3825 6677', dist: '2.3 km',  city: 'Hà Nội' },
  { name: 'CCB Mart Đống Đa',     addr: 'Số 198 Tây Sơn, Q. Đống Đa, Hà Nội',       hours: '6:30 — 22:00',              phone: '024 3576 4433', dist: '3.7 km',  city: 'Hà Nội' },
  { name: 'CCB Mart Hai Bà Trưng',addr: 'Số 67 Bạch Mai, Q. Hai Bà Trưng, Hà Nội',  hours: '7:00 — 21:30',              phone: '024 3987 1100', dist: '5.4 km',  city: 'Hà Nội' },
  { name: 'CCB Mart Hoàng Mai',   addr: 'Số 234 Giáp Bát, Q. Hoàng Mai, Hà Nội',    hours: '7:00 — 22:00',              phone: '024 3664 5588', dist: '9.1 km',  city: 'Hà Nội' },
  { name: 'CCB Mart Tây Hồ',      addr: 'Số 12 Lạc Long Quân, Q. Tây Hồ, Hà Nội',   hours: '7:00 — 21:00',              phone: '024 3711 2244', dist: '7.5 km',  city: 'Hà Nội' },
  { name: 'CCB Mart Quận 1',      addr: 'Số 28 Lê Lợi, Q. 1, TP. HCM',              hours: '6:30 — 22:30',              phone: '028 3822 1111', dist: '—',       city: 'TP. HCM' },
  { name: 'CCB Mart Quận 3',      addr: 'Số 142 Võ Văn Tần, Q. 3, TP. HCM',         hours: '7:00 — 22:00',              phone: '028 3930 2233', dist: '—',       city: 'TP. HCM' },
  { name: 'CCB Mart Quận 7',      addr: 'Số 88 Nguyễn Văn Linh, Q. 7, TP. HCM',     hours: '7:00 — 22:00',              phone: '028 5412 7788', dist: '—',       city: 'TP. HCM' },
  { name: 'CCB Mart Tân Bình',    addr: 'Số 56 Cộng Hòa, Q. Tân Bình, TP. HCM',     hours: '6:30 — 22:30',              phone: '028 3811 3344', dist: '—',       city: 'TP. HCM' },
  { name: 'CCB Mart Bình Thạnh',  addr: 'Số 290 Phan Đăng Lưu, Bình Thạnh, TP. HCM',hours: '7:00 — 22:00',              phone: '028 3551 6677', dist: '—',       city: 'TP. HCM' },
  { name: 'CCB Mart Đà Nẵng',     addr: 'Số 78 Lê Duẩn, Q. Hải Châu, Đà Nẵng',      hours: '7:00 — 21:30',              phone: '0236 3826 4422', dist: '—',      city: 'Đà Nẵng' },
  { name: 'CCB Mart Cần Thơ',     addr: 'Số 12 Nguyễn Trãi, Q. Ninh Kiều, Cần Thơ', hours: '7:00 — 21:00',              phone: '0292 3812 5566', dist: '—',      city: 'Cần Thơ' },
  { name: 'CCB Mart Hải Phòng',   addr: 'Số 102 Lạch Tray, Q. Ngô Quyền, Hải Phòng', hours: '7:00 — 21:30',             phone: '0225 3856 7788', dist: '—',      city: 'Hải Phòng' },
];

const TOTAL_STORES = 127;

const PAGE_SIZE = 5;

function gmapsHref(addr: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
}

export default function StoresPage() {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('all');
  const [showAll, setShowAll] = useState(false);

  const cities = useMemo(() => Array.from(new Set(stores.map((s) => s.city))), []);

  const filtered = useMemo(() => {
    return stores.filter((s) => {
      if (city !== 'all' && s.city !== city) return false;
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return s.name.toLowerCase().includes(q) || s.addr.toLowerCase().includes(q);
    });
  }, [query, city]);

  const visible = showAll ? filtered : filtered.slice(0, PAGE_SIZE);
  const hiddenCount = Math.max(0, TOTAL_STORES - visible.length);

  return (
    <LandingShell>
      <main style={{ maxWidth: 1600, margin: '0 auto', padding: '32px 24px 72px' }}>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', display: 'flex', gap: 8 }}>
          <Link href="/" style={{ color: 'var(--ccb-red)' }}>Trang chủ</Link>
          <span style={{ color: 'var(--ink-4)' }}>/</span>
          <span>Hệ thống cửa hàng</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 36, margin: '12px 0 8px' }}>
          Hệ thống {TOTAL_STORES} cửa hàng CCB Mart
        </h1>
        <p style={{ maxWidth: 640, fontSize: 16, color: 'var(--ink-2)' }}>
          Tìm cửa hàng gần bạn nhất. Mọi cửa hàng CCB Mart đều do đồng đội Cựu Chiến Binh tại địa phương vận hành — Ban liên lạc Trung đoàn E29 hỗ trợ chuẩn hoá quy trình.
        </p>

        <div style={{ display: 'flex', gap: 12, margin: '24px 0 32px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowAll(true); }}
              placeholder="Tìm theo quận, huyện, tên cửa hàng…"
              style={{
                width: '100%', padding: '14px 16px 14px 42px',
                border: '1px solid var(--line-strong)', borderRadius: 6,
                fontFamily: 'var(--font-body)', fontSize: 15, background: '#fff',
              }}
            />
          </div>
          <select
            value={city}
            onChange={(e) => { setCity(e.target.value); setShowAll(false); }}
            style={{ padding: '14px 16px', border: '1px solid var(--line-strong)', borderRadius: 6, fontFamily: 'var(--font-body)', fontSize: 14, background: '#fff', minWidth: 180 }}
          >
            <option value="all">Tất cả tỉnh thành</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 24 }} className="ccb-stores-grid">
          <div>
            {visible.length === 0 ? (
              <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 8, padding: 32, textAlign: 'center', color: 'var(--ink-3)' }}>
                Không tìm thấy cửa hàng phù hợp. Vui lòng thử từ khoá khác.
              </div>
            ) : (
              visible.map((s) => (
                <div key={s.name} style={{
                  background: '#fff',
                  border: s.highlight ? '2px solid var(--ccb-red)' : '1px solid var(--line)',
                  borderRadius: 8, padding: 18, marginBottom: 12,
                  display: 'grid', gridTemplateColumns: '1fr auto', gap: 12,
                }}>
                  <div>
                    {s.highlight && (
                      <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ccb-red)', marginBottom: 6 }}>
                        📍 Gần bạn nhất
                      </div>
                    )}
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, margin: '0 0 8px' }}>{s.name}</h3>
                    <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 4, display: 'flex', gap: 6, alignItems: 'center' }}>
                      <MapPin size={13} /> {s.addr}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink-3)', display: 'flex', gap: 6, alignItems: 'center' }}>
                      <Clock size={13} /> {s.hours}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink-3)', display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                      <Phone size={13} />{' '}
                      <a href={`tel:${s.phone.replace(/\s/g, '')}`} style={{ color: 'inherit' }}>{s.phone}</a>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'end', gap: 8 }}>
                    {s.dist !== '—' && (
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--ccb-olive)', fontSize: 15 }}>{s.dist}</div>
                    )}
                    <a
                      href={gmapsHref(s.addr)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ padding: '8px 14px', fontSize: 12, border: '1px solid var(--ccb-olive)', color: 'var(--ccb-olive)', borderRadius: 4, fontWeight: 600, whiteSpace: 'nowrap' }}
                    >
                      Chỉ đường →
                    </a>
                  </div>
                </div>
              ))
            )}

            {!showAll && filtered.length > PAGE_SIZE && (
              <div style={{ textAlign: 'center', padding: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--ccb-red)', fontWeight: 600, fontSize: 14, cursor: 'pointer', padding: '8px 16px' }}
                >
                  Xem thêm {hiddenCount} cửa hàng →
                </button>
              </div>
            )}
            {showAll && filtered.length > PAGE_SIZE && (
              <div style={{ textAlign: 'center', padding: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowAll(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--ink-3)', fontWeight: 600, fontSize: 14, cursor: 'pointer', padding: '8px 16px' }}
                >
                  Thu gọn ↑
                </button>
              </div>
            )}
          </div>

          <aside style={{ position: 'sticky', top: 20, alignSelf: 'start' }}>
            <div style={{
              background: 'linear-gradient(135deg, var(--ccb-olive-tint) 0%, #E8E4D4 100%)',
              border: '1px solid var(--ccb-olive)', borderRadius: 12,
              aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(123,123,60,.1) 20px, rgba(123,123,60,.1) 21px)' }} />
              <div style={{ textAlign: 'center', position: 'relative' }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>🗺</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--ccb-olive-dark)' }}>Bản đồ cửa hàng</div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>Bấm “Chỉ đường” trên từng cửa hàng để mở Google Maps</div>
              </div>
              {[
                ['30%', '40%', 'var(--ccb-red)', 20],
                ['55%', '35%', 'var(--ccb-olive)', 14],
                ['45%', '60%', 'var(--ccb-olive)', 14],
                ['70%', '70%', 'var(--ccb-olive)', 14],
                ['40%', '75%', 'var(--ccb-olive)', 14],
              ].map(([l, t, bg, sz], i) => (
                <div key={i} style={{
                  position: 'absolute', left: l as string, top: t as string,
                  width: sz as number, height: sz as number, background: bg as string,
                  border: '2px solid #FBF7EE', borderRadius: '50%',
                  transform: 'translate(-50%, -50%)', boxShadow: '0 2px 4px rgba(0,0,0,.15)',
                }} />
              ))}
            </div>
          </aside>
        </div>
      </main>
    </LandingShell>
  );
}
