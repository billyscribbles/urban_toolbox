# Product Brochure PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the admin upload or delete one PDF brochure per product, and let customers download it from the product page.

**Architecture:** A nullable `brochure_path` column on `products` holds the storage key; the file lives in the existing public `product-photos` bucket under a `brochures/` prefix. `normalizeRow` resolves the path into a ready-to-use download URL (`?download=` sets `Content-Disposition: attachment`), so storefront components stay dumb. The admin manages the file through a `BrochureManager` component that writes the column directly, never through the product form.

**Tech Stack:** React 18, Vite 5, Supabase (Postgres + Storage), Vitest + Testing Library + jest-axe, plain CSS with custom properties, lucide-react icons.

**Spec:** `docs/superpowers/specs/2026-08-01-product-brochure-design.md`

## Global Constraints

- **No hardcoded client strings, colors, or links in components.** Values come from config or content files; CSS uses `var(--token)` only — never raw hex or rem.
- **No Tailwind, no styled-components, no TypeScript.** Plain CSS + CSS variables, JSX only.
- **Never invent design tokens** — reuse what `theme.config.js` already exposes.
- Storage bucket is `product-photos` for all files including PDFs. Do **not** create a new bucket.
- Brochure filename served to customers: `urban-toolbox-<slug>-brochure.pdf`.
- Client-side upload limits: `application/pdf` only, 20 MB maximum.
- `toRow()` in `adminApi.js` must **never** include `brochure_path`.
- Verification commands: `yarn test`, `yarn lint`, `yarn format:check`. All three must pass before a task is complete.
- Commit after each task. Do not push.

---

### Task 1: Database column + storage write path

**Files:**

- Create: `supabase/migrations/0009_product_brochure.sql`
- Modify: `src/lib/adminApi.js`
- Test: `src/test/adminApi.test.js`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces:
  - `uploadBrochure(productId: string, file: File): Promise<string>` — returns the new storage path.
  - `deleteBrochure(row: { id: string, brochure_path: string }): Promise<null>` — returns `null`.
  - Storage path shape: `brochures/<productId>/<random8>.pdf`.

- [ ] **Step 1: Write the failing tests**

In `src/test/adminApi.test.js`, first extend the existing mocks. Add an `uploads` array to the `calls` object at the top of the file:

```js
const calls = { upserts: [], updates: [], deletes: [], removed: [], uploads: [] }
```

Add a module-level slot beside `existingCategoryImage`:

```js
// The product row uploadBrochure reads before replacing; null means "no
// brochure yet". Separate from existingCategoryImage because both reach the
// same select().eq().maybeSingle() path on different tables.
let existingBrochure = null
```

Make `maybeSingle` inside `select().eq()` table-aware — replace the existing `maybeSingle` line in the `eq` block with:

```js
maybeSingle: vi.fn(() =>
  Promise.resolve({
    data: table === 'products' ? existingBrochure : existingCategoryImage,
    error: null,
  }),
),
```

Record upload paths in the storage mock — replace the `upload` line:

```js
upload: vi.fn((path, body, opts) => {
  calls.uploads.push({ path, opts })
  return Promise.resolve({ error: null })
}),
```

Add `uploadBrochure` and `deleteBrochure` to the import list at the bottom of the mock block, and reset the new slots in `beforeEach`:

```js
calls.uploads.length = 0
existingBrochure = null
```

Then add the test block:

