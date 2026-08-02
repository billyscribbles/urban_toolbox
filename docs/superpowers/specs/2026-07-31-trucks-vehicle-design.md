# Trucks — a third Shop by Vehicle scope

**Date:** 2026-07-31
**Status:** shipped; the scope-owned model was superseded by
[2026-08-02-trucks-flag-sliced-design.md](./2026-08-02-trucks-flag-sliced-design.md)
(trucks became flag-sliced like utes/caravans; the scoped categories remain)

## Goal

Add **Trucks** alongside Utes and Caravans in Shop by Vehicle. The `/trucks` page
carries exactly two categories — Truck Toolboxes and Truck Accessories — both
empty for now, and both selectable in the admin product editor so products can be
filed into them the moment they exist.

## Decisions taken

| Question               | Decision                                                                        |
| ---------------------- | ------------------------------------------------------------------------------- |
| How Trucks is modelled | Truck-**scoped categories** (`vehicle: 'truck'` tree nodes), not a fitment flag |
| `/trucks` URL          | Reclaimed from the legacy 301; it is not one of the seven indexed old-site URLs |
| Truck imagery          | Generated with Gemini (image-gen), committed with its webp derivatives          |
| No Supabase change     | Confirmed — the scoped-category model needs no `fits_truck` column              |

### Why scoped categories, not a fitment flag

The site already runs two different vehicle models side by side:

- **Fitment flag** — `/utes` and `/caravans` slice the whole catalogue by a
  per-product `fits_ute` / `fits_caravan` boolean.
- **Scoped category** — Trays, Canopy and Service Canopy are top-level nodes
  tagged `vehicle: 'ute'`: hidden from the generic menus, pinned to `/utes` even
  before their first product lands.

Trucks wants the second one. It gives the page exactly two visible categories
with no products, needs no migration, and keeps truck stock from bleeding into
the ute and caravan pages. The cost — existing ute/caravan products don't appear
on `/trucks` unless re-filed — is acceptable while the truck range is empty.

## Design

### 1. Category tree — `src/data/categories.js`

Two new top-level nodes beside the existing ute-exclusive ones:

```js
{ id: 'truck-toolboxes',   label: 'Truck Toolboxes',   slug: 'truck-toolboxes',   vehicle: 'truck' },
{ id: 'truck-accessories', label: 'Truck Accessories', slug: 'truck-accessories', vehicle: 'truck' },
```

`scopeOf`/`visibleFor` in `lib/catalog.js` already hide any scoped node from the
generic mega-menu, the category pages, and the other vehicles' pages — no change
needed for the hiding half.

**Labels are qualified ("Truck Toolboxes", not "Toolboxes") on purpose.** Every
`vehicle`-tagged top gets its own single-segment page automatically (`App.jsx`
derives routes from `categories.filter(c => c.vehicle)`), and `CategoryPage` sets
`<title>` from `node.label`. Bare labels would ship `/truck-toolboxes` with the
same title as `/toolboxes` — a self-inflicted duplicate-title collision on a site
mid-SEO-migration. Qualified labels also match how people search.

### 2. Vehicle page shape — `src/lib/catalog.js`

`getVehicleSections` currently defaults any unknown vehicle to the `fitsUte`
flag, so `/trucks` would show ute products. Make the two shapes explicit and
share one helper between the page and the nav so they cannot drift:

```js
const VEHICLE_FIT = { ute: 'fitsUte', caravan: 'fitsCaravan' }

// Utes and caravans slice the generic catalogue by a per-product fitment flag.
// Trucks own their two categories and nothing else, so the page lists only the
// tops scoped to it.
const topsForVehicle = (vehicle) =>
  getTopCategories().filter((top) =>
    VEHICLE_FIT[vehicle] ? visibleFor(top, vehicle) : top.vehicle === vehicle,
  )
```

- `getVehicleSections(vehicle)` — tops from `topsForVehicle`; the product filter
  is applied only when the vehicle has a fitment key. With no filter,
  `buildSections` returns both truck sections as-is, empty, which is the desired
  "two categories, no products" state. Each still carries `pinned: true`.
- `getVehicleMenu()` — gains a third column, Trucks → `/trucks`, listing the same
  tops deep-linked to `/trucks#truck-toolboxes` etc.

### 3. Admin — `src/lib/catalog.js`, one line

