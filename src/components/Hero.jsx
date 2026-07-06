import { Link } from 'react-router-dom'
import { hero } from '../content/hero.js'
import Eyebrow from './Eyebrow.jsx'
import './Hero.css'

// Full-bleed home hero. The caravan photo is a CSS background on the section
// (faded to white on the left by an overlay gradient); content sits above it.
export default function Hero() {
  return (
    <section
      className="hero"
      style={{ backgroundImage: `url('${hero.image}')` }}
      aria-label={hero.imageAlt}
    >
      <div className="hero__overlay" aria-hidden="true" />
      <div className="container hero__inner">
        <div className="hero__content">
          <Eyebrow>{hero.eyebrow}</Eyebrow>
          <h1 className="hero__title">
            {hero.headline}
            <br />
            {hero.headlineLine2}
          </h1>
          <p className="hero__sub">{hero.subheadline}</p>
          <div className="hero__actions">
            <a href={hero.primaryCta.to} className="btn btn--green">
              {hero.primaryCta.label} →
            </a>
            <Link to={hero.secondaryCta.to} className="btn btn--outline">
              {hero.secondaryCta.label} →
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
