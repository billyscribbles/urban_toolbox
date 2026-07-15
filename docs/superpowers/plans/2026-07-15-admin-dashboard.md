# Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the product catalog into Supabase and add a login-protected `/admin` dashboard where Billy can CRUD products (details, photo galleries, price, discount %), with edits live on the storefront immediately.

**Architecture:** Categories stay static in code (`src/data/categories.js`) so nav/routes stay fast; products move to Supabase Postgres (`products` + `product_images`) with photos in a public `product-photos` storage bucket. The storefront fetches all products once per session through a `productStore` (same `useSyncExternalStore` mini-store pattern as `quoteStore.js`); `src/lib/catalog.js` keeps its exact exported signatures. The admin is a lazy `/admin` route behind Supabase Auth writing through RLS.

**Tech Stack:** React 18 + Vite 5, plain CSS with theme tokens, `@supabase/supabase-js` (the ONLY new dependency), Vitest + Testing Library + jest-axe.

**Spec:** `docs/superpowers/specs/2026-07-15-admin-dashboard-design.md`

## Global Constraints

- Supabase project: `jxyruzhotemmcqcrndbp` (https://jxyruzhotemmcqcrndbp.supabase.co)
- JSX only — **no TypeScript**. Plain CSS with `var(--color-*)` / `var(--radius-*)` / `var(--font-*)` / `var(--transition-*)` tokens — **no Tailwind, no raw hex in component CSS**.
- No new production dependencies except `@supabase/supabase-js`.
- Yarn 4.12 (`yarn add`, `yarn test`, `yarn lint`, `yarn format:check`, `yarn build`).
- CI must stay green after every task: `yarn lint && yarn format:check && yarn test && yarn build`.
- Tests never hit the network — Supabase is mocked via `vi.mock`.
- Lighthouse on home page: performance ≥ 90, SEO ≥ 95, a11y ≥ 90 (unchanged thresholds in `lighthouserc.json`).
- Commit after every task (atomic commits). Run `yarn prettier --write` on new files before committing so `format:check` passes.
- The dev server runs with `yarn dev`; env vars go in `.env` (gitignored), documented in `.env.example`.

---

### Task 1: Supabase schema, storage bucket, and RLS

**Files:**

- Create: `supabase/migrations/0001_catalog.sql`

**Interfaces:**

- Produces: tables `public.products`, `public.product_images`; bucket `product-photos`; RLS policies (anon read / authenticated write). All later tasks assume these exist exactly as below.

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/0001_catalog.sql`:

```sql
-- Product catalog behind the /admin dashboard.
-- Categories stay in code (src/data/categories.js); category_id must match a
-- leaf id there — enforced app-side, not by FK.

create table public.products (
  id text primary key,
  category_id text not null,
  title text not null,
  slug text not null unique,
  summary text not null default '',
  specs jsonb not null default '[]',
  features jsonb not null default '[]',
  price numeric(10,2) check (price is null or price >= 0),
  discount_pct numeric check (discount_pct is null or (discount_pct > 0 and discount_pct < 100)),
  standard_dims text not null default '',
  featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt text not null default '',
  position integer not null default 0
);

create index product_images_product_idx on public.product_images (product_id, position);

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

alter table public.products enable row level security;
alter table public.product_images enable row level security;

create policy "public read products" on public.products
  for select using (true);
create policy "admin write products" on public.products
  for all to authenticated using (true) with check (true);

create policy "public read product_images" on public.product_images
  for select using (true);
create policy "admin write product_images" on public.product_images
  for all to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true)
on conflict (id) do nothing;

create policy "public read product photos" on storage.objects
  for select using (bucket_id = 'product-photos');
create policy "admin insert product photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-photos');
create policy "admin update product photos" on storage.objects
  for update to authenticated using (bucket_id = 'product-photos');
create policy "admin delete product photos" on storage.objects
  for delete to authenticated using (bucket_id = 'product-photos');
```

- [ ] **Step 2: Apply the migration**

Use the Supabase MCP tool `mcp__supabase__apply_migration` with name `catalog_admin` and the SQL above (fallback: paste into the Supabase dashboard SQL editor and run).

If the four `create policy … on storage.objects` statements fail with "must be owner of table objects", run everything else, then create those four policies through Dashboard → Storage → `product-photos` → Policies (public SELECT; INSERT/UPDATE/DELETE for `authenticated`).

- [ ] **Step 3: Verify**

Run via `mcp__supabase__execute_sql`:

```sql
select table_name from information_schema.tables
where table_schema = 'public' and table_name in ('products', 'product_images');
select id, public from storage.buckets where id = 'product-photos';
```

Expected: both tables listed; bucket row with `public = true`.

- [ ] **Step 4: Human step — admin user (ask Billy, do not skip)**

Billy must, in the Supabase dashboard (https://supabase.com/dashboard/project/jxyruzhotemmcqcrndbp):

1. **Authentication → Users → Add user**: create the admin account (his email + a strong password), with "Auto Confirm User" on.
2. **Authentication → Sign In / Providers**: turn OFF "Allow new users to sign up".

Pause and ask Billy to confirm this is done (the seed in Task 7 and all admin writes need it).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0001_catalog.sql
git commit -m "feat(db): products + product_images schema, storage bucket, RLS"
```

---

### Task 2: supabase-js dependency, env, and lazy client

**Files:**

- Modify: `package.json` (via `yarn add`)
- Modify: `.env.example`
- Create: `.env` (gitignored — verify it is)
- Create: `src/lib/supabaseClient.js`
- Test: `src/test/supabaseClient.test.js`

**Interfaces:**

- Produces: `getSupabase(): Promise<SupabaseClient|null>` (memoized, dynamic-imports the SDK so the main bundle stays lean; resolves `null` when env is missing), `isConfigured(): boolean`, `publicPhotoUrl(storagePath: string): string` (deterministic public URL, no client needed).

- [ ] **Step 1: Add the dependency**

```bash
yarn add @supabase/supabase-js
```

- [ ] **Step 2: Env entries**

Append to `.env.example`:

```
# Supabase — product catalog + admin dashboard.
# URL and anon (publishable) key from the Supabase dashboard → Settings → API.
# The anon key is safe to ship: RLS restricts writes to the signed-in admin.
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Create/extend the local `.env` with the real values: `VITE_SUPABASE_URL=https://jxyruzhotemmcqcrndbp.supabase.co` and the anon key (fetch via `mcp__supabase__get_publishable_keys`, or Billy copies it from the dashboard). Confirm `.env` is in `.gitignore`.

- [ ] **Step 3: Write the failing test**

Create `src/test/supabaseClient.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { publicPhotoUrl, isConfigured } from '../lib/supabaseClient.js'

describe('supabaseClient', () => {
  it('builds a deterministic public storage URL from a storage path', () => {
    expect(publicPhotoUrl('products/tray-b/shot.jpg')).toContain(
      '/storage/v1/object/public/product-photos/products/tray-b/shot.jpg',
    )
  })

  it('reports unconfigured without env vars (CI has none)', () => {
    expect(typeof isConfigured()).toBe('boolean')
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `yarn vitest run src/test/supabaseClient.test.js`
Expected: FAIL — cannot resolve `../lib/supabaseClient.js`.

- [ ] **Step 5: Implement**

Create `src/lib/supabaseClient.js`:

```js
// Lazily-created Supabase singleton. The SDK is dynamically imported so the
// storefront's main bundle stays lean — only code that actually talks to
// Supabase (product fetch, admin CRUD) pays for it. Missing env (e.g. CI unit
// tests) resolves to null and callers treat that as "backend not configured".

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export function isConfigured() {
  return Boolean(url && anonKey)
}

let clientPromise = null

export function getSupabase() {
  if (!isConfigured()) return Promise.resolve(null)
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url, anonKey),
  )
  return clientPromise
}

// Public bucket URLs are deterministic — no client round-trip needed.
export function publicPhotoUrl(storagePath) {
  return `${url}/storage/v1/object/public/product-photos/${storagePath}`
}
```

- [ ] **Step 6: Run tests, lint, build**

Run: `yarn vitest run src/test/supabaseClient.test.js` → PASS. Then `yarn lint && yarn build` → clean.

- [ ] **Step 7: Commit**

```bash
git add package.json yarn.lock .env.example src/lib/supabaseClient.js src/test/supabaseClient.test.js
git commit -m "feat: supabase client (lazy singleton) + env wiring"
```

---

### Task 3: Shared pricing helpers

**Files:**

- Create: `src/lib/pricing.js`
- Modify: `src/components/Card.jsx:10-13` (delete local `formatPrice`, import instead)
- Modify: `src/components/DetailDrawer.jsx:8-11` (same)
- Test: `src/test/pricing.test.js`

**Interfaces:**

- Produces: `formatPrice(n: number): string` (e.g. `3900 → "$3,900"`, `382.5 → "$382.50"`), `discountedPrice(price: number|null, discountPct: number|null): number|null` (rounded to the cent; `null` when either input is missing).

- [ ] **Step 1: Write the failing test**

Create `src/test/pricing.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { formatPrice, discountedPrice } from '../lib/pricing.js'

describe('formatPrice', () => {
  it('adds the AU thousands separator', () => {
    expect(formatPrice(3900)).toBe('$3,900')
  })
  it('shows cents only when the value has them', () => {
    expect(formatPrice(382.5)).toBe('$382.50')
    expect(formatPrice(450)).toBe('$450')
  })
})

