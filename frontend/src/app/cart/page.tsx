'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { LandingShell } from '@/components/landing/LandingShell';
import { ProductArt, formatVnd } from '@/components/landing/primitives';

type CartItem = { slug: string; name: string; art: string; tone: 'paper' | 'red' | 'olive' | 'gold'; unit: number; qty: number };

const INITIAL_ITEMS: CartItem[] = [
  { slug: 'gao-st25-soc-trang', name: 'Gạo ST25 Sóc Trăng, 5kg', art: 'Gạo\nST25', tone: 'gold', unit: 187000, qty: 2 },
  { slug: 'nuoc-mam-phu-quoc', name: 'Nước mắm Phú Quốc 40 độ đạm', art: 'Nước mắm\nPhú Quốc', tone: 'red', unit: 125000, qty: 1 },
  { slug: 'tra-shan-tuyet-ha-giang', name: 'Trà Shan Tuyết Hà Giang', art: 'Trà\nShan Tuyết', tone: 'olive', unit: 240000, qty: 1 },
];

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>(INITIAL_ITEMS);
  const subtotal = cartItems.reduce((s, it) => s + it.unit * it.qty, 0);
  const memberDiscount = Math.round(subtotal * 0.05);
  const total = subtotal - memberDiscount;

  const setQty = (slug: string, qty: number) => {
    if (qty <= 0) {
      setCartItems((prev) => prev.filter((it) => it.slug !== slug));
    } else {
      setCartItems((prev) => prev.map((it) => it.slug === slug ? { ...it, qty } : it));
    }
  };

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const onPlaceOrder = (e?: FormEvent) => {
    e?.preventDefault();
    if (submitting || submitted) return;
    setSubmitting(true);
    setTimeout(() => {
      const id = `CCB-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000000 + 1000000)}`;
      setOrderId(id);
      setSubmitted(true);
      setSubmitting(false);
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { /* ignore */ }
    }, 900);
  };

  return (
    <LandingShell>
      <main style={{ maxWidth: 1600, margin: '0 auto', padding: '32px 24px 72px' }}>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', display: 'flex', gap: 8 }}>
          <Link href="/" style={{ color: 'var(--ccb-red)' }}>Trang chủ</Link>
          <span style={{ color: 'var(--ink-4)' }}>/</span>
          <span>Giỏ hàng &amp; Thanh toán</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 36, margin: '12px 0 24px' }}>Giỏ hàng của bạn</h1>

        {submitted && orderId && (
          <div style={{
            background: 'var(--ccb-olive-tint)', border: '2px solid var(--ccb-olive)', borderLeft: '6px solid var(--ccb-olive-dark)',
            borderRadius: 8, padding: '20px 24px', marginBottom: 24,
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--ccb-olive-dark)', marginBottom: 6 }}>
              ✓ Đã đặt hàng thành công!
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, lineHeight: 1.6, color: 'var(--ink-2)' }}>
              Mã đơn của bạn: <strong style={{ color: 'var(--ccb-red)', fontFamily: 'var(--font-display)' }}>{orderId}</strong>.
              CCB Mart sẽ gọi xác nhận trong vòng 30 phút. Tra cứu trạng thái tại{' '}
              <Link href="/order-tracking" style={{ color: 'var(--ccb-red)', fontWeight: 700 }}>Tra cứu đơn hàng</Link>.
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32 }} className="ccb-cart-grid">
          <div>
            <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
              {cartItems.map((it, i) => (
                <div key={it.slug} style={{
                  display: 'grid', gridTemplateColumns: '80px 1fr auto auto', gap: 16,
                  alignItems: 'center', padding: 16,
                  borderBottom: i < cartItems.length - 1 ? '1px solid var(--line)' : 'none',
                }}>
                  <div style={{ width: 80, height: 80, borderRadius: 6, overflow: 'hidden' }}>
                    <ProductArt label={it.art} tone={it.tone} />
                  </div>
                  <div>
                    <Link href={`/product/${it.slug}`} style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink-1)' }}>{it.name}</Link>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>Đơn giá: {formatVnd(it.unit)}</div>
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid var(--line-strong)', borderRadius: 4 }}>
                    <button
                      type="button"
                      onClick={() => setQty(it.slug, it.qty - 1)}
                      aria-label="Giảm số lượng"
                      disabled={submitted}
                      style={{ border: 'none', background: 'transparent', padding: '6px 10px', cursor: 'pointer', fontSize: 16 }}
                    >−</button>
                    <span style={{ padding: '0 12px', fontWeight: 600, minWidth: 24, textAlign: 'center' }}>{it.qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty(it.slug, it.qty + 1)}
                      aria-label="Tăng số lượng"
                      disabled={submitted}
                      style={{ border: 'none', background: 'transparent', padding: '6px 10px', cursor: 'pointer', fontSize: 16 }}
                    >+</button>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 110 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--ccb-red)', fontSize: 16 }}>
                      {formatVnd(it.unit * it.qty)}
                    </div>
                    <button
                      type="button"
                      onClick={() => setQty(it.slug, 0)}
                      disabled={submitted}
                      style={{
                        marginTop: 4, padding: 0, background: 'transparent', border: 'none',
                        color: 'var(--ink-3)', fontSize: 12, cursor: 'pointer',
                      }}
                    >Xoá</button>
                  </div>
                </div>
              ))}
            </div>

            <Link href="/category/gao-luong-thuc" style={{ display: 'inline-block', marginTop: 16, color: 'var(--ccb-olive)', fontWeight: 600, fontSize: 14 }}>
              ← Tiếp tục mua sắm
            </Link>

            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, marginTop: 40 }}>Thông tin giao hàng</h2>
            <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 8, padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Họ và tên" defaultValue="Nguyễn Văn An" />
              <Field label="Số điện thoại" defaultValue="0912 345 678" />
              <Field label="Tỉnh / Thành" defaultValue="Hà Nội" />
              <Field label="Quận / Huyện" defaultValue="Ba Đình" />
              <Field label="Địa chỉ cụ thể" defaultValue="Số 19 Hoàng Diệu" full />
            </div>

            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, marginTop: 32 }}>Phương thức thanh toán</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Pay label="Thanh toán khi nhận hàng (COD)" sub="Miễn phí · Phổ biến nhất" defaultChecked />
              <Pay label="Chuyển khoản ngân hàng" sub="Giảm thêm 5.000 ₫" />
              <Pay label="Thẻ Hội viên CCB" sub="Giảm thêm 5% toàn hoá đơn" />
              <Pay label="Ví MoMo / VNPay" sub="Giao dịch nhanh" />
            </div>
          </div>

          <aside>
            <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 8, padding: 20, position: 'sticky', top: 20 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, margin: '0 0 12px' }}>Tóm tắt đơn hàng</h3>
              <Row label="Tạm tính" value={formatVnd(subtotal)} />
              <Row label="Phí vận chuyển" value="Miễn phí" tone="olive" />
              <Row label="Giảm giá CCB member" value={`−${formatVnd(memberDiscount)}`} tone="red" />
              <div style={{ height: 1, background: 'var(--line)', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '8px 0' }}>
                <span style={{ fontWeight: 700 }}>Tổng</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, color: 'var(--ccb-red)' }}>{formatVnd(total)}</span>
              </div>
              <button
                type="button"
                onClick={() => onPlaceOrder()}
                disabled={submitting || submitted}
                style={{
                  width: '100%', marginTop: 8, padding: '14px', borderRadius: 4,
                  background: submitted ? 'var(--ccb-olive)' : 'var(--ccb-red)',
                  color: '#FFF8E7',
                  fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 16,
                  border: 'none',
                  cursor: submitting || submitted ? 'default' : 'pointer',
                  opacity: submitting ? 0.75 : 1,
                }}
              >
                {submitted ? 'Đã đặt hàng ✓' : submitting ? 'Đang xử lý…' : 'Đặt hàng →'}
              </button>
              <div style={{ marginTop: 16, padding: 12, background: 'var(--ccb-olive-tint)', borderRadius: 6, fontSize: 12, color: 'var(--ccb-olive-dark)', lineHeight: 1.5 }}>
                <b>★ 1% vì đồng đội.</b> Mỗi đơn hàng, CCB Mart trích 1% vào quỹ hỗ trợ gia đình CCB.
              </div>
            </div>
          </aside>
        </div>
      </main>
    </LandingShell>
  );
}

