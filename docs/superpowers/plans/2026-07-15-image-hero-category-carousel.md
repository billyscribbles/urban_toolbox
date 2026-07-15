# Image-Led Diagonal Hero + Category Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the homepage fold so two photos (caravan left, ute right) meet on a diagonal seam with minimal text, and add a slow auto-scrolling category-tile carousel that pauses on hover, replacing the trust strip in the fold.

**Architecture:** `HeroSplit` drops its crossfade-slides mechanism and renders two static full-cover images, the right one clipped by a CSS `clip-path` diagonal. A new `CategoryCarousel` component renders a duplicated tile track animated by a pure-CSS marquee, driven by a new `src/content/homeCarousel.js` content file. `TrustBar` moves below `WhatWeBuild` on Home.

**Tech Stack:** React 18 + Vite, plain CSS with theme CSS variables, React Router v7 `<Link>`, Vitest + Testing Library + axe, existing `Img` WebP-srcset component, `yarn images` (cwebp) derivative pipeline.

**Spec:** `docs/superpowers/specs/2026-07-15-image-hero-category-carousel-design.md`

## Global Constraints

- No Tailwind, no styled-components, no TypeScript — plain CSS + JSX only.
- No new design tokens; reuse existing CSS variables (`--color-accent`, `--color-off-white`, `--color-ink-strong`, `--font-display`). Soft rgba scrims written inline are the established precedent in `HeroSplit.css`.
- No client strings in components — all copy lives in `src/content/*.js`.
- Content files are rewritten in place, never deleted.
- CI gate: `yarn lint && yarn format:check && yarn test && yarn build` all pass; Lighthouse perf ≥ 90, SEO ≥ 95, a11y ≥ 90.
- Commits are atomic, one per task, ending with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Generate and commit the two hero photos

**Files:**

- Create: `public/brand/hero-caravan-left.jpg` (+ generated `-800.webp` / `-1600.webp`)
- Create: `public/brand/hero-ute-right.jpg` (+ generated `-800.webp` / `-1600.webp`)

**Interfaces:**

- Produces: the two image paths `/brand/hero-caravan-left.jpg` and `/brand/hero-ute-right.jpg` that Task 2's content file references. Filenames MUST start with `hero-` (the derivative script only processes `^hero-` files in `public/brand`).

**Note:** This task is asset generation, not code — no TDD cycle. It must run in the **main session** (the image-gen MCP tools live there). If you are a subagent and cannot reach `mcp__image-gen__generate_image` via ToolSearch, STOP and report back so the orchestrator does this task inline.

- [ ] **Step 1: Generate the left (caravan) photo**

Load the image-gen tools via ToolSearch (`select:mcp__image-gen__generate_image,mcp__image-gen__get_last_image_info`), then generate with a prompt equivalent to:

> Wide photorealistic shot, golden-hour Australian bush campsite. A modern white caravan parked among gum trees, with a black powder-coated aluminium checkerplate toolbox mounted on its A-frame drawbar, toolbox clearly visible. The caravan fills the LEFT two-thirds of the frame; the right third is soft bush background. Warm low sun from the left, long shadows, consistent warm colour grade, no people, no text, no logos. Landscape 16:9, high detail.

Aim for ≥1600px width output. Save/copy the result to `public/brand/hero-caravan-left.jpg`.

- [ ] **Step 2: Generate the right (ute) photo**

Same session, matching grade:

> Wide photorealistic shot, same golden-hour Australian bush setting and warm colour grade as a matching campsite scene. A black dual-cab ute with a black aluminium canopy toolbox on its tray, seen from the rear three-quarter angle, parked on a red-dirt track among gum trees. The ute sits in the RIGHT two-thirds of the frame; the left third is soft bush background. Warm low sun, long shadows, no people, no text, no logos. Landscape 16:9, high detail.

Save/copy to `public/brand/hero-ute-right.jpg`.

- [ ] **Step 3: Visually review both images**

Read both files (they render as images). Reject and regenerate any with: warped geometry on the caravan/ute, text-like artefacts, mismatched lighting direction, or a subject centred where the seam will cut it (left photo's subject must sit left-of-centre, right photo's right-of-centre).

