import './StockBadge.css'

// Availability chip for the product buy card. Two states only — the catalogue
// has no partial stock — so it reads the boolean straight off the normalized
// product. A missing flag counts as in stock, matching the column default.
//
// It renders in both states on purpose: an explicit "In stock" is a positive
// signal, and a badge that only appears for bad news trains customers to read
// its absence as nothing at all.
export default function StockBadge({ inStock }) {
  const backOrder = inStock === false
  return (
    <p className={`stock-badge${backOrder ? ' stock-badge--back' : ''}`}>
      <span className="stock-badge__dot" aria-hidden="true" />
      {backOrder ? 'Back order' : 'In stock'}
    </p>
  )
}
