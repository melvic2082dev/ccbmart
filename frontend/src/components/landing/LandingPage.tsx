'use client';

import { useEffect, useState } from 'react';
import './landing.css';
import { Header, type HeaderData } from './Header';
import { type HeroData } from './Hero';
import { type Product } from './ProductGrid';
import { type PromoData, type TrustItemData } from './Sections';
import {
  type CommunityPhotoData, type FundEntryData, type TestimonialData,
} from './CommunitySections';
import {
  SeniorHero,
  ProducerPortraitsSection,
  SeniorProductGrid,
  FundHeadlineSection,
  JourneyGallerySection,
  SeniorFooter,
  type FooterData,
} from './SeniorSections';
import {
  CATEGORIES, PRODUCTS,
  mergeWithDb, mergeCategoriesWithDb,
  type DbCatalogProduct, type DbCategory,
} from './categories';

const defaultFeaturedSlugs = [
  'gao-st25-soc-trang',
  'nuoc-mam-phu-quoc',
  'tra-shan-tuyet-ha-giang',
  'ca-phe-buon-ma-thuot',
  'mat-ong-rung-u-minh',
  'tom-kho-bac-lieu',
];

type CmsContent = {
  hero: HeroData;
  promo: PromoData;
  whyUs: { title: string; body: string; imageUrl: string | null; isActive?: boolean };
  header: HeaderData;
  footer: FooterData;
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

  // Catalog & categories overlay
  const catalog = content?.products ? mergeWithDb(content.products) : PRODUCTS;
  const allCategories = content?.categories && content.categories.length > 0
    ? mergeCategoriesWithDb(content.categories)
    : CATEGORIES;

  // Featured products selection
  const cmsFeaturedSlugs = content?.featured
    ?.filter((it) => it.section === 'featured' && it.isActive)
    .map((it) => it.productSlug) ?? [];
  const featured = pickFrom(catalog, cmsFeaturedSlugs.length > 0 ? cmsFeaturedSlugs : defaultFeaturedSlugs);

  // Producer portraits — pick products with producerName, prefer featured first
  const producerProducts = (() => {
    const fromFeatured = featured.filter((p) => p.producerName);
    if (fromFeatured.length >= 3) return fromFeatured;
    // fall back: any product in catalog with producer info
    const seen = new Set(fromFeatured.map((p) => p.slug));
    const extra = catalog.filter((p) => p.producerName && !seen.has(p.slug ?? ''));
    return [...fromFeatured, ...extra].slice(0, 3);
  })();

  return (
    <div className="ccb-landing">
      <Header cartCount={0} categories={allCategories} header={content?.header} />

      {/* 1. Hero — full-width portrait + overlay + big CTA */}
      <SeniorHero data={content?.hero} />

      {/* 2. Bàn tay lính — 3 chân dung */}
      <ProducerPortraitsSection products={producerProducts as never} />

      {/* 3a. Sản phẩm chọn lọc — đợt 1 (3 sản phẩm) */}
      <SeniorProductGrid
        products={featured.slice(0, 3) as never}
        eyebrow="Hàng tuyển chọn"
        title="Tâm huyết từ những người lính già"
        subtitle="Mỗi sản phẩm là một câu chuyện. Mỗi đơn hàng là một nghĩa cử."
        sectionId="san-pham"
      />

      {/* 4. Quỹ nghĩa tình — chen giữa hai đợt sản phẩm */}
      <FundHeadlineSection entries={content?.fundEntries} />

      {/* 3b. Sản phẩm chọn lọc — đợt 2 (3 sản phẩm còn lại) */}
      <SeniorProductGrid
        products={featured.slice(3, 6) as never}
        eyebrow="Đặc sản tiếp theo"
        title="Đồng đội từ khắp ba miền"
        subtitle="Tiếp tục câu chuyện — sản vật từ những vùng đất nghĩa tình."
        sectionId="san-pham-tiep"
        bg="var(--paper-1)"
      />

      {/* 5. Hoạt động gần đây */}
      <JourneyGallerySection photos={content?.communityPhotos} />

      {/* 6. Footer */}
      <SeniorFooter data={content?.footer} />
    </div>
  );
}