Fallback if generation quality disappoints after 2–3 attempts per side: copy existing assets instead —

```bash
cp public/brand/hero-caravan.jpg public/brand/hero-caravan-left.jpg
cp public/brand/hero-caravan-toolbox.jpg public/brand/hero-ute-right.jpg
```

- [ ] **Step 4: Generate WebP derivatives**

```bash
cd /Users/billyhuynh/Github/urban_toolbox && yarn images
```

Expected: prints generated files including `hero-caravan-left-800.webp`, `hero-caravan-left-1600.webp`, `hero-ute-right-800.webp`, `hero-ute-right-1600.webp`. Verify:

```bash
ls public/brand/ | grep -E "hero-(caravan-left|ute-right)"
```

Expected: 6 files (2 originals + 4 webp).

- [ ] **Step 5: Commit**

```bash
git add public/brand/hero-caravan-left* public/brand/hero-ute-right*
git commit -m "feat: two matched hero photos (caravan left, ute right)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Reshape `hero.js` content to the two-image contract

**Files:**

- Modify: `src/content/hero.js` (full rewrite in place)
- Test: `src/test/content.test.js` (replace the existing `hero has a headline and a primary CTA` test)

**Interfaces:**

- Consumes: image paths from Task 1.
- Produces: `hero = { headline, headlineLine2, tagline, media: { left: { img, alt }, right: { img, alt } } }` — the exact shape Task 3's component renders. `subheadline`, `eyebrow`, `primaryCta`, `secondaryCta`, and `media.slides` are GONE.

- [ ] **Step 1: Replace the hero contract test**

In `src/test/content.test.js`, replace the block:

```js
it('hero has a headline and a primary CTA', () => {
  expect(hero.headline).toBeTruthy()
  expect(hero.primaryCta.label).toBeTruthy()
  expect(hero.primaryCta.to).toBeTruthy()
})
```

with:

```js
it('hero has a headline, tagline, and two hero photos on disk', () => {
  expect(hero.headline).toBeTruthy()
  expect(hero.headlineLine2).toBeTruthy()
  expect(hero.tagline).toBeTruthy()
  for (const side of ['left', 'right']) {
    const { img } = hero.media[side]
    expect(img).toMatch(/^\/brand\/hero-/)
    expect(existsSync(join(process.cwd(), 'public', img))).toBe(true)
  }
})
```

Add to the imports at the top of the file:

```js
import { existsSync } from 'node:fs'
import { join } from 'node:path'
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn vitest run src/test/content.test.js -t "hero has"`
Expected: FAIL — `hero.media.left` is undefined (current file has `media.slides`).

- [ ] **Step 3: Rewrite `src/content/hero.js`**

Full new contents:

```js
// Home hero. Image-led: two photos fill the hero and meet on a diagonal seam
// (caravan left, ute right — see HeroSplit.jsx/.css). Text is deliberately
// minimal — an uppercase two-line H1 plus the green tagline, tucked top-left.
// The category carousel below the hero carries the wayfinding, so there are
// no CTAs or body copy here.
export const hero = {
  headline: 'Custom Caravan',
  headlineLine2: 'Toolboxes',
  // Green accent line under the headline.
  tagline: 'Built to work. Ready to roam.',
  // Both photos render decoratively (empty alt) — the H1 carries the meaning.
  // `alt` is kept in content as the human-readable description of each asset.
  media: {
    left: {
      img: '/brand/hero-caravan-left.jpg',
      alt: 'Caravan with a black aluminium toolbox mounted on the drawbar, golden-hour bush campsite',
    },
    right: {
      img: '/brand/hero-ute-right.jpg',
      alt: 'Black dual-cab ute with aluminium canopy toolbox on a red-dirt track',
    },
  },
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn vitest run src/test/content.test.js`
Expected: hero test PASSES. (`HeroSplit.jsx` still references the old fields — the full suite may fail; that's Task 3. Only this file's tests must pass here.)

- [ ] **Step 5: Commit**

```bash
git add src/content/hero.js src/test/content.test.js
git commit -m "feat: hero content reshaped to two-image contract

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Rework `HeroSplit` — diagonal two-image layout, minimal text

**Files:**

- Modify: `src/components/HeroSplit.jsx` (full rewrite)
- Modify: `src/components/HeroSplit.css` (full rewrite)
- Modify: `index.html:15-23` (LCP preload)
- Test: `src/test/a11y.test.jsx` (existing Home axe test — no edits expected, must pass)

**Interfaces:**

- Consumes: `hero` shape from Task 2.
- Produces: `<HeroSplit />` (default export, no props) rendered by `src/pages/Home.jsx` — unchanged call-site.

- [ ] **Step 1: Rewrite `src/components/HeroSplit.jsx`**

Full new contents:

```jsx
import { hero } from '../content/hero.js'
import Img from './Img.jsx'
import './HeroSplit.css'

// Both photos paint above the fold. The derivative pipeline commits 800/1600
// webp files for every `public/brand/hero-*` original.
const HERO_WIDTHS = [800, 1600]
// The left photo is the LCP element and underlays the full hero on desktop;
// the preload in index.html must stay in step with these widths and sizes.
const LEFT_SIZES = '100vw'
// The right photo is clipped to roughly the right half by the diagonal seam.
const RIGHT_SIZES = '(max-width: 760px) 100vw, 65vw'

// Home hero: image-led. The caravan photo fills the hero; the ute photo sits
// on top clipped to a diagonal wedge on the right, so the two meet on a
// slanted seam. Text is a small block top-left — H1 + green tagline, no CTAs.
// On phones the diagonal doesn't read, so the photos stack vertically instead.
export default function HeroSplit() {
  const { left, right } = hero.media
  return (
    <section className="hero-split">
      <div className="hero-split__media" aria-hidden="true">
        <Img
          className="hero-split__img hero-split__img--left"
          src={left.img}
          alt=""
          widths={HERO_WIDTHS}
          sizes={LEFT_SIZES}
          loading="eager"
          fetchPriority="high"
        />
        <Img
          className="hero-split__img hero-split__img--right"
          src={right.img}
          alt=""
          widths={HERO_WIDTHS}
          sizes={RIGHT_SIZES}
          loading="eager"
        />
      </div>

      <div className="hero-split__scrim" aria-hidden="true" />

      <div className="container hero-split__inner">
        <div className="hero-split__content">
          <h1 className="hero-split__title">
            {hero.headline}
            <br />
            {hero.headlineLine2}
          </h1>
          {hero.tagline && <p className="hero-split__tagline">{hero.tagline}</p>}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Rewrite `src/components/HeroSplit.css`**

Full new contents:

```css
/* Hero + category carousel together fill exactly one viewport (below the 79px
   sticky navbar): the hero grows to fill, so the carousel strip lands flush on
   the bottom edge of the screen. */
.hero-fold {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 79px);
  min-height: calc(100svh - 79px);
}

