// Senior-friendly homepage sections — designed for 50-80 year-old veterans.
// Principles: 18-20px body, 32-40px headlines, ≥48px buttons, generous spacing.

import Image from 'next/image';
import Link from 'next/link';
import { Phone, Truck, RefreshCcw, HandHeart, ShoppingCart, ArrowRight, BadgeCheck } from 'lucide-react';
import { formatVnd, ProductArt } from './primitives';

// (Some lucide imports above are referenced from inline JSX even when not visible to grep;
// keep them all to avoid silent removal during future edits.)
import type { ProductDetail } from './categories';
import type { HeroData } from './Hero';
import type { CommunityPhotoData, FundEntryData } from './CommunitySections';

const olive = 'var(--ccb-olive)';
const oliveDark = 'var(--ccb-olive-dark)';
const brown = 'var(--ccb-brown, #8B5A2B)';
const deepRed = 'var(--ccb-red)';
const cream = '#FAF9F6';

// =========================================================================
// 1. HERO — full-width portrait with overlay
// =========================================================================
export function SeniorHero({ data }: { data?: HeroData }) {
  const title = data?.title ?? 'CCB Mart — Nơi đồng đội gửi gắm tâm huyết';
  const subtitle = data?.subtitle ?? 'Đặc sản từ tay lính — Mỗi đơn hàng là một nghĩa cử';
  const ctaText = data?.primaryCtaText ?? 'Xem sản phẩm — Ủng hộ đồng đội';
  const ctaHref = data?.primaryCtaHref ?? '#san-pham';
  const bg = data?.imageUrl;

  return (
    <section style={{
      position: 'relative', minHeight: 540,
      background: cream,
      borderBottom: '1px solid var(--line)',
    }}>
      {/* Background image or fallback gradient */}
      {bg ? (
        <Image src={bg} alt="" fill priority sizes="100vw" className="object-cover" unoptimized
          style={{ objectPosition: 'center 30%' }} />
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(135deg, ${oliveDark} 0%, ${olive} 60%, ${brown} 100%)`,
        }} />
      )}
      {/* Dark gradient overlay for text legibility */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.7) 100%)',
      }} />
      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 1100, margin: '0 auto', padding: '120px 32px 96px',
        color: '#FFFFFF',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(36px, 5vw, 56px)', lineHeight: 1.15, fontWeight: 800,
          margin: 0, maxWidth: 880,
          textShadow: '0 2px 12px rgba(0,0,0,0.5)',
        }}>
          {title}
        </h1>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(20px, 2vw, 24px)', lineHeight: 1.5,
          marginTop: 24, maxWidth: 720,
          textShadow: '0 1px 8px rgba(0,0,0,0.4)',
        }}>
          {subtitle}
        </p>
        <a href={ctaHref} style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          marginTop: 40,
          background: olive, color: '#FFFFFF',
          fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 20,
          padding: '18px 36px', borderRadius: 8,
          minHeight: 56,
          boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
          textDecoration: 'none',
          transition: 'background 0.15s ease, transform 0.15s ease',
        }} className="ccb-cta-primary">
          <ShoppingCart size={22} />
          {ctaText}
        </a>
      </div>
    </section>
  );
}

// =========================================================================
// 2. BÀN TAY LÍNH — 3 producer portraits
// =========================================================================
export function ProducerPortraitsSection({ products }: { products: ProductDetail[] }) {
  // Pick first 3 products with producer info (photo not required — fall back to initial avatar)
  const featured = products.filter((p) => p.producerName).slice(0, 3);
  if (featured.length === 0) return null;

  return (
    <section style={{ background: cream, padding: '96px 32px', borderBottom: '1px solid var(--line)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(30px, 3.5vw, 42px)', lineHeight: 1.2, fontWeight: 800,
            color: 'var(--ink-1)', margin: 0,
          }}>
            Những bàn tay lính làm ra sản phẩm
          </h2>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 20, lineHeight: 1.5,
            color: 'var(--ink-2)', marginTop: 16, maxWidth: 680, marginLeft: 'auto', marginRight: 'auto',
          }}>
            Mỗi sản phẩm là kết tinh từ một con người — một người lính sau chiến tranh trở về với đồng ruộng.
          </p>
        </div>

        <div className="ccb-portrait-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 48,
        }}>
          {featured.map((p) => <ProducerPortrait key={p.slug} product={p} />)}
        </div>
      </div>
    </section>
  );
}

function ProducerPortrait({ product }: { product: ProductDetail }) {
  const { producerName, producerHometown, producerUnit, producerPhotoUrl, name } = product;
  return (
    <div style={{ textAlign: 'center' }}>
      {/* Portrait — 200px, circular */}
      <div style={{
        position: 'relative',
        width: 200, height: 200, margin: '0 auto',
        borderRadius: '50%', overflow: 'hidden',
        background: `radial-gradient(circle at 30% 30%, ${olive} 0%, ${oliveDark} 70%, #2F3E1B 100%)`,
        border: `4px solid ${oliveDark}`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
      }}>
        {producerPhotoUrl ? (
          <Image src={producerPhotoUrl} alt={producerName ?? ''} fill sizes="200px" className="object-cover" unoptimized />
        ) : (
          <DignifiedPortraitFallback />
        )}
      </div>
      <div style={{
        marginTop: 24,
        fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, lineHeight: 1.2,
        color: 'var(--ink-1)',
      }}>
        {producerName ?? 'Cựu Chiến Binh'}
      </div>
      {producerUnit && (
        <div style={{
          marginTop: 6,
          fontFamily: 'var(--font-body)', fontSize: 16, color: deepRed, fontWeight: 600,
        }}>
          {producerUnit}{producerHometown ? ` · ${producerHometown}` : ''}
        </div>
      )}
      <div style={{
        marginTop: 12,
        fontFamily: 'var(--font-body)', fontSize: 18, color: 'var(--ink-2)',
        lineHeight: 1.4,
      }}>
        {name}
      </div>
    </div>
  );
}

function DignifiedPortraitFallback() {
  // Stylised CCB monogram + 5-pointed star (military insignia feel) — no letter
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 8,
    }}>
      {/* 5-pointed star */}
      <svg width="48" height="48" viewBox="0 0 24 24" fill="#F4D35E" aria-hidden>
        <path d="M12 2.5l2.39 7.36h7.74l-6.26 4.55 2.39 7.36L12 17.22l-6.26 4.55 2.39-7.36L1.87 9.86h7.74L12 2.5z" />
      </svg>
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 800,
        fontSize: 28, letterSpacing: '0.18em',
        color: '#FFF8E7',
      }}>CCB</div>
      <div style={{
        fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600,
        letterSpacing: '0.15em', textTransform: 'uppercase',
        color: 'rgba(255,248,231,0.75)',
      }}>Cựu Chiến Binh</div>
    </div>
  );
}

