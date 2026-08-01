# Featured Products Rail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the catalogue's existing `featured` flag as a manually-paged product carousel on the home page, and give the admin a star toggle plus a dedicated Featured Products tab to curate it.

**Architecture:** No migration — `products.featured` already exists and is already written by the editor. A new pure read helper (`getFeaturedProducts`) filters the live product store; a new `FeaturedRail` section component renders those products on a scroll-snapped track paged by arrow buttons. On the admin side, a single-column `setProductFeatured` write (a direct mirror of the existing `setProductHidden`) backs both a row-level star toggle in the Products table and a new Featured Products panel.

**Tech Stack:** React 18, Vite 5, React Router v7, plain CSS with CSS custom properties, Lucide icons, Supabase JS, Vitest + Testing Library + jest-axe.

**Spec:** `docs/superpowers/specs/2026-08-01-featured-products-rail-design.md`

## Global Constraints

- **No Tailwind, no styled-components, no TypeScript.** Plain CSS + JSX only.
- **No raw hex or rem in component CSS.** Use the theme tokens: `--color-*`, `--radius-*`, `--shadow-*`, `--transition-*`. Add a token to `src/config/theme.config.js` rather than inlining a value.
- **No client strings in components.** Section copy lives in `src/content/`.
- **Commits are authorised for this plan** on the branch `feat/featured-products-rail`. Run each task's commit step as written. **Never push, and never commit to `main`.** The working tree carries unrelated in-progress edits (`GO-LIVE.md`, `docs/seo-migration.md`, various untracked docs) — stage only the files each task's commit step names, never `git add -A` or `git add .`.
- **No new dependencies.** Everything needed is already installed.
- **Commands:** `yarn test` (Vitest), `yarn lint`, `yarn format:check`, `yarn build`. Single file: `yarn test src/test/featured.test.jsx`.
- **Existing token names** (verified against `src/lib/applyTheme.js`): `--radius-md`, `--radius-full`, `--shadow-lg`, `--transition-fast`, `--transition-base`, `--color-border-light`, `--color-off-white`, `--color-accent`, `--color-accent-hover`, `--color-ink-strong`.
- **Existing utility classes:** `.container`, `.section`, `.section--alt`, `.h2`, `.h2--md`. Admin: `.admin-card`, `.admin-toolbar`, `.admin__label`, `.admin__label-hint`, `.admin__error`, `.admin__empty`, `.admin__ghost`, `.admin__icon`, `.admin-badge`, `.admin-badge--hidden`, `.admin-table__thumb`.

---

### Task 1: `getFeaturedProducts` read helper

**Files:**

- Modify: `src/lib/catalog.js` (append after `getRelatedProducts`, which ends at line 137)
- Test: `src/test/featured.test.jsx` (create)

**Interfaces:**

- Consumes: `getProducts()` from `src/lib/productStore.js` (already imported at `catalog.js:9`). Products are already filtered to `hidden = false` and ordered `sort_order` then `id` by the store's query.
- Produces: `getFeaturedProducts(limit = 12) => Product[]` — the storefront-normalized product shape (`{ id, slug, title, img, imgAlt, price, discountPct, featured, ... }`).

- [ ] **Step 1: Write the failing test**

Create `src/test/featured.test.jsx`. The `vi.mock` of `supabaseClient` plus the `await import` ordering is the house pattern (see `src/test/catalogLive.test.jsx:7-28`) — the mock must be hoisted before the modules under test are imported.

```jsx
import { describe, it, expect, vi } from 'vitest'

// Pins photo URLs to a stable host so assertions don't depend on whichever
// VITE_SUPABASE_URL happens to be in .env.
vi.mock('../lib/supabaseClient.js', () => ({
  isConfigured: () => true,
  publicPhotoUrl: (p) => `https://cdn.test/${p}`,
  getSupabase: () => Promise.resolve(null),
}))

const { __setStateForTests, normalizeRow } = await import('../lib/productStore.js')
const { getFeaturedProducts } = await import('../lib/catalog.js')

// Minimal DB row. category_id must be a real leaf from src/data/categories.js.
const row = (id, extra = {}) => ({
  id,
  category_id: 'top-opening-toolboxes',
  title: id.toUpperCase(),
  slug: id,
  product_images: [],
  ...extra,
})

const seed = (rows) =>
  __setStateForTests({ status: 'ready', products: rows.map((r) => normalizeRow(r)) })