```js
describe('brochures', () => {
  it('uploads under brochures/<id>/ as application/pdf and stores the path', async () => {
    const path = await uploadBrochure('job-site-toolbox-1', new File(['pdf'], 'a.pdf'))

    expect(path).toMatch(/^brochures\/job-site-toolbox-1\/[a-f0-9-]{8}\.pdf$/)
    expect(calls.uploads).toHaveLength(1)
    expect(calls.uploads[0].path).toBe(path)
    expect(calls.uploads[0].opts.contentType).toBe('application/pdf')
    expect(calls.updates).toContainEqual({
      table: 'products',
      patch: { brochure_path: path },
      col: 'id',
      val: 'job-site-toolbox-1',
    })
    expect(retryLoad).toHaveBeenCalled()
  })

  it('sweeps the previous file before writing the replacement', async () => {
    existingBrochure = { brochure_path: 'brochures/job-site-toolbox-1/old12345.pdf' }

    await uploadBrochure('job-site-toolbox-1', new File(['pdf'], 'a.pdf'))

    expect(calls.removed).toEqual(['brochures/job-site-toolbox-1/old12345.pdf'])
  })

  it('deleteBrochure removes the file, nulls the column and returns null', async () => {
    const result = await deleteBrochure({
      id: 'job-site-toolbox-1',
      brochure_path: 'brochures/job-site-toolbox-1/abc12345.pdf',
    })

    expect(result).toBeNull()
    expect(calls.removed).toEqual(['brochures/job-site-toolbox-1/abc12345.pdf'])
    expect(calls.updates).toContainEqual({
      table: 'products',
      patch: { brochure_path: null },
      col: 'id',
      val: 'job-site-toolbox-1',
    })
    expect(retryLoad).toHaveBeenCalled()
  })

  it('deleteProduct sweeps the brochure alongside the photos', async () => {
    await deleteProduct({
      id: 'job-site-toolbox-1',
      brochure_path: 'brochures/job-site-toolbox-1/abc12345.pdf',
      product_images: [],
    })

    expect(calls.removed).toContain('brochures/job-site-toolbox-1/abc12345.pdf')
  })

  it('toRow never carries brochure_path — a form save must not wipe it', async () => {
    await saveProduct(
      {
        id: 'job-site-toolbox-1',
        slug: 'job-site-box',
        title: 'Job Site Box',
        categoryId: 'locks',
        price: null,
        discountPct: null,
        colors: [],
        sortOrder: 0,
      },
      { isNew: false },
    )

    const update = calls.updates.find((u) => u.table === 'products')
    expect(update.patch).not.toHaveProperty('brochure_path')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn vitest run src/test/adminApi.test.js`
Expected: FAIL — `uploadBrochure is not a function` (it is not exported yet).

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/0009_product_brochure.sql`:

```sql
-- One optional PDF brochure per product, downloadable from the product page.
-- Nullable with no default: every existing row starts with no brochure, which
-- is the correct state, so there is no backfill.
--
-- No new table — a single optional file is a property of the product, not a
-- collection. No storage changes either: files go in the existing public
-- `product-photos` bucket under a `brochures/` prefix, exactly as 0006 put
-- category tiles under `categories/`. That bucket has no MIME or size
-- restriction, and its SELECT policy (restored in 0007) is what makes
-- storage remove() actually delete instead of silently no-opping.
alter table public.products
  add column brochure_path text;
```

- [ ] **Step 4: Apply the migration to the live project**

This project's admin panel talks to the live Supabase database, so the column must exist there. Apply it with the Supabase MCP tool:

`mcp__supabase__apply_migration` with `name: "0009_product_brochure"` and the SQL above.

Verify with `mcp__supabase__execute_sql`:

```sql
select column_name, is_nullable, data_type
  from information_schema.columns
 where table_schema = 'public' and table_name = 'products' and column_name = 'brochure_path';
```

Expected: one row, `is_nullable = YES`, `data_type = text`.

- [ ] **Step 5: Implement the API functions**

In `src/lib/adminApi.js`, add the path helper next to `storageFilesFor`:

```js
// Brochures live beside the photos in the same bucket, under their own prefix
// (the `categories/` precedent from 0006). The random component matters more
// here than for photos: a fixed path would serve the old PDF from CDN cache
// after a replace, so each upload gets a fresh key instead.
function brochurePath(productId, name) {
  return `brochures/${productId}/${name}.pdf`
}
```

Then add the two functions at the end of the file:

```js
// --- Product brochure ------------------------------------------------------
// One optional PDF per product, stored as a path on the product row. The
// column is deliberately absent from toRow(): the editor form has no brochure
// field, so routing it through a form save would write undefined over a file
// that was just uploaded. Same split `hidden` uses.

