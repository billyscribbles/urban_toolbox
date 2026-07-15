import { describe, it, expect } from 'vitest'
import { slugify, validateProduct } from '../lib/productForm.js'

const LEAVES = ['job-site-toolbox', 'locks']

describe('slugify', () => {
  it('lowercases, strips symbols and collapses to hyphens', () => {
    expect(slugify('580 × 230 × 400mm Aluminium Checker Ute Toolbox')).toBe(
      '580-x-230-x-400mm-aluminium-checker-ute-toolbox',
    )
  })
  it('trims leading/trailing hyphens and caps length', () => {
    expect(slugify('  --Hello World!--  ')).toBe('hello-world')
    expect(slugify('x'.repeat(200)).length).toBeLessThanOrEqual(80)
  })
})

describe('validateProduct', () => {
  const base = { title: 'Box', categoryId: 'locks', price: '', discountPct: '' }

  it('accepts a minimal valid form and coerces empty price to null', () => {
    const r = validateProduct(base, LEAVES)
    expect(r.valid).toBe(true)
    expect(r.price).toBeNull()
    expect(r.discountPct).toBeNull()
  })

  it('requires a title and a real leaf category', () => {
    expect(validateProduct({ ...base, title: '  ' }, LEAVES).errors.title).toBeTruthy()
    expect(
      validateProduct({ ...base, categoryId: 'toolboxes' }, LEAVES).errors.categoryId,
    ).toBeTruthy()
  })

  it('rejects negative or non-numeric prices', () => {
    expect(validateProduct({ ...base, price: '-5' }, LEAVES).errors.price).toBeTruthy()
    expect(validateProduct({ ...base, price: 'abc' }, LEAVES).errors.price).toBeTruthy()
    expect(validateProduct({ ...base, price: '450' }, LEAVES).price).toBe(450)
  })

  it('discount needs a price and must be 1-99', () => {
    expect(validateProduct({ ...base, discountPct: '10' }, LEAVES).errors.discountPct).toBeTruthy()
    expect(
      validateProduct({ ...base, price: '450', discountPct: '150' }, LEAVES).errors.discountPct,
    ).toBeTruthy()
    const ok = validateProduct({ ...base, price: '450', discountPct: '15' }, LEAVES)
    expect(ok.valid).toBe(true)
    expect(ok.discountPct).toBe(15)
  })
})
