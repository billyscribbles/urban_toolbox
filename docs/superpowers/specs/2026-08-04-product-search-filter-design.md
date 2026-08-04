# Product search filter — design

**Date:** 2026-08-04
**Status:** Implemented

## What

A keyword search box on the catalog listing pages that filters the product
grids by title. Typing narrows every section to products whose title contains
all of the typed keywords; sections with no matches disappear; clearing the
box restores the full range.

## Where it lives

`ProductRange` — the shared listing renderer behind `/toolboxes`, every
`/toolboxes/:subSlug` family, `/accessories`, and the vehicle pages
(`/utes`, `/caravans`, `/trucks`). One component change gives every listing
page the filter; no per-page wiring.

## Matching rules

Pure helper in `src/lib/productSearch.js`:

```
filterSections(sections, query) -> sections
```

- Query is trimmed and split on whitespace into keywords.
- Empty/whitespace query returns the sections untouched.
- A product matches when **every** keyword is a case-insensitive substring
  of its `title` (AND semantics — "canopy black" matches "Black Service
  Canopy").
- Each section keeps only matching products; sections left empty are
  dropped.

Titles only, per the brief. No fuzzy matching, no URL param, no debounce —
the catalog is small and filtering is a cheap in-memory pass (YAGNI).

## UI

- A search row rendered directly under the sticky pill sub-nav, above the
  first section, only in the `ready` state (no box over skeletons or the
  error state).
- `<input type="search">` inside a `role="search"` wrapper, labelled
  "Search products" — lucide `Search` icon, existing design tokens only
  (border-light pill, accent focus ring).
- While a query is active, a polite live region announces the match count
  ("6 products match"). Zero matches renders an empty state with the query
  echoed and a "Clear search" button.
- Filtering is plain `useState` local to `ProductRange`. Section stripe
  alternation and vehicle-page group anchors are computed from the
  _visible_ (filtered) list so styling stays consistent.

## Testing

- `src/test/productSearch.test.js` — unit contract for `filterSections`:
  empty query passthrough, case-insensitive match, multi-keyword AND,
  empty-section dropping, zero-match result.
- Same file, component contract: render `ProductRange` with fixture
  sections, type a query, assert non-matching cards disappear, count is
  announced, clearing restores all, and the empty state's clear button
  works.
