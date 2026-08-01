# Featured Products rail — design

**Date:** 2026-08-01
**Status:** approved, ready for planning

## Problem

The catalogue already carries a `featured` flag on every product, but nothing on the
homepage reads it. Today the flag only floats a product to the front of the "Related
products" rail on a product page (`src/lib/catalog.js:136`). Billy wants a Featured
Products rail on the homepage, and a way to curate it from the admin panel without
opening each product's editor.

## What already exists

Nothing here needs a migration. The plumbing is in place and unused:

| Piece                                     | Location                                  |
| ----------------------------------------- | ----------------------------------------- |
| `featured boolean not null default false` | `supabase/migrations/0001_catalog.sql:16` |
| Normalized onto the storefront product    | `src/lib/productStore.js:57`              |
| Written back on save                      | `src/lib/adminApi.js:88` (`toRow`)        |
| Editor checkbox                           | `src/pages/admin/ProductEditor.jsx:387`   |
| "Featured" badge in the product table     | `src/pages/admin/ProductList.jsx:272`     |

## Scope

1. A **Featured Products** carousel on the homepage.
2. A **star toggle** on each row of the admin Products table.
3. A **Featured Products tab** in the admin panel, listing what is featured with a
   one-click Unfeature.

Out of scope: a dedicated ordering column, featuring from inside the new tab, and a
live preview of the rail in the admin. All three were considered and cut.

---

## 1. Storefront — the Featured rail

### Placement

`src/pages/Home.jsx`, directly under the hero fold and **above**
`<CategoryCarousel />` — so the rail leads the page rather than following the
"Built for every adventure" strip.

The rail sits on `--color-dark`. White cards read as lit objects against it, and
the band alternates cleanly into the white `CategoryCarousel` below.

> Revised after implementation, at Billy's request. The original design put the
> rail _below_ the category strip on `--color-off-white`. That was dropped for two
> reasons: featured stock deserves the first slot under the hero, and the
> off-white/white pairing was a 1.02:1 difference — the two bands were effectively
> one continuous block, which the final review flagged.

### Data

One new read helper in `src/lib/catalog.js`, beside `getRelatedProducts`:

```js
export function getFeaturedProducts(limit = 12) {
  return getProducts()
    .filter((p) => p.featured)
    .slice(0, limit)
}
```

`getProducts()` already excludes hidden rows (`productStore` filters
`.eq('hidden', false)`) and is ordered `sort_order` then `id`, so catalogue order —
the order Billy chose — comes for free. The `limit` caps a runaway rail; 12 is four
full pages at the desktop card count.

The component subscribes with `useProductCatalog()` so the rail repaints when the
catalogue lands, exactly as `CategoryCarousel` does. It makes no load call of its own —
`main.jsx` kicks the fetch off at boot.

**Empty and error states are the same state:** when nothing is featured, or the
catalogue fetch failed (`getProducts()` returns `[]`), the component returns `null` and
the homepage shows no section at all. This mirrors `RelatedProducts`. There is
deliberately no skeleton — a placeholder that usually resolves to nothing would push
the page around on every load.

### Files

| File                              | Purpose                                   |
| --------------------------------- | ----------------------------------------- |
| `src/content/featured.js`         | Section eyebrow, heading, and CTA label   |
| `src/components/FeaturedRail.jsx` | The section: header, arrows, scroll track |
| `src/components/FeaturedRail.css` | Its styles                                |

Copy lives in `src/content/` per the house rule that components hold no client
strings — the same reason `homeCarousel.js` carries `rangeSection`.

### The card

A purpose-built card inside `FeaturedRail.jsx`, **not** `Card.jsx`. `Card` already
takes twenty-odd props to serve category tiles, shop cards, and related products;
adding a fourth mode would make it harder to reason about than a small dedicated card
is to write.

Layout, top to bottom:

1. Photo — `<Img>` so the WebP derivatives and `sizes` hints apply, fixed aspect ratio
   so a missing photo doesn't collapse the card.
2. Title.
3. Price — `<PriceTag price discountPct />`, which already handles the struck-through
   original, the "Save X%" chip, the `+ GST` suffix, and the "Enquire for pricing"
   fallback when `price` is null.
4. `View details →` button.

The whole card is a `<Link to={`/product/${slug ?? id}`}>`, matching the token fallback
`Card.jsx:58` uses for products that predate slugs. The button is styled markup inside
that link, not a nested interactive element.

**No stock chip.** `StockBadge` deliberately renders in both states on a product page,
but repeating "In stock" across four cards is noise in a rail whose job is to draw the
eye. Back-order products still appear in the rail; the badge shows on click-through.

### Carousel mechanics

A flex track with `overflow-x: auto` and `scroll-snap-type: x mandatory`; each card is
`scroll-snap-align: start`.

- **Arrows** call `track.scrollBy({ left: ±track.clientWidth, behavior: 'smooth' })`,
  so one click advances exactly one screen of cards.
- **Disabled at the ends**, driven by a `scroll` listener: `scrollLeft <= 0` and
  `scrollLeft >= scrollWidth - clientWidth - 1` (the 1px slack absorbs sub-pixel
  rounding at the right edge).
