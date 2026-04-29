import { notFound } from 'next/navigation';
import { ProductPage } from '@/components/landing/ProductPage';
import {
  PRODUCTS, fetchDbCatalog, fetchDbCategories, mergeCategoriesWithDb, mergeWithDb,
} from '@/components/landing/categories';

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export const revalidate = 60;

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [dbProducts, dbCategories] = await Promise.all([fetchDbCatalog(), fetchDbCategories()]);
  const catalog = mergeWithDb(dbProducts);
  const product = catalog.find((p) => p.slug === slug);
  if (!product) notFound();

  const categories = mergeCategoriesWithDb(dbCategories);
  const category = categories.find((c) => c.slug === product.category);
  if (!category) notFound();

  const related = catalog
    .filter((p) => p.category === product.category && p.slug !== product.slug)
    .slice(0, 4);

  return <ProductPage product={product} category={category} related={related} />;
}