function Field({ label, defaultValue, full }: { label: string; defaultValue: string; full?: boolean }) {
  return (
    <label style={{ display: 'block', gridColumn: full ? '1/-1' : undefined }}>
      <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{label}</span>
      <input defaultValue={defaultValue} style={{
        width: '100%', fontFamily: 'var(--font-body)', fontSize: 14,
        padding: '10px 12px', marginTop: 4,
        border: '1px solid var(--line-strong)', borderRadius: 4, background: 'var(--paper-0)',
      }} />
    </label>
  );
}

function Pay({ label, sub, defaultChecked }: { label: string; sub: string; defaultChecked?: boolean }) {
  return (
    <label style={{
      display: 'flex', gap: 12, alignItems: 'start', padding: 14,
      background: '#fff', border: defaultChecked ? '2px solid var(--ccb-red)' : '2px solid var(--line)',
      borderRadius: 8, cursor: 'pointer',
    }}>
      <input type="radio" name="pay" defaultChecked={defaultChecked} style={{ marginTop: 3 }} />
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{sub}</div>
      </div>
    </label>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'red' | 'olive' }) {
  const color = tone === 'red' ? 'var(--ccb-red)' : tone === 'olive' ? 'var(--ccb-olive)' : 'var(--ink-1)';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '8px 0' }}>
      <span style={{ color: 'var(--ink-3)' }}>{label}</span>
      <span style={{ color, fontWeight: tone ? 600 : 400 }}>{value}</span>
    </div>
  );
}
