import type { CSSProperties, ReactNode } from 'react';

export function Star({ size = 16, color = 'var(--ccb-red)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
      <path d="M12 2 L14.9 8.9 L22.5 9.5 L16.7 14.4 L18.5 21.8 L12 17.8 L5.5 21.8 L7.3 14.4 L1.5 9.5 L9.1 8.9 Z" />
    </svg>
  );
}

type BadgeVariant = 'red' | 'olive' | 'gold' | 'soft' | 'oliveSoft';

export function Badge({ variant = 'red', children }: { variant?: BadgeVariant; children: ReactNode }) {
  const map: Record<BadgeVariant, CSSProperties> = {
    red:       { background: 'var(--ccb-red)',        color: '#FFF8E7' },
    olive:     { background: 'var(--ccb-olive)',      color: '#FBF7EE' },
    gold:      { background: 'var(--ccb-gold)',       color: '#2F230A' },
    soft:      { background: 'var(--ccb-red-tint)',   color: 'var(--ccb-red-dark)' },
    oliveSoft: { background: 'var(--ccb-olive-tint)', color: 'var(--ccb-olive-dark)' },
  };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontFamily: 'var(--font-body)',
        fontWeight: 600,
        fontSize: 11,
        padding: '3px 10px',
        borderRadius: 999,
        letterSpacing: '0.04em',
        ...map[variant],
      }}
    >
      {children}
    </span>
  );
}

export function formatVnd(n: number): string {
  return n.toLocaleString('vi-VN').replace(/,/g, '.') + ' ₫';
}

export function SectionHead({ eyebrow, title, link }: { eyebrow?: string; title: string; link?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
      <div>
        {eyebrow && (
          <div style={{
            fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--ccb-red)', marginBottom: 6,
          }}>{eyebrow}</div>
        )}
        <h2 style={{
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 32,
          lineHeight: 1.15, color: 'var(--ink-1)', margin: 0,
        }}>{title}</h2>
      </div>
      {link && (
        <a href="#" style={{
          fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14,
          color: 'var(--ccb-red)', whiteSpace: 'nowrap',
        }}>{link} →</a>
      )}
    </div>
  );
}

type ProductTone = 'paper' | 'red' | 'olive' | 'gold';

export function ProductArt({ label, tone = 'paper' }: { label: string; tone?: ProductTone }) {
  const tones: Record<ProductTone, { bg: string; fg: string }> = {
    paper: { bg: 'var(--paper-1)',        fg: 'var(--ink-4)' },
    red:   { bg: 'var(--ccb-red-tint)',   fg: 'var(--ccb-red)' },
    olive: { bg: 'var(--ccb-olive-tint)', fg: 'var(--ccb-olive)' },
    gold:  { bg: '#F5E9C9',               fg: 'var(--ccb-gold-dark)' },
  };
  const t = tones[tone];
  return (
    <div style={{
      width: '100%', height: '100%',
      background: t.bg, color: t.fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28,
      lineHeight: 1.1, textAlign: 'center', padding: 16,
    }}>
      {label}
    </div>
  );
}
