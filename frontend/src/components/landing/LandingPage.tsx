'use client';

import { useEffect, useState } from 'react';
import { LandingShell } from './LandingShell';
import { Hero, type HeroData } from './Hero';
import { ProductGrid, type Product } from './ProductGrid';
import { CategoryStrip, PromoBanner, type PromoData } from './Sections';
import type { TrustItemData } from './Sections';
import {
  WhyUsSection, type WhyUsData,
  CoreValuesSection,
  CommunityJourneySection, type CommunityPhotoData,
  TransparencyFundSection, type FundEntryData,
  CCBTestimonialsSection, type TestimonialData,
} from './CommunitySections';
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
  whyUs: WhyUsData;
  trustItems: TrustItemData[];
  featured: { id: number; section: 'featured' | 'deals'; productSlug: string; displayOrder: number; isActive: boolean }[];
  products: DbCatalogProduct[];
  categories: DbCategory[];
  communityPhotos: CommunityPhotoData[];
  fundEntries: FundEntryData[];
  testimonials: TestimonialData[];
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

  // Catalog & categories overlay (DB → hardcoded fallback)
  const catalog = content?.products ? mergeWithDb(content.products) : PRODUCTS;
  const allCategories = content?.categories && content.categories.length > 0
    ? mergeCategoriesWithDb(content.categories)
    : CATEGORIES;

  // Featured / deals selection
  const cmsFeaturedSlugs = content?.featured?.filter((it) => it.section === 'featured' && it.isActive).map((it) => it.productSlug) ?? [];
  const cmsDealSlugs = content?.featured?.filter((it) => it.section === 'deals' && it.isActive).map((it) => it.productSlug) ?? [];
  const featured = pickFrom(catalog, cmsFeaturedSlugs.length > 0 ? cmsFeaturedSlugs : defaultFeaturedSlugs);
  const deals = pickFrom(catalog, cmsDealSlugs.length > 0 ? cmsDealSlugs : defaultDealSlugs);

  return (
    <LandingShell>
      {/* 1. Hero */}
      {(!content || content.hero.isActive !== false) && <Hero data={content?.hero} />}

      {/* 2. Tại sao chúng tôi làm dự án này */}
      <WhyUsSection data={content?.whyUs} />

      {/* 3. Giá trị cốt lõi (replaces TrustBar) */}
      <CoreValuesSection items={content?.trustItems} />

      {/* 4. Sản phẩm tiêu biểu — kèm tên + quê CCB sản xuất */}
      <ProductGrid id="featured" eyebrow="Sản phẩm từ tâm huyết người lính" title="Hàng tuyển chọn — Mỗi món một câu chuyện" products={featured} link="Xem tất cả sản phẩm" linkHref="/category/dac-san-vung-mien" />

      {/* 5. Hành trình kết nối — hoạt động cộng đồng */}
      <CommunityJourneySection photos={content?.communityPhotos} />

      {/* 6. Promo banner (interlude — chương trình ngắn hạn nếu có) */}
      {(!content || content.promo.isActive !== false) && <PromoBanner data={content?.promo} />}

      {/* 7. Deals */}
      <ProductGrid eyebrow="Ưu đãi tuần này" title="Hàng giảm giá — vẫn đảm bảo nghĩa tình" products={deals} link="Xem khuyến mãi" linkHref="/category/hang-khuyen-mai" />

      {/* 8. Categories navigation strip */}
      <CategoryStrip categories={allCategories} />

      {/* 9. Bảng minh bạch quỹ Vì đồng đội */}
      <TransparencyFundSection entries={content?.fundEntries} />

      {/* 10. Tiếng nói chiến hữu */}
      <CCBTestimonialsSection items={content?.testimonials} />
    </LandingShell>
  );
}
