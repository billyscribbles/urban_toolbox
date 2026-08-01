# Trucks Vehicle Scope Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Trucks as a third Shop by Vehicle scope — a `/trucks` page holding two empty-but-visible categories (Truck Toolboxes, Truck Accessories), both selectable in the admin product editor.

**Architecture:** Trucks is modelled the way Trays/Canopy/Service Canopy already are — top-level tree nodes tagged `vehicle: 'truck'` in `src/data/categories.js`, hidden from generic menus and pinned to their vehicle page. `lib/catalog.js` gains one explicit map (`VEHICLE_FIT`) separating the two vehicle shapes the site now runs: flag-sliced (utes, caravans) and scope-owned (trucks). No Supabase change, no new product column.

**Tech Stack:** React 18 + Vite 5, React Router v7, plain CSS with variables, Vitest + Testing Library, Supabase (untouched here), `scripts/gen-images.mjs` for webp derivatives.

## Global Constraints

- **No commits.** Billy commits this himself — the working tree already carries his unrelated in-flight edits to `src/data/categories.js` and `src/lib/catalog.js`, and staging those files would sweep them in. Every task ends at green tests, not at a commit.
- **No client strings in components.** Copy lives in `src/content/*.js`; brand/nav/SEO in `src/config/site.config.js`.
- **No new design tokens.** Reuse `var(--…)` from `theme.config.js`; no raw hex or rem in CSS.
- **Category labels are qualified:** `Truck Toolboxes` / `Truck Accessories`, not bare `Toolboxes` / `Accessories`. Every `vehicle`-tagged top auto-owns a single-segment page whose `<title>` is `node.label` (`src/pages/CategoryPage.jsx:58`); bare labels would duplicate `/toolboxes` and `/accessories`.
- **Exact ids and slugs:** `truck-toolboxes`, `truck-accessories`. Slugs are unique tree-wide and are asserted as such by `src/test/content.test.js`.
- **Vehicle scope string is `'truck'`** everywhere (`node.vehicle`, `fitment` key, `VehiclePage` prop, `SCOPE_HEADINGS` key).
- Run tests with `yarn test` (Vitest, single run). Lint with `yarn lint`, formatting with `yarn format:check`.

---

### Task 1: Truck categories and the two vehicle shapes

Adds the tree nodes and teaches `lib/catalog.js` that a vehicle either slices the catalogue by a fitment flag (utes, caravans) or owns its own tops (trucks). Also files them under a **Trucks** heading in the admin picker — one line, and it belongs with this change because `getAdminCategoryGroups` reads the same scope.

**Files:**

- Modify: `src/data/categories.js` (append two top-level nodes after `service-canopy`, `:71`)
- Modify: `src/lib/catalog.js` (`getVehicleSections` `:174`, `getVehicleMenu` `:243`, `SCOPE_HEADINGS` `:272`)
- Modify: `src/content/fitment.js` (add the `truck` entry — an existing test fails without it)
- Test: `src/test/catalogLive.test.jsx`

**Interfaces:**

- Consumes: `getTopCategories()`, `visibleFor(node, scope)`, `buildSections(node, filter, vehicle)` — all already in `lib/catalog.js`.
- Produces:
  - `VEHICLE_FIT: { ute: 'fitsUte', caravan: 'fitsCaravan' }` (module-private)
  - `topsForVehicle(vehicle: string) => Node[]` (module-private)
  - `getVehicleSections('truck')` → `[{ id: 'truck-toolboxes', label: 'Truck Toolboxes', heading, pinned: true, products: [], group: 'Truck Toolboxes', groupSlug: 'truck-toolboxes', fitment: 'truck' }, { …'truck-accessories' }]`
  - `getVehicleMenu().columns` → `['Caravans', 'Utes', 'Trucks']`
  - `getAdminCategoryGroups()` → includes `{ label: 'Trucks', options: [{ id: 'truck-toolboxes', label: 'Truck Toolboxes' }, { id: 'truck-accessories', label: 'Truck Accessories' }] }`

- [ ] **Step 1: Write the failing tests**

