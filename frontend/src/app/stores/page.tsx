'use client';

import Link from 'next/link';
import { Clock, MapPin, Phone, Search } from 'lucide-react';
import { LandingShell } from '@/components/landing/LandingShell';

const stores = [
  { name: 'CCB Mart Ba Đình',     addr: 'Số 19 Hoàng Diệu, Q. Ba Đình, Hà Nội',     hours: '7:00 — 21:30 · Mở cả tuần', phone: '024 3734 1234', dist: '1.2 km',  highlight: true },
  { name: 'CCB Mart Cầu Giấy',    addr: 'Số 88 Trần Duy Hưng, Q. Cầu Giấy, Hà Nội', hours: '7:00 — 22:00',              phone: '024 3556 7788', dist: '4.5 km' },
  { name: 'CCB Mart Thanh Xuân',  addr: 'Số 234 Nguyễn Trãi, Q. Thanh Xuân, Hà Nội',hours: '6:30 — 22:00',              phone: '024 3858 9900', dist: '6.8 km' },
  { name: 'CCB Mart Long Biên',   addr: 'Số 45 Ngô Gia Tự, Q. Long Biên, Hà Nội',   hours: '7:00 — 21:00',              phone: '024 3827 1122', dist: '8.2 km' },
  { name: 'CCB Mart Hà Đông',     addr: 'Số 120 Quang Trung, Q. Hà Đông, Hà Nội',   hours: '6:30 — 22:30',              phone: '024 3312 4455', dist: '12.4 km' },
];

export default function StoresPage() {
  return (
    <LandingShell>
      <main style={{ maxWidth: 1600, margin: '0 auto', padding: '32px 24px 72px' }}>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', display: 'flex', gap: 8 }}>
          <Link href="/" style={{ color: 'var(--ccb-red)' }}>Trang chủ</Link>
          <span style={{ color: 'var(--ink-4)' }}>/</span>
          <span>Hệ thống cửa hàng</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 36, margin: '12px 0 8px' }}>
          Hệ thống 127 cửa hàng CCB Mart
        </h1>
        <p style={{ maxWidth: 640, fontSize: 16, color: 'var(--ink-2)' }}>
          Tìm cửa hàng gần bạn nhất. Mọi cửa hàng CCB Mart đều do chi hội Cựu Chiến Binh địa phương vận hành.
        </p>

        <div style={{ display: 'flex', gap: 12, margin: '24px 0 32px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
            <input placeholder="Tìm theo quận, huyện…" style={{
              width: '100%', padding: '14px 16px 14px 42px',
              border: '1px solid var(--line-strong)', borderRadius: 6,
              fontFamily: 'var(--font-body)', fontSize: 15, background: '#fff',
            }} />
          </div>
          <select style={{ padding: '14px 16px', border: '1px solid var(--line-strong)', borderRadius: 6, fontFamily: 'var(--font-body)', fontSize: 14, background: '#fff', minWidth: 180 }}>
            <option>Tất cả tỉnh thành</option>
            <option>Hà Nội</option>
            <option>TP. HCM</option>
            <option>Đà Nẵng</option>
          </select>
          <button type="button" style={{ padding: '14px 24px', background: 'var(--ccb-red)', color: '#FFF8E7', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
            Tìm kiếm
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 24 }} className="ccb-stores-grid">
          <div>
            {stores.map((s) => (
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
                    <Phone size={13} /> {s.phone}
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'end', gap: 8 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--ccb-olive)', fontSize: 15 }}>{s.dist}</div>
                  <a href="#" style={{ padding: '8px 14px', fontSize: 12, border: '1px solid var(--ccb-olive)', color: 'var(--ccb-olive)', borderRadius: 4, fontWeight: 600 }}>
                    Chỉ đường →
                  </a>
                </div>
              </div>
            ))}
            <div style={{ textAlign: 'center', padding: 12 }}>
              <a href="#" style={{ color: 'var(--ccb-red)', fontWeight: 600 }}>Xem thêm 122 cửa hàng →</a>
            </div>
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
                <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>(placeholder — tích hợp Google Maps)</div>
              </div>
              {/* fake map markers */}
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
