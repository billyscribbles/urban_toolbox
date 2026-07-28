# Promotional Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An optional promo strip above the navbar that crossfades through admin-editable messages, styled in the brand accent green, switchable on/off from `/admin`, and dismissable by the visitor.

**Architecture:** Copy and on/off state live as two new columns on the existing `store_settings` singleton row in Supabase. A small `promoStore` module (same shape as the existing `productStore`) fetches them once per session and caches to `localStorage` to avoid a layout shift. `PromoBanner` renders in normal flow above the `position: sticky` navbar, so it scrolls away with no changes to `Navbar.css`. The admin side mirrors the existing store-wide-discount flow exactly: a stat card, a modal, and a form.

**Tech Stack:** React 18, Vite 5, plain CSS + CSS custom properties, Supabase JS v2, lucide-react, Vitest + Testing Library + jest-axe.

**Spec:** `docs/superpowers/specs/2026-07-28-promo-banner-design.md`

## Global Constraints

- **No framer-motion in `PromoBanner` or `promoStore`.** The storefront's critical path deliberately excludes it (see `DeferredQuoteDrawer` in `src/App.jsx`). Use CSS keyframes/transitions. Framer-motion IS allowed in `src/pages/admin/**` — that route is lazy-loaded.
- **No raw hex colours in CSS.** Use `var(--color-*)`. Raw `px` sizing is the house style and is fine (see `Navbar.css`).
- **No Tailwind, no TypeScript, no new design tokens.** JSX + plain CSS only.
- **No client strings hardcoded in components.** The sample message lives in the DB migration, not in JSX.
- Available CSS custom properties: `--color-*`, `--font-*`, `--radius-*`, `--shadow-*`, `--transition-*` (flattened from `src/config/theme.config.js` by `src/lib/applyTheme.js`).
- Limits, used identically in `promoStore` and the admin form: **max 6 messages**, **max 120 characters** per message.
- localStorage keys: `urbantoolboxes:promo-cache` and `urbantoolboxes:promo-dismissed`.
- Rotation interval: **5000ms**.
- Every `localStorage` access must be wrapped in `try/catch` (private browsing throws `SecurityError`).
- Run `yarn lint && yarn format:check` before each commit. Prettier config: no semicolons, single quotes, 100 char width — matching existing files.
- **Do not `git push`.** Commit locally only, on `main`.
- **The working tree has unrelated in-flight work, including staged deletions**
  (`HeroPanel.jsx`, `SplitHero.jsx`, `SplitHero.css`) and modified
  `Home.jsx` / `index.html` / `hero.js` / `story.js` / `StoryBlock.css` /
  `content.test.js`. None of it is yours. **Never** run `git add -A`,
  `git add .`, `git commit -a`, `git stash`, `git checkout --`, or
  `git restore` on anything you did not create.
  Every commit MUST use `--only` so other staged changes cannot ride along:

  ```bash
  git add <exact paths>
  git commit --only <exact paths> -m "<message>"
  ```

  Verify with `git show --stat HEAD` that the commit contains only your files.

---

### Task 1: Migration + `promoStore`

**Files:**

- Create: `supabase/migrations/0005_promo_banner.sql`
- Create: `src/lib/promoStore.js`
- Test: `src/test/promoStore.test.js`

**Interfaces:**

- Consumes: `getSupabase()` from `src/lib/supabaseClient.js` (returns `Promise<client|null>`; null when env is unset).
- Produces:
  - `normalizeMessages(raw): string[]`
  - `signatureOf(messages: string[]): string`
  - `loadPromo(): Promise<void>`
  - `dismissPromo(): void`
  - `usePromo(): { enabled: boolean, messages: string[], dismissed: string|null }`
  - `__setStateForTests(partial): void`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0005_promo_banner.sql`:

```sql
-- 0005: optional promotional banner shown above the navbar.
-- Two more columns on the existing store_settings singleton — it already has
-- `public read` / `admin write` RLS, so the banner inherits that posture and
-- needs no new policies. Messages are a jsonb array of plain strings, matching
-- the specs/features/colors precedent on products; array order is display order.
--
-- Ships DISABLED with one sample message seeded, so applying this migration
-- changes nothing on the live site until an admin turns it on.

alter table public.store_settings
  add column promo_enabled  boolean not null default false,
  add column promo_messages jsonb   not null default '[]'::jsonb;

update public.store_settings
   set promo_messages = '["30% off all Ute and Caravan Toolboxes"]'::jsonb
 where id;
```

- [ ] **Step 2: Write the failing tests**

Create `src/test/promoStore.test.js`:

```js
import { describe, it, expect, beforeEach, vi } from 'vitest'

const { maybeSingleMock } = vi.hoisted(() => ({ maybeSingleMock: vi.fn() }))

vi.mock('../lib/supabaseClient.js', () => ({
  getSupabase: () =>
    Promise.resolve({
      from: () => ({ select: () => ({ maybeSingle: maybeSingleMock }) }),
    }),
}))

const { normalizeMessages, signatureOf, loadPromo, dismissPromo, __setStateForTests } =
  await import('../lib/promoStore.js')

