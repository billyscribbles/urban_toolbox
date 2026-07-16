# Admin Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the `/admin` dashboard to match the provided mockup — page-title header, four icon-tile stat cards (incl. a discount card + modal), a toolbar merged into the product-table card, icon-only row actions with a SKU subline, and client-side pagination.

**Architecture:** Incremental refactor of the existing admin files. `ProductList` stays the orchestrator. Extract `StatCards` (the four summary cards, incl. the discount card that opens a modal) and `DiscountModal` (a centered dialog reusing the existing `StoreDiscount` form). The page-title header moves into `AdminPage`'s topbar. All styling via `Admin.css` using `theme.config.js` tokens only.

**Tech Stack:** React 18, React Router v7, plain CSS + CSS variables, Framer Motion 11, Lucide React icons, Vitest + Testing Library + jest-axe.

## Global Constraints

- Tokens only — no raw hex/rem in `Admin.css`; use `var(--color-*)`, `var(--radius-*)`, `var(--shadow-*)`, `var(--font-*)`, `var(--transition-*)`. (CLAUDE.md)
- No new dependencies. Lucide icons and Framer Motion are already available.
- JSX only, no TypeScript.
- No hardcoded client strings in components — brand values come from `site.config.js`. The greeting name is the literal role label `Admin` (a role, not a client string), consistent with the existing topbar tag.
- Preserve the `data-testid="stat-total" | "stat-visible" | "stat-hidden"` hooks on the stat numbers.
- a11y must stay clean (jsx-a11y lint + jest-axe): icon-only buttons carry `aria-label`; the modal is focus-trapped with Esc-to-close and `role="dialog"` + `aria-modal="true"`; pagination is a `<nav aria-label="Pagination">` with `aria-current="page"` on the active page.
- Product-id subline is labeled `SKU:` (the editable text PK reads as a SKU code).
- Commands: `yarn lint`, `yarn format:check`, `yarn test`, `yarn build`. Run a single test file with `yarn test src/test/admin.test.jsx`.

---

## File Structure

- `src/pages/admin/AdminPage.jsx` — MODIFY: topbar becomes the page-title header (Task 1).
- `src/pages/admin/StatCards.jsx` — CREATE: four summary cards; discount card owns its value + opens the modal (Task 2).
- `src/pages/admin/DiscountModal.jsx` — CREATE: centered dialog wrapping `StoreDiscount` (Task 2).
- `src/pages/admin/StoreDiscount.jsx` — MODIFY: add optional `onSaved` callback (Task 2).
- `src/pages/admin/ProductList.jsx` — MODIFY: render `StatCards`; merge toolbar into the table card; icon-only actions + SKU subline (Task 3); client-side pagination (Task 4).
- `src/pages/admin/Admin.css` — MODIFY: header, stat cards, modal, toolbar-in-card, icon actions, pagination styles (all tasks).
- `src/test/admin.test.jsx` — MODIFY: header heading, stat cards, discount modal, icon actions, pagination (all tasks).

---

## Task 1: Page-title header

**Files:**

- Modify: `src/pages/admin/AdminPage.jsx:54-77`
- Modify: `src/pages/admin/Admin.css` (topbar section `:10-76`)
- Test: `src/test/admin.test.jsx` (signed-in describe block `:56-80`)

**Interfaces:**

- Consumes: `site.brand.logoMark`, `site.brand.logoText` (already imported), `signOut` (already imported).
- Produces: header markup with a "Dashboard" `<h1>` and "Welcome back, Admin." sub-line; a `← Return to site` link (role `link`) and a `Sign out` button (role `button`) — both names unchanged so existing tests keep resolving.

- [ ] **Step 1: Add the failing test**

In `src/test/admin.test.jsx`, inside `describe('AdminPage — signed in', …)`, add:

```jsx
it('shows the Dashboard page heading and welcome line', async () => {
  renderSignedIn()
  expect(await screen.findByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
  expect(screen.getByText(/welcome back, admin/i)).toBeInTheDocument()
})

it('has no axe violations on the dashboard', async () => {
  const { container } = renderSignedIn()
  await screen.findByRole('heading', { name: /dashboard/i })
  expect(await axe(container)).toHaveNoViolations()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test src/test/admin.test.jsx -t "Dashboard page heading"`
Expected: FAIL — no heading named "Dashboard".

- [ ] **Step 3: Rewrite the topbar as a page header**

In `src/pages/admin/AdminPage.jsx`, replace the `<header className="admin-topbar">…</header>` block (lines 55-77) with:

```jsx
<header className="admin-topbar">
  <div className="admin-topbar__lead">
    <img className="admin-topbar__mark" src={site.brand.logoMark} alt="" width="40" height="40" />
    <div className="admin-topbar__heading">
      <h1 className="admin-topbar__title">Dashboard</h1>
      <p className="admin-topbar__welcome">Welcome back, Admin.</p>
    </div>
  </div>
  <div className="admin-topbar__actions">
    <Link className="admin-topbar__pill" to="/">
      ← Return to site
    </Link>
    <button type="button" className="admin__ghost" onClick={signOut}>
      Sign out
    </button>
  </div>
</header>
```

