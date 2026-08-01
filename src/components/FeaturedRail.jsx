import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { featuredSection } from '../content/featured.js'
import { getFeaturedProducts } from '../lib/catalog.js'
import { useProductCatalog } from '../lib/productStore.js'
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

  const trackRef = useRef(null)
  const [edges, setEdges] = useState({ overflows: false, atStart: true, atEnd: false })

  // One measurement drives all three arrow states: whether to show the pair at
  // all, and whether either end is reached.
  const measure = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    const next = {
      overflows: max > 1,
      atStart: el.scrollLeft <= 0,
      // 1px of slack absorbs the sub-pixel rounding browsers leave at the
      // right edge, which would otherwise never satisfy a strict >=.
      atEnd: el.scrollLeft >= max - 1,
    }
    // A fresh object literal never satisfies React's Object.is bail-out, so
    // returning `prev` unchanged is what stops every scroll frame from
    // reconciling all twelve cards to restate booleans that did not move.
    // Mid-scroll — and on every touch-swipe frame under 767px, where the
    // arrows aren't even rendered — nothing changes, so this is the norm.
    setEdges((prev) =>
      prev.overflows === next.overflows &&
      prev.atStart === next.atStart &&
      prev.atEnd === next.atEnd
        ? prev
        : next,
    )
  }, [])

  // Re-measure on scroll and on resize. products.length is a dependency
  // because unfeaturing the last few cards can remove the overflow entirely.
  useEffect(() => {
    const el = trackRef.current
    if (!el) return undefined
    measure()
    el.addEventListener('scroll', measure, { passive: true })
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => {
      el.removeEventListener('scroll', measure)
      observer.disconnect()
    }
  }, [measure, products.length])

  // One click advances exactly one screen of cards, whatever the breakpoint.
  const page = (direction) => {
    const el = trackRef.current
    if (el) el.scrollBy({ left: direction * el.clientWidth, behavior: 'smooth' })
  }

  if (!products.length) return null

  return (
    <section className="featured">
      <div className="container">
        <div className="featured__head">
          <h2 className="h2 h2--md featured__heading">{featuredSection.heading}</h2>

          {edges.overflows && (
            <div className="featured__nav">
              <button
                type="button"
                className="featured__arrow"
                aria-label="Previous featured products"
                disabled={edges.atStart}
                onClick={() => page(-1)}
              >
                <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="featured__arrow"
                aria-label="Next featured products"
                disabled={edges.atEnd}
                onClick={() => page(1)}
              >
                <ChevronRight size={20} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        {/* tabIndex + aria-label: axe's scrollable-region-focusable rule wants a
            scrolling region reachable by keyboard, and the label names what it
            holds. Tabbing the cards scrolls them into view natively. jsx-a11y's
            static rule doesn't know a scrolling <ul> is a legitimate exception,
            so it's suppressed for this one deliberate line. */}
        <ul
          className="featured__track"
          ref={trackRef}
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          aria-label={featuredSection.heading}
        >
          {products.map((p) => (
            <li className="featured__item" key={p.id}>
              <Link className="featured-card" to={`/product/${p.slug || p.id}`}>
                {/* <div>, not <span>: the body holds an <h3>, and phrasing
                    content can't. <a> has a transparent content model and the
                    <li> permits flow content, so this is valid — the same
                    shape Card.jsx uses. */}
                <div className="featured-card__media">
                  {p.img && (
                    <Img
                      className="featured-card__img"
                      src={p.img}
                      alt={p.imgAlt || p.title}
                      sizes={CARD_SIZES}
                    />
                  )}
                </div>
                <div className="featured-card__body">
                  <h3 className="featured-card__title">{p.title}</h3>
                  {p.summary && <p className="featured-card__summary">{p.summary}</p>}
                  <span className="featured-card__price">
                    <PriceTag price={p.price} discountPct={p.discountPct} />
                  </span>
                  {/* Styled as a button, but deliberately still a span — the
                      whole card is already the <a>, and nesting a second
                      interactive element inside it would be invalid. */}
                  <span className="featured-card__cta">
                    {featuredSection.cta}
                    <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