.hero-split {
  position: relative;
  /* Grow to fill the fold above the carousel strip. */
  flex: 1 1 auto;
  min-height: 520px;
  overflow: hidden;
  background: var(--color-ink-strong);
}

.hero-split__media {
  position: absolute;
  inset: 0;
}

.hero-split__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Caravan photo underlays the whole hero, anchored left so the drawbar
   toolbox stays in frame as the seam eats the right side. */
.hero-split__img--left {
  object-position: left center;
}

/* Ute photo sits on top, clipped to a right-hand wedge. The seam leans the
   same way as the reference: further right at the top, further left at the
   bottom. */
.hero-split__img--right {
  object-position: right center;
  clip-path: polygon(55% 0, 100% 0, 100% 100%, 40% 100%);
}

/* Corner scrim: darkens the top-left area behind the text block so the
   headline reads over the photo, clearing quickly to keep the imagery
   dominant. */
.hero-split__scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    118deg,
    rgba(13, 13, 13, 0.62) 0%,
    rgba(13, 13, 13, 0.42) 22%,
    rgba(13, 13, 13, 0.14) 38%,
    rgba(13, 13, 13, 0) 52%
  );
}

.hero-split__inner {
  position: relative;
  width: 100%;
  padding-top: 56px;
  padding-bottom: 56px;
}

