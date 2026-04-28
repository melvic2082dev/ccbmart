'use client';

import Link from 'next/link';
import { LandingShell } from '@/components/landing/LandingShell';

export default function AboutPage() {
  return (
    <LandingShell>
      <main style={{ maxWidth: 1600, margin: '0 auto', padding: '32px 24px 72px' }}>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', display: 'flex', gap: 8 }}>
          <Link href="/" style={{ color: 'var(--ccb-red)' }}>Trang chủ</Link>
          <span style={{ color: 'var(--ink-4)' }}>/</span>
          <span>Về CCB Mart</span>
        </div>

        <section style={{
          display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 48, alignItems: 'center',
          marginTop: 24, marginBottom: 64,
        }} className="ccb-about-hero">
          <div>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ccb-red)' }}>
              Câu chuyện thương hiệu
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(36px, 4vw, 52px)', lineHeight: 1.15, margin: '8px 0 20px' }}>
              Hàng Việt chất lượng,<br/>
              <span style={{ color: 'var(--ccb-red)' }}>do Cựu Chiến Binh</span> cung cấp.
            </h1>
            <p style={{ fontSize: 17, lineHeight: 1.7, maxWidth: 540, color: 'var(--ink-2)' }}>
              CCB Mart là hệ thống bán lẻ được Hội Cựu Chiến Binh Việt Nam bảo trợ, kết nối người tiêu dùng
              với nông sản và đặc sản vùng miền do chính hội viên CCB canh tác trên khắp cả nước.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.7, maxWidth: 540, color: 'var(--ink-2)', marginTop: 12 }}>
              Chúng tôi tin rằng những người lính năm xưa — với tinh thần kỷ luật, trung thực và trách nhiệm —
              chính là những người đáng tin nhất để đảm bảo chất lượng bữa ăn cho từng gia đình Việt.
            </p>
          </div>
          <div style={{
            aspectRatio: '4/5', background: 'linear-gradient(135deg, var(--ccb-olive) 0%, var(--ccb-olive-dark) 100%)',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#FBF7EE', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26,
            textAlign: 'center', padding: 40, lineHeight: 1.4,
          }}>
            &ldquo;Bàn tay từng cầm súng,<br/>
            nay cầm cuốc, cầm cày —<br/>
            vì bữa ăn người Việt.&rdquo;
          </div>
        </section>

        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, margin: '0 0 16px' }}>Ba giá trị cốt lõi</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginBottom: 48 }}>
          <Value title="Nguồn gốc minh bạch" color="var(--ccb-red)"      body="Mỗi sản phẩm có mã QR truy xuất về đến hộ canh tác, hợp tác xã CCB địa phương." />
          <Value title="Chất lượng cam kết"   color="var(--ccb-olive)"    body="Đảm bảo VietGAP hoặc cao hơn. Đổi trả 7 ngày nếu không hài lòng." />
          <Value title="1% vì đồng đội"       color="var(--ccb-gold-dark)" body="Mỗi đơn hàng trích 1% vào quỹ hỗ trợ gia đình CCB có hoàn cảnh khó khăn." />
        </div>

        <section style={{
          background: 'var(--ccb-olive)', color: '#FBF7EE',
          borderRadius: 12, padding: 48, marginBottom: 48,
        }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, margin: '0 0 24px', color: '#FBF7EE' }}>
            CCB Mart trong con số
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 24 }}>
            <Stat n="127"    label="Cửa hàng toàn quốc" />
            <Stat n="2.340+" label="Hội viên CCB cung ứng" />
            <Stat n="58"     label="Tỉnh thành phục vụ" />
            <Stat n="12 tỷ"  label="Quỹ Vì đồng đội 2025" />
          </div>
        </section>

        <section style={{ background: 'var(--ccb-red-tint)', borderRadius: 12, padding: 40, textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: 'var(--ccb-red-dark)', margin: 0 }}>
            Bạn là hội viên CCB và muốn cung ứng sản phẩm?
          </h2>
          <p style={{ maxWidth: 580, margin: '12px auto 20px', fontSize: 15 }}>
            Gửi thông tin sản phẩm và cơ sở canh tác. Đội ngũ CCB Mart sẽ liên hệ khảo sát trong vòng 7 ngày.
          </p>
          <Link href="/login" style={{
            background: 'var(--ccb-red)', color: '#FFF8E7',
            fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 16,
            padding: '14px 26px', borderRadius: 4, display: 'inline-block',
          }}>Đăng ký cung ứng →</Link>
        </section>
      </main>
    </LandingShell>
  );
}

function Value({ title, color, body }: { title: string; color: string; body: string }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--line)', borderTop: `4px solid ${color}`,
      borderRadius: 8, padding: 24,
    }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color, margin: '0 0 8px' }}>{title}</h3>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}>{body}</p>
    </div>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 44, color: 'var(--ccb-gold)', lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 13, color: '#D4CFBE', marginTop: 6 }}>{label}</div>
    </div>
  );
}
