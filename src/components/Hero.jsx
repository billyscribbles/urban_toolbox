import { Link } from 'react-router-dom'
import { hero } from '../content/hero.js'
import Eyebrow from './Eyebrow.jsx'
import SmartLink from './SmartLink.jsx'
import './Hero.css'

// Full-bleed home hero. The caravan photo is a CSS background on the section
// (faded to white on the left by an overlay gradient); content sits above it.
export default function Hero() {
  return (
    <section className="hero">
      <img
        className="hero__img"
        src={hero.image}
        srcSet={`${hero.imageMobile} 900w, ${hero.image} 1600w`}
        sizes="100vw"
        alt={hero.imageAlt}
        width={1600}
        height={900}
        fetchPriority="high"
        decoding="async"
      />
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
