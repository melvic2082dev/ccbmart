import { notFound } from 'next/navigation';
import { CategoryPage } from '@/components/landing/CategoryPage';
import {
  CATEGORIES, fetchDbCatalog, fetchDbCategories, mergeCategoriesWithDb, mergeWithDb,
} from '@/components/landing/categories';

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export const revalidate = 60;

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [dbProducts, dbCategories] = await Promise.all([fetchDbCatalog(), fetchDbCategories()]);
  const categories = mergeCategoriesWithDb(dbCategories);
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  const catalog = mergeWithDb(dbProducts);
  const products = catalog.filter((p) => p.category === slug);

  return <CategoryPage category={category} products={products} />;
}
