# Trucks as Third Flag-Sliced Vehicle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/trucks` behave exactly like `/utes` and `/caravans` — a per-product "Fits trucks" flag set in the admin, defaulting to ticked, plus a third "Explore Trucks" CTA in the home hero.

**Architecture:** Trucks flips from scope-owned (page = only its two truck categories) to flag-sliced (page = whole catalogue filtered by `fits_truck`, with the two truck-exclusive tops still pinned). One `VEHICLE_FIT` entry in `src/lib/catalog.js` does the flip; the rest is symmetric plumbing of the new flag through the Supabase row shape, the store normalizer, the admin editor, and the save path. Because the generic Accessories group now shares `/trucks`, the `truck-accessories` node loses its `shortLabel` so its pill stays qualified.

**Tech Stack:** React 18 + Vite, plain JS/JSX (no TypeScript), Vitest contract suite, Supabase (SQL migration file applied manually in the dashboard).

**Spec:** `docs/superpowers/specs/2026-08-02-trucks-flag-sliced-design.md`

## Global Constraints

- **No commits without Billy's explicit say-so** (standing rule). Commit steps below exist for when he authorizes; otherwise leave them unchecked and report the worktree state at the end.
- No TypeScript, no Tailwind. Plain JSX + CSS variables.
- No client strings in components — copy lives in `src/content/`, flags flow through config/store layers.
- Repo root: `/Users/billyhuynh/Github/urban_toolbox`. Test runner: `yarn test` (Vitest). Single file: `yarn test src/test/<file>`.
- `default true` on the DB column is the backfill — Billy chose "ticked by default" for all existing products.
- Missing-column semantics everywhere are `!== false` (missing → fits), matching `fits_ute` / `fits_caravan` / `in_stock`.

---

### Task 1: Hero — third "Explore Trucks" CTA

**Files:**

- Modify: `src/content/hero.js`
- Test: `src/test/content.test.js:27-47`

**Interfaces:**

- Produces: `hero.ctas` — array of `{ label, to }`, now three entries ending with `{ label: 'Explore Trucks', to: '/trucks' }`. `Hero.jsx` maps this array generically (first entry solid, rest ghost) — no component change.

- [ ] **Step 1: Update the contract test to expect three CTAs**

In `src/test/content.test.js`, replace the test titled `'hero has a lockup, two CTAs and a photo on disk'` — specifically its title and the CTA block (`expect(hero.ctas).toHaveLength(2)` and the loop) — with:

```js
  it('hero has a lockup, three CTAs and a photo on disk', () => {
    expect(hero.eyebrow).toBeTruthy()
    expect(hero.headingLines.length).toBeGreaterThan(0)
    for (const line of hero.headingLines) expect(line).toBeTruthy()
    expect(hero.description).toBeTruthy()
    expect(hero.alt).toBeTruthy()

    // One CTA per explore-by-vehicle page, in display order.
    expect(hero.ctas.map((c) => c.to)).toEqual(['/caravans', '/utes', '/trucks'])
    for (const cta of hero.ctas) {
      expect(cta.label).toBeTruthy()
      expect(cta.to).toMatch(/^\//)
    }
```

