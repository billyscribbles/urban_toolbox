// Pure form helpers for the admin product editor — kept out of the component
// so validation rules are unit-testable.

export function slugify(title) {
  return title
    .toLowerCase()
    .replace(/×/g, 'x')
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '')
}

// Titles repeat across sizes, so two products can slugify to the same string —
// and the first 80 chars of two long titles can collide even when they differ.
// Suffix -2, -3, … so the DB's unique constraints never see a duplicate.
export function uniqueValue(base, taken, maxLength = 80) {
  const used = new Set(taken)
  if (!used.has(base)) return base
  for (let n = 2; n < 1000; n++) {
    const suffix = `-${n}`
    const stem = base.slice(0, maxLength - suffix.length).replace(/-+$/, '')
    const candidate = `${stem}${suffix}`
    if (!used.has(candidate)) return candidate
  }
  return base
}

// Postgres surfaces unique violations as raw constraint text. Translate the two
// the admin can actually act on; anything else passes through unchanged.
export function friendlySaveError(message = '') {
  if (message.includes('products_slug_key')) {
    return 'A product with this name already exists. Change the title to make it unique.'
  }
  if (message.includes('products_pkey')) {
    return 'That Product ID is already taken. Choose a different one.'
  }
  return message
}

function toNumber(value) {
  if (value === '' || value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : NaN
}

export function validateProduct(form, leafIds) {
  const errors = {}
  if (!form.title?.trim()) errors.title = 'Title is required'
  if (!leafIds.includes(form.categoryId)) errors.categoryId = 'Pick a category'

  const price = toNumber(form.price)
  if (Number.isNaN(price) || (price != null && price < 0)) {
    errors.price = 'Price must be a positive number'
  }

  const discountPct = toNumber(form.discountPct)
  if (Number.isNaN(discountPct)) {
    errors.discountPct = 'Discount must be a number'
  } else if (discountPct != null) {
    if (price == null || Number.isNaN(price)) {
      errors.discountPct = 'Set a price before adding a discount'
    } else if (discountPct < 1 || discountPct > 99) {
      errors.discountPct = 'Discount must be between 1 and 99'
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    price: Number.isNaN(price) ? null : price,
    discountPct: Number.isNaN(discountPct) ? null : discountPct,
  }
}
