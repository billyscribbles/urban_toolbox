import { describe, it, expect } from 'vitest'
import { slugify, uniqueValue, friendlySaveError, validateProduct } from '../lib/productForm.js'

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

describe('uniqueValue', () => {
  it('returns the base when nothing has taken it', () => {
    expect(uniqueValue('ute-box', ['other'])).toBe('ute-box')
  })
  it('suffixes past every taken variant', () => {
    expect(uniqueValue('ute-box', ['ute-box'])).toBe('ute-box-2')
    expect(uniqueValue('ute-box', ['ute-box', 'ute-box-2'])).toBe('ute-box-3')
  })
  it('keeps the suffixed value inside the length cap', () => {
    const long = 'x'.repeat(80)
    const out = uniqueValue(long, [long])
    expect(out.length).toBeLessThanOrEqual(80)
    expect(out.endsWith('-2')).toBe(true)
  })
})

describe('friendlySaveError', () => {
  it('rewrites the slug and id unique violations', () => {
    expect(
      friendlySaveError('duplicate key value violates unique constraint "products_slug_key"'),
    ).toMatch(/already exists/)
    expect(
      friendlySaveError('duplicate key value violates unique constraint "products_pkey"'),
    ).toMatch(/Product ID is already taken/)
  })
  it('passes anything else through unchanged', () => {
    expect(friendlySaveError('network error')).toBe('network error')
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