.hero-split__content {
  max-width: 560px;
}

.hero-split__title {
  font-family: var(--font-display);
  font-size: clamp(36px, 4.4vw, 60px);
  line-height: 0.95;
  letter-spacing: 0.01em;
  text-transform: uppercase;
  color: var(--color-off-white);
  margin: 0 0 14px;
  font-weight: 400;
}

/* Green accent line under the headline. */
.hero-split__tagline {
  font-family: var(--font-display);
  font-size: clamp(17px, 2.1vw, 24px);
  line-height: 1.1;
  letter-spacing: 0.01em;
  text-transform: uppercase;
  color: var(--color-accent);
  font-weight: 400;
  margin: 0;
}

/* Navbar shrinks to 60px at ≤700px — match the fold offset so the carousel
   strip still lands flush on the bottom edge of the screen. */
@media (max-width: 700px) {
  .hero-fold {
    min-height: calc(100vh - 60px);
    min-height: calc(100svh - 60px);
  }
}

/* Phones: the diagonal doesn't read at narrow widths — stack the two photos
   vertically (caravan top, ute bottom) with the text over the top image. */
@media (max-width: 760px) {
  .hero-split {
    min-height: 560px;
  }
  .hero-split__img--left {
    inset: 0 0 50% 0;
    height: 50%;
    object-position: center;
  }
  .hero-split__img--right {
    inset: 50% 0 0 0;
    height: 50%;
    clip-path: none;
    object-position: center;
  }
  .hero-split__scrim {
    background: linear-gradient(
      180deg,
      rgba(13, 13, 13, 0.6) 0%,
      rgba(13, 13, 13, 0.32) 30%,
      rgba(13, 13, 13, 0) 48%
    );
  }
  .hero-split__inner {
    padding-top: 34px;
    padding-bottom: 34px;
  }
}
```

- [ ] **Step 3: Update the LCP preload in `index.html`**

Replace the existing hero preload `<link>` (the `href`/`imagesrcset`/`imagesizes` attributes) with:

```html
<link
  rel="preload"
  as="image"
  type="image/webp"
  href="/brand/hero-caravan-left-1600.webp"
  imagesrcset="/brand/hero-caravan-left-800.webp 800w, /brand/hero-caravan-left-1600.webp 1600w"
  imagesizes="100vw"
  fetchpriority="high"
/>
```

Keep the surrounding comment; the widths/sizes now mirror `LEFT_SIZES` in `HeroSplit.jsx`.

- [ ] **Step 4: Run the full test suite**

Run: `yarn test`
Expected: PASS — no remaining references to `hero.media.slides` / `hero.primaryCta` anywhere. If a test still references removed hero fields, fix that test to the new contract (grep first: `grep -rn "primaryCta\|media.slides\|subheadline" src/`).

- [ ] **Step 5: Visual smoke check**

Run `yarn dev` in the background, screenshot `http://localhost:5173/` at 1280px and 375px widths (Chrome DevTools MCP or playwright-skill). Verify: diagonal seam visible on desktop with both photos; stacked photos on mobile; headline + tagline legible top-left; no CTA buttons.

- [ ] **Step 6: Commit**

