import { Link } from 'react-router-dom'
import { homeCarousel } from '../content/homeCarousel.js'
import Img from './Img.jsx'
import './CategoryCarousel.css'

// Tiles render at a fixed ~200px column regardless of viewport.
const TILE_SIZES = '200px'

// One visible track plus enough aria-hidden duplicates that the belt is wider
// than any real viewport (4 tracks × ~1700px ≈ 5100px), so the marquee never
// exposes its own tail as a blank gap. The CSS keyframe translates by exactly
// one track width (-100% / TRACK_COUNT), which is what makes the loop
// seamless — keep the two in step.
const TRACK_COUNT = 4

// Category strip under the hero: a continuous slow marquee of product-category
// tiles on a CSS loop, no JS timer. Hover or keyboard focus pauses it; users
// with reduced motion get a static, normally-scrollable row instead (the
// duplicate tracks are display:none'd in that mode via CSS).
//
// Duplicate tracks are purely visual — aria-hidden with untabbable links — so
// screen readers and the keyboard meet each category exactly once.
export default function CategoryCarousel() {
  const track = (hidden, key) => (
    <ul className="cat-carousel__track" aria-hidden={hidden || undefined} key={key}>
      {homeCarousel.map((tile) => (
        <li className="cat-carousel__tile" key={tile.to}>
          <Link to={tile.to} className="cat-carousel__link" tabIndex={hidden ? -1 : undefined}>
            <Img
              className="cat-carousel__img"
              src={tile.img}
              alt=""
              sizes={TILE_SIZES}
              width={400}
              height={300}
            />
            <span className="cat-carousel__label">{tile.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  )

  return (
    <nav className="cat-carousel" aria-label="Product categories">
      <div className="container">
        <div className="cat-carousel__viewport">
          <div className="cat-carousel__belt">
            {track(false, 'visible')}
            {Array.from({ length: TRACK_COUNT - 1 }, (_, i) => track(true, `dup-${i}`))}
          </div>
        </div>
      </div>
    </nav>
  )
}
