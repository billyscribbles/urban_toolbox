import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { hero } from '../content/hero.js'
import Eyebrow from './Eyebrow.jsx'
import SmartLink from './SmartLink.jsx'
import './HeroSplit.css'

// Home hero: a bright white content panel on the left over a single full-bleed
// feature photo that fills the right. The photos crossfade on a timer, rotating
// between the ute and caravan builds. Rotation pauses for visitors who prefer
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
          <img
            key={i}
            className={`hero-split__img${i === active ? ' is-active' : ''}`}
            src={s.img}
            alt=""
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
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