- [ ] **Step 4: Replace the topbar CSS**

In `src/pages/admin/Admin.css`, replace the block from `.admin-topbar__brand` (line 24) through `.admin-topbar__link:hover` (line 76) with:

```css
.admin-topbar__lead {
  display: flex;
  align-items: center;
  gap: 14px;
}
/* The brand mark is a white emblem built for the dark storefront header; invert
   it to solid black so it reads on the admin's white chrome. */
.admin-topbar__mark {
  width: 40px;
  height: 40px;
  object-fit: contain;
  filter: invert(1);
}
.admin-topbar__heading {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.admin-topbar__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 24px;
  line-height: 1;
  color: var(--color-ink-strong);
}
.admin-topbar__welcome {
  margin: 0;
  font-size: 14px;
  color: var(--color-ink-muted);
}
.admin-topbar__pill {
  display: inline-flex;
  align-items: center;
  font-weight: 600;
  font-size: 14px;
  color: var(--color-ink);
  text-decoration: none;
  padding: 8px 16px;
  background: var(--color-white);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  transition:
    border-color var(--transition-fast),
    color var(--transition-fast);
}
.admin-topbar__pill:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `yarn test src/test/admin.test.jsx`
Expected: PASS — including the two new tests and the existing "Return to site link and Sign out" test.

- [ ] **Step 6: Lint + commit**

```bash
yarn lint
git add src/pages/admin/AdminPage.jsx src/pages/admin/Admin.css src/test/admin.test.jsx
git commit -m "feat(admin): page-title header on the dashboard topbar"
```

---

## Task 2: Stat cards + discount card + modal

**Files:**

- Create: `src/pages/admin/StatCards.jsx`
- Create: `src/pages/admin/DiscountModal.jsx`
- Modify: `src/pages/admin/StoreDiscount.jsx:29-47` (add `onSaved`)
- Modify: `src/pages/admin/ProductList.jsx:1-8, 59-87` (render `StatCards`)
- Modify: `src/pages/admin/Admin.css` (stat-card + modal styles; remove old `.admin-stat*` / `.admin-dash-head`)
- Test: `src/test/admin.test.jsx` (ProductList describe `:107`)

**Interfaces:**

- `StatCards` — props `{ total: number, visibleCount: number, hiddenCount: number }`. Renders four cards; keeps `data-testid="stat-total|stat-visible|stat-hidden"` on the numbers. Owns the store discount value display + the "Manage discount" button that opens `DiscountModal`.
- `DiscountModal` — props `{ onSaved: (pct: number) => void, onClose: () => void }`. Centered dialog; body is `<StoreDiscount onSaved={…} />`.
- `StoreDiscount` — add optional prop `onSaved?: (pct: number) => void`, invoked after a successful `saveStoreDiscount(pct)` with the applied `pct`.
- Consumes: `fetchStoreDiscount(): Promise<number>`, `saveStoreDiscount(pct): Promise<void>` from `adminApi.js` (already mocked in tests: fetch → 0, save → undefined).

- [ ] **Step 1: Add the failing tests**

In `src/test/admin.test.jsx`, add a new describe block after the `ProductList` block (after line 176):

```jsx
const { default: StatCards } = await import('../pages/admin/StatCards.jsx')
const { saveStoreDiscount } = await import('../lib/adminApi.js')

