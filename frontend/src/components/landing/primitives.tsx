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

export function SectionHead({ eyebrow, title, link, linkHref }: { eyebrow?: string; title: string; link?: string; linkHref?: string }) {
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
        <a href={linkHref ?? '#'} style={{
          fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14,
          color: 'var(--ccb-red)', whiteSpace: 'nowrap',
        }}>{link} →</a>
      )}
    </div>
  );
}

type ProductTone = 'paper' | 'red' | 'olive' | 'gold';

export function ProductArt({ label, tone = 'paper' }: { label: string; tone?: ProductTone }) {
  // Gradient + radial highlight per tone — typographic tile keeps the design's
  // intentional "no stock photos" stance but with more visual depth than flat fill.
  const tones: Record<ProductTone, { bg: string; bgEnd: string; spot: string; fg: string }> = {
    paper: { bg: '#F4EEDF', bgEnd: '#E8DFC9', spot: 'rgba(154,146,125,0.18)', fg: 'var(--ink-3)' },
    red:   { bg: '#FBE9EA', bgEnd: '#F4D3D5', spot: 'rgba(169,30,36,0.20)',   fg: 'var(--ccb-red)' },
    olive: { bg: '#ECEFE0', bgEnd: '#D8DDC4', spot: 'rgba(68,86,38,0.20)',    fg: 'var(--ccb-olive)' },
    gold:  { bg: '#F5E9C9', bgEnd: '#E8D49A', spot: 'rgba(159,125,51,0.22)',  fg: 'var(--ccb-gold-dark)' },
  };
  const t = tones[tone];
  // Hairline cross pattern — subtle, evokes traditional Vietnamese paper / dó
  const pattern = `repeating-linear-gradient(45deg, transparent 0 14px, rgba(28,26,20,0.04) 14px 15px), repeating-linear-gradient(-45deg, transparent 0 14px, rgba(28,26,20,0.03) 14px 15px)`;
  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      background: `radial-gradient(circle at 25% 25%, ${t.spot} 0%, transparent 55%), linear-gradient(135deg, ${t.bg} 0%, ${t.bgEnd} 100%)`,
      color: t.fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28,
      lineHeight: 1.1, textAlign: 'center', padding: 16,
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: pattern, opacity: 0.6, pointerEvents: 'none' }} />
      {/* Inner border ring for "framed paper" feel */}
      <div style={{ position: 'absolute', inset: 8, border: '1px solid rgba(28,26,20,0.08)', borderRadius: 4, pointerEvents: 'none' }} />
      <span style={{ position: 'relative', whiteSpace: 'pre-line' }}>{label}</span>
    </div>
  );
}

/* Wax-seal style CCB verified badge — used in ProductCard / ProductPage to signal
   "Hội viên CCB cung ứng" without leaning on stock photography. */
export function WaxSeal({ size = 56 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'radial-gradient(circle at 35% 30%, #C42129 0%, #8E1418 70%, #5E0F12 100%)',
      border: '2px solid #FBE9EA',
      boxShadow: '0 2px 6px rgba(94,15,18,0.35), inset 0 1px 2px rgba(255,255,255,0.18), inset 0 -2px 4px rgba(0,0,0,0.25)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      transform: 'rotate(-6deg)', color: '#F2D5A0',
      fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: Math.round(size * 0.18), lineHeight: 1,
      letterSpacing: '0.04em',
    }}>
      <Star size={Math.round(size * 0.28)} color="#F2D5A0" />
      <div style={{ marginTop: 2 }}>CCB</div>
    </div>
  );
}