export async function uploadBrochure(productId, file) {
  const c = await client()
  // A replace would orphan the old object, so sweep it first. Best-effort,
  // matching uploadCategoryImage — the row is the source of truth.
  const { data: existing } = await c
    .from('products')
    .select('brochure_path')
    .eq('id', productId)
    .maybeSingle()
  if (existing?.brochure_path) {
    await c.storage.from(BUCKET).remove([existing.brochure_path])
  }

  const path = brochurePath(productId, crypto.randomUUID().slice(0, 8))
  const upload = await c.storage.from(BUCKET).upload(path, file, { contentType: 'application/pdf' })
  if (upload.error) throw new Error(upload.error.message)

  const { error } = await c.from('products').update({ brochure_path: path }).eq('id', productId)
  if (error) throw new Error(error.message)
  retryLoad()
  return path
}

export async function deleteBrochure(row) {
  const c = await client()
  await c.storage.from(BUCKET).remove([row.brochure_path])
  const { error } = await c.from('products').update({ brochure_path: null }).eq('id', row.id)
  if (error) throw new Error(error.message)
  retryLoad()
  return null
}
```

In `deleteProduct`, sweep the brochure too. Replace the storage-removal block with:

```js
const images = row.product_images ?? []
const files = images.flatMap(storageFilesFor)
if (row.brochure_path) files.push(row.brochure_path)
if (files.length) {
  // Best-effort: DB rows are the source of truth; orphaned files are harmless.
  await c.storage.from(BUCKET).remove(files)
}
```

Leave `toRow` untouched — it must not gain `brochure_path`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `yarn vitest run src/test/adminApi.test.js`
Expected: PASS, including the pre-existing tests in the file.

- [ ] **Step 7: Run the full suite and linters**

Run: `yarn test && yarn lint && yarn format:check`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/0009_product_brochure.sql src/lib/adminApi.js src/test/adminApi.test.js
git commit -m "feat(brochure): store one optional PDF per product"
```

---

### Task 2: Storefront read path

**Files:**

- Modify: `src/lib/supabaseClient.js`
- Modify: `src/lib/productStore.js`
- Modify: `src/test/fixtures/productRows.js`
- Test: `src/test/supabaseClient.test.js`, `src/test/productStore.test.js`
- Modify (mock only): `src/test/catalogLive.test.jsx`

**Interfaces:**

- Consumes: the `brochure_path` column from Task 1.
- Produces:
  - `publicFileUrl(storagePath: string, opts?: { download?: string }): string`
  - `product.brochureUrl: string | null` on every normalized product.

- [ ] **Step 1: Write the failing tests**

Add to `src/test/supabaseClient.test.js`, inside the existing `describe('supabaseClient')`:

```js
it('builds a public file URL, and appends ?download= when a filename is given', () => {
  expect(publicFileUrl('brochures/tray-b/abc12345.pdf')).toContain(
    '/storage/v1/object/public/product-photos/brochures/tray-b/abc12345.pdf',
  )
  expect(
    publicFileUrl('brochures/tray-b/abc12345.pdf', { download: 'urban toolbox.pdf' }),
  ).toContain('?download=urban%20toolbox.pdf')
})
```

Extend that file's import to `import { publicPhotoUrl, publicFileUrl, isConfigured } from '../lib/supabaseClient.js'`.

In `src/test/fixtures/productRows.js`, add a brochure to the **second** row only (after the `in_stock: false` line), so the first row keeps exercising the no-brochure default:

```js
    // Brochure present on this row only — the other omits the column entirely,
    // which is how every row reads before 0009 is applied.
    brochure_path: 'brochures/job-site-toolbox-1/abc12345.pdf',
```

In `src/test/productStore.test.js`, add `publicFileUrl` to the `vi.mock('../lib/supabaseClient.js', ...)` factory so the module under test can call it:

```js
  publicFileUrl: (p, opts) => `https://cdn.test/${p}${opts?.download ? `?download=${opts.download}` : ''}`,
