# Admin Full-Screen + Edit-Tray Redesign

**Date:** 2026-07-16
**Route affected:** `/admin` (single-admin catalogue tool)
**Status:** Approved design → implementation

## Goal

Make the `/admin` catalogue dashboard **easier to read, friendlier, and easier to
use**. Three concrete changes, per Billy's request:

1. **Full-screen** — the admin uses the whole viewport as a standalone dashboard,
   not a container-constrained page wrapped in the marketing site shell.
2. **Edit tray, not a new page** — editing/creating a product opens a right-side
   slide-out tray you can open and close instantly (Esc / backdrop / ✕), instead of
   swapping the whole list out for a full-page form.
3. **Warm visual refresh** — softer surfaces, roomier spacing, larger type, status
   badges, and friendly empty/loading states, all from existing design tokens.

## Non-goals

- No changes to CRUD logic, Supabase calls (`adminApi.js`), validation
  (`productForm.js`), image processing (`imageResize.js`), or the data model.
- No new routes or URL/query-param state for the editor (tray stays driven by local
  React state, matching today).
- No new design tokens — the warm look uses tokens already in `theme.config.js`.
- Categories remain config-driven (not editable in the admin), as today.

## Current state (baseline)

- `/admin` is a single lazy route (`App.jsx:146`). Login / list / editor are toggled
  via `useState` in `AdminPage.jsx` (`editing = null | 'new' | row`).