describe('StatCards', () => {
  it('renders total / visible / hidden counts', () => {
    render(<StatCards total={5} visibleCount={3} hiddenCount={2} />)
    expect(screen.getByTestId('stat-total')).toHaveTextContent('5')
    expect(screen.getByTestId('stat-visible')).toHaveTextContent('3')
    expect(screen.getByTestId('stat-hidden')).toHaveTextContent('2')
  })

  it('opens the discount modal, applies a value, and closes', async () => {
    const user = userEvent.setup()
    render(<StatCards total={5} visibleCount={3} hiddenCount={2} />)
    await user.click(screen.getByRole('button', { name: /manage discount/i }))
    const dialog = await screen.findByRole('dialog', { name: /store-wide discount/i })
    expect(dialog).toBeInTheDocument()
    const input = screen.getByLabelText(/store-wide discount/i)
    await user.clear(input)
    await user.type(input, '20')
    await user.click(screen.getByRole('button', { name: /^apply$/i }))
    expect(saveStoreDiscount).toHaveBeenCalledWith(20)
    await user.keyboard('{Escape}')
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /store-wide discount/i })).toBeNull(),
    )
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn test src/test/admin.test.jsx -t "StatCards"`
Expected: FAIL — `StatCards.jsx` does not exist.

- [ ] **Step 3: Add `onSaved` to StoreDiscount**

In `src/pages/admin/StoreDiscount.jsx`, change the component signature (line 8) and the `apply` success path (lines 39-41):

```jsx
export default function StoreDiscount({ onSaved }) {
```

and inside `apply`, after `await saveStoreDiscount(pct)`:

```jsx
await saveStoreDiscount(pct)
setValue(pct ? String(pct) : '')
setStatus(pct ? `Store-wide ${pct}% discount is live.` : 'Store-wide discount cleared.')
onSaved?.(pct)
```

- [ ] **Step 4: Create DiscountModal**

Create `src/pages/admin/DiscountModal.jsx`:

```jsx
import { useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import StoreDiscount from './StoreDiscount.jsx'

// Centered dialog that hosts the store-wide discount form. Mirrors EditorTray's
// dialog semantics (Esc-to-close, backdrop, body scroll lock, focus the close
// button, restore focus on exit). Always rendered open — the parent mounts it
// only while the modal should be visible.
export default function DiscountModal({ onSaved, onClose }) {
  const reduce = useReducedMotion()
  const closeRef = useRef(null)

  useEffect(() => {
    const trigger = document.activeElement
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      trigger?.focus?.()
    }
  }, [onClose])

  const panelMotion = reduce
    ? {}
    : {
        initial: { opacity: 0, scale: 0.96 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.96 },
        transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
      }
  const fade = reduce
    ? {}
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }

  return (
    <AnimatePresence>
      <div className="admin-modal" role="dialog" aria-modal="true" aria-label="Store-wide discount">
        <motion.button
          type="button"
          className="admin-modal__backdrop"
          aria-label="Close discount dialog"
          onClick={onClose}
          {...fade}
        />
        <motion.div className="admin-modal__panel" {...panelMotion}>
          <div className="admin-modal__head">
            <h2 className="admin-modal__title">Store-wide discount</h2>
            <button
              ref={closeRef}
              type="button"
              className="editor-tray__close"
              onClick={onClose}
              aria-label="Close discount dialog"
            >
              <X size={22} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>
          <div className="admin-modal__body">
            <p className="admin-modal__intro">
              One percentage applied to every storefront price at display time. The greater of this
              and each product&rsquo;s own discount wins. Set to 0 to turn it off.
            </p>
            <StoreDiscount onSaved={onSaved} />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
```

- [ ] **Step 5: Create StatCards**

Create `src/pages/admin/StatCards.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { Package, Eye, EyeOff, Tag } from 'lucide-react'
import { fetchStoreDiscount } from '../../lib/adminApi.js'
import DiscountModal from './DiscountModal.jsx'

// The four dashboard summary cards. Counts are derived by the parent from the
// product rows; the discount card owns its own value (store_settings) and opens
// the manage-discount modal.
export default function StatCards({ total, visibleCount, hiddenCount }) {
  const [pct, setPct] = useState(0)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let alive = true
    fetchStoreDiscount()
      .then((v) => alive && setPct(v || 0))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="admin-statcards">
      <StatCard variant="dark" icon={<Package size={22} strokeWidth={2} aria-hidden="true" />}>
        <span className="admin-statcard__num" data-testid="stat-total">
          {total}
        </span>
        <span className="admin-statcard__label">Total products</span>
        <span className="admin-statcard__sub">All products in store</span>
      </StatCard>

      <StatCard variant="accent" icon={<Eye size={22} strokeWidth={2} aria-hidden="true" />}>
        <span className="admin-statcard__num" data-testid="stat-visible">
          {visibleCount}
        </span>
        <span className="admin-statcard__label">Visible products</span>
        <span className="admin-statcard__sub">Currently visible online</span>
      </StatCard>

      <StatCard variant="muted" icon={<EyeOff size={22} strokeWidth={2} aria-hidden="true" />}>
        <span className="admin-statcard__num" data-testid="stat-hidden">
          {hiddenCount}
        </span>
        <span className="admin-statcard__label">Hidden products</span>
        <span className="admin-statcard__sub">Not visible to customers</span>
      </StatCard>

      <StatCard variant="accent" icon={<Tag size={22} strokeWidth={2} aria-hidden="true" />}>
        <span className="admin-statcard__label">Store-wide discount</span>
        <span className="admin-statcard__num admin-statcard__num--pct">{pct}%</span>
        <button
          type="button"
          className="admin__ghost admin-statcard__btn"
          onClick={() => setOpen(true)}
        >
          Manage discount
        </button>
      </StatCard>

      {open && <DiscountModal onSaved={(v) => setPct(v)} onClose={() => setOpen(false)} />}
    </div>
  )
}

function StatCard({ variant, icon, children }) {
  return (
    <div className="admin-statcard">
      <span className={`admin-statcard__tile admin-statcard__tile--${variant}`}>{icon}</span>
      <span className="admin-statcard__body">{children}</span>
    </div>
  )
}
```

- [ ] **Step 6: Wire StatCards into ProductList**

In `src/pages/admin/ProductList.jsx`:

Replace the `StoreDiscount` import (line 7) with:

```jsx
import StatCards from './StatCards.jsx'
```

Replace the `.admin-dash-head` block (lines 65-87) with:

```jsx
<StatCards total={total} visibleCount={visibleCount} hiddenCount={hiddenCount} />
```

(The `total`, `hiddenCount`, `visibleCount` consts at lines 59-61 stay as-is.)

- [ ] **Step 7: Add stat-card + modal styles**

In `src/pages/admin/Admin.css`, replace the `.admin-dash-head`, `.admin-stats`, `.admin-discount*`, and `.admin-stat*` blocks (lines 238-325) with:

```css
/* Stat cards — four across, icon tile + text */
.admin-statcards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}
.admin-statcard {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  background: var(--color-white);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}
.admin-statcard__tile {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 52px;
  height: 52px;
  border-radius: var(--radius-md);
}
.admin-statcard__tile--dark {
  background: var(--color-ink-strong);
  color: var(--color-white);
}
.admin-statcard__tile--accent {
  background: var(--color-accent-soft);
  color: var(--color-accent-hover);
}
.admin-statcard__tile--muted {
  background: var(--color-border-light);
  color: var(--color-ink-muted);
}
.admin-statcard__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.admin-statcard__num {
  font-family: var(--font-display);
  font-size: 28px;
  line-height: 1;
  color: var(--color-ink-strong);
}
.admin-statcard__num--pct {
  color: var(--color-accent-hover);
}
.admin-statcard__label {
  font-weight: 600;
  font-size: 14px;
  color: var(--color-ink);
}
.admin-statcard__sub {
  font-size: 12px;
  color: var(--color-ink-muted);
}
.admin-statcard__btn {
  margin-top: 8px;
  align-self: flex-start;
}

