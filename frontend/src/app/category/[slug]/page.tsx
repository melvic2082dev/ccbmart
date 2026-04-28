import { notFound } from 'next/navigation';
import { CategoryPage } from '@/components/landing/CategoryPage';
import { CATEGORIES, getCategory, getProductsByCategory } from '@/components/landing/categories';

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();
  const products = getProductsByCategory(slug);
  return <CategoryPage category={category} products={products} />;
}
