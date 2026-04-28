'use client';

import Link from 'next/link';
import { LandingShell } from './LandingShell';
import { ProductCard } from './ProductGrid';
import type { Category, ProductDetail } from './categories';

export function CategoryPage({ category, products }: { category: Category; products: ProductDetail[] }) {
  return (
    <LandingShell>
      <main style={{ maxWidth: 1600, margin: '0 auto', padding: '32px 24px 72px' }}>
        <Crumbs items={[{ label: 'Trang chủ', href: '/' }, { label: category.name }]} />

        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 32, marginTop: 24 }} className="ccb-2col">
          <aside>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, margin: '0 0 12px' }}>Lọc sản phẩm</h3>
            <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 8, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Vùng / Phân loại</div>
              {category.filters.regions.map((r) => (
                <label key={r.label} style={{ display: 'block', fontSize: 13, padding: '4px 0' }}>
                  <input type="checkbox" defaultChecked={r.checked} /> {r.label} ({r.count})
                </label>
              ))}
              <div style={{ height: 1, background: 'var(--line)', margin: '12px 0' }} />
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Giá</div>
              <label style={{ display: 'block', fontSize: 13, padding: '4px 0' }}><input type="radio" name="p" /> Dưới 50.000 ₫</label>
              <label style={{ display: 'block', fontSize: 13, padding: '4px 0' }}><input type="radio" name="p" defaultChecked /> 50.000 – 200.000 ₫</label>
              <label style={{ display: 'block', fontSize: 13, padding: '4px 0' }}><input type="radio" name="p" /> Trên 200.000 ₫</label>
              <div style={{ height: 1, background: 'var(--line)', margin: '12px 0' }} />
              <label style={{ display: 'flex', gap: 8, fontSize: 13, padding: '4px 0', alignItems: 'center' }}>
                <input type="checkbox" defaultChecked /> <span style={{ color: 'var(--ccb-olive-dark)', fontWeight: 600 }}>★ CCB xác nhận</span>
              </label>
            </div>
          </aside>

          <div>
            <div style={{
              fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12,
              letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ccb-red)',
            }}>Danh mục</div>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 40,
              margin: '6px 0 8px', lineHeight: 1.1,
            }}>{category.name}</h1>
            <p style={{ fontSize: 15, color: 'var(--ink-2)', maxWidth: 720, lineHeight: 1.6, margin: 0 }}>
              {category.description}
            </p>

            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              margin: '24px 0 16px', paddingBottom: 12, borderBottom: '1px solid var(--line)', gap: 12, flexWrap: 'wrap',
            }}>
              <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                Tìm thấy <b style={{ color: 'var(--ink-1)' }}>{category.productCount}</b> sản phẩm · hiển thị {products.length}
              </div>
              <select style={{
                fontFamily: 'var(--font-body)', fontSize: 13, padding: '8px 12px',
                border: '1px solid var(--line-strong)', borderRadius: 4, background: '#fff',
              }}>
                <option>Sắp xếp: Bán chạy nhất</option>
                <option>Giá thấp → cao</option>
                <option>Giá cao → thấp</option>
              </select>
            </div>

            {products.length === 0 ? (
              <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 8, padding: 32, textAlign: 'center', color: 'var(--ink-3)' }}>
                Chưa có sản phẩm trong danh mục này.
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16,
              }}>
                {products.map((p) => <ProductCard key={p.slug} product={p} />)}
              </div>
            )}

            <nav style={{ marginTop: 32, display: 'flex', gap: 6, justifyContent: 'center' }}>
              {[1, 2, 3, '...', Math.ceil(category.productCount / 12)].map((p, i) => (
                <span key={i} style={{
                  padding: '8px 14px', border: '1px solid var(--line)', borderRadius: 4,
                  background: p === 1 ? 'var(--ccb-red)' : '#fff',
                  color: p === 1 ? '#FFF8E7' : 'var(--ink-2)',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}>{p}</span>
              ))}
            </nav>
          </div>
        </div>
      </main>
    </LandingShell>
  );
}

function Crumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <div style={{ fontSize: 13, color: 'var(--ink-3)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
