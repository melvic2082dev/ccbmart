'use client';

import { useEffect, useState } from 'react';
import { LandingShell } from './LandingShell';
import { Hero, type HeroData } from './Hero';
import { ProductGrid, type Product } from './ProductGrid';
import {
  CategoryStrip, CommunityVoices, PromoBanner, RegionStrip, TrustBar,
  type PromoData,
} from './Sections';
import type { TrustItemData } from './Sections';
import { CATEGORIES, PRODUCTS, mergeWithDb, mergeCategoriesWithDb, type DbCatalogProduct, type DbCategory } from './categories';

const defaultFeaturedSlugs = [
  'gao-st25-soc-trang',
  'nuoc-mam-phu-quoc',
  'tra-shan-tuyet-ha-giang',
  'ca-phe-buon-ma-thuot',
  'mat-ong-rung-u-minh',
  'tom-kho-bac-lieu',
  'che-tan-cuong-thai-nguyen',
  'me-xung-hue',
];

const defaultDealSlugs = [
  'combo-bua-com',
  'qua-tet-ccb-hop-4-mon',
  'combo-gia-vi-ba-mien',
  'am-chen-bat-trang',
];

type CmsContent = {
  hero: HeroData;
  promo: PromoData;
  trustItems: TrustItemData[];
  featured: { id: number; section: 'featured' | 'deals'; productSlug: string; displayOrder: number; isActive: boolean }[];
  products: DbCatalogProduct[];
  categories: DbCategory[];
};

function pickFrom(catalog: Product[], slugs: string[]): Product[] {
  return slugs
    .map((s) => catalog.find((p) => p.slug === s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
}

export function LandingPage() {
  const [content, setContent] = useState<CmsContent | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/landing/content')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled && data) setContent(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Catalog = hardcoded PRODUCTS overlaid with DB rows (active only).
  const catalog = content?.products ? mergeWithDb(content.products) : PRODUCTS;
  const allCategories = content?.categories && content.categories.length > 0
    ? mergeCategoriesWithDb(content.categories)
    : CATEGORIES;

  const cmsFeaturedSlugs = content?.featured
    ?.filter((it) => it.section === 'featured' && it.isActive)
    .map((it) => it.productSlug) ?? [];
  const cmsDealSlugs = content?.featured
    ?.filter((it) => it.section === 'deals' && it.isActive)
    .map((it) => it.productSlug) ?? [];

  const featured = pickFrom(catalog, cmsFeaturedSlugs.length > 0 ? cmsFeaturedSlugs : defaultFeaturedSlugs);
  const deals = pickFrom(catalog, cmsDealSlugs.length > 0 ? cmsDealSlugs : defaultDealSlugs);

  return (
    <LandingShell>
      {(!content || content.hero.isActive !== false) && <Hero data={content?.hero} />}
      <TrustBar items={content?.trustItems} />
      <CategoryStrip categories={allCategories} />
      <ProductGrid id="featured" eyebrow="Hàng tuyển chọn" title="Sản phẩm nổi bật" products={featured} link="Xem tất cả" linkHref="/category/dac-san-vung-mien" />
      {(!content || content.promo.isActive !== false) && <PromoBanner data={content?.promo} />}
      <ProductGrid eyebrow="Giảm giá tuần này" title="Ưu đãi đặc biệt" products={deals} link="Xem khuyến mãi" linkHref="/category/hang-khuyen-mai" />
      <RegionStrip />
      <CommunityVoices />
    </LandingShell>
  );
}
