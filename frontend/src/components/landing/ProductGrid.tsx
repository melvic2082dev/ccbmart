import { ShoppingCart } from 'lucide-react';
import { Badge, formatVnd, ProductArt, SectionHead, Star } from './primitives';

type Tone = 'paper' | 'red' | 'olive' | 'gold';
type BadgeVariant = 'red' | 'olive' | 'gold' | 'soft' | 'oliveSoft';

export type Product = {
  id: string;
  name: string;
  art: string;
  tone: Tone;
  price: number;
  was?: number;
  rating: number;
  sold: string;
  region?: string;
  badges?: { label: string; variant: BadgeVariant }[];
  verified?: boolean;
};

export function ProductGrid({
  id,
  title,
  eyebrow,
  products,
}: {
  id?: string;
  title: string;
  eyebrow?: string;
  products: Product[];
}) {
  return (
    <section id={id} style={{ background: 'var(--paper-0)', padding: '48px 0', borderBottom: '1px solid var(--line)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <SectionHead eyebrow={eyebrow} title={title} link="Xem thêm" />
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16, marginTop: 24,
        }}>
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </section>
  );
}

function ProductCard({ product }: { product: Product }) {
  const { name, art, tone, price, was, rating, sold, region, badges = [], verified } = product;
  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid var(--line)',
      borderRadius: 8, overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ position: 'relative', height: 170 }}>
        <ProductArt label={art} tone={tone} />
        <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {badges.map((b, i) => <Badge key={i} variant={b.variant}>{b.label}</Badge>)}
        </div>
        {verified && (
          <div style={{
            position: 'absolute', bottom: 8, right: 8,
            background: 'rgba(251, 247, 238, 0.95)', border: '1px solid var(--ccb-olive)',
            borderRadius: 999, padding: '2px 8px',
            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 10,
            color: 'var(--ccb-olive-dark)',
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            <Star size={10} /> CCB
          </div>
        )}
      </div>
      <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{
          fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14,
          color: 'var(--ink-1)', lineHeight: 1.3, minHeight: 36,
        }}>{name}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11, color: 'var(--ink-3)', marginTop: 6, flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--ccb-gold-dark)' }}>★ {rating}</span>
          <span>·</span>
          <span>Đã bán {sold}</span>
          {region && <><span>·</span><span>{region}</span></>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginTop: 10 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'var(--ccb-red)' }}>
            {formatVnd(price)}
          </span>
          {was && <span style={{ fontSize: 12, color: 'var(--ink-4)', textDecoration: 'line-through' }}>{formatVnd(was)}</span>}
        </div>
        <button type="button" style={{
          marginTop: 12,
          background: 'transparent', color: 'var(--ccb-red)',
          border: '1px solid var(--ccb-red)',
          borderRadius: 4, padding: '8px 12px',
          fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13,
          cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <ShoppingCart size={14} />
          Thêm vào giỏ
        </button>
      </div>
    </div>
  );
}