- Clicking **Edit**/**New** *replaces* `ProductList` with a full-page `ProductEditor`
  form inline; **Cancel/Save** returns to the list. List and editor never coexist.
- Layout is container-constrained (`.container` max-width 1240px, `.section` padding;
  editor further narrowed to `max-width: 720px`).
- `App.jsx` renders `<Navbar/>` and `<Footer/>` (plus `<Lightbox/>`, `<QuoteDrawer/>`,
  `<DetailDrawer/>`) **unconditionally** around every route, outside `<Routes>`.
- Two mature right-side drawers already exist and share one pattern
  (`QuoteDrawer.jsx`, `DetailDrawer.jsx`): framer-motion `x:'100%'→0`, backdrop fade,
  `role="dialog"` + `aria-modal`, Esc-to-close, body scroll lock, focus the close
  button, restore focus on exit. This is the template the edit tray reuses.
- `theme.config.js` already provides `radii.sm/md/lg` (4/12/18px) and
  `shadows.sm/md/lg` — enough for the warm refresh without inventing tokens.

## Design

### 1. Page frame — standalone dashboard

- Add a `SiteFrame` seam **inside** `BrowserRouter` (a component that can call
  `useLocation()`), which renders the storefront chrome — `<Navbar/>`, `<Footer/>`,
  `<Lightbox/>`, `<QuoteDrawer/>`, `<DetailDrawer/>` — **only when the path is not**
  `/admin`. On `/admin` none of them render; the admin owns the viewport.
  - Implementation note: `useLocation` must be called by a descendant of
    `BrowserRouter`. `RouteChange` already is; the conditional chrome follows the
    same placement. `App` itself cannot call `useLocation` (it renders the provider).
- `AdminPage` drops `.container`/`.section`. It renders:
  - A **sticky top bar** (`.admin-topbar`): left = `⚡` logo mark + `Urban Toolbox —
    Admin`; right = a **`← Return to site`** link (`<Link to="/">`, the single escape
    hatch back to the homepage — no full marketing nav) followed by **`Sign out`**.
  - A full-bleed content area with its own responsive horizontal padding
    (`clamp(20px, 4vw, 48px)`), not the shared container.

### 2. Product list — full-width table + thumbnails + warmth

- **Sticky toolbar** above the table: search input, category `<select>`, spacer,
  `+ New product` primary button.
- Edge-to-edge table wrapped in a soft card surface (`--radius-md`, `--shadow-sm`):
  - Columns: thumbnail (larger), title, category label, price via `formatPrice`,
    status badges, actions.
  - **Status badges**: `★ Featured` (using `--color-accent-soft` / `accent-hover`
    text, matching the existing `.admin-photos__badge`); `% Off` when `discount_pct`
    is set (danger/accent tint).
  - Row hover affordance.
  - Actions: **Edit** (pencil icon → opens tray for that row); **Delete** — keep the
    existing two-step inline `Delete → Confirm delete` (no `window.confirm`).
- **Empty state**: friendly message + a `+ New product` call to action.
- **Loading state**: lightweight skeleton rows instead of bare text.

### 3. Editor — right-side slide-out tray (~640px)

- New presentational component `EditorTray.jsx` implementing the established drawer
  pattern (copy the structure/semantics from `QuoteDrawer.jsx`): framer-motion
  `x:'100%'→0` panel, backdrop fade, `role="dialog"` + `aria-modal="true"`,
  `aria-labelledby` the tray title, **Esc-to-close**, body scroll lock, focus the
  close button on open, restore focus to the triggering row/button on close.
- **Driven by props, not a global store.** The tray is open whenever `AdminPage`'s
  `editing` state is not `null` (`'new'` → create, `row` → edit). Rationale: the
  storefront drawers use external stores because they're triggered cross-app; admin
  editor state is local to `AdminPage`, so prop-driven open/close is simpler and
  avoids a store that only one page would use.
- `EditorTray` wraps the **existing `ProductEditor` form body**. `ProductEditor`'s
  logic (state, `validateProduct`, `saveProduct`, `PhotoManager`) is unchanged; only
  its outer container/layout changes so the single-column form fits ~640px.
- Tray chrome:
  - **Header**: `New product` (create) or `Edit — {title}` (edit) + `✕` close button.
  - **Body** (scrollable): the form fields followed by `PhotoManager`.
  - **Sticky footer** action bar: `Save` (primary) / `Cancel` (ghost) + inline error
    text on the same bar.
- **Preserved behavior**:
  - `PhotoManager` still only renders for a saved product; for `'new'` it shows the
    existing "Save the product first, then reopen it to add photos" hint.
  - Save → persist, refresh list, close tray. Cancel / Esc / backdrop → close, no save.
- **Width**: `min(640px, 100vw)` full-height right sheet → full-width on mobile.

### 4. Warm visual refresh (both polish layers)

- Roomier spacing, larger readable type, rounded inputs (`--radius-sm`), soft card
  surfaces with `--shadow-sm/md`, colored status badges, and improved empty/loading
  states — **entirely from existing tokens**.
- Update the `Admin.css` header comment: it currently reads "lean, utilitarian,
  tokens only … sharp corners, no shadows." The friendlier direction Billy requested
  supersedes the "sharp / no shadows" note; keep "tokens only."
- **Login** screen: same standalone frame (no marketing nav). A centered rounded card
  (`--shadow-md`) on the dashboard background. Auth behavior unchanged.

### 5. Files touched

| File | Change |
|------|--------|
| `src/App.jsx` | `SiteFrame` guard: render Navbar/Footer/Lightbox/QuoteDrawer/DetailDrawer only when path ≠ `/admin`. |
| `src/pages/admin/AdminPage.jsx` | Sticky top bar (mark, title, Return-to-site link, Sign out); full-bleed layout; host `EditorTray` instead of inline editor swap. |
| `src/pages/admin/ProductList.jsx` | Refreshed full-width table: badges, `formatPrice`, hover, empty + loading states; Edit opens tray. |
| `src/pages/admin/ProductEditor.jsx` | Form body restyled to fit the ~640px tray; logic untouched. |
| `src/pages/admin/EditorTray.jsx` | **New** — drawer shell (framer-motion + focus trap + Esc/backdrop), props-driven. |
| `src/pages/admin/AdminLogin.jsx` | Centered polished card in the standalone frame. |
| `src/pages/admin/Admin.css` | Major update: top bar, full-bleed, warm surfaces, tray styles, badges, skeleton, login card. |
| `src/test/admin.test.jsx` | Assert: tray opens as a `dialog` on Edit/New, closes via Esc/backdrop/✕, Navbar/Footer hidden on `/admin`, Return-to-site link present, CRUD + photo flows still pass. |

### 6. Error handling

- Save/validation errors surface in the tray footer's inline error (as today, moved
  into the tray).
- Delete keeps the two-step inline confirm; failures show the existing error text.
- Auth/session errors unchanged (`AdminLogin` / `watchSession`).

### 7. Verification

1. `yarn lint && yarn format:check` — clean.
2. `yarn test` — updated `admin.test.jsx` passes, incl. **axe** on the tray's dialog
   semantics (role, aria-modal, labelling, focusable close).
3. `yarn build` — production build succeeds, vendor chunks intact.
4. Browser drive-through: sign in → open tray (New + Edit) → save → delete → Return to
   site link → Sign out; verify Esc/backdrop close and focus restore; resize at
   375 / 768 / 1280px (tray full-width on mobile, toolbar wraps, top bar holds).

## Open risks

- The admin diverges from the storefront's "sharp, no-shadow" aesthetic by design
  (Billy asked for friendlier). Contained to `/admin`; storefront untouched.
- Hiding global storefront drawers on `/admin` must not break their storefront
  behavior — they simply don't mount on that route.