```

Then add tests to the `describe('normalizeRow — DB row to storefront product')` block:

```js
it('resolves brochure_path into a download URL named after the product', () => {
  const product = normalizeRow(productRows[1])

  expect(product.brochureUrl).toBe(
    'https://cdn.test/brochures/job-site-toolbox-1/abc12345.pdf?download=urban-toolbox-job-site-box-brochure.pdf',
  )
})

it('leaves brochureUrl null when the row has no brochure', () => {
  expect(normalizeRow(productRows[0]).brochureUrl).toBeNull()
})
```

Finally, add the same `publicFileUrl` line to the `vi.mock('../lib/supabaseClient.js', ...)` factory in `src/test/catalogLive.test.jsx` — that file calls `normalizeRow`, so without it the mock is missing an export the module now uses.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn vitest run src/test/supabaseClient.test.js src/test/productStore.test.js`
Expected: FAIL — `publicFileUrl is not a function`, and `brochureUrl` is `undefined` rather than a URL.

- [ ] **Step 3: Implement `publicFileUrl`**

In `src/lib/supabaseClient.js`, add below `publicPhotoUrl`:

```js
// Any public-bucket object, with an optional forced download. Supabase reads
// `?download=<filename>` and answers with Content-Disposition: attachment,
// which is what turns a browser-rendered PDF into a saved file.
export function publicFileUrl(storagePath, { download } = {}) {
  const base = `${url}/storage/v1/object/public/product-photos/${storagePath}`
  return download ? `${base}?download=${encodeURIComponent(download)}` : base
}
```

- [ ] **Step 4: Implement the normalized field**

In `src/lib/productStore.js`, extend the `supabaseClient.js` import to include `publicFileUrl`, then add above `normalizeRow`:

```js
// Customers get a branded, predictable filename rather than whatever the admin
// happened to upload. Slugs are already URL-safe, so no extra escaping beyond
// the encodeURIComponent inside publicFileUrl.
function brochureFilename(row) {
  return `urban-toolbox-${row.slug || row.id}-brochure.pdf`
}
```

Inside `normalizeRow`, add the field after `inStock`:

```js
    // Fully-resolved download URL rather than a raw path, matching how `img`
    // is handled — it keeps ProductPage dumb. Null when there is no brochure,
    // which is also how a row reads before 0009 is applied.
    brochureUrl: row.brochure_path
      ? publicFileUrl(row.brochure_path, { download: brochureFilename(row) })
      : null,
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `yarn vitest run src/test/supabaseClient.test.js src/test/productStore.test.js src/test/catalogLive.test.jsx`
Expected: PASS.

- [ ] **Step 6: Run the full suite and linters**

Run: `yarn test && yarn lint && yarn format:check`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/supabaseClient.js src/lib/productStore.js src/test/
git commit -m "feat(brochure): resolve the stored PDF into a download URL"
```

---

### Task 3: Download button on the product page

**Files:**

- Modify: `src/pages/ProductPage.jsx`
- Modify: `src/pages/ProductPage.css`
- Create: `src/test/brochure.test.jsx`

**Interfaces:**

- Consumes: `product.brochureUrl` from Task 2.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the failing test**

Create `src/test/brochure.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { productRows } from './fixtures/productRows.js'

vi.mock('../lib/supabaseClient.js', () => ({
  isConfigured: () => true,
  publicPhotoUrl: (p) => `https://cdn.test/${p}`,
  publicFileUrl: (p, opts) =>
    `https://cdn.test/${p}${opts?.download ? `?download=${opts.download}` : ''}`,
  getSupabase: () => Promise.resolve(null),
}))

const { __setStateForTests, normalizeRow } = await import('../lib/productStore.js')
const { default: ProductPage } = await import('../pages/ProductPage.jsx')