`SCOPE_HEADINGS` gains `truck: 'Trucks'`. `getAdminCategoryGroups` then buckets
both nodes under a **Trucks** optgroup in the product editor's category select,
the same way it buckets Trays/Canopy/Service Canopy under Utes.

Nothing else in the admin changes: `ProductEditor` builds its `leafIds` from
those groups, so `validateProduct` accepts the new ids without edits, and
`saveProduct` writes `category_id` as free text (categories are code-side, not an
FK).

### 4. Routes and SEO

- `src/App.jsx` — `<Route path="/trucks" element={<VehiclePage vehicle="truck" />} />`.
  The `/truck-toolboxes` and `/truck-accessories` category pages wire themselves
  up through the existing `vehicleTops` map.
- `src/config/redirects.js` — delete `'/trucks': '/toolboxes/truck-boxes'`.
  `/trucks` is absent from `oldSiteUrls`, so `redirects.test.js` stays green; it
  was an internal path retired in the catalogue restructure, carrying no rankings.
- `scripts/routes.mjs` — add `['/trucks', '0.9']` to `PAGES`. The two category
  routes come free from `categoryRoutes()`, which already emits a bare route for
  every `vehicle`-tagged top. Sitemap and prerender both follow.

### 5. Copy and imagery

- `src/pages/VehiclePage.jsx` — a `truck` entry in `VEHICLES` (title "For Trucks",
  intro, SEO description, `path: '/trucks'`, `heroImage`).
- `src/content/fitment.js` — a `truck` entry, so the pinned section heads carry a
  "Fits all trucks" chip. The file's own comment promises a new vehicle scope
  needs only an entry here; this keeps that true.
- `src/pages/ProductPage.jsx` — the breadcrumb hardcodes `vehicleScope === 'ute'`.
  Replace with a scope→crumb map (`ute` → Ute/`/utes`, `truck` → Truck/`/trucks`)
  so a truck-filed product reads Home › Truck › Truck Toolboxes › Product instead
  of losing its vehicle crumb.
- `public/brand/hero-product-truck.*` — Gemini-generated truck photo plus the
  800/1600 webp derivatives from `yarn images`, committed like every other photo.

### 6. Home "Shop by Vehicle" band

`components/ShopByVehicle.jsx` and `content/shopByVehicle.js` exist but are
rendered nowhere — `Home.jsx` uses `CategoryCarousel`. The live Shop by Vehicle
surface is the nav dropdown, which picks Trucks up for free via `getVehicleMenu`.

Still add the third card to the content file and widen `.vehicles__grid` to three
columns (collapsing to one at the existing 700px breakpoint), so the band is
correct whenever it is put back on a page. Cheap, and it keeps the content file
honest against the nav.

## Testing

Extend the existing contract suite (`src/test/`) — no new test infrastructure:

- `catalogLive.test.jsx`
  - vehicle menu columns are `['Caravans', 'Utes', 'Trucks']`, and the Trucks
    column's items deep-link to `/trucks#…`.
  - with an empty catalogue, `getVehicleSections('truck')` returns exactly
    `['truck-toolboxes', 'truck-accessories']`, both pinned, both carrying
    `fitment: 'truck'`.
  - truck categories never appear in `getMegaMenu('toolboxes'|'accessories')`,
    `getVehicleSections('ute')` or `getVehicleSections('caravan')`; conversely
    `/trucks` never shows ute/caravan-only stock.
  - `getAdminCategoryGroups()` has a Trucks group whose option ids are
    `['truck-toolboxes', 'truck-accessories']`; the existing "every leaf is
    fileable" assertion covers the rest.
- `content.test.js` — `shopByVehicle` now has three cards, one routing to
  `/trucks`, each image present on disk.
- `redirects.test.js` — unchanged, must stay green after the `/trucks` deletion.

## Verification

1. `yarn lint && yarn format:check`
2. `yarn test`
3. `yarn build` (prerenders `/trucks`, `/truck-toolboxes`, `/truck-accessories`;
   requires local Chrome) then `yarn preview`
4. Manually: nav dropdown shows three columns; `/trucks` renders two empty
   pinned sections with the fitment chip; both category pages 200; admin editor
   lists the Trucks optgroup and saves a product into it.

## Out of scope

- Any `fits_truck` product flag or Supabase migration.
- Hero CTAs on the homepage (still "Explore Caravans" / "Explore Utes").
- Re-filing existing ute/caravan products under the truck categories.
- Putting the `ShopByVehicle` band back on the homepage.
