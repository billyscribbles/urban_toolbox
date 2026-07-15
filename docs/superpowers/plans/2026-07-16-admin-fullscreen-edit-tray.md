# Admin Full-Screen + Edit-Tray Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the `/admin` catalogue page into a full-screen standalone dashboard whose product editor opens in a slide-out tray, with a friendlier warm visual refresh.

**Architecture:** Hide the storefront Navbar/Footer/drawers on `/admin` via a `useLocation` guard in `App.jsx`. `AdminPage` gets its own sticky top bar (mark + title + Return-to-site link + Sign out) and a full-bleed body. A new prop-driven `EditorTray` component wraps the existing `ProductEditor` form in the site's established right-side drawer pattern (framer-motion slide, backdrop, Esc/close, focus trap). `ProductList` gets full-width warm styling with badges and empty/loading states. All styling uses existing `theme.config.js` tokens.

**Tech Stack:** React 18, React Router v7, Framer Motion 11, Lucide React, plain CSS + CSS variables, Vitest + Testing Library + jest-axe.

## Global Constraints

- Plain CSS + CSS custom properties only — no Tailwind, styled-components, or other CSS systems.
- JSX only — never add TypeScript.
- No new design tokens — use only tokens already in `src/config/theme.config.js` (`--radius-sm/md/lg`, `--shadow-sm/md/lg`, `--color-*`, `--font-*`, `--transition-*`).
- Never hardcode client strings/colors/links in components — read from `site.config.js` / content / tokens. Brand mark comes from `site.brand.logoMark`.
- No changes to CRUD/auth logic (`src/lib/adminApi.js`), validation (`src/lib/productForm.js`), image processing (`src/lib/imageResize.js`), or the data model.
- Delete stays a two-step inline confirm — never `window.confirm`.
- Must pass: `yarn lint`, `yarn format:check`, `yarn test` (incl. axe), `yarn build`.

---

## File Structure

| File                                                   | Responsibility                                                                                                                                          |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/App.jsx` (modify)                                 | Extract an `AppBody` inside `BrowserRouter`; render storefront chrome only when path ≠ `/admin`.                                                        |
| `src/pages/admin/EditorTray.jsx` (create)              | Slide-out drawer shell hosting `ProductEditor`; dialog semantics, prop-driven open/close.                                                               |
| `src/pages/admin/AdminPage.jsx` (modify)               | Standalone top bar + full-bleed body; hosts `EditorTray`; tracks `loaded`.                                                                              |
| `src/pages/admin/ProductEditor.jsx` (modify)           | Drop its own `<h2>` (tray owns the title); add tray form class. Logic untouched.                                                                        |
| `src/pages/admin/ProductList.jsx` (modify)             | Full-width table, status badges, `formatPrice`, loading skeleton + empty states; a stats bar (total/visible/hidden) and an inline show/hide eye toggle. |
| `src/pages/admin/AdminLogin.jsx` (modify)              | Add a form-level class hook for the centered card (markup minimal).                                                                                     |
| `src/pages/admin/Admin.css` (modify)                   | Full warm refresh: top bar, full-bleed, card table, badges, skeleton, tray, login card, stats bar, hidden-row + toggle styles.                          |
| `supabase/migrations/0002_product_hidden.sql` (create) | Adds the `hidden` boolean column to `products` (default false).                                                                                         |
| `src/lib/productStore.js` (modify)                     | Storefront fetch filters out hidden products (`.eq('hidden', false)`).                                                                                  |
| `src/lib/adminApi.js` (modify)                         | Add `setProductHidden(id, hidden)` — updates the flag and refreshes the storefront.                                                                     |
| `src/test/appFrame.test.jsx` (create)                  | Asserts marketing nav hidden on `/admin`, present on `/`.                                                                                               |
| `src/test/admin.test.jsx` (modify)                     | Signed-in dashboard tests; ProductList badge, stats, and show/hide toggle assertions.                                                                   |
| `src/test/adminApi.test.js` (modify)                   | Covers `setProductHidden`.                                                                                                                              |

---

### Task 1: Hide storefront chrome on `/admin`

**Files:**

- Modify: `src/App.jsx`
- Test: `src/test/appFrame.test.jsx` (create)

**Interfaces:**

- Consumes: existing `Navbar`, `Footer`, `Lightbox`, `QuoteDrawer`, `DetailDrawer`, `RouteChange`, route table (all already in `App.jsx`).
- Produces: no exported API change — `App` still default-exports the same component. Behavior: on `/admin`, none of Navbar/Footer/Lightbox/QuoteDrawer/DetailDrawer render.

- [ ] **Step 1: Write the failing test**

Create `src/test/appFrame.test.jsx`:

```jsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HelmetProvider } from 'react-helmet-async'

// AdminPage (lazy) pulls the real adminApi on mount; stub it so /admin renders
// its login without touching Supabase.
vi.mock('../lib/adminApi.js', () => ({
  watchSession: async (cb) => {
    cb(null)
    return () => {}
  },
  signIn: vi.fn(),
  signOut: vi.fn(),
  fetchAdminProducts: vi.fn(async () => []),
  saveProduct: vi.fn(),
  deleteProduct: vi.fn(),
  uploadPhotos: vi.fn(),
  deletePhoto: vi.fn(),
  swapPhotoPositions: vi.fn(),
  fetchProductImages: vi.fn(async () => []),
}))
vi.mock('../lib/analytics.js', () => ({ trackPageview: vi.fn(), initAnalytics: vi.fn() }))

const { default: App } = await import('../App.jsx')

function renderAt(path) {
  window.history.pushState({}, '', path)
  return render(
    <HelmetProvider>
      <App />
    </HelmetProvider>,
  )
}

afterEach(() => {
  window.history.pushState({}, '', '/')
})

