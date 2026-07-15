import { describe, it, expect } from 'vitest'
import { formatPrice, discountedPrice } from '../lib/pricing.js'

describe('formatPrice', () => {
  it('adds the AU thousands separator', () => {
    expect(formatPrice(3900)).toBe('$3,900')
  })
  it('shows cents only when the value has them', () => {
    expect(formatPrice(382.5)).toBe('$382.50')
    expect(formatPrice(450)).toBe('$450')
  })
})

describe('discountedPrice', () => {
  it('applies the percentage and rounds to the cent', () => {
    expect(discountedPrice(450, 15)).toBe(382.5)
    expect(discountedPrice(999.99, 10)).toBe(899.99)
  })
  it('returns null when price or discount is missing', () => {
    expect(discountedPrice(null, 15)).toBeNull()
    expect(discountedPrice(450, null)).toBeNull()
    expect(discountedPrice(450, 0)).toBeNull()
  })
})
