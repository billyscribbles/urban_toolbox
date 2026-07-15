// Money display + discount math, shared by the storefront and the admin.

// Australian thousands separator: 3900 -> "$3,900"; 382.5 -> "$382.50".
export function formatPrice(n) {
  const value = Number(n)
  const opts = Number.isInteger(value) ? {} : { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  return `$${value.toLocaleString('en-AU', opts)}`
}

// Discounted price rounded to the cent; null when no discount applies.
export function discountedPrice(price, discountPct) {
  if (price == null || !discountPct) return null
  return Math.round(price * (100 - discountPct)) / 100
}