(The photo/derivative assertions that follow stay untouched.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test src/test/content.test.js`
Expected: FAIL — received array `['/caravans', '/utes']` does not equal `['/caravans', '/utes', '/trucks']`.

- [ ] **Step 3: Add the CTA and update the copy in `src/content/hero.js`**

Replace the `description` and `ctas` fields:

```js
  description:
    "Premium toolboxes and storage solutions for utes, caravans and trucks. Built tough for Australia's harshest conditions.",
  ctas: [
    { label: 'Explore Caravans', to: '/caravans' },
    { label: 'Explore Utes', to: '/utes' },
    { label: 'Explore Trucks', to: '/trucks' },
  ],
```

Also update the file-top comment: `"two CTAs that split the audience down the middle (caravan owners / ute owners)"` becomes `"three CTAs that split the audience (caravan owners / ute owners / truck owners)"`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn test src/test/content.test.js`
Expected: PASS (whole file green).

- [ ] **Step 5: Commit (only if Billy has authorized commits)**

```bash
git add src/content/hero.js src/test/content.test.js
git commit -m "feat(home): add the Explore Trucks CTA to the hero"
```

---

### Task 2: `fits_truck` — migration file + store normalization

**Files:**

- Create: `supabase/migrations/0010_product_fits_truck.sql`
- Modify: `src/lib/productStore.js:65-68`
- Test: `src/test/productStore.test.js:77-86`, `src/test/fixtures/productRows.js`

**Interfaces:**

- Consumes: raw Supabase row shape (`fits_truck` boolean column, may be absent pre-migration).
- Produces: `normalizeRow(row).fitsTruck` — boolean, `row.fits_truck !== false`. Task 3's catalog filter reads exactly this property name.

- [ ] **Step 1: Extend the fixture and the flag-mapping test**

In `src/test/fixtures/productRows.js`, inside the `job-site-toolbox-1` row, extend the vehicle-flag block:

```js
    // Caravan-only — exercises the vehicle filter (the other row omits the
    // flags entirely, so it defaults to fits-all). Also opted out of trucks.
    fits_ute: false,
    fits_caravan: true,
    fits_truck: false,
```

In `src/test/productStore.test.js`, replace the test `'maps vehicle-fit flags, defaulting to fits-both when the columns are absent'` with:

```js
it('maps vehicle-fit flags, defaulting to fits-all when the columns are absent', () => {
  // productRows[0] omits the flags entirely → all three true.
  const all = normalizeRow(productRows[0])
  expect(all.fitsUte).toBe(true)
  expect(all.fitsCaravan).toBe(true)
  expect(all.fitsTruck).toBe(true)
  // productRows[1] is caravan-only.
  const caravanOnly = normalizeRow(productRows[1])
  expect(caravanOnly.fitsUte).toBe(false)
  expect(caravanOnly.fitsCaravan).toBe(true)
  expect(caravanOnly.fitsTruck).toBe(false)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test src/test/productStore.test.js`
Expected: FAIL — `all.fitsTruck` is `undefined`, not `true`.

- [ ] **Step 3: Add the normalization line and the migration**

In `src/lib/productStore.js`, replace the vehicle-flag block of `normalizeRow`:

```js
    // Vehicle-fit flags drive the /utes, /caravans and /trucks explore pages.
    // Missing (older rows read before the migrations) counts as fits-all.
    fitsUte: row.fits_ute !== false,
    fitsCaravan: row.fits_caravan !== false,
    fitsTruck: row.fits_truck !== false,
```

Create `supabase/migrations/0010_product_fits_truck.sql`:

```sql
-- Third vehicle-fit flag: /trucks flips from scope-owned (only its two truck
-- categories) to flag-sliced like /utes and /caravans. `not null default true`
-- is the whole backfill — every existing product fits trucks on apply, and the
-- admin unticks the ones that don't. Enforced app-side (the storefront filters
-- on it), matching fits_ute/fits_caravan which predate the migration files.
alter table public.products
  add column fits_truck boolean not null default true;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn test src/test/productStore.test.js`
Expected: PASS (whole file green).

- [ ] **Step 5: Commit (only if Billy has authorized commits)**

```bash
git add supabase/migrations/0010_product_fits_truck.sql src/lib/productStore.js src/test/productStore.test.js src/test/fixtures/productRows.js
git commit -m "feat(catalog): add the fits_truck flag to the product row contract"
```

---

### Task 3: Catalog flip — `VEHICLE_FIT.truck`, qualified truck labels

**Files:**

- Modify: `src/lib/catalog.js:177-193`, `src/data/categories.js:71-85`
- Test: `src/test/catalogLive.test.jsx:161-253`

**Interfaces:**

- Consumes: `normalizeRow(...).fitsTruck` from Task 2.
- Produces: `getVehicleSections('truck')` — generic sections filtered by `fitsTruck` plus the two pinned truck sections, labels `'Truck Toolboxes'` / `'Truck Accessories'`; `getVehicleMenu()` Trucks column items `['Toolboxes', 'Accessories', 'Truck Toolboxes', 'Truck Accessories']`.

- [ ] **Step 1: Rewrite the four truck-semantics tests**

In `src/test/catalogLive.test.jsx`, replace the test `'gives trucks its own two categories, pinned and empty'` with:

```js
it('pins the truck categories to /trucks even before products exist', () => {
  __setStateForTests({ status: 'ready', products: [] })

  // Empty generic sections drop away; the truck-exclusive tops stay pinned.
  // Labels keep their qualifier now that the generic Toolboxes/Accessories
  // groups share the page — a bare "Accessories" pill would read as a
  // duplicate.
  const sections = getVehicleSections('truck')
  expect(sections.map((s) => s.id)).toEqual(['truck-toolboxes', 'truck-accessories'])
  expect(sections.map((s) => s.label)).toEqual(['Truck Toolboxes', 'Truck Accessories'])
  for (const s of sections) {
    expect(s.pinned).toBe(true)
    expect(s.products).toEqual([])
    expect(s.fitment).toBe('truck')
    expect(s.group).toBe(s.label)
  }
})
```

Replace the test `'keeps the generic catalogue and the other vehicles out of /trucks'` with:

```js
it('slices the generic catalogue by fits_truck, like the other vehicle pages', () => {
  __setStateForTests({ status: 'ready', products: productRows.map(normalizeRow) })

  // Flag-sliced: the row omitting the flag fits, the opted-out row
  // (fits_truck: false) stays off.
  const truckIds = idsIn(getVehicleSections('truck'))
  expect(truckIds).toContain('ute-under-tray-boxes-1')
  expect(truckIds).not.toContain('job-site-toolbox-1')
  expect(getVehicleSections('truck').map((s) => s.group)).toContain('Toolboxes')

  // …while the truck categories stay off every generic and rival-vehicle
  // surface.
  for (const top of ['toolboxes', 'accessories']) {
    const labels = getMegaMenu(top).columns.map((c) => c.label)
    expect(labels).not.toContain('Truck Toolboxes')
    expect(labels).not.toContain('Truck Accessories')
  }
  for (const v of ['ute', 'caravan']) {
    const ids = getVehicleSections(v).map((s) => s.id)
    expect(ids).not.toContain('truck-toolboxes')
    expect(ids).not.toContain('truck-accessories')
  }
})
```

In the test `'lists a product filed under a truck category on /trucks, and nowhere else'`, replace the leading comment (the three lines beginning `// Deliberately flagged fits_ute/fits_caravan true`) with:

```js
// fits_ute/fits_caravan true is irrelevant here: truck-toolboxes is
// exclusive to /trucks, and the other vehicle pages never surface a rival
// vehicle's scoped tops.
```

…and at the end of that same test (after the `getMegaMenu` loop), add:

```js
// The flag governs the pinned sections too — untick and it leaves /trucks.
__setStateForTests({
  status: 'ready',
  products: [...productRows, { ...truckRow, fits_truck: false }].map((r) => normalizeRow(r)),
})
expect(idsIn(getVehicleSections('truck'))).not.toContain('truck-drawer-1')
```

In the test `'vehicle menu lists each page’s top-level groups under its heading'`, replace the Trucks expectation (the comment starting `// Trucks owns its two categories` and the `expect(trucks.items...)` line) with:

```js
// Trucks is flag-sliced like the others, so its column carries the shared
// generic tops plus its own two, qualified to tell the pairs apart.
expect(trucks.items.map((i) => i.label)).toEqual([
  'Toolboxes',
  'Accessories',
  'Truck Toolboxes',
  'Truck Accessories',
])
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn test src/test/catalogLive.test.jsx`
Expected: FAIL — all four rewritten tests (trucks sections currently exclude the generic catalogue; menu column has two items; label reads `'Accessories'`).

- [ ] **Step 3: Flip the catalog model**

In `src/lib/catalog.js`, replace the block from the comment above `VEHICLE_FIT` through `topsForVehicle` (currently lines 177-186):

```js
// Every vehicle page slices the whole generic catalogue by its per-product
// fitment flag, and additionally pins the tops scoped to it (`vehicle:` nodes —
// ute's Trays/Canopy/Service Canopy, truck's Truck Toolboxes/Accessories).
const VEHICLE_FIT = { ute: 'fitsUte', caravan: 'fitsCaravan', truck: 'fitsTruck' }

const topsForVehicle = (vehicle) => getTopCategories().filter((top) => visibleFor(top, vehicle))
```

And update the comment above `getVehicleSections` (currently `// Every category's sections for the given vehicle page. Flag-sliced vehicles…`):

```js
// Every category's sections for the given vehicle page: generic sections keep
// only the products flagged for the vehicle, exclusive sections come back
// pinned (kept even while empty).
```

In `src/data/categories.js`, replace the truck block (the comment starting `// Trucks is scope-owned` through the `truck-accessories` node):

```js
  // Truck-exclusive tops (see VEHICLE_FIT in lib/catalog.js): pinned to
  // /trucks beside the flag-sliced generic catalogue. Labels stay qualified
  // for two reasons: each scoped top owns a single-segment page, so a bare
  // "Toolboxes" would ship /truck-toolboxes with /toolboxes' own <title>; and
  // the generic Toolboxes/Accessories groups share the /trucks page, so an
  // unqualified pill would read as a duplicate.
  { id: 'truck-toolboxes', label: 'Truck Toolboxes', slug: 'truck-toolboxes', vehicle: 'truck' },
  {
    id: 'truck-accessories',
    label: 'Truck Accessories',
    slug: 'truck-accessories',
    vehicle: 'truck',
  },
```

(The only functional change in that block is deleting `shortLabel: 'Accessories'`.)

- [ ] **Step 4: Run the full suite to verify it passes**

Run: `yarn test`
Expected: PASS — the rewritten truck tests plus every other file (nothing else asserts the old truck semantics; `a11y`/`navbar` render from the same helpers and must stay green).

- [ ] **Step 5: Commit (only if Billy has authorized commits)**

```bash
git add src/lib/catalog.js src/data/categories.js src/test/catalogLive.test.jsx
git commit -m "feat(catalog): slice /trucks by the fits_truck flag like the other vehicles"
```

---

### Task 4: Admin — "Fits trucks" checkbox and save path

**Files:**

- Modify: `src/lib/adminApi.js:98-118`, `src/pages/admin/ProductEditor.jsx`
- Test: `src/test/adminApi.test.js:176-238`

**Interfaces:**

- Consumes: form field `fitsTruck` (boolean) in the `saveProduct` payload.
- Produces: `fits_truck` column on the upserted row, `p.fitsTruck !== false`.

- [ ] **Step 1: Extend the saveProduct mapping tests**

In `src/test/adminApi.test.js`, inside the test `'maps camelCase fields to snake_case columns on insert'`, add to the `toMatchObject` expectation (beside `in_stock: true`):

```js
      // Nothing passed the vehicle flags, so the row lands fitting all three —
      // the same default the columns themselves carry.
      fits_ute: true,
      fits_caravan: true,
      fits_truck: true,
```

After the test `'persists a back-order product as in_stock false'`, add:

```js
it('persists an opted-out vehicle fit as false', async () => {
  await saveProduct(
    {
      id: 'nf',
      slug: 'nf',
      title: 'No Fit',
      categoryId: 'locks',
      price: null,
      discountPct: null,
      fitsTruck: false,
    },
    { isNew: true },
  )
  expect(calls.upserts[0].row).toMatchObject({
    fits_truck: false,
    fits_ute: true,
    fits_caravan: true,
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn test src/test/adminApi.test.js`
Expected: FAIL — upserted row has no `fits_truck` key.

- [ ] **Step 3: Plumb the flag through the save path and the editor**

In `src/lib/adminApi.js` `toRow`, after `fits_caravan`:

```js
    fits_truck: p.fitsTruck !== false,
```

In `src/pages/admin/ProductEditor.jsx`, four edits:

1. Blank-form defaults in `toForm` — after `fitsCaravan: true,`:

```js
      fitsTruck: true,
```

2. Row→form mapping in `toForm` — after `fitsCaravan: row.fits_caravan !== false,`:

```js
    fitsTruck: row.fits_truck !== false,
```

3. Save payload in `onSubmit` — after `fitsCaravan: form.fitsCaravan,`:

```js
        fitsTruck: form.fitsTruck,
```

4. Checkbox in the "Show on vehicle pages" fieldset — after the "Fits caravans" label:

```jsx
<label className="admin-editor__check">
  <input type="checkbox" checked={form.fitsTruck} onChange={set('fitsTruck')} />
  Fits trucks
</label>
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `yarn test src/test/adminApi.test.js src/test/admin.test.jsx`
Expected: PASS — both files (the admin render tests must not be disturbed by the new checkbox).

- [ ] **Step 5: Commit (only if Billy has authorized commits)**

```bash
git add src/lib/adminApi.js src/pages/admin/ProductEditor.jsx src/test/adminApi.test.js
git commit -m "feat(admin): add the Fits trucks checkbox to the product editor"
```

---

### Task 5: Full verification

**Files:** none new — this is the gate.

- [ ] **Step 1: Lint + format**

Run: `yarn lint && yarn format:check`
Expected: both clean. If Prettier flags the edited files, run `yarn format` and re-check.

- [ ] **Step 2: Full test suite**

Run: `yarn test`
Expected: PASS, no skips.

- [ ] **Step 3: Production build + preview spot-check**

Run: `yarn build` (needs local Chrome for the prerender), then `yarn preview`.
Check on the preview URL:

- `/` — hero shows three CTAs; Explore Trucks lands on `/trucks`.
- `/trucks` — generic Toolboxes/Accessories sections render (fixture-free, so live/local data), with the two qualified truck sections pinned; nav dropdown's Trucks column lists four groups.
- `/utes`, `/caravans` — unchanged, no truck categories.

- [ ] **Step 4: Report the deploy dependency**

The Supabase migration `0010_product_fits_truck.sql` must be run in the Supabase SQL editor before (or with) the Railway deploy. Safe in either order — the app reads a missing column as `true` — but the admin cannot persist untick until it's applied. Include this in the final report to Billy; do not run it against the live DB without his say-so.

---

### Task 6 (revision): Fold the generic catalogue into the two truck sections

Billy's review feedback: `/trucks` shows only Truck Toolboxes + Accessories.
See the spec's Revision section. TDD against `catalogLive.test.jsx`: rewrite
the four truck tests for the folded shape (two sections only, absorbed
products behind truck-filed ones, menu column back to two qualified items),
watch them fail, then add `absorbs`/`shortLabel` to the truck nodes and the
absorb logic to `topsForVehicle`/`getVehicleSections`, watch the full suite
pass, re-run lint/format/build/preview checks.
