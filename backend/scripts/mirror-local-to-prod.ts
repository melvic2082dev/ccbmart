// Mirror local /admin/landing-cms data → production (Railway).
//
// Usage:  npx tsx scripts/mirror-local-to-prod.ts
//
// Purpose: production DB starts empty after deploy (Hero/Promo/WhyUs auto-init,
// but lists are empty). This script logs in to both backends with super_admin
// credentials, then for each list endpoint: wipes prod + re-creates from local.
// Singletons (hero/promo/whyUs) are PUT-mirrored.
//
// Idempotent — running twice produces the same prod state.

const LOCAL = 'http://localhost:8080/api';
const PROD = 'https://api.ccb.x-wise.io/api';
const EMAIL = 'admin@ccbmart.vn';
const PASSWORD = 'admin123';

async function login(base: string): Promise<string> {
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login ${base} failed: HTTP ${res.status}`);
  const j = await res.json() as { token: string };
  return j.token;
}

async function jget(base: string, token: string, path: string) {
  const res = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`GET ${base}${path} → ${res.status}`);
  return res.json();
}

async function jsend(base: string, token: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${method} ${base}${path} → ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

// Strip server-managed fields and inactive items pre-mirror.
function clean<T extends Record<string, unknown>>(row: T): Omit<T, 'id' | 'createdAt' | 'updatedAt'> {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = row;
  return rest as Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
}

async function wipeList(base: string, token: string, listPath: string, items: { id: number }[]) {
  for (const it of items) {
    await jsend(base, token, 'DELETE', `${listPath}/${it.id}`);
  }
}

async function main() {
  console.log('Login local…');
  const localToken = await login(LOCAL);
  console.log('Login prod…');
  const prodToken = await login(PROD);

  // ---- Singletons: PUT prod with local data ----
  console.log('\n=== Singletons ===');
  const localBundle = await jget(LOCAL, localToken, '/admin/landing-cms') as {
    hero: Record<string, unknown>;
    promo: Record<string, unknown>;
    whyUs: Record<string, unknown>;
    header: Record<string, unknown>;
    footer: Record<string, unknown>;
  };
  await jsend(PROD, prodToken, 'PUT', '/admin/landing-cms/hero', clean(localBundle.hero));
  console.log('  ✓ Hero');
  await jsend(PROD, prodToken, 'PUT', '/admin/landing-cms/promo', clean(localBundle.promo));
  console.log('  ✓ Promo');
  await jsend(PROD, prodToken, 'PUT', '/admin/landing-cms/why-us', clean(localBundle.whyUs));
  console.log('  ✓ WhyUs');
  await jsend(PROD, prodToken, 'PUT', '/admin/landing-cms/header', clean(localBundle.header));
  console.log('  ✓ Header');
  await jsend(PROD, prodToken, 'PUT', '/admin/landing-cms/footer', clean(localBundle.footer));
  console.log('  ✓ Footer');

  // ---- Bundle-sourced lists (Trust items + Featured picks live in /admin/landing-cms bundle) ----
  const localTrustItems = (localBundle as unknown as { trustItems: { id: number }[] }).trustItems ?? [];
  const localFeatured = (localBundle as unknown as { featured: { id: number }[] }).featured ?? [];

  const prodBundle = await jget(PROD, prodToken, '/admin/landing-cms') as {
    trustItems: { id: number }[];
    featured: { id: number }[];
  };

  console.log(`\n=== Trust items ===`);
  console.log(`  local: ${localTrustItems.length}, prod: ${prodBundle.trustItems.length}`);
  if (prodBundle.trustItems.length > 0) {
    await wipeList(PROD, prodToken, '/admin/landing-cms/trust-items', prodBundle.trustItems);
  }
  for (const it of localTrustItems) {
    await jsend(PROD, prodToken, 'POST', '/admin/landing-cms/trust-items', clean(it as Record<string, unknown>));
  }
  console.log(`  ✓ Mirrored ${localTrustItems.length}`);

  console.log(`\n=== Featured picks ===`);
  console.log(`  local: ${localFeatured.length}, prod: ${prodBundle.featured.length}`);
  if (prodBundle.featured.length > 0) {
    await wipeList(PROD, prodToken, '/admin/landing-cms/featured-products', prodBundle.featured);
  }
  for (const it of localFeatured) {
    await jsend(PROD, prodToken, 'POST', '/admin/landing-cms/featured-products', clean(it as Record<string, unknown>));
  }
  console.log(`  ✓ Mirrored ${localFeatured.length}`);

  // ---- Standalone-endpoint lists (each has its own GET /admin/landing-cms/<path>) ----
  type ListSpec = { name: string; path: string };
  const lists: ListSpec[] = [
    { name: 'Categories',       path: '/admin/landing-cms/categories' },
    { name: 'Community photos', path: '/admin/landing-cms/community-photos' },
    { name: 'Fund entries',     path: '/admin/landing-cms/fund-entries' },
    { name: 'Testimonials',     path: '/admin/landing-cms/testimonials' },
  ];

  for (const list of lists) {
    console.log(`\n=== ${list.name} ===`);
    const localItems = await jget(LOCAL, localToken, list.path) as { id: number }[];
    const prodItems = await jget(PROD, prodToken, list.path) as { id: number }[];
    console.log(`  local: ${localItems.length}, prod: ${prodItems.length}`);
    if (prodItems.length > 0) {
      await wipeList(PROD, prodToken, list.path, prodItems);
    }
    let created = 0;
    for (const it of localItems) {
      await jsend(PROD, prodToken, 'POST', list.path, clean(it as Record<string, unknown>));
      created++;
    }
    console.log(`  ✓ Mirrored ${created}`);
  }

  // ---- Products: paginated GET local ----
  console.log('\n=== Catalog products ===');
  let allLocalProducts: { id: number }[] = [];
  let page = 1;
  while (true) {
    const res = await jget(LOCAL, localToken, `/admin/landing-cms/products?page=${page}&limit=100`) as { items: { id: number }[]; total: number };
    allLocalProducts = allLocalProducts.concat(res.items);
    if (allLocalProducts.length >= res.total) break;
    page++;
  }
  console.log(`  local: ${allLocalProducts.length} products`);

  let prodPage = 1;
  let allProdProducts: { id: number }[] = [];
  while (true) {
    const res = await jget(PROD, prodToken, `/admin/landing-cms/products?page=${prodPage}&limit=100`) as { items: { id: number }[]; total: number };
    allProdProducts = allProdProducts.concat(res.items);
    if (allProdProducts.length >= res.total) break;
    prodPage++;
  }
  if (allProdProducts.length > 0) {
    console.log(`  wiping prod: ${allProdProducts.length} products…`);
    await wipeList(PROD, prodToken, '/admin/landing-cms/products', allProdProducts);
  }

  let prodCreated = 0;
  for (const p of allLocalProducts) {
    try {
      await jsend(PROD, prodToken, 'POST', '/admin/landing-cms/products', clean(p as Record<string, unknown>));
      prodCreated++;
    } catch (e) {
      console.error(`  ✗ Failed to create product:`, e instanceof Error ? e.message : e);
    }
  }
  console.log(`  ✓ Created ${prodCreated} products on prod`);

  console.log('\n=== Done ===');
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
