import Link from 'next/link';
import { Truck } from 'lucide-react';
import { Star } from './primitives';

export function Hero() {
  return (
    <section style={{
      background: 'var(--paper-0)', borderBottom: '1px solid var(--line)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '64px 24px 72px',
        display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 48, alignItems: 'center',
      }} className="ccb-hero-grid">
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Star size={16} />
            <span style={{
              fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12,
              letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ccb-red)',
            }}>Hệ thống bán lẻ · Cựu Chiến Binh Việt Nam</span>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: 'clamp(36px, 4vw, 52px)', lineHeight: 1.2,
            letterSpacing: '-0.02em', color: 'var(--ink-1)', margin: 0,
          }}>
            Hàng Việt chất lượng,<br />
            <span style={{ color: 'var(--ccb-red)' }}>do Cựu Chiến Binh</span><br />
            cung cấp.
          </h1>

          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 18, lineHeight: 1.6,
            color: 'var(--ink-2)', marginTop: 32, maxWidth: 520,
          }}>
            CCB Mart mang đặc sản và nhu yếu phẩm từ khắp mọi miền đất nước về tận nhà quý khách —
            được tuyển chọn, đóng gói và phân phối bởi mạng lưới hội viên Cựu Chiến Binh trên toàn quốc.
          </p>

          <div style={{ display: 'flex', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
            <a href="#featured" style={{
              background: 'var(--ccb-red)', color: '#FFF8E7',
              fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 16,
              padding: '14px 26px', borderRadius: 4,
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}>Mua sắm ngay</a>
            <Link href="/login" style={{
              background: 'transparent', color: 'var(--ccb-olive)',
              fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 16,
              padding: '14px 26px', borderRadius: 4,
              border: '1px solid var(--ccb-olive)',
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}>Đăng nhập / Đăng ký →</Link>
          </div>

          <div style={{
            display: 'flex', gap: 32, marginTop: 40, paddingTop: 24,
            borderTop: '1px solid var(--line)', flexWrap: 'wrap',
          }}>
            <Stat n="2.400+" label="Nhà cung cấp Cựu Chiến Binh" />
            <Stat n="63"     label="Tỉnh / thành phố có mặt" />
            <Stat n="180k+"  label="Đơn hàng đã giao" />
          </div>
        </div>

        {/* Right column visual */}
        <div style={{ position: 'relative', height: 520 }} className="ccb-hero-visual">
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(circle at 60% 40%, var(--ccb-olive-tint) 0%, transparent 65%)',
          }} />
          <div style={{
            position: 'absolute', top: 20, left: 20, right: 40, bottom: 120,
            background: 'var(--ccb-olive)', color: '#FBF7EE',
            borderRadius: 8, padding: 32,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            boxShadow: 'var(--shadow-lg)',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <Star size={20} color="var(--ccb-gold)" />
                <span style={{
                  fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>Đặc sản tháng 4</span>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 44, lineHeight: 1.05 }}>
                Gạo ST25<br />Sóc Trăng
              </div>
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.5,
                marginTop: 14, color: '#E8E4D4', maxWidth: 280,
              }}>
                Gạo thơm ngon đạt giải thế giới, thu hoạch từ vùng canh tác của các đồng chí Cựu Chiến Binh tỉnh Sóc Trăng.
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 36, color: 'var(--ccb-gold)', whiteSpace: 'nowrap' }}>187.000 ₫</span>
              <span style={{ fontSize: 14, textDecoration: 'line-through', opacity: 0.7 }}>220.000 ₫</span>
              <span style={{ marginLeft: 'auto', background: 'var(--ccb-red)', color: '#FFF8E7', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>−15%</span>
            </div>
          </div>

          {/* Floating CCB seal */}
          <div style={{
            position: 'absolute', top: 40, right: 0,
            background: 'var(--paper-0)', border: '2px solid var(--ccb-red)',
            borderRadius: '50%', width: 100, height: 100,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-md)', transform: 'rotate(-8deg)',
          }}>
            <Star size={20} />
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14,
              color: 'var(--ccb-red)', marginTop: 2, textAlign: 'center', lineHeight: 1.1,
            }}>CCB<br/>XÁC NHẬN</div>
          </div>

          {/* Bottom supporting card */}
          <div style={{
            position: 'absolute', bottom: 10, left: 60, right: 0,
            background: '#FFFFFF', border: '1px solid var(--line)',
            borderRadius: 8, padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 16,
            boxShadow: 'var(--shadow-md)',
          }}>
            <div style={{
              width: 48, height: 48, flex: 'none',
              background: 'var(--ccb-red-tint)', borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--ccb-red)',
            }}>
              <Truck size={24} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14, color: 'var(--ink-1)' }}>Giao hàng tận nhà 24 giờ</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Hà Nội · TP. Hồ Chí Minh · Đà Nẵng</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: 'var(--ccb-olive-dark)', lineHeight: 1 }}>{n}</div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--ink-3)', marginTop: 4, maxWidth: 120 }}>{label}</div>
    </div>
  );
}
