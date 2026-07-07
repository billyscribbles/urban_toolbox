import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { Check, ArrowRight } from 'lucide-react'
import Placeholder from './Placeholder.jsx'
import QuoteButton from './QuoteButton.jsx'
import { useQuote } from '../lib/quoteStore.js'
import './Card.css'

// Australian thousands separator: 3900 -> "$3,900".
function formatPrice(n) {
  return `$${Number(n).toLocaleString('en-AU')}`
}

// Product / category card: striped photo slot over a heading and body. With a
// `quote` descriptor it becomes a shop card — an "in your quote" badge on the
// photo, a price row (or "Enquire for pricing" when priceless) and an action
// row pairing add-to-quote with a View Details control that opens the photo in
// the site Lightbox. Becomes a link when `to` is provided.
export default function Card({
  ph,
  phSub,
  img,
  imgAlt,
  title,
  body,
  cta,
  to,
  height = 220,
  alt = false,
  titleSize = 24,
  pad = 28,
  quote,
  quoteCategory,
}) {
  const { items } = useQuote()
  const inQuote = quote ? items.some((i) => i.id === quote.id) : false
  const imgRef = useRef(null)
  const style = { '--card-title': `${titleSize}px`, '--card-pad': `${pad}px` }
  const inner = (
    <>
      <div className="card__media" style={{ height }}>
        {img ? (
          <img
            ref={imgRef}
            className={`card__img${to ? '' : ' zoomable'}`}
            src={img}
            alt={imgAlt || title}
            loading="lazy"
          />
        ) : (
          <Placeholder label={ph} sub={phSub} height={height} />
        )}
        {inQuote && (
          <span className="card__badge">
            <Check size={14} strokeWidth={3} aria-hidden="true" /> In your quote
          </span>
        )}
      </div>
      <div className="card__body">
        <h3 className="card__title">{title}</h3>
        <p className="card__text">{body}</p>
        {cta && <span className="action-link card__cta">{cta} →</span>}
        {quote && (
          <>
            <div className="card__price">
              {quote.priceFrom != null ? (
                <>
                  <span className="card__price-amount">{formatPrice(quote.priceFrom)}</span>
                  <span className="card__price-gst">+ GST</span>
                </>
              ) : (
                <span className="card__price-enquire">Enquire for pricing</span>
              )}
            </div>
            <div className="card__actions">
              <QuoteButton
                item={{
                  id: quote.id,
                  name: title,
                  category: quoteCategory,
                  priceFrom: quote.priceFrom ?? null,
                  standardDims: quote.standardDims ?? '',
                }}
              />
              <button
                type="button"
                className="card__details"
                onClick={() => imgRef.current?.click()}
                disabled={!img}
              >
                View details <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
  const className = `card${alt ? ' card--alt' : ''}${to ? ' card--link' : ''}`
  return to ? (
    <Link to={to} className={className} style={style}>
      {inner}
    </Link>
  ) : (
    <div className={className} style={style}>
      {inner}
    </div>
  )
}
