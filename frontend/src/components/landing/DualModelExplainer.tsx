'use client';

/**
 * "Mô hình kép" — explains in 3 seconds that CCB Mart does TWO things:
 *  1. Trực tiếp bán (olive) — đặc sản cao cấp, có kho, ship 24h
 *  2. Kết nối (teal/zalo) — nhu yếu phẩm, đồng đội tự bán, không qua trung gian
 *
 * Renders right under the Hero. Two side-by-side cards on desktop,
 * stacked on mobile. Each card has its own colour identity so the
 * distinction is visible in 1 glance.
 */

import Link from 'next/link';
import { ShoppingCart, BadgeCheck, Truck, HandHeart, Phone, Link2, DollarSign, ShieldCheck, ArrowRight } from 'lucide-react';

const OLIVE = '#556B2F';
const OLIVE_DARK = '#3F4F23';
const OLIVE_TINT = '#EBEEDF';

const TEAL_BG = '#E8F4F8';
const ZALO = '#0068FF';
const ZALO_DARK = '#0050C8';
const TEAL_BORDER = '#9FC9D4';

const DEEP_RED = '#8B0000';

export function DualModelExplainer() {
  return (
    <section
      id="mo-hinh-kep"
      style={{
        background: 'var(--paper-1)',
        padding: '80px 32px',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Section head */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-block',
            fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700,
            letterSpacing: '0.10em', textTransform: 'uppercase', color: DEEP_RED,
            marginBottom: 12,
          }}>
            ★ Mô hình kép · Vừa bán · Vừa kết nối ★
          </div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: 'clamp(26px, 3.2vw, 36px)', lineHeight: 1.25,
            margin: 0, color: 'var(--ink-1)',
            maxWidth: 920, marginLeft: 'auto', marginRight: 'auto',
          }}>
            CCB Mart vận hành theo <span style={{ color: DEEP_RED }}>mô hình kép</span>:<br />
            vừa TRỰC TIẾP bán — vừa KẾT NỐI giúp đồng đội
          </h2>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 18, lineHeight: 1.55,
            color: 'var(--ink-2)', margin: '14px auto 0', maxWidth: 720,
          }}>
            Hãy chọn đúng kênh phù hợp với nhu cầu của bạn. Hai mô hình — cùng một mục tiêu: nâng đỡ những người đã từng cầm súng.
          </p>
        </div>

        {/* 2 cards side by side */}
        <div className="ccb-dual-grid" style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24,
          alignItems: 'stretch',
        }}>
          {/* LEFT — Trực tiếp bán */}
          <article style={{
            background: '#FFFFFF',
            border: `2px solid ${OLIVE}`,
            borderTop: `6px solid ${OLIVE}`,
            borderRadius: 14,
            padding: '32px 28px',
            display: 'flex', flexDirection: 'column', gap: 16,
            boxShadow: '0 4px 16px rgba(85,107,47,0.10)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 12, flex: 'none',
                background: OLIVE_TINT, color: OLIVE_DARK,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ShoppingCart size={32} strokeWidth={2} />
              </div>
              <div>
                <div style={{
                  fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase', color: OLIVE_DARK,
                }}>
                  🟢 Tiền tuyến
                </div>
                <h3 style={{
                  fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24,
                  margin: '4px 0 0', color: 'var(--ink-1)', lineHeight: 1.2,
                }}>
                  CCB Mart TRỰC TIẾP BÁN
                </h3>
              </div>
            </div>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: 16, lineHeight: 1.5,
              color: 'var(--ink-2)', margin: 0, fontStyle: 'italic',
            }}>
              Đặc sản cao cấp — có kho sẵn — chúng tôi vận hành toàn bộ chuỗi.
            </p>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
              <Bullet icon={<BadgeCheck size={20} color={OLIVE_DARK} />}>
                Chúng tôi <strong>nhập hàng &amp; kiểm tra</strong> tại nguồn — đồng đội E29 trực tiếp khảo sát
              </Bullet>
              <Bullet icon={<Truck size={20} color={OLIVE_DARK} />}>
                <strong>Giao 24h</strong> nội thành Hà Nội · TP. HCM · Đà Nẵng
              </Bullet>
              <Bullet icon={<ShieldCheck size={20} color={OLIVE_DARK} />}>
                Bảo hành, đổi trả <strong>vì nghĩa tình</strong> trong 7 ngày
              </Bullet>
              <Bullet icon={<HandHeart size={20} color={OLIVE_DARK} />}>
                <strong>1% doanh thu</strong> mỗi đơn vào quỹ Vì đồng đội
              </Bullet>
            </ul>

            <Link
              href="#san-pham"
              style={{
                marginTop: 'auto', alignSelf: 'flex-start',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: OLIVE, color: '#FFFFFF',
                padding: '14px 24px', borderRadius: 8, minHeight: 52,
                fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 16,
                boxShadow: '0 4px 12px rgba(85,107,47,0.30)',
                transition: 'background 0.15s ease, transform 0.15s ease',
              }}
              className="ccb-dual-cta-olive"
            >
              <ShoppingCart size={18} />
              Xem đặc sản CCB bán trực tiếp <ArrowRight size={18} />
            </Link>
          </article>

          {/* RIGHT — Kết nối */}
          <article style={{
            background: TEAL_BG,
            border: `2px solid ${TEAL_BORDER}`,
            borderTop: `6px solid ${ZALO}`,
            borderRadius: 14,
            padding: '32px 28px',
            display: 'flex', flexDirection: 'column', gap: 16,
            boxShadow: '0 4px 16px rgba(0,104,255,0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 12, flex: 'none',
                background: '#FFFFFF', color: ZALO_DARK,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${TEAL_BORDER}`,
              }}>
                <Phone size={32} strokeWidth={2} />
              </div>
              <div>
                <div style={{
                  fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase', color: ZALO_DARK,
                }}>
                  🟡 Hậu phương
                </div>
                <h3 style={{
                  fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24,
                  margin: '4px 0 0', color: 'var(--ink-1)', lineHeight: 1.2,
                }}>
                  CCB Mart KẾT NỐI — HỖ TRỢ
                </h3>
              </div>
            </div>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: 16, lineHeight: 1.5,
              color: 'var(--ink-2)', margin: 0, fontStyle: 'italic',
            }}>
              Nhu yếu phẩm — đồng đội tự bán — chúng tôi chỉ đứng giữa giới thiệu.
            </p>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
              <Bullet icon={<Link2 size={20} color={ZALO_DARK} />}>
                CCB Mart <strong>KHÔNG nhập hàng</strong> — chỉ xác thực uy tín
              </Bullet>
              <Bullet icon={<Phone size={20} color={ZALO_DARK} />}>
                Bạn <strong>liên hệ trực tiếp</strong> với CCB qua điện thoại / Zalo
              </Bullet>
              <Bullet icon={<DollarSign size={20} color={ZALO_DARK} />}>
                <strong>Giá tận gốc</strong> — không trung gian, không phí dịch vụ
              </Bullet>
              <Bullet icon={<BadgeCheck size={20} color={ZALO_DARK} />}>
                Mỗi CCB đều có <strong>đồng đội cùng đơn vị bảo chứng</strong> uy tín
              </Bullet>
            </ul>

            <Link
              href="/connect"
              style={{
                marginTop: 'auto', alignSelf: 'flex-start',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: ZALO, color: '#FFFFFF',
                padding: '14px 24px', borderRadius: 8, minHeight: 52,
                fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 16,
                boxShadow: '0 4px 12px rgba(0,104,255,0.30)',
                transition: 'background 0.15s ease, transform 0.15s ease',
              }}
              className="ccb-dual-cta-zalo"
            >
              <Phone size={18} />
              Xem nhu yếu phẩm cần kết nối <ArrowRight size={18} />
            </Link>
          </article>
        </div>

        {/* Footer disclaimer strip */}
        <div style={{
          marginTop: 28,
          background: '#FFFFFF',
          border: '1px dashed var(--line-strong)',
          borderRadius: 999,
          padding: '12px 22px',
          textAlign: 'center',
          fontFamily: 'var(--font-body)', fontSize: 14,
          color: 'var(--ink-3)',
          maxWidth: 760, marginLeft: 'auto', marginRight: 'auto',
        }}>
          ⓘ <strong style={{ color: 'var(--ink-2)' }}>1% quỹ Vì đồng đội</strong> được trích từ doanh thu khối <em>Trực tiếp bán</em> · Khối <em>Kết nối</em> không thu phí, không trung gian.
        </div>
      </div>
    </section>
  );
}

function Bullet({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      fontFamily: 'var(--font-body)', fontSize: 16, lineHeight: 1.5,
      color: 'var(--ink-1)',
    }}>
      <span style={{ flex: 'none', marginTop: 1 }}>{icon}</span>
      <span>{children}</span>
    </li>
  );
}
