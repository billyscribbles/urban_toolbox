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
