# Admin Dashboard — Design

**Date:** 2026-07-15
**Status:** Approved by Billy
**Supabase project:** `jxyruzhotemmcqcrndbp` (https://jxyruzhotemmcqcrndbp.supabase.co)

## Goal

A login-protected admin dashboard at `/admin` where Billy (single admin) can CRUD
catalog products — title/details, photo galleries, price, and discount % — with
edits going live on the storefront immediately (no redeploy). The storefront
starts showing real prices, with strikethrough + discounted price when a
discount is set.

## Decisions made during brainstorming

| Decision      | Choice                                                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Backend       | Supabase (Postgres + Storage + Auth), live runtime reads                                                                     |
| Price display | Public prices; discount renders as ~~original~~ discounted + "Save N%" badge; `null` price still shows "Enquire for pricing" |
| Admin scope   | Full product CRUD; category tree stays fixed in code (products movable between existing leaves)                              |
| Photos        | Multi-photo gallery per product; position 0 is the card thumbnail; client-side resize/compress before upload                 |
| Users         | Single admin account (Billy), lean utilitarian UI                                                                            |
| Publishing    | Instant — storefront fetches from Supabase at runtime, cached per session                                                    |

## 1. Database schema

### `products`

| Column                      | Type                            | Notes                                                                                     |
| --------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------- |
| `id`                        | text PK                         | Keeps existing ids (`ute-under-tray-boxes-1`); new products get slugified-title-based ids |
| `category_id`               | text NOT NULL                   | Must equal a leaf id in the code-side category tree (validated app-side)                  |
| `title`                     | text NOT NULL                   |                                                                                           |
| `slug`                      | text UNIQUE NOT NULL            | Auto-generated from title for new products                                                |
| `summary`                   | text                            |                                                                                           |
| `specs`                     | jsonb DEFAULT `[]`              | `[{ label, value }]` — same shape as today                                                |
| `features`                  | jsonb DEFAULT `[]`              | `string[]`                                                                                |
| `price`                     | numeric(10,2) NULL              | `null` → "Enquire for pricing"                                                            |
| `discount_pct`              | numeric NULL, CHECK 0 < x < 100 | `null` → no discount                                                                      |
| `standard_dims`             | text                            | Replaces `quote.standardDims`                                                             |
| `featured`                  | boolean DEFAULT false           |                                                                                           |
| `sort_order`                | integer DEFAULT 0               | Display order within a leaf                                                               |
| `created_at` / `updated_at` | timestamptz                     | `updated_at` via trigger                                                                  |

### `product_images`

| Column         | Type                                 | Notes                                            |
| -------------- | ------------------------------------ | ------------------------------------------------ |
| `id`           | uuid PK default gen                  |                                                  |
| `product_id`   | text FK → products ON DELETE CASCADE |                                                  |
| `storage_path` | text NOT NULL                        | Path in the `product-photos` bucket              |
| `alt`          | text                                 | Defaults to product title on upload              |
| `position`     | integer NOT NULL                     | 0 = card thumbnail; rest = detail-drawer gallery |

### Storage

Bucket `product-photos`, public read. Files keyed `products/<product_id>/<uuid>.jpg`.

### Security (RLS)

- `products`, `product_images`: `SELECT` for `anon` and `authenticated`;
  `INSERT`/`UPDATE`/`DELETE` for `authenticated` only.
- Bucket: public read; write/delete for `authenticated` only.
- One admin user created in Supabase Auth (email + password). Sign-ups disabled.
- The Vite anon key ships in the client (safe by design; RLS guards writes).

### One-time seed

A run-once Node script (`scripts/seed-catalog.mjs`, kept in repo for reference):
reads products from the current `src/data/catalog.js`, inserts rows (mapping
`quote.priceFrom` → `price`, `quote.standardDims` → `standard_dims`), and
uploads existing `public/images/catalog/*.jpg` into the bucket as position-0
images (Tray B's multi-angle set becomes its gallery). Runs with the service
role key from the local shell only — the key is never committed or shipped.

## 2. Storefront changes

- **Categories stay in code.** The category tree moves to `src/data/categories.js`.
  Mega-menu, routes, breadcrumbs remain static — zero runtime dependency, no
  Lighthouse impact on the home page. After seeding, the products half of
  `src/data/catalog.js` is deleted.
- **`src/lib/supabaseClient.js`** — single shared `@supabase/supabase-js` client
  (the only new production dependency), reading `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY`.
- **`src/lib/productStore.js`** — mini store following the existing
  `quoteStore.js` subscribe pattern. Fetches all products + images in one query
  per session (`products` joined to `product_images`), exposes
  `{ status: 'loading' | 'ready' | 'error', products }`, with a `retry()`.
- **`src/lib/catalog.js`** keeps its exact exported signatures
  (`getProductsForLeaf`, `getProductsUnder`, …) but reads from the store.
  Category helpers read from `src/data/categories.js`. Callers don't change.
- **Loading/error UI** — category pages and the quote tray render skeleton cards
  while `loading`; on `error`, a "Catalog temporarily unavailable" message with
  a Retry button. All other pages unaffected.
- **Price rendering** in `Card` and `DetailDrawer`:
  - `price == null` → "Enquire for pricing" (unchanged behavior)
  - `price`, no discount → formatted price
  - `price` + `discount_pct` → original struck through, discounted price
    beside it, "Save N%" badge
  - Helpers `formatPrice(price)` and `discountedPrice(price, pct)` (rounded to
    cents) live in `src/lib/pricing.js`, unit-tested.
- **Images** resolve to Supabase Storage public URLs.

## 3. Admin dashboard

- **Route `/admin`** — lazy route in `App.jsx` (existing lazy + Suspense +
  chunk-retry pattern), not in the nav, `noindex` via the SEO helper.
- **Auth gate** — email + password sign-in via Supabase Auth; session persisted
  by supabase-js; sign-out button. No self-registration.
- **Product list** — table of all products: thumbnail, title, category, price,
  discount, featured. Filter by category dropdown + text search. "New product"
  button.
- **Product editor** (one form, used for create and edit):
  - Fields: title, summary, category (dropdown of leaves only), spec rows
    (label/value, add/remove), features (one per line, add/remove), price,
    discount %, standard dims, featured toggle.
  - Photo manager: multi-file upload; images resized client-side to max 1600px
    and re-encoded (canvas, no new deps) before upload; reorder with up/down
    buttons; delete with confirm; position 0 labeled "Card thumbnail".
  - Validation: title required; slug auto-generated from title on create and
    uniqueness enforced by the DB; price ≥ 0; discount 1–99 and only allowed
    when price is set.
  - Save writes to Supabase then refreshes the product store, so an open
    storefront tab shows changes on next fetch/reload.
- **Delete product** — confirm dialog; cascades to images (DB) and removes
  storage files.
- **Styling** — plain CSS with existing theme tokens and utility classes,
  Lucide icons. No Tailwind, no TypeScript, no drag-and-drop libraries.

## 4. Error handling

- Storefront fetch failure → per-page unavailable state + retry; never a blank
  page; ErrorBoundary remains the last resort.
- Admin save/upload failures → inline error message on the form, data kept in
  the form (no loss on failed save).
- Deleting storage files best-effort: DB row deletion is the source of truth;
  orphaned files are harmless and can be swept later.

## 5. Testing

- Category-tree contract tests keep running against static `categories.js`.
- Product-shape contract tests run against a seed fixture (same shape the store
  returns) — no network in CI; supabase-js mocked.
- Unit tests for `pricing.js` (`formatPrice`, `discountedPrice`, badge math).
- Component tests: Card/DetailDrawer price states (null / price / discounted).
- Admin: form-validation unit tests + axe a11y test on the admin page.
- Lighthouse gate unchanged (home page has no Supabase dependency).

## 6. Config & deployment

- `.env.example` gains `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Railway service gets the same two vars (via `railway-deploy` skill flow).
- `robots.txt` untouched; `/admin` excluded from `sitemap.xml` and marked
  `noindex`.

## Out of scope

- Category tree editing from the admin (tree stays in code).
- Multi-user roles/permissions.
- Checkout/cart/payments — quote tray flow is unchanged.
- Image CDN/transform pipelines beyond client-side resize on upload.
