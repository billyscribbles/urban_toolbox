# Product stock status — design

**Date:** 2026-07-30
**Status:** Approved, ready for implementation

## Goal

Let the admin mark each product as **In stock** or **Back order**, and show that state on
the product page. Every existing product defaults to **In stock**.

Two states, so one boolean — not an enum. The admin picks with a radio pair (exactly one
selected, which is what "tick one or the other" means); the storefront renders a small
badge in the buy card under the price.

## Data model

Migration `supabase/migrations/0008_product_stock.sql`:

```sql
alter table public.products
  add column in_stock boolean not null default true;
```

- `not null default true` **is** the "default everything to in stock" requirement — all 106
  existing rows become In stock on apply. No backfill statement needed.
- Meaning is enforced app-side, not by a constraint, matching `0002_product_hidden.sql`.
- Nothing filters on this column. Unlike `hidden`, a back-order product is still listed,
  still quotable, still priced — only its badge changes.

### Known drift (not fixed here)

`fits_ute` and `fits_caravan` exist in the live database but have no migration file in
`supabase/migrations/`. Pre-existing, unrelated to this change, and left alone.

## Read path — `src/lib/productStore.js`

`normalizeRow` gains one field:

```js
// Back-order flag. Missing (a row read before the migration) counts as in stock,
// so an un-migrated environment doesn't flip the whole catalogue to Back order.
inStock: row.in_stock !== false,
```

`!== false` rather than `!!` deliberately: `undefined !== false` is `true`, which is the
safe default. Same idiom as the neighbouring `fitsUte` / `fitsCaravan`.

## Write path

**`src/pages/admin/ProductEditor.jsx`** — `toForm`:

- new product → `inStock: true`
- existing row → `inStock: row.in_stock !== false`

and `onSubmit` passes `inStock: form.inStock` into `saveProduct`.

**`src/lib/adminApi.js`** — `toRow` gains `in_stock: p.inStock !== false`.

No entry in `validateProduct`: a boolean has no invalid state.

## Admin UI

A fieldset placed directly **after the price / discount row** — availability is a
commercial fact, so it belongs beside price rather than with the vehicle-fit flags.

```
Availability
 (•) In stock
 ( ) Back order
```

Two radios sharing `name="pe-stock"`, each wrapped by its own label — the same
label-wrapping the colour checkboxes use, so no `id`/`htmlFor` pair is needed. Reuses the
existing `.admin-editor__vehicles` fieldset and `.admin-editor__check` label classes, so
this adds **no new admin CSS**.

Because a radio's `onChange` only fires on the option being selected, each one sets the
boolean directly (`setForm({ ...form, inStock: true })` / `false`) rather than going
through the shared `set()` helper, which reads `e.target.checked`.

## Storefront — `src/components/StockBadge.jsx`

A new component with its own stylesheet, matching the one-component-one-CSS-file
convention of `PriceTag` and `FitmentBadge`. Dumb: takes `inStock` and renders.

- `inStock` → accent-green dot, label "In stock"
- otherwise → amber dot, label "Back order"

Rendered in `ProductPage.jsx`'s buy card immediately under `.product-page__price`. The
badge always renders — an explicit "In stock" is a positive signal, and a badge that only
appears for bad news trains customers to read its absence as nothing at all.

Not included, deliberately: no card badges, no admin-list badge, no lead-time copy, no
change to the quote button. A back-order product quotes exactly as before.

### New design tokens

`theme.config.js` has no amber. Add, next to `danger`:

```js
// Attention / non-blocking status (the back-order badge). A second status hue
// alongside `danger` — status colours sit outside the one-green-accent rule.
// Deliberately dark ochre, not a bright amber: the badge label is 13px, and a
// brighter tone can't clear AA on the soft fill (#b7791f manages only 3.3:1).
attention: '#8f5c0a',
'attention-soft': '#fdf3e3',
```

`#8f5c0a` on `#fdf3e3` is **5.16:1** — clears WCAG AA (4.5:1) for small text with room
to spare. One token does both the label and the dot, so the pair mirrors
`accent` / `accent-soft` and no raw hex reaches component CSS.

The In-stock variant needs **no new green token**: it reuses `accent-hover` on
`accent-soft` (4.59:1), the same pairing `FitmentBadge`'s inline chip already uses for
exactly this AA reason.

## Tests

| File                            | Covers                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| `src/test/productStore.test.js` | `normalizeRow` maps `in_stock` true / false / absent → `inStock`                     |
| `src/test/adminApi.test.js`     | the `saveProduct` payload carries `in_stock`                                         |
| `src/test/admin.test.jsx`       | editor defaults a new product to In stock, reflects a back-order row, flips on click |
| `src/test/stockBadge.test.jsx`  | both badge states render their label (new file, mirrors `priceTag.test.jsx`)         |

The existing axe pass renders the dashboard **list**, not the editor tray, so the tray's
form controls were never checked. Availability adds two more, so `admin.test.jsx` gains an
axe assertion over a rendered `ProductEditor`. It passes as written — it is a regression
guard for controls that are already correct, not a red-to-green step.

## Verification

`yarn lint`, `yarn format:check`, `yarn test` (227 tests), `yarn build` all green.

Verified in a browser against live Supabase data, not just in tests: the In-stock chip and
the Back-order chip both render under the price in the buy card, and the ochre reads as a
status rather than an alert beside the green Save badge. One product was flipped to
back-order to capture the second state and restored to in stock immediately after.

## Conflict note

The uncommitted FitmentBadge work in the main checkout edits the same buy-card region of
`ProductPage.jsx`. Its badge sits **above** the price, this one **below** — adjacent lines,
so a merge conflict is possible but small.