```bash
git add src/components/HeroSplit.jsx src/components/HeroSplit.css index.html
git commit -m "feat: image-led diagonal two-photo hero, minimal text

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: `homeCarousel.js` content file + contract test

**Files:**

- Create: `src/content/homeCarousel.js`
- Test: `src/test/content.test.js` (append one test to the existing describe block)

**Interfaces:**

- Consumes: `getCategoryBySlug` from `src/lib/catalog.js` (test only).
- Produces: `homeCarousel` — array of `{ label, img, imgAlt, to }` that Task 5's `CategoryCarousel` maps over.

- [ ] **Step 1: Write the failing contract test**

Append inside the `describe('content — section copy contract', ...)` block in `src/test/content.test.js`:

```js
it('homeCarousel tiles route to real categories and their images exist', () => {
  expect(homeCarousel.length).toBeGreaterThanOrEqual(5)
  for (const tile of homeCarousel) {
    expect(tile.label).toBeTruthy()
    expect(tile.imgAlt).toBeTruthy()
    // Route must be a real category page: /accessories or /toolboxes/<slug>.
    const slug = tile.to.replace(/^\//, '').split('/').pop()
    expect(getCategoryBySlug(slug), `no category for route ${tile.to}`).toBeTruthy()
    expect(existsSync(join(process.cwd(), 'public', tile.img)), `missing image ${tile.img}`).toBe(
      true,
    )
  }
})
```

Add to the imports: `import { homeCarousel } from '../content/homeCarousel.js'` (the `existsSync`/`join`/`getCategoryBySlug` imports already exist after Task 2).

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run src/test/content.test.js -t "homeCarousel"`
Expected: FAIL — cannot resolve `../content/homeCarousel.js`.

- [ ] **Step 3: Create `src/content/homeCarousel.js`**

Full contents:

```js
// Home category carousel — the tile strip under the hero. One tile per
// mid-level product family, each linking to its category page. Images are
// representative product shots from the catalog assets.
//
// Contract (src/test/content.test.js): every `to` must resolve to a real
// catalog category slug, and every `img` must exist under public/.
export const homeCarousel = [
  {
    label: 'Under Tray Toolboxes',
    img: '/images/catalog/ute-under-tray-boxes-1.jpg',
    imgAlt: 'Aluminium checkerplate under tray ute toolbox',
    to: '/toolboxes/under-tray-toolboxes',
  },
  {
    label: 'Top Opening Toolboxes',
    img: '/images/catalog/rectangle-ute-toolbox-1.jpg',
    imgAlt: 'Rectangle top opening aluminium ute toolbox',
    to: '/toolboxes/top-opening-toolboxes',
  },
  {
    label: 'Side Opening Toolboxes',
    img: '/images/catalog/half-lid-opening-1.jpg',
    imgAlt: 'Half lid side opening aluminium toolbox',
    to: '/toolboxes/side-opening-toolboxes',
  },
  {
    label: 'Truck Toolboxes',
    img: '/images/catalog/under-truck-tool-boxes-1.jpg',
    imgAlt: 'Aluminium under truck toolbox',
    to: '/toolboxes/truck-toolboxes',
  },
  {
    label: 'Dog Boxes',
    img: '/images/catalog/full-dog-boxes-1.jpg',
    imgAlt: 'Aluminium full dog box with ventilation panels',
    to: '/toolboxes/dog-boxes',
  },
  {
    label: 'Toolbox Canopies',
    img: '/images/catalog/toolbox-canopies-1.jpg',
    imgAlt: 'Aluminium toolbox canopy',
    to: '/toolboxes/toolbox-canopies',
  },
  {
    label: 'Accessories',
    img: '/images/catalog/drawer-units-1.jpg',
    imgAlt: 'Toolbox drawer unit accessory',
    to: '/accessories',
  },
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn vitest run src/test/content.test.js`
Expected: PASS (all content tests).

- [ ] **Step 5: Commit**

```bash
git add src/content/homeCarousel.js src/test/content.test.js
git commit -m "feat: home category carousel content + contract test

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: `CategoryCarousel` component + Home integration

**Files:**

- Create: `src/components/CategoryCarousel.jsx`
- Create: `src/components/CategoryCarousel.css`
- Modify: `src/pages/Home.jsx`
- Test: `src/test/components.test.jsx` (append a describe block)

**Interfaces:**

- Consumes: `homeCarousel` from Task 4; `Img` component; router `<Link>`.
- Produces: `<CategoryCarousel />` (default export, no props). Home renders it inside `.hero-fold` after `<HeroSplit />`; `<TrustBar />` moves after `<WhatWeBuild />`.

- [ ] **Step 1: Write the failing component test**

Append to `src/test/components.test.jsx` (match the file's existing render/imports pattern — it renders components inside `MemoryRouter`/`HelmetProvider` as its other suites do):

```jsx
describe('CategoryCarousel', () => {
  it('renders every tile as a link once for keyboard/AT users', () => {
    render(
      <MemoryRouter>
        <CategoryCarousel />
      </MemoryRouter>,
    )
    for (const tile of homeCarousel) {
      // The duplicated marquee track is aria-hidden, so each label is
      // accessible exactly once.
      const links = screen.getAllByRole('link', { name: new RegExp(tile.label, 'i') })
      expect(links).toHaveLength(1)
      expect(links[0]).toHaveAttribute('href', tile.to)
    }
  })
})
```

Add imports: `CategoryCarousel` from `../components/CategoryCarousel.jsx`, `homeCarousel` from `../content/homeCarousel.js` (plus `MemoryRouter`/`render`/`screen` if not already imported in that file).

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run src/test/components.test.jsx -t "CategoryCarousel"`
Expected: FAIL — cannot resolve `../components/CategoryCarousel.jsx`.

- [ ] **Step 3: Create `src/components/CategoryCarousel.jsx`**

Full contents:

```jsx
import { Link } from 'react-router-dom'
import { homeCarousel } from '../content/homeCarousel.js'
import Img from './Img.jsx'
import './CategoryCarousel.css'

// Tiles render at a fixed ~200px column regardless of viewport.
const TILE_SIZES = '200px'

// Category strip under the hero: a continuous slow marquee of product-category
// tiles. The track is rendered twice and translated -50% on a CSS loop, so the
// wrap is seamless with no JS timer. Hover or keyboard focus pauses it; users
// with reduced motion get a static, normally-scrollable row instead (the
// duplicate track is display:none'd in that mode via CSS).
//
// The second track is purely visual — aria-hidden with untabbable links — so
// screen readers and the keyboard meet each category exactly once.
export default function CategoryCarousel() {
  const track = (hidden) => (
    <ul className="cat-carousel__track" aria-hidden={hidden || undefined}>
      {homeCarousel.map((tile) => (
        <li className="cat-carousel__tile" key={tile.to}>
          <Link to={tile.to} className="cat-carousel__link" tabIndex={hidden ? -1 : undefined}>
            <Img
              className="cat-carousel__img"
              src={tile.img}
              alt=""
              sizes={TILE_SIZES}
              width={400}
              height={300}
            />
            <span className="cat-carousel__label">{tile.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  )

  return (
    <nav className="cat-carousel" aria-label="Product categories">
      <div className="cat-carousel__viewport">
        <div className="cat-carousel__belt">
          {track(false)}
          {track(true)}
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 4: Create `src/components/CategoryCarousel.css`**

Full contents:

```css
/* Light category strip under the hero — the fold's bottom band. */
.cat-carousel {
  background: var(--color-off-white);
  border-top: 1px solid rgba(13, 13, 13, 0.08);
  padding: 18px 0;
}

.cat-carousel__viewport {
  overflow: hidden;
}

/* Two copies of the track sit side by side; sliding the belt by exactly one
   track width (-50% of the belt) then looping is what makes the marquee
   seamless. */
.cat-carousel__belt {
  display: flex;
  width: max-content;
  animation: cat-carousel-marquee 45s linear infinite;
}

/* Pointer hover or keyboard focus anywhere in the strip freezes it. */
.cat-carousel__viewport:hover .cat-carousel__belt,
.cat-carousel__viewport:focus-within .cat-carousel__belt {
  animation-play-state: paused;
}

@keyframes cat-carousel-marquee {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}

.cat-carousel__track {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
}

.cat-carousel__tile {
  flex: 0 0 auto;
  width: 200px;
  margin: 0 22px;
}

.cat-carousel__link {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}

.cat-carousel__img {
  width: 100%;
  height: 120px;
  object-fit: contain;
  display: block;
}

.cat-carousel__label {
  font-family: var(--font-display);
  font-size: 15px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-ink-strong);
  text-align: center;
}

