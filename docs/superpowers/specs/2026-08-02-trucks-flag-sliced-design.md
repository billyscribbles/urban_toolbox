# Trucks — third flag-sliced vehicle + hero CTA

**Date:** 2026-08-02
**Status:** approved, ready to plan
**Supersedes:** the scope-owned model in
[2026-07-31-trucks-vehicle-design.md](./2026-07-31-trucks-vehicle-design.md) —
the truck-scoped categories stay, but `/trucks` is no longer _only_ them.

## Goal

Make trucks behave exactly like utes and caravans, end to end:

1. A third **Explore Trucks** CTA in the home hero.
2. A **Fits truck** checkbox in the admin product editor, ticked by default.
3. `/trucks` slices the whole catalogue by that flag, the same way `/utes`
   and `/caravans` slice by theirs.

## Decisions taken

| Question                       | Decision                                                                                                        |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Truck model                    | Flag-sliced (`fits_truck` boolean), reversing the 2026-07-31 decision                                           |
| Default for existing products  | **Ticked** — `not null default true` backfills every row as fitting                                             |
| Truck-scoped categories        | Kept, pinned on `/trucks` — the mirror of ute's Trays/Canopy tops                                               |
| Hero CTA count                 | Three; first stays solid, rest ghost (existing `Hero.jsx` map)                                                  |
| Truck Accessories `shortLabel` | Dropped — the generic Accessories group now shares `/trucks`, so the unqualified pill would read as a duplicate |

Accepted trade-off: the moment the migration + deploy land, `/trucks` lists the
entire catalogue (water tanks included) until products are unticked in the
admin.

## Design

### 1. Home hero — `src/content/hero.js`

- `ctas` gains `{ label: 'Explore Trucks', to: '/trucks' }` as the third entry.
- `description` — "for utes and caravans" becomes "for utes, caravans and
  trucks".
- No component or CSS change: `Hero.jsx` maps the array, `.hero__actions`
  already wraps and stacks at the existing breakpoints.

### 2. Database — `supabase/migrations/0010_product_fits_truck.sql`

```sql
alter table public.products
  add column fits_truck boolean not null default true;
```

Same convention as `0008_product_stock.sql`: the default is the whole
backfill. Must be applied in Supabase before (or with) the deploy — the
storefront tolerates the column being absent (`!== false` reads missing as
true), so ordering is safe either way.

### 3. Wiring — five symmetric edits

- `src/lib/catalog.js` — `VEHICLE_FIT` gains `truck: 'fitsTruck'`. That one
  line makes `topsForVehicle('truck')` take the `visibleFor` path (generic
  tops + truck-exclusive tops, pinned) and `getVehicleSections('truck')`
  filter by the flag. Update the comments that describe trucks as the
  scope-owned counter-example.
- `src/lib/productStore.js` — `fitsTruck: row.fits_truck !== false` beside the
  other two.
- `src/lib/adminApi.js` — write `fits_truck: p.fitsTruck !== false`.
- `src/pages/admin/ProductEditor.jsx` — `fitsTruck` in the blank-form
  defaults (true), the row→form mapping, the save payload, and a third
  "Fits trucks" checkbox beside the existing pair.
- `src/data/categories.js` — drop `shortLabel: 'Accessories'` from the
  `truck-accessories` node so its `/trucks` pill and menu item stay
  "Truck Accessories", distinguishable from the generic Accessories group
  now on the same page.

### 4. What updates for free

- Nav "Shop by Vehicle" dropdown: the Trucks column now lists Toolboxes,
  Accessories, Truck Toolboxes, Truck Accessories via `getVehicleMenu`.
- Routes, sitemap, prerender: `/trucks` already registered — no changes.
- `content/vehicles.js`, `content/fitment.js`: truck entries already exist.

### 5. Tests — extend the contract suite, no new infrastructure

- `catalogLive.test.jsx` — the two tests asserting scope-owned semantics are
  rewritten for flag-sliced behaviour:
  - a product with `fits_truck: false` stays off `/trucks`; one with the flag
    missing/true appears in its generic section there.
  - the truck-exclusive sections stay pinned on `/trucks` and still never
    appear in `getMegaMenu('toolboxes'|'accessories')` or on `/utes` /
    `/caravans`.
  - the vehicle-menu test's Trucks column expectation grows to the four
    groups.
- `content.test.js` — hero CTA expectation: two → three, third routing to
  `/trucks`.
- `productStore.test.js` + `fixtures/productRows.js` — cover `fits_truck`
  normalization (missing → true, false → false).

## Verification

1. `yarn lint && yarn format:check && yarn test`
2. `yarn build && yarn preview` — `/trucks` prerender now lists products
   (build needs local Chrome).
3. Manually: hero shows three CTAs; admin editor shows and saves the third
   checkbox; `/trucks` renders generic sections plus the two pinned truck
   sections; unticking a product in admin removes it from `/trucks` only.
4. Apply the migration in Supabase before the Railway deploy.

## Out of scope

- Re-filing products or curating which existing products actually fit trucks
  (admin work, post-deploy).
- Any change to the truck-scoped category pages (`/truck-toolboxes`,
  `/truck-accessories`) or their routes.
- The dormant `ShopByVehicle` home band (already has a trucks card).

## Revision — 2026-08-02, after Billy reviewed the built page

Billy: `/trucks` must show **only two categories — Truck Toolboxes and
Accessories — not four**. Chosen shape (over menu-only shrink and
truck-filed-only): **fold the flagged generic catalogue into the two truck
sections.**

- `src/data/categories.js` — the truck tops gain `absorbs: 'toolboxes'` /
  `absorbs: 'accessories'`, and `truck-accessories` gets its
  `shortLabel: 'Accessories'` back (no longer ambiguous — the generic groups
  left the page).
- `src/lib/catalog.js` — `topsForVehicle` drops any generic top absorbed by
  one of the vehicle's exclusive tops; `getVehicleSections` appends the
  absorbed top's flag-filtered products behind the absorbing section's own
  (truck-filed products lead). Utes/caravans have no `absorbs` tops, so they
  are untouched.
- Nav dropdown Trucks column: back to `['Truck Toolboxes', 'Accessories']`.
- The standalone `/truck-toolboxes` / `/truck-accessories` category pages
  keep listing only their own filed products — absorption is a vehicle-page
  view, not a re-filing.
- Everything else from this spec stands: hero CTA, `fits_truck` column,
  admin checkbox, ticked-by-default backfill.
