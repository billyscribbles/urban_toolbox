# Promotional Banner — Design

**Date:** 2026-07-28
**Status:** Approved, ready for implementation planning

## Summary

An optional promotional strip above the navbar. It crossfades through a list of
short messages, is styled in the brand accent green, can be switched on and off
and edited from `/admin`, and can be dismissed by the visitor.

Ships **off by default** with one sample message pre-seeded
(`30% off all Ute and Caravan Toolboxes`), so applying the migration changes
nothing on the live site until an admin enables it.

## Decisions

| Question          | Decision                                                          |
| ----------------- | ----------------------------------------------------------------- |
| Rotation style    | Crossfade + slide, one message at a time, 5s hold, loops forever  |
| Scroll behaviour  | Scrolls away above the sticky navbar; navbar keeps sticking alone |
| Per-message links | Not supported                                                     |
| Visitor dismiss   | Yes, persisted per message-set                                    |
| Storage           | `jsonb` array on the existing `store_settings` singleton row      |
| Animation library | CSS keyframes — **not** framer-motion                             |

## 1. Data

### Migration — `supabase/migrations/0005_promo_banner.sql`

```sql
alter table public.store_settings
  add column promo_enabled  boolean not null default false,
  add column promo_messages jsonb   not null default '[]'::jsonb;

update public.store_settings
   set promo_messages = '["30% off all Ute and Caravan Toolboxes"]'::jsonb;
```

`store_settings` is already a singleton (`id boolean primary key check (id)`)
with `public read` / `admin write` RLS policies, so the banner inherits its
security posture with no new policies.

**Why jsonb on the settings row, not a `promo_messages` table:** one read, one
write, ordering is array order, and it matches the existing `specs` /
`features` / `colors` jsonb precedent on `products`. A separate table would only
pay off for per-row scheduling or analytics, neither of which is in scope.

### Shape

`promo_messages` is a JSON array of plain strings. Any entry that is not a
non-empty string after trimming is dropped at read time. Validation rules
(enforced in the admin form, defensively re-applied on read):

- Maximum 6 messages
- Maximum 120 characters per message
- Empty / whitespace-only messages are discarded, not saved

## 2. Storefront

### `src/lib/promoStore.js` (new)

A small module-level store in the same shape as `productStore` / `quoteStore`:
module state + `useSyncExternalStore`, one fetch per session.

- Selects `promo_enabled, promo_messages` from `store_settings`.
- Best-effort: unconfigured Supabase, a network failure, or malformed data all
  resolve to `{ enabled: false, messages: [] }` — the banner simply never shows.
  A promo strip is never worth blocking or erroring a page render over.
- Deliberately **does not** piggyback on `productStore`'s existing
  `store_settings` read: the banner must not wait for the whole catalogue to
  load before it can paint.
- Normalizes on read: coerce to array, keep non-empty trimmed strings, cap at 6.

**Public API:**

- `usePromo()` → `{ enabled, messages, dismissed }`
- `loadPromo()` — called once from `PromoBanner`'s mount effect
- `dismissPromo()` — writes the dismissal signature to `localStorage` **and**
  updates store state, so the component stays dumb and the storage contract
  lives in one module
- `__setStateForTests()` — matching `productStore`'s test seam

### `src/components/PromoBanner.jsx` + `PromoBanner.css` (new)

Mounted in `App.jsx` inside `AppBody`, as `{!isAdmin && <PromoBanner />}`
immediately before `<Navbar />`.

Because it is an ordinary in-flow sibling above the `position: sticky; top: 0`
navbar, the requested scroll-away behaviour requires **no changes to
`Navbar.css`**. The banner scrolls off the top; the navbar then pins as it does
today.

Renders `null` when: not enabled, no messages, or dismissed.

#### Rotation

- Single `index` state, advanced by a 5000ms interval.
- The interval is only created when `messages.length > 1`.
- The index resets to 0 whenever the message set changes, so a late-arriving
  network reconcile can't leave the index pointing past the end of the list.
- Crossfade + upward slide via CSS keyframes keyed on the active index.
- **No framer-motion.** `App.jsx` goes to deliberate lengths to keep that
  library out of the home route's initial bundle (see the `DeferredQuoteDrawer`
  comment), and `Navbar`'s mega panel already establishes the
  "CSS animation instead" precedent for chrome-level UI.

#### Accessibility

- Wrapped in `<aside aria-label="Promotions">`.
- **All** messages are rendered into the DOM, stacked into a single CSS grid
  cell (`grid-area: 1 / 1`), with only the active one at `opacity: 1`. The
  inactive ones stay in the accessibility tree.

  This means a screen reader reads the complete set once, in order, and there is
  no `aria-live` region announcing a new message every five seconds. Stacking in
  one grid cell also sizes the bar to its tallest message, so rotation never
  changes the banner's height.

- `prefers-reduced-motion: reduce` removes the slide and the fade; the message
  swaps instantly. Rotation itself continues — a content change is not motion.
- Dismiss button is a real `<button>` with `aria-label="Dismiss promotion"`.

#### Dismissal

- `×` button at the right end of the bar.
- On dismiss, write a **signature** of the current message set to
  `localStorage` under `urbantoolboxes:promo-dismissed`. The signature is the
  active messages joined with `|`.
- On load, the banner stays hidden only if the stored signature matches the
  current one. Editing any message in `/admin` changes the signature, so the
  banner re-appears for everyone who dismissed the previous version — which is
  the desired behaviour for a new promotion.