.cat-carousel__link:hover .cat-carousel__label,
.cat-carousel__link:focus-visible .cat-carousel__label {
  color: var(--color-accent);
}

/* Reduced motion: no marquee — a normal scrollable row, single track. */
@media (prefers-reduced-motion: reduce) {
  .cat-carousel__belt {
    animation: none;
    width: auto;
  }
  .cat-carousel__viewport {
    overflow-x: auto;
  }
  .cat-carousel__track[aria-hidden='true'] {
    display: none;
  }
}

@media (max-width: 700px) {
  .cat-carousel__tile {
    width: 150px;
    margin: 0 14px;
  }
  .cat-carousel__img {
    height: 92px;
  }
  .cat-carousel__label {
    font-size: 13px;
  }
}
```

- [ ] **Step 5: Update `src/pages/Home.jsx`**

Full new contents:

```jsx
import SEO from '../lib/seo.jsx'
import HeroSplit from '../components/HeroSplit.jsx'
import CategoryCarousel from '../components/CategoryCarousel.jsx'
import TrustBar from '../components/TrustBar.jsx'
import WhatWeBuild from '../components/WhatWeBuild.jsx'
import Process from '../components/Process.jsx'
import Capability from '../components/Capability.jsx'
import CtaBand from '../components/CtaBand.jsx'
import { cta } from '../content/cta.js'

