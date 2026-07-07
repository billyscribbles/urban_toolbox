# Quote List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let customers add toolboxes to a cart-shaped "quote list", tune per-item dimensions/quantity/notes in a slide-over drawer, and hand the whole list to the existing `/quote` Formspree form in one submission — no checkout, no total.

**Architecture:** A single module-level store (`quoteStore.js`) exposed via a `useQuote()` hook (`useSyncExternalStore`) holds the item list and drawer open-state, persisted to `localStorage`. Products opt in by carrying a `quote` object in their content file; dumb components (`Card`, `Navbar`, `QuoteDrawer`) read the store and dispatch standalone actions. The drawer is mounted once in `App` beside the existing `Lightbox`, mirroring that component's dialog semantics.

**Tech Stack:** React 18, React Router v7, Framer Motion 11, Lucide React, plain CSS with theme-token CSS variables, Vitest + Testing Library + jest-axe.

## Global Constraints

- **No client strings, colors, prices, or links in components** — components read from `src/content/*.js` and `src/config/*.js`. Prices/ids/dims live in content `quote` objects.
- **Plain CSS + CSS variables only** — no Tailwind, styled-components, or new CSS system. Use existing tokens: `--color-accent`, `--color-accent-hover`, `--color-ink`, `--color-ink-muted`, `--color-white`, `--color-border-light`, `--radius-sm`, `--shadow-md`, `--transition-fast` (`140ms ease`), `--transition-base` (`200ms ease`). No raw hex/rem for tokenized values.
- **JSX only — no TypeScript.**
- **Reduced motion:** every animation must no-op under `useReducedMotion()` (Framer Motion), matching `lib/motion.js`.
- **z-index scale in use:** navbar `60`, image lightbox `2000`. The quote drawer sits between them at `1500`.
- **Reusable buttons:** `.btn` + `.btn--green` / `.btn--outline` from `src/index.css`.
- **CI gate:** `yarn lint && yarn format:check && yarn test && yarn build` must pass; Lighthouse a11y ≥ 90 unaffected.
- **Branch:** work on `feat/quote-list` (already created). Commit after every task.

---

### Task 1: Quote store + serializer

**Files:**
- Create: `src/lib/quoteStore.js`
- Test: `src/test/quote.test.jsx`

**Interfaces:**
- Produces:
  - `useQuote(): { items: Item[], isOpen: boolean }` — reactive snapshot hook.
  - `addItem(descriptor)` where `descriptor = { id, name, category, priceFrom, standardDims }`; normalizes to a full `Item`, dedupes by `id`, opens the drawer.
  - `updateItem(id, patch)`, `removeItem(id)`, `clearItems()`, `openQuote()`, `closeQuote()`.
  - `serializeQuoteItems(items): string` — human-readable multiline summary for the Formspree email.
  - `Item` shape: `{ id, name, category, priceFrom: number|null, standardDims: string, dims: { w, h, d }, qty: number, notes: string }` (dims values are strings from `<input>`).

- [ ] **Step 1: Write the failing test**

Create `src/test/quote.test.jsx`:

```jsx
// Contract: the quote store holds the enquiry list, persists it, and serializes
// it into the exact text the shop receives by email. Pure-logic tests — no React.
import { describe, it, expect, beforeEach } from 'vitest'
import {
  addItem,
  updateItem,
  removeItem,
  clearItems,
  openQuote,
  closeQuote,
  serializeQuoteItems,
  useQuote,
} from '../lib/quoteStore.js'

// The store is a module singleton; reset it (and its localStorage mirror)
// before each test so cases don't leak into one another.
beforeEach(() => {
  clearItems()
  closeQuote()
  window.localStorage.clear()
})

const TB295 = { id: 'tb-295', name: 'TB-295', category: 'Caravan', priceFrom: 3900, standardDims: '2200×570×1010' }
const TB150 = { id: 'tb-150', name: 'TB-150', category: 'Caravan', priceFrom: 1800, standardDims: '1500×600×900' }

// A tiny non-React reader for the store snapshot in logic tests.
const snap = () => useQuote.__getSnapshot()

describe('quoteStore — actions', () => {
  it('adds an item with normalized defaults and opens the drawer', () => {
    addItem(TB295)
    const s = snap()
    expect(s.isOpen).toBe(true)
    expect(s.items).toHaveLength(1)
    expect(s.items[0]).toMatchObject({
      id: 'tb-295',
      name: 'TB-295',
      category: 'Caravan',
      priceFrom: 3900,
      standardDims: '2200×570×1010',
      dims: { w: '', h: '', d: '' },
      qty: 1,
      notes: '',
    })
  })

  it('dedupes by id — re-adding does not duplicate the line', () => {
    addItem(TB295)
    addItem(TB295)
    expect(snap().items).toHaveLength(1)
  })

  it('updates, removes and clears items', () => {
    addItem(TB295)
    updateItem('tb-295', { qty: 3, dims: { w: '2100', h: '560', d: '1000' }, notes: 'raise lid' })
    expect(snap().items[0]).toMatchObject({ qty: 3, dims: { w: '2100', h: '560', d: '1000' }, notes: 'raise lid' })
    removeItem('tb-295')
    expect(snap().items).toHaveLength(0)
    addItem(TB150)
    clearItems()
    expect(snap().items).toHaveLength(0)
  })

  it('persists the list to localStorage', () => {
    addItem(TB295)
    const raw = window.localStorage.getItem('urbantoolboxes:quote')
    expect(JSON.parse(raw)[0].id).toBe('tb-295')
  })
})

describe('quoteStore — serializeQuoteItems', () => {
  it('renders standard, custom and price-on-enquiry lines exactly', () => {
    const items = [
      { id: 'tb-295', name: 'TB-295', category: 'Caravan', priceFrom: 3900, standardDims: '2200×570×1010', dims: { w: '', h: '', d: '' }, qty: 1, notes: 'extra lid clearance' },
      { id: 'tb-150', name: 'TB-150', category: 'Caravan', priceFrom: 1800, standardDims: '1500×600×900', dims: { w: '1600', h: '600', d: '900' }, qty: 2, notes: '' },
      { id: 'tray-a', name: 'Tray A', category: 'Utes', priceFrom: null, standardDims: '', dims: { w: '', h: '', d: '' }, qty: 1, notes: '' },
    ]
    expect(serializeQuoteItems(items)).toBe(
      [
        '1× TB-295 (Caravan) — 2200×570×1010mm — from $3900+GST — Notes: extra lid clearance',
        '2× TB-150 (Caravan) — custom 1600×600×900mm — from $1800+GST — Notes: —',
        '1× Tray A (Utes) — size TBC — price on enquiry — Notes: —',
      ].join('\n'),
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test src/test/quote.test.jsx`
Expected: FAIL — `Failed to resolve import '../lib/quoteStore.js'`.

