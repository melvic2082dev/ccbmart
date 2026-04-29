'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { LandingShell } from './LandingShell';
import { ProductCard } from './ProductGrid';
import type { Category, ProductDetail } from './categories';

type PriceBand = 'all' | 'lt50' | 'mid' | 'gt200';
type SortKey = 'sold' | 'price_asc' | 'price_desc';
type RegionFilter = 'bac' | 'trung' | 'nam' | 'tay_nguyen' | 'none';

const REGION_OPTIONS: { value: RegionFilter; label: string }[] = [
  { value: 'bac',        label: 'Miền Bắc' },
  { value: 'trung',      label: 'Miền Trung' },
  { value: 'tay_nguyen', label: 'Tây Nguyên' },
  { value: 'nam',        label: 'Miền Nam' },
  { value: 'none',       label: 'Không thuộc vùng miền nào' },
];

const PAGE_SIZE = 12;

export function CategoryPage({ category, products }: { category: Category; products: ProductDetail[] }) {
  const [selectedRegions, setSelectedRegions] = useState<RegionFilter[]>([]); // empty = all
  const [priceBand, setPriceBand] = useState<PriceBand>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>('sold');
  const [page, setPage] = useState(1);

  // Compute counts per region group inside this category
  const regionCounts = useMemo(() => {
    const counts: Record<RegionFilter, number> = { bac: 0, trung: 0, nam: 0, tay_nguyen: 0, none: 0 };
    for (const p of products) {
      const key: RegionFilter = (p.regionGroup ?? 'none') as RegionFilter;
      if (key in counts) counts[key]++;
    }
    return counts;
  }, [products]);

  // Apply filters
  const filtered = useMemo(() => {
    const matchesRegion = (p: ProductDetail) => {
      if (selectedRegions.length === 0) return true;
      const key: RegionFilter = (p.regionGroup ?? 'none') as RegionFilter;
      return selectedRegions.includes(key);
    };
    const matchesPrice = (p: ProductDetail) => {
      if (priceBand === 'all') return true;
      if (priceBand === 'lt50') return p.price < 50000;
      if (priceBand === 'mid') return p.price >= 50000 && p.price <= 200000;
      return p.price > 200000;
    };
    const matchesVerified = (p: ProductDetail) => !verifiedOnly || p.verified;

    const list = products.filter((p) => matchesRegion(p) && matchesPrice(p) && matchesVerified(p));

    const soldNum = (s: string) => {
      const m = s.match(/([\d.,]+)\s*([kK])?/);
      if (!m) return 0;
      const n = parseFloat(m[1].replace(/[.,]/g, ''));
      return m[2] ? n * 1000 : n;
    };
    if (sort === 'price_asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') list.sort((a, b) => b.price - a.price);
    else list.sort((a, b) => soldNum(b.sold) - soldNum(a.sold));

    return list;
  }, [products, selectedRegions, priceBand, verifiedOnly, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageProducts = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const toggleRegion = (key: RegionFilter) => {
    setSelectedRegions((prev) => prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key]);
    setPage(1);
  };

  return (
    <LandingShell>
      <main style={{ maxWidth: 1600, margin: '0 auto', padding: '32px 24px 72px' }}>
        <Crumbs items={[{ label: 'Trang chủ', href: '/' }, { label: category.name }]} />

        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 32, marginTop: 24 }} className="ccb-2col">
          <aside>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, margin: '0 0 12px' }}>Lọc sản phẩm</h3>
            <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 8, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Vùng miền</div>
              {REGION_OPTIONS.map(({ value, label }) => {
                const count = regionCounts[value];
                const disabled = count === 0 && !selectedRegions.includes(value);
                return (
                  <label
                    key={value}
                    style={{
                      display: 'block', fontSize: 13, padding: '4px 0',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      color: disabled ? 'var(--ink-4)' : 'var(--ink-2)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRegions.includes(value)}
                      disabled={disabled}
                      onChange={() => toggleRegion(value)}
                    />{' '}
                    {label} <span style={{ color: 'var(--ink-4)' }}>({count})</span>
                  </label>
                );
              })}
              <div style={{ height: 1, background: 'var(--line)', margin: '12px 0' }} />
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Giá</div>
              {([
                ['all', 'Tất cả'],
                ['lt50', 'Dưới 50.000 ₫'],
                ['mid', '50.000 – 200.000 ₫'],
                ['gt200', 'Trên 200.000 ₫'],
              ] as [PriceBand, string][]).map(([key, label]) => (
                <label key={key} style={{ display: 'block', fontSize: 13, padding: '4px 0', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="price"
                    checked={priceBand === key}
                    onChange={() => { setPriceBand(key); setPage(1); }}
                  />{' '}
                  {label}
                </label>
              ))}
              <div style={{ height: 1, background: 'var(--line)', margin: '12px 0' }} />
              <label style={{ display: 'flex', gap: 8, fontSize: 13, padding: '4px 0', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => { setVerifiedOnly(e.target.checked); setPage(1); }}
                />
                <span style={{ color: 'var(--ccb-olive-dark)', fontWeight: 600 }}>★ CCB xác nhận</span>
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
                Tìm thấy <b style={{ color: 'var(--ink-1)' }}>{filtered.length}</b> sản phẩm
                {filtered.length > PAGE_SIZE && <> · trang {safePage}/{totalPages}</>}
              </div>
              <select
                value={sort}
                onChange={(e) => { setSort(e.target.value as SortKey); setPage(1); }}
                style={{
                  fontFamily: 'var(--font-body)', fontSize: 13, padding: '8px 12px',
                  border: '1px solid var(--line-strong)', borderRadius: 4, background: '#fff',
                }}
              >
                <option value="sold">Sắp xếp: Bán chạy nhất</option>
                <option value="price_asc">Giá thấp → cao</option>
                <option value="price_desc">Giá cao → thấp</option>
              </select>
            </div>

            {pageProducts.length === 0 ? (
              <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 8, padding: 32, textAlign: 'center', color: 'var(--ink-3)' }}>
                {products.length === 0 ? 'Chưa có sản phẩm trong danh mục này.' : 'Không có sản phẩm khớp bộ lọc.'}
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16,
              }}>
                {pageProducts.map((p) => <ProductCard key={p.slug} product={p} />)}
              </div>
            )}

            {totalPages > 1 && (
              <nav style={{ marginTop: 32, display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                {pageNumbers(safePage, totalPages).map((p, i) => (
                  p === '...' ? (
                    <span key={`gap-${i}`} style={{ padding: '8px 6px', color: 'var(--ink-3)' }}>…</span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p as number)}
                      style={{
                        padding: '8px 14px', border: '1px solid var(--line)', borderRadius: 4,
                        background: p === safePage ? 'var(--ccb-red)' : '#fff',
                        color: p === safePage ? '#FFF8E7' : 'var(--ink-2)',
                        fontWeight: 600, fontSize: 13, cursor: 'pointer',
                      }}
                    >{p}</button>
                  )
                ))}
              </nav>
            )}
          </div>
        </div>
      </main>
    </LandingShell>
  );
}

function pageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | '...')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) out.push('...');
  for (let i = start; i <= end; i++) out.push(i);
  if (end < total - 1) out.push('...');
  out.push(total);
  return out;
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
