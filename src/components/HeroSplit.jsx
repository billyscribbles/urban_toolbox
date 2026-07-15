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
