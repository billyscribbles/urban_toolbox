# Admin-editable home carousel images — design

**Date:** 2026-07-28
**Status:** Approved, ready for implementation plan

## Goal

Let the admin set the photo on each tile of the home page "Built for every adventure"
carousel (`CategoryCarousel`). The photo is a **standalone upload** — it is not tied to a
product and does not have to be a product shot.

When a tile has no uploaded photo, it falls back to **the first product in that category**.
When the category has no products (or none with a photo), the tile renders an empty media
box.

Scope is **photos only**. Which tiles exist, their labels, their links and their order stay
in `src/content/homeCarousel.js`.

## Data model

New migration `supabase/migrations/0006_category_images.sql`:

```sql
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

- `category_id` matches an `id` in `src/data/categories.js`. Validated app-side, not by FK —
  same convention as `products.category_id` (categories live in code, not the DB).
- Primary key on `category_id` makes the relationship one-image-per-category by
  construction, so upload is an upsert and there is no ordering/position concept.
- No `alt` column. `CategoryCarousel` renders `alt=""` on purpose — the visible tile label
  already names the link, and a non-empty alt would double-announce it. Storing an alt
  nothing reads would be dead weight.

## Storage

Files go in the **existing `product-photos` bucket** (no new bucket, no new storage
policies) under a `categories/` prefix:

```
categories/<category_id>/<uuid8>.jpg
categories/<category_id>/<uuid8>-400.webp
categories/<category_id>/<uuid8>-800.webp
```

Same JPEG-master + WebP-derivative contract that product photos and
`scripts/gen-images.mjs` already use, so `publicPhotoUrl()` and `<Img>` srcsets work with
zero changes.

`src/lib/imageResize.js` grows a sibling to `photoPaths`:

```js
export function categoryPhotoPaths(categoryId, name) {
  const base = `categories/${categoryId}/${name}`
  return {
    jpeg: `${base}.jpg`,
    webp: DERIVATIVE_WIDTHS.map((width) => ({ width, path: `${base}-${width}.webp` })),
  }
}
```

`processPhoto()` is reused unchanged.

## Read path (`src/lib/productStore.js`)

The store's single per-session load also fetches `category_images`, so there is one
subscription and one round of network for the storefront:

- State becomes `{ status, products, categoryImages }`, where `categoryImages` is a plain
  object keyed by `category_id` → `storage_path`.
- The fetch is **best-effort**, matching `fetchStoreDiscount`'s pattern: a failure (missing
  table on a not-yet-migrated environment, offline) yields `{}` rather than failing the
  whole catalogue load.
- `__setStateForTests` continues to accept the whole state object; tests that omit
  `categoryImages` must still work, so readers treat it as optional.

New accessor alongside `getProducts()`:

```js
export function getCategoryImages() {
  return state.categoryImages ?? {}
}
```

## Resolver (`src/lib/catalog.js`)

`catalog.js` stays the only read surface components use, so the fallback chain lives here.
It splits into two functions because the **admin needs the fallback rule too** — its badge
and thumbnail must preview what the storefront will actually show — but the admin holds raw
DB rows (`fetchAdminProducts`), not the normalized live catalogue:

```js
// The first product photo under a category, in storefront display order. A
// parent node resolves through its leaves, so `accessories` finds a photo
// rather than coming up empty. `products` defaults to the live catalogue; the
// admin passes its own mapped rows so its preview matches the storefront.
export function firstProductImageIn(categoryId, products = getProducts()) {
  const node = getCategoryById(categoryId)
  if (!node) return null
  const ids = new Set(getLeaves(node).map((l) => l.id))
  return products.find((p) => ids.has(p.categoryId) && p.img)?.img ?? null
}