#### Layout-shift guard

The banner's content arrives from an async fetch and is inserted at the very top
of the document, which pushes the entire page down — a real CLS hit on every
route, against a Lighthouse `performance >= 90` gate.

Mitigation: on every successful fetch, cache `{ enabled, messages }` to
`localStorage` under `urbantoolboxes:promo-cache`. On boot, `promoStore`
initialises from that cache synchronously so the banner paints on the first
frame, then reconciles against the network result. First-ever visit shifts once
(~0.04, inside budget); every subsequent load shifts zero.

The two storage keys are distinct and independent: `urbantoolboxes:promo-cache`
(what to show) and `urbantoolboxes:promo-dismissed` (whether this visitor
already closed it). Both reads are wrapped so a `SecurityError` in private
browsing degrades to "no cache" rather than throwing.

#### Visual design

- Full-bleed `var(--color-accent)` background, `var(--color-white)` text.
- Small uppercase Manrope with positive letter-spacing; square edges (no radius),
  consistent with the industrial theme.
- 36px tall on desktop, 32px on mobile.
- Small decorative `Tag` icon (lucide-react, already a dependency and already
  the discount idiom in `StatCards`) at the left, `aria-hidden`.
- All values come from existing theme tokens. No new tokens, no raw hex.

## 3. Admin

Mirrors the existing store-wide discount flow so there is no new interaction
model to learn.

### `src/lib/adminApi.js` (extend)

- `fetchPromoBanner()` → `{ enabled, messages }`
- `savePromoBanner({ enabled, messages })`

Both target the `store_settings` singleton (`.eq('id', true)`), matching
`saveStoreDiscount`.

Unlike the product writes, `savePromoBanner` does **not** call
`retryLoad()`. That helper refreshes the storefront product catalogue, which the
banner has nothing to do with — and `/admin` never renders `PromoBanner` at all
(`AppBody` excludes the marketing chrome on that route), so there is no open
view to keep in sync.

### `src/pages/admin/StatCards.jsx` (extend)

A fifth card: **Promo banner**, showing On/Off state and the message count, with
a **Manage banner** button that opens the promo modal. It owns its own state and
modal exactly as the discount card does.

**Required CSS fix:** `.admin-statcards` is currently a hardcoded
`grid-template-columns: repeat(4, 1fr)` with two override breakpoints
(`1fr 1fr` at ≤970px, `1fr` at ≤560px). A fifth card would leave one item
stranded on a second row. Replace all three rules with a single
`repeat(auto-fit, minmax(210px, 1fr))`, which yields 5 / 3 / 2 / 1 columns as
the viewport narrows and removes both media queries.

### `src/pages/admin/AdminModal.jsx` (new — small refactor)

`DiscountModal` contains ~40 lines of dialog plumbing (Esc-to-close, backdrop,
body scroll lock, focus the close button, restore focus on exit,
`AnimatePresence` exit animation). The promo modal needs byte-identical
behaviour.

Extract that shell into `AdminModal.jsx` taking `{ open, title, onClose,
children }`, and re-point `DiscountModal` at it. This is a targeted improvement
to code being worked in, not speculative refactoring — the alternative is
copy-pasting the plumbing a second time and letting the two drift.

Framer-motion stays in use here: the admin route is already lazy-loaded and off
the storefront's critical path.

### `src/pages/admin/PromoBannerForm.jsx` (new)

Rendered inside an `AdminModal`. Contains:

- An on/off toggle for `promo_enabled`.
- An editable list of messages: edit in place, remove, and add (capped at 6,
  with the add button disabled at the cap).
- A **live preview** of the real green bar, rendering whatever is currently in
  the form, so the result is visible before saving.
- Save button with busy / success / error states, matching `StoreDiscount`.

**Out of scope for v1:** reordering messages (with ≤6 short strings, retyping is
faster than building drag handles), per-message scheduling, per-message links,
and a configurable rotation interval.

## 4. Testing

New `src/test/promoBanner.test.jsx`:

- Renders nothing when disabled, and nothing when the message list is empty.
- Renders every message into the DOM when enabled.
- Advances the visible message on a 5s interval (fake timers).
- Does not create an interval for a single message.
- Dismiss hides the banner and persists the signature to `localStorage`.
- A dismissed banner stays hidden for the same signature, and re-appears once
  the message set changes.

New `src/test/promoStore.test.js`:

- Normalizes malformed data (non-array, non-string entries, blanks, >6 entries).
- A fetch failure resolves to disabled rather than throwing.

Extend `src/test/a11y.test.jsx` to cover the banner in its enabled, rotating
state.

## 5. Verification

Beyond the standard `yarn lint && yarn format:check && yarn test && yarn build`:

1. Apply the migration; confirm the site is unchanged (banner off by default).
2. Enable in `/admin` with two messages; confirm rotation, crossfade, and loop.
3. Confirm the banner scrolls away and the navbar still pins correctly — on the
   home route (transparent-over-hero navbar) and on an interior route.
4. Dismiss it; reload; confirm it stays hidden. Edit a message in `/admin`;
   reload; confirm it returns.
5. Check 375 / 768 / 1280px widths, and the admin stat-card grid at each.
6. Lighthouse on `yarn preview`: performance ≥ 90, SEO ≥ 95, a11y ≥ 90.
7. Verify with reduced motion enabled that messages swap without animating.
