# Admin-editable home carousel images — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the admin upload a standalone photo for each tile of the home page "Built for every adventure" carousel, falling back to the first product in that category when no photo has been uploaded.

**Architecture:** A new `category_images` table (one row per category, keyed by `category_id`) stores a path into the existing `product-photos` bucket under a `categories/` prefix, reusing the JPEG-master + WebP-derivative contract that product photos already use. `productStore` fetches it alongside products in the same session load; `catalog.js` owns the fallback rule and is the only read surface components touch. The admin gets a new card on `/admin` that uploads, replaces and removes those photos.

**Tech Stack:** React 18, Vite 5, plain CSS with CSS variables, Supabase (Postgres + Storage), Vitest + Testing Library, ESLint flat config + Prettier.

**Spec:** `docs/superpowers/specs/2026-07-28-admin-carousel-images-design.md`

## Status: PARKED — blocked on the promo-banner plan (decided 2026-07-28)

Do not execute this plan until `docs/superpowers/plans/2026-07-28-promo-banner.md`
Tasks 2–6 have landed. That plan modifies `src/lib/adminApi.js`,
`src/pages/admin/AdminPage.jsx`, `src/pages/admin/Admin.css` and
`src/pages/admin/StatCards.jsx` — the same files **this** plan's Tasks 2 and 6
modify. Running both concurrently means two implementers editing the same files
from different plans.

Two things to re-check when unparking, because the repo moved after this plan was
written:

- **Migration number.** Already corrected from `0005` to `0006` — `0005_promo_banner.sql`
  is committed at `57daadc`. Confirm `0006` is still free before Task 1.
- **`src/test/content.test.js` line numbers.** Task 5 cites `:90-103` for the
  homeCarousel test; the in-flight hero rewrite added ~9 lines above it. The task
  quotes the full replacement test, so locate it by content, not by line number.

Billy's decision on applying the migration when this does run: **apply it via the
Supabase MCP** (`mcp__supabase__apply_migration`), not by hand — Task 1, Step 6.

## Global Constraints

- **No Tailwind, no styled-components, no TypeScript.** Plain CSS + CSS variables, JSX only.
- **Never write raw hex or rem in component CSS.** Only tokens exposed by `src/config/theme.config.js` via `applyTheme.js`. Available: `--color-white`, `--color-off-white`, `--color-bg`, `--color-ink`, `--color-ink-strong`, `--color-ink-muted`, `--color-gray-muted`, `--color-border-light`, `--color-accent`, `--color-accent-hover`, `--color-accent-soft`, `--color-danger`, `--radius-none|sm|md|lg|full`, `--shadow-sm|md|lg`, `--transition-fast|base`, `--font-display|body|mono`.
- **Never hardcode client strings in components** — they come from `src/config/` or `src/content/`.
- **Category ids are validated app-side, never by FK.** Categories live in `src/data/categories.js`, not the DB.
- **Every admin write ends with `retryLoad()`** so an open storefront tab reflects the change without a reload.
- **Run `yarn lint && yarn format:check && yarn test` before each commit.** CI (`.github/workflows/ci.yml`) gates on lint (incl. jsx-a11y), format, tests (incl. axe), build, and Lighthouse (performance ≥ 90, SEO ≥ 95, a11y ≥ 90).
- **Do not commit or push unless Billy explicitly asks.** The `git commit` steps below are written out so they're ready to run, but confirm before running them.

---

### Task 1: Migration + storage path helper

Adds the table and the path builder that later tasks upload to. Nothing user-visible yet.

**Files:**

- Create: `supabase/migrations/0006_category_images.sql`
- Modify: `src/lib/imageResize.js:11-17`
- Test: `src/test/imageResize.test.js`

**Interfaces:**

- Consumes: nothing.
- Produces: `categoryPhotoPaths(categoryId, name) -> { jpeg: string, webp: [{ width: number, path: string }] }` — used by Task 2. Table `public.category_images (category_id text pk, storage_path text, updated_at timestamptz)`.

- [ ] **Step 1: Write the failing test**

Add to `src/test/imageResize.test.js`. Note the import line at the top must gain `categoryPhotoPaths`:

```js
import { photoPaths, categoryPhotoPaths, DERIVATIVE_WIDTHS } from '../lib/imageResize.js'
```

```js
describe('categoryPhotoPaths', () => {
  it('builds carousel-tile paths under categories/, same derivative naming', () => {
    const p = categoryPhotoPaths('under-tray-toolboxes', 'a1b2c3')
    expect(p.jpeg).toBe('categories/under-tray-toolboxes/a1b2c3.jpg')
    expect(p.webp).toEqual([
      { width: 400, path: 'categories/under-tray-toolboxes/a1b2c3-400.webp' },
      { width: 800, path: 'categories/under-tray-toolboxes/a1b2c3-800.webp' },
    ])
  })

  it('keeps the product path contract untouched', () => {
    expect(photoPaths('x', 'y').jpeg).toBe('products/x/y.jpg')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test src/test/imageResize.test.js`
Expected: FAIL — `categoryPhotoPaths is not a function`.

- [ ] **Step 3: Write minimal implementation**

Replace `src/lib/imageResize.js:11-17` (the whole existing `photoPaths` function) with:

