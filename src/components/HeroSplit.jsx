import { Link } from 'react-router-dom'
import { hero } from '../content/hero.js'
import Img from './Img.jsx'
import './HeroSplit.css'

// Showcase cards render at roughly a third of the viewport on desktop, so the
// 800/1600 brand derivatives cover 1x and 2x.
const CARD_WIDTHS = [800, 1600]
const CARD_SIZES = '(max-width: 760px) 50vw, 30vw'

// Home hero: a dark panel holds the headline, green tagline and one outlined
// CTA on the left; two squared showcase cards (caravan, ute) sit on the right.
// On phones the whole thing stacks — text first, then the two cards side by
// side beneath it.
export default function HeroSplit() {
  return (
    <section className="hero-split">
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

        <ul className="hero-split__cards">
          {hero.showcase.map((card) => (
            <li className="hero-card" key={card.label}>
              <Img
                className="hero-card__img"
                src={card.img}
                alt={card.alt}
                widths={CARD_WIDTHS}
                sizes={CARD_SIZES}
                loading="eager"
                fetchPriority="high"
              />
              <span className="hero-card__label">{card.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