function renderProduct(slug) {
  __setStateForTests({
    status: 'ready',
    products: productRows.map((r) => normalizeRow(r)),
    categoryImages: {},
  })
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/product/${slug}`]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductPage />} />
        </Routes>
      </MemoryRouter>
      ,
    </HelmetProvider>,
  )
}

describe('product page brochure', () => {
  it('links to the brochure with a forced download when the product has one', () => {
    renderProduct('job-site-box')

    const link = screen.getByRole('link', { name: /download brochure/i })
    expect(link).toHaveAttribute(
      'href',
      'https://cdn.test/brochures/job-site-toolbox-1/abc12345.pdf?download=urban-toolbox-job-site-box-brochure.pdf',
    )
  })

  it('renders no brochure link when the product has none', () => {
    renderProduct('580-x-230-x-400mm-aluminium-checker-ute-toolbox')

    expect(screen.queryByRole('link', { name: /download brochure/i })).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn vitest run src/test/brochure.test.jsx`
Expected: FAIL — `Unable to find an accessible element with the role "link" and name /download brochure/i`.

- [ ] **Step 3: Implement the link**

In `src/pages/ProductPage.jsx`, add `FileDown` to the existing lucide import:

```jsx
import { ChevronRight, ShieldCheck, Package, PhoneCall, FileDown } from 'lucide-react'
```

Then, inside the `product-page__actions` div, directly after `<QuoteButton item={quoteItem} />`:

```jsx
{
  /* A plain anchor, not a button with a handler: keyboard,
                  right-click → Save link as, and middle-click all work for
                  free. The Content-Disposition header from ?download= does the
                  real work; the download attribute is belt-and-braces. */
}
{
  product.brochureUrl && (
    <a className="product-page__brochure" href={product.brochureUrl} download>
      <FileDown size={18} strokeWidth={1.8} aria-hidden="true" />
      Download brochure (PDF)
    </a>
  )
}
```

- [ ] **Step 4: Style it as a secondary action**

In `src/pages/ProductPage.css`, add beside the other `product-page__actions` rules. Use only existing custom properties — check the file for the token names already in use and reuse them:

```css
.product-page__brochure {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  margin-top: 0.75rem;
  padding: 0.85rem 1.25rem;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-ink);
  font-weight: 600;
  font-size: 0.95rem;
  text-decoration: none;
  transition:
    border-color var(--transition-fast),
    color var(--transition-fast);
}

.product-page__brochure:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
```

These token names are verified against `src/config/theme.config.js`. Do **not** add new tokens and do **not** write raw hex or rem colour values.

- [ ] **Step 5: Run the test to verify it passes**

Run: `yarn vitest run src/test/brochure.test.jsx`
Expected: PASS, both tests.

- [ ] **Step 6: Check it in a browser**

Run: `yarn dev`, open a product that has a brochure, and confirm the button sits under **Add to quote**, above the trust row, and downloads a file named `urban-toolbox-<slug>-brochure.pdf`. Confirm a product without one shows nothing in its place.

- [ ] **Step 7: Run the full suite and linters**

Run: `yarn test && yarn lint && yarn format:check`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/pages/ProductPage.jsx src/pages/ProductPage.css src/test/brochure.test.jsx
git commit -m "feat(brochure): offer the PDF download in the buy card"
```

---

### Task 4: Admin upload/delete UI

**Files:**

- Create: `src/pages/admin/BrochureManager.jsx`
- Modify: `src/pages/admin/ProductEditor.jsx`
- Modify: `src/pages/admin/Admin.css`
- Modify: `src/test/admin.test.jsx` (mock only)
- Create: `src/test/brochureAdmin.test.jsx`

**Interfaces:**

- Consumes: `uploadBrochure` / `deleteBrochure` from Task 1.
- Produces: `<BrochureManager productId brochurePath onBrochureChange />`.

- [ ] **Step 1: Write the failing test**

First add the two new functions to the `vi.mock('../lib/adminApi.js', ...)` factory in `src/test/admin.test.jsx` — that factory lists every export explicitly, so an unlisted one arrives as `undefined` and breaks `ProductEditor` at import:

```js
  uploadBrochure: vi.fn(async () => 'brochures/x/new12345.pdf'),
  deleteBrochure: vi.fn(async () => null),
```

Then create `src/test/brochureAdmin.test.jsx` — a **separate file** from `brochure.test.jsx`. The storefront tests there mock `supabaseClient.js`; these mock `adminApi.js`. Keeping them apart means neither file needs a mock it doesn't use, and every `vi.mock` sits at the top where it reads in the order it applies:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

// ProductList (Task 5) imports deleteProduct/setProductHidden from the same
// module, so they are stubbed here too — the factory replaces the whole module,
// and an unlisted export arrives as undefined.
vi.mock('../lib/adminApi.js', () => ({
  uploadBrochure: vi.fn(async () => 'brochures/p1/new12345.pdf'),
  deleteBrochure: vi.fn(async () => null),
  deleteProduct: vi.fn(async () => {}),
  setProductHidden: vi.fn(async () => {}),
}))

vi.mock('../lib/supabaseClient.js', () => ({
  isConfigured: () => true,
  publicPhotoUrl: (p) => `https://cdn.test/${p}`,
  publicFileUrl: (p) => `https://cdn.test/${p}`,
  getSupabase: () => Promise.resolve(null),
}))