describe('getFeaturedProducts', () => {
  it('returns only featured products, in catalogue order', () => {
    seed([row('a'), row('b', { featured: true }), row('c'), row('d', { featured: true })])
    expect(getFeaturedProducts().map((p) => p.id)).toEqual(['b', 'd'])
  })

  it('caps the rail at the limit', () => {
    seed(['a', 'b', 'c'].map((id) => row(id, { featured: true })))
    expect(getFeaturedProducts(2).map((p) => p.id)).toEqual(['a', 'b'])
  })

  it('returns nothing when nothing is featured', () => {
    seed([row('a'), row('b')])
    expect(getFeaturedProducts()).toEqual([])
  })

  it('returns nothing when the catalogue failed to load', () => {
    __setStateForTests({ status: 'error', products: [] })
    expect(getFeaturedProducts()).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test src/test/featured.test.jsx`
Expected: FAIL — `getFeaturedProducts is not a function`.

- [ ] **Step 3: Write the implementation**

Append to `src/lib/catalog.js`, directly after `getRelatedProducts` (line 137):

```js
// The home page's "Featured Products" rail: every product with `featured`
// ticked in /admin. getProducts() already excludes hidden rows and is ordered
// sort_order then id, so the rail matches catalogue order for free — there is
// deliberately no separate ordering column to keep in sync. `limit` caps a
// runaway rail; 12 is four full pages at the desktop card count.
export function getFeaturedProducts(limit = 12) {
  return getProducts()
    .filter((p) => p.featured)
    .slice(0, limit)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn test src/test/featured.test.jsx`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit** (only if Billy has green-lit committing — see Global Constraints)

```bash
git add src/lib/catalog.js src/test/featured.test.jsx
git commit -m "feat(catalog): read the featured products rail off the live store"
```

---

### Task 2: Section copy in `src/content/featured.js`

**Files:**

- Create: `src/content/featured.js`
- Modify: `src/test/content.test.js` (add an import and a case to the existing `describe('content — section copy contract')` block)

**Interfaces:**

- Produces: `featuredSection => { eyebrow: string, heading: string, cta: string }`, consumed by `FeaturedRail` in Task 3.

- [ ] **Step 1: Write the failing test**

Add the import beside the other content imports at the top of `src/test/content.test.js` (they run from line 6 to line 15):

```js
import { featuredSection } from '../content/featured.js'
```

Add this case inside the existing `describe('content — section copy contract', ...)` block:

```js
it('featured rail has an eyebrow, heading and CTA label', () => {
  expect(featuredSection.eyebrow).toBeTruthy()
  expect(featuredSection.heading).toBeTruthy()
  expect(featuredSection.cta).toBeTruthy()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test src/test/content.test.js`
Expected: FAIL — cannot resolve `../content/featured.js`.

- [ ] **Step 3: Write the implementation**

Create `src/content/featured.js`:

```js
// Home "Featured Products" rail — section copy only.
//
// The products themselves are NOT listed here: the rail renders every product
// with `featured` ticked in /admin, in catalogue order. See
// getFeaturedProducts() in src/lib/catalog.js.
//
// Contract (src/test/content.test.js): all three strings must be non-empty.
export const featuredSection = {
  eyebrow: 'Hand-picked',
  heading: 'Featured Products',
  cta: 'View details',
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn test src/test/content.test.js`
Expected: PASS.

- [ ] **Step 5: Commit** (only if Billy has green-lit committing)

```bash
git add src/content/featured.js src/test/content.test.js
git commit -m "feat(content): add the featured rail section copy"
```

---

### Task 3: The `FeaturedRail` component — rendering

Paging arrows come in Task 4. This task lands the section, the cards, and the empty state.

**Files:**

- Create: `src/components/FeaturedRail.jsx`
- Create: `src/components/FeaturedRail.css`
- Modify: `src/test/setup.js` (add a `ResizeObserver` stub)
- Test: `src/test/featured.test.jsx` (extend)

**Interfaces:**

- Consumes: `getFeaturedProducts()` (Task 1), `featuredSection` (Task 2), `useProductCatalog()` from `src/lib/productStore.js`, and the existing `Eyebrow`, `Img`, `PriceTag` components.
- Produces: default export `FeaturedRail`, a section component taking no props. Consumed by `Home.jsx` in Task 5.

- [ ] **Step 1: Stub `ResizeObserver` in the test setup**

jsdom ships no `ResizeObserver`, and Task 4's effect constructs one. Add to `src/test/setup.js`, following the existing stub pattern at lines 21-30:

```js
if (!window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
```

- [ ] **Step 2: Write the failing tests**

Append to `src/test/featured.test.jsx`. Add the render imports to the top of the file (below the existing `vi.mock` block, above the `await import` lines):

```jsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)
```

And add this import beside the other `await import` lines:

```jsx
const { default: FeaturedRail } = await import('../components/FeaturedRail.jsx')
const { featuredSection } = await import('../content/featured.js')
```

Then append these cases:

```jsx
const renderRail = () =>
  render(
    <MemoryRouter>
      <FeaturedRail />
    </MemoryRouter>,
  )

describe('FeaturedRail', () => {
  it('renders one card per featured product, linking to its product page', () => {
    seed([
      row('a', { featured: true, title: 'Alloy Toolbox', slug: 'alloy-toolbox', price: 1299 }),
      row('b'),
      row('c', { featured: true, title: 'Dog Box', slug: 'dog-box', price: 890 }),
    ])
    renderRail()

    expect(screen.getByRole('heading', { name: featuredSection.heading })).toBeInTheDocument()
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', '/product/alloy-toolbox')
    expect(links[1]).toHaveAttribute('href', '/product/dog-box')
    expect(screen.getByText('Alloy Toolbox')).toBeInTheDocument()
    // PriceTag formats to "from $1,299 + GST" — assert the money, not the chrome.
    expect(screen.getByText(/\$1,299/)).toBeInTheDocument()
  })

  it('falls back to the id when a product predates slugs', () => {
    seed([row('legacy-id', { featured: true, slug: undefined })])
    renderRail()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/product/legacy-id')
  })

  it('shows the enquiry line instead of a price when a product has none', () => {
    seed([row('a', { featured: true, price: null })])
    renderRail()
    expect(screen.getByText(/enquire for pricing/i)).toBeInTheDocument()
  })

  it('renders nothing at all when no product is featured', () => {
    seed([row('a'), row('b')])
    const { container } = renderRail()
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when the catalogue failed to load', () => {
    __setStateForTests({ status: 'error', products: [] })
    const { container } = renderRail()
    expect(container).toBeEmptyDOMElement()
  })

  it('has no axe violations', async () => {
    seed([
      row('a', { featured: true, title: 'Alloy Toolbox', slug: 'alloy-toolbox', price: 1299 }),
      row('c', { featured: true, title: 'Dog Box', slug: 'dog-box', price: 890 }),
    ])
    const { container } = renderRail()
    expect(await axe(container)).toHaveNoViolations()
  })
})
```

Note: the existing `a11y.test.jsx` renders `Home` against an unseeded store, so the rail returns `null` there and axe never sees it. That is why the axe assertion lives here with a seeded catalogue.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `yarn test src/test/featured.test.jsx`
Expected: FAIL — cannot resolve `../components/FeaturedRail.jsx`.

- [ ] **Step 4: Write the component**

Create `src/components/FeaturedRail.jsx`. The `useState`/`useRef`/`useEffect` scaffolding for paging lands in Task 4; this version renders the static track.

```jsx
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { featuredSection } from '../content/featured.js'
import { getFeaturedProducts } from '../lib/catalog.js'
import { useProductCatalog } from '../lib/productStore.js'
import Eyebrow from './Eyebrow.jsx'
import Img from './Img.jsx'
import PriceTag from './PriceTag.jsx'
import './FeaturedRail.css'

// Cards render at ~300px on desktop and near-full-width on a phone, so the
// 400px derivative covers 1x and the 800px one covers 2x.
const CARD_SIZES = '(max-width: 767px) 78vw, (max-width: 1023px) 46vw, 300px'

// Home "Featured Products" rail: every product with `featured` ticked in
// /admin, in catalogue order, on a scroll-snapped track.
//
// Unlike the category strip above it, this rail never moves on its own — its
// cards carry a CTA, and a moving target is a hostile one.
//
// Renders nothing when nothing is featured. A failed catalogue load reads the
// same way (getProducts() returns []), which is deliberate: an empty band is
// worse than no band, and a skeleton that usually resolves to nothing would
// shove the page around on every load.
export default function FeaturedRail() {
  // Subscribe so the rail repaints when the catalogue lands. main.jsx kicks the
  // fetch off at boot, so there's no load call to make here.
  useProductCatalog()
  const products = getFeaturedProducts()

  if (!products.length) return null

  return (
    <section className="featured">
      <div className="container">
        <div className="featured__head">
          <div>
            <Eyebrow>{featuredSection.eyebrow}</Eyebrow>
            <h2 className="h2 h2--md featured__heading">{featuredSection.heading}</h2>
          </div>
        </div>

        {/* tabIndex + aria-label: axe's scrollable-region-focusable rule wants a
            scrolling region reachable by keyboard, and the label names what it
            holds. Tabbing the cards scrolls them into view natively. */}
        <ul className="featured__track" tabIndex={0} aria-label={featuredSection.heading}>
          {products.map((p) => (
            <li className="featured__item" key={p.id}>
              <Link className="featured-card" to={`/product/${p.slug || p.id}`}>
                <span className="featured-card__media">
                  {p.img && (
                    <Img
                      className="featured-card__img"
                      src={p.img}
                      alt={p.imgAlt || p.title}
                      sizes={CARD_SIZES}
                    />
                  )}
                </span>
                <span className="featured-card__body">
                  <h3 className="featured-card__title">{p.title}</h3>
                  <span className="featured-card__price">
                    <PriceTag price={p.price} discountPct={p.discountPct} />
                  </span>
                  <span className="featured-card__cta">
                    {featuredSection.cta}
                    <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Write the styles**

Create `src/components/FeaturedRail.css`:

```css
/* Home "Featured Products" rail — a manually paged, scroll-snapped row of
   product cards. Sits on the off-white surface between the white category
   strip above and WhyChoose below, so the bands stay visually distinct. */

.featured {
  padding: 88px 0;
  background: var(--color-off-white);
}

.featured__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 40px;
}

.featured__heading {
  margin-top: 4px;
}

/* --- the track --- */

.featured__track {
  display: flex;
  gap: 24px;
  margin: 0;
  /* Vertical padding leaves room for the card's hover lift and shadow to
     render instead of being clipped by the scroll container. */
  padding: 6px 0 12px;
  list-style: none;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  scrollbar-width: none;
}

.featured__track::-webkit-scrollbar {
  display: none;
}

/* Four across at the container width, minus the three 24px gaps. */
.featured__item {
  flex: 0 0 calc((100% - 72px) / 4);
  scroll-snap-align: start;
}

/* --- the card --- */

.featured-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-white);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  overflow: hidden;
  color: inherit;
  text-decoration: none;
  transition:
    transform var(--transition-base),
    box-shadow var(--transition-base);
}

.featured-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

/* Fixed ratio so a product with no photo keeps the card's shape rather than
   collapsing the row to ragged heights. */
.featured-card__media {
  display: block;
  aspect-ratio: 4 / 3;
  background: var(--color-off-white);
  overflow: hidden;
}

.featured-card__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--transition-base);
}

.featured-card:hover .featured-card__img {
  transform: scale(1.04);
}

.featured-card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  padding: 22px 22px 24px;
}

.featured-card__title {
  margin: 0;
  font-size: 17px;
  line-height: 1.35;
  font-weight: 600;
  color: var(--color-ink-strong);
}

/* margin-top:auto pins price + CTA to the bottom, so cards with one-line and
   three-line titles still align along the row. */
.featured-card__price {
  display: block;
  margin-top: auto;
}

.featured-card__cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-accent);
}

.featured-card:hover .featured-card__cta {
  color: var(--color-accent-hover);
}

/* --- responsive: 4 -> 3 -> 2 -> one-and-a-peek --- */

@media (max-width: 1279px) {
  .featured__item {
    flex-basis: calc((100% - 48px) / 3);
  }
}

@media (max-width: 1023px) {
  .featured__item {
    flex-basis: calc((100% - 24px) / 2);
  }
}

@media (max-width: 767px) {
  .featured {
    padding: 60px 0;
  }
  .featured__head {
    margin-bottom: 28px;
  }
  /* Under a full width so the next card peeks — that sliver is what tells
     people the row swipes. */
  .featured__item {
    flex-basis: 78%;
  }
}

@media (prefers-reduced-motion: reduce) {
  /* The rail only moves on user input, so honouring the setting is right here
     (unlike the category marquee above, which keeps moving by design). */
  .featured__track {
    scroll-behavior: auto;
  }
  .featured-card,
  .featured-card__img {
    transition: none;
  }
  .featured-card:hover,
  .featured-card:hover .featured-card__img {
    transform: none;
  }
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `yarn test src/test/featured.test.jsx`
Expected: PASS — all cases including axe.

- [ ] **Step 7: Commit** (only if Billy has green-lit committing)

```bash
git add src/components/FeaturedRail.jsx src/components/FeaturedRail.css src/test/featured.test.jsx src/test/setup.js
git commit -m "feat(home): add the featured products rail"
```

---

### Task 4: Arrow paging

**Files:**

- Modify: `src/components/FeaturedRail.jsx`
- Modify: `src/components/FeaturedRail.css` (append the nav/arrow block)
- Test: `src/test/featured.test.jsx` (extend)

**Interfaces:**

- Consumes: the `FeaturedRail` markup from Task 3.
- Produces: no new exports. The track element gains a ref; two arrow buttons appear in `.featured__head` when the track overflows.

- [ ] **Step 1: Write the failing tests**

jsdom reports every layout measurement as 0, so `scrollWidth > clientWidth` is never true on its own and `Element.prototype.scrollBy` does not exist. Both are stubbed per-test — the arrows are asserted through the calls the component makes, not through real scroll positions.

Append to `src/test/featured.test.jsx`:

```jsx
// jsdom has no layout: every width reads 0, so overflow never happens by
// itself. Force the numbers the component measures, and stand in for the
// scrollBy that jsdom doesn't implement.
function stubTrack({ clientWidth = 1000, scrollWidth = 3000, scrollLeft = 0 } = {}) {
  const scrollBy = vi.fn()
  const track = document.querySelector('.featured__track')
  Object.defineProperty(track, 'clientWidth', { value: clientWidth, configurable: true })
  Object.defineProperty(track, 'scrollWidth', { value: scrollWidth, configurable: true })
  Object.defineProperty(track, 'scrollLeft', {
    value: scrollLeft,
    writable: true,
    configurable: true,
  })
  track.scrollBy = scrollBy
  // The component measures on scroll; fire one so it re-reads the stubs.
  // fireEvent (not dispatchEvent) so React's state update is wrapped in act().
  fireEvent.scroll(track)
  return { track, scrollBy }
}

const seedTwo = () =>
  seed([
    row('a', { featured: true, title: 'Alloy Toolbox', slug: 'alloy-toolbox', price: 1299 }),
    row('c', { featured: true, title: 'Dog Box', slug: 'dog-box', price: 890 }),
  ])

describe('FeaturedRail — paging', () => {
  it('hides the arrows when every card already fits', () => {
    seedTwo()
    renderRail()
    // jsdom's zero widths mean no overflow, which is exactly the "it all fits"
    // case: no arrows should render.
    expect(screen.queryByRole('button', { name: /next featured/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /previous featured/i })).toBeNull()
  })

  it('shows the arrows and pages one full screen at a time when it overflows', async () => {
    const user = userEvent.setup()
    seedTwo()
    renderRail()
    const { scrollBy } = stubTrack()

    const next = await screen.findByRole('button', { name: /next featured/i })
    await user.click(next)
    expect(scrollBy).toHaveBeenCalledWith({ left: 1000, behavior: 'smooth' })
  })

  it('disables Previous at the start and Next at the end', async () => {
    const user = userEvent.setup()
    seedTwo()
    renderRail()
    stubTrack({ scrollLeft: 0 })

    expect(await screen.findByRole('button', { name: /previous featured/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /next featured/i })).toBeEnabled()

    // Scrolled hard right: 3000 - 1000 = 2000 is the maximum.
    stubTrack({ scrollLeft: 2000 })
    expect(await screen.findByRole('button', { name: /next featured/i })).toBeDisabled()

    const prev = screen.getByRole('button', { name: /previous featured/i })
    expect(prev).toBeEnabled()
    await user.click(prev)
    expect(document.querySelector('.featured__track').scrollBy).toHaveBeenCalledWith({
      left: -1000,
      behavior: 'smooth',
    })
  })
})
```

Add these to the top of the file, beside the other Testing Library imports:

```jsx
import userEvent from '@testing-library/user-event'
```

and extend the existing `@testing-library/react` import to pull in `fireEvent`:

```jsx
import { fireEvent, render, screen } from '@testing-library/react'
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn test src/test/featured.test.jsx`
Expected: FAIL — no button matching `/next featured/i`.

- [ ] **Step 3: Add the paging logic to the component**

In `src/components/FeaturedRail.jsx`, replace the import block's first two lines and the component body's opening.

Imports become:

```jsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
```

Inside the component, immediately after `const products = getFeaturedProducts()`, insert:

```jsx
const trackRef = useRef(null)
const [edges, setEdges] = useState({ overflows: false, atStart: true, atEnd: false })

// One measurement drives all three arrow states: whether to show the pair at
// all, and whether either end is reached.
const measure = useCallback(() => {
  const el = trackRef.current
  if (!el) return
  const max = el.scrollWidth - el.clientWidth
  setEdges({
    overflows: max > 1,
    atStart: el.scrollLeft <= 0,
    // 1px of slack absorbs the sub-pixel rounding browsers leave at the
    // right edge, which would otherwise never satisfy a strict >=.
    atEnd: el.scrollLeft >= max - 1,
  })
}, [])

// Re-measure on scroll and on resize. products.length is a dependency
// because unfeaturing the last few cards can remove the overflow entirely.
useEffect(() => {
  const el = trackRef.current
  if (!el) return undefined
  measure()
  el.addEventListener('scroll', measure, { passive: true })
  const observer = new ResizeObserver(measure)
  observer.observe(el)
  return () => {
    el.removeEventListener('scroll', measure)
    observer.disconnect()
  }
}, [measure, products.length])

// One click advances exactly one screen of cards, whatever the breakpoint.
const page = (direction) => {
  const el = trackRef.current
  if (el) el.scrollBy({ left: direction * el.clientWidth, behavior: 'smooth' })
}
```

The early return stays where it is, **below** these hooks — hooks must run on every render, including the render that bails out.

Add the nav to `.featured__head`, as a sibling of the existing heading `<div>`:

```jsx
{
  edges.overflows && (
    <div className="featured__nav">
      <button
        type="button"
        className="featured__arrow"
        aria-label="Previous featured products"
        disabled={edges.atStart}
        onClick={() => page(-1)}
      >
        <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="featured__arrow"
        aria-label="Next featured products"
        disabled={edges.atEnd}
        onClick={() => page(1)}
      >
        <ChevronRight size={20} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  )
}
```

And add the ref to the track:

```jsx
        <ul
          className="featured__track"
          ref={trackRef}
          tabIndex={0}
          aria-label={featuredSection.heading}
        >
```

- [ ] **Step 4: Add the arrow styles**

Append to `src/components/FeaturedRail.css`, after the `.featured__heading` rule:

```css
.featured__nav {
  display: flex;
  flex-shrink: 0;
  gap: 10px;
}

.featured__arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  color: var(--color-ink);
  background: var(--color-white);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    color var(--transition-fast);
}

.featured__arrow:hover:not(:disabled) {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.featured__arrow:disabled {
  opacity: 0.35;
  cursor: default;
}
```

And inside the existing `@media (max-width: 767px)` block, hide the arrows — a phone swipes:

```css
.featured__nav {
  display: none;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `yarn test src/test/featured.test.jsx`
Expected: PASS — all rendering and paging cases.

- [ ] **Step 6: Commit** (only if Billy has green-lit committing)

```bash
git add src/components/FeaturedRail.jsx src/components/FeaturedRail.css src/test/featured.test.jsx
git commit -m "feat(home): page the featured rail one screen at a time"
```

---

### Task 5: Compose the rail into the home page

**Files:**

- Modify: `src/pages/Home.jsx`
- Test: `src/test/featured.test.jsx` (extend)

**Interfaces:**

- Consumes: `FeaturedRail` (Tasks 3-4).
- Produces: the rail rendered between `<CategoryCarousel />` and `<WhyChoose />`.

- [ ] **Step 1: Write the failing test**

Append to `src/test/featured.test.jsx`:

```jsx
const { default: Home } = await import('../pages/Home.jsx')
const { HelmetProvider } = await import('react-helmet-async')

describe('Home — featured rail placement', () => {
  it('renders the rail directly after the category carousel', () => {
    seed([row('a', { featured: true, title: 'Alloy Toolbox', slug: 'alloy-toolbox', price: 1299 })])
    const { container } = render(
      <HelmetProvider>
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </HelmetProvider>,
    )
    const carousel = container.querySelector('.range')
    const featured = container.querySelector('.featured')
    expect(carousel).not.toBeNull()
    expect(featured).not.toBeNull()
    // compareDocumentPosition: FOLLOWING (4) means `featured` comes after.
    expect(
      carousel.compareDocumentPosition(featured) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(carousel.nextElementSibling).toBe(featured)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test src/test/featured.test.jsx`
Expected: FAIL — `container.querySelector('.featured')` is null.

- [ ] **Step 3: Compose it in**

In `src/pages/Home.jsx`, add the import beside the other component imports:

```jsx
import FeaturedRail from '../components/FeaturedRail.jsx'
```

And place it in the tree between the carousel and `WhyChoose`:

```jsx
      <CategoryCarousel />
      <FeaturedRail />
      <WhyChoose />
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `yarn test src/test/featured.test.jsx src/test/a11y.test.jsx`
Expected: PASS both. The `a11y` suite renders `Home` against an unseeded store, so the rail returns `null` there — that suite must stay green unchanged.

- [ ] **Step 5: Commit** (only if Billy has green-lit committing)

```bash
git add src/pages/Home.jsx src/test/featured.test.jsx
git commit -m "feat(home): slot the featured rail under the category carousel"
```

---

### Task 6: `setProductFeatured` API write

**Files:**

- Modify: `src/lib/adminApi.js` (add after `setProductHidden`, which ends at line 160)
- Test: `src/test/adminApi.test.js`

**Interfaces:**

- Consumes: the module-local `client()` helper and `retryLoad` from `src/lib/productStore.js` (both already in the file).
- Produces: `setProductFeatured(id: string, featured: boolean) => Promise<void>` — throws `Error(message)` on failure. Consumed by Tasks 7 and 8.

- [ ] **Step 1: Write the failing test**

Add `setProductFeatured` to the destructured `await import('../lib/adminApi.js')` block near line 88 of `src/test/adminApi.test.js`, then append this block next to the existing `describe('setProductHidden', ...)` at line 198:

```js
describe('setProductFeatured', () => {
  it('updates only the featured flag for the given id', async () => {
    await setProductFeatured('x', true)
    expect(calls.updates[0]).toMatchObject({
      table: 'products',
      patch: { featured: true },
      col: 'id',
      val: 'x',
    })
  })

  it('unfeatures without touching any other column', async () => {
    await setProductFeatured('x', false)
    expect(calls.updates[0].patch).toEqual({ featured: false })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test src/test/adminApi.test.js`
Expected: FAIL — `setProductFeatured is not a function`.

- [ ] **Step 3: Write the implementation**

Add to `src/lib/adminApi.js`, directly after `setProductHidden`:

```js
// Toggle a product's place in the home page's featured rail without touching
// any other field. Mirrors setProductHidden: one column, one row, then a
// storefront refresh so an open tab picks the change up without a reload.
export async function setProductFeatured(id, featured) {
  const c = await client()
  const { error } = await c.from('products').update({ featured }).eq('id', id)
  if (error) throw new Error(error.message)
  retryLoad()
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn test src/test/adminApi.test.js`
Expected: PASS.

- [ ] **Step 5: Commit** (only if Billy has green-lit committing)

```bash
git add src/lib/adminApi.js src/test/adminApi.test.js
git commit -m "feat(admin): add a single-column featured toggle write"
```

---

### Task 7: Star toggle in the Products table

**Files:**

- Modify: `src/pages/admin/ProductList.jsx` (import at line 16, handler near line 101, button at line 312)
- Modify: `src/pages/admin/Admin.css` (add `.admin__icon--on` beside `.admin__icon--danger` at line 650)
- Test: `src/test/admin.test.jsx`

**Interfaces:**

- Consumes: `setProductFeatured` (Task 6).
- Produces: a star button in each row's `.admin-table__actions`, before the existing show/hide eye.

- [ ] **Step 1: Write the failing tests**

Add `setProductFeatured: vi.fn(async () => {}),` to the `vi.mock('../lib/adminApi.js', ...)` factory in `src/test/admin.test.jsx` (beside `setProductHidden` at line 28).

Then append to the existing `describe('ProductList', ...)` block:

```jsx
it('features a product from the row star', async () => {
  const onChanged = vi.fn()
  render(
    <MemoryRouter>
      <ProductList rows={listRows} onEdit={() => {}} onNew={() => {}} onChanged={onChanged} />
    </MemoryRouter>,
  )
  // listRows[0] ('Whale Tail Lock') is not featured, so its star offers to add it.
  await userEvent.click(screen.getByRole('button', { name: /^feature whale tail lock$/i }))
  expect(setProductFeatured).toHaveBeenCalledWith('a', true)
  await waitFor(() => expect(onChanged).toHaveBeenCalled())
})

it('unfeatures a product from the row star, and marks it pressed', async () => {
  render(
    <MemoryRouter>
      <ProductList rows={listRows} onEdit={() => {}} onNew={() => {}} onChanged={() => {}} />
    </MemoryRouter>,
  )
  // listRows[1] ('Job Site Box') is featured.
  const star = screen.getByRole('button', { name: /^unfeature job site box$/i })
  expect(star).toHaveAttribute('aria-pressed', 'true')
  await userEvent.click(star)
  expect(setProductFeatured).toHaveBeenCalledWith('b', false)
})
```

Do **not** add a new import. The suite already destructures the mocked module at line 383:

```jsx
const { saveProduct, watchSession, setProductHidden } = await import('../lib/adminApi.js')
```

Extend that line instead:

```jsx
const { saveProduct, watchSession, setProductHidden, setProductFeatured } =
  await import('../lib/adminApi.js')
```

(This sits at the bottom of the file yet is used by helpers defined above it — that works because those helpers only run once the module body has finished evaluating. Follow the existing placement rather than moving it.)

Add `beforeEach(() => setProductFeatured.mockClear())` inside the `describe('ProductList', ...)` block so the two cases don't see each other's calls, and add `beforeEach` to the `vitest` import at line 1.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn test src/test/admin.test.jsx`
Expected: FAIL — no button matching `/^feature whale tail lock$/i`.

- [ ] **Step 3: Add the handler and the button**

In `src/pages/admin/ProductList.jsx`, extend the adminApi import at line 16:

```jsx
import { deleteProduct, setProductFeatured, setProductHidden } from '../../lib/adminApi.js'
```

Add the handler directly after `onToggleHidden` (which ends at line 112). It reuses the same `togglingId` busy slot and `setError` surface:

```jsx
async function onToggleFeatured(row) {
  setTogglingId(row.id)
  setError('')
  try {
    await setProductFeatured(row.id, !row.featured)
    onChanged()
  } catch (err) {
    setError(err.message)
  } finally {
    setTogglingId(null)
  }
}
```

Insert the button at line 312, as the first child of the `<>` fragment — before the eye toggle, so the row reads star / show-hide / edit / delete:

```jsx
<button
  type="button"
  className={`admin__icon${row.featured ? ' admin__icon--on' : ''}`}
  disabled={togglingId === row.id}
  aria-pressed={!!row.featured}
  aria-label={row.featured ? `Unfeature ${row.title}` : `Feature ${row.title}`}
  onClick={() => onToggleFeatured(row)}
>
  <Star
    size={15}
    strokeWidth={2}
    fill={row.featured ? 'currentColor' : 'none'}
    aria-hidden="true"
  />
</button>
```

`Star` is already imported at line 10 for the badge. The row's click-to-edit handler already ignores clicks landing on a `button` (line 233), so the star needs no extra guard.

- [ ] **Step 4: Add the "on" icon style**

Add to `src/pages/admin/Admin.css`, beside `.admin__icon--danger` (line 650):

```css
/* An icon button in its "on" state — the star on a featured product. */
.admin__icon--on {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `yarn test src/test/admin.test.jsx`
Expected: PASS, including the existing axe assertions on the dashboard.

- [ ] **Step 6: Commit** (only if Billy has green-lit committing)

```bash
git add src/pages/admin/ProductList.jsx src/pages/admin/Admin.css src/test/admin.test.jsx
git commit -m "feat(admin): feature a product straight from the products table"
```

---

### Task 8: The Featured Products panel

**Files:**

- Create: `src/pages/admin/FeaturedProducts.jsx`
- Modify: `src/pages/admin/Admin.css` (append the `.admin-featured*` block)
- Test: `src/test/admin.test.jsx`

**Interfaces:**

- Consumes: `setProductFeatured` (Task 6), `publicPhotoUrl`, `formatPrice`, `getAdminCategoryGroups`.
- Produces: default export `FeaturedProducts`, taking `{ rows, onChanged }` — raw DB rows, the same array `ProductList` and `CarouselImages` receive. Consumed by `AdminPage` in Task 9.

- [ ] **Step 1: Write the failing tests**

Append to `src/test/admin.test.jsx`:

```jsx
const { default: FeaturedProducts } = await import('../pages/admin/FeaturedProducts.jsx')

// sort_order deliberately out of order relative to the array, so the re-sort is
// actually exercised. 'c' is featured but hidden — it never reaches the rail.
const featuredRows = [
  {
    id: 'b',
    category_id: 'top-opening-toolboxes',
    title: 'Job Site Box',
    price: 450,
    featured: true,
    hidden: false,
    sort_order: 2,
    product_images: [],
  },
  {
    id: 'a',
    category_id: 'locks',
    title: 'Whale Tail Lock',
    price: 45,
    featured: false,
    hidden: false,
    sort_order: 0,
    product_images: [],
  },
  {
    id: 'c',
    category_id: 'locks',
    title: 'Hidden Gem',
    price: 99,
    featured: true,
    hidden: true,
    sort_order: 1,
    product_images: [],
  },
]

describe('FeaturedProducts panel', () => {
  beforeEach(() => setProductFeatured.mockClear())

  it('lists only featured products, in storefront order', () => {
    render(<FeaturedProducts rows={featuredRows} onChanged={() => {}} />)
    const items = screen.getAllByRole('listitem')
    expect(items.map((li) => within(li).getByRole('button').getAttribute('aria-label'))).toEqual([
      'Unfeature Hidden Gem',
      'Unfeature Job Site Box',
    ])
    expect(screen.queryByText('Whale Tail Lock')).toBeNull()
  })

  it('warns when a featured product is hidden from the storefront', () => {
    render(<FeaturedProducts rows={featuredRows} onChanged={() => {}} />)
    expect(screen.getByText(/hidden — not on the home page/i)).toBeInTheDocument()
  })

  it('unfeatures a product and refreshes', async () => {
    const onChanged = vi.fn()
    render(<FeaturedProducts rows={featuredRows} onChanged={onChanged} />)
    await userEvent.click(screen.getByRole('button', { name: /unfeature job site box/i }))
    expect(setProductFeatured).toHaveBeenCalledWith('b', false)
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
  })

  it('shows an empty state pointing at the star when nothing is featured', () => {
    render(<FeaturedProducts rows={[featuredRows[1]]} onChanged={() => {}} />)
    expect(screen.getByText(/no featured products yet/i)).toBeInTheDocument()
    expect(screen.queryByRole('listitem')).toBeNull()
  })

  it('surfaces a write failure without losing the list', async () => {
    setProductFeatured.mockRejectedValueOnce(new Error('nope'))
    render(<FeaturedProducts rows={featuredRows} onChanged={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /unfeature job site box/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('nope')
    expect(screen.getByText('Job Site Box')).toBeInTheDocument()
  })

  it('has no axe violations', async () => {
    const { container } = render(<FeaturedProducts rows={featuredRows} onChanged={() => {}} />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn test src/test/admin.test.jsx`
Expected: FAIL — cannot resolve `../pages/admin/FeaturedProducts.jsx`.

- [ ] **Step 3: Write the component**

Create `src/pages/admin/FeaturedProducts.jsx`:

```jsx
import { useMemo, useState } from 'react'
import { Star } from 'lucide-react'
import { getAdminCategoryGroups } from '../../lib/catalog.js'
import { publicPhotoUrl } from '../../lib/supabaseClient.js'
import { formatPrice } from '../../lib/pricing.js'
import { setProductFeatured } from '../../lib/adminApi.js'

// The Featured Products tab: what the home page rail is showing right now,
// with a one-click Unfeature on each. Reads the same `rows` fetch the other
// panels take, so switching to this tab costs no network.
//
// Rows arrive ordered category_id then sort_order (fetchAdminProducts), but the
// storefront orders sort_order then id. Re-sort so this tab lists them in the
// order a visitor actually sees — the same reason CarouselImages re-sorts its
// own copy rather than trusting the admin fetch's order.
export default function FeaturedProducts({ rows, onChanged }) {
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  const leafLabel = useMemo(
    () => new Map(getAdminCategoryGroups().flatMap((g) => g.options.map((o) => [o.id, o.label]))),
    [],
  )

  const featured = useMemo(
    () =>
      (rows ?? [])
        .filter((r) => r.featured)
        .slice()
        .sort(
          (a, b) =>
            (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.id).localeCompare(String(b.id)),
        ),
    [rows],
  )

  function thumb(row) {
    const first = [...(row.product_images ?? [])].sort((a, b) => a.position - b.position)[0]
    return first ? publicPhotoUrl(first.storage_path) : null
  }

  async function onUnfeature(row) {
    setBusyId(row.id)
    setError('')
    try {
      await setProductFeatured(row.id, false)
      onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="admin-card">
      <div className="admin-toolbar">
        <div>
          <span className="admin__label">Featured products</span>
          <span className="admin__label-hint">
            The “Featured Products” rail on the home page, in the order visitors see it. Use the
            star on a row in the Products tab to add one.
          </span>
        </div>
      </div>

      {error && (
        <p className="admin__error" role="alert">
          {error}
        </p>
      )}

      {featured.length === 0 ? (
        <p className="admin__empty">
          No featured products yet. Use the star on a row in the Products tab to add one.
        </p>
      ) : (
        <ul className="admin-featured">
          {featured.map((row) => (
            <li className="admin-featured__item" key={row.id}>
              {thumb(row) ? (
                <img className="admin-table__thumb" src={thumb(row)} alt="" />
              ) : (
                <span className="admin-table__thumb" aria-hidden="true" />
              )}

              <span className="admin-featured__text">
                <span className="admin-featured__title">{row.title}</span>
                <span className="admin-featured__meta">
                  {leafLabel.get(row.category_id) ?? row.category_id} ·{' '}
                  {row.price == null ? 'No price' : formatPrice(Number(row.price))}
                </span>
              </span>

              {/* Featured AND hidden means the product never reaches the rail,
                  and nothing else on this screen would explain why. */}
              {row.hidden && (
                <span className="admin-badge admin-badge--hidden">
                  Hidden — not on the home page
                </span>
              )}

              <button
                type="button"
                className="admin__ghost"
                disabled={busyId === row.id}
                // The visible label repeats across rows, so the accessible name
                // carries the title too. It still starts with the visible text,
                // which is what WCAG's label-in-name asks for.
                aria-label={`Unfeature ${row.title}`}
                onClick={() => onUnfeature(row)}
              >
                <Star size={14} strokeWidth={2} fill="currentColor" aria-hidden="true" />
                {busyId === row.id ? 'Working…' : 'Unfeature'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Add the panel styles**

Append to `src/pages/admin/Admin.css`:

```css
/* --- Featured Products panel ------------------------------------------- */

.admin-featured {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.admin-featured__item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  background: var(--color-white);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
}

/* Takes the slack so the badge and button stay pinned right. */
.admin-featured__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.admin-featured__title {
  font-weight: 600;
  color: var(--color-ink-strong);
}

.admin-featured__meta {
  font-size: 13px;
  color: var(--color-gray-muted);
}

@media (max-width: 700px) {
  .admin-featured__item {
    flex-wrap: wrap;
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `yarn test src/test/admin.test.jsx`
Expected: PASS.

- [ ] **Step 6: Commit** (only if Billy has green-lit committing)

```bash
git add src/pages/admin/FeaturedProducts.jsx src/pages/admin/Admin.css src/test/admin.test.jsx
git commit -m "feat(admin): add the featured products panel"
```

---

### Task 9: Wire the Featured Products tab into the dashboard

**Files:**

- Modify: `src/pages/admin/AdminPage.jsx` (TABS at line 14, panel render at lines 133-143)
- Test: `src/test/admin.test.jsx`

**Interfaces:**

- Consumes: `FeaturedProducts` (Task 8).
- Produces: a third tab, `{ id: 'featured', label: 'Featured Products' }`, third in the strip.

- [ ] **Step 1: Write the failing tests**

Two existing tests in `src/test/admin.test.jsx` assert the exact tab list and arrow-key wrap; both need updating rather than duplicating. Replace the tab-list assertion at line 98:

```jsx
expect(tabs.map((t) => t.textContent)).toEqual(['Products', 'Home carousel', 'Featured Products'])
```

And append:

```jsx
it('swaps the panel when the Featured Products tab is chosen', async () => {
  const user = userEvent.setup()
  renderSignedIn()
  await user.click(await screen.findByRole('tab', { name: /featured products/i }))
  expect(
    await screen.findByText(/the “featured products” rail on the home page/i),
  ).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /new product/i })).toBeNull()
  expect(screen.queryByText(/home carousel photos/i)).toBeNull()
})

it('wraps from the last tab back to the first with the arrow keys', async () => {
  const user = userEvent.setup()
  renderSignedIn()
  // Click first: onTabKey steps from the SELECTED tab, not the focused one, so
  // merely focusing the third tab would step from Products and land on the
  // carousel instead of wrapping.
  await user.click(await screen.findByRole('tab', { name: /featured products/i }))
  await user.keyboard('{ArrowRight}')
  const products = screen.getByRole('tab', { name: /^products$/i })
  expect(products).toHaveAttribute('aria-selected', 'true')
  expect(products).toHaveFocus()
})
```

`/^products$/i` deliberately anchors — an unanchored `/products/i` would also match "Featured Products".

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn test src/test/admin.test.jsx`
Expected: FAIL — the tab list has two entries, not three.

- [ ] **Step 3: Add the tab**

In `src/pages/admin/AdminPage.jsx`, add the import beside `CarouselImages` (line 7):

```jsx
import FeaturedProducts from './FeaturedProducts.jsx'
```

Extend `TABS` (line 14) and update its comment, since "both" is now three:

```jsx
// Dashboard sections. All three read the same `rows` fetch, so switching tabs
// costs no network — only the selected panel is mounted.
const TABS = [
  { id: 'products', label: 'Products' },
  { id: 'carousel', label: 'Home carousel' },
  { id: 'featured', label: 'Featured Products' },
]
```

Replace the two-way ternary in the panel (lines 133-143) with an explicit switch on the tab id, so a fourth tab later doesn't nest another ternary:

```jsx
{
  tab === 'products' ? (
    <ProductList
      rows={rows}
      loading={!loaded}
      onEdit={setEditing}
      onNew={() => setEditing('new')}
      onChanged={refresh}
    />
  ) : tab === 'carousel' ? (
    <CarouselImages rows={rows} />
  ) : (
    <FeaturedProducts rows={rows} onChanged={refresh} />
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `yarn test src/test/admin.test.jsx`
Expected: PASS — including the pre-existing arrow-key and axe cases.

- [ ] **Step 5: Commit** (only if Billy has green-lit committing)

```bash
git add src/pages/admin/AdminPage.jsx src/test/admin.test.jsx
git commit -m "feat(admin): add the Featured Products tab"
```

---

### Task 10: Full verification

**Files:** none — this is the gate before calling the work done.

- [ ] **Step 1: Run the whole suite**

Run: `yarn test`
Expected: PASS, no unhandled rejections. Paste the summary line as evidence.

- [ ] **Step 2: Lint and format**

Run: `yarn lint && yarn format:check`
Expected: clean. If Prettier objects to the new files, run `yarn format` and re-run the check.

- [ ] **Step 3: Production build**

Run: `yarn build`
Expected: succeeds. Note that the build runs `scripts/prerender.mjs` and needs a real Chrome on PATH — do **not** work around a failure with `SKIP_PRERENDER=1` (see `docs/domain-migration.md:74`).

- [ ] **Step 4: Manual pass on `yarn dev`**

Sign in at `/admin` and check each of these:

1. Star a single product → home page shows the rail with one card and **no arrows** (nothing to page).
2. Star eight products → arrows appear; Previous is disabled on load; one click on Next advances a full row; Next disables at the far right.
3. Resize to 375px → arrows hide, one card plus a peek, swipe works.
4. Resize to 768px and 1280px → two and four cards respectively, no horizontal page scroll.
5. Open the Featured Products tab → the same eight, in the same order as the home page.
6. Unfeature one from the tab → it leaves both the tab and the rail.
7. Hide a featured product from the Products tab → the tab shows "Hidden — not on the home page" and the card leaves the rail.
8. Click a card → lands on the right `/product/<slug>` page.
9. A featured product with no price → card shows "Enquire for pricing".

- [ ] **Step 5: Report results with evidence**

Report actual command output and observed behaviour, not a summary. If any step failed, say so with the output.

---

## Notes carried from the spec

- **No migration.** `products.featured` exists (`supabase/migrations/0001_catalog.sql:16`), is normalized at `src/lib/productStore.js:57`, written at `src/lib/adminApi.js:88`, and already renders as a badge at `src/pages/admin/ProductList.jsx:272`.
- **Featured + hidden** silently drops a product from the rail: `productStore` filters `hidden = false` before anything sees the featured flag. That is why Task 8 renders an explicit warning.
- **Prerender:** the rail's contents are client-rendered from Supabase like the rest of the catalogue. Featuring a product on the live site shows up immediately for visitors, but the prerendered HTML only catches up on the next deploy.
- **No stock chip on the rail** — a deliberate call. `StockBadge` renders both states by design on a product page; repeated across four cards it is noise. Back-order products still appear, and the badge shows on click-through.
