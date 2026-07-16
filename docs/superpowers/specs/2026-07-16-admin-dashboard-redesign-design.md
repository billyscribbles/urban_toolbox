# Admin Dashboard Redesign — Design

Date: 2026-07-16
Status: Approved (pending spec review)

## Goal

Reskin the `/admin` dashboard to closely match the provided mockup: a page-title
header, four icon-tile stat cards (one of which is a store-wide discount card
with a modal), a search/filter toolbar merged into the product-table card,
icon-only row actions, and client-side pagination.

Fidelity: **match the mockup closely** (user decision). Where the mockup implies
new backend features (notification bell, avatar dropdown), those are **ignored**
— not rendered.

## Approach

Incremental refactor of the existing admin files. `ProductList` stays the
orchestrator; three small presentational pieces are extracted (`StatCards`,
`DiscountModal`, and an inline `Pagination` block). The page-title header moves
into `AdminPage`'s topbar. All styling uses existing `theme.config.js` tokens via
`Admin.css` — no raw hex, no new libraries, JSX only.

Rejected alternatives:
- Full split into 6+ component files — over-engineering for a single-admin tool.
- Pure-CSS reskin — cannot produce the icon-tile cards, pagination, or discount
  modal, so it cannot match the mockup.

## Data notes

- No `sku` column exists. The product primary key `row.id` is an editable text
  code (e.g. `UTB-610330540`) — this is what the mockup renders as "SKU: …".
  The product-cell subline shows `row.id`, labeled `SKU:`.
- Store-wide discount is read via `fetchStoreDiscount()` / written via
  `saveStoreDiscount(pct)` (already in `adminApi.js`; backed by `store_settings`
  from migration 0003). No API changes required.

## Sections

### 1. Topbar → page header (`AdminPage.jsx`, `Admin.css`)

Replace the current brand-lockup topbar content with the mockup header row:
- Left: a **small** logo mark (kept for identity) + `Dashboard` (h1) +
  `Welcome back, Admin.` sub-line. The greeting name is the literal role label
  `Admin` (consistent with the existing topbar `Admin` tag), not a client string.
- Right: `← Return to site` as a bordered pill button + `Sign out` ghost button.
- Notification bell and avatar dropdown are **not rendered**.

Topbar stays sticky. Header title/sub use display/body fonts + ink tokens.

### 2. Four stat cards (`StatCards.jsx`, `Admin.css`)

Responsive 4-across grid, collapsing to 2 / 1 columns on narrow widths. Each card
= a rounded-square icon tile + text block.

| Card | Tile bg | Icon (lucide) | Big value | Label / sub |
|---|---|---|---|---|
| Total products | `--color-ink-strong` (icon white) | `Package` | `total` | Total products / All products in store |
| Visible products | `--color-accent-soft` (icon accent) | `Eye` | `visibleCount` | Visible products / Currently visible online |
| Hidden products | `--color-border-light` (icon muted) | `EyeOff` | `hiddenCount` | Hidden products / Not visible to customers |
| Store-wide discount | `--color-accent-soft` (icon accent) | `Tag` | `{pct}%` | Store-wide discount + **Manage discount** button |

Counts are derived in `ProductList` from `rows` (as today) and passed down.
Existing `data-testid="stat-total" | "stat-visible" | "stat-hidden"` hooks are
preserved on the number elements so the contract suite still resolves.

### 3. Discount → card + modal (`DiscountModal.jsx`, reuse `StoreDiscount` logic)

- The discount stat card owns the current-value fetch (`fetchStoreDiscount`) and
  displays `{pct}%`.
- **Manage discount** button opens a centered modal: backdrop, close button,
  `Escape` to close, focus trapped within the panel, `role="dialog"` +
  `aria-modal="true"` + labelled by its title. Backdrop click closes.
- Modal body reuses the existing `StoreDiscount` form (input + Apply/Clear +
  status/error). On successful save the modal reports the new value back so the
  card updates its displayed `%` and closes (or shows the inline success first,
  then closes — success state preserved).
- `StoreDiscount`'s validation (0–99, non-destructive) is reused, not rewritten.

### 4. Toolbar + table as one card (`ProductList.jsx`, `Admin.css`)

Merge the search / category / **+ New product** toolbar into the same white card
as the table, as a card header separated by a divider.

- Search input gets a leading magnifier (`Search`) icon.
- Table columns unchanged: Photo, Product, Category, Price, Status, Actions.
- **Product cell:** thumb + title + `row.id` subline shown as `SKU: {row.id}`.
- **Actions:** three icon-only square buttons — `Eye`/`EyeOff` (show/hide
  toggle), `Pencil` (edit), `Trash` (danger, delete). Each keeps an `aria-label`.
- **Two-step delete** preserved without `window.confirm`: clicking the trash icon
  swaps that row's action cell to inline **Confirm delete / Cancel** buttons
  (same state machine as today, just triggered from the icon).
- Status badges ("● Live" / "Hidden" / Featured / % off) unchanged.
- Hidden-row muting (dim text + thumb, not the buttons) unchanged.

### 5. Client-side pagination (`ProductList.jsx`, `Admin.css`)

Footer bar below the table:
- Left: `Showing {start} to {end} of {N} products`.
- Center/right: prev chevron · page-number buttons with `…` truncation · next
  chevron. Active page marked `aria-current="page"`.
- Right: page-size selector, options `10 / 25 / 50`, default `10`.
- Slices the already-filtered `visible` rows client-side — no API change.
- Current page resets to 1 whenever the search query, category filter, or page
  size changes.
- Wrapped in `<nav aria-label="Pagination">`.

### 6. Constraints honored

- Tokens only (no raw hex); verified by hex-grep over `Admin.css` before done.
- No new dependencies; lucide icons already available.
- JSX only, no TypeScript.
- `data-testid` stat hooks preserved.
- a11y: icon-only buttons labelled, modal focus-trapped + Esc + aria, pagination
  nav landmark + `aria-current`. Must pass jsx-a11y + axe in CI.

## Testing impact

`src/test/admin.test.jsx` needs updates for:
- New stat-card structure (labels/sublabels) — keep asserting via `data-testid`.
- Discount now behind a **Manage discount** button + modal (open modal before
  asserting the input).
- Pagination: default page size 10 means only the first 10 rows render; tests
  that assume all rows are present must page or assert within the first page.

New behavior to cover:
- Pagination slices correctly; page resets on filter change.
- Discount modal opens/closes and applies a value.
- Delete two-step still works from the trash icon.

## Verification (before "done")

1. `yarn lint && yarn format:check` clean.
2. `yarn test` — contract suite green.
3. `yarn build` succeeds.
4. Hex-grep of `Admin.css` finds no raw colors.
5. Browser drive-through: header, four cards, discount modal apply/clear,
   search + category filter, pagination across pages + page-size change, row
   show/hide toggle, edit open, two-step delete, at 375 / 768 / 1280px.
6. Lighthouse a11y ≥ 90 on the admin page (note: `/admin` is noindex; run
   against the authed dashboard state).
