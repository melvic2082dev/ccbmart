'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RefreshCcw, ShoppingCart, Truck } from 'lucide-react';
import { LandingShell } from './LandingShell';
import { ProductCard } from './ProductGrid';
import { formatVnd, ProductArt, Star } from './primitives';
import type { Category, ProductDetail } from './categories';

export function ProductPage({
  product, category, related,
}: {
  product: ProductDetail; category: Category; related: ProductDetail[];
}) {
  const [activeThumb, setActiveThumb] = useState(0);
  return (
    <LandingShell>
      <main style={{ maxWidth: 1600, margin: '0 auto', padding: '32px 24px 72px' }}>
        <Crumbs items={[
          { label: 'Trang chủ', href: '/' },
          { label: category.name, href: `/category/${category.slug}` },
          { label: product.name },
        ]} />

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 48, marginTop: 24 }} className="ccb-product-detail">
          <div>
            <div style={{
              borderRadius: 8, aspectRatio: '1', overflow: 'hidden',
              border: '1px solid var(--line)', background: '#fff',
            }}>
              <ProductArt label={product.art} tone={product.tone} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 12 }}>
              {product.thumbs.map((t, i) => (
                <button key={t} type="button" onClick={() => setActiveThumb(i)} style={{
                  aspectRatio: '1',
                  background: i === activeThumb ? '#F5E9C9' : 'var(--paper-1)',
                  border: i === activeThumb ? '2px solid var(--ccb-red)' : '2px solid var(--line)',
                  borderRadius: 6, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 600, color: 'var(--ink-3)', padding: 4,
                }}>{t}</button>
              ))}
            </div>
          </div>

          <div>
            <div style={{
              fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 16,
              letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ccb-red)', display: 'flex', gap: 12, alignItems: 'center',
            }}>
              <span>Đặc sản {product.region || category.name}</span>
              {product.verified && (
                <span style={{ color: 'var(--ccb-olive-dark)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Star size={12} color="var(--ccb-olive)" /> CCB xác nhận
                </span>
              )}
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 32, lineHeight: 1.15, margin: '8px 0 12px' }}>
              {product.name}
            </h1>
            <div style={{ display: 'flex', gap: 12, fontSize: 18, color: 'var(--ink-3)', marginBottom: 20, flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--ccb-gold-dark)', fontWeight: 600 }}>★ {product.rating}</span>
              <span>·</span>
              <span>Đã bán {product.sold}</span>
            </div>
            <div style={{
              background: 'var(--ccb-red-tint)', borderRadius: 8, padding: 20,
              display: 'flex', gap: 16, alignItems: 'baseline', marginBottom: 20, flexWrap: 'wrap',
            }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 40, color: 'var(--ccb-red)' }}>
                {formatVnd(product.price)}
              </span>
              {product.was && (
                <span style={{ textDecoration: 'line-through', color: 'var(--ink-4)', fontSize: 22 }}>
                  {formatVnd(product.was)}
                </span>
              )}
              {product.was && (
                <span style={{ background: 'var(--ccb-red)', color: '#FFF8E7', padding: '4px 10px', borderRadius: 999, fontSize: 16, fontWeight: 700 }}>
                  −{Math.round((1 - product.price / product.was) * 100)}%
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24, fontSize: 18 }}>
              <div style={{ padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 6, background: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Truck size={16} color="var(--ccb-red)" /> <b>Giao 24h</b> nội thành lớn
              </div>
              <div style={{ padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 6, background: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <RefreshCcw size={16} color="var(--ccb-olive)" /> <b>Đổi trả 7 ngày</b>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/cart" style={{
                background: 'var(--ccb-red)', color: '#FFF8E7',
                fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 22,
                padding: '14px 26px', borderRadius: 4,
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}>
                <ShoppingCart size={18} /> Thêm vào giỏ
              </Link>
              <Link href="/cart" style={{
                background: 'var(--ccb-olive)', color: '#FBF7EE',
                fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 22,
                padding: '14px 26px', borderRadius: 4,
              }}>Mua ngay</Link>
            </div>
          </div>
        </div>

        {/* Description */}
        <div style={{ marginTop: 64, maxWidth: 800 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, margin: '0 0 12px' }}>Mô tả sản phẩm</h2>
          <p style={{ fontSize: 20, lineHeight: 1.7, color: 'var(--ink-2)' }}>{product.description}</p>

          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, margin: '24px 0 12px' }}>Thông tin sản phẩm</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 19 }}>
            <tbody>
              {[
                ['Thương hiệu', product.brand],
                ['Xuất xứ', product.origin],
                ['Trọng lượng', product.weight],
                ['Chứng nhận', product.certifications],
                ['Nhà phân phối', product.distributor],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ padding: '10px 0', color: 'var(--ink-3)', width: 200, borderBottom: '1px solid var(--line)' }}>{k}</td>
                  <td style={{ padding: '10px 0', fontWeight: 500, borderBottom: '1px solid var(--line)' }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {related.length > 0 && (
          <div style={{ marginTop: 64 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, margin: '0 0 16px' }}>Sản phẩm liên quan</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              {related.map((p) => <ProductCard key={p.slug} product={p} />)}
            </div>
          </div>
        )}
      </main>
    </LandingShell>
  );
}

function Crumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <div style={{ fontSize: 18, color: 'var(--ink-3)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {items.map((it, i) => (
        <span key={i} style={{ display: 'inline-flex', gap: 8 }}>
          {i > 0 && <span style={{ color: 'var(--ink-4)' }}>/</span>}
          {it.href ? (
            <Link href={it.href} style={{ color: 'var(--ccb-red)' }}>{it.label}</Link>
          ) : (
            <span style={{ color: 'var(--ink-1)' }}>{it.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}