/* Centered modal (store-wide discount) */
.admin-modal {
  position: fixed;
  inset: 0;
  z-index: 1500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.admin-modal__backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  padding: 0;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.45);
}
.admin-modal__panel {
  position: relative;
  width: min(460px, 100%);
  background: var(--color-white);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}
.admin-modal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid var(--color-border-light);
}
.admin-modal__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 20px;
  text-transform: uppercase;
  color: var(--color-ink-strong);
}
.admin-modal__body {
  padding: 20px 22px 24px;
}
.admin-modal__intro {
  margin: 0 0 16px;
  font-size: 14px;
  color: var(--color-ink-muted);
}
```

Then in the same file, update the `.admin-discount` form layout so it reads well stacked inside the modal. Replace the retained `.admin-discount` rule only if it was removed above — it is used by `StoreDiscount`. Add back a modal-friendly version:

```css
/* Store-wide discount form (rendered inside the modal) */
.admin-discount {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.admin-discount__label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex-basis: 100%;
  font-weight: 600;
  font-size: 14px;
  color: var(--color-ink);
}
.admin-discount__label svg {
  color: var(--color-accent);
}
.admin-discount__field {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.admin-discount__input {
  width: 90px;
  padding-right: 26px;
  text-align: right;
}
.admin-discount__pct {
  position: absolute;
  right: 11px;
  color: var(--color-ink-muted);
  pointer-events: none;
}
.admin-discount__apply {
  margin-top: 0;
}
.admin-discount__status {
  flex-basis: 100%;
  margin-top: 0;
  font-size: 13px;
  color: var(--color-accent-hover);
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `yarn test src/test/admin.test.jsx`
Expected: PASS — new "StatCards" tests plus the existing "shows total / visible / hidden stats" test (data-testids preserved).

- [ ] **Step 9: Lint + commit**

```bash
yarn lint
git add src/pages/admin/StatCards.jsx src/pages/admin/DiscountModal.jsx \
  src/pages/admin/StoreDiscount.jsx src/pages/admin/ProductList.jsx \
  src/pages/admin/Admin.css src/test/admin.test.jsx
git commit -m "feat(admin): icon-tile stat cards + store-wide discount modal"
```

---

## Task 3: Toolbar-in-card, SKU subline, icon-only actions

**Files:**

- Modify: `src/pages/admin/ProductList.jsx:1-2, 89-121, 148-265`
- Modify: `src/pages/admin/Admin.css` (toolbar + table + actions)
- Test: `src/test/admin.test.jsx` (ProductList describe)

**Interfaces:**

- Consumes: `Search` icon from `lucide-react` (add to the existing import).
- Produces: product-cell subline `SKU: {row.id}`; row actions as three icon-only buttons with `aria-label`s — eye toggle `Show/Hide {title}` (unchanged names), edit `Edit {title}`, delete `Delete {title}` with a two-step Confirm/Cancel.

- [ ] **Step 1: Add the failing tests**

In `src/test/admin.test.jsx`, inside `describe('ProductList', …)`, add:

```jsx
it('shows the product id as a SKU subline', () => {
  render(
    <MemoryRouter>
      <ProductList rows={listRows} onEdit={() => {}} onNew={() => {}} onChanged={() => {}} />
    </MemoryRouter>,
  )
  expect(screen.getByText(/SKU:\s*a/i)).toBeInTheDocument()
})

it('edits from the row pencil button', async () => {
  const user = userEvent.setup()
  const onEdit = vi.fn()
  render(
    <MemoryRouter>
      <ProductList rows={listRows} onEdit={onEdit} onNew={() => {}} onChanged={() => {}} />
    </MemoryRouter>,
  )
  await user.click(screen.getByRole('button', { name: /edit whale tail lock/i }))
  expect(onEdit).toHaveBeenCalledWith(listRows[0])
})

it('deletes in two steps from the trash button', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <ProductList rows={listRows} onEdit={() => {}} onNew={() => {}} onChanged={() => {}} />
    </MemoryRouter>,
  )
  await user.click(screen.getByRole('button', { name: /delete whale tail lock/i }))
  expect(await screen.findByRole('button', { name: /confirm delete/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn test src/test/admin.test.jsx -t "SKU subline"`
Expected: FAIL — no "SKU: a" text yet.

- [ ] **Step 3: Add the Search icon import**

In `src/pages/admin/ProductList.jsx` line 2, extend the lucide import:

```jsx
import { Eye, EyeOff, Pencil, Plus, Search, Star, Trash2 } from 'lucide-react'
```

- [ ] **Step 4: Merge the toolbar into the table card**

Replace the toolbar + card wrapper so the toolbar becomes the card header. Change the `.admin-toolbar` block (lines 89-121) to remove the standalone `+ New product` button and add a search icon, and move `+ New product` to a card header alongside the table. Replace lines 89-121 with:

```jsx
      <div className="admin-card">
        <div className="admin-toolbar">
          <div className="admin-toolbar__search">
            <Search size={16} strokeWidth={2} aria-hidden="true" />
            <label className="sr-only" htmlFor="admin-search">
              Search products
            </label>
            <input
              id="admin-search"
              className="admin__input"
              type="search"
              placeholder="Search products…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <label className="sr-only" htmlFor="admin-cat">
            Filter by category
          </label>
          <select
            id="admin-cat"
            className="admin__select"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
          >
            <option value="">All categories</option>
            {leaves.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
          <span className="admin-toolbar__spacer" />
          <button type="button" className="admin__primary" style={{ marginTop: 0 }} onClick={onNew}>
            <Plus size={15} strokeWidth={2.5} aria-hidden="true" /> New product
          </button>
        </div>
```

NOTE: this opens a `<div className="admin-card">` that now wraps both the toolbar and the table. The existing table markup already lives in its own `<div className="admin-card">` (line 148). In Step 6 you remove that inner wrapper so there is exactly one card. The `error`, `loading`, and empty-state branches (lines 123-146) stay between the toolbar and the table, but move the error/loading/empty rendering **outside** this card if `rows.length === 0` — see Step 6.

- [ ] **Step 5: Verify the structure compiles**

Run: `yarn test src/test/admin.test.jsx -t "shows a skeleton"`
Expected: this may FAIL until Step 6 rebalances the card wrappers — that's expected mid-task. Proceed to Step 6.

- [ ] **Step 6: Rebuild the list body — one card, SKU subline, icon actions**

Replace the whole render return of `ProductList` from the error paragraph (line 123) through the closing `</div>` of the component (line 266) with the following. This keeps the loading/empty branches, removes the duplicate inner `.admin-card`, adds the SKU subline, and converts the actions to icon-only with a two-step delete:

```jsx
        {error && (
          <p className="admin__error" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <ul className="admin-skel" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="admin-skel__row" />
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <div className="admin-empty">
            <p className="admin-empty__title">No products yet</p>
            <p className="admin-empty__sub">Add your first catalogue product to get started.</p>
            <button
              type="button"
              className="admin__primary"
              style={{ marginTop: 0 }}
              onClick={onNew}
            >
              <Plus size={15} strokeWidth={2.5} aria-hidden="true" /> Add your first product
            </button>
          </div>
        ) : visible.length === 0 ? (
          <p className="admin__empty">No products match your search.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">Photo</span>
                </th>
                <th scope="col">Product</th>
                <th scope="col" className="admin-table__hide-sm">
                  Category
                </th>
                <th scope="col">Price</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr
                  key={row.id}
                  className={`admin-table__row${row.hidden ? ' admin-table__row--hidden' : ''}`}
                  onClick={(e) => {
                    if (!e.target.closest('button, a')) onEdit(row)
                  }}
                >
                  <td>
                    {thumb(row) ? (
                      <img className="admin-table__thumb" src={thumb(row)} alt="" />
                    ) : (
                      <span className="admin-table__thumb" aria-hidden="true" />
                    )}
                  </td>
                  <td className="admin-table__product">
                    <span className="admin-table__title">{row.title}</span>
                    <span className="admin-table__sku">SKU: {row.id}</span>
                  </td>
                  <td className="admin-table__hide-sm">
                    {leafLabel.get(row.category_id) ?? row.category_id}
                  </td>
                  <td>{row.price == null ? '—' : formatPrice(Number(row.price))}</td>
                  <td>
                    <div className="admin-badges">
                      {row.hidden ? (
                        <span className="admin-badge admin-badge--hidden">Hidden</span>
                      ) : (
                        <span className="admin-badge admin-badge--live">
                          <span className="admin-badge__dot" aria-hidden="true" /> Live
                        </span>
                      )}
                      {row.featured && (
                        <span className="admin-badge admin-badge--featured">
                          <Star size={12} strokeWidth={2} fill="currentColor" aria-hidden="true" />{' '}
                          Featured
                        </span>
                      )}
                      {row.discount_pct ? (
                        <span className="admin-badge admin-badge--off">
                          {Number(row.discount_pct)}% off
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <div className="admin-table__actions">
                      {confirmId === row.id ? (
                        <>
                          <button
                            type="button"
                            className="admin__danger"
                            disabled={busyId === row.id}
                            onClick={() => onDelete(row)}
                          >
                            {busyId === row.id ? 'Deleting…' : 'Confirm delete'}
                          </button>
                          <button
                            type="button"
                            className="admin__ghost"
                            onClick={() => setConfirmId(null)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="admin__icon"
                            disabled={togglingId === row.id}
                            aria-pressed={!row.hidden}
                            aria-label={row.hidden ? `Show ${row.title}` : `Hide ${row.title}`}
                            onClick={() => onToggleHidden(row)}
                          >
                            {row.hidden ? (
                              <EyeOff size={15} strokeWidth={2} aria-hidden="true" />
                            ) : (
                              <Eye size={15} strokeWidth={2} aria-hidden="true" />
                            )}
                          </button>
                          <button
                            type="button"
                            className="admin__icon"
                            aria-label={`Edit ${row.title}`}
                            onClick={() => onEdit(row)}
                          >
                            <Pencil size={14} strokeWidth={2} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="admin__icon admin__icon--danger"
                            aria-label={`Delete ${row.title}`}
                            onClick={() => setConfirmId(row.id)}
                          >
                            <Trash2 size={15} strokeWidth={2} aria-hidden="true" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

NOTE: the final `</div>` before `)` closes the `admin-card` opened in Step 4; the outer `</div>` closes the component's root wrapper.

- [ ] **Step 7: Style toolbar-in-card, product cell, and danger icon**

In `src/pages/admin/Admin.css`:

Replace the `.admin-toolbar` block (lines 328-341) with:

```css
/* Toolbar — sits inside the table card as a header row */
.admin-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--color-border-light);
}
.admin-toolbar__spacer {
  flex: 1;
}
.admin-toolbar__search {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex: 1 1 220px;
  max-width: 340px;
}
.admin-toolbar__search svg {
  position: absolute;
  left: 12px;
  color: var(--color-ink-muted);
  pointer-events: none;
}
.admin-toolbar__search .admin__input {
  width: 100%;
  padding-left: 36px;
}
.admin-toolbar .admin__select {
  width: auto;
  min-width: 180px;
}
```

Add product-cell + danger-icon styles near the table rules (after `.admin-table__title`, line 401):

```css
.admin-table__product {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.admin-table__sku {
  font-size: 12px;
  color: var(--color-ink-muted);
}
.admin__icon--danger {
  color: var(--color-danger);
}
.admin__icon--danger:hover {
  border-color: var(--color-danger);
}
```

Because the skeleton and empty state now render inside the card (which has `overflow: hidden` and a border), the skeleton's own padding still applies — no change needed. Verify the `.admin-skel` list has top/bottom breathing room; if it looks cramped, its existing `padding: 8px` (line 489) is sufficient.

- [ ] **Step 8: Run tests to verify they pass**

Run: `yarn test src/test/admin.test.jsx`
Expected: PASS — the three new tests plus existing filter/toggle/skeleton/empty tests.

- [ ] **Step 9: Lint + commit**

```bash
yarn lint
git add src/pages/admin/ProductList.jsx src/pages/admin/Admin.css src/test/admin.test.jsx
git commit -m "feat(admin): toolbar-in-card, SKU subline, icon-only row actions"
```

---

## Task 4: Client-side pagination

**Files:**

- Modify: `src/pages/admin/ProductList.jsx` (state, slice, footer)
- Modify: `src/pages/admin/Admin.css` (pagination styles)
- Test: `src/test/admin.test.jsx` (ProductList describe)

**Interfaces:**

- Consumes: the filtered `visible` array (already computed).
- Produces: a `<nav aria-label="Pagination">` footer with `Showing X to Y of N products`, prev/next chevron buttons, numbered page buttons (`aria-current="page"` on the active one), and a page-size `<select>` (10 / 25 / 50, default 10).

- [ ] **Step 1: Add the failing tests**

In `src/test/admin.test.jsx`, add a `paged` fixture and tests inside `describe('ProductList', …)`:

```jsx
it('paginates to 10 rows per page by default and pages through the rest', async () => {
  const user = userEvent.setup()
  const many = Array.from({ length: 14 }, (_, i) => ({
    id: `p${i}`,
    category_id: 'locks',
    title: `Product ${i}`,
    price: 10,
    discount_pct: null,
    featured: false,
    hidden: false,
    product_images: [],
  }))
  render(
    <MemoryRouter>
      <ProductList rows={many} onEdit={() => {}} onNew={() => {}} onChanged={() => {}} />
    </MemoryRouter>,
  )
  expect(screen.getByText('Product 0')).toBeInTheDocument()
  expect(screen.queryByText('Product 12')).toBeNull()
  expect(screen.getByText(/showing 1 to 10 of 14/i)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /go to page 2/i }))
  expect(screen.getByText('Product 12')).toBeInTheDocument()
  expect(screen.queryByText('Product 0')).toBeNull()
})

