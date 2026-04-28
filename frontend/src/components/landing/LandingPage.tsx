'use client';

import { LandingShell } from './LandingShell';
import { Hero } from './Hero';
import { ProductGrid, type Product } from './ProductGrid';
import { CategoryStrip, CommunityVoices, PromoBanner, RegionStrip, TrustBar } from './Sections';
import { PRODUCTS } from './categories';

const featuredSlugs = [
  'gao-st25-soc-trang',
  'nuoc-mam-phu-quoc',
  'tra-shan-tuyet-ha-giang',
  'ca-phe-buon-ma-thuot',
  'mat-ong-rung-u-minh',
  'tom-kho-bac-lieu',
  'che-tan-cuong-thai-nguyen',
  'me-xung-hue',
];

const dealSlugs = [
  'combo-bua-com',
  'qua-tet-ccb-hop-4-mon',
  'combo-gia-vi-ba-mien',
  'am-chen-bat-trang',
];

const pick = (slugs: string[]): Product[] =>
  slugs
    .map((s) => PRODUCTS.find((p) => p.slug === s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

export function LandingPage() {
  const featured = pick(featuredSlugs);
  const deals = pick(dealSlugs);
  return (
    <LandingShell>
      <Hero />
      <TrustBar />
      <CategoryStrip />
      <ProductGrid id="featured" eyebrow="Hàng tuyển chọn" title="Sản phẩm nổi bật" products={featured} link="Xem tất cả" linkHref="/category/dac-san-vung-mien" />
      <PromoBanner />
      <ProductGrid eyebrow="Giảm giá tuần này" title="Ưu đãi đặc biệt" products={deals} link="Xem khuyến mãi" linkHref="/category/hang-khuyen-mai" />
      <RegionStrip />
      <CommunityVoices />
    </LandingShell>
  );
}
