import { notFound } from 'next/navigation';
import { ProductPage } from '@/components/landing/ProductPage';
import { getCategory, getProductBySlug, getProductsByCategory, PRODUCTS } from '@/components/landing/categories';

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();
  const category = getCategory(product.category);
  if (!category) notFound();
  const related = getProductsByCategory(product.category)
    .filter((p) => p.slug !== product.slug)
    .slice(0, 4);
  return <ProductPage product={product} category={category} related={related} />;
}
