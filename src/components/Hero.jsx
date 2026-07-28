import { Link } from 'react-router-dom'
import { hero } from '../content/hero.js'
import Img from './Img.jsx'
import './Hero.css'

// Home hero: one full-bleed photo under a left-weighted scrim, with the page's
// H1 lockup stacked lower-left and the two explore-by-vehicle CTAs beneath it.
//
// The photo is full-bleed at every breakpoint and is the LCP element, so it
// loads eagerly at high priority (mirrored by the preload in index.html) and the
// 800/1600 derivatives cover a phone at 2x through a desktop at 1x.
const HERO_WIDTHS = [800, 1600]
const HERO_SIZES = '100vw'

export default function Hero() {
  return (
    <section className="hero">
      <Img
        className="hero__img"
        src={hero.img}
        alt={hero.alt}
        widths={HERO_WIDTHS}
        sizes={HERO_SIZES}
        loading="eager"
        fetchPriority="high"
      />
      <div className="container hero__inner">
        <p className="hero__eyebrow">{hero.eyebrow}</p>
        <h1 className="hero__heading">
          {hero.headingLines.map((line, i) => (
            // The lines are one sentence pair, not separate headings — <br> keeps
            // them a single accessible name while holding the intended break.
            <span className="hero__line" key={line}>
              {line}
              {i < hero.headingLines.length - 1 ? <br /> : null}
            </span>
          ))}
        </h1>
        <p className="hero__desc">{hero.description}</p>
        <div className="hero__actions">
          {hero.ctas.map((cta, i) => (
            <Link
              key={cta.to}
              to={cta.to}
              // First CTA is the solid white one, the rest are outlined — the
              // pair reads as one primary path with an equal-weight alternative.
              className={`hero__cta ${i === 0 ? 'hero__cta--solid' : 'hero__cta--ghost'}`}
            >
              {cta.label}
              <span className="hero__arrow" aria-hidden="true">
                →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