// =========================================================================
// 3. SẢN PHẨM CHỌN LỌC — large horizontal cards (reusable: interleave with fund)
// =========================================================================
export function SeniorProductGrid({
  products, eyebrow, title, subtitle, sectionId, bg = '#FFFFFF',
}: {
  products: ProductDetail[];
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  sectionId?: string;
  bg?: string;
}) {
  if (products.length === 0) return null;
  return (
    <section id={sectionId ?? 'san-pham'} style={{ background: bg, padding: '96px 32px', borderBottom: '1px solid var(--line)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          {eyebrow && (
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: deepRed, marginBottom: 12,
            }}>
              {eyebrow}
            </div>
          )}
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(30px, 3.5vw, 42px)', lineHeight: 1.2, fontWeight: 800,
            color: 'var(--ink-1)', margin: 0,
          }}>
            {title ?? 'Sản phẩm chọn lọc'}
          </h2>
          {subtitle && (
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: 20, lineHeight: 1.5,
              color: 'var(--ink-2)', marginTop: 16, maxWidth: 720, marginLeft: 'auto', marginRight: 'auto',
            }}>
              {subtitle}
            </p>
          )}
        </div>

        <div className="ccb-senior-product-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 32,
        }}>
          {products.map((p) => <BigProductCard key={p.slug} product={p} />)}
        </div>
      </div>
    </section>
  );
}

