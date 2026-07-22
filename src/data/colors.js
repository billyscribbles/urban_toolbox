// Powder-coat colours a product can be offered in. These are physical product
// finishes (catalogue data), not theme tokens — so they live here, not in
// theme.config.js. `order` is the display order; `hex` drives the swatch fill;
// `border: true` flags near-white swatches that need an outline to stay visible
// on a light card.
export const PRODUCT_COLORS = [
  { key: 'silver', label: 'Silver', hex: '#C0C0C4' },
  { key: 'white', label: 'White', hex: '#F5F5F3', border: true },
  { key: 'black', label: 'Black', hex: '#1A1A1A' },
]

export const COLOR_KEYS = PRODUCT_COLORS.map((c) => c.key)

const BY_KEY = new Map(PRODUCT_COLORS.map((c) => [c.key, c]))

// Look up a colour's display label; unknown keys return the key itself.
export function colorLabel(key) {
  return BY_KEY.get(key)?.label ?? key
}

// Reduce an arbitrary stored value to known colour keys, preserving the
// canonical display order. Guards the storefront and admin against stale or
// garbage values in the DB (and against the column being absent on old rows).
export function normalizeColors(list) {
  const set = new Set(Array.isArray(list) ? list : [])
  return COLOR_KEYS.filter((key) => set.has(key))
}