- [ ] **Step 3: Write the store**

Create `src/lib/quoteStore.js`:

```js
import { useSyncExternalStore } from 'react'

// Cart-shaped enquiry store. A single module-level state object holds the item
// list and the drawer's open flag; components subscribe via useQuote() and
// mutate through the exported actions. Mirrors the "mounted once, dumb
// components" ethos of Lightbox — no React context needed.

const STORAGE_KEY = 'urbantoolboxes:quote'
const MAX_ITEMS = 20

function load() {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persist(items) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* private-mode / quota — ignore, the list simply won't survive reloads */
  }
}

let state = { items: load(), isOpen: false }
const listeners = new Set()

function setState(next) {
  state = next
  persist(state.items)
  listeners.forEach((fn) => fn())
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function getSnapshot() {
  return state
}

export function addItem(descriptor) {
  if (state.items.some((i) => i.id === descriptor.id) || state.items.length >= MAX_ITEMS) {
    setState({ ...state, isOpen: true })
    return
  }
  const item = {
    id: descriptor.id,
    name: descriptor.name,
    category: descriptor.category,
    priceFrom: descriptor.priceFrom ?? null,
    standardDims: descriptor.standardDims ?? '',
    dims: { w: '', h: '', d: '' },
    qty: 1,
    notes: '',
  }
  setState({ items: [...state.items, item], isOpen: true })
}

export function updateItem(id, patch) {
  setState({ ...state, items: state.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })
}

export function removeItem(id) {
  setState({ ...state, items: state.items.filter((i) => i.id !== id) })
}

export function clearItems() {
  setState({ ...state, items: [] })
}

export function openQuote() {
  setState({ ...state, isOpen: true })
}

export function closeQuote() {
  setState({ ...state, isOpen: false })
}

export function useQuote() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
// Test-only escape hatch so pure-logic tests can read the snapshot without React.
useQuote.__getSnapshot = getSnapshot

// Build the plain-text list the shop receives by email:
//   "2× TB-150 (Caravan) — custom 1600×600×900mm — from $1800+GST — Notes: …"
export function serializeQuoteItems(items) {
  return items
    .map((it) => {
      const { w, h, d } = it.dims
      const dims = w && h && d ? `custom ${w}×${h}×${d}mm` : it.standardDims ? `${it.standardDims}mm` : 'size TBC'
      const price = it.priceFrom ? `from $${it.priceFrom}+GST` : 'price on enquiry'
      const notes = it.notes && it.notes.trim() ? it.notes.trim() : '—'
      return `${it.qty}× ${it.name} (${it.category}) — ${dims} — ${price} — Notes: ${notes}`
    })
    .join('\n')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test src/test/quote.test.jsx`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/quoteStore.js src/test/quote.test.jsx
git commit -m "feat: add quote store and email serializer"
```

---

### Task 2: QuoteButton — add-to-quote control

**Files:**
- Create: `src/components/QuoteButton.jsx`
- Test: `src/test/quote.test.jsx` (append a `describe` block)

**Interfaces:**
- Consumes: `addItem`, `useQuote` from `quoteStore.js`.
- Produces: `<QuoteButton item={descriptor} />` where `descriptor = { id, name, category, priceFrom, standardDims }`. Renders "+ Add to quote"; once the item is in the list, shows a disabled-looking "✓ In your quote" state.

- [ ] **Step 1: Write the failing test**

Append to `src/test/quote.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QuoteButton from '../components/QuoteButton.jsx'

