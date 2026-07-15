import { Link } from 'react-router-dom'
import Img from './Img.jsx'

// One half of the split hero: a full-bleed background photo under a dark scrim,
// with the eyebrow / heading / description / CTA stacked lower-left. Styling
// lives in SplitHero.css (shared with the container).
//
// The panel fills ~half the viewport, so the 800/1600 brand derivatives cover
// 1x and 2x.
const PANEL_WIDTHS = [800, 1600]
const PANEL_SIZES = '(max-width: 760px) 100vw, 50vw'

export default function HeroPanel({ panel }) {
  return (
    <article className={`hero-panel hero-panel--${panel.key}`}>
      <Img
        className="hero-panel__img"
        src={panel.img}
        alt={panel.alt}
        widths={PANEL_WIDTHS}
        sizes={PANEL_SIZES}
        loading="eager"
        fetchPriority="high"
      />
      <div className="hero-panel__body">
        <p className="hero-panel__eyebrow">{panel.eyebrow}</p>
        <h2 className="hero-panel__heading">{panel.heading}</h2>
        <p className="hero-panel__desc">{panel.description}</p>
        <Link to={panel.cta.to} className="hero-panel__cta">
          {panel.cta.label}
          <span className="hero-panel__arrow" aria-hidden="true">
            →
          </span>
        </Link>
      </div>
    </article>
  )
}
