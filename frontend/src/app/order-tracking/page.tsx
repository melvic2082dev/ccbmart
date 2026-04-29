'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { LandingShell } from '@/components/landing/LandingShell';

type Status = 'idle' | 'loading' | 'not_found' | 'found';

export default function OrderTrackingPage() {
  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!orderId.trim() || !phone.trim()) return;
    setStatus('loading');
    setTimeout(() => setStatus('not_found'), 800);
  };

  return (
    <LandingShell>
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 96px' }}>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', display: 'flex', gap: 8 }}>
          <Link href="/" style={{ color: 'var(--ccb-red)' }}>Trang chủ</Link>
          <span style={{ color: 'var(--ink-4)' }}>/</span>
          <span>Tra cứu đơn hàng</span>
        </div>

        <header style={{ marginTop: 24, marginBottom: 32 }}>
          <div style={{
            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13,
            letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ccb-red)',
            marginBottom: 12,
          }}>
            Hỗ trợ khách hàng
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: 'clamp(32px, 4vw, 44px)', lineHeight: 1.15, margin: '0 0 16px',
          }}>
            Tra cứu đơn hàng
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 17, lineHeight: 1.65, color: 'var(--ink-2)', margin: 0 }}>
            Nhập mã đơn hàng và số điện thoại đã sử dụng khi đặt để xem trạng thái và vị trí đơn hàng.
          </p>
        </header>

        <form
          onSubmit={onSubmit}
          style={{
            background: '#fff', border: '1px solid var(--line)', borderRadius: 10,
            padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
          }}
        >
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: 'var(--ink-2)', marginBottom: 6 }}>
              Mã đơn hàng
            </label>
            <input
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="VD: CCB-2026-0123456"
              style={{
                width: '100%', padding: '12px 14px',
                border: '1px solid var(--line-strong)', borderRadius: 6,
                fontFamily: 'var(--font-body)', fontSize: 15, background: '#fff',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: 'var(--ink-2)', marginBottom: 6 }}>
              Số điện thoại đã đặt
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0xxx xxx xxx"
              inputMode="tel"
              style={{
                width: '100%', padding: '12px 14px',
                border: '1px solid var(--line-strong)', borderRadius: 6,
                fontFamily: 'var(--font-body)', fontSize: 15, background: '#fff',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={status === 'loading'}
            style={{
              padding: '14px 22px',
              background: 'var(--ccb-red)', color: '#FFF8E7',
              border: 'none', borderRadius: 6,
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 15,
              cursor: status === 'loading' ? 'wait' : 'pointer',
              opacity: status === 'loading' ? 0.7 : 1,
            }}
          >
            {status === 'loading' ? 'Đang tra cứu…' : 'Tra cứu →'}
          </button>
        </form>

        {status === 'not_found' && (
          <div style={{
            marginTop: 24, padding: '18px 22px',
            background: 'var(--ccb-red-tint)', border: '1px solid var(--ccb-red)',
            borderLeft: '4px solid var(--ccb-red)', borderRadius: 8,
            fontFamily: 'var(--font-body)', fontSize: 16, lineHeight: 1.6, color: 'var(--ink-2)',
          }}>
            <strong style={{ color: 'var(--ccb-red)' }}>Không tìm thấy đơn hàng.</strong>{' '}
            Vui lòng kiểm tra lại mã đơn và số điện thoại. Nếu vẫn không tìm thấy, gọi hotline{' '}
            <a href="tel:19006868" style={{ color: 'var(--ccb-red)', fontWeight: 700 }}>1900 6868</a> để được hỗ trợ.
          </div>
        )}

        <div style={{ marginTop: 32, padding: '18px 22px', background: 'var(--ccb-olive-tint)', border: '1px solid var(--ccb-olive)', borderRadius: 8, borderLeft: '4px solid var(--ccb-olive)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--ccb-olive-dark)', marginBottom: 6 }}>
            Cần hỗ trợ trực tiếp?
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.6, color: 'var(--ink-2)' }}>
            Hotline{' '}
            <a href="tel:19006868" style={{ color: 'var(--ccb-olive-dark)', fontWeight: 700 }}>1900 6868</a>{' '}
            (8:00 — 22:00 hằng ngày) hoặc email{' '}
            <a href="mailto:hotro@ccbmart.vn" style={{ color: 'var(--ccb-olive-dark)', fontWeight: 700 }}>hotro@ccbmart.vn</a>.
          </div>
        </div>
      </main>
    </LandingShell>
  );
}
