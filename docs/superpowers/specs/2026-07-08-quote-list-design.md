# Quote List — design spec

**Date:** 2026-07-08
**Project:** Urban Toolboxes (urbantoolboxes.com.au)
**Status:** Approved design — ready for implementation plan

## Problem

Urban Toolboxes builds made-to-order aluminium toolboxes. Customers typically
enquire about one — sometimes a few — products, and every enquiry needs custom
dimensions and notes captured up front so the owner can pick up the phone
already knowing what to discuss. There is no checkout and no payment: the owner
personally calls or talks to every customer.

Today the site has product category pages (caravan / utes / trucks /
fabrication) that render read-only cards, and a single `/quote` page that posts
a flat form to Formspree. There is no way to collect *which* products a customer
is interested in, or their per-item specs.

## Goal

A cart-shaped **enquiry builder**: customers add products to a "quote", tune
per-item dimensions / quantity / notes, then hand the whole list to the existing
`/quote` form in one submission. The owner receives a clean, itemised email and
calls the customer back.

Explicitly **not** a checkout: no payment, no binding total.

## Decisions (locked)

1. **Per-item capture:** custom dimensions (W×H×D), quantity, and free-text
   notes only. No structured add-on checklists — the owner sorts extras on the
   call.
2. **UX pattern:** a slide-over drawer from the right, opened from a navbar
   **"Quote (N)"** badge and from "Add to quote" buttons on product cards.
3. **Prices:** each catalog item shows its list price as `from $X + GST
   (indicative)`; custom/fabrication items show `Price on enquiry`. **No grand
   total anywhere** — avoids implying a fixed, checkout-style quote.
4. **Submission:** reuse the existing `/quote` Formspree form; the drawer hands
   the list off to it in one post.
5. **Rollout:** add per-item quote data to caravan first, then utes/trucks.
   Fabrication is custom-only and links to `/quote` rather than exposing
   per-item add buttons.
6. **Navbar badge:** hidden until the first item is added, then shows
   "Quote (N)".

## Architecture

### State — module store, no React context

`src/lib/quoteStore.js` is a single module-level store exposed via a
`useQuote()` hook built on `useSyncExternalStore`. This mirrors the
"mounted once, components stay dumb" ethos of the existing `Lightbox` and
sidesteps the "no context" note in `CLAUDE.md` — no provider wrapping needed.

- **State shape:** `{ items: Item[], isOpen: boolean }`
- **Item shape:**

  ```js
  {
    id,            // stable key, from content quote.id (e.g. 'tb-295')
    name,          // display name, e.g. 'TB-295'
    category,      // 'Caravan' | 'Utes' | 'Trucks'
    priceFrom,     // number | null  (null => 'Price on enquiry')
    standardDims,  // string, e.g. '2200×570×1010'  (placeholder baseline)
    dims: { w, h, d },   // customer-entered, may be blank => "standard"
    qty,           // integer >= 1
    notes,         // free text
  }
  ```

- **Actions:** `add(item)`, `update(id, patch)`, `remove(id)`, `clear()`,
  `open()`, `close()`.
  - `add` de-duplicates by `id`: adding an item already present just bumps focus
    to it in the drawer rather than creating a duplicate line.
- **Persistence:** localStorage key `urbantoolboxes:quote`, rehydrated on load,
  all access `window`-guarded. Writes are debounced/subscribed via the store's
  notify cycle.
- **Caps / validation:** item cap ~20 (guard against runaway adds); `qty`
  minimum 1; dimensions optional (blank = "standard size").

### Content — the source of truth for what's quotable

Product items in `src/content/*.js` gain an **optional `quote` object**:

```js
{
  title: 'TB-295',
  img: '/images/caravan-tb-295.jpg',
  imgAlt: '…',
  body: '2200 × 570 × 1010mm · 70kg · $3900 + GST',
  quote: { id: 'tb-295', priceFrom: 3900, dims: '2200×570×1010' },
}
```

Only items with a `quote` object render an "Add to quote" button. No client
strings, prices, or ids live in components — they read from content, per house
style. Rollout is per-category by adding these objects.

### Components

