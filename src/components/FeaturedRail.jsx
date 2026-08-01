import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { featuredSection } from '../content/featured.js'
import { getFeaturedProducts } from '../lib/catalog.js'
import { useProductCatalog } from '../lib/productStore.js'
import Eyebrow from './Eyebrow.jsx'
import Img from './Img.jsx'
import PriceTag from './PriceTag.jsx'
import './FeaturedRail.css'

// Cards render at ~300px on desktop and near-full-width on a phone, so the
// 400px derivative covers 1x and the 800px one covers 2x.
const CARD_SIZES = '(max-width: 767px) 78vw, (max-width: 1023px) 46vw, 300px'

// Home "Featured Products" rail: every product with `featured` ticked in
// /admin, in catalogue order, on a scroll-snapped track.
//
// Unlike the category strip above it, this rail never moves on its own — its
// cards carry a CTA, and a moving target is a hostile one.
//
// Renders nothing when nothing is featured. A failed catalogue load reads the
// same way (getProducts() returns []), which is deliberate: an empty band is
// worse than no band, and a skeleton that usually resolves to nothing would
// shove the page around on every load.
export default function FeaturedRail() {
  // Subscribe so the rail repaints when the catalogue lands. main.jsx kicks the
  // fetch off at boot, so there's no load call to make here.
  useProductCatalog()
  const products = getFeaturedProducts()

  if (!products.length) return null

  return (
    <section className="featured">
      <div className="container">
        <div className="featured__head">
          <div>
            <Eyebrow>{featuredSection.eyebrow}</Eyebrow>
            <h2 className="h2 h2--md featured__heading">{featuredSection.heading}</h2>
          </div>
        </div>

        {/* tabIndex + aria-label: axe's scrollable-region-focusable rule wants a
            scrolling region reachable by keyboard, and the label names what it
            holds. Tabbing the cards scrolls them into view natively. jsx-a11y's
            static rule doesn't know a scrolling <ul> is a legitimate exception,
            so it's suppressed for this one deliberate line. */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
        <ul className="featured__track" tabIndex={0} aria-label={featuredSection.heading}>
          {products.map((p) => (
            <li className="featured__item" key={p.id}>
              <Link className="featured-card" to={`/product/${p.slug || p.id}`}>
                <span className="featured-card__media">
                  {p.img && (
                    <Img
                      className="featured-card__img"
                      src={p.img}
                      alt={p.imgAlt || p.title}
                      sizes={CARD_SIZES}
                    />
                  )}
                </span>
                <span className="featured-card__body">
                  <h3 className="featured-card__title">{p.title}</h3>
                  <span className="featured-card__price">
                    <PriceTag price={p.price} discountPct={p.discountPct} />
                  </span>
                  <span className="featured-card__cta">
                    {featuredSection.cta}
                    <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
