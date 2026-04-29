'use client';

/**
 * "Hậu phương" — Nhu yếu phẩm từ đồng đội
 * CCB Mart kết nối, KHÔNG bán trực tiếp.
 * Nền teal nhạt #E8F4F8 để phân định rạch ròi với khối "Tâm huyết" (nền trắng).
 */

import { Phone } from 'lucide-react';

const TEAL_BG = '#E8F4F8';
const ZALO = '#0068FF';
const ZALO_DARK = '#0050C8';
const OLIVE_DARK = '#3F4F23';
const DEEP_RED = '#8B0000';

export type ConnectListing = {
  id: string;
  iconEmoji: string;
  productName: string;
  veteranName: string;       // "bác Hùng"
  province: string;          // "Hưng Yên"
  priceText: string;         // "15.000₫"
  priceNote: string;         // "/ kg · tối thiểu 10 kg"
  zaloUrl?: string;          // https://zalo.me/<sdt>
  callTimes: string;         // "trực điện thoại 7h–20h"
};

const DEFAULT_LISTINGS: ConnectListing[] = [
  {
    id: 'gao-te-thuong-hung-yen',
    iconEmoji: '🍚',
    productName: 'Gạo tẻ thường — vụ Đông Xuân',
    veteranName: 'bác Hùng',
    province: 'Hưng Yên',
    priceText: '15.000₫',
    priceNote: '/ kg · tối thiểu 10 kg',
    callTimes: 'bác trực điện thoại 7h–20h',
  },
  {
    id: 'trung-ga-ta-thai-nguyen',
    iconEmoji: '🥚',
    productName: 'Trứng gà ta thả vườn',
    veteranName: 'bác Ba',
    province: 'Thái Nguyên',
    priceText: '4.500₫',
    priceNote: '/ quả · giao theo khay 30 quả',
    callTimes: 'bác giao trong 50 km quanh Thái Nguyên',
  },
  {
    id: 'rau-cu-soc-son',
    iconEmoji: '🌿',
    productName: 'Rau củ sạch theo mùa',
    veteranName: 'bác Tư',
    province: 'Sóc Sơn, Hà Nội',
    priceText: '18.000₫',
    priceNote: '/ combo 5 loại rau theo mùa',
    callTimes: 'bác chốt đơn buổi sáng, giao trong ngày',
  },
];

export function ConnectListingsSection({ listings = DEFAULT_LISTINGS }: { listings?: ConnectListing[] }) {
  if (!listings || listings.length === 0) return null;
  return (
    <section id="hau-phuong" style={{
      background: TEAL_BG,
      padding: '96px 32px',
      borderTop: '1px solid var(--line)',
      borderBottom: '1px solid var(--line)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Section head */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700,
            letterSpacing: '0.10em', textTransform: 'uppercase',
            color: ZALO_DARK, marginBottom: 12,
          }}>
            ★ Hậu phương · Kết nối, không bán trực tiếp ★
          </div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: 'clamp(28px, 3.4vw, 40px)', lineHeight: 1.2,
            margin: 0, color: 'var(--ink-1)',
          }}>
            Nhu yếu phẩm từ đồng đội — CCB Mart kết nối
          </h2>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 19, lineHeight: 1.55,
            color: 'var(--ink-2)', margin: '14px auto 0', maxWidth: 720,
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
            marginTop: 16,
          }}>
            ⚠ CCB Mart không thu phí — không trung gian thanh toán
          </span>
        </div>

        {/* Grid */}
        <div className="ccb-connect-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28,
        }}>
          {listings.map((l) => <ConnectCard key={l.id} listing={l} />)}
        </div>

        {/* See more */}
        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <a href="/connect" style={{
            color: ZALO_DARK, fontWeight: 700, fontSize: 18,
            borderBottom: '2px solid currentColor', paddingBottom: 4,
          }}>
            Xem 200+ nhu yếu phẩm khác từ đồng đội →
          </a>
        </div>
      </div>
    </section>
  );
}

function ConnectCard({ listing }: { listing: ConnectListing }) {
  const { iconEmoji, productName, veteranName, province, priceText, priceNote, zaloUrl, callTimes } = listing;
  const href = zaloUrl ?? '#';
  const upperName = veteranName.toUpperCase();
  return (
    <article className="ccb-connect-card" style={{
      background: '#FFFFFF',
      borderRadius: 14,
      padding: '28px 24px',
      textAlign: 'center',
      boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
      display: 'flex', flexDirection: 'column', gap: 14,
      border: '1px solid #C8E0E5',
    }}>
      <div style={{ fontSize: 56, lineHeight: 1 }}>{iconEmoji}</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22,
        lineHeight: 1.3, color: 'var(--ink-1)',
      }}>
        {productName}
      </div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: OLIVE_DARK, fontWeight: 600 }}>
        <span style={{
          display: 'inline-block', background: 'var(--ccb-olive-tint)', color: OLIVE_DARK,
          padding: '2px 8px', borderRadius: 4, fontSize: 13, fontWeight: 700, marginRight: 6,
        }}>CCB</span>
        {veteranName} — {province}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 800,
        fontSize: 36, color: DEEP_RED, lineHeight: 1.0,
      }}>
        {priceText}
        <small style={{
          display: 'block', fontSize: 16, fontWeight: 600,
          color: 'var(--ink-3)', marginTop: 4,
        }}>{priceNote}</small>
      </div>
      <a
        href={href}
        target={zaloUrl ? '_blank' : undefined}
        rel={zaloUrl ? 'noopener noreferrer' : undefined}
        className="ccb-zalo-btn"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          minHeight: 56, padding: '14px 22px',
          background: ZALO, color: '#FFFFFF',
          borderRadius: 12, fontWeight: 800, fontSize: 18,
          fontFamily: 'var(--font-body)',
          boxShadow: '0 6px 18px rgba(0,104,255,0.30)',
          transition: 'transform .15s ease, background .15s ease',
        }}
      >
        <span style={{
          width: 28, height: 28, borderRadius: 6,
          background: '#FFFFFF', color: ZALO,
          fontWeight: 900, fontSize: 14,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>Z</span>
        <Phone size={18} />
        GỌI ZALO {upperName}
      </a>
      <div style={{
        fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--ink-2)',
        fontStyle: 'italic', marginTop: 4,
      }}>
        Bấm để kết nối trực tiếp với <strong style={{ color: OLIVE_DARK, fontStyle: 'normal' }}>{veteranName}</strong> — {callTimes}.
      </div>
    </article>
  );
}
