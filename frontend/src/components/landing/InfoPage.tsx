'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { LandingShell } from './LandingShell';

export type InfoSection =
  | { kind: 'paragraph'; body: ReactNode }
  | { kind: 'heading'; text: string }
  | { kind: 'bullet'; items: ReactNode[] }
  | { kind: 'numbered'; items: ReactNode[] }
  | { kind: 'callout'; tone?: 'olive' | 'red' | 'gold'; title?: string; body: ReactNode }
  | { kind: 'qa'; question: string; answer: ReactNode }
  | { kind: 'divider' }
  | { kind: 'custom'; node: ReactNode };

export function InfoPage({
  eyebrow,
  title,
  intro,
  breadcrumbLabel,
  sections,
  cta,
}: {
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  breadcrumbLabel: string;
  sections: InfoSection[];
  cta?: { label: string; href: string };
}) {
  return (
    <LandingShell>
      <main style={{ maxWidth: 980, margin: '0 auto', padding: '32px 24px 96px' }}>
        <div style={{ fontSize: 18, color: 'var(--ink-3)', display: 'flex', gap: 8 }}>
          <Link href="/" style={{ color: 'var(--ccb-red)' }}>Trang chủ</Link>
          <span style={{ color: 'var(--ink-4)' }}>/</span>
          <span>{breadcrumbLabel}</span>
        </div>

        <header style={{ marginTop: 24, marginBottom: 40 }}>
          {eyebrow && (
            <div style={{
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 18,
              letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ccb-red)',
              marginBottom: 12,
            }}>
              {eyebrow}
            </div>
          )}
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: 'clamp(32px, 4vw, 44px)', lineHeight: 1.15, margin: '0 0 16px',
            color: 'var(--ink-1)',
          }}>
            {title}
          </h1>
          {intro && (
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: 18, lineHeight: 1.65,
              color: 'var(--ink-2)', maxWidth: 760,
            }}>
              {intro}
            </div>
          )}
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {sections.map((s, i) => <SectionRenderer key={i} s={s} />)}
        </div>

        {cta && (
          <div style={{ marginTop: 48, textAlign: 'center' }}>
            <Link
              href={cta.href}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 32px',
                background: 'var(--ccb-red)', color: '#FFF8E7',
                borderRadius: 6, fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 20,
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {cta.label} →
            </Link>
          </div>
        )}
      </main>
    </LandingShell>
  );
}

function SectionRenderer({ s }: { s: InfoSection }) {
  if (s.kind === 'paragraph') {
    return (
      <p style={{
        fontFamily: 'var(--font-body)', fontSize: 17, lineHeight: 1.7,
        color: 'var(--ink-2)', margin: 0,
      }}>{s.body}</p>
    );
  }
  if (s.kind === 'heading') {
    return (
      <h2 style={{
        fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, lineHeight: 1.25,
        color: 'var(--ink-1)', margin: '24px 0 4px',
      }}>{s.text}</h2>
    );
  }
  if (s.kind === 'bullet') {
    return (
      <ul style={{
        fontFamily: 'var(--font-body)', fontSize: 17, lineHeight: 1.7,
        color: 'var(--ink-2)', margin: 0, paddingLeft: 22,
      }}>
        {s.items.map((it, i) => <li key={i} style={{ marginBottom: 6 }}>{it}</li>)}
      </ul>
    );
  }
  if (s.kind === 'numbered') {
    return (
      <ol style={{
        fontFamily: 'var(--font-body)', fontSize: 17, lineHeight: 1.7,
        color: 'var(--ink-2)', margin: 0, paddingLeft: 22,
      }}>
        {s.items.map((it, i) => <li key={i} style={{ marginBottom: 6 }}>{it}</li>)}
      </ol>
    );
  }
  if (s.kind === 'callout') {
    const tone = s.tone ?? 'olive';
    const toneColor = tone === 'red' ? 'var(--ccb-red)' : tone === 'gold' ? 'var(--ccb-gold-dark)' : 'var(--ccb-olive-dark)';
    const toneBg = tone === 'red' ? 'var(--ccb-red-tint)' : tone === 'gold' ? '#FAF1D9' : 'var(--ccb-olive-tint)';
    return (
      <aside style={{
        background: toneBg, border: `1px solid ${toneColor}`, borderRadius: 8,
        padding: '18px 22px', borderLeft: `4px solid ${toneColor}`,
      }}>
        {s.title && (
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17,
            color: toneColor, marginBottom: 6,
          }}>
            {s.title}
          </div>
        )}
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 22, lineHeight: 1.6,
          color: 'var(--ink-2)',
        }}>
          {s.body}
        </div>
      </aside>
    );
  }
  if (s.kind === 'qa') {
    return (
      <details style={{
        background: '#fff', border: '1px solid var(--line)', borderRadius: 8,
        padding: '14px 18px',
      }}>
        <summary style={{
          fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 22,
          color: 'var(--ink-1)', cursor: 'pointer', listStyle: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <span>{s.question}</span>
          <span style={{ color: 'var(--ccb-red)', fontSize: 18 }}>+</span>
        </summary>
        <div style={{
          marginTop: 10, fontFamily: 'var(--font-body)', fontSize: 22, lineHeight: 1.65,
          color: 'var(--ink-2)',
        }}>
          {s.answer}
        </div>
      </details>
    );
  }
  if (s.kind === 'divider') {
    return <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '12px 0' }} />;
  }
  return <>{s.node}</>;
}