describe('normalizeMessages', () => {
  it('keeps trimmed non-empty strings in order', () => {
    expect(normalizeMessages(['  30% off  ', 'Aussie made'])).toEqual(['30% off', 'Aussie made'])
  })

  it('drops blanks and non-strings', () => {
    expect(normalizeMessages(['ok', '', '   ', null, 42, {}])).toEqual(['ok'])
  })

  it('returns empty for anything that is not an array', () => {
    expect(normalizeMessages(null)).toEqual([])
    expect(normalizeMessages('30% off')).toEqual([])
    expect(normalizeMessages(undefined)).toEqual([])
  })

  it('caps at 6 messages and 120 characters each', () => {
    expect(normalizeMessages(['a', 'b', 'c', 'd', 'e', 'f', 'g'])).toHaveLength(6)
    expect(normalizeMessages(['x'.repeat(200)])[0]).toHaveLength(120)
  })
})

describe('signatureOf', () => {
  it('changes when any message changes, so an old dismissal stops matching', () => {
    expect(signatureOf(['a', 'b'])).toBe(signatureOf(['a', 'b']))
    expect(signatureOf(['a', 'b'])).not.toBe(signatureOf(['a', 'c']))
  })
})

describe('loadPromo', () => {
  beforeEach(() => {
    localStorage.clear()
    maybeSingleMock.mockReset()
    __setStateForTests({})
  })

  it('stores enabled + normalized messages and caches them', async () => {
    maybeSingleMock.mockResolvedValue({
      data: { promo_enabled: true, promo_messages: ['30% off', ''] },
      error: null,
    })
    await loadPromo()
    expect(JSON.parse(localStorage.getItem('urbantoolboxes:promo-cache'))).toEqual({
      enabled: true,
      messages: ['30% off'],
    })
  })

  it('stays disabled when the query errors rather than throwing', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: { message: 'no such column' } })
    await expect(loadPromo()).resolves.toBeUndefined()
    expect(localStorage.getItem('urbantoolboxes:promo-cache')).toBeNull()
  })

  it('stays disabled when the client rejects rather than throwing', async () => {
    maybeSingleMock.mockRejectedValue(new Error('offline'))
    await expect(loadPromo()).resolves.toBeUndefined()
  })
})

