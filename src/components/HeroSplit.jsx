import { Link } from 'react-router-dom'
import { hero } from '../content/hero.js'
import Img from './Img.jsx'
import './HeroSplit.css'

// The photo paints above the fold and is the LCP element; the preload in
// index.html must stay in step with these widths and sizes. The derivative
// pipeline commits 800/1600 webp files for every `public/brand/hero-*`
// original.
const HERO_WIDTHS = [800, 1600]
const PHOTO_SIZES = '(max-width: 760px) 100vw, 70vw'

// Home hero: dark and image-led. A near-black panel holds the text on the
// left; the feature photo fills the right and is clipped so the two meet on a
// slanted seam, like the reference design. On phones the diagonal doesn't
// read, so the panel and photo stack vertically instead.
export default function HeroSplit() {
  const { photo } = hero.media
  return (
    <section className="hero-split">
      <div className="hero-split__media" aria-hidden="true">
        <Img
          className="hero-split__img"
          src={photo.img}
          alt=""
          widths={HERO_WIDTHS}
          sizes={PHOTO_SIZES}
          loading="eager"
          fetchPriority="high"
        />
      </div>

      <div className="container hero-split__inner">
        <div className="hero-split__content">
          <h1 className="hero-split__title">
            {hero.headline}
            <br />
            {hero.headlineLine2}
          </h1>
          {hero.tagline && <p className="hero-split__tagline">{hero.tagline}</p>}
          {hero.cta && (
            <Link to={hero.cta.to} className="btn hero-split__cta">
              {hero.cta.label} →
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