```js
// Both photo kinds share one derivative contract (`<name>.jpg` plus
// `<name>-400.webp` / `<name>-800.webp` beside it) so <Img> can build a srcset
// from the JPEG path alone, with no manifest to keep in sync.
function pathsFor(base) {
  return {
    jpeg: `${base}.jpg`,
    webp: DERIVATIVE_WIDTHS.map((width) => ({ width, path: `${base}-${width}.webp` })),
  }
}

export function photoPaths(productId, name) {
  return pathsFor(`products/${productId}/${name}`)
}

// Home-carousel tile photos. Keyed by category, not product — a tile photo is
// deliberately standalone, so it needs no product to hang off.
export function categoryPhotoPaths(categoryId, name) {
  return pathsFor(`categories/${categoryId}/${name}`)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test src/test/imageResize.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the migration**

Create `supabase/migrations/0006_category_images.sql`:

```sql
-- 0006: standalone photos for the home carousel's category tiles.
-- One optional photo per category. The tile is NOT tied to a product — this is
-- an image the admin uploads directly. When no row exists, the storefront falls
-- back to the first product in that category (see lib/catalog.js).
--
-- category_id matches an id in src/data/categories.js. Validated app-side, not
-- by FK — categories live in code, not the DB (same convention as
-- products.category_id).
--
-- Files land in the existing `product-photos` bucket under a `categories/`
-- prefix, so no new bucket or storage policy is needed.

create table public.category_images (
  category_id  text primary key,
  storage_path text not null,
  updated_at   timestamptz not null default now()
);

create trigger category_images_updated_at
  before update on public.category_images
  for each row execute function public.set_updated_at();

alter table public.category_images enable row level security;

create policy "public read category_images" on public.category_images
  for select using (true);
create policy "admin write category_images" on public.category_images
  for all to authenticated using (true) with check (true);
```

- [ ] **Step 6: Apply the migration**

Apply against the Supabase project (via the Supabase MCP `apply_migration`, the dashboard SQL editor, or `supabase db push` — whichever Billy uses for the earlier `000x_*.sql` files). Confirm with a `select * from public.category_images;` returning zero rows and no error.

**Note:** `public.set_updated_at()` already exists — it was created in `0001_catalog.sql`. If the migration errors on the trigger, that function is missing and 0001 has not been applied.

- [ ] **Step 7: Run the full suite and commit**

```bash
yarn lint && yarn format:check && yarn test
git add supabase/migrations/0006_category_images.sql src/lib/imageResize.js src/test/imageResize.test.js
git commit -m "feat(admin): add category_images table and carousel photo paths"
```

---

### Task 2: Admin API — fetch, upload, delete category images

The Supabase CRUD surface the admin card will call. Still nothing user-visible.

**Files:**

- Modify: `src/lib/adminApi.js` (add import of `categoryPhotoPaths` at line 2; append three functions at the end)
- Test: `src/test/adminApi.test.js`

**Interfaces:**

- Consumes: `categoryPhotoPaths(categoryId, name)` from Task 1; existing `processPhoto(file)`, `storageFilesFor(image)`, `client()`, `BUCKET`, `retryLoad()`.
- Produces:
  - `fetchCategoryImages() -> Promise<Array<{ category_id: string, storage_path: string }>>`
  - `uploadCategoryImage(categoryId: string, file: File) -> Promise<void>`
  - `deleteCategoryImage(row: { category_id: string, storage_path: string }) -> Promise<void>`

- [ ] **Step 1: Write the failing test**

Append to `src/test/adminApi.test.js`. First extend the shared mock — `tableApi` needs `upsert` and a `maybeSingle` on select, and the import line needs the three new functions:

```js
// In tableApi(table), alongside insert/update/delete/select:
    upsert: vi.fn((row) => {
      calls.upserts.push({ table, row })
      return Promise.resolve({ error: null })
    }),
```

```js
// Replace the existing `select` entry in tableApi with one that also supports
// the single-row read uploadCategoryImage does before replacing a photo.
    select: vi.fn(() => ({
      order: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      eq: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        maybeSingle: vi.fn(() => Promise.resolve({ data: existingCategoryImage, error: null })),
      })),
    })),
```

Add above `const fakeClient`:

```js
// Swapped per-test so "replace an existing photo" can assert the old files are
// swept; null means "no photo yet".
let existingCategoryImage = null
```

Extend the import:

```js
const {
  saveProduct,
  deletePhoto,
  deleteProduct,
  setProductHidden,
  uploadCategoryImage,
  deleteCategoryImage,
} = await import('../lib/adminApi.js')
```

`uploadCategoryImage` calls `processPhoto`, which needs `createImageBitmap` and canvas — neither exists in jsdom. Mock the module (place this beside the other `vi.mock` calls, before the dynamic import):

```js
vi.mock('../lib/imageResize.js', async (importOriginal) => ({
  ...(await importOriginal()),
  // jsdom has no createImageBitmap/canvas encoder; the resize pipeline itself
  // is covered by imageResize.test.js, so stub just the browser-only part.
  processPhoto: vi.fn(async () => ({
    jpeg: new Blob(['jpeg']),
    variants: [
      { width: 400, blob: new Blob(['400']) },
      { width: 800, blob: new Blob(['800']) },
    ],
  })),
}))
```

Add `beforeEach(() => { existingCategoryImage = null })` to the existing `beforeEach` body.

Then the tests:

```js
describe('uploadCategoryImage', () => {
  it('upserts the row keyed by category, under the categories/ prefix', async () => {
    await uploadCategoryImage('under-tray-toolboxes', new File(['x'], 'x.jpg'))
    const up = calls.upserts.find((u) => u.table === 'category_images')
    expect(up.row.category_id).toBe('under-tray-toolboxes')
    expect(up.row.storage_path).toMatch(/^categories\/under-tray-toolboxes\/[a-f0-9]{8}\.jpg$/)
  })

  it('sweeps the previous photo files when replacing', async () => {
    existingCategoryImage = {
      category_id: 'under-tray-toolboxes',
      storage_path: 'categories/under-tray-toolboxes/old.jpg',
    }
    await uploadCategoryImage('under-tray-toolboxes', new File(['x'], 'x.jpg'))
    expect(calls.removed).toEqual([
      'categories/under-tray-toolboxes/old.jpg',
      'categories/under-tray-toolboxes/old-400.webp',
      'categories/under-tray-toolboxes/old-800.webp',
    ])
  })

  it('removes nothing when there was no previous photo', async () => {
    await uploadCategoryImage('locks', new File(['x'], 'x.jpg'))
    expect(calls.removed).toHaveLength(0)
  })
})