// The photo for a home-carousel tile. An admin upload wins; otherwise the tile
// borrows the first product in the category. null when neither exists.
export function getCategoryTileImage(categoryId) {
  const uploaded = getCategoryImages()[categoryId]
  return uploaded ? publicPhotoUrl(uploaded) : firstProductImageIn(categoryId)
}
```

- Leaf-set matching (rather than `getProductsUnder`) keeps the caller's array order intact —
  `getProductsUnder` filters `getProducts()` directly and would ignore an array passed in.
- `p.img` in the predicate skips products with no photo yet, so a photo-less first product
  does not blank the tile.
- **Order is the caller's responsibility.** `getProducts()` is already ordered `sort_order`
  then `id` — the same order the category page shows, so the tile matches what a visitor
  sees when they click it. The admin must sort its mapped rows identically (below).
- `catalog.js` gains imports for `publicPhotoUrl` (from `supabaseClient.js`) and
  `getCategoryImages` (from `productStore.js`); it already imports from `productStore.js`.

## Content contract (`src/content/homeCarousel.js`)

Each tile drops `img` / `imgAlt` and gains `categoryId`:

```js
export const homeCarousel = [
  {
    label: 'Camper & Trailer Boxes',
    categoryId: 'camper-trailer-boxes',
    to: '/toolboxes/camper-trailer-boxes',
  },
  ...{ label: 'Accessories', categoryId: 'accessories', to: '/accessories' },
]
```

`rangeSection` (eyebrow + heading) is unchanged. The file's header comment is rewritten to
describe the new contract: every `to` resolves to a real catalog slug, every `categoryId`
resolves to a real category node, and photos come from the admin panel with a
first-product fallback.

The nine `/images/catalog/*.jpg` files the tiles referenced stay in `public/` — other pages
may still use them, and removing assets is out of scope here.

## Carousel component (`src/components/CategoryCarousel.jsx`)

- Calls `useProductCatalog()` so the strip re-renders when the catalogue and category
  images land. `main.jsx` already kicks off `loadProducts()` at boot, so no new load call.
- Resolves each tile with `getCategoryTileImage(tile.categoryId)`.
- A `null` result renders `range__media` **empty** rather than dropping the tile. The card
  keeps its box, so the belt width stays constant and the `TRACK_COUNT` loop maths in the
  CSS keyframe is unaffected.
- `alt=""`, `sizes`, `width` and `height` on `<Img>` are unchanged.

## Admin UI (`src/pages/admin/CarouselImages.jsx`, new)

Rendered as an `admin-card` in `AdminPage`'s body, below `ProductList`. Styles reuse the
existing `admin-*` classes (`admin-card`, `admin__primary`, `admin__ghost`, `admin__danger`,
`admin__error`, `admin-photos__*`) with a small block appended to `Admin.css` for the tile
grid — no new design tokens.

`AdminPage` already holds `rows` from `fetchAdminProducts()`; it passes them down so the
card can preview the fallback **without** pulling the storefront `productStore` into the
admin. `CarouselImages` maps them once into the shape `firstProductImageIn` expects:

```js
const catalogue = useMemo(
  () =>
    rows
      // The storefront's carousel never shows hidden products, so neither does
      // this preview — otherwise the badge would promise a photo that visitors
      // never see.
      .filter((r) => !r.hidden)
      // fetchAdminProducts orders by category then sort_order; re-sort to the
      // storefront's sort_order-then-id order so "first product" means the same
      // thing on both sides.
      .sort((a, b) => a.sort_order - b.sort_order || String(a.id).localeCompare(String(b.id)))
      .map((r) => ({
        categoryId: r.category_id,
        img: firstPhotoUrl(r), // position-0 photo, same rule as ProductList's thumb()
      })),
  [rows],
)
```

One entry per `homeCarousel` tile, in content-file order:

- Tile label.
- Thumbnail: the uploaded photo, else `firstProductImageIn(tile.categoryId, catalogue)`,
  else an empty slot.
- Status badge — **Custom** (uploaded) / **From first product** (fallback in use) /
  **No image** (neither).
- **Upload** / **Replace** — single file, `accept="image/jpeg,image/png,image/webp"`,
  resized client-side through `processPhoto` exactly like `PhotoManager`.
- **Remove** — shown only when a custom image exists. Deletes the storage files and the
  row; the tile reverts to the fallback. Single-step (it is non-destructive to the
  storefront — the tile still shows something), unlike product delete.

Busy/error state is per-tile so one failed upload does not lock the whole card.

## Persistence (`src/lib/adminApi.js`)

Three additions, each ending in `retryLoad()` like every other write so an open storefront
tab reflects the change without a reload:

```js
export async function fetchCategoryImages()            // -> rows
export async function uploadCategoryImage(categoryId, file)
export async function deleteCategoryImage(row)
```

- `uploadCategoryImage` processes the file, uploads the JPEG master + both WebP
  derivatives, then **upserts** `{ category_id, storage_path }` on `category_id`. Because
  the row is keyed by category, replacing an image orphans the previous files — so the
  upload first reads the existing row and best-effort-removes its files, mirroring
  `deleteProduct`'s comment that DB rows are the source of truth and orphaned files are
  harmless.
- `deleteCategoryImage` removes the three storage files, then the row.
- `storageFilesFor(image)` already derives the three paths from a `storage_path` and is
  reused as-is.

## Testing

Extends the existing Vitest contract suite; no new frameworks.

- `content.test.js` (`homeCarousel tiles route to real categories and their images exist`)
  — drops the `tile.imgAlt` and `existsSync(public/<tile.img>)` assertions, gains
  "`tile.categoryId` resolves to a real category node" via `getCategoryById`. The
  `to`-resolves-to-a-real-slug assertion is unchanged, and the test is renamed to match.
- `components.test.jsx` (the loop at ~line 46) — **no change needed**: it only reads
  `tile.label` and `tile.to`, never `tile.img`. It must still pass, which is the guard that
  the marquee's one-link-per-tile a11y contract survives.
- New coverage for the resolver: `getCategoryTileImage` prefers the uploaded path;
  `firstProductImageIn` falls back to the first product, resolves a parent node through its
  leaves (the Accessories case), skips photo-less products, honours the caller's array
  order, and returns `null` for an unknown category or one with nothing.
- `productStore.test.js` — `categoryImages` lands in state; a failed `category_images` fetch
  degrades to `{}` without failing the product load.
- `admin.test.jsx` — the carousel card renders one entry per tile, shows the
  **From first product** badge when a category has a visible product with a photo, and
  uploading calls `uploadCategoryImage` with the right category id.
- `a11y.test.jsx` currently sweeps **Home only** — not the admin. The carousel change is
  therefore already under axe; extending the sweep to the admin page is out of scope, so the
  new card is checked by keyboard/label review rather than automated axe.

## Known trade-off

Tile photos become a network dependency. They sit below the hero fold so LCP should stay on
the hero, but on a cold load the tiles paint empty for a beat where today they paint from
the bundle. Accepted deliberately (the alternative — keeping the hardcoded images as an
instant-paint layer — was considered and rejected as a third fallback tier to reason about).
The Lighthouse gate (`performance ≥ 90`) is part of the verification checklist so any real
regression surfaces there.

## Out of scope

- Admin control over tile labels, links, order, or which categories appear.
- Reusing these images anywhere other than the home carousel (category page heroes, nav).
- Removing the now-unreferenced `/images/catalog/*.jpg` assets from `public/`.
- Cropping / focal-point tools — uploads are used as-is, resized only.

## Verification checklist

1. Migration applies; the storefront still loads on an environment where it has **not** yet
   been applied (best-effort fetch degrades to no custom images).
2. Home carousel with no uploads: every tile shows its category's first product photo.
3. Upload a photo to one tile in `/admin` → that tile changes on the home page; the others
   are untouched.
4. Remove it → the tile reverts to the first-product photo.
5. A category with no products renders an empty tile, and the belt still loops without a gap
   or stutter.
6. `yarn lint && yarn format:check && yarn test` pass (incl. axe on the admin card).
7. `yarn build && yarn preview` succeeds; Lighthouse on the home page keeps
   performance ≥ 90, SEO ≥ 95, a11y ≥ 90.
