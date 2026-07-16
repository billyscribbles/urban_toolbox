import { Link } from 'react-router-dom'
import { homeCarousel, rangeSection } from '../content/homeCarousel.js'
import Eyebrow from './Eyebrow.jsx'
import Img from './Img.jsx'
import './CategoryCarousel.css'

// Cards render at up to ~230px, so the 400px catalog derivative covers 1x/2x.
const TILE_SIZES = '230px'

// One visible track plus enough aria-hidden duplicates that the belt is always
// wider than the viewport, so the loop never exposes its own tail as a gap. The
// CSS keyframe translates the belt by exactly one track width (-100% /
// TRACK_COUNT) — keep the two in step or the loop stutters.
const TRACK_COUNT = 4

// Home range carousel: the "Built for every adventure" strip. A seamless,
// continuously rotating marquee of product-category cards on a pure-CSS loop —
// no JS timer, and it keeps moving regardless of the OS "reduce motion" setting.
// Hover or keyboard focus pauses it.
//
// Duplicate tracks are purely visual — aria-hidden with untabbable links — so
// the keyboard and screen readers meet each category exactly once.
export default function CategoryCarousel() {
  const track = (hidden, key) => (
    <ul className="range__track" aria-hidden={hidden || undefined} key={key}>
      {homeCarousel.map((tile) => (
        <li className="range__tile" key={tile.to}>
          <Link to={tile.to} className="range__card" tabIndex={hidden ? -1 : undefined}>
            <span className="range__media">
              <Img
                className="range__img"
                src={tile.img}
                alt=""
                sizes={TILE_SIZES}
                width={400}
                height={300}
              />
            </span>
            <span className="range__label">{tile.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  )

  return (
    <section className="range">
      <div className="container">
        <div className="range__head">
          <Eyebrow>{rangeSection.eyebrow}</Eyebrow>
          <h2 className="h2 h2--md range__heading">{rangeSection.heading}</h2>
        </div>
      </div>
      <div className="range__viewport">
        <div className="range__belt">
          {track(false, 'visible')}
          {Array.from({ length: TRACK_COUNT - 1 }, (_, i) => track(true, `dup-${i}`))}
        </div>
      </div>
    </section>
  )
}
