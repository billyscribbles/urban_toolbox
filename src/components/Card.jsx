import { Link } from 'react-router-dom'
import { Check, ArrowRight, Images } from 'lucide-react'
import Img from './Img.jsx'
import Placeholder from './Placeholder.jsx'
import PriceTag from './PriceTag.jsx'
import QuoteButton from './QuoteButton.jsx'
import { useQuote } from '../lib/quoteStore.js'
import './Card.css'

// Product / category card: striped photo slot over a heading and body. With a
// `quote` descriptor it becomes a shop card — an "in your quote" badge on the
// photo, a price row (or "Enquire for pricing" when priceless) and an action
// row pairing add-to-quote with a View Details link to the product page. The
// photo and title link to that page too. Becomes a whole-card link when `to`
// is provided (used for category cards).
export default function Card({
  ph,
  phSub,
  img,
  imgAlt,
  images,
  title,
  body,
  cta,
  to,
  slug,
  height = 220,
  alt = false,
  titleSize = 24,
  pad = 28,
  quote,
  price,
  discountPct,
  quoteCategory,
  imageFit,
  imageTone,
  imagePosition,
}) {
  const { items } = useQuote()
  const inQuote = quote ? items.some((i) => i.id === quote.id) : false
  const quoteItem = quote
    ? {
        id: quote.id,
        name: title,
        category: quoteCategory,
        priceFrom: quote.priceFrom ?? null,
        standardDims: quote.standardDims ?? '',
        img,
        imgAlt,
        imageFit,
        imageTone,
        imagePosition,
      }
    : null
  // Product cards link to their own page at /product/<slug> (slug, falling back
  // to the id for products that predate slugs). The photo and title carry the
  // link; the whole-card `to` path (category cards) is separate and unaffected.
  const detailToken = quote ? slug || (quote?.id != null ? String(quote.id) : null) : null
  const detailTo = detailToken ? `/product/${detailToken}` : null
  const style = { '--card-title': `${titleSize}px`, '--card-pad': `${pad}px` }
  const resolvedImageFit = imageFit || (img?.match(/\.(png|svg)$/i) ? 'contain' : 'cover')
  const resolvedImageTone = imageTone || (resolvedImageFit === 'contain' ? 'white' : 'photo')
  const mediaClassName = `card__media card__media--${resolvedImageFit} card__media--${resolvedImageTone}`
  const imageStyle = imagePosition ? { objectPosition: imagePosition } : undefined
  const mediaBlock = (
    <div className={mediaClassName} style={{ height }}>
      {img ? (
        <Img
          className={`card__img${to || detailTo ? '' : ' zoomable'}`}
          src={img}
          alt={imgAlt || title}
          style={imageStyle}
        />
      ) : (
        <Placeholder label={ph} sub={phSub} height={height} />
      )}
      {inQuote && (
        <span className="card__badge">
          <Check size={14} strokeWidth={3} aria-hidden="true" /> In your quote
        </span>
      )}
      {images?.length > 1 && (
        <span className="card__count">
          <Images size={13} strokeWidth={2} aria-hidden="true" />
          <span aria-hidden="true">{images.length}</span>
          <span className="sr-only">{images.length} photos — open the product to see them</span>
        </span>
      )}
    </div>
  )
  const inner = (
    <>
      {detailTo ? (
        <Link to={detailTo} className="card__media-link" tabIndex={-1} aria-hidden="true">
          {mediaBlock}
        </Link>
      ) : (
        mediaBlock
      )}
      <div className="card__body">
        {detailTo ? (
          <Link to={detailTo} className="card__title-link">
            <h3 className="card__title">{title}</h3>
          </Link>
        ) : (
          <h3 className="card__title">{title}</h3>
        )}
        <p className="card__text">{body}</p>
        {cta && <span className="action-link card__cta">{cta} →</span>}
        {quote && (
          <>
            <div className="card__price">
              <PriceTag price={price ?? quote.priceFrom} discountPct={discountPct} />
            </div>
            <div className="card__actions">
              <QuoteButton item={quoteItem} />
              {detailTo && (
                <Link to={detailTo} className="card__details">
                  View details <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
                </Link>
              )}
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
