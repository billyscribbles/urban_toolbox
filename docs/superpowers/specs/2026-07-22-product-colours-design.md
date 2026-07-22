# Product colour selector — design

**Date:** 2026-07-22
**Status:** Approved, ready for implementation plan

## Goal

Let the admin mark which colours a product is available in — **Silver, White, Black**.
Availability defaults to **none selected** (not selectable). When at least one colour is
marked, the product page shows a colour selector. The customer's choice rides into the
quote enquiry so the shop knows what was requested.

## Colour vocabulary

A fixed, ordered set of three colours. These are physical powder-coat colours (product
data), **not** design tokens, so they live in `src/data/`, not `theme.config.js`.

New file `src/data/colors.js`:

```js
// Powder-coat colours a product can be offered in. Order is the display order.
// `hex` drives the swatch fill; `border` flags swatches (white) that need an
// outline to stay visible on a light card.
export const PRODUCT_COLORS = [
  { key: 'silver', label: 'Silver', hex: '#C0C0C4' },
  { key: 'white', label: 'White', hex: '#F5F5F3', border: true },
  { key: 'black', label: 'Black', hex: '#1A1A1A' },
]

export const COLOR_KEYS = PRODUCT_COLORS.map((c) => c.key)

// Filter an arbitrary stored array down to known keys, preserving display order.
// Guards against stale/garbage values in the DB.
export function normalizeColors(list) {
  const set = new Set(Array.isArray(list) ? list : [])
  return PRODUCT_COLORS.filter((c) => set.has(c.key)).map((c) => c.key)
}
```

## Data model

Migration `supabase/migrations/0004_product_colors.sql`:

```sql
alter table public.products
  add column colors jsonb not null default '[]';
```

- Holds an array of enabled colour keys, e.g. `["silver","black"]`.
- Default `'[]'` → not selectable, satisfying "default to not selectable".
- No FK/enum enforcement (matches the repo's app-side validation ethos); the storefront
  and admin both filter through `normalizeColors`, so unknown values are ignored.

## Admin editor (`src/pages/admin/ProductEditor.jsx`)

- `toForm(row)` reads `colors: normalizeColors(row?.colors)` (empty array for new products).
- A new fieldset **"Available colours"** with three checkboxes, mirroring the existing
  _Fits utes / Fits caravans_ fieldset. Checking a colour adds its key to `form.colors`;
  unchecking removes it. All three start **unchecked** for a new product.
- On submit, `form.colors` (already normalized on load; re-normalized on save for safety)
  is passed into `saveProduct`.

Toggle helper on the form: a `toggleColor(key)` that adds/removes the key while preserving
`COLOR_KEYS` order.

## Persistence (`src/lib/adminApi.js`)

- `toRow(p)` writes `colors: normalizeColors(p.colors)`.
- No change to `saveProduct` control flow.

## Storefront normalization (`src/lib/productStore.js`)

- `normalizeRow` surfaces `colors: normalizeColors(row.colors)`.
- Older rows read before the migration have no `colors` → `normalizeColors(undefined)` → `[]`.

## Colour selector component (`src/components/ColorSelector.jsx` + `.css`)

- Props: `colors` (array of keys), `value` (selected key), `onChange(key)`.
- Renders an accessible **radio group**: `role="radiogroup"` with an `aria-label`
  ("Colour"); each swatch is a `role="radio"` button with `aria-checked`, `aria-label`
  set to the colour label, and keyboard arrow-key navigation (roving tabindex) — standard
  radio-group semantics so it passes the axe/a11y gate.
- Each swatch is a round chip filled with the colour `hex`; `border: true` colours get a
  visible ring. Selected swatch gets an accent ring using `var(--color-accent)`.
- A small text label ("Colour: Black") sits beside or above the swatches so the choice is
  legible, not colour-only (accessibility + clarity).
- Renders nothing if `colors` is empty — but the parent already guards this.

## Product page (`src/pages/ProductPage.jsx`)

- Local state: `const [color, setColor] = useState(product.colors[0] ?? null)`.
  First available colour is pre-selected. (Because `product` is resolved after the loading
  guards, initialise via `useState(() => product.colors?.[0] ?? null)` in a small child or
  guard against `product.colors` being undefined.)
- Render `<ColorSelector>` in the buy box, directly under the price / above the quote
  actions, **only when `product.colors.length > 0`**.
- Include the chosen colour in the quote descriptor: `quoteItem.color = color`.
  Since `quoteItem` is rebuilt on each render, changing the swatch updates what
  `QuoteButton` will add.

**Placement decision:** buy-box only. No swatches on catalogue cards (kept out of scope to
stay focused; can be added later by reading `product.colors` in `Card`).

## Quote flow (`src/lib/quoteStore.js`)

- `addItem(descriptor)` whitelists a new field: `color: descriptor.color ?? null`.
- The stored item carries `color`.
- `serializeQuoteItems` appends `— Colour: <Label>` to a line when `it.color` is set,
  resolving the label from `PRODUCT_COLORS`. Absent colour → line unchanged, so
  colourless products read exactly as today.

Example line:
`1× TB-150 (Ute) — 1600×600×900mm — from $1800+GST — Colour: Black — Notes: —`

## Testing

Extend the existing contract suite (no new frameworks):

- `src/data/colors.test.js` (new) — `normalizeColors` drops unknown keys, preserves order,
  handles `undefined`/non-array.
- `adminApi.test.js` — `toRow` includes normalized `colors`.
- `productStore.test.js` — `normalizeRow` surfaces `colors`; missing column → `[]`.
- `admin.test.jsx` — the editor renders the three colour checkboxes, they default
  unchecked, and toggling updates the saved payload.
- `quoteStore` coverage — `serializeQuoteItems` appends the colour line when set and omits
  it when absent; `addItem` persists `color`.
- A storefront test asserting `ColorSelector` does not render when `colors` is empty and
  renders three swatches when populated.

## Out of scope

- Per-colour product images / image swapping on selection.
- Swatches on catalogue cards.
- Colour as a filterable catalogue facet.
- Any new colours beyond Silver / White / Black (extensible via `PRODUCT_COLORS`).

## Verification checklist

1. Migration applies; existing rows get `colors = []` and still load.
2. Admin: new product shows three unchecked colour boxes; saving with none keeps the
   selector hidden on the storefront.
3. Admin: mark Silver + Black → product page shows two swatches, Silver pre-selected.
4. Selecting Black then "Add to quote" → quote item and serialized enquiry show
   "Colour: Black".
5. `yarn lint && yarn format:check && yarn test` pass (incl. axe on the selector).
6. `yarn build` succeeds.