function BigProductCard({ product }: { product: ProductDetail }) {
  const {
    slug, name, art, tone, price, was, imageUrl,
    producerName, producerHometown, producerUnit, producerContribution, producerPhotoUrl,
  } = product;
  const href = slug ? `/product/${slug}` : '#';
  const contribution = producerContribution ?? Math.max(1000, Math.round(price * 0.01));
  const initial = (producerName ?? 'CCB').split(' ').pop()?.[0]?.toUpperCase() ?? 'C';

  return (
    <Link href={href} className="ccb-big-product-card" style={{
      display: 'grid', gridTemplateColumns: '180px 1fr', gap: 24,
      background: '#FFFFFF', border: '2px solid var(--line)',
      borderRadius: 12, padding: 24,
      color: 'inherit', textDecoration: 'none',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
    }}>
      {/* Product image */}
      <div style={{
        position: 'relative', width: 180, height: 180,
        borderRadius: 8, overflow: 'hidden', background: 'var(--paper-1)',
        border: '1px solid var(--line)',
      }}>
        {imageUrl ? (
          <Image src={imageUrl} alt={name} fill sizes="180px" className="object-cover" unoptimized />
        ) : (
          <ProductArt label={art} tone={tone} />
        )}
      </div>

      {/* Content right */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, lineHeight: 1.25,
          color: 'var(--ink-1)',
        }}>
          {name}
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30,
            color: deepRed, fontVariantNumeric: 'tabular-nums',
          }}>
            {formatVnd(price)}
          </span>
          {was && (
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: 18,
              color: 'var(--ink-4)', textDecoration: 'line-through',
            }}>{formatVnd(was)}</span>
          )}
        </div>

        {producerName && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--ccb-olive-tint)', borderRadius: 8, padding: '10px 14px',
          }}>
            {/* Mini portrait */}
            <div style={{
              position: 'relative', width: 44, height: 44, flex: 'none',
              borderRadius: '50%', overflow: 'hidden',
              background: olive, color: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20,
            }}>
              {producerPhotoUrl ? (
                <Image src={producerPhotoUrl} alt={producerName} fill sizes="44px" className="object-cover" unoptimized />
              ) : initial}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 700,
                color: oliveDark, lineHeight: 1.3,
              }}>
                Từ CCB {producerHometown ? producerHometown.split(',')[0] : 'Việt Nam'}
              </div>
              {producerUnit && (
                <div style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 2 }}>
                  {producerName} · {producerUnit}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 16, lineHeight: 1.45,
          color: 'var(--ink-2)',
          background: 'var(--ccb-red-tint)', padding: '10px 14px', borderRadius: 8,
          borderLeft: `4px solid ${deepRed}`,
        }}>
          Mua sản phẩm này — góp <strong style={{ color: deepRed }}>{formatVnd(contribution)}</strong> vào quỹ Vì đồng đội
        </div>

        <span className="ccb-cta-primary" style={{
          marginTop: 'auto',
          alignSelf: 'flex-start',
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: olive, color: '#FFFFFF',
          fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 18,
          padding: '14px 28px', borderRadius: 8, minHeight: 52,
          boxShadow: '0 4px 12px rgba(85, 107, 47, 0.25)',
          transition: 'background 0.15s ease, transform 0.15s ease',
        }}>
          <ShoppingCart size={20} />
          Đặt mua — Ủng hộ
        </span>
      </div>
    </Link>
  );
}

