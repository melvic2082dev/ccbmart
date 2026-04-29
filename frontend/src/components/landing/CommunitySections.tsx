// Community-focused homepage blocks (60% real-estate per design brief).
// All accept optional CMS data; falls back to a minimal placeholder if missing.

import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck, Coins, HandHeart, Truck, ArrowRight, Quote, BadgeCheck } from 'lucide-react';
import { SectionHead, Star } from './primitives';
import type { TrustItemData } from './Sections';

// ---------- Why Us ----------
export type WhyUsData = {
  eyebrow?: string;
  title?: string;
  body?: string;
  imageUrl?: string | null;
  isActive?: boolean;
};

export function WhyUsSection({ data }: { data?: WhyUsData } = {}) {
  if (data && data.isActive === false) return null;
  const eyebrow = data?.eyebrow ?? 'Câu chuyện CCB Mart';
  const title = data?.title ?? 'Tại sao chúng tôi làm dự án này?';
  const body = data?.body ?? 'CCB Mart sinh ra từ trăn trở của những người lính trở về đời thường: nhiều đồng đội năm xưa nay tuổi đã cao, vẫn miệt mài làm nông, chăn nuôi, sản xuất đặc sản quê hương — nhưng đầu ra lại bấp bênh. Mỗi sản phẩm trên kệ hàng là một câu chuyện, mỗi đơn hàng là một nghĩa cử.';

  return (
    <section id="cau-chuyen" style={{ background: 'var(--paper-1)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '96px 24px',
        display: 'grid', gridTemplateColumns: data?.imageUrl ? '1fr 1fr' : '1fr', gap: 48, alignItems: 'center' }} className="ccb-whyus-grid">
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Star size={14} />
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ccb-red)' }}>
              {eyebrow}
            </span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(28px, 3vw, 38px)', lineHeight: 1.2, color: 'var(--ink-1)', margin: '0 0 20px' }}>
            {title}
          </h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 17, lineHeight: 1.7, color: 'var(--ink-2)', whiteSpace: 'pre-line' }}>
            {body}
          </p>
          <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/about" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 15, color: 'var(--ccb-red)',
            }}>
              Đọc câu chuyện đầy đủ <ArrowRight size={16} />
            </Link>
          </div>
        </div>
        {data?.imageUrl && (
          <div style={{ position: 'relative', aspectRatio: '4 / 3', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line)' }}>
            <Image src={data.imageUrl} alt="Câu chuyện CCB Mart" fill sizes="(max-width: 880px) 100vw, 50vw" className="object-cover" unoptimized />
          </div>
        )}
      </div>
    </section>
  );
}

// ---------- Core Values (replaces TrustBar with stronger visual + military framing) ----------
const CORE_VALUE_ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  ShieldCheck, Truck, HandHeart, Coins, BadgeCheck,
};