export default function Home() {
  return (
    <main>
      <SEO />
      <div className="hero-fold">
        <HeroSplit />
        <CategoryCarousel />
      </div>
      <WhatWeBuild />
      <TrustBar />
      <Process />
      <Capability />
      <CtaBand sub={cta.homeSub} />
    </main>
  )
}
```

- [ ] **Step 6: Run the full test suite (including axe on Home)**

Run: `yarn test`
Expected: PASS — new component test green, `a11y.test.jsx` Home render has no violations.

- [ ] **Step 7: Visual + interaction smoke check**

With `yarn dev` running, at `http://localhost:5173/`: strip auto-scrolls slowly; hovering it stops the motion; mousing off resumes; Tab into a tile pauses it; each of the 7 labels appears; clicking a tile navigates to its category page. Check 375px width: smaller tiles, still scrolling.

- [ ] **Step 8: Commit**

```bash
git add src/components/CategoryCarousel.jsx src/components/CategoryCarousel.css src/pages/Home.jsx src/test/components.test.jsx
git commit -m "feat: auto-scrolling category carousel replaces trust bar in hero fold

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Full verification gate

**Files:**

- No new files; fixes only if the gate finds problems.

**Interfaces:**

- Consumes: everything above.

- [ ] **Step 1: Lint + format**

Run: `yarn lint && yarn format:check`
Expected: both exit 0. If Prettier complains, run `yarn format` and re-check.

- [ ] **Step 2: Tests**

Run: `yarn test`
Expected: full suite PASS.

- [ ] **Step 3: Production build + preview**

Run: `yarn build && yarn preview` (preview in background)
Expected: build succeeds; vendor chunks split as before. Load `http://localhost:4173/` and re-verify hero seam + carousel motion on the production bundle.

- [ ] **Step 4: Lighthouse on preview**

Run Lighthouse against `http://localhost:4173/` (Chrome DevTools MCP `lighthouse_audit`, or `npx lighthouse http://localhost:4173 --preset=desktop --quiet`).
Expected: performance ≥ 90, SEO ≥ 95, a11y ≥ 90. The LCP element should be the left hero image served from the preloaded webp. If perf dips: confirm both hero images are ≤ ~250KB as 1600w webp (regenerate derivatives at lower quality if not).

- [ ] **Step 5: Responsive pass**

At 375 / 768 / 1280px: hamburger works, hero (stacked / diagonal) clean, carousel tiles sized right, footer intact, `/does-not-exist` shows the 404.

- [ ] **Step 6: Report**

Report results with evidence (command output, screenshots) — no vibes. Do NOT deploy; Railway deploy happens only when Billy asks.