- **Hidden entirely when everything fits** (`scrollWidth <= clientWidth`), re-checked
  on mount and on resize via `ResizeObserver`. With three featured products there is
  nothing to page, so no arrows.
- **Touch** gets native swipe; the scrollbar itself is hidden.
- **Keyboard/AT:** the track carries `tabIndex={0}` and an `aria-label` — axe's
  `scrollable-region-focusable` rule requires a scrollable region to be reachable.
  Tabbing through the cards also scrolls them into view natively.
- **Reduce-motion:** `scroll-behavior: auto` under `prefers-reduced-motion: reduce`, so
  paging jumps instead of animating. (Unlike `CategoryCarousel`, which keeps moving by
  design, this rail only moves on user input — so honouring the setting is correct.)

Cards per view, by CSS `flex-basis`:

| Viewport | Cards                                                 |
| -------- | ----------------------------------------------------- |
| ≥1280px  | 4                                                     |
| ≥1024px  | 3                                                     |
| ≥768px   | 2                                                     |
| <768px   | 1.15 — the peeking card signals there's more to swipe |

---

## 2. Admin — star toggle in the Products table

New API function in `src/lib/adminApi.js`, a direct mirror of `setProductHidden`:

```js
export async function setProductFeatured(id, featured) {
  const c = await client()
  const { error } = await c.from('products').update({ featured }).eq('id', id)
  if (error) throw new Error(error.message)
  retryLoad()
}
```

Single-column update, throws on failure, `retryLoad()` so an open storefront tab picks
the change up without a reload.

In `ProductList.jsx`, a `Star` button joins the existing hide/edit/delete group in
`.admin-table__actions` (the icon is already imported for the badge). It follows the
established row-action pattern exactly:

- `aria-pressed={row.featured}`, filled star when on, outline when off.
- `aria-label`: `Feature {title}` / `Unfeature {title}`.
- Reuses the `togglingId` busy state and the shared `setError` surface.
- Calls `onChanged()` on success, which refetches rows and flips the existing badge.

The row's click-to-edit handler already ignores clicks landing on a `button`
(`ProductList.jsx:233`), so the star needs no special handling.

The editor checkbox stays exactly as it is — the star is a shortcut, not a replacement.

## 3. Admin — Featured Products tab

A third entry in `TABS` (`AdminPage.jsx:14`): `{ id: 'featured', label: 'Featured Products' }`.
The existing arrow-key roving tabindex handles three tabs with no change. The panel
render becomes a switch on `tab` rather than the current ternary.

New `src/pages/admin/FeaturedProducts.jsx`, taking `{ rows, onChanged }`. It reads the
**same `rows` fetch** the other panels use — no extra network, per the comment at
`AdminPage.jsx:12`.

Contents:

- Featured rows only, **re-sorted to storefront order** (`sort_order`, then `id`). The
  admin fetch orders by `category_id` first, so without this the tab would list them in
  a different order than the homepage shows — the same reason `CarouselImages.jsx:41`
  re-sorts its own copy.
- Each entry: thumbnail, title, category label, price, and an **Unfeature** button
  calling `setProductFeatured(row.id, false)` then `onChanged()`.
- A featured-but-hidden product shows a `Hidden — not on the homepage` warning. That
  combination silently drops the product from the rail, and it is otherwise invisible
  why.
- Empty state: "No featured products yet" plus a pointer to the star in the Products
  tab.
- Errors render inline via a local `setError`, matching `CarouselImages`.

Reuses existing Admin.css primitives (`.admin-card`, `.admin-table__thumb`,
`.admin-badge`, `.admin__ghost`, `.admin__error`); new styles only where the layout
genuinely differs.

## 4. Tests

New `src/test/featured.test.jsx`:

- `getFeaturedProducts` returns only featured products, in catalogue order, capped at
  the limit.
- The rail renders one card per featured product, each linking to `/product/<slug>`,
  with the price rendered.
- The rail renders nothing when no product is featured, and nothing when the catalogue
  failed to load.
- Clicking next calls `scrollBy` on the track (jsdom reports zero widths, so the arrows
  are asserted through a stubbed `scrollBy` rather than real scroll positions).

Additions to `src/test/admin.test.jsx`:

- The star button calls `setProductFeatured` with the inverted flag and refreshes.
- The Featured Products tab lists only featured rows and flags a hidden one.
- Unfeature calls `setProductFeatured(id, false)`.

`src/test/a11y.test.jsx` already runs axe over Home, so the rail is covered once it is
composed in — the focusable-scroll-region requirement above is what keeps that green.

## Verification

`yarn lint && yarn format:check && yarn test && yarn build`, then a manual pass on
`yarn dev`: feature three products and confirm no arrows; feature eight and confirm
paging, end-disabling, and mobile swipe at 375px; unfeature from both the star and the
new tab and confirm the rail updates.

Per the prerender note in `GO-LIVE.md`, the rail's contents are client-rendered from
Supabase like the rest of the catalogue — featuring a product on the live site shows up
immediately for visitors, but the prerendered HTML only catches up on the next deploy.