it('resets to page 1 when the search query changes', async () => {
  const user = userEvent.setup()
  const many = Array.from({ length: 14 }, (_, i) => ({
    id: `p${i}`,
    category_id: 'locks',
    title: `Product ${i}`,
    price: 10,
    discount_pct: null,
    featured: false,
    hidden: false,
    product_images: [],
  }))
  render(
    <MemoryRouter>
      <ProductList rows={many} onEdit={() => {}} onNew={() => {}} onChanged={() => {}} />
    </MemoryRouter>,
  )
  await user.click(screen.getByRole('button', { name: /go to page 2/i }))
  await userEvent.type(screen.getByLabelText(/search/i), 'Product 1')
  expect(screen.getByText(/showing 1 to/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn test src/test/admin.test.jsx -t "paginates to 10 rows"`
Expected: FAIL — no "Showing 1 to 10 of 14" text; all 14 rows render.

- [ ] **Step 3: Add pagination state and slicing**

In `src/pages/admin/ProductList.jsx`, add state near the other `useState` calls (after line 17):

```jsx
const [page, setPage] = useState(1)
const [pageSize, setPageSize] = useState(10)
```

After the `visible` const (line 25), add the derived slice and reset effect:

```jsx
const pageCount = Math.max(1, Math.ceil(visible.length / pageSize))
const clampedPage = Math.min(page, pageCount)
const start = (clampedPage - 1) * pageSize
const paged = visible.slice(start, start + pageSize)

// Any change to the filters or page size sends the user back to page 1 so they
// never land on an out-of-range page.
useEffect(() => {
  setPage(1)
}, [q, cat, pageSize])
```

Add the `useEffect` import at line 1:

```jsx
import { useEffect, useMemo, useState } from 'react'
```

- [ ] **Step 4: Render the slice and the pagination footer**

In the table body, change `{visible.map((row) => (` to `{paged.map((row) => (`.

Immediately after the closing `</table>`, before the card's closing `</div>`, add:

```jsx
<nav className="admin-pager" aria-label="Pagination">
  <span className="admin-pager__count">
    Showing {visible.length === 0 ? 0 : start + 1} to {Math.min(start + pageSize, visible.length)}{' '}
    of {visible.length} products
  </span>
  <div className="admin-pager__controls">
    <button
      type="button"
      className="admin__icon"
      aria-label="Previous page"
      disabled={clampedPage === 1}
      onClick={() => setPage(clampedPage - 1)}
    >
      <ChevronLeft size={15} strokeWidth={2} aria-hidden="true" />
    </button>
    {pageItems(clampedPage, pageCount).map((it, i) =>
      it === '…' ? (
        <span key={`gap-${i}`} className="admin-pager__gap" aria-hidden="true">
          …
        </span>
      ) : (
        <button
          key={it}
          type="button"
          className={`admin-pager__num${it === clampedPage ? ' admin-pager__num--on' : ''}`}
          aria-label={`Go to page ${it}`}
          aria-current={it === clampedPage ? 'page' : undefined}
          onClick={() => setPage(it)}
        >
          {it}
        </button>
      ),
    )}
    <button
      type="button"
      className="admin__icon"
      aria-label="Next page"
      disabled={clampedPage === pageCount}
      onClick={() => setPage(clampedPage + 1)}
    >
      <ChevronRight size={15} strokeWidth={2} aria-hidden="true" />
    </button>
  </div>
  <label className="sr-only" htmlFor="admin-pagesize">
    Products per page
  </label>
  <select
    id="admin-pagesize"
    className="admin__select admin-pager__size"
    value={pageSize}
    onChange={(e) => setPageSize(Number(e.target.value))}
  >
    <option value={10}>10 / page</option>
    <option value={25}>25 / page</option>
    <option value={50}>50 / page</option>
  </select>
</nav>
```

- [ ] **Step 5: Add the ChevronLeft/Right import and the page-window helper**

Extend the lucide import (line 2):

```jsx
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
} from 'lucide-react'
```

Add this module-scope helper below the imports, above the component (after line 7):

```jsx
// Compact page-number window: always the first and last page, the current page
// with a neighbour either side, and '…' gaps where pages are skipped.
function pageItems(current, count) {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1)
  const pages = new Set([1, count, current, current - 1, current + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b)
  const out = []
  let prev = 0
  for (const p of sorted) {
    if (p - prev > 1) out.push('…')
    out.push(p)
    prev = p
  }
  return out
}
```

- [ ] **Step 6: Add pagination styles**

In `src/pages/admin/Admin.css`, add after the `.admin-card` rule (near line 350):

```css
/* Pagination footer */
.admin-pager {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-top: 1px solid var(--color-border-light);
}
.admin-pager__count {
  font-size: 13px;
  color: var(--color-ink-muted);
}
.admin-pager__controls {
  display: flex;
  align-items: center;
  gap: 6px;
}
.admin-pager__num {
  min-width: 36px;
  height: 36px;
  padding: 0 8px;
  font: inherit;
  font-weight: 600;
  font-size: 14px;
  color: var(--color-ink);
  background: var(--color-white);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    background var(--transition-fast);
}
.admin-pager__num:hover {
  border-color: var(--color-accent);
}
.admin-pager__num--on {
  color: var(--color-white);
  background: var(--color-ink-strong);
  border-color: var(--color-ink-strong);
}
.admin-pager__gap {
  padding: 0 4px;
  color: var(--color-ink-muted);
}
.admin-pager__size {
  min-width: 108px;
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `yarn test src/test/admin.test.jsx`
Expected: PASS — both pagination tests plus all earlier tests (2-row fixtures render on a single page, footer reads "Showing 1 to 2 of 2 products").

- [ ] **Step 8: Lint + commit**

```bash
yarn lint
git add src/pages/admin/ProductList.jsx src/pages/admin/Admin.css src/test/admin.test.jsx
git commit -m "feat(admin): client-side pagination with page-size selector"
```

---

## Task 5: Full verification gate

**Files:** none (verification only).

- [ ] **Step 1: Token guard — no raw hex in Admin.css**

Run: `grep -nE '#[0-9a-fA-F]{3,8}\b' src/pages/admin/Admin.css`
Expected: no output (all colors are `var(--…)`). If any hex appears, replace it with the matching token from `theme.config.js`.

- [ ] **Step 2: Lint + format**

Run: `yarn lint && yarn format:check`
Expected: both pass clean. If format fails, run `yarn format` and re-check.

- [ ] **Step 3: Full test suite**

Run: `yarn test`
Expected: the whole `src/test/` contract suite passes (incl. jest-axe on login + the new dashboard axe test).

- [ ] **Step 4: Production build**

Run: `yarn build`
Expected: build succeeds; vendor chunks split as before.

- [ ] **Step 5: Browser drive-through (manual, via the run/verify skill)**

Start the app, sign in to `/admin`, and confirm against the mockup:

- Header shows "Dashboard" + "Welcome back, Admin." with Return-to-site pill + Sign out.
- Four stat cards with icon tiles; counts correct.
- "Manage discount" opens the modal; Apply saves and the card's `%` updates; Esc/backdrop/X close it; focus returns to the button.
- Search (with magnifier) + category filter narrow the table; the pager count updates.
- Pagination: page-size 10/25/50, prev/next, numbered pages, "…" truncation past 7 pages; changing search resets to page 1.
- Row actions: eye toggles hidden (row dims); pencil opens the editor; trash → Confirm delete / Cancel.
- Resize 375 / 768 / 1280px: stat grid, toolbar, table, and pager all reflow without horizontal scroll.

- [ ] **Step 6: Final commit (if the drive-through required tweaks)**

```bash
git add -A
git commit -m "chore(admin): dashboard redesign verification fixes"
```

---

## Self-Review Notes

- **Spec coverage:** §1 header → Task 1; §2 stat cards → Task 2; §3 discount card+modal → Task 2; §4 toolbar-in-card + SKU subline + icon actions → Task 3; §5 pagination → Task 4; §6 constraints + verification → Global Constraints + Task 5.
- **Data:** SKU subline uses `row.id` (no `sku` column exists — confirmed). Discount uses existing `fetchStoreDiscount`/`saveStoreDiscount` — no API change.
- **Type consistency:** `StatCards({ total, visibleCount, hiddenCount })`, `DiscountModal({ onSaved, onClose })`, `StoreDiscount({ onSaved })`, `pageItems(current, count)` are used with matching signatures across tasks.
- **Test hooks preserved:** `data-testid="stat-total|stat-visible|stat-hidden"`, `getByLabelText(/search/i)`, and the `Show/Hide {title}` aria-labels are all kept so pre-existing tests continue to resolve.
