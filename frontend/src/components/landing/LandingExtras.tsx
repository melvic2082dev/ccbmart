'use client';

/**
 * Landing extras:
 *  1. StickyFundBanner — shrinks the fund headline into a corner pill once
 *     the user scrolls past the fund section. Hides again when footer is visible.
 *  2. SocialProofTicker — rotates 8 "real-time" messages every 4.5s.
 */

import { useEffect, useState } from 'react';

export function StickyFundBanner({ amount, monthLabel }: { amount: number; monthLabel: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const fund = document.getElementById('quy-nghia-tinh');
      const footer = document.querySelector('footer');
      if (!fund) return;
      const rect = fund.getBoundingClientRect();
      const pastTop = rect.bottom < 80;
      const footerInView = footer ? footer.getBoundingClientRect().top < window.innerHeight - 60 : false;
      setShow(pastTop && !footerInView);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const fmt = amount.toLocaleString('vi-VN');

  return (
    <div
      className={`ccb-fund-sticky${show ? ' show' : ''}`}
      aria-live="polite"
      style={{
        position: 'fixed', top: 80, right: 16, zIndex: 70,
        background: '#FFFFFF',
        border: '2px solid var(--ccb-red)',
        borderRadius: 12,
        padding: '12px 16px',
        boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
        fontFamily: 'var(--font-body)',
        display: 'flex', alignItems: 'center', gap: 12,
        maxWidth: 320,
      }}
    >
      <span
        className="ccb-pulse-dot"
        aria-hidden
        style={{
          width: 12, height: 12, borderRadius: '50%',
          background: 'var(--ccb-red)', flex: 'none',
        }}
      />
      <div>
        <div style={{
          fontSize: 12, color: 'var(--ink-3)', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          Quỹ Vì đồng đội · {monthLabel}
        </div>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 800,
          fontSize: 22, color: 'var(--ccb-red)', lineHeight: 1,
        }}>
          {fmt}₫
        </div>
      </div>
    </div>
  );
}

const TICKER_MESSAGES = [
  '🇻🇳 Vừa có đơn hàng từ Hà Nội — góp thêm 5.000₫ vào quỹ Vì đồng đội.',
  '☎️ Cô Lan tại Đà Nẵng vừa kết nối Zalo với bác Hùng (Hưng Yên).',
  '🍚 Anh Tùng tại TP. HCM vừa đặt 5 kg gạo ST25 — góp 1.870₫ vào quỹ.',
  '💝 Một CCB tại Sóc Trăng vừa gửi lời cảm ơn vì gói hỗ trợ tháng 3.',
  '🐝 Chị Mai tại Hải Phòng vừa đặt 2 chai mật ong U Minh — góp 6.400₫.',
  '🤝 Bác Ba (Thái Nguyên) vừa nhận đơn 5 khay trứng từ khách Hà Nội.',
  '✅ Đã trao xong suất quà tại Mèo Vạc, Hà Giang — biên lai sẽ được đăng.',
  '🌿 Anh Long tại Cần Thơ vừa đặt combo rau sạch của bác Tư (Sóc Sơn).',
];

export function SocialProofTicker() {
  const [i, setI] = useState(0);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const t = setInterval(() => {
      setOpacity(0);
      setTimeout(() => {
        setI((prev) => (prev + 1) % TICKER_MESSAGES.length);
        setOpacity(1);
      }, 250);
    }, 4500);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: '#FFFFFF',
        border: '1px solid var(--line)',
        borderRadius: 999,
        padding: '14px 22px',
        display: 'flex', alignItems: 'center', gap: 14,
        maxWidth: 760, margin: '56px auto 0',
        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
      }}
    >
      <span
        className="ccb-pulse-dot"
        aria-hidden
        style={{
          width: 12, height: 12, borderRadius: '50%',
          background: 'var(--ccb-red)', flex: 'none',
        }}
      />
      <span style={{
        fontSize: 12, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--ccb-red)', flex: 'none',
      }}>
        Vừa mới
      </span>
      <span
        className="ccb-ticker-text"
        style={{
          fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--ink-1)',
          fontWeight: 500, opacity,
          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
          flex: 1,
        }}
      >
        {TICKER_MESSAGES[i]}
      </span>
    </div>
  );
}