export function CoreValuesSection({ items }: { items?: TrustItemData[] } = {}) {
  const fallback: { icon: keyof typeof CORE_VALUE_ICON_MAP; title: string; sub: string }[] = [
    { icon: 'ShieldCheck', title: 'Sự tử tế & minh bạch', sub: 'Mỗi đơn hàng đều ghi rõ phần trích quỹ, không lập lờ.' },
    { icon: 'BadgeCheck', title: 'Chất lượng từ kỷ luật quân đội', sub: 'CCB sản xuất theo quy trình truyền thống, được Hội xác nhận.' },
    { icon: 'HandHeart', title: '1% cho đồng đội', sub: 'Đã hỗ trợ hơn 47 gia đình CCB khó khăn trong năm qua.' },
    { icon: 'Truck', title: 'Giao nhanh — đổi trả vì nghĩa', sub: '24h tại các thành phố lớn. Không hài lòng, hoàn 100%.' },
  ];
  const list = items && items.length > 0
    ? items.map((it) => ({ icon: (it.iconName as keyof typeof CORE_VALUE_ICON_MAP) || 'ShieldCheck', title: it.title, sub: it.subtitle }))
    : fallback;

  return (
    <section style={{ background: 'var(--paper-0)', padding: '80px 0', borderBottom: '1px solid var(--line)' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 24px' }}>
        <SectionHead eyebrow="Điều cốt lõi" title="Giá trị mà CCB Mart cam kết" />
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginTop: 28,
        }}>
          {list.map((it) => {
            const IconCmp = CORE_VALUE_ICON_MAP[it.icon] ?? ShieldCheck;
            return (
              <div key={it.title} style={{
                background: '#FFFFFF', border: '1px solid var(--line)', borderRadius: 8,
                padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 8,
                  background: 'var(--ccb-olive-tint)', color: 'var(--ccb-olive-dark)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <IconCmp size={24} />
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, color: 'var(--ink-1)', lineHeight: 1.3 }}>
                  {it.title}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.55 }}>
                  {it.sub}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ---------- Community Journey (Hành trình kết nối) ----------
export type CommunityPhotoData = {
  id: number;
  imageUrl: string | null;
  caption: string;
  impactValue: string | null;
  impactLabel: string | null;
  displayOrder: number;
  isActive: boolean;
};

export function CommunityJourneySection({ photos }: { photos?: CommunityPhotoData[] } = {}) {
  if (!photos || photos.length === 0) return null;
  return (
    <section id="hanh-trinh-nghia-tinh" style={{ background: 'var(--paper-1)', padding: '96px 0', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 24px' }}>
        <SectionHead eyebrow="Việc làm thật" title="Hành trình nghĩa tình — Hoạt động gần đây"
          link="Xem tất cả hoạt động" linkHref="#hanh-trinh-nghia-tinh" />
        <div style={{
          display: 'grid', gridTemplateColumns: `repeat(${Math.min(photos.length, 4)}, 1fr)`, gap: 16, marginTop: 28,
        }} className="ccb-journey-grid">
          {photos.slice(0, 4).map((p) => (
            <figure key={p.id} style={{
              margin: 0, borderRadius: 8, overflow: 'hidden',
              border: '1px solid var(--line)', background: '#FFFFFF',
            }}>
              <div style={{ position: 'relative', aspectRatio: '4 / 3', background: 'var(--ccb-olive-tint)' }}>
                {p.imageUrl ? (
                  <Image src={p.imageUrl} alt={p.caption} fill sizes="(max-width: 880px) 100vw, 25vw" className="object-cover" unoptimized />
                ) : (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Star size={32} color="var(--ccb-olive)" />
                  </div>
                )}
              </div>
              <figcaption style={{ padding: '14px 16px 16px' }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.5, color: 'var(--ink-2)', minHeight: 56 }}>
                  {p.caption}
                </div>
                {(p.impactValue || p.impactLabel) && (
                  <div style={{
                    marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)',
                    display: 'flex', alignItems: 'baseline', gap: 8,
                  }}>
                    {p.impactValue && (
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--ccb-red)' }}>
                        {p.impactValue}
                      </span>
                    )}
                    {p.impactLabel && (
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--ink-3)' }}>
                        {p.impactLabel}
                      </span>
                    )}
                  </div>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- Transparency Fund (Bảng minh bạch quỹ) ----------
export type FundEntryData = {
  id: number;
  occurredAt: string;
  type: 'in' | 'out';
  amount: number;
  description: string;
  balance: number | null;
  displayOrder: number;
  isActive: boolean;
};

const fmtVND = (n: number) => n.toLocaleString('vi-VN');

export function TransparencyFundSection({ entries }: { entries?: FundEntryData[] } = {}) {
  if (!entries || entries.length === 0) return null;

  // Compute current-month vs all-time stats. Current month = newest entry's month.
  const newest = entries[0];
  const newestDate = new Date(newest.occurredAt);
  const curMonth = newestDate.getMonth();
  const curYear = newestDate.getFullYear();
  const monthLabel = `${String(curMonth + 1).padStart(2, '0')}/${curYear}`;

  const inMonth = (e: FundEntryData) => {
    const d = new Date(e.occurredAt);
    return d.getMonth() === curMonth && d.getFullYear() === curYear;
  };
  const monthIn = entries.filter((e) => inMonth(e) && e.type === 'in').reduce((s, e) => s + e.amount, 0);
  const monthOuts = entries.filter((e) => inMonth(e) && e.type === 'out');
  const monthOutTotal = monthOuts.reduce((s, e) => s + e.amount, 0);
  const monthRemaining = Math.max(0, monthIn - monthOutTotal);

  const outsSummary = monthOuts.length > 0
    ? monthOuts.map((e) => e.description).join(' · ')
    : '—';

  return (
    <section id="minh-bach-quy" style={{ background: '#F0F4F0', padding: '96px 0', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <SectionHead eyebrow="Dashboard minh bạch" title={`Quỹ Vì đồng đội — Tháng ${monthLabel}`} />

        {/* 3 KPI cards — month summary */}
        <div style={{
          marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16,
        }}>
          <FundKpiCard
            label={`Tổng thu từ 1% – Tháng ${monthLabel}`}
            value={`${fmtVND(monthIn)} ₫`}
            variant="in"
            note="Trích 1% trên doanh thu mọi đơn hàng"
          />
          <FundKpiCard
            label="Đã trao trong tháng"
            value={`${fmtVND(monthOutTotal)} ₫`}
            variant="out"
            note={outsSummary}
          />
          <FundKpiCard
            label={`Còn lại cho Tháng ${String(curMonth + 2).padStart(2, '0')}/${curYear}`}
            value={`${fmtVND(monthRemaining)} ₫`}
            variant="balance"
            note="Sẽ ưu tiên hỗ trợ CCB neo đơn"
          />
        </div>

        {/* Timeline (history) */}
        <div style={{ marginTop: 32 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--ink-1)', margin: '0 0 12px' }}>
            Lịch sử giao dịch
          </h3>
          <div style={{ background: '#FFFFFF', border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead style={{ background: 'var(--paper-1)' }}>
                <tr>
                  <th style={tH}>Ngày</th>
                  <th style={tH}>Loại</th>
                  <th style={{ ...tH, textAlign: 'right' }}>Số tiền</th>
                  <th style={tH}>Mô tả</th>
                  <th style={{ ...tH, textAlign: 'right' }}>Số dư</th>
                </tr>
              </thead>
              <tbody>
                {entries.slice(0, 8).map((e) => (
                  <tr key={e.id} style={{ borderTop: '1px solid var(--line)' }}>
                    <td style={tD}>{new Date(e.occurredAt).toLocaleDateString('vi-VN')}</td>
                    <td style={tD}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                        background: e.type === 'in' ? 'var(--ccb-olive-tint)' : 'var(--ccb-red-tint)',
                        color: e.type === 'in' ? 'var(--ccb-olive-dark)' : 'var(--ccb-red)',
                      }}>{e.type === 'in' ? 'Thu' : 'Chi'}</span>
                    </td>
                    <td style={{ ...tD, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: e.type === 'in' ? 'var(--ccb-olive-dark)' : 'var(--ccb-red)' }}>
                      {e.type === 'in' ? '+' : '−'}{fmtVND(e.amount)} ₫
                    </td>
                    <td style={tD}>{e.description}</td>
                    <td style={{ ...tD, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--ink-3)' }}>
                      {e.balance != null ? `${fmtVND(e.balance)} ₫` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p style={{ marginTop: 16, fontSize: 12.5, color: 'var(--ink-3)', fontStyle: 'italic', textAlign: 'center' }}>
          Sao kê chi tiết công khai mỗi tháng. Mọi khoản chi đều có biên lai và xác nhận của Hội Cựu Chiến Binh địa phương.
        </p>
      </div>
    </section>
  );
}

const tH: React.CSSProperties = { textAlign: 'left', padding: '12px 16px', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-3)' };
const tD: React.CSSProperties = { padding: '12px 16px', fontFamily: 'var(--font-body)', color: 'var(--ink-1)' };

function FundKpiCard({ label, value, variant, note }: { label: string; value: string; variant: 'in' | 'out' | 'balance'; note?: string }) {
  const palette = variant === 'in' ? { fg: 'var(--ccb-olive-dark)', accent: 'var(--ccb-olive)' }
    : variant === 'out' ? { fg: 'var(--ccb-red)', accent: 'var(--ccb-red)' }
    : { fg: 'var(--ccb-gold-dark)', accent: 'var(--ccb-gold)' };
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 10, padding: '24px 24px 20px',
      borderLeft: `4px solid ${palette.accent}`,
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{
        fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700,
        letterSpacing: '0.04em', textTransform: 'uppercase',
        color: 'var(--ink-3)',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, lineHeight: 1.1,
        color: palette.fg, marginTop: 8, fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
      {note && (
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-2)',
          marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)',
          lineHeight: 1.45,
        }}>
          {note}
        </div>
      )}
    </div>
  );
}

// ---------- CCB Testimonials (Tiếng nói chiến hữu) ----------
export type TestimonialData = {
  id: number;
  name: string;
  location: string;
  unit: string;
  body: string;
  photoUrl: string | null;
  verified: boolean;
};

export function CCBTestimonialsSection({ items }: { items?: TestimonialData[] } = {}) {
  if (!items || items.length === 0) return null;
  return (
    <section id="tieng-noi" style={{ background: 'var(--paper-1)', padding: '96px 0', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 24px' }}>
        <SectionHead eyebrow="Tiếng nói chiến hữu" title="Đồng đội giúp đồng đội" />
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 28,
        }}>
          {items.map((t) => (
            <figure key={t.id} style={{
              background: '#FFFFFF', border: '1px solid var(--line)', borderRadius: 8,
              padding: 24, margin: 0, display: 'flex', flexDirection: 'column', gap: 16,
            }}>
              <Quote size={24} color="var(--ccb-olive)" style={{ opacity: 0.5 }} />
              <blockquote style={{
                fontFamily: 'var(--font-display)', fontWeight: 400, fontStyle: 'italic',
                fontSize: 17, lineHeight: 1.55, color: 'var(--ink-1)', margin: 0, flex: 1,
              }}>&ldquo;{t.body}&rdquo;</blockquote>
              <figcaption style={{
                display: 'flex', gap: 12, alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: 14,
              }}>
                <div style={{
                  position: 'relative', width: 48, height: 48, borderRadius: '50%', overflow: 'hidden',
                  background: 'var(--ccb-olive)', color: '#FBF7EE',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, flexShrink: 0,
                }}>
                  {t.photoUrl ? (
                    <Image src={t.photoUrl} alt={t.name} fill sizes="48px" className="object-cover" unoptimized />
                  ) : t.name.split(' ').pop()?.[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13, color: 'var(--ink-1)' }}>{t.name}</span>
                    {t.verified && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        fontSize: 10, fontWeight: 700, color: 'var(--ccb-olive-dark)',
                        background: 'var(--ccb-olive-tint)', padding: '1px 6px', borderRadius: 999,
                      }}>
                        <BadgeCheck size={11} /> Đã xác minh
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                    {[t.unit, t.location].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