describe('deleteCategoryImage', () => {
  it('removes the JPEG and both WebP derivatives, then the row', async () => {
    await deleteCategoryImage({
      category_id: 'locks',
      storage_path: 'categories/locks/a.jpg',
    })
    expect(calls.removed).toEqual([
      'categories/locks/a.jpg',
      'categories/locks/a-400.webp',
      'categories/locks/a-800.webp',
    ])
    expect(calls.deletes[0]).toMatchObject({
      table: 'category_images',
      col: 'category_id',
      val: 'locks',
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test src/test/adminApi.test.js`
Expected: FAIL — `uploadCategoryImage is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `src/lib/adminApi.js`, extend the import on line 2:

```js
import { processPhoto, photoPaths, categoryPhotoPaths } from './imageResize.js'
```

Append at the end of the file:

```js
// --- Home-carousel tile photos -------------------------------------------
// One optional photo per category, independent of any product. When a category
// has no row the storefront falls back to its first product's photo, so these
// writes are never destructive to the carousel — a missing tile photo still
// renders something.

export async function fetchCategoryImages() {
  const c = await client()
  const { data, error } = await c.from('category_images').select('category_id, storage_path')
  if (error) throw new Error(error.message)
  return data
}

export async function uploadCategoryImage(categoryId, file) {
  const c = await client()
  // The row is keyed by category, so a replace would orphan the old files —
  // sweep them first. Best-effort, same as deleteProduct: the DB row is the
  // source of truth and orphaned objects are harmless.
  const { data: existing } = await c
    .from('category_images')
    .select('storage_path')
    .eq('category_id', categoryId)
    .maybeSingle()
  if (existing?.storage_path) {
    await c.storage.from(BUCKET).remove(storageFilesFor(existing))
  }

  const { jpeg, variants } = await processPhoto(file)
  const name = crypto.randomUUID().slice(0, 8)
  const paths = categoryPhotoPaths(categoryId, name)
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

  const { error } = await c
    .from('category_images')
    .upsert({ category_id: categoryId, storage_path: paths.jpeg })
  if (error) throw new Error(error.message)
  retryLoad()
}

export async function deleteCategoryImage(row) {
  const c = await client()
  await c.storage.from(BUCKET).remove(storageFilesFor(row))
  const { error } = await c.from('category_images').delete().eq('category_id', row.category_id)
  if (error) throw new Error(error.message)
  retryLoad()
}
```

`storageFilesFor` (already at `src/lib/adminApi.js:136`) takes anything with a `storage_path` and derives the three files — it works unchanged for category rows.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test src/test/adminApi.test.js`
Expected: PASS — existing tests plus the 4 new ones.

- [ ] **Step 5: Commit**

```bash
yarn lint && yarn format:check && yarn test
git add src/lib/adminApi.js src/test/adminApi.test.js
git commit -m "feat(admin): category image upload/delete API"
```

---

### Task 3: productStore reads category_images

Puts the uploaded paths into the storefront store, in the same session load as products.

**Files:**

- Modify: `src/lib/productStore.js:11` (initial state), `:72-83` (beside `fetchStoreDiscount`), `:87-111` (`loadProducts`), and add an accessor near `:117`
- Test: `src/test/productStore.test.js`

**Interfaces:**

- Consumes: nothing from earlier tasks (the table from Task 1 exists, but the fetch degrades gracefully if it doesn't).
- Produces: `getCategoryImages() -> Record<string, string>` (category id → storage path) — used by Task 4. Store state gains `categoryImages`.

- [ ] **Step 1: Write the failing test**

In `src/test/productStore.test.js`, extend the `vi.mock` factory so `from('category_images')` resolves. Add above the mock:

```js
const categoryImageRows = [
  { category_id: 'under-tray-toolboxes', storage_path: 'categories/under-tray-toolboxes/tile.jpg' },
]
```

Then change the mock's `from` from `from: () => ({...})` to a table-aware version. Only `category_images` needs a branch — `store_settings` currently falls through to the default shape, throws on the missing `.maybeSingle`, and is caught by `fetchStoreDiscount`'s own try/catch, which is existing behaviour worth leaving alone:

```js
      from: (table) =>
        table === 'category_images'
          ? { select: () => Promise.resolve({ data: categoryImageRows, error: null }) }
          : {
              select: () => ({
                eq: (...args) => {
                  eqMock(...args)
                  return {
                    order: () => ({
                      order: () => Promise.resolve({ data: productRows, error: null }),
                    }),
                  }
                },
              }),
            },
```

Extend the import:

```js
const {
  normalizeRow,
  loadProducts,
  getProducts,
  getStatus,
  getCategoryImages,
  __setStateForTests,
} = await import('../lib/productStore.js')
```

Add the tests:

```js
describe('category images', () => {
  it('loadProducts lands them keyed by category id', async () => {
    await loadProducts({ force: true })
    expect(getCategoryImages()).toEqual({
      'under-tray-toolboxes': 'categories/under-tray-toolboxes/tile.jpg',
    })
  })

  it('reads as empty when the state predates the column', () => {
    // __setStateForTests callers elsewhere omit categoryImages entirely; the
    // accessor must not hand back undefined and break the carousel.
    __setStateForTests({ status: 'ready', products: [] })
    expect(getCategoryImages()).toEqual({})
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test src/test/productStore.test.js`
Expected: FAIL — `getCategoryImages is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `src/lib/productStore.js`:

Line 11 — seed the new key:

```js
let state = { status: 'idle', products: [], categoryImages: {} }
```

After `fetchStoreDiscount` (i.e. after line 83), add:

```js
// Admin-uploaded photos for the home carousel's category tiles, keyed by
// category id. Best-effort like the store discount: a failure (table missing on
// an environment that hasn't run 0006, offline) means "no custom tile photos"
// rather than failing the whole catalogue load.
async function fetchCategoryImages(supabase) {
  try {
    const { data, error } = await supabase
      .from('category_images')
      .select('category_id, storage_path')
    if (error) return {}
    return Object.fromEntries((data ?? []).map((r) => [r.category_id, r.storage_path]))
  } catch {
    return {}
  }
}
```

In `loadProducts`, replace **all three** early-return error calls — `setState({ status: 'error', products: [] })`, one per bail-out (not configured / no client / query failed) — with:

```js
setState({ status: 'error', products: [], categoryImages: {} })
```

Then replace the two lines that currently fetch the discount and set the ready state:

```js
// Both are independent of the product fetch, so run them together rather than
// paying two serial round trips on every cold load.
const [storeDiscountPct, categoryImages] = await Promise.all([
  fetchStoreDiscount(supabase),
  fetchCategoryImages(supabase),
])
setState({
  status: 'ready',
  products: data.map((row) => normalizeRow(row, storeDiscountPct)),
  categoryImages,
})
```

After `getProducts()` (line 119), add:

```js
// `?? {}` because tests (and any older caller) seed state via
// __setStateForTests without this key.
export function getCategoryImages() {
  return state.categoryImages ?? {}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test src/test/productStore.test.js`
Expected: PASS. Then `yarn test` — `catalogLive.test.jsx` seeds state without `categoryImages` and must still pass.

- [ ] **Step 5: Commit**

```bash
yarn lint && yarn format:check && yarn test
git add src/lib/productStore.js src/test/productStore.test.js
git commit -m "feat: load category tile images with the catalogue"
```

---

### Task 4: The fallback resolver in catalog.js

The single rule both the storefront and the admin use to decide a tile's photo.

**Files:**

- Modify: `src/lib/catalog.js:8-9` (imports) and append two functions
- Test: `src/test/catalogLive.test.jsx`

**Interfaces:**

- Consumes: `getCategoryImages()` (Task 3); existing `getCategoryById`, `getLeaves`, `getProducts`, `publicPhotoUrl`.
- Produces:
  - `firstProductImageIn(categoryId: string, products?: Array<{ categoryId: string, img: string|null }>) -> string | null`
  - `getCategoryTileImage(categoryId: string) -> string | null`

  Both used by Task 5 (carousel) and Task 6 (admin card).

- [ ] **Step 1: Write the failing test**

In `src/test/catalogLive.test.jsx`, extend the `catalog.js` import with `firstProductImageIn` and `getCategoryTileImage`, and the `productStore.js` import with `getCategoryImages` is **not** needed — state is seeded directly. Add:

```js
describe('carousel tile images', () => {
  const rows = [
    // No photo — must be skipped, not treated as "the first product has none".
    { id: 'no-pic', category_id: 'locks', title: 'No Pic', slug: 'no-pic', product_images: [] },
    {
      id: 'has-pic',
      category_id: 'locks',
      title: 'Has Pic',
      slug: 'has-pic',
      product_images: [{ storage_path: 'products/has-pic/a.jpg', alt: '', position: 0 }],
    },
  ]

  it('prefers an admin upload over any product photo', () => {
    __setStateForTests({
      status: 'ready',
      products: rows.map(normalizeRow),
      categoryImages: { locks: 'categories/locks/tile.jpg' },
    })
    expect(getCategoryTileImage('locks')).toBe('https://cdn.test/categories/locks/tile.jpg')
  })

  it('falls back to the first product with a photo, skipping photo-less ones', () => {
    __setStateForTests({ status: 'ready', products: rows.map(normalizeRow), categoryImages: {} })
    expect(getCategoryTileImage('locks')).toBe('https://cdn.test/products/has-pic/a.jpg')
  })

  it('resolves a parent node through its leaves — the Accessories tile', () => {
    // `accessories` is a parent, not a leaf; its products are filed under
    // `locks`. getProductsForLeaf('accessories') would find nothing.
    __setStateForTests({ status: 'ready', products: rows.map(normalizeRow), categoryImages: {} })
    expect(getCategoryTileImage('accessories')).toBe('https://cdn.test/products/has-pic/a.jpg')
  })

  it('returns null for an empty category and for an unknown one', () => {
    __setStateForTests({ status: 'ready', products: [], categoryImages: {} })
    expect(getCategoryTileImage('locks')).toBeNull()
    expect(getCategoryTileImage('not-a-category')).toBeNull()
  })

  it('honours the caller’s array order so the admin preview matches the storefront', () => {
    const supplied = [
      { categoryId: 'locks', img: 'https://cdn.test/second.jpg' },
      { categoryId: 'locks', img: 'https://cdn.test/first.jpg' },
    ]
    expect(firstProductImageIn('locks', supplied)).toBe('https://cdn.test/second.jpg')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test src/test/catalogLive.test.jsx`
Expected: FAIL — `getCategoryTileImage is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `src/lib/catalog.js`, extend the imports at lines 8-9:

```js
import { categories } from '../data/categories.js'
import { getProducts, getCategoryImages } from './productStore.js'
import { publicPhotoUrl } from './supabaseClient.js'
```

Append at the end of the file:

```js
// --- Home-carousel tile photos -------------------------------------------

// The first product photo under a category, in the caller's array order. A
// parent node resolves through its leaves, so the Accessories tile finds a
// photo instead of coming up empty.
//
// `products` defaults to the live catalogue (already ordered sort_order then
// id, the same order the category page shows — so the tile matches what a
// visitor sees when they click it). The admin passes its own mapped rows,
// which is why this filters by leaf id rather than delegating to
// getProductsUnder: that helper reads getProducts() directly and would ignore
// the array handed in.
export function firstProductImageIn(categoryId, products = getProducts()) {
  const node = getCategoryById(categoryId)
  if (!node) return null
  const ids = new Set(getLeaves(node).map((l) => l.id))
  return products.find((p) => ids.has(p.categoryId) && p.img)?.img ?? null
}

// The photo for a home-carousel tile: an admin upload wins, otherwise the tile
// borrows its category's first product photo. null when neither exists — the
// carousel renders an empty media box rather than dropping the tile.
export function getCategoryTileImage(categoryId) {
  const uploaded = getCategoryImages()[categoryId]
  return uploaded ? publicPhotoUrl(uploaded) : firstProductImageIn(categoryId)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test src/test/catalogLive.test.jsx`
Expected: PASS (5 new tests).

- [ ] **Step 5: Commit**

```bash
yarn lint && yarn format:check && yarn test
git add src/lib/catalog.js src/test/catalogLive.test.jsx
git commit -m "feat: resolve carousel tile photos with a first-product fallback"
```

---

### Task 5: Wire the carousel to the resolver

First user-visible change: the home carousel stops reading hardcoded image paths and starts reading uploads-with-fallback. After this task the carousel works end to end on the read side, with the admin upload still to come.

**Files:**

- Modify: `src/content/homeCarousel.js` (whole file), `src/components/CategoryCarousel.jsx:1-44`
- Test: `src/test/content.test.js:90-103`

**Interfaces:**

- Consumes: `getCategoryTileImage(categoryId)` (Task 4), `useProductCatalog()` (existing).
- Produces: `homeCarousel` tiles of shape `{ label: string, categoryId: string, to: string }` — Task 6 maps over this same array.

- [ ] **Step 1: Write the failing test**

Replace the test at `src/test/content.test.js:90-103` with:

```js
it('homeCarousel tiles route to real categories and name a real category id', () => {
  expect(homeCarousel.length).toBeGreaterThanOrEqual(5)
  for (const tile of homeCarousel) {
    expect(tile.label).toBeTruthy()
    // Route must be a real category page: /accessories or /toolboxes/<slug>.
    const slug = tile.to.replace(/^\//, '').split('/').pop()
    expect(getCategoryBySlug(slug), `no category for route ${tile.to}`).toBeTruthy()
    // Photos come from the admin panel (category_images) with a first-product
    // fallback, so there is no image path to check on disk — but the id the
    // resolver keys on must exist in the tree.
    expect(getCategoryById(tile.categoryId), `no category for id ${tile.categoryId}`).toBeTruthy()
  }
})
```

Extend the import at `src/test/content.test.js:17`:

```js
import { getCategoryBySlug, getCategoryById } from '../lib/catalog.js'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test src/test/content.test.js`
Expected: FAIL — `getCategoryById(undefined)` returns undefined because tiles have no `categoryId` yet.

- [ ] **Step 3: Rewrite the content file**

Replace all of `src/content/homeCarousel.js`:

```js
// Home category carousel — the tile strip under the hero. One tile per
// mid-level product family, each linking to its category page.
//
// Photos are NOT listed here. Each tile's photo is uploaded per-category in
// the /admin panel (the `category_images` table); when a category has no
// upload, the tile borrows its first product's photo. See
// getCategoryTileImage() in src/lib/catalog.js.
//
// Contract (src/test/content.test.js): every `to` must resolve to a real
// catalog category slug, and every `categoryId` to a real category node.
//
// The component renders alt="" on purpose — the visible label already names
// the link, so a non-empty alt would double-announce it to screen readers.
// That's why no alt text is stored anywhere for these photos.

// Section header for the home range carousel (the component reads these — no
// hardcoded strings live in the component itself).
export const rangeSection = {
  eyebrow: 'Explore our range',
  heading: 'Built for every adventure',
}

export const homeCarousel = [
  {
    label: 'Camper & Trailer Boxes',
    categoryId: 'camper-trailer-boxes',
    to: '/toolboxes/camper-trailer-boxes',
  },
  { label: 'Canopies', categoryId: 'canopies', to: '/toolboxes/canopies' },
  { label: 'Dog Boxes', categoryId: 'dog-boxes', to: '/toolboxes/dog-boxes' },
  {
    label: 'Drawer Units',
    categoryId: 'toolbox-drawer-units',
    to: '/toolboxes/toolbox-drawer-units',
  },
  {
    label: 'Side Opening Toolboxes',
    categoryId: 'side-opening-toolboxes',
    to: '/toolboxes/side-opening-toolboxes',
  },
  {
    label: 'Top Opening Toolboxes',
    categoryId: 'top-opening-toolboxes',
    to: '/toolboxes/top-opening-toolboxes',
  },
  { label: 'Truck Boxes', categoryId: 'truck-boxes', to: '/toolboxes/truck-boxes' },
  {
    label: 'Under Tray Toolboxes',
    categoryId: 'under-tray-toolboxes',
    to: '/toolboxes/under-tray-toolboxes',
  },
  { label: 'Accessories', categoryId: 'accessories', to: '/accessories' },
]
```

- [ ] **Step 4: Rewire the component**

In `src/components/CategoryCarousel.jsx`, replace lines 1-5 (imports) with:

```jsx
import { Link } from 'react-router-dom'
import { homeCarousel, rangeSection } from '../content/homeCarousel.js'
import { getCategoryTileImage } from '../lib/catalog.js'
import { useProductCatalog } from '../lib/productStore.js'
import Eyebrow from './Eyebrow.jsx'
import Img from './Img.jsx'
import './CategoryCarousel.css'
```

Replace the `export default function CategoryCarousel() {` body down to the end of the `track` helper (lines 23-44) with:

```jsx
export default function CategoryCarousel() {
  // Subscribe so the strip repaints when the catalogue — and with it the
  // admin's tile photos — lands. main.jsx kicks the load off at boot, so
  // there's no load call to make here.
  useProductCatalog()

  const track = (hidden, key) => (
    <ul className="range__track" aria-hidden={hidden || undefined} key={key}>
      {homeCarousel.map((tile) => {
        const img = getCategoryTileImage(tile.categoryId)
        return (
          <li className="range__tile" key={tile.to}>
            <Link to={tile.to} className="range__card" tabIndex={hidden ? -1 : undefined}>
              {/* Kept even when there's no photo: .range__media is a flex item
                  with aspect-ratio 1/1, so the empty box holds the card's
                  shape and the belt stays exactly one-quarter of its width —
                  which is what the CSS keyframe's -100%/TRACK_COUNT assumes. */}
              <span className="range__media">
                {img && (
                  <Img
                    className="range__img"
                    src={img}
                    alt=""
                    sizes={TILE_SIZES}
                    width={400}
                    height={300}
                  />
                )}
              </span>
              <span className="range__label">{tile.label}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
```

Leave lines 46-62 (the `return`) unchanged.

- [ ] **Step 5: Run the tests**

Run: `yarn test`
Expected: PASS. Specifically:

- `content.test.js` — the rewritten tile contract.
- `components.test.jsx` (the loop at ~line 46) — **unchanged and must still pass**; it only reads `tile.label` and `tile.to`, never `tile.img`. It's the guard that the marquee still exposes exactly one link per tile.
- `a11y.test.jsx` — renders Home, so the carousel is under axe. An empty `<span className="range__media">` adds no role and must not introduce a violation.

- [ ] **Step 6: Check it in the browser**

Run `yarn dev`, open the home page. With products in the DB and no uploads yet, every tile should show its category's first product photo. Tiles for categories with no products render as an empty white square — the belt must still scroll smoothly with no gap or stutter.

- [ ] **Step 7: Commit**

```bash
yarn lint && yarn format:check && yarn test
git add src/content/homeCarousel.js src/components/CategoryCarousel.jsx src/test/content.test.js
git commit -m "feat(home): carousel tiles read admin photos with a product fallback"
```

---

### Task 6: The admin card

The upload UI. Completes the feature.

**Files:**

- Create: `src/pages/admin/CarouselImages.jsx`
- Modify: `src/pages/admin/Admin.css` (append), `src/pages/admin/AdminPage.jsx:7-8` (import) and `:82-89` (render)
- Test: `src/test/admin.test.jsx`

**Interfaces:**

- Consumes: `fetchCategoryImages()`, `uploadCategoryImage(categoryId, file)`, `deleteCategoryImage(row)` (Task 2); `firstProductImageIn(categoryId, products)` (Task 4); `publicPhotoUrl` (existing); `homeCarousel` (Task 5).
- Produces: `<CarouselImages rows={adminProductRows} />` — `rows` is the raw output of `fetchAdminProducts()`.

- [ ] **Step 1: Write the failing test**

In `src/test/admin.test.jsx`, add the three new functions to the `vi.mock('../lib/adminApi.js')` factory:

```js
  fetchCategoryImages: vi.fn(async () => []),
  uploadCategoryImage: vi.fn(async () => {}),
  deleteCategoryImage: vi.fn(async () => {}),
```

Append at the end of the file:

```js
const { default: CarouselImages } = await import('../pages/admin/CarouselImages.jsx')
const { homeCarousel } = await import('../content/homeCarousel.js')
const { fetchCategoryImages, uploadCategoryImage } = await import('../lib/adminApi.js')

const tileRows = [
  // Hidden — the storefront carousel never borrows a hidden product's photo,
  // so this must not become the Under Tray tile's preview.
  {
    id: 'hidden-one',
    category_id: 'under-tray-toolboxes',
    title: 'Hidden',
    sort_order: 0,
    hidden: true,
    product_images: [{ storage_path: 'products/hidden-one/a.jpg', position: 0 }],
  },
  {
    id: 'visible-one',
    category_id: 'under-tray-toolboxes',
    title: 'Visible',
    sort_order: 1,
    hidden: false,
    product_images: [{ storage_path: 'products/visible-one/a.jpg', position: 0 }],
  },
]

describe('CarouselImages', () => {
  it('renders one entry per carousel tile', async () => {
    render(<CarouselImages rows={[]} />)
    await waitFor(() => expect(fetchCategoryImages).toHaveBeenCalled())
    for (const tile of homeCarousel) {
      expect(screen.getByText(tile.label)).toBeInTheDocument()
    }
  })

  it('previews the first VISIBLE product photo as the fallback', async () => {
    render(<CarouselImages rows={tileRows} />)
    const tile = await screen.findByTestId('tile-under-tray-toolboxes')
    // Query the node directly, not getByRole('img') — the thumbnail is alt=""
    // (decorative, the label beside it names the tile), so it has no img role.
    expect(tile.querySelector('.admin-tile__img')).toHaveAttribute(
      'src',
      'https://cdn.test/products/visible-one/a.jpg',
    )
    expect(within(tile).getByText(/from first product/i)).toBeInTheDocument()
  })

  it('says No image when the category has no products and no upload', async () => {
    render(<CarouselImages rows={[]} />)
    const tile = await screen.findByTestId('tile-dog-boxes')
    expect(within(tile).getByText(/no image/i)).toBeInTheDocument()
    expect(tile.querySelector('.admin-tile__img')).toBeNull()
  })

  it('uploads the chosen file against the right category', async () => {
    const user = userEvent.setup()
    render(<CarouselImages rows={[]} />)
    const tile = await screen.findByTestId('tile-canopies')
    const input = within(tile).getByLabelText(/upload photo for canopies/i)
    // The input stays disabled until the mount fetch resolves; uploading to a
    // disabled input silently does nothing, so wait for it to enable first.
    await waitFor(() => expect(input).toBeEnabled())
    const file = new File(['x'], 'tile.jpg', { type: 'image/jpeg' })
    await user.upload(input, file)
    await waitFor(() => expect(uploadCategoryImage).toHaveBeenCalledWith('canopies', file))
  })
})
```

The `supabaseClient` mock at the top of `admin.test.jsx` already maps `publicPhotoUrl` to `https://cdn.test/<path>`, which is what the expected `src` values above rely on.

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test src/test/admin.test.jsx`
Expected: FAIL — cannot resolve `../pages/admin/CarouselImages.jsx`.

- [ ] **Step 3: Write the component**

Create `src/pages/admin/CarouselImages.jsx`:

```jsx
import { useEffect, useMemo, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { homeCarousel } from '../../content/homeCarousel.js'
import { firstProductImageIn } from '../../lib/catalog.js'
import { publicPhotoUrl } from '../../lib/supabaseClient.js'
import {
  fetchCategoryImages,
  uploadCategoryImage,
  deleteCategoryImage,
} from '../../lib/adminApi.js'

// Home-carousel tile photos. Each tile takes a standalone upload — no product
// involved. Without one, the tile falls back to its category's first product
// photo, so "Remove" is never destructive: something always renders.
//
// The tile list itself (which categories, their order, their labels) stays in
// src/content/homeCarousel.js — this card only edits photos.
export default function CarouselImages({ rows }) {
  const [images, setImages] = useState({}) // categoryId -> storage_path
  const [loaded, setLoaded] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  async function refresh() {
    const list = await fetchCategoryImages()
    setImages(Object.fromEntries(list.map((r) => [r.category_id, r.storage_path])))
    setLoaded(true)
  }

  useEffect(() => {
    // Mount load. Errors surface in the card rather than throwing — a broken
    // read here must not take the product table down with it.
    refresh().catch((err) => setError(err.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The admin holds raw DB rows; the fallback rule lives in catalog.js and
  // wants the storefront's shape. Map once, matching the storefront exactly:
  // hidden products are excluded (the carousel never shows them) and the order
  // is sort_order then id (what productStore loads), so "first product" means
  // the same thing on both sides.
  const catalogue = useMemo(
    () =>
      (rows ?? [])
        .filter((r) => !r.hidden)
        .slice()
        .sort(
          (a, b) =>
            (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.id).localeCompare(String(b.id)),
        )
        .map((r) => {
          const first = [...(r.product_images ?? [])].sort((a, b) => a.position - b.position)[0]
          return {
            categoryId: r.category_id,
            img: first ? publicPhotoUrl(first.storage_path) : null,
          }
        }),
    [rows],
  )

  async function run(categoryId, action) {
    setBusyId(categoryId)
    setError('')
    try {
      await action()
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  function onPick(categoryId, e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) run(categoryId, () => uploadCategoryImage(categoryId, file))
  }

  return (
    <div className="admin-card">
      <div className="admin-toolbar">
        <div>
          <span className="admin__label">Home carousel photos</span>
          <span className="admin__label-hint">
            One photo per tile in the “Built for every adventure” strip. No upload → the tile uses
            its category’s first product photo.
          </span>
        </div>
      </div>

      {error && (
        <p className="admin__error" role="alert">
          {error}
        </p>
      )}

      <ul className="admin-tiles">
        {homeCarousel.map((tile) => {
          const uploaded = images[tile.categoryId]
          const fallback = firstProductImageIn(tile.categoryId, catalogue)
          const src = uploaded ? publicPhotoUrl(uploaded) : fallback
          const busy = busyId === tile.categoryId
          const inputId = `tile-upload-${tile.categoryId}`
          return (
            <li
              className="admin-tile"
              key={tile.categoryId}
              data-testid={`tile-${tile.categoryId}`}
            >
              <span className="admin-tile__media">
                {src && <img className="admin-tile__img" src={src} alt="" />}
              </span>
              <span className="admin-tile__label">{tile.label}</span>
              <span className="admin-badge">
                {uploaded ? 'Custom' : src ? 'From first product' : 'No image'}
              </span>

              <div className="admin-tile__actions">
                <label className="admin__ghost admin-tile__upload" htmlFor={inputId}>
                  <ImagePlus size={14} strokeWidth={2} aria-hidden="true" />
                  {uploaded ? 'Replace' : 'Upload'}
                </label>
                <input
                  id={inputId}
                  className="sr-only"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label={`Upload photo for ${tile.label}`}
                  disabled={!loaded || busy}
                  onChange={(e) => onPick(tile.categoryId, e)}
                />
                {uploaded && (
                  <button
                    type="button"
                    className="admin__icon admin__icon--danger"
                    aria-label={`Remove photo for ${tile.label}`}
                    disabled={busy}
                    onClick={() =>
                      run(tile.categoryId, () =>
                        deleteCategoryImage({
                          category_id: tile.categoryId,
                          storage_path: uploaded,
                        }),
                      )
                    }
                  >
                    <Trash2 size={14} strokeWidth={2} aria-hidden="true" />
                  </button>
                )}
              </div>
              {busy && (
                <span className="admin-tile__status" role="status">
                  Working…
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4: Add the styles**

Append to `src/pages/admin/Admin.css`:

```css
/* Home-carousel tile photos — one cell per tile in src/content/homeCarousel.js. */
.admin-tiles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  margin: 0;
  padding: 20px;
  list-style: none;
}

.admin-tile {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
  padding: 12px;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
}

.admin-tile__media {
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: var(--color-off-white);
  border-radius: var(--radius-sm);
}

.admin-tile__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.admin-tile__label {
  font-weight: 600;
  line-height: 1.3;
  color: var(--color-ink);
}

.admin-tile__actions {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: auto;
  padding-top: 4px;
}

/* The upload control is a <label> driving a visually-hidden file input, so it
   needs the button chrome .admin__ghost gives plus explicit centring. */
.admin-tile__upload {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  cursor: pointer;
}

.admin-tile__status {
  font-size: 0.8rem;
  color: var(--color-ink-muted);
}
```

- [ ] **Step 5: Mount it on the admin page**

In `src/pages/admin/AdminPage.jsx`, add the import after line 7:

```jsx
import CarouselImages from './CarouselImages.jsx'
```

and render it inside `.admin__body`, immediately after the `<ProductList …/>` block (after line 88):

```jsx
<CarouselImages rows={rows} />
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `yarn test src/test/admin.test.jsx`
Expected: PASS, including the existing `has no axe violations on the dashboard` test — the new card is now inside that sweep, so a missing label or a bare `<li>` outside a list will fail it.

Then: `yarn test` (full suite).

- [ ] **Step 7: Verify in the browser**

`yarn dev`, sign in at `/admin`:

1. The card lists all nine tiles with **From first product** / **No image** badges.
2. Upload a photo to one tile → badge flips to **Custom**, thumbnail updates.
3. Open the home page in another tab → that tile shows the new photo (`retryLoad()` refreshes an open storefront tab).
4. Back in admin, **Remove** → badge returns to **From first product** and the tile reverts.
5. Tab through the card with the keyboard: every Upload control and Remove button is reachable and announces its tile.

- [ ] **Step 8: Full verification and commit**

```bash
yarn lint && yarn format:check && yarn test
yarn build && yarn preview
```

Run Lighthouse on the previewed home page — performance ≥ 90, SEO ≥ 95, a11y ≥ 90 (this is the gate on the "tiles now load over the network" trade-off the spec flagged).

```bash
git add src/pages/admin/CarouselImages.jsx src/pages/admin/Admin.css src/pages/admin/AdminPage.jsx src/test/admin.test.jsx
git commit -m "feat(admin): upload photos for the home carousel tiles"
```

---

## Post-implementation check

Against the spec's verification checklist:

1. Migration applies; the storefront still loads where 0006 has **not** run (Task 3's best-effort fetch).
2. No uploads → every tile shows its category's first product photo (Task 5, Step 6).
3. Upload to one tile → only that tile changes (Task 6, Step 7).
4. Remove → reverts to the first-product photo (Task 6, Step 7).
5. Empty category → empty tile, belt still loops cleanly (Task 5, Step 6).
6. `yarn lint && yarn format:check && yarn test` green (every task).
7. `yarn build && yarn preview` + Lighthouse thresholds (Task 6, Step 8).
