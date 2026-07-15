# Split-hero homepage reshape — Urban Toolboxes

**Date:** 2026-07-15
**Branch:** `feat/image-hero-category-carousel`
**Status:** Approved — building

## Goal

Reshape the homepage to the rhythm of a premium reference mock: a full-bleed
50/50 photo split hero (Caravan Toolboxes | Ute Toolboxes) followed by an
editorial section flow. Rendered entirely in the existing **Urban Toolboxes**
brand — no brand-token changes.

## Constraints (non-negotiable)

- **Brand tokens unchanged.** Green `#5c8a2f`, Anton display, Barlow body,
  square surfaces. No edits to `theme.config.js`. Buttons stay square (`.btn`),
  not pills.
- Existing stack only: React 18 + Vite + plain CSS + CSS variables. No
  Tailwind / Next / TypeScript / styled-components.
- No client strings, colours or links hardcoded in components — everything
  reads from `src/content/*.js`.
- Semantic HTML, keyboard-navigable, reduced-motion-safe, no horizontal
  overflow, responsive at 375 / 768 / 1280.
- Must pass `yarn lint && yarn format:check && yarn test && yarn build` and
  Lighthouse (perf ≥90, SEO ≥95, a11y ≥90).

## Decisions locked

1. **Both hero panels link to `/toolboxes`.** The catalog has no separate
   caravan category (`/caravan-toolboxes` and `/utes` already redirect to
   `/toolboxes`). The two panels are two _audiences_ for one range.
2. **`Process` and `CategoryCarousel` are dropped from the home composition.**
   Component files stay in the repo; they are just no longer imported by
   `Home.jsx`.
3. **Navbar unchanged.** The existing solid sticky navbar sits above the hero.
   A transparent-overlay header is a possible follow-up, out of scope here.

## Page composition (`src/pages/Home.jsx`)

```
SplitHero          full-bleed 50/50 photo panels
TrustBar           light band, 4 items, outline icons + dividers
IntroSection       "BUILT TO LAST" editorial statement
CategoryFeature ×2 large image-led: Caravan Toolboxes / Ute Toolboxes
FabricationSection laser / folding / custom fabrication
ProjectGallery     large images, minimal labels, click-to-enlarge
FinalCta           photo-backed, two buttons (Quote / View Work)
```

## Components

| Component            | File(s)                           | Notes                                                                                                                                                                   |
| -------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SplitHero`          | `SplitHero.jsx` + `.css`          | Grid of two `HeroPanel`s + centre divider control (`//`, `aria-hidden`).                                                                                                |
| `HeroPanel`          | `HeroPanel.jsx`                   | `Img` bg (`object-fit:cover`), scrim, eyebrow/heading/desc/CTA lower-left. Hover: image scale 1.04, scrim lightens, arrow nudge — `hover:hover` + reduced-motion gated. |
| `TrustBar`           | `TrustBar.jsx` + `.css` (reshape) | Dark strip → light 4-cell band, vertical dividers, green outline icons.                                                                                                 |
| `IntroSection`       | `IntroSection.jsx` + `.css`       | Eyebrow + h2 + paragraph.                                                                                                                                               |
| `CategoryFeature`    | `CategoryFeature.jsx` + `.css`    | Big photo one side, copy the other, alternating via `reverse` prop. Rendered twice.                                                                                     |
| `FabricationSection` | `FabricationSection.jsx` + `.css` | Dark band; workshop photo + 3 capability blurbs + CTA. Uses `capability.js`.                                                                                            |
| `ProjectGallery`     | `ProjectGallery.jsx` + `.css`     | Photo grid, minimal overlay labels, reuses existing `Lightbox`.                                                                                                         |
| `FinalCta`           | `FinalCta.jsx` + `.css`           | Photo-backed band, two square buttons.                                                                                                                                  |

## Content files

- `hero.js` — **rewrite** to `{ panels: [ {key, eyebrow, heading, description, cta:{label,to}, img, alt}, … ] }` (2 panels). Images under `/brand/hero-*`.
- `stats.js` — **expand** 3 → 4 `{value, label}`: Australian Made · Custom Built · Fast Turnaround · Australia-Wide Service.
- `intro.js` — **new** `{eyebrow, heading, body}`.
- `categories.js` — **new** array of 2 feature rows `{key, eyebrow, heading, body, cta:{label,to}, img, alt, reverse}`.
- `gallery.js` — **new** array of `{img, alt, label}` (6 in-situ build photos under `/images`, each with `-400`/`-800` webp derivatives).
- `finalCta.js` — **new** `{heading, sub, primary:{label,to}, secondary:{label,to}}`.
- `capability.js` — reused as-is by `FabricationSection`.

## Test contract (`src/test/content.test.js`)

- **Rewrite** the hero test to the new panel shape: 2 panels, each with
  `eyebrow`, `heading`, `description`, `cta.to` starting `/`, and an `img`
  matching `/^\/brand\/hero-` that exists on disk.
- **Add** contract tests for `categories` (2 rows, cta.to, img on disk) and
  `gallery` (≥4 items, img on disk).
- `stats` test unchanged (still `{value, label}`, now length 4).

## Verification

Drive the running dev server, screenshot at 1280 / 768 / 375, then run the
full gate: `yarn lint && yarn format:check && yarn test && yarn build`.