describe('QuoteButton', () => {
  it('adds the item and flips to the in-quote state', async () => {
    const user = userEvent.setup()
    render(<QuoteButton item={{ id: 'tb-165', name: 'TB-165', category: 'Caravan', priceFrom: 1750, standardDims: '1565×520×680' }} />)
    const btn = screen.getByRole('button', { name: /add to quote/i })
    await user.click(btn)
    expect(useQuote.__getSnapshot().items.some((i) => i.id === 'tb-165')).toBe(true)
    expect(screen.getByText(/in your quote/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test src/test/quote.test.jsx`
Expected: FAIL — `Failed to resolve import '../components/QuoteButton.jsx'`.

- [ ] **Step 3: Write the component**

Create `src/components/QuoteButton.jsx`:

```jsx
import { Plus, Check } from 'lucide-react'
import { addItem, useQuote } from '../lib/quoteStore.js'

// Opt-in "add to quote" control rendered inside a product Card. Dumb: it only
// knows the descriptor handed to it from content via Card.
export default function QuoteButton({ item }) {
  const { items } = useQuote()
  const inQuote = items.some((i) => i.id === item.id)

  if (inQuote) {
    return (
      <span className="quote-btn quote-btn--added">
        <Check size={16} strokeWidth={2} aria-hidden="true" /> In your quote
      </span>
    )
  }
  return (
    <button type="button" className="quote-btn" onClick={() => addItem(item)}>
      <Plus size={16} strokeWidth={2} aria-hidden="true" /> Add to quote
    </button>
  )
}
```

The `.quote-btn` styles are added in Task 3 alongside the drawer CSS (they share a stylesheet import through the drawer, but to keep the button self-contained, add its rules to `src/index.css` instead — see Step 4).

- [ ] **Step 4: Add button styles to `src/index.css`**

Append to `src/index.css` (uses existing tokens only):

```css
/* Add-to-quote button on product cards */
.quote-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 14px;
  padding: 9px 16px;
  font: inherit;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--color-white);
  background: var(--color-accent);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.quote-btn:hover {
  background: var(--color-accent-hover);
}
.quote-btn--added {
  color: var(--color-ink-muted);
  background: transparent;
  border-color: var(--color-border-light);
  cursor: default;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `yarn test src/test/quote.test.jsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/QuoteButton.jsx src/index.css src/test/quote.test.jsx
git commit -m "feat: add QuoteButton add-to-quote control"
```

---

### Task 3: QuoteDrawer — slide-over + mount in App

**Files:**
- Create: `src/components/QuoteDrawer.jsx`, `src/components/QuoteDrawer.css`
- Modify: `src/App.jsx` (mount beside `<Lightbox />`)
- Test: `src/test/quote.test.jsx` (append a rendered-drawer axe + behavior block)

**Interfaces:**
- Consumes: `useQuote`, `updateItem`, `removeItem`, `closeQuote`, `clearItems` from `quoteStore.js`; `useNavigate` from `react-router-dom`.
- Produces: `<QuoteDrawer />` — reads the store, renders nothing when `isOpen` is false. "Send enquiry →" closes the drawer and navigates to `/quote`.

- [ ] **Step 1: Write the failing test**

Append to `src/test/quote.test.jsx`:

```jsx
import { MemoryRouter } from 'react-router-dom'
import { axe, toHaveNoViolations } from 'jest-axe'
import { openQuote } from '../lib/quoteStore.js'
import QuoteDrawer from '../components/QuoteDrawer.jsx'

expect.extend(toHaveNoViolations)

describe('QuoteDrawer', () => {
  it('lists added items with editable specs and has no axe violations', async () => {
    addItem({ id: 'tb-277', name: 'TB-277', category: 'Caravan', priceFrom: 1900, standardDims: '2000×710×700' })
    openQuote()
    const { container } = render(
      <MemoryRouter>
        <QuoteDrawer />
      </MemoryRouter>,
    )
    expect(screen.getByRole('dialog', { name: /your quote/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'TB-277' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send enquiry/i })).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test src/test/quote.test.jsx`
Expected: FAIL — `Failed to resolve import '../components/QuoteDrawer.jsx'`.

- [ ] **Step 3: Write the drawer component**

Create `src/components/QuoteDrawer.jsx`:

```jsx
import { useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { X, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuote, updateItem, removeItem, closeQuote } from '../lib/quoteStore.js'
import './QuoteDrawer.css'

const DIM_KEYS = ['w', 'h', 'd']

// standardDims like "2200×570×1010" → the matching W/H/D placeholder.
function placeholder(standardDims, key) {
  if (!standardDims) return ''
  const part = standardDims.split('×')[DIM_KEYS.indexOf(key)]
  return part ? part.trim() : ''
}

// Site-wide quote drawer. Mounted once in App beside Lightbox; borrows its
// dialog semantics (role, Esc-to-close, scroll lock, focus the close button).
export default function QuoteDrawer() {
  const { items, isOpen } = useQuote()
  const reduce = useReducedMotion()
  const navigate = useNavigate()
  const closeRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && closeQuote()
    document.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [isOpen])

  function handleSend() {
    closeQuote()
    navigate('/quote')
  }

  const panelMotion = reduce
    ? {}
    : { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' }, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } }
  const fade = reduce ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="quote-drawer" role="dialog" aria-modal="true" aria-label="Your quote">
          <motion.button type="button" className="quote-drawer__backdrop" aria-label="Close quote" onClick={closeQuote} {...fade} />
          <motion.div className="quote-drawer__panel" {...panelMotion}>
            <div className="quote-drawer__head">
              <h2 className="quote-drawer__title">Your quote</h2>
              <button ref={closeRef} type="button" className="quote-drawer__close" onClick={closeQuote} aria-label="Close quote">
                <X size={22} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>

            {items.length === 0 ? (
              <p className="quote-drawer__empty">
                Nothing in your quote yet — browse the range and add the boxes you’re after.
              </p>
            ) : (
              <ul className="quote-drawer__list">
                {items.map((it) => (
                  <li key={it.id} className="quote-item">
                    <div className="quote-item__head">
                      <div>
                        <h3 className="quote-item__name">{it.name}</h3>
                        <p className="quote-item__meta">
                          {it.category} · {it.priceFrom ? `from $${it.priceFrom} + GST (indicative)` : 'Price on enquiry'}
                        </p>
                      </div>
                      <button type="button" className="quote-item__remove" onClick={() => removeItem(it.id)} aria-label={`Remove ${it.name}`}>
                        <Trash2 size={18} strokeWidth={1.7} aria-hidden="true" />
                      </button>
                    </div>

                    <div className="quote-item__dims" role="group" aria-label={`${it.name} dimensions in millimetres`}>
                      {DIM_KEYS.map((k) => (
                        <label key={k} className="quote-item__dim">
                          <span className="quote-item__dim-label">{k.toUpperCase()}</span>
                          <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            placeholder={placeholder(it.standardDims, k)}
                            value={it.dims[k]}
                            onChange={(e) => updateItem(it.id, { dims: { ...it.dims, [k]: e.target.value } })}
                          />
                        </label>
                      ))}
                      <span className="quote-item__dim-unit" aria-hidden="true">mm</span>
                    </div>

                    <label className="quote-item__qty">
                      <span>Qty</span>
                      <input
                        type="number"
                        min="1"
                        value={it.qty}
                        onChange={(e) => updateItem(it.id, { qty: Math.max(1, Number(e.target.value) || 1) })}
                      />
                    </label>

                    <label className="quote-item__notes">
                      <span className="quote-item__notes-label">Notes</span>
                      <textarea
                        rows={2}
                        placeholder="Anything specific — mounting, colour, cut-outs…"
                        value={it.notes}
                        onChange={(e) => updateItem(it.id, { notes: e.target.value })}
                      />
                    </label>
                  </li>
                ))}
              </ul>
            )}

            {items.length > 0 && (
              <div className="quote-drawer__foot">
                <button type="button" className="btn btn--green quote-drawer__send" onClick={handleSend}>
                  Send enquiry →
                </button>
                <p className="quote-drawer__note">No payment — we’ll call you back to confirm details and price.</p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 4: Write the drawer stylesheet**

Create `src/components/QuoteDrawer.css` (tokens only):

```css
.quote-drawer {
  position: fixed;
  inset: 0;
  z-index: 1500;
  display: flex;
  justify-content: flex-end;
}
.quote-drawer__backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  padding: 0;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.45);
}
.quote-drawer__panel {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(420px, 92vw);
  height: 100%;
  background: var(--color-white);
  box-shadow: var(--shadow-md);
}
.quote-drawer__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 22px;
  border-bottom: 1px solid var(--color-border-light);
}
.quote-drawer__title {
  margin: 0;
  font-size: 1.25rem;
  color: var(--color-ink-strong);
}
.quote-drawer__close {
  display: inline-flex;
  padding: 6px;
  color: var(--color-ink);
  background: none;
  border: 0;
  cursor: pointer;
  border-radius: var(--radius-sm);
}
.quote-drawer__close:hover {
  color: var(--color-accent);
}
.quote-drawer__empty {
  padding: 32px 22px;
  color: var(--color-ink-muted);
}
.quote-drawer__list {
  flex: 1;
  overflow-y: auto;
  margin: 0;
  padding: 8px 0;
  list-style: none;
}
.quote-item {
  padding: 18px 22px;
  border-bottom: 1px solid var(--color-border-light);
}
.quote-item__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.quote-item__name {
  margin: 0;
  font-size: 1.05rem;
  color: var(--color-ink-strong);
}
.quote-item__meta {
  margin: 2px 0 0;
  font-size: 0.85rem;
  color: var(--color-ink-muted);
}
.quote-item__remove {
  display: inline-flex;
  padding: 4px;
  color: var(--color-ink-muted);
  background: none;
  border: 0;
  cursor: pointer;
}
.quote-item__remove:hover {
  color: var(--color-accent);
}
.quote-item__dims {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  margin-top: 14px;
}
.quote-item__dim {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.quote-item__dim-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-ink-muted);
}
.quote-item__dim input,
.quote-item__qty input,
.quote-item__notes textarea {
  width: 100%;
  padding: 8px 10px;
  font: inherit;
  color: var(--color-ink);
  background: var(--color-white);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
}
.quote-item__dim input {
  width: 72px;
}
.quote-item__dim-unit {
  padding-bottom: 9px;
  font-size: 0.85rem;
  color: var(--color-ink-muted);
}
.quote-item__qty {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  font-size: 0.9rem;
  color: var(--color-ink);
}
.quote-item__qty input {
  width: 72px;
}
.quote-item__notes {
  display: block;
  margin-top: 14px;
}
.quote-item__notes-label {
  display: block;
  margin-bottom: 4px;
  font-size: 0.9rem;
  color: var(--color-ink);
}
.quote-drawer__foot {
  padding: 18px 22px;
  border-top: 1px solid var(--color-border-light);
}
.quote-drawer__send {
  width: 100%;
  justify-content: center;
}
.quote-drawer__note {
  margin: 12px 0 0;
  font-size: 0.8rem;
  color: var(--color-ink-muted);
  text-align: center;
}
```

- [ ] **Step 5: Mount the drawer in `App.jsx`**

In `src/App.jsx`, add the import next to the `Lightbox` import:

```jsx
import Lightbox from './components/Lightbox.jsx'
import QuoteDrawer from './components/QuoteDrawer.jsx'
```

And render it beside `<Lightbox />` (inside `<BrowserRouter>`, after `<Footer />`):

```jsx
      <Footer />
      <Lightbox />
      <QuoteDrawer />
    </BrowserRouter>
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `yarn test src/test/quote.test.jsx`
Expected: PASS (all blocks, including the axe check).

- [ ] **Step 7: Commit**

```bash
git add src/components/QuoteDrawer.jsx src/components/QuoteDrawer.css src/App.jsx src/test/quote.test.jsx
git commit -m "feat: add quote slide-over drawer, mount in App"
```

---

### Task 4: Navbar quote badge

**Files:**
- Modify: `src/components/Navbar.jsx`, `src/components/Navbar.css`
- Test: `src/test/quote.test.jsx` (append)

**Interfaces:**
- Consumes: `useQuote`, `openQuote` from `quoteStore.js`.
- Produces: a "Quote (N)" button in both the desktop and mobile navs, hidden while the list is empty, that calls `openQuote()`.

- [ ] **Step 1: Write the failing test**

Append to `src/test/quote.test.jsx`:

```jsx
import Navbar from '../components/Navbar.jsx'

describe('Navbar quote badge', () => {
  it('is hidden when empty and shows the count once items are added', async () => {
    const { rerender } = render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('button', { name: /open your quote/i })).toBeNull()

    addItem({ id: 'tb-199', name: 'TB-199', category: 'Caravan', priceFrom: 1950, standardDims: '1900×540×950' })
    rerender(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    )
    // Badge appears in both desktop and mobile navs.
    expect(screen.getAllByRole('button', { name: /open your quote/i }).length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test src/test/quote.test.jsx`
Expected: FAIL — no button matching `/open your quote/i`.

- [ ] **Step 3: Add the badge to `Navbar.jsx`**

Add the imports at the top of `src/components/Navbar.jsx`:

```jsx
import { useQuote, openQuote } from '../lib/quoteStore.js'
```

Inside `export default function Navbar()`, after `const { brand, nav, cta } = site`, read the count:

```jsx
  const { items } = useQuote()
  const quoteCount = items.length
```

Define a small badge element once (place above the `return`):

```jsx
  const quoteBadge = quoteCount > 0 && (
    <button
      type="button"
      className="navbar__quote"
      onClick={openQuote}
      aria-label={`Open your quote, ${quoteCount} item${quoteCount === 1 ? '' : 's'}`}
    >
      Quote <span className="navbar__quote-count">{quoteCount}</span>
    </button>
  )
```

Render it in the desktop bar, right before the `<SmartLink ... navbar__cta>`:

```jsx
        {quoteBadge}
        <SmartLink to={cta.href} className="navbar__cta">
          {cta.label}
        </SmartLink>
```

And in the mobile nav, right before the mobile `<SmartLink ... navbar__mobile-cta>`:

```jsx
        {quoteBadge}
        <SmartLink to={cta.href} className="navbar__mobile-cta" onClick={() => setMenuOpen(false)}>
          {cta.label}
        </SmartLink>
```

- [ ] **Step 4: Add badge styles to `Navbar.css`**

Append to `src/components/Navbar.css` (tokens only):

```css
.navbar__quote {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  font: inherit;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--color-accent);
  background: var(--color-accent-soft);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.navbar__quote:hover {
  background: var(--color-accent);
  color: var(--color-white);
}
.navbar__quote-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  font-size: 0.8rem;
  color: var(--color-white);
  background: var(--color-accent);
  border-radius: var(--radius-full);
}
.navbar__quote:hover .navbar__quote-count {
  color: var(--color-accent);
  background: var(--color-white);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `yarn test src/test/quote.test.jsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/Navbar.jsx src/components/Navbar.css src/test/quote.test.jsx
git commit -m "feat: add navbar quote badge"
```

---

### Task 5: Wire products to the quote — Card prop + content data

**Files:**
- Modify: `src/components/Card.jsx`, `src/components/ProductRange.jsx`, `src/pages/CaravanPage.jsx`
- Modify: `src/content/caravan.js`, `src/content/utes.js`, `src/content/trucks.js`
- Test: `src/test/content.test.js` (append a `quote`-shape contract)

**Interfaces:**
- Consumes: `QuoteButton` (Task 2), the `Item` descriptor shape.
- Produces: `<Card quote={...} quoteCategory="Caravan" />` renders a `QuoteButton`. Content products carry `quote: { id, priceFrom, standardDims }`.

**Content data rule (apply to every product that lists real specs):**
- `id`: the product `title` lowercased, non-alphanumeric runs collapsed to a single `-` (e.g. `'TB-295' → 'tb-295'`, `'Tray A' → 'tray-a'`).
- `standardDims`: the three W×H×D numbers from the product's `body`, joined with `×` and no units (e.g. `'2200 × 570 × 1010mm …' → '2200×570×1010'`). If the body has no W×H×D triple, use `''`.
- `priceFrom`: the dollar figure in the body as a number (e.g. `'$3900 + GST' → 3900`); if the body says "Enquire" / "Enquire for pricing" / has no price, use `null`.

- [ ] **Step 1: Write the failing test**

Append to `src/test/content.test.js`:

```js
import { caravan } from '../content/caravan.js'

describe('caravan products — quote descriptor contract', () => {
  it('every product carries a quote object with an id and dims', () => {
    for (const p of caravan.products) {
      expect(p.quote).toBeTruthy()
      expect(p.quote.id).toMatch(/^[a-z0-9-]+$/)
      expect(typeof p.quote.standardDims).toBe('string')
      expect(p.quote.priceFrom === null || typeof p.quote.priceFrom === 'number').toBe(true)
    }
  })

  it('quote ids are unique across the caravan range', () => {
    const ids = caravan.products.map((p) => p.quote.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test src/test/content.test.js`
Expected: FAIL — `p.quote` is undefined.

- [ ] **Step 3: Add the `quote` prop to `Card.jsx`**

In `src/components/Card.jsx`, add `quote` and `quoteCategory` to the destructured props, import `QuoteButton`, and render it in the card body:

```jsx
import { Link } from 'react-router-dom'
import Placeholder from './Placeholder.jsx'
import QuoteButton from './QuoteButton.jsx'
import './Card.css'

export default function Card({
  ph,
  phSub,
  img,
  imgAlt,
  title,
  body,
  cta,
  to,
  height = 220,
  alt = false,
  titleSize = 24,
  pad = 28,
  quote,
  quoteCategory,
}) {
```

In the `card__body` block, after the `cta` span:

```jsx
      <div className="card__body">
        <h3 className="card__title">{title}</h3>
        <p className="card__text">{body}</p>
        {cta && <span className="action-link card__cta">{cta} →</span>}
        {quote && (
          <QuoteButton
            item={{
              id: quote.id,
              name: title,
              category: quoteCategory,
              priceFrom: quote.priceFrom ?? null,
              standardDims: quote.standardDims ?? '',
            }}
          />
        )}
      </div>
```

Note: product cards pass no `to`, so they render as `<div>` — the button is not nested in a link (no a11y violation).

- [ ] **Step 4: Pass `quote` through in `CaravanPage.jsx`**

In `src/pages/CaravanPage.jsx`, add the two props to the `<Card>`:

```jsx
            <Card
              key={p.title}
              ph={p.ph}
              phSub={p.phSub}
              img={p.img}
              imgAlt={p.imgAlt}
              title={p.title}
              body={p.body}
              height={240}
              titleSize={22}
              pad={26}
              alt
              quote={p.quote}
              quoteCategory="Caravan"
            />
```

- [ ] **Step 5: Pass `quote` through in `ProductRange.jsx`**

In `src/components/ProductRange.jsx`, add the two props to the `<Card>` inside the products map (`header.title` is `'Utes'` / `'Trucks'`):

```jsx
              {s.products.map((p) => (
                <Card
                  key={p.title}
                  img={p.img}
                  imgAlt={p.imgAlt}
                  title={p.title}
                  body={p.body}
                  height={s.columns === 2 ? 260 : 240}
                  titleSize={s.columns === 2 ? 22 : 20}
                  pad={26}
                  alt
                  quote={p.quote}
                  quoteCategory={header.title}
                />
              ))}
```

- [ ] **Step 6: Add `quote` objects to content files**

In `src/content/caravan.js`, add a `quote` field to every product following the data rule. Worked examples (do the same for all remaining products in the array):

```js
    { title: 'TB-295', /* …existing fields… */ quote: { id: 'tb-295', priceFrom: 3900, standardDims: '2200×570×1010' } },
    { title: 'TB-150', /* … */ quote: { id: 'tb-150', priceFrom: 1800, standardDims: '1500×600×900' } },
    { title: 'TB-177', /* … */ quote: { id: 'tb-177', priceFrom: 1850, standardDims: '1775×550×645' } },
    { title: 'TB-185', /* … */ quote: { id: 'tb-185', priceFrom: 1800, standardDims: '1850×650×600' } },
    { title: 'TB-165', /* … */ quote: { id: 'tb-165', priceFrom: 1750, standardDims: '1565×520×680' } },
    { title: 'TB-256', /* … */ quote: { id: 'tb-256', priceFrom: 1800, standardDims: '2260×565×608' } },
    { title: 'TB-277', /* … */ quote: { id: 'tb-277', priceFrom: 1900, standardDims: '2000×710×700' } },
    { title: 'TB-199', /* … */ quote: { id: 'tb-199', priceFrom: 1950, standardDims: '1900×540×950' } },
    { title: 'TB-147', /* … */ quote: { id: 'tb-147', priceFrom: 1200, standardDims: '1450×450×610' } },
```

Continue for every remaining caravan product (TB-756 and any others) by reading each `body` string and applying the rule.

In `src/content/utes.js` and `src/content/trucks.js`, add a `quote` object to every product in every section. Ute/truck products that say "Enquire for pricing" get `priceFrom: null`; use `standardDims: ''` when the body has no W×H×D triple. Example (Utes → Trays → Tray A):

```js
        { title: 'Tray A', /* …existing fields… */ quote: { id: 'tray-a', priceFrom: null, standardDims: '' } },
```

Ensure `quote.id` is unique **within each content file** (prefix with a short section hint if two products would collide, e.g. `id: 'trucks-gullwing-1700'`).

- [ ] **Step 7: Run tests to verify they pass**

Run: `yarn test src/test/content.test.js`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/Card.jsx src/components/ProductRange.jsx src/pages/CaravanPage.jsx src/content/caravan.js src/content/utes.js src/content/trucks.js src/test/content.test.js
git commit -m "feat: wire product cards to the quote list"
```

---

### Task 6: QuotePage — item summary + serialized submission

**Files:**
- Modify: `src/pages/QuotePage.jsx`, `src/content/quote.js`
- Test: `src/test/quote.test.jsx` (append)

**Interfaces:**
- Consumes: `useQuote`, `clearItems`, `serializeQuoteItems` from `quoteStore.js`.
- Produces: when the list has items, `/quote` shows a read-only summary and submits two hidden fields — `quote_items` (text) and `quote_items_json` (JSON) — then `clearItems()` on success.

- [ ] **Step 1: Write the failing test**

Append to `src/test/quote.test.jsx`:

```jsx
import { HelmetProvider } from 'react-helmet-async'
import QuotePage from '../pages/QuotePage.jsx'
import { serializeQuoteItems } from '../lib/quoteStore.js'

describe('QuotePage — quote list summary', () => {
  it('shows the item summary and the serialized hidden field', () => {
    addItem({ id: 'tb-150', name: 'TB-150', category: 'Caravan', priceFrom: 1800, standardDims: '1500×600×900' })
    const { container } = render(
      <HelmetProvider>
        <MemoryRouter>
          <QuotePage />
        </MemoryRouter>
      </HelmetProvider>,
    )
    // Item name appears in the on-page summary.
    expect(screen.getByText('TB-150')).toBeInTheDocument()
    // Hidden field carries the serialized list for Formspree.
    const hidden = container.querySelector('input[name="quote_items"]')
    expect(hidden).not.toBeNull()
    expect(hidden.value).toBe(serializeQuoteItems(useQuote.__getSnapshot().items))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test src/test/quote.test.jsx`
Expected: FAIL — no `TB-150` text / no `input[name="quote_items"]`.

- [ ] **Step 3: Add summary copy to `quote.js`**

In `src/content/quote.js`, add a `list` block to the exported `quote` object (e.g. after `header`):

```js
  list: {
    heading: 'Your quote list',
    intro: 'These are the items you’ve added. Add your details below and we’ll call you back to confirm sizes and price.',
    empty: '',
  },
```

- [ ] **Step 4: Render summary + hidden fields in `QuotePage.jsx`**

In `src/pages/QuotePage.jsx`, add imports:

```jsx
import { quote } from '../content/quote.js'
import { site } from '../config/site.config.js'
import { useQuote, clearItems, serializeQuoteItems } from '../lib/quoteStore.js'
```

Inside `QuotePage()`, read the list:

```jsx
  const { items } = useQuote()
```

In `handleSubmit`, on success, clear the list — change the success branch to:

```jsx
      if (res.ok) {
        setStatus('success')
        form.reset()
        clearItems()
      } else {
```

Inside the `<form>` (only when the form is shown, i.e. the `isConfigured` branch), render the summary and hidden fields immediately after the honeypot / `_subject` inputs and before the fields map:

```jsx
                {items.length > 0 && (
                  <>
                    <input type="hidden" name="quote_items" value={serializeQuoteItems(items)} />
                    <input type="hidden" name="quote_items_json" value={JSON.stringify(items)} />
                    <div className="quote-summary">
                      <h2 className="quote-summary__heading">{quote.list.heading}</h2>
                      <p className="quote-summary__intro">{quote.list.intro}</p>
                      <ul className="quote-summary__list">
                        {items.map((it) => (
                          <li key={it.id} className="quote-summary__item">
                            <strong>
                              {it.qty}× {it.name}
                            </strong>{' '}
                            <span className="quote-summary__meta">
                              {it.dims.w && it.dims.h && it.dims.d
                                ? `${it.dims.w}×${it.dims.h}×${it.dims.d}mm`
                                : it.standardDims
                                  ? `${it.standardDims}mm`
                                  : 'size TBC'}
                              {it.notes.trim() ? ` · ${it.notes.trim()}` : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
```

- [ ] **Step 5: Add summary styles to `QuotePage.css`**

Append to `src/pages/QuotePage.css` (tokens only):

```css
.quote-summary {
  margin-bottom: 28px;
  padding: 18px 20px;
  background: var(--color-off-white);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
}
.quote-summary__heading {
  margin: 0 0 4px;
  font-size: 1.1rem;
  color: var(--color-ink-strong);
}
.quote-summary__intro {
  margin: 0 0 14px;
  font-size: 0.9rem;
  color: var(--color-ink-muted);
}
.quote-summary__list {
  margin: 0;
  padding-left: 18px;
}
.quote-summary__item {
  margin-bottom: 6px;
  color: var(--color-ink);
}
.quote-summary__meta {
  color: var(--color-ink-muted);
  font-size: 0.9rem;
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `yarn test src/test/quote.test.jsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/pages/QuotePage.jsx src/pages/QuotePage.css src/content/quote.js src/test/quote.test.jsx
git commit -m "feat: carry the quote list into the /quote submission"
```

---

### Task 7: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the whole test suite**

Run: `yarn test`
Expected: PASS — all existing suites plus `quote.test.jsx` and the new `content.test.js` cases.

- [ ] **Step 2: Lint + format**

Run: `yarn lint && yarn format:check`
Expected: no errors. If Prettier flags files, run `yarn format` and re-commit.

- [ ] **Step 3: Production build**

Run: `yarn build`
Expected: build succeeds, vendor chunks split as before, no new warnings.

- [ ] **Step 4: Manual smoke (dev server)**

Run: `yarn dev`, then verify:
- `/caravan-toolboxes` — each card shows "+ Add to quote"; clicking one opens the drawer, the navbar shows "Quote (1)".
- In the drawer: edit W/H/D, qty, notes; add a second box; remove one.
- "Send enquiry →" navigates to `/quote`; the summary lists the items above the form.
- Reload the page mid-list — the list survives (localStorage).
- Submit against the real Formspree endpoint — success clears the list and the navbar badge disappears.
- 375px width — drawer is ≤ 92vw, navbar badge and mobile menu behave.
- With OS "reduce motion" on — drawer appears without sliding.

- [ ] **Step 5: Commit any format fixes**

```bash
git add -A
git commit -m "chore: format + verification fixes for quote list"
```

---

## Self-Review

**Spec coverage:**
- Module store, no context (spec §Architecture) → Task 1.
- Item shape / dims / qty / notes → Task 1 (shape), Task 3 (editing UI).
- localStorage persistence → Task 1 (+ smoke in Task 7).
- Content `quote` object opt-in → Task 5.
- Card `QuoteButton` (additive) → Tasks 2, 5.
- Slide-over drawer, mounted in App, Lightbox dialog semantics, reduced motion → Task 3.
- Navbar badge hidden-until-first-item → Task 4.
- Prices "from … (indicative)" / "Price on enquiry", no total → Tasks 3, 5, 6.
- Submission via `/quote`, serialized email field, clear on success → Task 6.
- Rollout caravan → utes/trucks; fabrication custom-only (no add buttons) → Task 5 (fabrication untouched).
- Tests: store contract, serializer exact output, drawer axe, content contract → Tasks 1–6.
- CI gate → Task 7.

**Placeholder scan:** No "TBD"/"handle edge cases"/"similar to" — every code step shows full code. The caravan/utes/trucks per-product `quote` values are specified by an explicit deterministic rule plus nine worked examples, not left vague.

**Type consistency:** `Item` fields (`id, name, category, priceFrom, standardDims, dims:{w,h,d}, qty, notes`) are used identically across `quoteStore.js`, `QuoteButton`, `QuoteDrawer`, `Card`, and `QuotePage`. Action names (`addItem, updateItem, removeItem, clearItems, openQuote, closeQuote, useQuote, serializeQuoteItems`) match everywhere. Content descriptor (`{ id, priceFrom, standardDims }`) is consistently expanded to the full item (adding `name` from `title`, `category` from the page) in `Card`.