Append to the `describe('getVehicleSections — vehicle-filtered range', …)` block in `src/test/catalogLive.test.jsx`, after the existing `pins ute-exclusive categories…` test:

```jsx
it('gives trucks its own two categories, pinned and empty', () => {
  __setStateForTests({ status: 'ready', products: [] })

  // Trucks owns its tops outright — no per-product fitment flag — so the page
  // is exactly these two, present before the first truck product lands.
  const sections = getVehicleSections('truck')
  expect(sections.map((s) => s.id)).toEqual(['truck-toolboxes', 'truck-accessories'])
  for (const s of sections) {
    expect(s.pinned).toBe(true)
    expect(s.products).toEqual([])
    expect(s.fitment).toBe('truck')
    expect(s.group).toBe(s.label)
  }
})

it('keeps the generic catalogue and the other vehicles out of /trucks', () => {
  __setStateForTests({ status: 'ready', products: productRows.map(normalizeRow) })

  // Ute/caravan stock must not leak in: trucks has no fitment flag, so an
  // unfiltered generic top would have dragged the whole catalogue onto it.
  expect(idsIn(getVehicleSections('truck'))).toEqual([])
  expect(getVehicleSections('truck').map((s) => s.group)).not.toContain('Toolboxes')

  // …and the truck categories stay off every generic and rival-vehicle surface.
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

Replace the existing vehicle-menu assertions (`src/test/catalogLive.test.jsx:159-174`) with the three-column version:

```jsx
it('vehicle menu lists each page’s top-level groups under its heading', () => {
  const menu = getVehicleMenu()
  expect(menu.columns.map((c) => c.label)).toEqual(['Caravans', 'Utes', 'Trucks'])

  const [caravans, utes, trucks] = menu.columns
  expect(caravans.items.map((i) => i.label)).toEqual(['Toolboxes', 'Accessories'])
  expect(utes.items.map((i) => i.label)).toEqual([
    'Toolboxes',
    'Accessories',
    'Trays',
    'Canopy',
    'Service Canopy',
  ])
  // Trucks owns its two categories and shows nothing else — not the generic
  // Toolboxes/Accessories tops the flag-sliced vehicles share.
  expect(trucks.items.map((i) => i.label)).toEqual(['Truck Toolboxes', 'Truck Accessories'])
  for (const item of utes.items) expect(item.to).toMatch(/^\/utes#/)
  for (const item of caravans.items) expect(item.to).toMatch(/^\/caravans#/)
  for (const item of trucks.items) expect(item.to).toMatch(/^\/trucks#/)
})
```

Add to the `admin category groups mirror the nav` test (`src/test/catalogLive.test.jsx:217`), directly under the existing `group('Utes')` assertion:

```jsx
expect(group('Trucks').options.map((o) => o.id)).toEqual(['truck-toolboxes', 'truck-accessories'])
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn test src/test/catalogLive.test.jsx`
Expected: FAIL — `getVehicleSections('truck')` returns the generic catalogue (ids `[]` vs two truck ids), the menu has two columns, and `group('Trucks')` is undefined.

Also run: `yarn test src/test/content.test.js`
Expected: PASS for now (the truck scope isn't in the tree yet). It will fail in Step 3 the moment the nodes land without fitment copy — that guard is deliberate, see `src/test/content.test.js:147`.

- [ ] **Step 3: Add the tree nodes**

In `src/data/categories.js`, extend the comment above the ute nodes and append the truck pair after `service-canopy`:

```js
  // `vehicle: 'ute' | 'truck'` marks a node as vehicle-exclusive: absent from
  // the generic catalog menus and pages, surfaced only on that vehicle's page
  // (pinned there even before its first product lands). Top-level leaves, so
  // each stands beside the Browse buttons on the vehicle page rather than
  // inside a group.
  { id: 'trays', label: 'Trays', slug: 'trays', vehicle: 'ute' },
  { id: 'canopy', label: 'Canopy', slug: 'canopy', vehicle: 'ute' },
  { id: 'service-canopy', label: 'Service Canopy', slug: 'service-canopy', vehicle: 'ute' },
  // Trucks is scope-owned rather than flag-sliced (see VEHICLE_FIT in
  // lib/catalog.js): these two ARE the /trucks page. Labels are qualified
  // because each scoped top also owns a single-segment page — a bare
  // "Toolboxes" would ship /truck-toolboxes with /toolboxes' own <title>.
  { id: 'truck-toolboxes', label: 'Truck Toolboxes', slug: 'truck-toolboxes', vehicle: 'truck' },
  {
    id: 'truck-accessories',
    label: 'Truck Accessories',
    slug: 'truck-accessories',
    vehicle: 'truck',
  },
```

- [ ] **Step 4: Add the fitment copy**

In `src/content/fitment.js`, add after the `ute` entry:

```js
  truck: {
    label: 'Fits all trucks',
    spec: 'Rigid, tipper & tray-back · Every make & model',
    note: 'Built to order and measured to your truck — we confirm the fit before we build.',
  },
```

- [ ] **Step 5: Split the two vehicle shapes in `lib/catalog.js`**

Replace `getVehicleSections` (`src/lib/catalog.js:170-195`) with:

```js
// A vehicle page comes in one of two shapes. Utes and caravans slice the whole
// generic catalogue by a per-product fitment flag. A vehicle with no flag owns
// its categories outright (Trucks) — its page lists only the tops scoped to it,
// so nothing filed for another vehicle can drift onto it.
const VEHICLE_FIT = { ute: 'fitsUte', caravan: 'fitsCaravan' }

const topsForVehicle = (vehicle) =>
  getTopCategories().filter((top) =>
    VEHICLE_FIT[vehicle] ? visibleFor(top, vehicle) : top.vehicle === vehicle,
  )

// Every category's sections for the given vehicle page. Flag-sliced vehicles
// ('ute' | 'caravan') keep only the products that fit; scope-owned ones
// ('truck') take their tops whole, empty sections included.
export function getVehicleSections(vehicle) {
  const key = VEHICLE_FIT[vehicle]
  const filter = key ? (p) => p[key] !== false : null
  // Tag each section with its top-level category so the range nav can split the
  // pills into labelled groups.
  return topsForVehicle(vehicle).flatMap((top) =>
    buildSections(top, filter, vehicle).map((s) => ({
      ...s,
      group: top.label,
      // Anchor id for the whole group on the vehicle page (the nav's
      // "Toolboxes" / "Accessories" deep links land on it).
      groupSlug: top.slug,
      // Only the vehicle-exclusive tops carry `vehicle`, so this tags exactly
      // those sections for the fitment chip — they have no hero of their own
      // here to state it. Generic tops get undefined and render no chip.
      fitment: top.vehicle,
    })),
  )
}
```

Replace the `column` helper body and `columns` array in `getVehicleMenu` (`src/lib/catalog.js:243-258`) with:

```js
export function getVehicleMenu() {
  const column = (label, path, vehicle) => ({
    label,
    to: path,
    items: topsForVehicle(vehicle).map((top) => ({ label: top.label, to: `${path}#${top.slug}` })),
  })
  return {
    label: 'Shop by Vehicle',
    to: '/caravans',
    columns: [
      column('Caravans', '/caravans', 'caravan'),
      column('Utes', '/utes', 'ute'),
      column('Trucks', '/trucks', 'truck'),
    ],
    flattened: true,
    listItems: true,
  }
}
```

Update the doc comment above `getVehicleMenu` so it names three columns and states that Trucks lists only its own tops.

Extend `SCOPE_HEADINGS` (`src/lib/catalog.js:272`):

```js
const SCOPE_HEADINGS = {
  ute: 'Utes',
  caravan: 'Caravans',
  truck: 'Trucks',
  'australian-made': 'Custom',
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `yarn test src/test/catalogLive.test.jsx src/test/content.test.js`
Expected: PASS — all four new/updated assertions green, and `every vehicle-scoped category has fitment copy` green because Step 4 supplied the `truck` entry.

Then run the whole suite: `yarn test`
Expected: PASS. If `redirects.test.js` fails here it means Task 2's route work is needed — `/truck-toolboxes` and `/truck-accessories` enter `staticRoutes()` automatically via `categoryRoutes()`, and nothing asserts against them, so this should stay green.

---

### Task 2: The `/trucks` page, its route and its URLs

**Files:**

- Modify: `src/pages/VehiclePage.jsx:9-28` (add the `truck` copy block)
- Modify: `src/App.jsx:165` (add the route)
- Modify: `src/config/redirects.js:18` (delete the legacy `/trucks` redirect)
- Modify: `scripts/routes.mjs` (add `/trucks` to `PAGES`)
- Test: `src/test/redirects.test.js` (add the reclaim assertion)

**Interfaces:**

- Consumes: `getVehicleSections('truck')` from Task 1; `VEHICLES` copy map keyed by scope string.
- Produces: `/trucks` as a served static route (`staticRoutes()` includes `{ path: '/trucks', priority: '0.9' }`), no longer a redirect source.

- [ ] **Step 1: Write the failing test**

Add to `src/test/redirects.test.js`, inside the `describe('redirect targets', …)` block:

```js
// /trucks was an internal path retired in the catalogue restructure, not one
// of the seven ranked GoDaddy URLs — it is now the Trucks vehicle page, and
// must never go back to being a redirect.
it('serves /trucks as a real page rather than redirecting it', () => {
  expect(served.has('/trucks')).toBe(true)
  expect(redirected.has('/trucks')).toBe(false)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test src/test/redirects.test.js`
Expected: FAIL — `served.has('/trucks')` is `false` and `redirected.has('/trucks')` is `true`.

- [ ] **Step 3: Reclaim the URL and add the route**

In `src/config/redirects.js`, delete this line entirely:

```js
  '/trucks': '/toolboxes/truck-boxes', // retired in the catalogue restructure
```

In `scripts/routes.mjs`, add `/trucks` to `PAGES` beside the other vehicle pages:

```js
  ['/utes', '0.9'],
  ['/caravans', '0.9'],
  ['/trucks', '0.9'],
```

In `src/App.jsx`, add the route under the existing vehicle pair (`:165`) and widen the comment above it:

```jsx
              {/* Explore-by-vehicle pages. Utes and caravans are the whole
                  range filtered to products flagged for them in the admin;
                  trucks renders its own two scoped categories. */}
              <Route path="/utes" element={<VehiclePage vehicle="ute" />} />
              <Route path="/caravans" element={<VehiclePage vehicle="caravan" />} />
              <Route path="/trucks" element={<VehiclePage vehicle="truck" />} />
```

- [ ] **Step 4: Add the page copy**

In `src/pages/VehiclePage.jsx`, add a third entry to `VEHICLES` after `caravan`:

```js
  truck: {
    title: 'For Trucks',
    eyebrow: 'Shop by vehicle',
    intro:
      'Aluminium toolboxes and accessories built for trucks — underbody and top-opening boxes, drawers, racks and locks. Australian-made and built to order, measured to your truck. Add what fits to a no-obligation quote.',
    seo: 'Aluminium truck toolboxes and accessories — Australian-made, built to order in Dandenong South. Add to a no-obligation quote.',
    path: '/trucks',
    heroImage: '/brand/hero-truck-1600.webp',
  },
```

The `heroImage` file arrives in Task 3; until then the page hero renders its dark surface with a missing background image, which is cosmetic only.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `yarn test`
Expected: PASS — the whole suite, including the new `/trucks` assertion and the unchanged `legacy URL coverage` block (`/trucks` is absent from `oldSiteUrls`, so removing its redirect breaks nothing).

- [ ] **Step 6: Check it in the browser**

Run: `yarn dev`, then visit:

- `/trucks` — hero reads "For Trucks", two sections: Truck Toolboxes and Truck Accessories, each empty, each with a "Fits all trucks" chip.
- Nav → Shop by Vehicle — three columns; Trucks lists both categories, linking to `/trucks#truck-toolboxes` and `/trucks#truck-accessories`.
- `/truck-toolboxes` and `/truck-accessories` — both render their own CategoryPage (routed automatically from the tree), title reads the qualified label.
- `/toolboxes` and `/accessories` mega-menus — no truck entries.
- `/utes` and `/caravans` — unchanged, no truck sections.

---

### Task 3: Truck breadcrumb on product pages

`ProductPage` hardcodes the ute vehicle crumb, so the first product filed under a truck category would lose its trail back to `/trucks`. Ships now because the admin can file one the moment Task 1 lands.

**Files:**

- Modify: `src/pages/ProductPage.jsx:122-127`
- Test: none. `src/test/` has no ProductPage render test today, and standing one up (store mock + Helmet + Router + quote store) is a bigger change than the two lines it would cover. Verified in the browser at Step 3 instead; `yarn test` still has to stay green.

**Interfaces:**

- Consumes: `path[0]?.vehicle` — the scope string set in Task 1.
- Produces: breadcrumb trail `Home › Truck › Truck Toolboxes › <Product>` for truck-filed products; ute trail unchanged.

- [ ] **Step 1: Replace the ute-only crumb with a scope map**

In `src/pages/ProductPage.jsx`, replace:

```js
const vehicleScope = path[0]?.vehicle ?? null
const vehicleCrumb = vehicleScope === 'ute' ? { label: 'Ute', to: '/utes' } : null
```

with:

```js
// Vehicle-exclusive tops live only on their vehicle page, so the trail reads
// Home › <Vehicle> › <Top> › <Product> — insert the vehicle crumb ahead of
// the category path. Generic catalog tops go straight under Home.
const VEHICLE_CRUMBS = {
  ute: { label: 'Ute', to: '/utes' },
  truck: { label: 'Truck', to: '/trucks' },
}
const vehicleScope = path[0]?.vehicle ?? null
const vehicleCrumb = VEHICLE_CRUMBS[vehicleScope] ?? null
```

Hoist `VEHICLE_CRUMBS` to module scope (beside `crumbHref` at `:28`) rather than rebuilding it per render, and fold the old two-line comment at `:122-125` into the new one so the explanation isn't duplicated.

- [ ] **Step 2: Run the suite**

Run: `yarn test`
Expected: PASS — no behaviour change for ute/generic products.

- [ ] **Step 3: Verify in the browser**

With `yarn dev` running and logged into `/admin`: file any existing product into **Trucks → Truck Toolboxes**, open its product page, confirm the breadcrumb reads Home › Truck › Truck Toolboxes › <title> and the Truck crumb links to `/trucks`. Then put the product back in its original category.

---

### Task 4: Truck photo and the Shop by Vehicle band

The photo the `/trucks` hero points at, plus the third card in `content/shopByVehicle.js`. Note the band component is currently rendered nowhere — `Home.jsx` uses `CategoryCarousel` — so this keeps the content file honest rather than changing the live homepage.

**Files:**

- Create: `public/brand/hero-truck.jpg` (Gemini-generated), `public/brand/hero-truck-800.webp`, `public/brand/hero-truck-1600.webp` (generated by `yarn images`)
- Modify: `src/content/shopByVehicle.js`
- Modify: `src/components/ShopByVehicle.css:12-16` and its `@media (max-width: 700px)` block
- Test: `src/test/content.test.js:114-129`

**Interfaces:**

- Consumes: `Img` builds its srcset by stripping the extension — `/brand/hero-truck.jpg` implies `/brand/hero-truck-800.webp` and `-1600.webp` beside it (`src/components/Img.jsx`).
- Produces: `/brand/hero-truck-1600.webp`, the file `VehiclePage.VEHICLES.truck.heroImage` points at from Task 2.

- [ ] **Step 1: Write the failing test**

Replace the `shopByVehicle` test in `src/test/content.test.js:114-129` with:

```js
it('shopByVehicle has cards routing to /utes, /caravans and /trucks with images on disk', () => {
  expect(shopByVehicle.eyebrow).toBeTruthy()
  expect(shopByVehicle.heading).toBeTruthy()
  expect(shopByVehicle.cards).toHaveLength(3)
  const routes = shopByVehicle.cards.map((c) => c.to)
  expect(routes).toContain('/utes')
  expect(routes).toContain('/caravans')
  expect(routes).toContain('/trucks')
  for (const card of shopByVehicle.cards) {
    expect(card.label).toBeTruthy()
    expect(card.sub).toBeTruthy()
    expect(card.imgAlt).toBeTruthy()
    expect(existsSync(join(process.cwd(), 'public', card.img)), `missing image ${card.img}`).toBe(
      true,
    )
  }
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test src/test/content.test.js`
Expected: FAIL — `expected length 2 to be 3`.

- [ ] **Step 3: Generate the truck photo**

Use the image-gen MCP (Gemini). Prompt for a landscape 16:10 photograph: an Australian rigid truck or tray-back truck fitted with a black or raw aluminium toolbox, outdoor daylight, no visible brand logos or readable number plates, no text overlay — matching the look of the existing `public/brand/hero-ute.jpg` and `hero-caravan.jpg`.

Save the result as `public/brand/hero-truck.jpg`. Then generate the derivatives:

```bash
yarn images
```

Expected: two new files, `public/brand/hero-truck-800.webp` and `public/brand/hero-truck-1600.webp` (the `only: /^hero-/` target in `scripts/gen-images.mjs` picks the file up). Requires `cwebp` — `brew install webp` if the script reports it missing.

- [ ] **Step 4: Add the third card**

In `src/content/shopByVehicle.js`, append after the caravans card and update the file's header comment from "two cards" to "three cards":

```js
    {
      label: 'For Trucks',
      sub: 'Truck toolboxes, drawers, racks & accessories',
      to: '/trucks',
      img: '/brand/hero-truck.jpg',
      imgAlt: 'Aluminium toolbox fitted to a truck',
    },
```

- [ ] **Step 5: Widen the grid**

In `src/components/ShopByVehicle.css`, change the grid to three columns and add a two-up tablet step so the cards never squeeze below a readable width. Update the file's opening comment to name three cards.

```css
.vehicles__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}
```

```css
@media (max-width: 980px) {
  .vehicles__grid {
    grid-template-columns: 1fr 1fr;
  }
}
```

Leave the existing `@media (max-width: 700px)` single-column block as it is.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `yarn test src/test/content.test.js`
Expected: PASS.

- [ ] **Step 7: Confirm the hero photo landed**

Run: `yarn dev` and open `/trucks`. Expected: the page hero now carries the truck photo behind its scrim, with the heading still legible over it.

---

### Task 5: Full verification

**Files:** none — this task only runs the gates named in `CLAUDE.md`.

- [ ] **Step 1: Lint and formatting**

Run: `yarn lint && yarn format:check`
Expected: both clean. If Prettier objects, run `yarn format` and re-run the check.

- [ ] **Step 2: Full test suite**

Run: `yarn test`
Expected: all files pass, including `catalogLive`, `content`, `redirects` and `productStore`.

- [ ] **Step 3: Production build**

Run: `yarn build`
Expected: build succeeds; the prerender step (needs local Chrome) snapshots `/trucks`, `/truck-toolboxes` and `/truck-accessories`, and `gen-seo-files.mjs` writes all three into `public/sitemap.xml`. Confirm with:

```bash
grep -c "trucks\|truck-toolboxes\|truck-accessories" dist/sitemap.xml
```

Expected: at least 3 matching URL entries.

- [ ] **Step 4: Preview and click through**

Run: `yarn preview`, then check `/trucks`, `/truck-toolboxes`, `/truck-accessories`, the three-column Shop by Vehicle dropdown, `/utes`, `/caravans`, and that `/trucks` no longer 301s to `/toolboxes/truck-boxes` (it should render, not redirect).

- [ ] **Step 5: Admin check**

With `yarn dev` and a logged-in `/admin`: open the product editor, confirm the category `<select>` shows a **Trucks** optgroup listing Truck Toolboxes and Truck Accessories, and that saving a product into one succeeds and shows it on `/trucks`.

- [ ] **Step 6: Hand back**

Report results with command output. Leave everything uncommitted — list the changed and new files so Billy can stage them alongside his own in-flight edits.

---

## Deferred (not in this plan)

- Any `fits_truck` product flag or Supabase migration.
- Homepage hero CTAs (still "Explore Caravans" / "Explore Utes").
- Re-filing existing ute/caravan products under truck categories.
- Putting the `ShopByVehicle` band back on the homepage.