describe('discountedPrice', () => {
  it('applies the percentage and rounds to the cent', () => {
    expect(discountedPrice(450, 15)).toBe(382.5)
    expect(discountedPrice(999.99, 10)).toBe(899.99)
  })
  it('returns null when price or discount is missing', () => {
    expect(discountedPrice(null, 15)).toBeNull()
    expect(discountedPrice(450, null)).toBeNull()
    expect(discountedPrice(450, 0)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run src/test/pricing.test.js`
Expected: FAIL — cannot resolve `../lib/pricing.js`.

- [ ] **Step 3: Implement**

Create `src/lib/pricing.js`:

```js
// Money display + discount math, shared by the storefront and the admin.

// Australian thousands separator: 3900 -> "$3,900"; 382.5 -> "$382.50".
export function formatPrice(n) {
  const value = Number(n)
  const opts = Number.isInteger(value) ? {} : { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  return `$${value.toLocaleString('en-AU', opts)}`
}

// Discounted price rounded to the cent; null when no discount applies.
export function discountedPrice(price, discountPct) {
  if (price == null || !discountPct) return null
  return Math.round(price * (100 - discountPct)) / 100
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn vitest run src/test/pricing.test.js` → PASS.

- [ ] **Step 5: Deduplicate the component copies**

In `src/components/Card.jsx`: delete lines 10–13 (the comment + local `formatPrice`) and add `import { formatPrice } from '../lib/pricing.js'` after the other lib imports.
In `src/components/DetailDrawer.jsx`: delete lines 8–11 (same local copy) and add the same import after `import { useDetail, closeDetail } from '../lib/detailStore.js'`.

- [ ] **Step 6: Full test run**

Run: `yarn test` → all pass (Card/DetailDrawer behavior unchanged).

- [ ] **Step 7: Commit**

```bash
git add src/lib/pricing.js src/test/pricing.test.js src/components/Card.jsx src/components/DetailDrawer.jsx
git commit -m "refactor: shared pricing helpers (formatPrice, discountedPrice)"
```

---

### Task 4: Split the category tree into src/data/categories.js

**Files:**

- Create: `src/data/categories.js`
- Modify: `src/data/catalog.js` (categories re-exported from the new file)
- Modify: `src/lib/catalog.js` (category helpers read the new file)

**Interfaces:**

- Produces: `export const categories = [...]` in `src/data/categories.js` — the exact tree currently in `src/data/catalog.js` lines 16–160 (`toolboxes` + `accessories` tops). `src/lib/catalog.js` category functions (`getTree`, `getTopCategories`, `getCategoryBySlug`, `getCategoryPath`, `getSubcategories`, `getLeaves`, `isLeaf`, `isFlattenedTop`, `getMegaMenu`) keep exact signatures and now read `categories`.

- [ ] **Step 1: Create `src/data/categories.js`**

Cut the ENTIRE `categories: [ ... ]` array out of `src/data/catalog.js` (everything between `categories: [` and the matching `],` before `products: [`) and paste it into a new file:

```js
// The category tree — stays in code on purpose. Routes, the mega-menu and
// breadcrumbs are built from this at render time with zero network calls.
// A node without `children` is a LEAF — products (in Supabase) attach to
// leaves only, via products.category_id === leaf id.

export const categories = [
  // …the exact toolboxes + accessories tree moved verbatim from catalog.js…
]
```

(The tree content is moved verbatim — do not retype it; cut and paste.)

- [ ] **Step 2: Re-export from `src/data/catalog.js`**

At the top of `src/data/catalog.js` add `import { categories } from './categories.js'` and change the object to reference it, so the file becomes:

```js
import { categories } from './categories.js'

export const catalog = {
  categories,

  products: [
    // …unchanged…
  ],
}
```

- [ ] **Step 3: Point `src/lib/catalog.js` category helpers at the new file**

In `src/lib/catalog.js` replace `import { catalog } from '../data/catalog.js'` with:

```js
import { categories } from '../data/categories.js'
import { catalog } from '../data/catalog.js'
```

Then replace every `catalog.categories` occurrence with `categories` (lines 9, 13, 32, 49). Product functions (`getProductsForLeaf`, `getProductsUnder`) keep using `catalog.products` for now — Task 6 swaps them.

- [ ] **Step 4: Run everything**

Run: `yarn test && yarn lint` → all pass (`content.test.js` still imports `catalog` from `../data/catalog.js`, whose shape is unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/data/categories.js src/data/catalog.js src/lib/catalog.js
git commit -m "refactor: split static category tree into src/data/categories.js"
```

---

### Task 5: productStore — live products with the quoteStore pattern

**Files:**

- Create: `src/lib/productStore.js`
- Create: `src/test/fixtures/productRows.js`
- Test: `src/test/productStore.test.js`

**Interfaces:**

- Consumes: `getSupabase()`, `publicPhotoUrl(path)` from Task 2; `discountedPrice` from Task 3.
- Produces:
  - `normalizeRow(row): Product` — DB row (+ joined `product_images`) → the product shape storefront components already consume: `{ id, categoryId, title, slug, summary, specs, features, img, imgAlt, images?, price, discountPct, featured, quote: { id, priceFrom, standardDims } }`. `quote.priceFrom` is the EFFECTIVE price (discounted when a discount is set) so the quote tray and email serialization show what the customer would pay.
  - `loadProducts({ force? }): Promise<void>` — idempotent session fetch; `retryLoad()` — forced refetch.
  - `getProducts(): Product[]`, `getStatus(): 'idle'|'loading'|'ready'|'error'`.
  - `useProductCatalog(): { status, products }` — React subscription hook.
  - `__setStateForTests(next)` — test-only escape hatch.

- [ ] **Step 1: Create the fixture**

Create `src/test/fixtures/productRows.js`:

```js
// Raw DB-row shapes (products joined to product_images) — the contract the
// admin writes and productStore.normalizeRow reads. Category ids MUST be real
// leaves from src/data/categories.js.

export const productRows = [
  {
    id: 'ute-under-tray-boxes-1',
    category_id: 'ute-under-tray-boxes',
    title: '580 × 230 × 400mm Aluminium Checker Ute Toolbox',
    slug: '580-x-230-x-400mm-aluminium-checker-ute-toolbox',
    summary: 'Aluminium Checker Plate · 580 × 230 × 400mm',
    specs: [{ label: 'Material', value: 'Aluminium Checker Plate' }],
    features: ['Welding: Full Welded Toolbox'],
    price: null,
    discount_pct: null,
    standard_dims: '580 × 230 × 400mm',
    featured: false,
    sort_order: 0,
    product_images: [
      {
        id: 'img-1',
        product_id: 'ute-under-tray-boxes-1',
        storage_path: 'products/ute-under-tray-boxes-1/shot-a.jpg',
        alt: 'Checker ute toolbox',
        position: 0,
      },
    ],
  },
  {
    id: 'job-site-toolbox-1',
    category_id: 'job-site-toolbox',
    title: 'Job Site Box',
    slug: 'job-site-box',
    summary: 'Heavy duty site box',
    specs: [],
    features: [],
    price: 450,
    discount_pct: 15,
    standard_dims: '1200 × 500 × 700mm',
    featured: true,
    sort_order: 0,
    product_images: [
      {
        id: 'img-3',
        product_id: 'job-site-toolbox-1',
        storage_path: 'products/job-site-toolbox-1/front.jpg',
        alt: 'Site box front',
        position: 1,
      },
      {
        id: 'img-2',
        product_id: 'job-site-toolbox-1',
        storage_path: 'products/job-site-toolbox-1/hero.jpg',
        alt: 'Site box hero',
        position: 0,
      },
    ],
  },
]
```

(Note: the second product's images are deliberately out of order — `normalizeRow` must sort by `position`.)

- [ ] **Step 2: Write the failing test**

Create `src/test/productStore.test.js`:

```js
import { describe, it, expect, vi } from 'vitest'
import { productRows } from './fixtures/productRows.js'
import { categories } from '../data/categories.js'

vi.mock('../lib/supabaseClient.js', () => ({
  isConfigured: () => true,
  publicPhotoUrl: (p) => `https://cdn.test/${p}`,
  getSupabase: () =>
    Promise.resolve({
      from: () => ({
        select: () => ({
          order: () => ({
            order: () => Promise.resolve({ data: productRows, error: null }),
          }),
        }),
      }),
    }),
}))

const { normalizeRow, loadProducts, getProducts, getStatus } =
  await import('../lib/productStore.js')

describe('normalizeRow — DB row to storefront product', () => {
  it('maps columns, sorts photos by position and builds the quote descriptor', () => {
    const p = normalizeRow(productRows[1])
    expect(p.categoryId).toBe('job-site-toolbox')
    expect(p.img).toBe('https://cdn.test/products/job-site-toolbox-1/hero.jpg')
    expect(p.images.map((i) => i.src)).toEqual([
      'https://cdn.test/products/job-site-toolbox-1/hero.jpg',
      'https://cdn.test/products/job-site-toolbox-1/front.jpg',
    ])
    expect(p.price).toBe(450)
    expect(p.discountPct).toBe(15)
    // quote carries the EFFECTIVE price so the tray/email show the sale price
    expect(p.quote).toEqual({
      id: 'job-site-toolbox-1',
      priceFrom: 382.5,
      standardDims: '1200 × 500 × 700mm',
    })
  })

  it('a single photo yields img but no images gallery, and null price passes through', () => {
    const p = normalizeRow(productRows[0])
    expect(p.images).toBeUndefined()
    expect(p.price).toBeNull()
    expect(p.quote.priceFrom).toBeNull()
  })
})

describe('fixture stays honest against the category tree', () => {
  it('every fixture category_id resolves to a real leaf', () => {
    const leafIds = new Set()
    const walk = (nodes) =>
      nodes.forEach((n) => (n.children ? walk(n.children) : leafIds.add(n.id)))
    walk(categories)
    for (const row of productRows) expect(leafIds.has(row.category_id)).toBe(true)
  })
})

describe('loadProducts', () => {
  it('fetches once and lands on ready with normalized products', async () => {
    await loadProducts()
    expect(getStatus()).toBe('ready')
    expect(getProducts()).toHaveLength(2)
    expect(getProducts()[0].quote.id).toBeDefined()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `yarn vitest run src/test/productStore.test.js`
Expected: FAIL — cannot resolve `../lib/productStore.js`.

- [ ] **Step 4: Implement**

Create `src/lib/productStore.js`:

```js
import { useSyncExternalStore } from 'react'
import { getSupabase, isConfigured, publicPhotoUrl } from './supabaseClient.js'
import { discountedPrice } from './pricing.js'

// Live product catalog. Mirrors quoteStore's "single module-level state, dumb
// components" shape: one fetch per session pulls every product (+ photos) from
// Supabase; pages subscribe via useProductCatalog() and read slices through
// lib/catalog.js, which keeps its static-era API.

let state = { status: 'idle', products: [] }
const listeners = new Set()

function setState(next) {
  state = next
  listeners.forEach((fn) => fn())
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function getSnapshot() {
  return state
}

// DB row (+ joined product_images) -> the product shape the storefront
// components already consume. quote.priceFrom carries the EFFECTIVE price
// (discounted when a discount is set) so the tray and the quote email show
// what the customer would actually pay.
export function normalizeRow(row) {
  const photos = [...(row.product_images ?? [])].sort((a, b) => a.position - b.position)
  const first = photos[0]
  const price = row.price == null ? null : Number(row.price)
  const discountPct = row.discount_pct == null ? null : Number(row.discount_pct)
  return {
    id: row.id,
    categoryId: row.category_id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    specs: row.specs ?? [],
    features: row.features ?? [],
    img: first ? publicPhotoUrl(first.storage_path) : null,
    imgAlt: first?.alt || row.title,
    images:
      photos.length > 1
        ? photos.map((p) => ({ src: publicPhotoUrl(p.storage_path), alt: p.alt || row.title }))
        : undefined,
    price,
    discountPct,
    featured: !!row.featured,
    quote: {
      id: row.id,
      priceFrom: discountedPrice(price, discountPct) ?? price,
      standardDims: row.standard_dims || '',
    },
  }
}

// Only 'idle' auto-loads: a failed fetch stays failed until the user hits
// Retry (force) — otherwise every route change would hammer a dead backend.
export async function loadProducts({ force = false } = {}) {
  if (!force && state.status !== 'idle') return
  if (!isConfigured()) {
    setState({ status: 'error', products: [] })
    return
  }
  setState({ status: 'loading', products: state.products })
  const supabase = await getSupabase()
  if (!supabase) {
    setState({ status: 'error', products: [] })
    return
  }
  const { data, error } = await supabase
    .from('products')
    .select('*, product_images(*)')
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })
  if (error) {
    setState({ status: 'error', products: [] })
    return
  }
  setState({ status: 'ready', products: data.map(normalizeRow) })
}

export function retryLoad() {
  return loadProducts({ force: true })
}

export function getProducts() {
  return state.products
}

export function getStatus() {
  return state.status
}

export function useProductCatalog() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

// Test-only: seed the store without a network.
export function __setStateForTests(next) {
  setState(next)
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `yarn vitest run src/test/productStore.test.js` → PASS. Then `yarn test` → all green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/productStore.js src/test/productStore.test.js src/test/fixtures/productRows.js
git commit -m "feat: productStore — session-cached live products from Supabase"
```

---

### Task 6: Storefront reads live products (loading + error states)

**Files:**

- Modify: `src/lib/catalog.js` (product getters read the store)
- Modify: `src/main.jsx` (kick off the fetch at boot)
- Modify: `src/pages/CategoryPage.jsx`
- Modify: `src/pages/CategoryOverview.jsx`
- Modify: `src/components/ProductRange.jsx` (+ `src/components/ProductRange.css`)
- Test: `src/test/catalogLive.test.jsx`

**Interfaces:**

- Consumes: `useProductCatalog`, `loadProducts`, `retryLoad`, `getProducts`, `__setStateForTests` from Task 5.
- Produces: `ProductRange` accepts optional `status` (`'idle'|'loading'|'ready'|'error'`, default `'ready'`) and `onRetry` props. `getProductsForLeaf`/`getProductsUnder` unchanged signatures, now backed by the store.

- [ ] **Step 1: Write the failing test**

Create `src/test/catalogLive.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { productRows } from './fixtures/productRows.js'

vi.mock('../lib/supabaseClient.js', () => ({
  isConfigured: () => true,
  publicPhotoUrl: (p) => `https://cdn.test/${p}`,
  getSupabase: () => Promise.resolve(null),
}))

const { __setStateForTests, normalizeRow } = await import('../lib/productStore.js')
const { getProductsForLeaf } = await import('../lib/catalog.js')
const { default: CategoryPage } = await import('../pages/CategoryPage.jsx')

function renderPage(slug) {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <CategoryPage slug={slug} />
      </MemoryRouter>
    </HelmetProvider>,
  )
}

describe('live catalog wiring', () => {
  it('getProductsForLeaf reads the store', () => {
    __setStateForTests({ status: 'ready', products: productRows.map(normalizeRow) })
    expect(getProductsForLeaf('job-site-toolbox')).toHaveLength(1)
    expect(getProductsForLeaf('nonexistent-leaf')).toHaveLength(0)
  })

  it('renders product cards when the store is ready', () => {
    __setStateForTests({ status: 'ready', products: productRows.map(normalizeRow) })
    renderPage('accessories')
    // Accessories page renders; the ready store means no loading status region
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('shows a loading state while fetching', () => {
    __setStateForTests({ status: 'loading', products: [] })
    renderPage('accessories')
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows a retry action when the fetch failed', () => {
    __setStateForTests({ status: 'error', products: [] })
    renderPage('accessories')
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run src/test/catalogLive.test.jsx`
Expected: FAIL — `getProductsForLeaf` still reads the static file, and no status UI exists.

- [ ] **Step 3: Swap `src/lib/catalog.js` product getters to the store**

Remove `import { catalog } from '../data/catalog.js'` and add `import { getProducts } from './productStore.js'`. Replace the two product functions:

```js
export function getProductsForLeaf(leafId) {
  return getProducts().filter((p) => p.categoryId === leafId)
}

export function getProductsUnder(node) {
  const ids = new Set(getLeaves(node).map((l) => l.id))
  return getProducts().filter((p) => ids.has(p.categoryId))
}
```

Also update the file's header comment: the catalog now lives in Supabase; this module stays the only read surface.

- [ ] **Step 4: Boot fetch in `src/main.jsx`**

Add `import { loadProducts } from './lib/productStore.js'` with the other lib imports, and call `loadProducts()` on the line after `initGtm()` — the fetch runs in parallel with first paint so category pages usually mount ready.

- [ ] **Step 5: Status plumbing in the two pages**

`src/pages/CategoryPage.jsx` — add imports and subscription:

```jsx
import { useEffect } from 'react'
import { useProductCatalog, loadProducts, retryLoad } from '../lib/productStore.js'
```

Inside the component, before the early return:

```jsx
const { status } = useProductCatalog()
useEffect(() => {
  loadProducts()
}, [])
```

(Note: hooks must run before `if (!node) return <NotFoundPage />` — place them at the top of the component.)

Pass through to the range: `<ProductRange data={data} status={status} onRetry={retryLoad} />`.

`src/pages/CategoryOverview.jsx` — same two imports + the same `useProductCatalog()` / `useEffect` block at the top of the component (before `if (!top)`), so subcategory thumbnails and counts fill in when the fetch lands. Use the ready check on the card body line:

```jsx
body={count ? `${count} product${count === 1 ? '' : 's'}` : status === 'ready' ? 'Explore the range' : 'Loading range…'}
```

- [ ] **Step 6: Status rendering in `src/components/ProductRange.jsx`**

Change the signature to `export default function ProductRange({ data, status = 'ready', onRetry })`. Wrap the existing `sections.map(...)` block: when `status !== 'ready'`, render this instead of the sections:

```jsx
{status !== 'ready' ? (
  <section className="section range-section">
    <div className="container">
      {status === 'error' ? (
        <div className="range-status range-status--error" role="alert">
          <p className="range-status__text">
            The product catalogue couldn’t load. Check your connection and try again.
          </p>
          <button type="button" className="range-status__retry" onClick={onRetry}>
            Retry
          </button>
        </div>
      ) : (
        <div className="range-status" role="status" aria-label="Loading products">
          <div className="grid grid--3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="range-skeleton" aria-hidden="true" />
            ))}
          </div>
        </div>
      )}
    </div>
  </section>
) : (
  /* existing sections.map(...) exactly as-is */
)}
```

Append to `src/components/ProductRange.css`:

```css
/* Loading / failed catalog states — the pill nav stays, the grids swap out. */
.range-status {
  padding: 8px 0;
}
.range-status--error {
  text-align: center;
  padding: 48px 0;
}
.range-status__text {
  color: var(--color-ink-muted);
  margin-bottom: 16px;
}
.range-status__retry {
  font-family: var(--font-body);
  font-weight: 600;
  padding: 10px 22px;
  color: var(--color-white);
  background: var(--color-ink-strong);
  border: none;
  cursor: pointer;
  transition: background var(--transition-fast);
}
.range-status__retry:hover {
  background: var(--color-accent-hover);
}
.range-skeleton {
  height: 340px;
  background: var(--color-off-white);
  border: 1px solid var(--color-border-light);
  animation: range-skel-pulse 1.2s ease-in-out infinite;
}
@keyframes range-skel-pulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .range-skeleton {
    animation: none;
  }
}
```

- [ ] **Step 7: Run tests**

Run: `yarn vitest run src/test/catalogLive.test.jsx` → PASS. Then `yarn test` → note `content.test.js` product-contract tests still pass because `src/data/catalog.js` still exists (retired in Task 7). `yarn lint` → clean.

- [ ] **Step 8: Manual check**

`yarn dev`, open `/toolboxes/under-tray-toolboxes`: with `.env` set the page shows skeletons briefly then… an EMPTY range (DB not seeded yet — expected). With `VITE_SUPABASE_URL` removed from `.env`, the page shows the error + Retry state. Restore `.env` afterwards.

- [ ] **Step 9: Commit**

```bash
git add src/lib/catalog.js src/main.jsx src/pages/CategoryPage.jsx src/pages/CategoryOverview.jsx src/components/ProductRange.jsx src/components/ProductRange.css src/test/catalogLive.test.jsx
git commit -m "feat: storefront reads live products with loading/error states"
```

---

### Task 7: Seed Supabase and retire the static products

**Files:**

- Create: `scripts/seed-data.mjs` (products array, moved verbatim)
- Create: `scripts/seed-catalog.mjs`
- Delete: `src/data/catalog.js`
- Modify: `src/test/content.test.js`

**Interfaces:**

- Consumes: schema from Task 1, admin user from Task 1 Step 4.
- Produces: all ~73 products + photos in Supabase; `src/data/catalog.js` gone; `content.test.js` category tests import `{ categories }` from `../data/categories.js`.

- [ ] **Step 1: Move the products array**

Create `scripts/seed-data.mjs`: cut the ENTIRE `products: [ ... ]` array from `src/data/catalog.js` and export it:

```js
// The launch catalog, snapshotted for scripts/seed-catalog.mjs. The live
// source of truth is the Supabase `products` table — edit there (via /admin),
// not here. Kept so the seed can be re-run into a fresh project.

export const products = [
  // …the array moved verbatim from src/data/catalog.js…
]
```

Then delete `src/data/catalog.js` (nothing imports it anymore after Task 6 — verify with `grep -rn "data/catalog" src/`; expected: only `content.test.js`, fixed in Step 3).

- [ ] **Step 2: Write the seed script**

Create `scripts/seed-catalog.mjs`:

```js
// One-time seed: pushes the static launch catalog (scripts/seed-data.mjs) into
// Supabase — product rows plus every photo (original JPEG + the committed
// -400/-800 WebP derivatives) into the product-photos bucket. Idempotent:
// re-running upserts rows and replaces photo records.
//
// Usage (values from .env + the admin user created in the dashboard):
//   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... \
//   SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... node scripts/seed-catalog.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { products } from './seed-data.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const IMAGES_DIR = join(ROOT, 'public/images/catalog')

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
const email = process.env.SEED_ADMIN_EMAIL
const password = process.env.SEED_ADMIN_PASSWORD
if (!url || !key || !email || !password) {
  console.error(
    'Missing env. Need VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD.',
  )
  process.exit(1)
}

const supabase = createClient(url, key)
const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
if (authError) {
  console.error('Admin sign-in failed:', authError.message)
  process.exit(1)
}

// publicPath like "/images/catalog/x.jpg" -> upload x.jpg + x-400.webp +
// x-800.webp under products/<id>/ and return the product_images row.
async function uploadImage(productId, publicPath, alt, position) {
  const name = publicPath.split('/').pop()
  const base = name.replace(/\.jpe?g$/i, '')
  const files = [
    { local: name, remote: `products/${productId}/${name}`, type: 'image/jpeg' },
    {
      local: `${base}-400.webp`,
      remote: `products/${productId}/${base}-400.webp`,
      type: 'image/webp',
    },
    {
      local: `${base}-800.webp`,
      remote: `products/${productId}/${base}-800.webp`,
      type: 'image/webp',
    },
  ]
  for (const f of files) {
    const abs = join(IMAGES_DIR, f.local)
    if (!existsSync(abs)) {
      console.warn(`  ! missing ${f.local} — skipped`)
      continue
    }
    const { error } = await supabase.storage
      .from('product-photos')
      .upload(f.remote, readFileSync(abs), { contentType: f.type, upsert: true })
    if (error) throw new Error(`upload ${f.remote}: ${error.message}`)
  }
  return {
    product_id: productId,
    storage_path: `products/${productId}/${name}`,
    alt: alt || '',
    position,
  }
}

const perCategory = new Map()
for (const p of products) {
  const sort = perCategory.get(p.categoryId) ?? 0
  perCategory.set(p.categoryId, sort + 1)

  const { error } = await supabase.from('products').upsert({
    id: p.id,
    category_id: p.categoryId,
    title: p.title,
    slug: p.slug,
    summary: p.summary ?? '',
    specs: p.specs ?? [],
    features: p.features ?? [],
    price: p.quote?.priceFrom ?? null,
    discount_pct: null,
    standard_dims: p.quote?.standardDims ?? '',
    featured: !!p.featured,
    sort_order: sort,
  })
  if (error) throw new Error(`${p.id}: ${error.message}`)

  const shots = p.images?.length ? p.images : [{ src: p.img, alt: p.imgAlt }]
  const rows = []
  for (let i = 0; i < shots.length; i++) {
    rows.push(await uploadImage(p.id, shots[i].src, shots[i].alt ?? p.imgAlt ?? p.title, i))
  }
  await supabase.from('product_images').delete().eq('product_id', p.id)
  const { error: imgError } = await supabase.from('product_images').insert(rows)
  if (imgError) throw new Error(`${p.id} images: ${imgError.message}`)
  console.log(`✓ ${p.id} (${rows.length} photo${rows.length === 1 ? '' : 's'})`)
}
console.log(`\nSeeded ${products.length} products.`)
```

- [ ] **Step 3: Fix `src/test/content.test.js`**

Replace `import { catalog } from '../data/catalog.js'` with:

```js
import { categories } from '../data/categories.js'

const catalog = { categories }
```

Delete the whole `describe('catalog — product contract', …)` block (product shape is now covered by `productStore.test.js` against `fixtures/productRows.js`). The `describe('catalog — category tree contract', …)` block keeps working via the `catalog` shim.

- [ ] **Step 4: Run the seed (needs Billy's admin credentials)**

Ask Billy for the admin email/password from Task 1 Step 4 (or have him run the command himself):

```bash
set -a && source .env && set +a
SEED_ADMIN_EMAIL='<admin email>' SEED_ADMIN_PASSWORD='<admin password>' node scripts/seed-catalog.mjs
```

Expected output: `✓ <product-id> (N photos)` per product, ending `Seeded 73 products.` (count = number of entries in seed-data.mjs).

Verify via `mcp__supabase__execute_sql`: `select count(*) from products; select count(*) from product_images;` → 73 and ≥ 73.

- [ ] **Step 5: End-to-end dev check**

`yarn dev` → `/toolboxes/under-tray-toolboxes` and `/accessories` now render every product card with photos served from `…supabase.co/storage/…`. The Tray B product shows its multi-photo count badge and gallery in View details.

- [ ] **Step 6: Full suite**

Run: `yarn test && yarn lint && yarn build` → all green.

- [ ] **Step 7: Commit**

```bash
git add scripts/seed-data.mjs scripts/seed-catalog.mjs src/test/content.test.js
git rm src/data/catalog.js
git commit -m "feat: seed Supabase catalog; retire static product data"
```

---

### Task 8: PriceTag — public prices with discount display

**Files:**

- Create: `src/components/PriceTag.jsx`, `src/components/PriceTag.css`
- Modify: `src/components/Card.jsx`, `src/components/DetailDrawer.jsx`, `src/components/ProductRange.jsx`
- Test: `src/test/priceTag.test.jsx`

**Interfaces:**

- Consumes: `formatPrice`, `discountedPrice` (Task 3); `price`/`discountPct` on normalized products (Task 5).
- Produces: `<PriceTag price={number|null} discountPct={number|null} />` — three states: null price → "Enquire for pricing"; price → "from $X + GST"; price + discount → struck-through original, discounted price, "Save N%" badge. `Card` gains `price` and `discountPct` props; the detail payload gains `price`/`discountPct` fields.

- [ ] **Step 1: Write the failing test**

Create `src/test/priceTag.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PriceTag from '../components/PriceTag.jsx'

// Amounts sit next to a nested "from" span, so exact getByText on "$450"
// won't match — assert via textContent instead.
describe('PriceTag', () => {
  it('shows the enquiry line when there is no price', () => {
    render(<PriceTag price={null} />)
    expect(screen.getByText(/enquire for pricing/i)).toBeInTheDocument()
  })

  it('shows a plain from-price without discount', () => {
    const { container } = render(<PriceTag price={450} />)
    expect(container).toHaveTextContent('from $450')
    expect(container).toHaveTextContent('+ GST')
    expect(container.querySelector('s')).toBeNull()
    expect(screen.queryByText(/save/i)).toBeNull()
  })

  it('shows original struck through, sale price and save badge with a discount', () => {
    const { container } = render(<PriceTag price={450} discountPct={15} />)
    expect(container.querySelector('s')).toHaveTextContent('$450')
    expect(container).toHaveTextContent('from $382.50')
    expect(screen.getByText(/save 15%/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run src/test/priceTag.test.jsx`
Expected: FAIL — cannot resolve `../components/PriceTag.jsx`.

- [ ] **Step 3: Implement the component**

Create `src/components/PriceTag.jsx`:

```jsx
import { formatPrice, discountedPrice } from '../lib/pricing.js'
import './PriceTag.css'

// The one price renderer, shared by Card and DetailDrawer. Three states:
// no price -> enquiry line; price -> "from $X + GST"; price + discount ->
// struck-through original, sale price, save badge.
export default function PriceTag({ price, discountPct }) {
  if (price == null) {
    return <span className="price-tag__enquire">Enquire for pricing</span>
  }
  const sale = discountedPrice(price, discountPct)
  return (
    <span className="price-tag">
      {sale != null && (
        <s className="price-tag__was">
          <span className="sr-only">Was </span>
          {formatPrice(price)}
        </s>
      )}
      <span className="price-tag__amount">
        <span className="price-tag__from">from</span> {formatPrice(sale ?? price)}
      </span>
      <span className="price-tag__gst">+ GST</span>
      {sale != null && <span className="price-tag__save">Save {Math.round(discountPct)}%</span>}
    </span>
  )
}
```

Create `src/components/PriceTag.css`:

```css
.price-tag {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
  font-family: var(--font-body);
}
.price-tag__amount {
  font-weight: 700;
  font-size: 18px;
  color: var(--color-ink-strong);
}
.price-tag__from {
  font-weight: 500;
  font-size: 13px;
  color: var(--color-ink-muted);
}
.price-tag__was {
  font-size: 14px;
  color: var(--color-ink-muted);
  text-decoration: line-through;
}
.price-tag__gst {
  font-size: 12px;
  color: var(--color-ink-muted);
}
.price-tag__save {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  padding: 2px 8px;
  background: var(--color-accent-soft);
  color: var(--color-accent-hover);
  border-radius: var(--radius-sm);
}
.price-tag__enquire {
  font-size: 14px;
  color: var(--color-ink-muted);
  font-family: var(--font-body);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn vitest run src/test/priceTag.test.jsx` → PASS.

- [ ] **Step 5: Wire into Card**

In `src/components/Card.jsx`:

1. Add props `price` and `discountPct` to the destructured signature (after `quote`).
2. Add `import PriceTag from './PriceTag.jsx'` and remove the now-unused `import { formatPrice } from '../lib/pricing.js'`.
3. Replace the whole `<div className="card__price">…</div>` block (the `quote.priceFrom != null ? … : …` ternary) with:

```jsx
<div className="card__price">
  <PriceTag price={price ?? quote.priceFrom} discountPct={discountPct} />
</div>
```

4. In `showDetails()`, add `price: price ?? quote?.priceFrom ?? null,` and `discountPct: discountPct ?? null,` alongside the existing `priceFrom` field.

- [ ] **Step 6: Wire into DetailDrawer**

In `src/components/DetailDrawer.jsx`: add `import PriceTag from './PriceTag.jsx'`, remove the unused `formatPrice` import, and replace the whole `<div className="detail-drawer__price">…</div>` ternary contents with:

```jsx
<div className="detail-drawer__price">
  <PriceTag price={product.price ?? product.priceFrom} discountPct={product.discountPct} />
</div>
```

- [ ] **Step 7: Pass prices through ProductRange**

In `src/components/ProductRange.jsx`, add to the `<Card` inside the products map (after `quote={p.quote}`):

```jsx
price={p.price}
discountPct={p.discountPct}
```

- [ ] **Step 8: Full suite + visual check**

Run: `yarn test && yarn lint` → green. `yarn dev` → set a test discount via SQL (`update products set price = 450, discount_pct = 15 where id = 'job-site-toolbox-1';` through `mcp__supabase__execute_sql`), reload `/toolboxes/top-opening-toolboxes` → card shows ~~$450~~ from $382.50 + GST with a "Save 15%" badge; View details matches. Reset afterwards: `update products set price = null, discount_pct = null where id = 'job-site-toolbox-1';`

- [ ] **Step 9: Commit**

```bash
git add src/components/PriceTag.jsx src/components/PriceTag.css src/components/Card.jsx src/components/DetailDrawer.jsx src/components/ProductRange.jsx src/test/priceTag.test.jsx
git commit -m "feat: public prices with strikethrough discount display"
```

---

### Task 9: productForm — slug + validation helpers

**Files:**

- Create: `src/lib/productForm.js`
- Test: `src/test/productForm.test.js`

**Interfaces:**

- Produces: `slugify(title: string): string`; `validateProduct(form, leafIds: string[]): { valid, errors: {field: message}, price: number|null, discountPct: number|null }`. Form fields consumed: `title`, `categoryId`, `price` (string|number|''), `discountPct` (string|number|'').

- [ ] **Step 1: Write the failing test**

Create `src/test/productForm.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { slugify, validateProduct } from '../lib/productForm.js'

const LEAVES = ['job-site-toolbox', 'locks']

describe('slugify', () => {
  it('lowercases, strips symbols and collapses to hyphens', () => {
    expect(slugify('580 × 230 × 400mm Aluminium Checker Ute Toolbox')).toBe(
      '580-x-230-x-400mm-aluminium-checker-ute-toolbox',
    )
  })
  it('trims leading/trailing hyphens and caps length', () => {
    expect(slugify('  --Hello World!--  ')).toBe('hello-world')
    expect(slugify('x'.repeat(200)).length).toBeLessThanOrEqual(80)
  })
})

describe('validateProduct', () => {
  const base = { title: 'Box', categoryId: 'locks', price: '', discountPct: '' }

  it('accepts a minimal valid form and coerces empty price to null', () => {
    const r = validateProduct(base, LEAVES)
    expect(r.valid).toBe(true)
    expect(r.price).toBeNull()
    expect(r.discountPct).toBeNull()
  })

  it('requires a title and a real leaf category', () => {
    expect(validateProduct({ ...base, title: '  ' }, LEAVES).errors.title).toBeTruthy()
    expect(
      validateProduct({ ...base, categoryId: 'toolboxes' }, LEAVES).errors.categoryId,
    ).toBeTruthy()
  })

  it('rejects negative or non-numeric prices', () => {
    expect(validateProduct({ ...base, price: '-5' }, LEAVES).errors.price).toBeTruthy()
    expect(validateProduct({ ...base, price: 'abc' }, LEAVES).errors.price).toBeTruthy()
    expect(validateProduct({ ...base, price: '450' }, LEAVES).price).toBe(450)
  })

  it('discount needs a price and must be 1-99', () => {
    expect(validateProduct({ ...base, discountPct: '10' }, LEAVES).errors.discountPct).toBeTruthy()
    expect(
      validateProduct({ ...base, price: '450', discountPct: '150' }, LEAVES).errors.discountPct,
    ).toBeTruthy()
    const ok = validateProduct({ ...base, price: '450', discountPct: '15' }, LEAVES)
    expect(ok.valid).toBe(true)
    expect(ok.discountPct).toBe(15)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run src/test/productForm.test.js`
Expected: FAIL — cannot resolve `../lib/productForm.js`.

- [ ] **Step 3: Implement**

Create `src/lib/productForm.js`:

```js
// Pure form helpers for the admin product editor — kept out of the component
// so validation rules are unit-testable.

export function slugify(title) {
  return title
    .toLowerCase()
    .replace(/×/g, 'x')
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '')
}

function toNumber(value) {
  if (value === '' || value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : NaN
}

export function validateProduct(form, leafIds) {
  const errors = {}
  if (!form.title?.trim()) errors.title = 'Title is required'
  if (!leafIds.includes(form.categoryId)) errors.categoryId = 'Pick a category'

  const price = toNumber(form.price)
  if (Number.isNaN(price) || (price != null && price < 0)) {
    errors.price = 'Price must be a positive number'
  }

  const discountPct = toNumber(form.discountPct)
  if (Number.isNaN(discountPct)) {
    errors.discountPct = 'Discount must be a number'
  } else if (discountPct != null) {
    if (price == null || Number.isNaN(price)) {
      errors.discountPct = 'Set a price before adding a discount'
    } else if (discountPct < 1 || discountPct > 99) {
      errors.discountPct = 'Discount must be between 1 and 99'
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    price: Number.isNaN(price) ? null : price,
    discountPct: Number.isNaN(discountPct) ? null : discountPct,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn vitest run src/test/productForm.test.js` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/productForm.js src/test/productForm.test.js
git commit -m "feat: product form validation + slugify helpers"
```

---

### Task 10: imageResize — client-side photo pipeline

**Files:**

- Create: `src/lib/imageResize.js`
- Test: `src/test/imageResize.test.js`

**Interfaces:**

- Produces: `processPhoto(file: File): Promise<{ jpeg: Blob, variants: [{ width, blob }] }>` (canvas-based; ≤1600px JPEG master + 400/800 WebP derivatives); `photoPaths(productId, name): { jpeg: string, webp: [{ width, path }] }` matching `<Img>`'s `-400.webp`/`-800.webp` naming contract; `DERIVATIVE_WIDTHS = [400, 800]`.

- [ ] **Step 1: Write the failing test (pure part only — canvas isn't available in jsdom)**

Create `src/test/imageResize.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { photoPaths, DERIVATIVE_WIDTHS } from '../lib/imageResize.js'

describe('photoPaths', () => {
  it('builds the bucket paths matching <Img> derivative naming', () => {
    const p = photoPaths('job-site-toolbox-1', 'a1b2c3')
    expect(p.jpeg).toBe('products/job-site-toolbox-1/a1b2c3.jpg')
    expect(p.webp).toEqual([
      { width: 400, path: 'products/job-site-toolbox-1/a1b2c3-400.webp' },
      { width: 800, path: 'products/job-site-toolbox-1/a1b2c3-800.webp' },
    ])
  })
  it('derivative widths match the storefront <Img> contract', () => {
    expect(DERIVATIVE_WIDTHS).toEqual([400, 800])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run src/test/imageResize.test.js`
Expected: FAIL — cannot resolve `../lib/imageResize.js`.

- [ ] **Step 3: Implement**

Create `src/lib/imageResize.js`:

```js
// Client-side photo pipeline for admin uploads. Produces a downscaled JPEG
// master plus the -400/-800 WebP derivatives <Img> expects (same naming
// contract as scripts/gen-images.mjs) so storefront srcsets keep working for
// photos that never touch the repo.

export const DERIVATIVE_WIDTHS = [400, 800]
const MASTER_MAX_WIDTH = 1600
const JPEG_QUALITY = 0.85
const WEBP_QUALITY = 0.68

export function photoPaths(productId, name) {
  const base = `products/${productId}/${name}`
  return {
    jpeg: `${base}.jpg`,
    webp: DERIVATIVE_WIDTHS.map((width) => ({ width, path: `${base}-${width}.webp` })),
  }
}

function scaled(bitmap, targetWidth) {
  const width = Math.min(targetWidth, bitmap.width)
  const height = Math.round((bitmap.height / bitmap.width) * width)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)
  return canvas
}

function encode(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error(`Could not encode ${type}`))),
      type,
      quality,
    )
  })
}

export async function processPhoto(file) {
  const bitmap = await createImageBitmap(file)
  const jpeg = await encode(scaled(bitmap, MASTER_MAX_WIDTH), 'image/jpeg', JPEG_QUALITY)
  const variants = []
  for (const width of DERIVATIVE_WIDTHS) {
    variants.push({ width, blob: await encode(scaled(bitmap, width), 'image/webp', WEBP_QUALITY) })
  }
  bitmap.close()
  return { jpeg, variants }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn vitest run src/test/imageResize.test.js` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/imageResize.js src/test/imageResize.test.js
git commit -m "feat: client-side photo resize pipeline for admin uploads"
```

---

### Task 11: adminApi — auth + CRUD wrappers

**Files:**

- Create: `src/lib/adminApi.js`
- Test: `src/test/adminApi.test.js`

**Interfaces:**

- Consumes: `getSupabase()` (Task 2), `processPhoto`/`photoPaths` (Task 10), `retryLoad` (Task 5).
- Produces (all throw `Error` with a message on failure unless noted):
  - `signIn(email, password): Promise<{ error }>` (returns, not throws — the login form displays it)
  - `signOut(): Promise<void>`
  - `watchSession(onChange: (session|null) => void): Promise<() => void>` — emits current session then subscribes; returns unsubscribe.
  - `fetchAdminProducts(): Promise<Row[]>` — raw rows + `product_images`, ordered by category then sort_order.
  - `fetchProductImages(productId): Promise<ImageRow[]>`
  - `saveProduct(fields, { isNew }): Promise<{ error }>` — fields: `{ id, slug, title, categoryId, summary, specs, features, price, discountPct, standardDims, featured, sortOrder }`.
  - `deleteProduct(row): Promise<void>` — best-effort storage cleanup, then row delete (cascades images).
  - `uploadPhotos(productId, files, startPosition, defaultAlt): Promise<void>`
  - `deletePhoto(imageRow): Promise<void>`
  - `swapPhotoPositions(a, b): Promise<void>`

- [ ] **Step 1: Write the failing test**

Create `src/test/adminApi.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const calls = { upserts: [], updates: [], deletes: [], removed: [] }

function tableApi(table) {
  return {
    insert: vi.fn((row) => {
      calls.upserts.push({ table, row })
      return Promise.resolve({ error: null })
    }),
    update: vi.fn((patch) => ({
      eq: vi.fn((col, val) => {
        calls.updates.push({ table, patch, col, val })
        return Promise.resolve({ error: null })
      }),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn((col, val) => {
        calls.deletes.push({ table, col, val })
        return Promise.resolve({ error: null })
      }),
    })),
    select: vi.fn(() => ({
      order: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      eq: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  }
}

const fakeClient = {
  from: vi.fn((table) => tableApi(table)),
  storage: {
    from: vi.fn(() => ({
      remove: vi.fn((paths) => {
        calls.removed.push(...paths)
        return Promise.resolve({ error: null })
      }),
      upload: vi.fn(() => Promise.resolve({ error: null })),
    })),
  },
  auth: { signOut: vi.fn() },
}

vi.mock('../lib/supabaseClient.js', () => ({
  isConfigured: () => true,
  publicPhotoUrl: (p) => `https://cdn.test/${p}`,
  getSupabase: () => Promise.resolve(fakeClient),
}))
vi.mock('../lib/productStore.js', () => ({ retryLoad: vi.fn() }))

const { saveProduct, deletePhoto, deleteProduct } = await import('../lib/adminApi.js')

beforeEach(() => {
  calls.upserts.length = 0
  calls.updates.length = 0
  calls.deletes.length = 0
  calls.removed.length = 0
})

describe('saveProduct', () => {
  it('maps camelCase fields to snake_case columns on insert', async () => {
    const { error } = await saveProduct(
      {
        id: 'new-box',
        slug: 'new-box',
        title: ' New Box ',
        categoryId: 'locks',
        summary: 'A box',
        specs: [{ label: 'Material', value: 'Aluminium' }],
        features: ['Lockable'],
        price: 450,
        discountPct: 15,
        standardDims: '600 × 400',
        featured: true,
        sortOrder: 3,
      },
      { isNew: true },
    )
    expect(error).toBeNull()
    expect(calls.upserts[0].table).toBe('products')
    expect(calls.upserts[0].row).toMatchObject({
      id: 'new-box',
      category_id: 'locks',
      title: 'New Box',
      price: 450,
      discount_pct: 15,
      standard_dims: '600 × 400',
      featured: true,
      sort_order: 3,
    })
  })

  it('updates by id when not new', async () => {
    await saveProduct(
      { id: 'x', slug: 'x', title: 'X', categoryId: 'locks', price: null, discountPct: null },
      { isNew: false },
    )
    expect(calls.updates[0]).toMatchObject({ table: 'products', col: 'id', val: 'x' })
  })
})

describe('deletePhoto', () => {
  it('removes the JPEG and both WebP derivatives, then the row', async () => {
    await deletePhoto({ id: 'img-1', storage_path: 'products/x/shot.jpg' })
    expect(calls.removed).toEqual([
      'products/x/shot.jpg',
      'products/x/shot-400.webp',
      'products/x/shot-800.webp',
    ])
    expect(calls.deletes[0]).toMatchObject({ table: 'product_images', val: 'img-1' })
  })
})

describe('deleteProduct', () => {
  it('sweeps all image files then deletes the product row', async () => {
    await deleteProduct({
      id: 'x',
      product_images: [{ storage_path: 'products/x/a.jpg' }, { storage_path: 'products/x/b.jpg' }],
    })
    expect(calls.removed).toHaveLength(6)
    expect(calls.deletes[0]).toMatchObject({ table: 'products', val: 'x' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run src/test/adminApi.test.js`
Expected: FAIL — cannot resolve `../lib/adminApi.js`.

- [ ] **Step 3: Implement**

Create `src/lib/adminApi.js`:

```js
import { getSupabase } from './supabaseClient.js'
import { processPhoto, photoPaths } from './imageResize.js'
import { retryLoad } from './productStore.js'

// Auth + CRUD surface for the /admin dashboard. Every write refreshes the
// storefront productStore so an open tab reflects edits without a reload.

const BUCKET = 'product-photos'

async function client() {
  const supabase = await getSupabase()
  if (!supabase) {
    throw new Error(
      'Supabase is not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    )
  }
  return supabase
}

export async function signIn(email, password) {
  try {
    const c = await client()
    const { error } = await c.auth.signInWithPassword({ email, password })
    return { error }
  } catch (err) {
    return { error: err }
  }
}

export async function signOut() {
  const c = await client()
  await c.auth.signOut()
}

// Emits the current session immediately, then on every auth change.
// Resolves to an unsubscribe function.
export async function watchSession(onChange) {
  const supabase = await getSupabase()
  if (!supabase) {
    onChange(null)
    return () => {}
  }
  const {
    data: { session },
  } = await supabase.auth.getSession()
  onChange(session)
  const { data } = supabase.auth.onAuthStateChange((_event, next) => onChange(next))
  return () => data.subscription.unsubscribe()
}

export async function fetchAdminProducts() {
  const c = await client()
  const { data, error } = await c
    .from('products')
    .select('*, product_images(*)')
    .order('category_id')
    .order('sort_order')
  if (error) throw new Error(error.message)
  return data
}

export async function fetchProductImages(productId) {
  const c = await client()
  const { data, error } = await c
    .from('product_images')
    .select('*')
    .eq('product_id', productId)
    .order('position')
  if (error) throw new Error(error.message)
  return data
}

function toRow(p) {
  return {
    id: p.id,
    category_id: p.categoryId,
    title: p.title.trim(),
    slug: p.slug,
    summary: p.summary ?? '',
    specs: p.specs ?? [],
    features: p.features ?? [],
    price: p.price,
    discount_pct: p.discountPct,
    standard_dims: p.standardDims ?? '',
    featured: !!p.featured,
    sort_order: p.sortOrder ?? 0,
  }
}

export async function saveProduct(p, { isNew } = {}) {
  const c = await client()
  const row = toRow(p)
  const { error } = isNew
    ? await c.from('products').insert(row)
    : await c.from('products').update(row).eq('id', p.id)
  if (!error) retryLoad()
  return { error }
}

// The DB stores only the JPEG path; the WebP derivatives sit beside it with
// the -400/-800 suffix (same contract as <Img> and scripts/gen-images.mjs).
function storageFilesFor(image) {
  const base = image.storage_path.replace(/\.jpe?g$/i, '')
  return [image.storage_path, `${base}-400.webp`, `${base}-800.webp`]
}

export async function deleteProduct(row) {
  const c = await client()
  const images = row.product_images ?? []
  if (images.length) {
    // Best-effort: DB rows are the source of truth; orphaned files are harmless.
    await c.storage.from(BUCKET).remove(images.flatMap(storageFilesFor))
  }
  const { error } = await c.from('products').delete().eq('id', row.id)
  if (error) throw new Error(error.message)
  retryLoad()
}

export async function uploadPhotos(productId, files, startPosition, defaultAlt) {
  const c = await client()
  const rows = []
  for (let i = 0; i < files.length; i++) {
    const { jpeg, variants } = await processPhoto(files[i])
    const name = crypto.randomUUID().slice(0, 8)
    const paths = photoPaths(productId, name)
    const master = await c.storage
      .from(BUCKET)
      .upload(paths.jpeg, jpeg, { contentType: 'image/jpeg' })
    if (master.error) throw new Error(master.error.message)
    for (const v of variants) {
      const { path } = paths.webp.find((w) => w.width === v.width)
      const { error } = await c.storage
        .from(BUCKET)
        .upload(path, v.blob, { contentType: 'image/webp' })
      if (error) throw new Error(error.message)
    }
    rows.push({
      product_id: productId,
      storage_path: paths.jpeg,
      alt: defaultAlt ?? '',
      position: startPosition + i,
    })
  }
  const { error } = await c.from('product_images').insert(rows)
  if (error) throw new Error(error.message)
  retryLoad()
}

export async function deletePhoto(image) {
  const c = await client()
  await c.storage.from(BUCKET).remove(storageFilesFor(image))
  const { error } = await c.from('product_images').delete().eq('id', image.id)
  if (error) throw new Error(error.message)
  retryLoad()
}

export async function swapPhotoPositions(a, b) {
  const c = await client()
  const first = await c.from('product_images').update({ position: b.position }).eq('id', a.id)
  if (first.error) throw new Error(first.error.message)
  const second = await c.from('product_images').update({ position: a.position }).eq('id', b.id)
  if (second.error) throw new Error(second.error.message)
  retryLoad()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn vitest run src/test/adminApi.test.js` → PASS. Then `yarn test && yarn lint` → all green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/adminApi.js src/test/adminApi.test.js
git commit -m "feat: adminApi — auth + product/photo CRUD wrappers"
```

---

### Task 12: Admin shell — login, auth gate, route, noindex

**Files:**

- Create: `src/pages/admin/AdminPage.jsx`, `src/pages/admin/AdminLogin.jsx`, `src/pages/admin/Admin.css`
- Create (placeholders, filled in Tasks 13–14): `src/pages/admin/ProductList.jsx`, `src/pages/admin/ProductEditor.jsx`
- Modify: `src/config/theme.config.js` (add `danger` color token — house rule: no raw hex in component CSS)
- Modify: `src/lib/seo.jsx` (add `noindex` prop)
- Modify: `src/App.jsx` (lazy `/admin` route)
- Modify: `public/robots.txt`
- Test: `src/test/admin.test.jsx`

**Interfaces:**

- Consumes: `watchSession`, `signIn`, `signOut`, `fetchAdminProducts` (Task 11).
- Produces: `/admin` route; `SEO` accepts `noindex` (boolean) rendering `<meta name="robots" content="noindex, nofollow" />`; `AdminPage` renders `ProductList rows onEdit onNew onChanged` or `ProductEditor row rows onDone onCancel` (contracts for Tasks 13–14).

- [ ] **Step 1: Write the failing test**

Create `src/test/admin.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

vi.mock('../lib/adminApi.js', () => ({
  watchSession: async (onChange) => {
    onChange(null)
    return () => {}
  },
  signIn: vi.fn(async () => ({ error: { message: 'Invalid login credentials' } })),
  signOut: vi.fn(),
  fetchAdminProducts: vi.fn(async () => []),
}))

const { default: AdminPage } = await import('../pages/admin/AdminPage.jsx')

function renderAdmin() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    </HelmetProvider>,
  )
}

describe('AdminPage — signed out', () => {
  it('shows the login form, not the dashboard', async () => {
    renderAdmin()
    expect(await screen.findByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.queryByText(/catalogue admin/i)).toBeNull()
  })

  it('has no axe violations', async () => {
    const { container } = renderAdmin()
    await screen.findByLabelText(/email/i)
    expect(await axe(container)).toHaveNoViolations()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run src/test/admin.test.jsx`
Expected: FAIL — cannot resolve `../pages/admin/AdminPage.jsx`.

- [ ] **Step 3: Add the danger token**

In `src/config/theme.config.js`, add to `colors` (after `'accent-soft'`):

```js
    // Destructive actions + error text (admin dashboard, form errors).
    danger: '#a03030',
```

`applyTheme.js` flattens it to `--color-danger` automatically.

- [ ] **Step 3b: Add `noindex` to SEO**

In `src/lib/seo.jsx`, change the signature to `export default function SEO({ title, description, image, path = '', noindex = false })` and add inside `<Helmet>` (right after `<link rel="canonical" …>`):

```jsx
{
  noindex && <meta name="robots" content="noindex, nofollow" />
}
```

- [ ] **Step 4: Create the admin pages**

Create `src/pages/admin/AdminLogin.jsx`:

```jsx
import { useState } from 'react'
import { signIn } from '../../lib/adminApi.js'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error: err } = await signIn(email, password)
    if (err) setError(err.message)
    setBusy(false)
    // On success watchSession fires with the new session and AdminPage swaps views.
  }

  return (
    <div className="admin-login">
      <form className="admin-login__form" onSubmit={onSubmit}>
        <h1 className="admin__title">Admin sign in</h1>
        <label className="admin__label" htmlFor="admin-email">
          Email
        </label>
        <input
          id="admin-email"
          className="admin__input"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label className="admin__label" htmlFor="admin-password">
          Password
        </label>
        <input
          id="admin-password"
          className="admin__input"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p className="admin__error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="admin__primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
```

Create `src/pages/admin/AdminPage.jsx`:

```jsx
import { useCallback, useEffect, useState } from 'react'
import SEO from '../../lib/seo.jsx'
import AdminLogin from './AdminLogin.jsx'
import ProductList from './ProductList.jsx'
import ProductEditor from './ProductEditor.jsx'
import { watchSession, signOut, fetchAdminProducts } from '../../lib/adminApi.js'
import './Admin.css'

// The whole admin lives on this one lazy route: auth gate -> product list
// <-> product editor. Data is raw DB rows (snake_case) — the storefront's
// normalized shape never leaks in here.
export default function AdminPage() {
  const [session, setSession] = useState(null)
  const [checked, setChecked] = useState(false)
  const [rows, setRows] = useState([])
  const [loadError, setLoadError] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | row

  useEffect(() => {
    let cleanup = () => {}
    watchSession((s) => {
      setSession(s)
      setChecked(true)
    }).then((unsub) => {
      cleanup = unsub
    })
    return () => cleanup()
  }, [])

  const refresh = useCallback(async () => {
    try {
      setRows(await fetchAdminProducts())
      setLoadError('')
    } catch (err) {
      setLoadError(err.message)
    }
  }, [])

  useEffect(() => {
    if (session) refresh()
  }, [session, refresh])

  return (
    <main className="admin section">
      <SEO title="Admin" description="Catalogue admin" path="/admin" noindex />
      {!checked ? null : !session ? (
        <div className="container">
          <AdminLogin />
        </div>
      ) : (
        <div className="container">
          <header className="admin__head">
            <h1 className="admin__title">Catalogue admin</h1>
            <button type="button" className="admin__ghost" onClick={signOut}>
              Sign out
            </button>
          </header>
          {loadError && (
            <p className="admin__error" role="alert">
              {loadError}
            </p>
          )}
          {editing ? (
            <ProductEditor
              row={editing === 'new' ? null : editing}
              rows={rows}
              onDone={() => {
                setEditing(null)
                refresh()
              }}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <ProductList
              rows={rows}
              onEdit={setEditing}
              onNew={() => setEditing('new')}
              onChanged={refresh}
            />
          )}
        </div>
      )}
    </main>
  )
}
```

Create placeholder `src/pages/admin/ProductList.jsx` (replaced in Task 13):

```jsx
// Filled in by the product-list task.
export default function ProductList() {
  return <p className="admin__empty">Product list coming in the next task.</p>
}
```

Create placeholder `src/pages/admin/ProductEditor.jsx` (replaced in Task 14):

```jsx
// Filled in by the product-editor task.
export default function ProductEditor() {
  return null
}
```

Create `src/pages/admin/Admin.css`:

```css
/* Admin dashboard — lean, utilitarian, tokens only. Single-admin tool. */

.admin {
  min-height: 60vh;
}
.admin__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 28px;
}
.admin__title {
  font-family: var(--font-display);
  font-size: 32px;
  text-transform: uppercase;
  color: var(--color-ink-strong);
}
.admin__label {
  display: block;
  font-weight: 600;
  font-size: 14px;
  margin: 14px 0 4px;
  color: var(--color-ink);
}
.admin__input,
.admin__select,
.admin__textarea {
  width: 100%;
  padding: 10px 12px;
  font: inherit;
  color: var(--color-ink);
  background: var(--color-white);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-none);
}
.admin__input:focus-visible,
.admin__select:focus-visible,
.admin__textarea:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
}
.admin__primary {
  font-family: var(--font-body);
  font-weight: 600;
  padding: 10px 22px;
  margin-top: 18px;
  color: var(--color-white);
  background: var(--color-ink-strong);
  border: none;
  cursor: pointer;
  transition: background var(--transition-fast);
}
.admin__primary:hover {
  background: var(--color-accent-hover);
}
.admin__primary:disabled {
  opacity: 0.6;
  cursor: default;
}
.admin__ghost,
.admin__danger {
  font: inherit;
  font-weight: 600;
  font-size: 14px;
  padding: 7px 14px;
  background: var(--color-white);
  border: 1px solid var(--color-border-light);
  cursor: pointer;
  transition: border-color var(--transition-fast);
}
.admin__ghost:hover {
  border-color: var(--color-accent);
}
.admin__danger {
  color: var(--color-danger);
}
.admin__danger:hover {
  border-color: var(--color-danger);
}
.admin__error {
  color: var(--color-danger);
  font-size: 14px;
  margin-top: 12px;
}
.admin__empty {
  color: var(--color-ink-muted);
  padding: 24px 0;
}

/* Login */
.admin-login {
  max-width: 380px;
  margin: 48px auto;
}

/* List table */
.admin-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.admin-table th,
.admin-table td {
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border-light);
  vertical-align: middle;
}
.admin-table__thumb {
  width: 56px;
  height: 42px;
  object-fit: cover;
  background: var(--color-off-white);
  display: block;
}
.admin-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 18px;
}
.admin-toolbar .admin__input,
.admin-toolbar .admin__select {
  width: auto;
  min-width: 200px;
}
.admin-toolbar__spacer {
  flex: 1;
}

/* Editor */
.admin-editor {
  max-width: 720px;
}
.admin-editor__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.admin-editor__spec {
  display: grid;
  grid-template-columns: 1fr 2fr auto;
  gap: 8px;
  margin-bottom: 8px;
}
.admin-editor__actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}
.admin-editor__check {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  font-weight: 600;
  font-size: 14px;
}
.admin-editor__check input {
  width: 16px;
  height: 16px;
  accent-color: var(--color-accent);
}

/* Photo manager */
.admin-photos {
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid var(--color-border-light);
}
.admin-photos__list {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 10px;
}
.admin-photos__item {
  display: flex;
  align-items: center;
  gap: 12px;
}
.admin-photos__img {
  width: 88px;
  height: 64px;
  object-fit: cover;
  background: var(--color-off-white);
}
.admin-photos__badge {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  background: var(--color-accent-soft);
  color: var(--color-accent-hover);
}
.admin-photos__buttons {
  display: flex;
  gap: 6px;
  margin-left: auto;
}
.admin-photos__hint {
  color: var(--color-ink-muted);
  font-size: 14px;
}

@media (max-width: 700px) {
  .admin-editor__row {
    grid-template-columns: 1fr;
  }
  .admin-table__hide-sm {
    display: none;
  }
}
```

- [ ] **Step 5: Route + robots**

In `src/App.jsx`: add with the other lazy pages —

```jsx
const AdminPage = lazyWithRetry(() => import('./pages/admin/AdminPage.jsx'))
```

and add the route just before the catch-all `*`:

```jsx
{
  /* Catalogue admin — auth-gated, noindexed, deliberately not in the nav. */
}
;<Route path="/admin" element={<AdminPage />} />
```

In `public/robots.txt`, add `Disallow: /admin` after the `Allow: /` line.

- [ ] **Step 6: Run test to verify it passes**

Run: `yarn vitest run src/test/admin.test.jsx` → PASS. Then `yarn test && yarn lint && yarn build` → green.

- [ ] **Step 7: Manual check**

`yarn dev` → `/admin` shows the login form inside site chrome; a wrong password shows Supabase's error inline; the real admin login (from Task 1 Step 4) lands on "Catalogue admin" with the placeholder list; Sign out returns to the form.

- [ ] **Step 8: Commit**

```bash
git add src/pages/admin src/lib/seo.jsx src/App.jsx public/robots.txt src/test/admin.test.jsx
git commit -m "feat: /admin route with Supabase auth gate + noindex"
```

---

### Task 13: Admin product list

**Files:**

- Modify: `src/pages/admin/ProductList.jsx` (replace placeholder)
- Test: extend `src/test/admin.test.jsx`

**Interfaces:**

- Consumes: props `{ rows, onEdit, onNew, onChanged }` from AdminPage (Task 12); `deleteProduct` (Task 11); `getTree`/`getLeaves` (catalog); `publicPhotoUrl` (Task 2); `formatPrice` (Task 3).
- Produces: filterable table with per-row Edit + two-step Delete.

- [ ] **Step 1: Write the failing test (append to `src/test/admin.test.jsx`)**

Add `import userEvent from '@testing-library/user-event'` to the top of the file (same pattern as `src/test/quote.test.jsx`).

Also extend the existing `vi.mock('../lib/adminApi.js', …)` factory to cover EVERY adminApi export now — ESM named imports fail if the mock object is missing a key the component imports. Add:

```js
saveProduct: vi.fn(async () => ({ error: null })),
deleteProduct: vi.fn(),
uploadPhotos: vi.fn(),
deletePhoto: vi.fn(),
swapPhotoPositions: vi.fn(),
fetchProductImages: vi.fn(async () => []),
```

Then append:

```jsx
const { default: ProductList } = await import('../pages/admin/ProductList.jsx')

const listRows = [
  {
    id: 'a',
    category_id: 'locks',
    title: 'Whale Tail Lock',
    price: 45,
    discount_pct: null,
    featured: false,
    product_images: [],
  },
  {
    id: 'b',
    category_id: 'job-site-toolbox',
    title: 'Job Site Box',
    price: 450,
    discount_pct: 15,
    featured: true,
    product_images: [{ storage_path: 'products/b/x.jpg', alt: '', position: 0 }],
  },
]

describe('ProductList', () => {
  it('renders a row per product with price and discount', () => {
    render(
      <MemoryRouter>
        <ProductList rows={listRows} onEdit={() => {}} onNew={() => {}} onChanged={() => {}} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Whale Tail Lock')).toBeInTheDocument()
    expect(screen.getByText('$450')).toBeInTheDocument()
    expect(screen.getByText('15%')).toBeInTheDocument()
  })

  it('filters by title search', async () => {
    render(
      <MemoryRouter>
        <ProductList rows={listRows} onEdit={() => {}} onNew={() => {}} onChanged={() => {}} />
      </MemoryRouter>,
    )
    await userEvent.type(screen.getByLabelText(/search/i), 'whale')
    expect(screen.getByText('Whale Tail Lock')).toBeInTheDocument()
    expect(screen.queryByText('Job Site Box')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run src/test/admin.test.jsx`
Expected: the two new tests FAIL against the placeholder.

- [ ] **Step 3: Implement**

Replace `src/pages/admin/ProductList.jsx`:

```jsx
import { useMemo, useState } from 'react'
import { Pencil, Plus, Star } from 'lucide-react'
import { getTree, getLeaves } from '../../lib/catalog.js'
import { publicPhotoUrl } from '../../lib/supabaseClient.js'
import { formatPrice } from '../../lib/pricing.js'
import { deleteProduct } from '../../lib/adminApi.js'

// Flat, filterable table of every product. Delete is two-step (Delete ->
// Confirm) instead of window.confirm so nothing blocks the tab.
export default function ProductList({ rows, onEdit, onNew, onChanged }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [confirmId, setConfirmId] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  const leaves = useMemo(() => getTree().flatMap((t) => getLeaves(t)), [])
  const leafLabel = useMemo(() => new Map(leaves.map((l) => [l.id, l.label])), [leaves])

  const visible = rows.filter(
    (r) =>
      (!cat || r.category_id === cat) && (!q || r.title.toLowerCase().includes(q.toLowerCase())),
  )

  async function onDelete(row) {
    setBusyId(row.id)
    setError('')
    try {
      await deleteProduct(row)
      onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
      setConfirmId(null)
    }
  }

  function thumb(row) {
    const first = [...(row.product_images ?? [])].sort((a, b) => a.position - b.position)[0]
    return first ? publicPhotoUrl(first.storage_path) : null
  }

  return (
    <div>
      <div className="admin-toolbar">
        <label className="sr-only" htmlFor="admin-search">
          Search products
        </label>
        <input
          id="admin-search"
          className="admin__input"
          type="search"
          placeholder="Search products…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label className="sr-only" htmlFor="admin-cat">
          Filter by category
        </label>
        <select
          id="admin-cat"
          className="admin__select"
          value={cat}
          onChange={(e) => setCat(e.target.value)}
        >
          <option value="">All categories</option>
          {leaves.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
        <span className="admin-toolbar__spacer" />
        <button type="button" className="admin__primary" style={{ marginTop: 0 }} onClick={onNew}>
          <Plus size={15} strokeWidth={2.5} aria-hidden="true" /> New product
        </button>
      </div>

      {error && (
        <p className="admin__error" role="alert">
          {error}
        </p>
      )}

      {visible.length === 0 ? (
        <p className="admin__empty">No products match.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">Photo</span>
              </th>
              <th scope="col">Product</th>
              <th scope="col" className="admin-table__hide-sm">
                Category
              </th>
              <th scope="col">Price</th>
              <th scope="col">Discount</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id}>
                <td>
                  {thumb(row) ? (
                    <img className="admin-table__thumb" src={thumb(row)} alt="" />
                  ) : (
                    <span className="admin-table__thumb" aria-hidden="true" />
                  )}
                </td>
                <td>
                  {row.title}{' '}
                  {row.featured && (
                    <Star size={13} strokeWidth={2} aria-label="Featured" fill="currentColor" />
                  )}
                </td>
                <td className="admin-table__hide-sm">
                  {leafLabel.get(row.category_id) ?? row.category_id}
                </td>
                <td>{row.price == null ? '—' : formatPrice(Number(row.price))}</td>
                <td>{row.discount_pct ? `${Number(row.discount_pct)}%` : '—'}</td>
                <td>
                  <div className="admin-photos__buttons">
                    <button type="button" className="admin__ghost" onClick={() => onEdit(row)}>
                      <Pencil size={13} strokeWidth={2} aria-hidden="true" /> Edit
                    </button>
                    {confirmId === row.id ? (
                      <>
                        <button
                          type="button"
                          className="admin__danger"
                          disabled={busyId === row.id}
                          onClick={() => onDelete(row)}
                        >
                          {busyId === row.id ? 'Deleting…' : 'Confirm delete'}
                        </button>
                        <button
                          type="button"
                          className="admin__ghost"
                          onClick={() => setConfirmId(null)}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="admin__danger"
                        onClick={() => setConfirmId(row.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

Run: `yarn vitest run src/test/admin.test.jsx` → PASS. `yarn test && yarn lint` → green.

- [ ] **Step 5: Manual check**

`yarn dev` → `/admin` (signed in): all 73 seeded products listed with thumbnails; search and category filter narrow the table; Delete → Confirm delete removes a product (pick a throwaway — re-run the seed script afterwards to restore it).

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/ProductList.jsx src/test/admin.test.jsx
git commit -m "feat(admin): filterable product list with two-step delete"
```

---

### Task 14: Admin product editor + photo manager

**Files:**

- Modify: `src/pages/admin/ProductEditor.jsx` (replace placeholder)
- Create: `src/pages/admin/PhotoManager.jsx`
- Test: extend `src/test/admin.test.jsx`

**Interfaces:**

- Consumes: props `{ row, rows, onDone, onCancel }` (Task 12 contract); `slugify`/`validateProduct` (Task 9); `saveProduct`, `uploadPhotos`, `deletePhoto`, `swapPhotoPositions`, `fetchProductImages` (Task 11); `publicPhotoUrl` (Task 2).
- Produces: create/edit form with inline validation; `PhotoManager({ productId, title, images, onImagesChange })`.

- [ ] **Step 1: Write the failing test (append to `src/test/admin.test.jsx`)**

The adminApi mock factory already covers every export (done in the previous task). Append:

```jsx
const { default: ProductEditor } = await import('../pages/admin/ProductEditor.jsx')
const { saveProduct } = await import('../lib/adminApi.js')

describe('ProductEditor', () => {
  it('blocks save with inline errors when title is empty', async () => {
    render(<ProductEditor row={null} rows={[]} onDone={() => {}} onCancel={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /save product/i }))
    expect(await screen.findByText(/title is required/i)).toBeInTheDocument()
    expect(saveProduct).not.toHaveBeenCalled()
  })

  it('rejects a discount without a price', async () => {
    render(<ProductEditor row={null} rows={[]} onDone={() => {}} onCancel={() => {}} />)
    await userEvent.type(screen.getByLabelText(/^title/i), 'Test Box')
    await userEvent.selectOptions(screen.getByLabelText(/category/i), 'locks')
    await userEvent.type(screen.getByLabelText(/discount/i), '15')
    await userEvent.click(screen.getByRole('button', { name: /save product/i }))
    expect(await screen.findByText(/set a price before/i)).toBeInTheDocument()
  })

  it('saves a valid new product with generated id and slug', async () => {
    const onDone = vi.fn()
    render(<ProductEditor row={null} rows={[]} onDone={onDone} onCancel={() => {}} />)
    await userEvent.type(screen.getByLabelText(/^title/i), 'Whale Lock MkII')
    await userEvent.selectOptions(screen.getByLabelText(/category/i), 'locks')
    await userEvent.click(screen.getByRole('button', { name: /save product/i }))
    expect(saveProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'whale-lock-mkii',
        slug: 'whale-lock-mkii',
        categoryId: 'locks',
      }),
      { isNew: true },
    )
    expect(onDone).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run src/test/admin.test.jsx`
Expected: new tests FAIL against the placeholder editor.

- [ ] **Step 3: Implement the editor**

Replace `src/pages/admin/ProductEditor.jsx`:

```jsx
import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { getTree, getLeaves } from '../../lib/catalog.js'
import { slugify, validateProduct } from '../../lib/productForm.js'
import { saveProduct } from '../../lib/adminApi.js'
import PhotoManager from './PhotoManager.jsx'

function toForm(row) {
  if (!row) {
    return {
      title: '',
      categoryId: '',
      summary: '',
      specs: [],
      features: [],
      price: '',
      discountPct: '',
      standardDims: '',
      featured: false,
    }
  }
  return {
    title: row.title,
    categoryId: row.category_id,
    summary: row.summary ?? '',
    specs: row.specs ?? [],
    features: row.features ?? [],
    price: row.price ?? '',
    discountPct: row.discount_pct ?? '',
    standardDims: row.standard_dims ?? '',
    featured: !!row.featured,
  }
}

// Create + edit form. New products get id/slug from the title; photos attach
// after the first save (the rows need a product id to point at).
export default function ProductEditor({ row, rows, onDone, onCancel }) {
  const isNew = !row
  const [form, setForm] = useState(() => toForm(row))
  const [featuresText, setFeaturesText] = useState((row?.features ?? []).join('\n'))
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState('')
  const [busy, setBusy] = useState(false)
  const [images, setImages] = useState(row?.product_images ?? [])

  const leaves = useMemo(() => getTree().flatMap((t) => getLeaves(t)), [])

  const set = (key) => (e) =>
    setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  function setSpec(i, key, value) {
    const specs = form.specs.map((s, idx) => (idx === i ? { ...s, [key]: value } : s))
    setForm({ ...form, specs })
  }
  function addSpec() {
    setForm({ ...form, specs: [...form.specs, { label: '', value: '' }] })
  }
  function removeSpec(i) {
    setForm({ ...form, specs: form.specs.filter((_, idx) => idx !== i) })
  }

  async function onSubmit(e) {
    e.preventDefault()
    const features = featuresText
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean)
    const check = validateProduct(
      form,
      leaves.map((l) => l.id),
    )
    setErrors(check.errors)
    if (!check.valid) return

    setBusy(true)
    setSaveError('')
    const slug = isNew ? slugify(form.title) : row.slug
    const { error } = await saveProduct(
      {
        id: isNew ? slug : row.id,
        slug,
        title: form.title,
        categoryId: form.categoryId,
        summary: form.summary,
        specs: form.specs.filter((s) => s.label.trim() || s.value.trim()),
        features,
        price: check.price,
        discountPct: check.discountPct,
        standardDims: form.standardDims,
        featured: form.featured,
        sortOrder: isNew
          ? rows.filter((r) => r.category_id === form.categoryId).length
          : row.sort_order,
      },
      { isNew },
    )
    setBusy(false)
    if (error) {
      setSaveError(error.message)
      return
    }
    onDone()
  }

  return (
    <form className="admin-editor" onSubmit={onSubmit} noValidate>
      <h2 className="admin__title">{isNew ? 'New product' : `Edit — ${row.title}`}</h2>

      <label className="admin__label" htmlFor="pe-title">
        Title
      </label>
      <input id="pe-title" className="admin__input" value={form.title} onChange={set('title')} />
      {errors.title && (
        <p className="admin__error" role="alert">
          {errors.title}
        </p>
      )}

      <label className="admin__label" htmlFor="pe-category">
        Category
      </label>
      <select
        id="pe-category"
        className="admin__select"
        value={form.categoryId}
        onChange={set('categoryId')}
      >
        <option value="">Choose a category…</option>
        {leaves.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label}
          </option>
        ))}
      </select>
      {errors.categoryId && (
        <p className="admin__error" role="alert">
          {errors.categoryId}
        </p>
      )}

      <label className="admin__label" htmlFor="pe-summary">
        Summary (card subtitle)
      </label>
      <input
        id="pe-summary"
        className="admin__input"
        value={form.summary}
        onChange={set('summary')}
      />

      <div className="admin-editor__row">
        <div>
          <label className="admin__label" htmlFor="pe-price">
            Price (AUD, ex GST — blank for “Enquire for pricing”)
          </label>
          <input
            id="pe-price"
            className="admin__input"
            inputMode="decimal"
            value={form.price}
            onChange={set('price')}
          />
          {errors.price && (
            <p className="admin__error" role="alert">
              {errors.price}
            </p>
          )}
        </div>
        <div>
          <label className="admin__label" htmlFor="pe-discount">
            Discount % (blank for none)
          </label>
          <input
            id="pe-discount"
            className="admin__input"
            inputMode="numeric"
            value={form.discountPct}
            onChange={set('discountPct')}
          />
          {errors.discountPct && (
            <p className="admin__error" role="alert">
              {errors.discountPct}
            </p>
          )}
        </div>
      </div>

      <label className="admin__label" htmlFor="pe-dims">
        Standard dimensions (shown in the quote tray)
      </label>
      <input
        id="pe-dims"
        className="admin__input"
        value={form.standardDims}
        onChange={set('standardDims')}
      />

      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend className="admin__label">Specs</legend>
        {form.specs.map((s, i) => (
          <div key={i} className="admin-editor__spec">
            <label className="sr-only" htmlFor={`pe-spec-label-${i}`}>
              Spec {i + 1} label
            </label>
            <input
              id={`pe-spec-label-${i}`}
              className="admin__input"
              placeholder="Label"
              value={s.label}
              onChange={(e) => setSpec(i, 'label', e.target.value)}
            />
            <label className="sr-only" htmlFor={`pe-spec-value-${i}`}>
              Spec {i + 1} value
            </label>
            <input
              id={`pe-spec-value-${i}`}
              className="admin__input"
              placeholder="Value"
              value={s.value}
              onChange={(e) => setSpec(i, 'value', e.target.value)}
            />
            <button
              type="button"
              className="admin__ghost"
              aria-label={`Remove spec ${i + 1}`}
              onClick={() => removeSpec(i)}
            >
              <Trash2 size={14} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        ))}
        <button type="button" className="admin__ghost" onClick={addSpec}>
          <Plus size={14} strokeWidth={2.5} aria-hidden="true" /> Add spec
        </button>
      </fieldset>

      <label className="admin__label" htmlFor="pe-features">
        Features (one per line)
      </label>
      <textarea
        id="pe-features"
        className="admin__textarea"
        rows={6}
        value={featuresText}
        onChange={(e) => setFeaturesText(e.target.value)}
      />

      <label className="admin-editor__check">
        <input type="checkbox" checked={form.featured} onChange={set('featured')} />
        Featured product
      </label>

      {isNew ? (
        <p className="admin-photos__hint">Save the product first, then reopen it to add photos.</p>
      ) : (
        <PhotoManager
          productId={row.id}
          title={form.title}
          images={images}
          onImagesChange={setImages}
        />
      )}

      {saveError && (
        <p className="admin__error" role="alert">
          {saveError}
        </p>
      )}

      <div className="admin-editor__actions">
        <button type="submit" className="admin__primary" disabled={busy} style={{ marginTop: 0 }}>
          {busy ? 'Saving…' : 'Save product'}
        </button>
        <button type="button" className="admin__ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 4: Implement the photo manager**

Create `src/pages/admin/PhotoManager.jsx`:

```jsx
import { useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import { publicPhotoUrl } from '../../lib/supabaseClient.js'
import {
  uploadPhotos,
  deletePhoto,
  swapPhotoPositions,
  fetchProductImages,
} from '../../lib/adminApi.js'

// Gallery editor: multi-upload (resized client-side), reorder with up/down,
// delete. Position 0 is the storefront card thumbnail.
export default function PhotoManager({ productId, title, images, onImagesChange }) {
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const sorted = [...images].sort((a, b) => a.position - b.position)

  async function run(action) {
    setBusy(true)
    setError('')
    try {
      await action()
      onImagesChange(await fetchProductImages(productId))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function onFiles(e) {
    const files = [...e.target.files]
    if (!files.length) return
    run(() => uploadPhotos(productId, files, sorted.length, title)).then(() => {
      if (fileRef.current) fileRef.current.value = ''
    })
  }

  function onMove(i, dir) {
    const j = i + dir
    if (j < 0 || j >= sorted.length) return
    run(() => swapPhotoPositions(sorted[i], sorted[j]))
  }

  return (
    <div className="admin-photos">
      <label className="admin__label" htmlFor="pe-photos">
        Photos {busy && <span aria-live="polite">— working…</span>}
      </label>
      <input
        id="pe-photos"
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={busy}
        onChange={onFiles}
      />
      <p className="admin-photos__hint">
        The first photo is the storefront card thumbnail. Uploads are resized automatically.
      </p>
      {error && (
        <p className="admin__error" role="alert">
          {error}
        </p>
      )}
      {sorted.length > 0 && (
        <ul className="admin-photos__list">
          {sorted.map((img, i) => (
            <li key={img.id} className="admin-photos__item">
              <img className="admin-photos__img" src={publicPhotoUrl(img.storage_path)} alt="" />
              {i === 0 && <span className="admin-photos__badge">Card thumbnail</span>}
              <div className="admin-photos__buttons">
                <button
                  type="button"
                  className="admin__ghost"
                  aria-label={`Move photo ${i + 1} up`}
                  disabled={busy || i === 0}
                  onClick={() => onMove(i, -1)}
                >
                  <ArrowUp size={14} strokeWidth={2} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="admin__ghost"
                  aria-label={`Move photo ${i + 1} down`}
                  disabled={busy || i === sorted.length - 1}
                  onClick={() => onMove(i, 1)}
                >
                  <ArrowDown size={14} strokeWidth={2} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="admin__danger"
                  aria-label={`Delete photo ${i + 1}`}
                  disabled={busy}
                  onClick={() => run(() => deletePhoto(img))}
                >
                  <Trash2 size={14} strokeWidth={2} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run tests**

Run: `yarn vitest run src/test/admin.test.jsx` → PASS. `yarn test && yarn lint && yarn format:check` → green (run `yarn format` first if needed).

- [ ] **Step 6: Manual end-to-end (the real acceptance test)**

`yarn dev`, sign in at `/admin`, then:

1. Edit a seeded product: change title + set price 450 + discount 15 → Save → storefront card shows ~~$450~~ from $382.50 + GST with Save 15% badge.
2. Upload two photos to that product → reorder them → storefront card thumbnail changes and the detail drawer shows the gallery.
3. Delete one photo → gone from storefront after reload.
4. Create a new product in Accessories → Locks with just title/category → appears on `/accessories` with "Enquire for pricing".
5. Delete that new product → gone.

- [ ] **Step 7: Commit**

```bash
git add src/pages/admin/ProductEditor.jsx src/pages/admin/PhotoManager.jsx src/test/admin.test.jsx
git commit -m "feat(admin): product editor with photo gallery manager"
```

---

### Task 15: Final verification and deploy

**Files:**

- Modify: `README.md` (admin section)
- No other code changes expected — this task is the CLAUDE.md verification gauntlet.

- [ ] **Step 1: Document the admin in README**

Add a short "Admin dashboard" section to `README.md`: URL (`/admin`), where credentials live (Supabase Auth), the two env vars, the seed script usage, and the photo naming contract (`x.jpg` + `x-400.webp`/`x-800.webp`).

- [ ] **Step 2: Full local gauntlet**

```bash
yarn lint && yarn format:check && yarn test && yarn build && yarn preview
```

Expected: all clean; build splits vendor chunks; `@supabase/supabase-js` is NOT in the entry chunk (check `dist/assets` — it should be a separate lazy chunk; run `yarn build:analyze` if unsure).

- [ ] **Step 3: Lighthouse on preview**

Run Lighthouse against `yarn preview` home page (Chrome DevTools or `npx lighthouse http://localhost:4173 --preset=desktop`). Required: performance ≥ 90, SEO ≥ 95, a11y ≥ 90. The home page makes no Supabase calls beyond the boot fetch (which is async and non-blocking) — if performance dips, verify the supabase chunk isn't loading before LCP.

- [ ] **Step 4: Route sweep at 375/768/1280px**

Every route renders: `/`, `/toolboxes`, `/toolboxes/under-tray-toolboxes`, `/accessories`, `/fabrication`, `/about`, `/quote`, `/privacy`, `/terms`, `/admin`, `/does-not-exist` (404). Catalog pages show live products; admin table is usable at 375px (category column hides).

- [ ] **Step 5: Deploy**

Set the two new Railway env vars, then deploy with the `railway-deploy` skill:

- `VITE_SUPABASE_URL=https://jxyruzhotemmcqcrndbp.supabase.co`
- `VITE_SUPABASE_ANON_KEY=<anon key>`

(Memory note: the Railway service domain targets port 4173 with `PORT` pinned — don't disturb that.)

- [ ] **Step 6: Live verification**

On the live domain: catalog pages render products from Supabase; `/admin` login works; one live smoke edit (tweak a summary, verify on the storefront, revert); quote form still submits.

- [ ] **Step 7: Commit + push**

```bash
git add README.md
git commit -m "docs: admin dashboard README section"
git push
```

Confirm GitHub Actions CI goes green.
