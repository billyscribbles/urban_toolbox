# Image-Led Diagonal Hero + Category Carousel

**Date:** 2026-07-15
**Status:** Approved by Billy (client-requested homepage redesign)

## Goal

Rework the homepage fold to match the client's reference (T.C Boxes): imagery
dominates. Two photos fill the hero, meeting on a diagonal seam — a caravan
shot on the left (where the reference has its dark logo panel) and a ute shot
on the right. Text shrinks to headline + tagline. Below the hero, a slow
auto-scrolling carousel of product-category tiles replaces the trust strip in
the fold; hovering pauses it.

## 1. Hero — rework `HeroSplit`

**Layout (desktop, >760px):**

- Two photos fill the entire hero area. The left photo (caravan) covers the
  full hero; the right photo (ute) sits on top, clipped with a CSS `clip-path`
  polygon so its left edge is a diagonal seam (top edge ~55% across, bottom
  edge ~40% across — same lean as the reference).
- The existing crossfading-slides mechanism is removed from the hero (the
  carousel below provides the motion). Both images render statically.
- Text: `hero.headline` + `hero.headlineLine2` (uppercase display face) and the
  green `hero.tagline`, tucked top-left over the caravan photo. A soft dark
  scrim behind the text block keeps it legible (the current white-halo
  approach is retained or swapped for a localized gradient scrim — whichever
  reads cleanly over the final photo).
- Removed entirely: `subheadline` paragraph, both CTA buttons. The content
  file keeps `subheadline`/CTA fields harmless-to-remove; fields that are no
  longer rendered are deleted from `src/content/hero.js` so the contract stays
  honest.
- `hero.media` gains a two-image shape:
  ```js
  media: {
    left:  { img: '/brand/hero-caravan-left.jpg',  alt: '' },  // decorative, alt on section
    right: { img: '/brand/hero-ute-right.jpg' },
  }
  ```
- The hero remains the LCP element. The `index.html` preload is updated to the
  new left image and its widths/sizes.

**Mobile (≤760px):** the diagonal doesn't read at narrow widths — the two
photos stack vertically (caravan on top, ute below), each ~50% of the hero
height, with the text block over the top image on a vertical scrim.

**Motion prefs:** the hero is now static, so no reduced-motion branch is
needed in the hero itself.

## 2. Hero images — generated

Two matching photos generated with the image-gen MCP tool so lighting and
tone blend at the seam. Shared art direction: golden-hour Australian bush /
outback setting, consistent colour grade, black powder-coated aluminium gear.

- **Left:** black checkerplate/flat aluminium toolbox mounted on a caravan
  drawbar, caravan prominent, angled so visual weight sits left-of-centre.
- **Right:** black dual-cab ute with canopy/toolbox, rear three-quarter view
  (mirroring the reference), visual weight right-of-centre.

Fallbacks if generation quality disappoints: existing `hero-caravan.jpg` /
`hero-caravan-toolbox.jpg` / `ute-hero.jpg`. Billy picks the winners before
ship. Final files land in `public/brand/` and get the same 800/1600 webp
derivatives as existing hero assets.

## 3. Category carousel — new `CategoryCarousel` component

**Placement:** directly under the hero inside `.hero-fold`, replacing
`TrustBar` there. `TrustBar` moves below `WhatWeBuild` on the Home page (the
component itself is unchanged).

**Content:** a new `src/content/homeCarousel.js` exports a curated tile list —
`{ label, img, imgAlt, to }` per tile — for the seven mid-level families:

| Label | Route |
| --- | --- |
| Under Tray Toolboxes | `/toolboxes/under-tray-toolboxes` |
| Top Opening Toolboxes | `/toolboxes/top-opening-toolboxes` |
| Side Opening Toolboxes | `/toolboxes/side-opening-toolboxes` |
| Truck Toolboxes | `/toolboxes/truck-toolboxes` |
| Dog Boxes | `/toolboxes/dog-boxes` |
| Toolbox Canopies | `/toolboxes/toolbox-canopies` |
| Accessories | `/accessories` |

Tile images are representative product shots picked from
`/public/images/` + `/public/images/catalog/` (existing assets; no new
generation needed).

**Look:** light strip (matching the reference's light-grey band), each tile a
product photo above an uppercase label. Tiles are `<Link>`s.

**Motion:** continuous slow marquee.

- The tile track renders twice inside an overflow-hidden viewport; a CSS
  `@keyframes` loop translates the track `-50%` over ~40s, so the loop is
  seamless and GPU-cheap. No JS timer.
- `:hover` and `:focus-within` on the viewport set
  `animation-play-state: paused`.
- `@media (prefers-reduced-motion: reduce)`: animation disabled; the strip
  becomes a normal horizontally scrollable row (single track — the duplicate
  is `aria-hidden` and display-none'd in this mode so screen readers and
  keyboard users never meet duplicate links).
- The duplicated track is always `aria-hidden="true"` with `tabindex="-1"` on
  its links so keyboard/AT users encounter each tile exactly once.

## 4. Out of scope

- No changes to `TrustBar` internals, `WhatWeBuild`, `Process`, `Capability`,
  `CtaBand`, or any route.
- No theme-token changes; existing greens/inks/off-whites are reused.
- No new pages.

## 5. Testing & verification

- **Contract tests** (`src/test/`): update the `hero.js` shape assertions to
  the new `media.left`/`media.right` shape; add a `homeCarousel.js` test that
  every tile `to` resolves to a real catalog category route and every `img`
  file exists.
- **a11y:** existing axe suite runs over Home; verify the carousel introduces
  no violations (duplicate-track hidden, links labelled).
- **LCP:** `index.html` preload updated to the new left hero image; confirm
  widths/sizes stay in step with the component.
- **Manual:** hover pauses the marquee; reduced-motion shows a static
  scrollable row; 375/768/1280px layouts clean; every carousel tile navigates.
- Full gate: `yarn lint && yarn format:check && yarn test && yarn build`,
  Lighthouse thresholds (perf ≥ 90, SEO ≥ 95, a11y ≥ 90).