const { default: BrochureManager } = await import('../pages/admin/BrochureManager.jsx')
const { uploadBrochure, deleteBrochure } = await import('../lib/adminApi.js')

describe('BrochureManager', () => {
  it('rejects a non-PDF without uploading', async () => {
    const user = userEvent.setup()
    render(<BrochureManager productId="p1" brochurePath={null} onBrochureChange={vi.fn()} />)

    await user.upload(
      screen.getByLabelText(/brochure/i),
      new File(['x'], 'photo.png', { type: 'image/png' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(/pdf/i)
    expect(uploadBrochure).not.toHaveBeenCalled()
  })

  it('rejects a PDF over 20MB without uploading', async () => {
    const user = userEvent.setup()
    render(<BrochureManager productId="p1" brochurePath={null} onBrochureChange={vi.fn()} />)

    const big = new File(['x'], 'big.pdf', { type: 'application/pdf' })
    Object.defineProperty(big, 'size', { value: 21 * 1024 * 1024 })
    await user.upload(screen.getByLabelText(/brochure/i), big)

    expect(await screen.findByRole('alert')).toHaveTextContent(/20MB/i)
    expect(uploadBrochure).not.toHaveBeenCalled()
  })

  it('uploads a valid PDF and reports the new path upward', async () => {
    const user = userEvent.setup()
    const onBrochureChange = vi.fn()
    render(
      <BrochureManager productId="p1" brochurePath={null} onBrochureChange={onBrochureChange} />,
    )

    await user.upload(
      screen.getByLabelText(/brochure/i),
      new File(['x'], 'spec.pdf', { type: 'application/pdf' }),
    )

    await waitFor(() => expect(onBrochureChange).toHaveBeenCalledWith('brochures/p1/new12345.pdf'))
  })

  it('deletes the current brochure and reports null upward', async () => {
    const user = userEvent.setup()
    const onBrochureChange = vi.fn()
    render(
      <BrochureManager
        productId="p1"
        brochurePath="brochures/p1/old12345.pdf"
        onBrochureChange={onBrochureChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: /delete brochure/i }))

    await waitFor(() => expect(onBrochureChange).toHaveBeenCalledWith(null))
    expect(deleteBrochure).toHaveBeenCalledWith({
      id: 'p1',
      brochure_path: 'brochures/p1/old12345.pdf',
    })
  })

  it('has no accessibility violations', async () => {
    const { container } = render(
      <BrochureManager
        productId="p1"
        brochurePath="brochures/p1/old12345.pdf"
        onBrochureChange={vi.fn()}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn vitest run src/test/brochureAdmin.test.jsx`
Expected: FAIL — cannot resolve `../pages/admin/BrochureManager.jsx`.

- [ ] **Step 3: Implement the component**

Create `src/pages/admin/BrochureManager.jsx`:

```jsx
import { useRef, useState } from 'react'
import { FileText, FileUp, Trash2 } from 'lucide-react'
import { uploadBrochure, deleteBrochure } from '../../lib/adminApi.js'

const MAX_BYTES = 20 * 1024 * 1024

// One optional PDF per product. Mirrors PhotoManager's busy/error shape, minus
// everything that only a gallery needs — no ordering, no positions, no list.
// The bucket sets no size limit, so an oversized file would otherwise upload
// slowly and fail against the project-wide cap with an opaque error; the guard
// below fails it immediately with something readable instead.
export default function BrochureManager({ productId, brochurePath, onBrochureChange }) {
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run(action) {
    setBusy(true)
    setError('')
    try {
      onBrochureChange(await action())
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function onInputChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      setError('That file isn’t a PDF. Choose a PDF brochure.')
      e.target.value = ''
      return
    }
    if (file.size > MAX_BYTES) {
      setError('That PDF is over 20MB. Compress it and try again.')
      e.target.value = ''
      return
    }
    run(() => uploadBrochure(productId, file))
  }

  const filename = brochurePath ? brochurePath.split('/').pop() : null

  return (
    <div className="admin-brochure">
      <span className="admin__label" id="pe-brochure-label">
        Brochure {busy && <span aria-live="polite">— working…</span>}
      </span>
      <label className="admin-drop" htmlFor="pe-brochure">
        <FileUp className="admin-drop__icon" size={26} strokeWidth={1.6} aria-hidden="true" />
        <span className="admin-drop__title">
          {brochurePath ? 'Replace the brochure' : 'Choose a PDF brochure'}
        </span>
        <span className="admin-drop__sub">
          PDF only · up to 20MB · customers download this from the product page
        </span>
      </label>
      <input
        id="pe-brochure"
        ref={fileRef}
        className="sr-only"
        type="file"
        accept="application/pdf"
        aria-labelledby="pe-brochure-label"
        disabled={busy}
        onChange={onInputChange}
      />
      {error && (
        <p className="admin__error" role="alert">
          {error}
        </p>
      )}
      {brochurePath && (
        <div className="admin-brochure__file">
          <FileText size={16} strokeWidth={1.8} aria-hidden="true" />
          <span className="admin-brochure__name">{filename}</span>
          <button
            type="button"
            className="admin__danger"
            aria-label="Delete brochure"
            disabled={busy}
            onClick={() =>
              run(() => deleteBrochure({ id: productId, brochure_path: brochurePath }))
            }
          >
            <Trash2 size={14} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Wire it into the editor**

In `src/pages/admin/ProductEditor.jsx`, add the import:

```jsx
import BrochureManager from './BrochureManager.jsx'
```

Add state beside the existing `images` state:

```jsx
const [brochurePath, setBrochurePath] = useState(row?.brochure_path ?? null)
```

Then extend the existing `isNew` block at the bottom of the form. Replace it with:

```jsx
{
  isNew ? (
    <p className="admin-photos__hint">
      Save the product first, then reopen it to add photos and a brochure.
    </p>
  ) : (
    <>
      <PhotoManager
        productId={row.id}
        title={form.title}
        images={images}
        onImagesChange={setImages}
      />
      <BrochureManager
        productId={row.id}
        brochurePath={brochurePath}
        onBrochureChange={setBrochurePath}
      />
    </>
  )
}
```

- [ ] **Step 5: Style the file row**

In `src/pages/admin/Admin.css`, add near the `.admin-photos` rules, reusing the tokens already used by neighbouring admin rules:

```css
.admin-brochure {
  margin-top: 1.25rem;
}

.admin-brochure__file {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.75rem;
  padding: 0.65rem 0.85rem;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
}

.admin-brochure__name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9rem;
}
```

These token names are verified against `src/config/theme.config.js`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `yarn vitest run src/test/brochureAdmin.test.jsx src/test/admin.test.jsx`
Expected: PASS.

- [ ] **Step 7: Check it in a browser**

Run: `yarn dev`, sign into `/admin`, open a product, upload a PDF, confirm the file row appears with a delete button. Reload and confirm it persisted. Replace it and confirm the old file is gone from storage. Delete it and confirm the row disappears. Then save the product form and confirm the brochure survives the save — that is the `toRow` guard doing its job.

- [ ] **Step 8: Run the full suite and linters**

Run: `yarn test && yarn lint && yarn format:check`
Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add src/pages/admin/BrochureManager.jsx src/pages/admin/ProductEditor.jsx src/pages/admin/Admin.css src/test/brochureAdmin.test.jsx src/test/admin.test.jsx
git commit -m "feat(admin): upload and delete a product brochure"
```

---

### Task 5: PDF chip in the admin product list

**Files:**

- Modify: `src/pages/admin/ProductList.jsx`
- Modify: `src/pages/admin/Admin.css`
- Test: `src/test/brochureAdmin.test.jsx`

**Interfaces:**

- Consumes: `row.brochure_path` from Task 1 (`fetchAdminProducts` already does `select('*')`, so no query change).
- Produces: nothing.

- [ ] **Step 1: Write the failing test**

Append to `src/test/brochureAdmin.test.jsx`. Its `adminApi` mock already stubs the two functions `ProductList` imports, and the props below match the real signature — `ProductList({ rows, loading, onEdit, onNew, onChanged })`:

```jsx
const { default: ProductList } = await import('../pages/admin/ProductList.jsx')

describe('admin list brochure chip', () => {
  const baseRow = {
    category_id: 'locks',
    title: 'Job Site Box',
    slug: 'job-site-box',
    price: 450,
    hidden: false,
    featured: false,
    sort_order: 0,
    product_images: [],
  }

  function renderList(rows) {
    return render(
      <MemoryRouter>
        <ProductList
          rows={rows}
          loading={false}
          onEdit={vi.fn()}
          onNew={vi.fn()}
          onChanged={vi.fn()}
        />
      </MemoryRouter>,
    )
  }

  it('shows a PDF chip only on rows that have a brochure', () => {
    renderList([
      { ...baseRow, id: 'with-pdf', brochure_path: 'brochures/with-pdf/a1b2c3d4.pdf' },
      { ...baseRow, id: 'no-pdf', title: 'Plain Box', slug: 'plain-box' },
    ])

    expect(screen.getAllByText('PDF')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn vitest run src/test/brochureAdmin.test.jsx -t "PDF chip"`
Expected: FAIL — no element with the text `PDF`.

- [ ] **Step 3: Implement the chip**

In `src/pages/admin/ProductList.jsx`, inside the `admin-badges` div, after the Featured badge block:

```jsx
{
  row.brochure_path && <span className="admin-badge admin-badge--pdf">PDF</span>
}
```

- [ ] **Step 4: Style it**

In `src/pages/admin/Admin.css`, beside the other `.admin-badge--*` rules:

```css
.admin-badge--pdf {
  background: var(--color-border-light);
  color: var(--color-ink-muted);
}
```

A deliberately neutral chip — it reports a fact, not a status, so it should not
compete with the Live / Hidden / Featured badges beside it. These token names are verified
against `src/config/theme.config.js`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `yarn vitest run src/test/brochureAdmin.test.jsx`
Expected: PASS, all blocks.

- [ ] **Step 6: Run the full suite and linters**

Run: `yarn test && yarn lint && yarn format:check`
Expected: all pass.

- [ ] **Step 7: Verify the production build**

Run: `yarn build`
Expected: build succeeds, including the prerender step.

- [ ] **Step 8: Commit**

```bash
git add src/pages/admin/ProductList.jsx src/pages/admin/Admin.css src/test/brochureAdmin.test.jsx
git commit -m "feat(admin): flag which products have a brochure"
```

---

## Final verification

After all five tasks:

- [ ] `yarn test` — full suite green, including the axe passes.
- [ ] `yarn lint && yarn format:check` — clean.
- [ ] `yarn build` — succeeds.
- [ ] Manual end-to-end: upload a brochure in `/admin`, open the product page in a fresh tab, click the download button, confirm the saved file is named `urban-toolbox-<slug>-brochure.pdf` and opens as a valid PDF.
- [ ] Manual regression: save a product form after uploading a brochure, and confirm the brochure is still attached.
