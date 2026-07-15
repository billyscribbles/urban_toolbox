import { Link } from 'react-router-dom'
import { homeCarousel } from '../content/homeCarousel.js'
import Img from './Img.jsx'
import './CategoryCarousel.css'

// Tiles render at a fixed ~200px column regardless of viewport.
const TILE_SIZES = '200px'

// Category strip under the hero: a continuous slow marquee of product-category
// tiles. The track is rendered twice and translated -50% on a CSS loop, so the
// wrap is seamless with no JS timer. Hover or keyboard focus pauses it; users
// with reduced motion get a static, normally-scrollable row instead (the
// duplicate track is display:none'd in that mode via CSS).
//
// The second track is purely visual — aria-hidden with untabbable links — so
// screen readers and the keyboard meet each category exactly once.
export default function CategoryCarousel() {
  const track = (hidden) => (
    <ul className="cat-carousel__track" aria-hidden={hidden || undefined}>
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
      <div className="cat-carousel__viewport">
        <div className="cat-carousel__belt">
          {track(false)}
          {track(true)}
        </div>
      </div>
    </nav>
  )
}
