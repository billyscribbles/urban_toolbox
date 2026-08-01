# Product brochure PDF — design

**Date:** 2026-08-01
**Status:** Approved, ready for implementation

## Goal

Let the admin upload one PDF brochure per product, or delete it, from the `/admin` editor.
Customers download that brochure from the product page.

One optional file per product — so a nullable column on `products`, not a new table. The
admin manages it in the editor tray below the photo gallery; the storefront renders a
secondary download button in the buy card, and nothing at all when there's no brochure.

## Data model

Migration `supabase/migrations/0009_product_brochure.sql`:

```sql
alter table public.products
  add column brochure_path text;
```

- Nullable, no default. `null` means "no brochure" — which is every existing row on apply,
  and the correct starting state.
- No new table. A single optional file is a property of the product, not a collection.
  (Rejected: a `product_files` table with ordering and per-file labels. That's the design
  for "brochure + spec sheet + warranty + install guide", which is not what was asked for.)
- No storage changes. Files go in the existing public `product-photos` bucket under a
  `brochures/` prefix, exactly as `0006_category_images.sql` put tile photos under
  `categories/`.

### Why reuse the photo bucket

The bucket is named for photos and will now hold PDFs. That naming mismatch is accepted
deliberately:

- It has no `allowed_mime_types` and no `file_size_limit` (verified against the live
  project), so PDFs upload with no bucket change.
- Its four RLS policies are already correct, **including the SELECT policy** restored by
  `0007_restore_storage_read_policy.sql`. Supabase Storage resolves `remove()` by first
  SELECTing matching objects under RLS — without that policy, deletes return `200 []` and
  silently strand files. That bug orphaned ~46 product masters before it was caught.
- A dedicated `product-files` bucket would mean re-deriving all four policies from scratch,
  where getting the SELECT one wrong reintroduces exactly that silent-orphan failure with
  no error surfaced. Inheriting a known-correct bucket is the safer trade.

### Storage path

`brochures/<product-id>/<random8>.pdf`, built by a `brochurePath(productId, name)` helper
local to `src/lib/adminApi.js`.

Deliberately **not** in `src/lib/imageResize.js` next to `photoPaths` /
`categoryPhotoPaths`: that module is the client-side image pipeline (canvas resizing, WebP
derivative naming), and a PDF has no derivatives and no resizing. The path helpers live
there because they encode the derivative contract `<Img>` depends on. A brochure has no
such contract and exactly one caller, so it stays where it's used.

The random component is `crypto.randomUUID().slice(0, 8)`, matching the photo uploads. It
matters more here than for photos: replacing a brochure at a fixed path would serve the old
file from CDN cache after the swap. A fresh path per upload sidesteps cache invalidation
entirely.

## Read path — `src/lib/productStore.js`

`normalizeRow` gains one field, a **fully-resolved download URL** rather than a raw path —
the same treatment `img` already gets, so storefront components stay dumb:

```js
brochureUrl: row.brochure_path
  ? publicFileUrl(row.brochure_path, { download: brochureFilename(row) })
  : null,
```

`brochureFilename(row)` is a module-local helper in `productStore.js`. It returns
`urban-toolbox-<slug>-brochure.pdf`, falling back to `row.id` when `slug` is absent. Slugs
are already URL-safe, so no extra escaping is needed beyond the `encodeURIComponent` in the
URL builder.

The storefront query is already `select('*, product_images(*)')`, so `brochure_path`
arrives with no change to `loadProducts`.

### `src/lib/supabaseClient.js`

New export beside `publicPhotoUrl`:

```js
export function publicFileUrl(storagePath, { download } = {}) {
  const base = `${url}/storage/v1/object/public/product-photos/${storagePath}`
  return download ? `${base}?download=${encodeURIComponent(download)}` : base
}
```

Supabase's `?download=<filename>` param sets `Content-Disposition: attachment` with that
filename, which is what turns a browser-rendered PDF into a saved file. Public bucket URLs
are deterministic, so this needs no client round-trip — same reasoning as `publicPhotoUrl`.

## Product page — `src/pages/ProductPage.jsx`

Inside the existing `product-page__actions` block, directly under `<QuoteButton>`:

```jsx
{
  product.brochureUrl && (
    <a className="product-page__brochure" href={product.brochureUrl} download>
      <FileDown size={18} strokeWidth={1.8} aria-hidden="true" />
      Download brochure (PDF)
    </a>
  )
}
```

- A plain anchor, not a button with a click handler. Keyboard activation, right-click →
  Save link as, and middle-click all work for free; the `Content-Disposition` header from
  `?download=` does the real work, and the `download` attribute is belt-and-braces.
- Renders only when a brochure exists. No empty state, no disabled control — a product
  without a brochure shows nothing.
- Styled in `ProductPage.css` as a secondary/ghost action off existing theme tokens, so it
  reads as supporting the primary quote CTA rather than competing with it. No raw hex or
  rem values (repo rule: tokens only).

The `(PDF)` in the label is deliberate — it tells the user what they're about to receive
before they commit to the click.

## Admin write path