describe('dismissPromo', () => {
  beforeEach(() => {
    localStorage.clear()
    __setStateForTests({ enabled: true, messages: ['30% off'] })
  })

  it('persists the signature of the current message set', () => {
    dismissPromo()
    expect(localStorage.getItem('urbantoolboxes:promo-dismissed')).toBe('30% off')
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `yarn vitest run src/test/promoStore.test.js`
Expected: FAIL — `Failed to resolve import "../lib/promoStore.js"`.

- [ ] **Step 4: Write `src/lib/promoStore.js`**

```js
import { useSyncExternalStore } from 'react'
import { getSupabase } from './supabaseClient.js'

// Promo banner state. Same shape as productStore/quoteStore: one module-level
// state object, one fetch per session, components subscribe via usePromo().
//
// Everything here is best-effort. An unconfigured backend, an un-migrated
// column or a dead network all resolve to "no banner" — a marketing strip is
// never worth blocking or erroring a page render over.

const CACHE_KEY = 'urbantoolboxes:promo-cache'
const DISMISS_KEY = 'urbantoolboxes:promo-dismissed'
const MAX_MESSAGES = 6
const MAX_LENGTH = 120

// localStorage throws in private browsing and when storage is disabled.
function readStorage(key) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Nothing to do — the banner just loses its cache/dismissal memory.
  }
}

export function normalizeMessages(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((m) => typeof m === 'string')
    .map((m) => m.trim().slice(0, MAX_LENGTH))
    .filter(Boolean)
    .slice(0, MAX_MESSAGES)
}

// Identifies the current promotion. A dismissal only sticks while this matches,
// so editing any message re-shows the banner to everyone who closed the old one.
export function signatureOf(messages) {
  return messages.join('|')
}

// The banner sits at the very top of the document, so inserting it after an
// async fetch shifts the whole page down (a CLS hit on every route). Seeding
// from the last known value lets it paint on the first frame instead; the
// network result then reconciles it.
function initialState() {
  let enabled = false
  let messages = []
  const cached = readStorage(CACHE_KEY)
  if (cached) {
    try {
      const parsed = JSON.parse(cached)
      enabled = !!parsed.enabled
      messages = normalizeMessages(parsed.messages)
    } catch {
      // Corrupt cache — fall through to the empty default.
    }
  }
  return { enabled, messages, dismissed: readStorage(DISMISS_KEY) }
}

let state = initialState()
let loaded = false
const listeners = new Set()

function setState(next) {
  state = next
  listeners.forEach((fn) => fn())
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function getSnapshot() {
  return state
}

export async function loadPromo() {
  if (loaded) return
  loaded = true
  const supabase = await getSupabase()
  if (!supabase) return
  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('promo_enabled, promo_messages')
      .maybeSingle()
    if (error || !data) return
    const enabled = !!data.promo_enabled
    const messages = normalizeMessages(data.promo_messages)
    writeStorage(CACHE_KEY, JSON.stringify({ enabled, messages }))
    setState({ ...state, enabled, messages })
  } catch {
    // Offline, or the columns aren't migrated yet — keep whatever the cache gave us.
  }
}

export function dismissPromo() {
  const signature = signatureOf(state.messages)
  writeStorage(DISMISS_KEY, signature)
  setState({ ...state, dismissed: signature })
}

export function usePromo() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

// Test-only: reset the module without a network.
export function __setStateForTests(next) {
  loaded = false
  setState({ enabled: false, messages: [], dismissed: null, ...next })
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `yarn vitest run src/test/promoStore.test.js`
Expected: PASS, 9 tests.

- [ ] **Step 6: Lint, format and commit**

```bash
yarn lint && yarn format:check
git add supabase/migrations/0005_promo_banner.sql src/lib/promoStore.js src/test/promoStore.test.js
git commit -m "feat(promo): store_settings columns + promoStore"
```

---

### Task 2: `PromoBanner` component

**Files:**

- Create: `src/components/PromoBanner.jsx`
- Create: `src/components/PromoBanner.css`
- Modify: `src/App.jsx` (add the import, and mount it just before `<Navbar />` inside `AppBody`)
- Test: `src/test/promoBanner.test.jsx`

**Interfaces:**

- Consumes: `usePromo`, `loadPromo`, `dismissPromo`, `signatureOf` from Task 1's `src/lib/promoStore.js`; `__setStateForTests` in tests.
- Produces: default-exported `<PromoBanner />` taking no props.

- [ ] **Step 1: Write the failing tests**

Create `src/test/promoBanner.test.jsx`:

```jsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/supabaseClient.js', () => ({ getSupabase: () => Promise.resolve(null) }))

const { __setStateForTests } = await import('../lib/promoStore.js')
const { default: PromoBanner } = await import('../components/PromoBanner.jsx')

beforeEach(() => {
  localStorage.clear()
  __setStateForTests({})
})

describe('PromoBanner — visibility', () => {
  it('renders nothing when the banner is disabled', () => {
    __setStateForTests({ enabled: false, messages: ['30% off'] })
    const { container } = render(<PromoBanner />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when enabled with no messages', () => {
    __setStateForTests({ enabled: true, messages: [] })
    const { container } = render(<PromoBanner />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders every message so a screen reader gets the whole set', () => {
    __setStateForTests({ enabled: true, messages: ['30% off', 'Aussie made'] })
    render(<PromoBanner />)
    expect(screen.getByText('30% off')).toBeInTheDocument()
    expect(screen.getByText('Aussie made')).toBeInTheDocument()
  })
})

describe('PromoBanner — rotation', () => {
  afterEach(() => vi.useRealTimers())

  it('marks the next message active after the interval and wraps around', () => {
    vi.useFakeTimers()
    __setStateForTests({ enabled: true, messages: ['first', 'second'] })
    render(<PromoBanner />)

    expect(screen.getByText('first').className).toContain('promo__msg--on')
    expect(screen.getByText('second').className).not.toContain('promo__msg--on')

    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByText('second').className).toContain('promo__msg--on')

    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByText('first').className).toContain('promo__msg--on')
  })

  it('does not start an interval for a single message', () => {
    vi.useFakeTimers()
    const spy = vi.spyOn(global, 'setInterval')
    __setStateForTests({ enabled: true, messages: ['only one'] })
    render(<PromoBanner />)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('PromoBanner — dismissal', () => {
  it('hides the banner and persists the signature', async () => {
    const user = userEvent.setup()
    __setStateForTests({ enabled: true, messages: ['30% off'] })
    const { container } = render(<PromoBanner />)

    await user.click(screen.getByRole('button', { name: /dismiss promotion/i }))

    expect(container).toBeEmptyDOMElement()
    expect(localStorage.getItem('urbantoolboxes:promo-dismissed')).toBe('30% off')
  })

  it('stays hidden for the same message set', () => {
    __setStateForTests({ enabled: true, messages: ['30% off'], dismissed: '30% off' })
    const { container } = render(<PromoBanner />)
    expect(container).toBeEmptyDOMElement()
  })

  it('reappears once the messages change', () => {
    __setStateForTests({ enabled: true, messages: ['50% off'], dismissed: '30% off' })
    render(<PromoBanner />)
    expect(screen.getByText('50% off')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn vitest run src/test/promoBanner.test.jsx`
Expected: FAIL — `Failed to resolve import "../components/PromoBanner.jsx"`.

- [ ] **Step 3: Write `src/components/PromoBanner.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { Tag, X } from 'lucide-react'
import { usePromo, loadPromo, dismissPromo, signatureOf } from '../lib/promoStore.js'
import './PromoBanner.css'

const ROTATE_MS = 5000

// Optional promo strip above the navbar. Copy and on/off live in Supabase
// (store_settings) and are edited from /admin.
//
// It sits in normal flow above the sticky navbar, so it scrolls away while the
// navbar keeps pinning on its own — no Navbar.css changes needed.
//
// Every message renders into the DOM at once, stacked into one grid cell with
// only the active one visible. A screen reader therefore reads the whole set,
// in order, and we avoid an aria-live region announcing a new message every
// five seconds. The stack also fixes the bar's height to its tallest message,
// so rotation never reflows the page.
//
// CSS transitions rather than framer-motion, deliberately: that library is kept
// off the storefront's initial bundle (see DeferredQuoteDrawer in App.jsx).
export default function PromoBanner() {
  const { enabled, messages, dismissed } = usePromo()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    loadPromo()
  }, [])

  const signature = signatureOf(messages)
  const visible = enabled && messages.length > 0 && dismissed !== signature

  // A late network reconcile can shorten the list — restart the cycle rather
  // than leave the index pointing past the end of it.
  useEffect(() => {
    setIndex(0)
  }, [signature])

  useEffect(() => {
    if (!visible || messages.length < 2) return
    const id = setInterval(() => setIndex((i) => (i + 1) % messages.length), ROTATE_MS)
    return () => clearInterval(id)
  }, [visible, messages.length])

  if (!visible) return null

  return (
    <aside className="promo" aria-label="Promotions">
      <div className="promo__inner container">
        <Tag className="promo__icon" size={15} strokeWidth={2.2} aria-hidden="true" />
        <p className="promo__stack">
          {messages.map((message, i) => (
            <span
              key={`${i}:${message}`}
              className={`promo__msg${i === index ? ' promo__msg--on' : ''}`}
            >
              {message}
            </span>
          ))}
        </p>
        <button
          type="button"
          className="promo__close"
          onClick={dismissPromo}
          aria-label="Dismiss promotion"
        >
          <X size={16} strokeWidth={2.2} aria-hidden="true" />
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 4: Write `src/components/PromoBanner.css`**

```css
/* Promo strip above the navbar. Deliberately in normal flow (not sticky) so it
   scrolls away and leaves the navbar to pin on its own. */
.promo {
  background: var(--color-accent);
  color: var(--color-white);
}

.promo__inner {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 36px;
}

.promo__icon {
  flex: none;
  opacity: 0.85;
}

/* All messages share one grid cell, so the bar is as tall as the tallest one
   and swapping the active message never changes the layout. */
.promo__stack {
  flex: 1;
  display: grid;
  margin: 0;
  text-align: center;
}

.promo__msg {
  grid-area: 1 / 1;
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  /* Inactive messages stay in the accessibility tree — opacity, not display. */
  opacity: 0;
  pointer-events: none;
  transform: translateY(6px);
  transition:
    opacity var(--transition-base),
    transform var(--transition-base);
}

.promo__msg--on {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.promo__close {
  flex: none;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: inherit;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity var(--transition-fast);
}

.promo__close:hover {
  opacity: 1;
}

.promo__close:focus-visible {
  outline: 2px solid var(--color-white);
  outline-offset: 2px;
}

@media (max-width: 640px) {
  .promo__inner {
    min-height: 32px;
    gap: 8px;
  }
  .promo__msg {
    font-size: 10.5px;
    letter-spacing: 0.08em;
  }
}

/* Rotation continues (a content change isn't motion) — only the movement goes. */
@media (prefers-reduced-motion: reduce) {
  .promo__msg {
    transition: none;
    transform: none;
  }
  .promo__msg--on {
    transform: none;
  }
}
```

- [ ] **Step 5: Mount it in `src/App.jsx`**

Add the import beside the other eager component imports near the top:

```jsx
import PromoBanner from './components/PromoBanner.jsx'
```

Then in `AppBody`, change:

```jsx
{
  !isAdmin && <Navbar />
}
```

to:

```jsx
{
  !isAdmin && <PromoBanner />
}
{
  !isAdmin && <Navbar />
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `yarn vitest run src/test/promoBanner.test.jsx`
Expected: PASS, 8 tests.

- [ ] **Step 7: Run the full suite to check nothing regressed**

Run: `yarn test`
Expected: PASS. `src/test/appFrame.test.jsx` renders the app shell — if it asserts on the exact children of the header region it may need the banner accounted for. The banner renders `null` by default (disabled, no cache), so this should pass untouched.

- [ ] **Step 8: Lint, format and commit**

```bash
yarn lint && yarn format:check
git add src/components/PromoBanner.jsx src/components/PromoBanner.css src/App.jsx src/test/promoBanner.test.jsx
git commit -m "feat(promo): rotating promo banner above the navbar"
```

---

### Task 3: Admin API — read and write the banner

**Files:**

- Modify: `src/lib/adminApi.js` (append after `saveStoreDiscount`, around line 124)
- Test: `src/test/adminApi.test.js`

**Interfaces:**

- Consumes: the module-local `client()` helper already in `adminApi.js`; `normalizeMessages` from `src/lib/promoStore.js` (Task 1).
- Produces:
  - `fetchPromoBanner(): Promise<{ enabled: boolean, messages: string[] }>`
  - `savePromoBanner({ enabled, messages }): Promise<void>` — throws `Error(message)` on failure, matching `saveStoreDiscount`.

- [ ] **Step 1: Read the existing test file first**

Run: `cat src/test/adminApi.test.js`

Match its existing mocking style rather than inventing a new one — append the new `describe` blocks in that same style.

- [ ] **Step 2: Write the failing tests**

Append to `src/test/adminApi.test.js`, adapting the mock to the file's established shape:

```js
describe('promo banner', () => {
  it('reads enabled + normalized messages', async () => {
    // Mock store_settings to return:
    //   { promo_enabled: true, promo_messages: ['30% off', '  ', 'Aussie made'] }
    const promo = await fetchPromoBanner()
    expect(promo).toEqual({ enabled: true, messages: ['30% off', 'Aussie made'] })
  })

  it('treats missing columns as disabled rather than throwing', async () => {
    // Mock store_settings to return { } (pre-migration row)
    const promo = await fetchPromoBanner()
    expect(promo).toEqual({ enabled: false, messages: [] })
  })

  it('writes both columns to the singleton row', async () => {
    await savePromoBanner({ enabled: true, messages: ['30% off'] })
    expect(updateMock).toHaveBeenCalledWith({
      promo_enabled: true,
      promo_messages: ['30% off'],
    })
    expect(eqMock).toHaveBeenCalledWith('id', true)
  })

  it('throws the supabase error message on write failure', async () => {
    // Mock update to resolve { error: { message: 'permission denied' } }
    await expect(savePromoBanner({ enabled: true, messages: ['x'] })).rejects.toThrow(
      'permission denied',
    )
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `yarn vitest run src/test/adminApi.test.js`
Expected: FAIL — `fetchPromoBanner is not a function`.

- [ ] **Step 4: Add the functions to `src/lib/adminApi.js`**

Add to the imports at the top of the file:

```js
import { normalizeMessages } from './promoStore.js'
```

Append after `saveStoreDiscount`:

```js
// Promo banner — the same store_settings singleton. Note there is deliberately
// no retryLoad() here: that refreshes the product catalogue, which the banner
// has nothing to do with, and /admin never renders PromoBanner anyway (AppBody
// drops the marketing chrome on that route), so there's no open view to sync.
export async function fetchPromoBanner() {
  const c = await client()
  const { data, error } = await c
    .from('store_settings')
    .select('promo_enabled, promo_messages')
    .maybeSingle()
  if (error) throw new Error(error.message)
  return {
    enabled: !!data?.promo_enabled,
    messages: normalizeMessages(data?.promo_messages),
  }
}

export async function savePromoBanner({ enabled, messages }) {
  const c = await client()
  const { error } = await c
    .from('store_settings')
    .update({ promo_enabled: !!enabled, promo_messages: normalizeMessages(messages) })
    .eq('id', true)
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `yarn vitest run src/test/adminApi.test.js`
Expected: PASS.

- [ ] **Step 6: Lint, format and commit**

```bash
yarn lint && yarn format:check
git add src/lib/adminApi.js src/test/adminApi.test.js
git commit -m "feat(admin): promo banner read/write API"
```

---

### Task 4: Extract the shared `AdminModal` shell

Pure refactor — no behaviour change. `DiscountModal` holds ~40 lines of dialog plumbing (Esc-to-close, backdrop, body scroll lock, focus the close button, restore focus on exit, `AnimatePresence` exit animation) that the promo modal needs identically. Extract it rather than copy-paste it.

**Files:**

- Create: `src/pages/admin/AdminModal.jsx`
- Modify: `src/pages/admin/DiscountModal.jsx` (replace its whole body)
- Test: `src/test/admin.test.jsx` (existing — must keep passing unchanged)

**Interfaces:**

- Produces: default-exported `<AdminModal open title onClose>{children}</AdminModal>`.
  - `open: boolean`, `title: string` (used for both the visible `<h2>` and the dialog's `aria-label`), `onClose: () => void`.

- [ ] **Step 1: Run the existing admin tests to capture the green baseline**

Run: `yarn vitest run src/test/admin.test.jsx`
Expected: PASS. Note the count — it must be identical after the refactor.

- [ ] **Step 2: Create `src/pages/admin/AdminModal.jsx`**

```jsx
import { useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'

// Shared centered-dialog shell for the admin's settings modals. Mirrors
// EditorTray's dialog semantics: Esc-to-close, backdrop, body scroll lock,
// focus the close button on open, restore focus to the trigger on exit.
// Prop-driven — the caller owns `open`, and this stays mounted so the exit
// animation still runs.
export default function AdminModal({ open, title, onClose, children }) {
  const reduce = useReducedMotion()
  const closeRef = useRef(null)

  useEffect(() => {
    if (!open) return
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
  }, [open, onClose])

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
      {open && (
        <div className="admin-modal" role="dialog" aria-modal="true" aria-label={title}>
          <motion.button
            type="button"
            className="admin-modal__backdrop"
            aria-label={`Close ${title.toLowerCase()} dialog`}
            onClick={onClose}
            {...fade}
          />
          <motion.div className="admin-modal__panel" {...panelMotion}>
            <div className="admin-modal__head">
              <h2 className="admin-modal__title">{title}</h2>
              <button
                ref={closeRef}
                type="button"
                className="editor-tray__close"
                onClick={onClose}
                aria-label={`Close ${title.toLowerCase()} dialog`}
              >
                <X size={22} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>
            <div className="admin-modal__body">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 3: Replace `src/pages/admin/DiscountModal.jsx` entirely**

```jsx
import AdminModal from './AdminModal.jsx'
import StoreDiscount from './StoreDiscount.jsx'

// Store-wide discount dialog — the AdminModal shell plus the discount form.
export default function DiscountModal({ open, onSaved, onClose }) {
  return (
    <AdminModal open={open} title="Store-wide discount" onClose={onClose}>
      <p className="admin-modal__intro">
        One percentage applied to every storefront price at display time. The greater of this and
        each product&rsquo;s own discount wins. Set to 0 to turn it off.
      </p>
      <StoreDiscount onSaved={onSaved} />
    </AdminModal>
  )
}
```

- [ ] **Step 4: Verify the refactor changed nothing**

Run: `yarn vitest run src/test/admin.test.jsx`
Expected: PASS with the same test count as Step 1.

Note the one intentional string change: the close button's `aria-label` was `"Close discount dialog"` and is now derived as `"Close store-wide discount dialog"`. If a test asserts the old label, update the assertion — do not add a prop to preserve it.

- [ ] **Step 5: Lint, format and commit**

```bash
yarn lint && yarn format:check
git add src/pages/admin/AdminModal.jsx src/pages/admin/DiscountModal.jsx src/test/admin.test.jsx
git commit -m "refactor(admin): extract shared AdminModal dialog shell"
```

---

### Task 5: `PromoBannerForm` + `PromoModal`

**Files:**

- Create: `src/pages/admin/PromoBannerForm.jsx`
- Create: `src/pages/admin/PromoModal.jsx`
- Modify: `src/pages/admin/Admin.css` (append the promo form styles)
- Test: `src/test/promoAdmin.test.jsx`

**Interfaces:**

- Consumes: `fetchPromoBanner`, `savePromoBanner` (Task 3); `AdminModal` (Task 4).
- Produces:
  - `<PromoBannerForm onSaved={(promo) => void} />` — calls back with `{ enabled, messages }` after a successful save.
  - `<PromoModal open onSaved onClose />`.

- [ ] **Step 1: Write the failing tests**

Create `src/test/promoAdmin.test.jsx`:

```jsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { fetchMock, saveMock } = vi.hoisted(() => ({ fetchMock: vi.fn(), saveMock: vi.fn() }))

vi.mock('../lib/adminApi.js', () => ({
  fetchPromoBanner: fetchMock,
  savePromoBanner: saveMock,
}))

const { default: PromoBannerForm } = await import('../pages/admin/PromoBannerForm.jsx')

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue({ enabled: false, messages: ['30% off'] })
  saveMock.mockReset().mockResolvedValue(undefined)
})

describe('PromoBannerForm', () => {
  it('loads the current banner into the form', async () => {
    render(<PromoBannerForm />)
    expect(await screen.findByDisplayValue('30% off')).toBeInTheDocument()
    expect(screen.getByLabelText(/show the promo banner/i)).not.toBeChecked()
  })

  it('adds and removes messages, capping at 6', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ enabled: true, messages: ['a'] })
    render(<PromoBannerForm />)
    await screen.findByDisplayValue('a')

    const add = screen.getByRole('button', { name: /add message/i })
    for (let i = 0; i < 5; i++) await user.click(add)
    expect(screen.getAllByLabelText(/^message \d+$/i)).toHaveLength(6)
    expect(add).toBeDisabled()

    await user.click(screen.getAllByRole('button', { name: /remove message/i })[0])
    expect(screen.getAllByLabelText(/^message \d+$/i)).toHaveLength(5)
    expect(add).toBeEnabled()
  })

  it('saves the toggle and trimmed non-empty messages', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    render(<PromoBannerForm onSaved={onSaved} />)
    await screen.findByDisplayValue('30% off')

    await user.click(screen.getByLabelText(/show the promo banner/i))
    await user.click(screen.getByRole('button', { name: /^save/i }))

    await waitFor(() =>
      expect(saveMock).toHaveBeenCalledWith({ enabled: true, messages: ['30% off'] }),
    )
    expect(onSaved).toHaveBeenCalledWith({ enabled: true, messages: ['30% off'] })
  })

  it('refuses to enable the banner with no messages', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ enabled: false, messages: [] })
    render(<PromoBannerForm />)
    await screen.findByLabelText(/show the promo banner/i)

    await user.click(screen.getByLabelText(/show the promo banner/i))
    await user.click(screen.getByRole('button', { name: /^save/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/at least one message/i)
    expect(saveMock).not.toHaveBeenCalled()
  })

  it('surfaces a save failure', async () => {
    const user = userEvent.setup()
    saveMock.mockRejectedValue(new Error('permission denied'))
    render(<PromoBannerForm />)
    await screen.findByDisplayValue('30% off')

    await user.click(screen.getByRole('button', { name: /^save/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('permission denied')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn vitest run src/test/promoAdmin.test.jsx`
Expected: FAIL — `Failed to resolve import "../pages/admin/PromoBannerForm.jsx"`.

- [ ] **Step 3: Write `src/pages/admin/PromoBannerForm.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { fetchPromoBanner, savePromoBanner } from '../../lib/adminApi.js'

// Promo banner editor: the on/off switch, the rotating message list, and a live
// preview of the real green bar. Messages rotate on the storefront in list
// order. Reordering is deliberately not offered — with a handful of short
// strings, retyping beats building drag handles.
const MAX_MESSAGES = 6
const MAX_LENGTH = 120

export default function PromoBannerForm({ onSaved }) {
  const [enabled, setEnabled] = useState(false)
  const [messages, setMessages] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    fetchPromoBanner()
      .then((promo) => {
        if (!alive) return
        setEnabled(promo.enabled)
        setMessages(promo.messages.length ? promo.messages : [''])
        setLoaded(true)
      })
      .catch((err) => alive && setError(err.message))
    return () => {
      alive = false
    }
  }, [])

  function setMessage(i, value) {
    setMessages(messages.map((m, idx) => (idx === i ? value.slice(0, MAX_LENGTH) : m)))
  }
  function addMessage() {
    setMessages([...messages, ''])
  }
  function removeMessage(i) {
    setMessages(messages.filter((_, idx) => idx !== i))
  }

  const cleaned = messages.map((m) => m.trim()).filter(Boolean)

  async function onSubmit(e) {
    e.preventDefault()
    setStatus('')
    if (enabled && cleaned.length === 0) {
      setError('Add at least one message before switching the banner on.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await savePromoBanner({ enabled, messages: cleaned })
      setMessages(cleaned.length ? cleaned : [''])
      setStatus(enabled ? 'Promo banner is live.' : 'Promo banner is off.')
      onSaved?.({ enabled, messages: cleaned })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="admin-promo" onSubmit={onSubmit}>
      <label className="admin-editor__check">
        <input
          type="checkbox"
          checked={enabled}
          disabled={!loaded || busy}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        Show the promo banner on the site
      </label>

      <fieldset className="admin-promo__list">
        <legend className="admin__label">Messages (they rotate in this order)</legend>
        {messages.map((message, i) => (
          <div className="admin-promo__row" key={i}>
            <input
              className="admin__input"
              aria-label={`Message ${i + 1}`}
              placeholder="30% off all Ute and Caravan Toolboxes"
              maxLength={MAX_LENGTH}
              value={message}
              disabled={!loaded || busy}
              onChange={(e) => setMessage(i, e.target.value)}
            />
            <button
              type="button"
              className="admin__ghost admin-promo__remove"
              aria-label={`Remove message ${i + 1}`}
              disabled={!loaded || busy || messages.length === 1}
              onClick={() => removeMessage(i)}
            >
              <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="admin__ghost"
          disabled={!loaded || busy || messages.length >= MAX_MESSAGES}
          onClick={addMessage}
        >
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
          Add message
        </button>
      </fieldset>

      <div className="admin-promo__preview" aria-hidden="true">
        <span className="admin__label">Preview</span>
        <div className="admin-promo__bar">{cleaned[0] || 'Your message appears here'}</div>
      </div>

      <div className="admin-promo__actions">
        <button type="submit" className="admin__primary" disabled={!loaded || busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        {status && (
          <span className="admin-discount__status" role="status">
            {status}
          </span>
        )}
        {error && (
          <span className="admin__error admin-discount__status" role="alert">
            {error}
          </span>
        )}
      </div>
    </form>
  )
}
```

- [ ] **Step 4: Write `src/pages/admin/PromoModal.jsx`**

```jsx
import AdminModal from './AdminModal.jsx'
import PromoBannerForm from './PromoBannerForm.jsx'

// Promo banner dialog — the AdminModal shell plus the banner editor.
export default function PromoModal({ open, onSaved, onClose }) {
  return (
    <AdminModal open={open} title="Promo banner" onClose={onClose}>
      <p className="admin-modal__intro">
        A strip above the navigation. With more than one message it crossfades through them, five
        seconds each, on a loop. Visitors can close it — changing any message brings it back for
        everyone who did.
      </p>
      <PromoBannerForm onSaved={onSaved} />
    </AdminModal>
  )
}
```

- [ ] **Step 5: Append the styles to `src/pages/admin/Admin.css`**

```css
/* Promo banner editor (inside AdminModal). */
.admin-promo {
  display: grid;
  gap: 16px;
}
.admin-promo__list {
  display: grid;
  gap: 8px;
  padding: 0;
  border: 0;
  margin: 0;
}
.admin-promo__row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.admin-promo__row .admin__input {
  flex: 1;
}
.admin-promo__remove {
  flex: none;
}
.admin-promo__preview {
  display: grid;
  gap: 6px;
}
/* Mirrors the storefront .promo bar so the admin sees the real thing. */
.admin-promo__bar {
  display: grid;
  place-items: center;
  min-height: 36px;
  padding: 0 12px;
  background: var(--color-accent);
  color: var(--color-white);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-align: center;
}
.admin-promo__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `yarn vitest run src/test/promoAdmin.test.jsx`
Expected: PASS, 5 tests.

- [ ] **Step 7: Lint, format and commit**

```bash
yarn lint && yarn format:check
git add src/pages/admin/PromoBannerForm.jsx src/pages/admin/PromoModal.jsx src/pages/admin/Admin.css src/test/promoAdmin.test.jsx
git commit -m "feat(admin): promo banner editor with live preview"
```

---

### Task 6: Fifth stat card

**Files:**

- Modify: `src/pages/admin/StatCards.jsx`
- Modify: `src/pages/admin/Admin.css:253-257` (the `.admin-statcards` grid) and `:970-978` (its two breakpoint overrides)
- Test: `src/test/admin.test.jsx`

**Interfaces:**

- Consumes: `fetchPromoBanner` (Task 3), `PromoModal` (Task 5).
- Produces: no new exports — `StatCards` keeps its existing props (`total`, `visibleCount`, `hiddenCount`, `filter`, `onFilter`).

- [ ] **Step 1: Write the failing test**

Append to `src/test/admin.test.jsx`, matching the file's existing render helpers and mocks:

```jsx
it('shows a promo banner card that opens the editor', async () => {
  const user = userEvent.setup()
  // fetchPromoBanner mocked to resolve { enabled: true, messages: ['30% off', 'Aussie made'] }
  render(<StatCards total={3} visibleCount={2} hiddenCount={1} filter="all" onFilter={() => {}} />)

  expect(await screen.findByTestId('stat-promo')).toHaveTextContent('On')
  expect(screen.getByTestId('stat-promo')).toHaveTextContent('2 messages')

  await user.click(screen.getByRole('button', { name: /manage banner/i }))
  expect(await screen.findByRole('dialog', { name: /promo banner/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `yarn vitest run src/test/admin.test.jsx`
Expected: FAIL — unable to find an element by `[data-testid="stat-promo"]`.

- [ ] **Step 3: Add the card to `src/pages/admin/StatCards.jsx`**

Extend the imports:

```jsx
import { Package, Eye, EyeOff, Tag, Megaphone } from 'lucide-react'
import { fetchStoreDiscount, fetchPromoBanner } from '../../lib/adminApi.js'
import DiscountModal from './DiscountModal.jsx'
import PromoModal from './PromoModal.jsx'
```

Add state beside the existing discount state:

```jsx
const [promo, setPromo] = useState({ enabled: false, messages: [] })
const [promoOpen, setPromoOpen] = useState(false)

useEffect(() => {
  let alive = true
  fetchPromoBanner()
    .then((v) => alive && setPromo(v))
    .catch(() => {})
  return () => {
    alive = false
  }
}, [])
```

Add the card immediately after the discount `StatCard`, before the closing `</div>`:

```jsx
      <StatCard variant="accent" icon={<Megaphone size={22} strokeWidth={2} aria-hidden="true" />}>
        <span className="admin-statcard__label">Promo banner</span>
        <span className="admin-statcard__row" data-testid="stat-promo">
          <span className="admin-statcard__num admin-statcard__num--pct">
            {promo.enabled ? 'On' : 'Off'}
          </span>
          <span className="admin-statcard__sub">
            {promo.messages.length} message{promo.messages.length === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            className="admin__ghost admin-statcard__btn"
            onClick={() => setPromoOpen(true)}
          >
            Manage banner
          </button>
        </span>
      </StatCard>

      <PromoModal open={promoOpen} onSaved={setPromo} onClose={() => setPromoOpen(false)} />
```

- [ ] **Step 4: Fix the stat-card grid in `src/pages/admin/Admin.css`**

The grid is hardcoded to four columns, so a fifth card strands one item on its own row. Replace the rule at `:253-257`:

```css
.admin-statcards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
```

with:

```css
/* auto-fit rather than a fixed count: 5 cards flow to 5 / 3 / 2 / 1 columns as
   the viewport narrows, which replaces the two breakpoint overrides below. */
.admin-statcards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 16px;
}
```

Then **delete** both now-redundant overrides (around lines 970-978):

```css
@media (max-width: 970px) {
  .admin-statcards {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 560px) {
  .admin-statcards {
    grid-template-columns: 1fr;
  }
}
```

Add the sub-label style beside the other `.admin-statcard__*` rules:

```css
.admin-statcard__sub {
  font-size: 12px;
  color: var(--color-ink-muted);
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `yarn vitest run src/test/admin.test.jsx`
Expected: PASS.

- [ ] **Step 6: Run the whole suite and build**

```bash
yarn test
yarn lint && yarn format:check
yarn build
```

Expected: all PASS, production build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/pages/admin/StatCards.jsx src/pages/admin/Admin.css src/test/admin.test.jsx
git commit -m "feat(admin): promo banner stat card"
```

---

## Manual verification

Run after Task 6. Requires the migration applied to Supabase and `yarn dev` running.

- [ ] Apply `0005_promo_banner.sql`. Load the site — **no banner** (ships disabled).
- [ ] In `/admin`, the stat row shows five cards cleanly at 1280px, and reflows without stranding a card at 1024 / 768 / 375px.
- [ ] Open **Manage banner**, add a second message, tick the switch, Save. The preview shows the green bar.
- [ ] On the storefront: the banner appears, messages crossfade every 5s and loop.
- [ ] Scroll down — the banner scrolls away and the navbar pins on its own. Check both `/` (transparent-over-hero navbar) and `/toolboxes` (solid navbar).
- [ ] Dismiss it, reload — still hidden. Change a message in `/admin`, reload — it returns.
- [ ] Turn it off in `/admin`, reload — gone.
- [ ] Enable "Reduce motion" in macOS System Settings → Accessibility → Display. Messages swap with no slide or fade.
- [ ] Check 375 / 768 / 1280px: the bar stays one line and the dismiss button stays tappable.
- [ ] Lighthouse on `yarn preview` with the banner **on**: performance ≥ 90, SEO ≥ 95, a11y ≥ 90.

## Self-review notes

Checked against the spec — every section maps to a task:

| Spec section                       | Task               |
| ---------------------------------- | ------------------ |
| Migration / jsonb shape / limits   | 1                  |
| `promoStore` + normalize + cache   | 1                  |
| `PromoBanner`, rotation, a11y, CSS | 2                  |
| Dismissal + signature              | 1 (store) + 2 (UI) |
| CLS guard                          | 1                  |
| `adminApi` read/write              | 3                  |
| `AdminModal` extraction            | 4                  |
| `PromoBannerForm` + preview        | 5                  |
| Fifth stat card + grid fix         | 6                  |
| Tests                              | 1, 2, 3, 5, 6      |

One spec item is deliberately deferred: the spec proposed extending `src/test/a11y.test.jsx` to cover the banner. `a11y.test.jsx` renders `Home`, which does **not** include `PromoBanner` (it mounts in `App.jsx`, above the router outlet). Rather than restructure that test, Task 2's `promoBanner.test.jsx` covers the banner's semantics directly and the manual Lighthouse a11y check covers it in situ. If a rendered-in-context axe assertion is wanted later, it belongs in `appFrame.test.jsx`, not `a11y.test.jsx`.