describe('App storefront chrome', () => {
  it('renders the marketing nav on the home route', async () => {
    renderAt('/')
    expect(await screen.findByRole('navigation', { name: /main navigation/i })).toBeInTheDocument()
  })

  it('hides the marketing nav on /admin and shows the admin login', async () => {
    renderAt('/admin')
    expect(await screen.findByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: /main navigation/i })).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test src/test/appFrame.test.jsx`
Expected: the `/admin` case FAILS — the marketing nav still renders (query finds a `navigation` landmark), because `App.jsx` renders `<Navbar/>` unconditionally.

- [ ] **Step 3: Implement the guard in `App.jsx`**

Replace the `export default function App()` at the bottom of `src/App.jsx` (currently lines 82-159) with an `AppBody` that reads the location plus a thin `App` wrapper. The `<Routes>…</Routes>` block is unchanged — copy it verbatim into `AppBody`:

```jsx
function AppBody() {
  // The admin is a standalone full-screen dashboard — it owns the viewport, so
  // the marketing Navbar/Footer and the storefront-only drawers don't render there.
  const isAdmin = useLocation().pathname === '/admin'
  return (
    <>
      <RouteChange />
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      {!isAdmin && <Navbar />}
      {/* Skip-link target. Each routed page renders its own <main> landmark;
          this wrapper just gives the skip link a stable, focusable anchor. */}
      <div id="main" tabIndex={-1}>
        <ErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <Routes>{/* …unchanged: copy the exact existing <Route> list here… */}</Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
      {!isAdmin && (
        <>
          <Footer />
          <Lightbox />
          <QuoteDrawer />
          <DetailDrawer />
        </>
      )}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppBody />
    </BrowserRouter>
  )
}
```

`useLocation` is already imported on line 1 of `App.jsx` (`import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'`), so no import change is needed.

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn test src/test/appFrame.test.jsx`
Expected: PASS — both cases green.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/test/appFrame.test.jsx
git commit -m "feat(admin): hide storefront chrome on /admin route"
```

---

### Task 2: EditorTray drawer shell

**Files:**

- Create: `src/pages/admin/EditorTray.jsx`
- Modify: `src/pages/admin/ProductEditor.jsx` (remove own `<h2>`, add tray form class)
- Test: `src/test/admin.test.jsx` (add an EditorTray describe block)

**Interfaces:**

- Consumes: `ProductEditor` (default export, props `{ row, rows, onDone, onCancel }` — unchanged).
- Produces: `EditorTray` default export with props:
  - `editing`: `null | 'new' | row` (same shape `AdminPage` already holds).
  - `rows`: array of DB rows (passed through to `ProductEditor`).
  - `onDone`: `() => void` — called after a successful save.
  - `onCancel`: `() => void` — called on Cancel / Esc / backdrop / ✕.
  - Open whenever `editing !== null`. Renders `role="dialog"` `aria-modal="true"` with `aria-label` = `New product` (create) or `Edit — {title}` (edit).

- [ ] **Step 1: Write the failing test**

Add to `src/test/admin.test.jsx` (after the existing imports/mock; it reuses the module-level `adminApi` mock already in that file). Append this block near the end of the file:

```jsx
const { default: EditorTray } = await import('../pages/admin/EditorTray.jsx')

describe('EditorTray', () => {
  it('renders a labelled dialog for a new product and closes via Escape', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<EditorTray editing="new" rows={[]} onDone={() => {}} onCancel={onCancel} />)
    expect(screen.getByRole('dialog', { name: /new product/i })).toBeInTheDocument()
    // The form is hosted inside the tray.
    expect(screen.getByRole('button', { name: /save product/i })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalled()
  })

  it('labels the dialog with the product title when editing', () => {
    const row = { id: 'x', title: 'Job Site Box', category_id: 'locks', product_images: [] }
    render(<EditorTray editing={row} rows={[row]} onDone={() => {}} onCancel={() => {}} />)
    expect(screen.getByRole('dialog', { name: /edit — job site box/i })).toBeInTheDocument()
  })

  it('renders nothing when editing is null', () => {
    render(<EditorTray editing={null} rows={[]} onDone={() => {}} onCancel={() => {}} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test src/test/admin.test.jsx -t EditorTray`
Expected: FAIL — `Failed to resolve import '../pages/admin/EditorTray.jsx'`.

- [ ] **Step 3: Create `src/pages/admin/EditorTray.jsx`**

```jsx
import { useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import ProductEditor from './ProductEditor.jsx'

// Right-side slide-out that hosts the product create/edit form. Mirrors the
// storefront QuoteDrawer's dialog semantics (Esc-to-close, backdrop, body
// scroll lock, focus the close button, restore focus on exit). Prop-driven:
// open whenever `editing` is set — AdminPage owns that state.
export default function EditorTray({ editing, rows, onDone, onCancel }) {
  const open = editing !== null
  const row = editing === 'new' ? null : editing
  const isNew = !row
  const title = isNew ? 'New product' : `Edit — ${row.title}`
  const reduce = useReducedMotion()
  const closeRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const trigger = document.activeElement
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && onCancel()
    document.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      trigger?.focus?.()
    }
  }, [open, onCancel])

  const panelMotion = reduce
    ? {}
    : {
        initial: { x: '100%' },
        animate: { x: 0 },
        exit: { x: '100%' },
        transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
      }
  const fade = reduce
    ? {}
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }

  return (
    <AnimatePresence>
      {open && (
        <div className="editor-tray" role="dialog" aria-modal="true" aria-label={title}>
          <motion.button
            type="button"
            className="editor-tray__backdrop"
            aria-label="Close editor"
            onClick={onCancel}
            {...fade}
          />
          <motion.div className="editor-tray__panel" {...panelMotion}>
            <div className="editor-tray__head">
              <h2 className="editor-tray__title">{title}</h2>
              <button
                ref={closeRef}
                type="button"
                className="editor-tray__close"
                onClick={onCancel}
                aria-label="Close editor"
              >
                <X size={22} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>
            <ProductEditor
              key={row ? row.id : 'new'}
              row={row}
              rows={rows}
              onDone={onDone}
              onCancel={onCancel}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 4: Adapt `ProductEditor.jsx` to live in the tray**

The tray header now shows the title, so remove the editor's own `<h2>` and tag the form for tray-specific layout. In `src/pages/admin/ProductEditor.jsx`:

Change the form open tag (line 106) from:

```jsx
    <form className="admin-editor" onSubmit={onSubmit} noValidate>
      <h2 className="admin__title">{isNew ? 'New product' : `Edit — ${row.title}`}</h2>
```

to:

```jsx
    <form className="admin-editor editor-tray__form" onSubmit={onSubmit} noValidate>
```

(Delete the `<h2 className="admin__title">…</h2>` line entirely. Everything else in the file is unchanged — `isNew` is still used elsewhere.)

- [ ] **Step 5: Run the tests to verify they pass**

Run: `yarn test src/test/admin.test.jsx`
Expected: PASS — the new EditorTray block is green and the existing `ProductEditor` tests (which render it standalone and click "Save product") still pass; removing the `<h2>` doesn't affect them.

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/EditorTray.jsx src/pages/admin/ProductEditor.jsx src/test/admin.test.jsx
git commit -m "feat(admin): add slide-out EditorTray hosting the product editor"
```

---

### Task 3: Standalone AdminPage shell + tray host

**Files:**

- Modify: `src/pages/admin/AdminPage.jsx`
- Test: `src/test/admin.test.jsx` (add "signed in" describe block; update signed-out assertion)

**Interfaces:**

- Consumes: `EditorTray` (Task 2), `ProductList` (props `{ rows, onEdit, onNew, onChanged, loading }` — `loading` added in Task 4; passing it now is forward-compatible), `AdminLogin`, `signOut`, `fetchAdminProducts`, `watchSession`, `site.brand.logoMark`, `Link` from react-router-dom.
- Produces: no exported API change. Behavior: signed-in view renders `.admin-topbar` (mark + `Urban Toolbox — Admin` + `← Return to site` link + `Sign out`) and hosts `EditorTray`.

- [ ] **Step 1: Update the signed-out assertion + add signed-in tests**

In `src/test/admin.test.jsx`:

First make `watchSession` overridable — change the mock definition (top of file) so `watchSession` is a `vi.fn` defaulting to signed-out:

```jsx
vi.mock('../lib/adminApi.js', () => ({
  watchSession: vi.fn(async (onChange) => {
    onChange(null)
    return () => {}
  }),
  signIn: vi.fn(async () => ({ error: { message: 'Invalid login credentials' } })),
  signOut: vi.fn(),
  fetchAdminProducts: vi.fn(async () => []),
  saveProduct: vi.fn(async () => ({ error: null })),
  deleteProduct: vi.fn(),
  uploadPhotos: vi.fn(),
  deletePhoto: vi.fn(),
  swapPhotoPositions: vi.fn(),
  fetchProductImages: vi.fn(async () => []),
}))
```

Import the mocked `watchSession` alongside the existing `saveProduct` import (there is already a `const { saveProduct } = await import('../lib/adminApi.js')` line — add `watchSession` to that destructure, or add a new import line):

```jsx
const { saveProduct, watchSession } = await import('../lib/adminApi.js')
```

Update the existing signed-out assertion (currently `expect(screen.queryByText(/catalogue admin/i)).toBeNull()`) to check the new dashboard chrome is absent when signed out:

```jsx
expect(screen.queryByRole('link', { name: /return to site/i })).toBeNull()
```

Add `waitFor` to the testing-library import:

```jsx
import { render, screen, waitFor } from '@testing-library/react'
```

Then append a signed-in describe block (place it after the signed-out block, before the `ProductList` block):

```jsx
describe('AdminPage — signed in', () => {
  function renderSignedIn() {
    watchSession.mockImplementationOnce(async (onChange) => {
      onChange({ user: { id: 'u1' } })
      return () => {}
    })
    return renderAdmin()
  }

  it('shows the standalone top bar with a Return to site link and Sign out', async () => {
    renderSignedIn()
    expect(await screen.findByRole('link', { name: /return to site/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })

  it('opens the editor tray on New product and closes it on Escape', async () => {
    const user = userEvent.setup()
    renderSignedIn()
    const newBtn = await screen.findByRole('button', { name: /new product/i })
    await user.click(newBtn)
    expect(await screen.findByRole('dialog', { name: /new product/i })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /new product/i })).toBeNull())
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn test src/test/admin.test.jsx -t "signed in"`
Expected: FAIL — no `Return to site` link exists yet; `AdminPage` still renders the old `.admin__head` with only a title + Sign out and swaps in an inline editor (no `dialog`).

- [ ] **Step 3: Rewrite `AdminPage.jsx`**

Replace the whole file `src/pages/admin/AdminPage.jsx` with:

```jsx
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import SEO from '../../lib/seo.jsx'
import { site } from '../../config/site.config.js'
import AdminLogin from './AdminLogin.jsx'
import ProductList from './ProductList.jsx'
import EditorTray from './EditorTray.jsx'
import { watchSession, signOut, fetchAdminProducts } from '../../lib/adminApi.js'
import './Admin.css'

// The whole admin lives on this one lazy route: auth gate -> product list, with
// create/edit in a slide-out tray. Data is raw DB rows (snake_case) — the
// storefront's normalized shape never leaks in here.
export default function AdminPage() {
  const [session, setSession] = useState(null)
  const [checked, setChecked] = useState(false)
  const [rows, setRows] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | row

  useEffect(() => {
    let cleanup = () => {}
    watchSession((s) => {
      setSession(s)
      setChecked(true)
    }).then((unsub) => {
      cleanup = unsub
    })
    return () => cleanup()
  }, [])

  const refresh = useCallback(async () => {
    try {
      setRows(await fetchAdminProducts())
      setLoadError('')
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (session) refresh()
  }, [session, refresh])

  return (
    <main className="admin">
      <SEO title="Admin" description="Catalogue admin" path="/admin" noindex />
      {!checked ? null : !session ? (
        <AdminLogin />
      ) : (
        <>
          <header className="admin-topbar">
            <div className="admin-topbar__brand">
              <img
                className="admin-topbar__mark"
                src={site.brand.logoMark}
                alt=""
                width="28"
                height="28"
              />
              <span className="admin-topbar__name">Urban Toolbox — Admin</span>
            </div>
            <div className="admin-topbar__actions">
              <Link className="admin-topbar__link" to="/">
                ← Return to site
              </Link>
              <button type="button" className="admin__ghost" onClick={signOut}>
                Sign out
              </button>
            </div>
          </header>

          <div className="admin__body">
            {loadError && (
              <p className="admin__error" role="alert">
                {loadError}
              </p>
            )}
            <ProductList
              rows={rows}
              loading={!loaded}
              onEdit={setEditing}
              onNew={() => setEditing('new')}
              onChanged={refresh}
            />
          </div>

          <EditorTray
            editing={editing}
            rows={rows}
            onDone={() => {
              setEditing(null)
              refresh()
            }}
            onCancel={() => setEditing(null)}
          />
        </>
      )}
    </main>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `yarn test src/test/admin.test.jsx`
Expected: PASS — signed-in top bar + tray tests green, signed-out test green.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/AdminPage.jsx src/test/admin.test.jsx
git commit -m "feat(admin): standalone top bar with Return-to-site link and tray host"
```

---

### Task 4: ProductList warm refresh — badges + loading/empty states

**Files:**

- Modify: `src/pages/admin/ProductList.jsx`
- Test: `src/test/admin.test.jsx` (update the existing `ProductList` block)

**Interfaces:**

- Consumes: `getTree`, `getLeaves`, `publicPhotoUrl`, `formatPrice`, `deleteProduct` (all already imported).
- Produces: `ProductList` default export, props `{ rows, loading, onEdit, onNew, onChanged }`. `loading` is optional (defaults falsy). Renders a `Status` column with `.admin-badge` pills (`★ Featured`, `{n}% off`), a skeleton while `loading`, and a friendly empty state with an `Add your first product` CTA when `rows` is empty.

- [ ] **Step 1: Update the ProductList tests**

In `src/test/admin.test.jsx`, replace the first `ProductList` test's discount assertion and add a badge/empty assertion. Change the existing test body:

```jsx
it('renders a row per product with price and status badges', () => {
  render(
    <MemoryRouter>
      <ProductList rows={listRows} onEdit={() => {}} onNew={() => {}} onChanged={() => {}} />
    </MemoryRouter>,
  )
  expect(screen.getByText('Whale Tail Lock')).toBeInTheDocument()
  expect(screen.getByText('$450')).toBeInTheDocument()
  expect(screen.getByText(/15% off/i)).toBeInTheDocument()
  expect(screen.getByText(/featured/i)).toBeInTheDocument()
})
```

Add two more tests inside the same `describe('ProductList', …)`:

```jsx
it('shows a skeleton while loading', () => {
  const { container } = render(
    <MemoryRouter>
      <ProductList rows={[]} loading onEdit={() => {}} onNew={() => {}} onChanged={() => {}} />
    </MemoryRouter>,
  )
  expect(container.querySelector('.admin-skel')).not.toBeNull()
})

it('shows a friendly empty state with a create CTA when there are no products', () => {
  render(
    <MemoryRouter>
      <ProductList rows={[]} onEdit={() => {}} onNew={() => {}} onChanged={() => {}} />
    </MemoryRouter>,
  )
  expect(screen.getByRole('button', { name: /add your first product/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn test src/test/admin.test.jsx -t ProductList`
Expected: FAIL — `/15% off/i` isn't in the DOM (current markup renders `15%` in a Discount column), and there's no `.admin-skel` or `Add your first product` CTA.

- [ ] **Step 3: Rewrite `ProductList.jsx`**

Replace the whole file `src/pages/admin/ProductList.jsx` with:

```jsx
import { useMemo, useState } from 'react'
import { Pencil, Plus, Star } from 'lucide-react'
import { getTree, getLeaves } from '../../lib/catalog.js'
import { publicPhotoUrl } from '../../lib/supabaseClient.js'
import { formatPrice } from '../../lib/pricing.js'
import { deleteProduct } from '../../lib/adminApi.js'

// Full-width, filterable table of every product. Delete is two-step (Delete ->
// Confirm) instead of window.confirm so nothing blocks the tab.
export default function ProductList({ rows, loading, onEdit, onNew, onChanged }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [confirmId, setConfirmId] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  const leaves = useMemo(() => getTree().flatMap((t) => getLeaves(t)), [])
  const leafLabel = useMemo(() => new Map(leaves.map((l) => [l.id, l.label])), [leaves])

  const visible = rows.filter(
    (r) =>
      (!cat || r.category_id === cat) && (!q || r.title.toLowerCase().includes(q.toLowerCase())),
  )

  async function onDelete(row) {
    setBusyId(row.id)
    setError('')
    try {
      await deleteProduct(row)
      onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
      setConfirmId(null)
    }
  }

  function thumb(row) {
    const first = [...(row.product_images ?? [])].sort((a, b) => a.position - b.position)[0]
    return first ? publicPhotoUrl(first.storage_path) : null
  }

  return (
    <div>
      <div className="admin-toolbar">
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

      {error && (
        <p className="admin__error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <div className="admin-card">
          <ul className="admin-skel" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="admin-skel__row" />
            ))}
          </ul>
        </div>
      ) : rows.length === 0 ? (
        <div className="admin-empty">
          <p className="admin-empty__title">No products yet</p>
          <p className="admin-empty__sub">Add your first catalogue product to get started.</p>
          <button type="button" className="admin__primary" style={{ marginTop: 0 }} onClick={onNew}>
            <Plus size={15} strokeWidth={2.5} aria-hidden="true" /> Add your first product
          </button>
        </div>
      ) : visible.length === 0 ? (
        <p className="admin__empty">No products match your search.</p>
      ) : (
        <div className="admin-card">
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
                <tr key={row.id}>
                  <td>
                    {thumb(row) ? (
                      <img className="admin-table__thumb" src={thumb(row)} alt="" />
                    ) : (
                      <span className="admin-table__thumb" aria-hidden="true" />
                    )}
                  </td>
                  <td className="admin-table__title">{row.title}</td>
                  <td className="admin-table__hide-sm">
                    {leafLabel.get(row.category_id) ?? row.category_id}
                  </td>
                  <td>{row.price == null ? '—' : formatPrice(Number(row.price))}</td>
                  <td>
                    <div className="admin-badges">
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
                    <div className="admin-photos__buttons">
                      <button type="button" className="admin__ghost" onClick={() => onEdit(row)}>
                        <Pencil size={13} strokeWidth={2} aria-hidden="true" /> Edit
                      </button>
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
                        <button
                          type="button"
                          className="admin__danger"
                          onClick={() => setConfirmId(row.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `yarn test src/test/admin.test.jsx`
Expected: PASS — the badge/skeleton/empty tests are green; the `filters by title search` test still passes (search input + filtering unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/ProductList.jsx src/test/admin.test.jsx
git commit -m "feat(admin): full-width product list with status badges and empty/loading states"
```

---

### Task 5: Visibility data layer — `hidden` column, storefront filter, `setProductHidden`

**Files:**

- Create: `supabase/migrations/0002_product_hidden.sql`
- Modify: `src/lib/productStore.js` (filter hidden from the public fetch)
- Modify: `src/lib/adminApi.js` (add `setProductHidden`)
- Test: `src/test/adminApi.test.js` (cover `setProductHidden`)

**Interfaces:**

- Consumes: existing `client()` helper and `retryLoad` in `adminApi.js`; the Supabase query builder in `productStore.loadProducts`.
- Produces: `setProductHidden(id: string, hidden: boolean): Promise<void>` — throws on error, calls `retryLoad()` on success. New DB column `products.hidden boolean not null default false`. The storefront no longer returns hidden products.

**Note on RLS:** `0001_catalog.sql` uses `public read products … using (true)` and states category/visibility rules are "enforced app-side." Keep that convention: the anon policy is unchanged and the storefront filters `hidden` in the query (Step 2). `fetchAdminProducts` uses `select('*')`, so the authenticated admin still sees hidden rows.

- [ ] **Step 1: Create the migration**

Create `supabase/migrations/0002_product_hidden.sql`:

```sql
-- Visibility flag: lets an admin hide a product from the public storefront
-- without deleting it. Existing rows default to visible. Enforced app-side
-- (storefront query filters hidden; admin still reads all rows), matching the
-- category-in-code convention from 0001.
alter table public.products
  add column hidden boolean not null default false;
```

Apply it to the linked Supabase project (via the Supabase MCP `apply_migration` with name `product_hidden`, or `supabase db push` / the SQL editor if working manually). Confirm the column exists before wiring the app.

- [ ] **Step 2: Filter hidden products from the storefront fetch**

In `src/lib/productStore.js`, the public fetch is in `loadProducts` (the `.from('products').select(...)` chain). Add a `.eq('hidden', false)` filter:

```jsx
const { data, error } = await supabase
  .from('products')
  .select('*, product_images(*)')
  .eq('hidden', false)
  .order('sort_order', { ascending: true })
  .order('id', { ascending: true })
```

(No change to `normalizeRow` — the storefront never needs the flag once hidden rows are excluded.)

- [ ] **Step 3: Write the failing `setProductHidden` test**

In `src/test/adminApi.test.js`, add `setProductHidden` to the import on line 55:

```jsx
const { saveProduct, deletePhoto, deleteProduct, setProductHidden } =
  await import('../lib/adminApi.js')
```

Add a describe block:

```jsx
describe('setProductHidden', () => {
  it('updates only the hidden flag for the given id', async () => {
    await setProductHidden('x', true)
    expect(calls.updates[0]).toMatchObject({
      table: 'products',
      patch: { hidden: true },
      col: 'id',
      val: 'x',
    })
  })
})
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `yarn test src/test/adminApi.test.js -t setProductHidden`
Expected: FAIL — `setProductHidden` is not exported from `adminApi.js`.

- [ ] **Step 5: Add `setProductHidden` to `adminApi.js`**

In `src/lib/adminApi.js`, add after `saveProduct` (after line 98):

```jsx
// Toggle a product's storefront visibility without touching any other field.
export async function setProductHidden(id, hidden) {
  const c = await client()
  const { error } = await c.from('products').update({ hidden }).eq('id', id)
  if (error) throw new Error(error.message)
  retryLoad()
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `yarn test src/test/adminApi.test.js`
Expected: PASS — `setProductHidden` covered, existing adminApi tests still green.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/0002_product_hidden.sql src/lib/productStore.js src/lib/adminApi.js src/test/adminApi.test.js
git commit -m "feat(admin): add product visibility (hidden) column, storefront filter, and setProductHidden"
```

---

### Task 6: Stats bar + inline show/hide toggle in ProductList

**Files:**

- Modify: `src/pages/admin/ProductList.jsx` (built in Task 4)
- Test: `src/test/admin.test.jsx` (add `setProductHidden` to the mock; stats + toggle tests)

**Interfaces:**

- Consumes: `setProductHidden` (Task 5), `Eye`/`EyeOff` from `lucide-react`, the `rows` prop (each row may carry `hidden: boolean`).
- Produces: no new external props — the toggle is handled internally (like delete). Renders a `.admin-stats` bar (Total / Visible / Hidden) and a per-row eye button; hidden rows get `.admin-table__row--hidden` + a `Hidden` badge.

- [ ] **Step 1: Add stats + toggle tests**

In `src/test/admin.test.jsx`, add `setProductHidden` to the mock object (in the `vi.mock('../lib/adminApi.js', …)` block):

```jsx
  setProductHidden: vi.fn(async () => {}),
```

Give the fixtures a `hidden` flag — update `listRows` so one row is hidden:

```jsx
const listRows = [
  {
    id: 'a',
    category_id: 'locks',
    title: 'Whale Tail Lock',
    price: 45,
    discount_pct: null,
    featured: false,
    hidden: true,
    product_images: [],
  },
  {
    id: 'b',
    category_id: 'job-site-toolbox',
    title: 'Job Site Box',
    price: 450,
    discount_pct: 15,
    featured: true,
    hidden: false,
    product_images: [{ storage_path: 'products/b/x.jpg', alt: '', position: 0 }],
  },
]
```

Add tests inside `describe('ProductList', …)`:

```jsx
it('shows total / visible / hidden stats', () => {
  render(
    <MemoryRouter>
      <ProductList rows={listRows} onEdit={() => {}} onNew={() => {}} onChanged={() => {}} />
    </MemoryRouter>,
  )
  const total = screen.getByTestId('stat-total')
  const visible = screen.getByTestId('stat-visible')
  const hidden = screen.getByTestId('stat-hidden')
  expect(total).toHaveTextContent('2')
  expect(visible).toHaveTextContent('1')
  expect(hidden).toHaveTextContent('1')
})

it('toggles visibility from the row eye button', async () => {
  const user = userEvent.setup()
  const onChanged = vi.fn()
  render(
    <MemoryRouter>
      <ProductList rows={listRows} onEdit={() => {}} onNew={() => {}} onChanged={onChanged} />
    </MemoryRouter>,
  )
  // The hidden row (Whale Tail Lock) offers a "Show" action; the visible row offers "Hide".
  await user.click(screen.getByRole('button', { name: /show whale tail lock/i }))
  expect(setProductHidden).toHaveBeenCalledWith('a', false)
  await waitFor(() => expect(onChanged).toHaveBeenCalled())
})
```

Import `setProductHidden` into the test module alongside the other mocked fns:

```jsx
const { saveProduct, watchSession, setProductHidden } = await import('../lib/adminApi.js')
```

(`waitFor` is already imported after Task 3.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn test src/test/admin.test.jsx -t ProductList`
Expected: FAIL — no `stat-*` testids, no `Show/Hide` buttons.

- [ ] **Step 3: Add the stats bar + eye toggle to `ProductList.jsx`**

Edit `src/pages/admin/ProductList.jsx` (the Task 4 version).

3a. Update the icon import to add `Eye` and `EyeOff`:

```jsx
import { Eye, EyeOff, Pencil, Plus, Star } from 'lucide-react'
```

3b. Add `setProductHidden` to the adminApi import:

```jsx
import { deleteProduct, setProductHidden } from '../../lib/adminApi.js'
```

3c. Add toggle state next to the existing `busyId` state:

```jsx
const [togglingId, setTogglingId] = useState(null)
```

3d. Add the toggle handler next to `onDelete`:

```jsx
async function onToggleHidden(row) {
  setTogglingId(row.id)
  setError('')
  try {
    await setProductHidden(row.id, !row.hidden)
    onChanged()
  } catch (err) {
    setError(err.message)
  } finally {
    setTogglingId(null)
  }
}
```

3e. Compute stats just before the `return` (after `visible`):

```jsx
const total = rows.length
const hiddenCount = rows.filter((r) => r.hidden).length
const visibleCount = total - hiddenCount
```

3f. Render the stats bar as the first child inside the top-level `<div>` (above `.admin-toolbar`):

```jsx
<div className="admin-stats">
  <div className="admin-stat">
    <span className="admin-stat__num" data-testid="stat-total">
      {total}
    </span>
    <span className="admin-stat__label">Total</span>
  </div>
  <div className="admin-stat">
    <span className="admin-stat__num" data-testid="stat-visible">
      {visibleCount}
    </span>
    <span className="admin-stat__label">Visible</span>
  </div>
  <div className="admin-stat">
    <span className="admin-stat__num" data-testid="stat-hidden">
      {hiddenCount}
    </span>
    <span className="admin-stat__label">Hidden</span>
  </div>
</div>
```

3g. Mark hidden rows and add a `Hidden` badge. Change the row `<tr>` open tag to carry the state class:

```jsx
                <tr key={row.id} className={row.hidden ? 'admin-table__row--hidden' : undefined}>
```

In the Status cell's `.admin-badges`, add a hidden badge alongside Featured / % off:

```jsx
{
  row.hidden && <span className="admin-badge admin-badge--hidden">Hidden</span>
}
```

3h. Add the eye toggle as the first control in the actions `.admin-photos__buttons`, before the Edit button:

```jsx
<button
  type="button"
  className="admin__ghost"
  disabled={togglingId === row.id}
  aria-pressed={!row.hidden}
  aria-label={row.hidden ? `Show ${row.title}` : `Hide ${row.title}`}
  onClick={() => onToggleHidden(row)}
>
  {row.hidden ? (
    <EyeOff size={14} strokeWidth={2} aria-hidden="true" />
  ) : (
    <Eye size={14} strokeWidth={2} aria-hidden="true" />
  )}
</button>
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `yarn test src/test/admin.test.jsx`
Expected: PASS — stats + toggle tests green; earlier ProductList tests (badges/skeleton/empty/search) still pass. Note the first badge test now also has a hidden row, but its assertions (`$450`, `15% off`, `Featured`) target the visible row and are unaffected.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/ProductList.jsx src/test/admin.test.jsx
git commit -m "feat(admin): product stats bar and inline show/hide toggle"
```

---

### Task 7: Warm visual refresh in Admin.css + login card

**Files:**

- Modify: `src/pages/admin/Admin.css`
- Modify: `src/pages/admin/AdminLogin.jsx` (no structural change required; verify class hooks)

**Interfaces:**

- Consumes: class names introduced in Tasks 2-4 (`.admin-topbar*`, `.admin__body`, `.admin-card`, `.admin-badge*`, `.admin-badges`, `.admin-empty*`, `.admin-skel*`, `.editor-tray*`, `.editor-tray__form`) plus existing (`.admin`, `.admin__ghost`, `.admin-login`, `.admin-table`, `.admin-editor`).
- Produces: no JS interface — purely visual. This task has no unit test; it is verified by the full suite still passing plus the browser drive-through in the Verification task.

- [ ] **Step 1: Confirm `AdminLogin.jsx` markup hooks**

Open `src/pages/admin/AdminLogin.jsx`. It already wraps in `<div className="admin-login"><form className="admin-login__form">`. No change needed — the centered-card styling attaches to those existing classes. (If the `.admin-login__form` class is missing on the `<form>`, add it.)

- [ ] **Step 2: Replace `src/pages/admin/Admin.css`**

Write the full stylesheet. Every value is an existing token — no raw hex/rem beyond spacing/size primitives already used in the file:

```css
/* Admin dashboard — full-screen standalone tool. Friendlier than the storefront:
   soft card surfaces + subtle shadows, tokens only. Single-admin catalogue tool. */

.admin {
  min-height: 100vh;
  background: var(--color-off-white);
  color: var(--color-ink);
}

/* Top bar */
.admin-topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px clamp(20px, 4vw, 48px);
  background: var(--color-white);
  border-bottom: 1px solid var(--color-border-light);
  box-shadow: var(--shadow-sm);
}
.admin-topbar__brand {
  display: flex;
  align-items: center;
  gap: 10px;
}
.admin-topbar__mark {
  width: 28px;
  height: 28px;
  object-fit: contain;
}
.admin-topbar__name {
  font-family: var(--font-display);
  font-size: 18px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: var(--color-ink-strong);
}
.admin-topbar__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.admin-topbar__link {
  font-weight: 600;
  font-size: 14px;
  color: var(--color-ink-muted);
  text-decoration: none;
  padding: 7px 10px;
  border-radius: var(--radius-sm);
  transition: color var(--transition-fast);
}
.admin-topbar__link:hover {
  color: var(--color-accent);
}

/* Body */
.admin__body {
  padding: clamp(20px, 4vw, 40px) clamp(20px, 4vw, 48px) 80px;
}

/* Shared controls */
.admin__label {
  display: block;
  font-weight: 600;
  font-size: 14px;
  margin: 14px 0 4px;
  color: var(--color-ink);
}
.admin__input,
.admin__select,
.admin__textarea {
  width: 100%;
  padding: 11px 13px;
  font: inherit;
  color: var(--color-ink);
  background: var(--color-white);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
}
.admin__input:focus-visible,
.admin__select:focus-visible,
.admin__textarea:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
}
.admin__primary {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: var(--font-body);
  font-weight: 600;
  padding: 11px 22px;
  margin-top: 18px;
  color: var(--color-white);
  background: var(--color-ink-strong);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.admin__primary:hover {
  background: var(--color-accent-hover);
}
.admin__primary:disabled {
  opacity: 0.6;
  cursor: default;
}
.admin__ghost,
.admin__danger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font: inherit;
  font-weight: 600;
  font-size: 14px;
  padding: 8px 14px;
  background: var(--color-white);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: border-color var(--transition-fast);
}
.admin__ghost:hover {
  border-color: var(--color-accent);
}
.admin__danger {
  color: var(--color-danger);
}
.admin__danger:hover {
  border-color: var(--color-danger);
}
.admin__error {
  color: var(--color-danger);
  font-size: 14px;
  margin-top: 12px;
}
.admin__empty {
  color: var(--color-ink-muted);
  padding: 24px 0;
}

/* Login — centered card on the standalone background */
.admin-login {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
}
.admin-login__form {
  width: 100%;
  max-width: 380px;
  padding: 32px;
  background: var(--color-white);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}
.admin-login__form .admin__title {
  font-family: var(--font-display);
  font-size: 26px;
  text-transform: uppercase;
  color: var(--color-ink-strong);
  margin-bottom: 8px;
}
.admin-login__form .admin__primary {
  width: 100%;
  justify-content: center;
}

/* Stats bar */
.admin-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}
.admin-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 120px;
  padding: 14px 18px;
  background: var(--color-white);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}
.admin-stat__num {
  font-family: var(--font-display);
  font-size: 28px;
  line-height: 1;
  color: var(--color-ink-strong);
}
.admin-stat__label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-ink-muted);
}

/* Toolbar */
.admin-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 18px;
}
.admin-toolbar .admin__input,
.admin-toolbar .admin__select {
  width: auto;
  min-width: 220px;
}
.admin-toolbar__spacer {
  flex: 1;
}

/* Card surface wrapping the table / skeleton */
.admin-card {
  background: var(--color-white);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

/* List table */
.admin-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 15px;
}
.admin-table th {
  text-align: left;
  padding: 14px 16px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-ink-muted);
  background: var(--color-off-white);
  border-bottom: 1px solid var(--color-border-light);
}
.admin-table td {
  text-align: left;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border-light);
  vertical-align: middle;
}
.admin-table tr:last-child td {
  border-bottom: none;
}
.admin-table tbody tr {
  transition: background var(--transition-fast);
}
.admin-table tbody tr:hover {
  background: var(--color-off-white);
}
.admin-table__title {
  font-weight: 600;
  color: var(--color-ink-strong);
}
.admin-table__thumb {
  width: 64px;
  height: 48px;
  object-fit: cover;
  background: var(--color-off-white);
  border-radius: var(--radius-sm);
  display: block;
}

/* Status badges */
.admin-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.admin-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: var(--radius-full);
}
.admin-badge--featured {
  background: var(--color-accent-soft);
  color: var(--color-accent-hover);
}
.admin-badge--off {
  background: rgba(var(--color-accent-rgb), 0.12);
  color: var(--color-danger);
}
.admin-badge--hidden {
  background: var(--color-border-light);
  color: var(--color-ink-muted);
}

/* Hidden rows read as muted but stay fully interactive (dim text + thumb only,
   not the action buttons — opacity on the whole <tr> would composite the
   buttons too). */
.admin-table__row--hidden {
  background: var(--color-off-white);
}
.admin-table__row--hidden td,
.admin-table__row--hidden .admin-table__title {
  color: var(--color-ink-muted);
}
.admin-table__row--hidden .admin-table__thumb {
  opacity: 0.5;
}

/* Empty state */
.admin-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
  padding: 64px 24px;
  background: var(--color-white);
  border: 1px dashed var(--color-border-light);
  border-radius: var(--radius-md);
}
.admin-empty__title {
  font-family: var(--font-display);
  font-size: 20px;
  text-transform: uppercase;
  color: var(--color-ink-strong);
}
.admin-empty__sub {
  color: var(--color-ink-muted);
}

/* Loading skeleton */
.admin-skel {
  list-style: none;
  margin: 0;
  padding: 8px;
}
.admin-skel__row {
  height: 52px;
  margin: 8px;
  border-radius: var(--radius-sm);
  background: linear-gradient(
    90deg,
    var(--color-off-white) 25%,
    var(--color-border-light) 37%,
    var(--color-off-white) 63%
  );
  background-size: 400% 100%;
  animation: admin-shimmer 1.4s ease infinite;
}
@keyframes admin-shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: 0 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .admin-skel__row {
    animation: none;
  }
}

/* Editor tray — right-side slide-out (mirrors QuoteDrawer) */
.editor-tray {
  position: fixed;
  inset: 0;
  z-index: 1500;
  display: flex;
  justify-content: flex-end;
}
.editor-tray__backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  padding: 0;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.45);
}
.editor-tray__panel {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(640px, 100vw);
  height: 100%;
  background: var(--color-white);
  box-shadow: var(--shadow-lg);
}
.editor-tray__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid var(--color-border-light);
}
.editor-tray__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 20px;
  text-transform: uppercase;
  color: var(--color-ink-strong);
}
.editor-tray__close {
  display: inline-flex;
  padding: 6px;
  color: var(--color-ink);
  background: none;
  border: 0;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.editor-tray__close:hover {
  color: var(--color-accent);
}

/* Editor form inside the tray — scrolls, with a sticky action bar */
.editor-tray__form {
  flex: 1;
  overflow-y: auto;
  max-width: none;
  padding: 20px 24px 0;
}

/* Editor */
.admin-editor__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.admin-editor__spec {
  display: grid;
  grid-template-columns: 1fr 2fr auto;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}
.editor-tray__form .admin-editor__actions {
  position: sticky;
  bottom: 0;
  display: flex;
  gap: 12px;
  margin: 24px -24px 0;
  padding: 16px 24px;
  background: var(--color-white);
  border-top: 1px solid var(--color-border-light);
}
.admin-editor__check {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  font-weight: 600;
  font-size: 14px;
}
.admin-editor__check input {
  width: 16px;
  height: 16px;
  accent-color: var(--color-accent);
}

/* Photo manager */
.admin-photos {
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid var(--color-border-light);
}
.admin-photos__list {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 10px;
}
.admin-photos__item {
  display: flex;
  align-items: center;
  gap: 12px;
}
.admin-photos__img {
  width: 88px;
  height: 64px;
  object-fit: cover;
  background: var(--color-off-white);
  border-radius: var(--radius-sm);
}
.admin-photos__badge {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: var(--color-accent-soft);
  color: var(--color-accent-hover);
}
.admin-photos__buttons {
  display: flex;
  gap: 6px;
  margin-left: auto;
}
.admin-photos__hint {
  color: var(--color-ink-muted);
  font-size: 14px;
  margin-top: 20px;
}

@media (max-width: 700px) {
  .admin-editor__row {
    grid-template-columns: 1fr;
  }
  .admin-table__hide-sm {
    display: none;
  }
  .admin-topbar__name {
    font-size: 15px;
  }
}
```

- [ ] **Step 3: Run the full test suite**

Run: `yarn test`
Expected: PASS — all suites green (CSS is not imported in unit tests via `css: false`, so this step confirms nothing regressed).

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/Admin.css src/pages/admin/AdminLogin.jsx
git commit -m "style(admin): full-screen warm refresh — top bar, card table, tray, badges, login card"
```

---

### Task 8: Verification & polish

**Files:** none (verification only; fix-forward commits if issues surface).

- [ ] **Step 1: Lint + format**

Run: `yarn lint && yarn format:check`
Expected: both pass clean. If Prettier flags formatting, run `yarn format` and re-commit.

- [ ] **Step 2: Full test suite with coverage of the new behavior**

Run: `yarn test`
Expected: PASS — includes `appFrame.test.jsx`, the EditorTray + signed-in AdminPage tests, and the ProductList badge/skeleton/empty tests, plus axe assertions.

- [ ] **Step 3: Production build**

Run: `yarn build`
Expected: succeeds; vendor chunks (react, motion) split as before.

- [ ] **Step 4: Browser drive-through**

Run `yarn preview` (or `yarn dev`) and, using the browser (Claude-in-Chrome or Playwright skill), verify on `/admin`:

- No marketing Navbar/Footer; the admin top bar shows the mark, `Urban Toolbox — Admin`, `← Return to site`, and `Sign out`.
- Login card is centered on the page.
- After sign-in: full-width product table with thumbnails, `Featured` / `% off` badges, hover rows.
- Stats bar shows Total / Visible / Hidden counts and updates after a toggle.
- Click a row's eye button → it flips hidden ⇄ visible; hidden rows show muted with a `Hidden` badge; the stats update.
- Confirm a hidden product no longer appears on the public storefront (open a category page after `← Return to site`), and reappears when shown again.
- Click `New product` → tray slides in from the right; `Esc`, backdrop click, and `✕` all close it; focus returns to the triggering button.
- Click `Edit` on a row → tray opens titled `Edit — {title}`, photo manager present for saved products, sticky Save/Cancel bar at the bottom.
- Save persists and closes the tray; the list refreshes.
- `← Return to site` navigates to `/` (marketing shell reappears).
- Resize at 375 / 768 / 1280px: tray is full-width on mobile, toolbar wraps, top bar holds, category column hides under 700px.

- [ ] **Step 5: Final commit (if any polish fixes were needed)**

```bash
git add -A
git commit -m "chore(admin): verification polish for full-screen edit-tray redesign"
```

---

## Self-Review

**Spec coverage:**

- Full-screen standalone dashboard → Task 1 (hide chrome) + Task 3 (top bar, full-bleed) ✓
- Return-to-site button → Task 3 ✓
- Edit tray instead of new page → Task 2 (EditorTray) + Task 3 (host) ✓
- Tray ~640px, prop-driven, Esc/backdrop/✕, focus trap → Task 2 + Task 5 CSS ✓
- Full-width table + thumbnails + badges → Task 4 + Task 7 ✓
- Warm refresh (soft surfaces, badges, empty/loading, login card) → Task 4 + Task 7 ✓
- Stats bar (total / visible / hidden) → Task 6 (UI) + Task 7 (CSS) ✓
- Show/hide toggle → Task 5 (data: column, storefront filter, `setProductHidden`) + Task 6 (inline eye toggle) ✓
- Hidden items pulled from the live storefront → Task 5 (`.eq('hidden', false)` in `loadProducts`) ✓
- Photo-manager-for-saved-products & two-step delete preserved → unchanged in ProductEditor/ProductList ✓
- No new tokens, no Tailwind, no TS → Global Constraints, all CSS uses existing vars ✓
- Tests (axe incl.) + lint + build → Tasks 1-8 ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code.

**Type/name consistency:** `EditorTray` props `{ editing, rows, onDone, onCancel }` are produced in Task 2 and consumed identically in Task 3. `ProductList` prop `loading` is introduced in Task 4's interface and passed by Task 3 (forward-compatible: optional, defaults falsy); the stats bar and toggle in Task 6 add no new external props. `setProductHidden(id, hidden)` is exported in Task 5 and consumed by Task 6's ProductList and its tests. Class names in Task 7 CSS match those emitted in Tasks 2-6 (`.admin-topbar`, `.admin__body`, `.admin-card`, `.admin-badge--featured/--off/--hidden`, `.admin-empty`, `.admin-skel__row`, `.editor-tray__panel/__form`, `.admin-stats`, `.admin-stat__num`, `.admin-table__row--hidden`). `watchSession` mock upgraded to `vi.fn` in Task 3, and `setProductHidden` added to the mock in Task 6, are consumed by the tests in those tasks. Migration `0002` adds `products.hidden`; `loadProducts` (Task 5) and `fetchAdminProducts` (unchanged, `select('*')`) both align with it.