// =========================================================================
// 4. QUỸ NGHĨA TÌNH — minh bạch to như biển
// =========================================================================
export function FundHeadlineSection({ entries }: { entries?: FundEntryData[] }) {
  if (!entries || entries.length === 0) return null;

  // Compute current month aggregates from newest entry's month
  const newestDate = new Date(entries[0].occurredAt);
  const curMonth = newestDate.getMonth();
  const curYear = newestDate.getFullYear();
  const monthLabel = `Tháng ${String(curMonth + 1).padStart(2, '0')}/${curYear}`;
  const inMonth = (e: FundEntryData) => {
    const d = new Date(e.occurredAt);
    return d.getMonth() === curMonth && d.getFullYear() === curYear;
  };
  const monthIn = entries.filter((e) => inMonth(e) && e.type === 'in').reduce((s, e) => s + e.amount, 0);
  const monthOuts = entries.filter((e) => inMonth(e) && e.type === 'out');
  const monthOutTotal = monthOuts.reduce((s, e) => s + e.amount, 0);
  const remaining = Math.max(0, monthIn - monthOutTotal);

  // Count beneficiaries (distinct fund-out entries this month)
  const beneficiaries = monthOuts.length;

  return (
    <section id="quy-nghia-tinh" style={{
      background: 'linear-gradient(180deg, #F0F4F0 0%, #E8EFE5 100%)',
      padding: '120px 32px', borderTop: `4px solid ${deepRed}`, borderBottom: '1px solid var(--line)',
    }}>
      <div style={{ maxWidth: 980, margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: deepRed, marginBottom: 16,
        }}>
          ★ Quỹ Vì đồng đội · Minh bạch tuyệt đối ★
        </div>

        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 22, lineHeight: 1.5,
          color: 'var(--ink-2)', marginTop: 0, marginBottom: 32,
          fontStyle: 'italic',
        }}>
          Mỗi đơn hàng tại CCB Mart trích <strong>1%</strong> cho quỹ.<br />
          Tháng này đồng bào đã chung tay được:
        </p>

        {/* HEADLINE NUMBER — to như biển */}
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 900,
          fontSize: 'clamp(64px, 11vw, 140px)', lineHeight: 0.95,
          color: deepRed, fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.03em',
          textShadow: '0 2px 4px rgba(139,0,0,0.08)',
        }}>
          {fmtFull(monthIn)} <span style={{ fontSize: '0.55em', fontWeight: 800 }}>đ</span>
        </div>
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 22, lineHeight: 1.5,
          color: 'var(--ink-2)', marginTop: 20,
        }}>
          Tổng quỹ hỗ trợ Cựu Chiến Binh khó khăn — <strong>{monthLabel}</strong>
        </div>
        {beneficiaries > 0 && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            marginTop: 20, padding: '10px 20px',
            background: '#FFFFFF', border: `2px solid ${oliveDark}`, borderRadius: 999,
            fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 700,
            color: oliveDark,
          }}>
            ✓ Đã hỗ trợ {beneficiaries} hoàn cảnh CCB trong tháng
          </div>
        )}

        {/* 3-line breakdown */}
        <div style={{
          marginTop: 56, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16,
          textAlign: 'left',
        }}>
          {monthOuts.slice(0, 2).map((e) => (
            <FundLine key={e.id} icon="HandHeart" label="Đã trao" body={e.description} amount={e.amount} variant="out" />
          ))}
          {monthOutTotal === 0 && (
            <FundLine label="Đã trao" body="Chưa có khoản chi trong tháng" amount={0} variant="out" />
          )}
          <FundLine
            label={`Còn lại cho Tháng ${String(curMonth + 2).padStart(2, '0')}/${curYear}`}
            body="Sẽ ưu tiên hỗ trợ CCB neo đơn"
            amount={remaining}
            variant="balance"
          />
        </div>

        <p style={{
          marginTop: 40, fontFamily: 'var(--font-body)', fontSize: 16, lineHeight: 1.5,
          color: 'var(--ink-3)', fontStyle: 'italic',
        }}>
          Sao kê chi tiết được công khai mỗi tháng. Mọi khoản chi đều có biên lai và xác nhận của Hội Cựu Chiến Binh địa phương.
        </p>
      </div>
    </section>
  );
}