### `src/lib/adminApi.js`

```js
export async function uploadBrochure(productId, file)
export async function deleteBrochure(row)
```

`uploadBrochure`:

1. Read the product's current `brochure_path`.
2. If set, `storage.remove()` it first. Best-effort, matching `uploadCategoryImage` — the
   DB row is the source of truth and a stranded object is harmless, but sweeping keeps the
   bucket clean on repeated replacements.
3. Upload the new file with `contentType: 'application/pdf'`.
4. `update({ brochure_path })` on the product row.
5. `retryLoad()` so an open storefront tab picks it up.

`deleteBrochure` removes the object, sets `brochure_path` to `null`, and `retryLoad()`s.

`deleteProduct` also sweeps `row.brochure_path` alongside its existing photo sweep, so
deleting a product doesn't strand the PDF.

### `toRow` must not carry `brochure_path`

`toRow` maps the editor form to a product row, and the form has no brochure field — the
BrochureManager writes the column directly. If `brochure_path` were added to `toRow`, every
form save would write `undefined` over a brochure that had just been uploaded.

Postgres only sets the columns present in the update object, so omitting it is sufficient.
This is the same split `hidden` already uses: absent from `toRow`, written by its own
`setProductHidden`. Precedent exists; the failure mode is just silent, so it's called out
here and covered by a test.

### `src/pages/admin/BrochureManager.jsx`

New component mirroring `PhotoManager`'s shape — same `run(action)` busy/error wrapper, same
drop-zone markup and `admin-drop` classes, same `sr-only` file input paired to a visible
label.

Differences from `PhotoManager`, all following from "one file, not a gallery":

- Single file, `accept="application/pdf"`, no `multiple`.
- No reordering, no position bookkeeping.
- When a brochure exists, one row showing its filename and a delete button, in place of the
  photo grid.
- Uploading while one exists replaces it, with the drop-zone copy saying so.

`PhotoManager` re-reads its list after every write (`onImagesChange(await
fetchProductImages(productId))`), which needs a round-trip because positions may have
shifted. A brochure has no such derived state, so `uploadBrochure` returns the new path and
`deleteBrochure` returns `null`, and `BrochureManager` hands that straight to
`onBrochureChange`. One less request, and the parent stays the single source of truth.

Validation before upload, surfaced through the existing `admin__error` treatment:

- Type must be `application/pdf`. Non-PDFs are rejected with a clear message rather than
  silently ignored.
- **20MB cap.** The bucket sets no `file_size_limit`, so without a client guard an
  oversized file uploads slowly and then fails against the project-wide limit with an
  opaque error. 20MB clears any real brochure with room to spare and fails fast otherwise.

### `src/pages/admin/ProductEditor.jsx`

`<BrochureManager>` renders below `<PhotoManager>`, behind the same `isNew` guard — the
storage path needs a product id, so new products get the existing "save first, then reopen"
hint, extended to mention the brochure.

Brochure state lives in `ProductEditor` (`const [brochurePath, setBrochurePath] = useState(row?.brochure_path ?? null)`)
so the component stays controlled, matching how `images` is held there today.

### `src/pages/admin/ProductList.jsx`

In the existing `admin-badges` block, after the Featured badge:

```jsx
{
  row.brochure_path && <span className="admin-badge admin-badge--pdf">PDF</span>
}
```

New `admin-badge--pdf` class in `Admin.css` using existing tokens. `fetchAdminProducts`
already does `select('*')`, so the field arrives with no query change.

## Known behaviours, not bugs

**Renaming a product id strands the brochure under the old prefix.** The storage path bakes
in the product id, and `saveProduct` can rename the primary key via `prevId`. The DB row
still points at the correct path, so the download keeps working — it's cosmetic only.
Photos behave identically today (`photoPaths` bakes in the id the same way). Matching that
behaviour rather than diverging; fixing it would mean moving objects on rename, for both
photos and brochures, which is out of scope here.

**Prerendered HTML lags a new brochure.** Product pages are prerendered at build, so a
brochure added after the last deploy isn't in the static HTML. The page hydrates against
live Supabase and the button appears for real visitors. Identical to every other catalogue
edit; no action needed.

## Testing

Extending the existing `src/test/` contract suite:

- **`productStore.test.js`** — `normalizeRow` maps `brochure_path` to a download URL
  carrying `urban-toolbox-<slug>-brochure.pdf`; a null path yields `brochureUrl: null`.
- **`adminApi.test.js`** — `uploadBrochure` removes the previous object before writing the
  new path; `deleteBrochure` nulls the column; `toRow` output has no `brochure_path` key
  (the silent-wipe guard).
- **Product page** — the link renders only when `brochureUrl` is set, and its `href` carries
  the `?download=` param.
- **`admin.test.jsx`** — the PDF chip shows for a row with `brochure_path` and not
  otherwise; the existing axe pass over the editor tray covers the new control.

## Out of scope

- Multiple files or file types per product.
- Brochure links anywhere other than the product page (cards, category pages, quote email).
- Download analytics.
- Moving storage objects when a product id is renamed.
