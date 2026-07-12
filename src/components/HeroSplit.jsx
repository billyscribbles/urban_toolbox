import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { hero } from '../content/hero.js'
import Eyebrow from './Eyebrow.jsx'
import Img from './Img.jsx'
import SmartLink from './SmartLink.jsx'
import './HeroSplit.css'

// The hero photo is full-bleed on a phone and fills the right ~60% on desktop,
// so it needs bigger derivatives than a card does.
const HERO_WIDTHS = [800, 1600]
const HERO_SIZES = '(max-width: 900px) 100vw, 60vw'

// Home hero: a bright white content panel on the left over a single full-bleed
// feature photo that fills the right. With one slide the photo is static; with
// several they crossfade on a timer. Rotation pauses for visitors who prefer
// reduced motion — they just see the first slide.
export default function HeroSplit() {
  const { slides } = hero.media
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (slides.length < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => {
      setActive((i) => (i + 1) % slides.length)
    }, 6000)
    return () => clearInterval(id)
  }, [slides.length])

  return (
    <section className="hero-split">
      <div className="hero-split__media" aria-hidden="true">
        {slides.map((s, i) => (
          <Img
            key={i}
            className={`hero-split__img${i === active ? ' is-active' : ''}`}
            src={s.img}
            alt=""
            widths={HERO_WIDTHS}
            sizes={HERO_SIZES}
            loading={i === 0 ? 'eager' : 'lazy'}
            // The first slide is the LCP element — matched by the preload in
            // index.html, which must stay in step with these widths and sizes.
            fetchPriority={i === 0 ? 'high' : undefined}
            style={s.pos ? { objectPosition: s.pos } : undefined}
          />
        ))}
      </div>

      <div
        className={`hero-split__scrim${slides[active].scrim === false ? ' is-hidden' : ''}`}
        aria-hidden="true"
      />

      <div className="container hero-split__inner">
        <div className="hero-split__content">
          <Eyebrow>{hero.eyebrow}</Eyebrow>
          <h1 className="hero-split__title">
            {hero.headline}
            <br />
            {hero.headlineLine2}
          </h1>
          {hero.tagline && <p className="hero-split__tagline">{hero.tagline}</p>}
          <p className="hero-split__sub">{hero.subheadline}</p>
          <div className="hero-split__actions">
            <SmartLink to={hero.primaryCta.to} className="btn btn--green">
              {hero.primaryCta.label} →
            </SmartLink>
            <Link to={hero.secondaryCta.to} className="btn btn--outline">
              {hero.secondaryCta.label} →
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
