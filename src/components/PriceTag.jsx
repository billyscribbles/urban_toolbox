import { formatPrice, discountedPrice } from '../lib/pricing.js'
import './PriceTag.css'

// The one price renderer, shared by Card and DetailDrawer. Three states:
// no price -> enquiry line; price -> "from $X + GST"; price + discount ->
// struck-through original, sale price, save badge.
export default function PriceTag({ price, discountPct }) {
  if (price == null) {
    return <span className="price-tag__enquire">Enquire for pricing</span>
  }
  const sale = discountedPrice(price, discountPct)
  return (
    <span className="price-tag">
      {sale != null && (
        <s className="price-tag__was">
          <span className="sr-only">Was </span>
          {formatPrice(price)}
        </s>
      )}
      <span className="price-tag__amount">
        <span className="price-tag__from">from</span> {formatPrice(sale ?? price)}
      </span>
      <span className="price-tag__gst">+ GST</span>
      {sale != null && <span className="price-tag__save">Save {Math.round(discountPct)}%</span>}
    </span>
  )
}