function FundLine({ label, body, amount, variant }: {
  icon?: string; label: string; body: string; amount: number; variant: 'out' | 'balance';
}) {
  const fg = variant === 'out' ? deepRed : 'var(--ccb-gold-dark)';
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 10, padding: '20px 22px',
      borderLeft: `4px solid ${fg}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      <div style={{
        fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700,
        letterSpacing: '0.04em', textTransform: 'uppercase',
        color: 'var(--ink-3)', marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, lineHeight: 1.1,
        color: fg, fontVariantNumeric: 'tabular-nums',
      }}>
        {fmtFull(amount)} đ
      </div>
      <div style={{
        marginTop: 10, fontFamily: 'var(--font-body)', fontSize: 16, lineHeight: 1.4,
        color: 'var(--ink-2)',
      }}>
        {body}
      </div>
    </div>
  );
}

const fmtFull = (n: number) => n.toLocaleString('vi-VN');

// =========================================================================
// 5. HOẠT ĐỘNG GẦN ĐÂY — image gallery
// =========================================================================
export function JourneyGallerySection({ photos }: { photos?: CommunityPhotoData[] }) {
  if (!photos || photos.length === 0) return null;
  const list = photos.slice(0, 3);
  return (
    <section id="hoat-dong" style={{ background: cream, padding: '96px 32px', borderBottom: '1px solid var(--line)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(30px, 3.5vw, 42px)', lineHeight: 1.2, fontWeight: 800,
            color: 'var(--ink-1)', margin: 0,
          }}>
            Hoạt động gần đây
          </h2>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 20, lineHeight: 1.5,
            color: 'var(--ink-2)', marginTop: 16,
          }}>
            Ảnh kể chuyện — Việc nghĩa được làm thật, không chỉ là lời nói.
          </p>
        </div>

        <div className="ccb-journey-large-grid" style={{
          display: 'grid',
          gridTemplateColumns: list.length === 1 ? '1fr' : list.length === 2 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
          gap: 32,
        }}>
          {list.map((p) => (
            <figure key={p.id} style={{
              margin: 0, background: '#FFFFFF', borderRadius: 12, overflow: 'hidden',
              border: '1px solid var(--line)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              <div style={{ position: 'relative', aspectRatio: '4 / 3', background: 'var(--ccb-olive-tint)' }}>
                {p.imageUrl ? (
                  <Image src={p.imageUrl} alt={p.caption} fill sizes="(max-width: 880px) 100vw, 33vw" className="object-cover" unoptimized />
                ) : (
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: olive, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700,
                    textAlign: 'center', padding: 24,
                  }}>
                    Ảnh hoạt động
                  </div>
                )}
              </div>
              <figcaption style={{ padding: '20px 22px' }}>
                <div style={{
                  fontFamily: 'var(--font-body)', fontSize: 18, lineHeight: 1.5,
                  color: 'var(--ink-1)', fontWeight: 600,
                }}>
                  {p.caption}
                </div>
                {(p.impactValue || p.impactLabel) && (
                  <div style={{
                    marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)',
                    display: 'flex', alignItems: 'baseline', gap: 8,
                  }}>
                    {p.impactValue && (
                      <span style={{
                        fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: deepRed,
                      }}>{p.impactValue}</span>
                    )}
                    {p.impactLabel && (
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--ink-3)' }}>
                        {p.impactLabel}
                      </span>
                    )}
                  </div>
                )}
              </figcaption>
            </figure>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <Link href="/about" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 700,
            color: olive, padding: '14px 28px', borderRadius: 8,
            border: `2px solid ${olive}`, background: '#FFFFFF',
            minHeight: 52, transition: 'background 0.15s ease, color 0.15s ease',
          }} className="ccb-cta-secondary">
            Xem tất cả hoạt động <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    </section>
  );
}

// =========================================================================
// 6. SENIOR FOOTER — big hotline + commitments (CMS-driven with fallback)
// =========================================================================

export type FooterData = {
  hotline?: string;
  hotlineNote?: string;
  addressLine1?: string;
  addressLine2?: string;
  addressHours?: string;
  commitments?: { icon: string; label: string }[];
  copyright?: string;
  verifiedBadge?: string;
  isActive?: boolean;
};

const FOOTER_ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  RefreshCcw, Truck, HandHeart, BadgeCheck, Phone,
};

export function SeniorFooter({ data }: { data?: FooterData } = {}) {
  if (data && data.isActive === false) return null;
  const hotline = data?.hotline ?? '1900 6868';
  const hotlineNote = data?.hotlineNote ?? 'Đường dây ưu tiên dành cho Cựu Chiến Binh — 7:00 đến 21:00 mỗi ngày.';
  const addr1 = data?.addressLine1 ?? 'Số 19 đường Lê Đức Thọ';
  const addr2 = data?.addressLine2 ?? 'Mỹ Đình 2, Nam Từ Liêm, Hà Nội';
  const addrHours = data?.addressHours ?? 'Mở cửa 8:00 — 20:00';
  const copyright = data?.copyright ?? '© 2026 CCB Mart — Hệ thống bán lẻ của cộng đồng Cựu Chiến Binh Việt Nam';
  const verifiedBadge = data?.verifiedBadge ?? 'Hội CCB Việt Nam xác nhận';
  const commitments = data?.commitments && data.commitments.length > 0
    ? data.commitments
    : [
        { icon: 'RefreshCcw', label: 'Đổi trả vì nghĩa tình' },
        { icon: 'Truck', label: 'Giao 24h tại các thành phố lớn' },
        { icon: 'HandHeart', label: '1% mỗi đơn cho đồng đội' },
      ];

  // Strip non-digits for tel: link
  const telHref = `tel:${hotline.replace(/[^\d+]/g, '')}`;

  return (
    <footer style={{ background: 'var(--ccb-olive-dark)', color: '#F2EBD9', padding: '80px 32px 48px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="ccb-senior-footer-grid" style={{
          display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 48, alignItems: 'flex-start',
        }}>
          {/* Hotline */}
          <div>
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              color: 'var(--ccb-gold)', marginBottom: 12,
            }}>
              Hỗ trợ trực tiếp
            </div>
            <a href={telHref} style={{
              display: 'inline-flex', alignItems: 'center', gap: 12,
              fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800,
              color: '#FFFFFF', textDecoration: 'none',
            }}>
              <Phone size={28} /> {hotline}
            </a>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: 18, lineHeight: 1.55,
              marginTop: 16, maxWidth: 360, color: '#E8E0CC',
            }}>
              {hotlineNote}
            </p>
          </div>

          {/* Address */}
          <div>
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              color: 'var(--ccb-gold)', marginBottom: 12,
            }}>
              Showroom & Kho
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 18, lineHeight: 1.6, color: '#FFFFFF' }}>
              {addr1}<br />
              {addr2}<br />
              <span style={{ color: '#E8E0CC' }}>{addrHours}</span>
            </div>
          </div>

          {/* Commitments */}
          <div>
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              color: 'var(--ccb-gold)', marginBottom: 12,
            }}>
              Cam kết của chúng tôi
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 16 }}>
              {commitments.map((c, i) => {
                const IconCmp = FOOTER_ICON_MAP[c.icon] ?? HandHeart;
                return (
                  <li key={`${c.label}-${i}`} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    fontFamily: 'var(--font-body)', fontSize: 18, lineHeight: 1.4, color: '#FFFFFF',
                  }}>
                    <span style={{ color: 'var(--ccb-gold)', flex: 'none' }}><IconCmp size={28} /></span>
                    {c.label}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Useful links strip */}
        <nav style={{
          marginTop: 56, paddingTop: 32, borderTop: '1px solid rgba(242,235,217,0.2)',
          display: 'flex', flexWrap: 'wrap', gap: '14px 28px',
          fontFamily: 'var(--font-body)', fontSize: 16, lineHeight: 1.4,
        }}>
          {[
            ['/about', 'Về chúng tôi'],
            ['/stores', 'Cửa hàng'],
            ['/faq', 'Câu hỏi thường gặp'],
            ['/shipping-policy', 'Giao hàng'],
            ['/return-policy', 'Đổi trả'],
            ['/payment-methods', 'Thanh toán'],
            ['/order-tracking', 'Tra cứu đơn'],
            ['/careers', 'Tuyển dụng'],
            ['/terms', 'Điều khoản'],
            ['/privacy', 'Bảo mật'],
          ].map(([href, label]) => (
            <Link key={href} href={href} style={{ color: '#E8E0CC', textDecoration: 'none' }}>{label}</Link>
          ))}
        </nav>

        <div style={{
          marginTop: 32, paddingTop: 20, borderTop: '1px solid rgba(242,235,217,0.15)',
          display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
          fontFamily: 'var(--font-body)', fontSize: 15, color: '#C8BFA8',
        }}>
          <span>{copyright}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <BadgeCheck size={16} /> {verifiedBadge}
          </span>
        </div>
      </div>
    </footer>
  );
}