- **`Card.jsx`** — gains an optional `quote` prop. When present, renders a
  `<QuoteButton>`. Purely additive; existing card layout/styling unchanged.
- **`QuoteButton.jsx`** — dispatches `add()` with the product descriptor
  (name, category, priceFrom, standardDims from the `quote` object), then
  `open()`s the drawer. Renders a subtle "✓ In your quote" state when the item
  is already in the list.
- **`QuoteDrawer.jsx` + `QuoteDrawer.css`** — slide-over from the right,
  **mounted once in `App.jsx`** next to `Lightbox`. Full dialog semantics
  copied from `Lightbox`: `role="dialog"`, `aria-modal="true"`, Esc to close,
  focus trap, body scroll lock, return focus to the trigger. Framer Motion
  slide using the existing reduced-motion-aware variants in `lib/motion.js`.
  Per item: name + `from $X + GST (indicative)` (or `Price on enquiry` when
  `priceFrom` is null), W/H/D inputs pre-filled with `standardDims` as
  placeholders, qty stepper, notes field, remove button. Empty state:
  "Nothing in your quote yet — browse the range." Footer: **"Send enquiry →"**.
- **`Navbar.jsx` + `Navbar.css`** — a "Quote (N)" trigger reading the count from
  `useQuote()`; hidden while the list is empty, `open()`s the drawer otherwise.

### Data flow

```
Product card (content.quote)
   → QuoteButton.add()  → quoteStore  → localStorage
                                │
        useQuote() ────────────┼──────────────┐
                                │              │
                         Navbar badge     QuoteDrawer (edit dims/qty/notes)
                                                │  "Send enquiry →"
                                                ▼
                                       navigate('/quote')
                                                │
                                       QuotePage reads store
                                                │
                                  serialize items → Formspree post
                                                │  on success
                                          quoteStore.clear()
```

### Submission — one Formspree post via `/quote`

"Send enquiry →" in the drawer navigates to `/quote` (react-router). The page
reads the same store and renders a **read-only item summary** above the existing
name / email / phone fields. On submit it serializes the list into a single
human-readable Formspree field so the owner's email reads cleanly:

```
1× TB-295 (Caravan) — 2200×570×1010mm — from $3900+GST — Notes: extra lid clearance
2× TB-150 (Caravan) — custom 1600×600×900mm — Notes: —
```

A hidden JSON copy of the items is also included for completeness. On success
the store is `clear()`ed. If a customer reaches `/quote` with an empty list, the
page renders exactly the current plain form — fully backwards-compatible.

## Testing & quality gates

- **Contract test** (`src/test/quote.test.js`, Vitest): add → store and
  localStorage reflect it; de-dup on re-add; `remove`/`clear` behave; the
  serializer produces the exact expected multiline string for a known list.
- **Accessibility:** drawer passes axe and jsx-a11y (dialog role, focus
  management, labelled inputs); the existing Lighthouse a11y ≥ 90 gate is
  unaffected.
- **CI:** `yarn lint && yarn format:check && yarn test && yarn build` all green,
  per repo policy.

## Files

**New**
- `src/lib/quoteStore.js`
- `src/components/QuoteButton.jsx`
- `src/components/QuoteDrawer.jsx` + `QuoteDrawer.css`
- `src/test/quote.test.js`

**Edited**
- `src/App.jsx` — mount `<QuoteDrawer />` beside `<Lightbox />`
- `src/components/Navbar.jsx` + `Navbar.css` — quote badge
- `src/components/Card.jsx` — optional `quote` prop → `QuoteButton`
- `src/components/ProductRange.jsx` — pass `quote` through to `Card`
- `src/pages/CaravanPage.jsx` — pass `quote` through to `Card`
- `src/content/caravan.js` (then `utes.js`, `trucks.js`) — add `quote` objects
- `src/pages/QuotePage.jsx` — item summary + serialization on submit
- `src/content/quote.js` — copy for the item-summary block

## Out of scope

- Payment / checkout of any kind.
- Structured add-on catalogs per product.
- Any grand total or running subtotal.
- Fabrication per-item add buttons (custom jobs route to the plain `/quote`
  form).
