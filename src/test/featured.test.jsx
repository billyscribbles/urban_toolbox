import { describe, it, expect, vi } from 'vitest'

// Pins photo URLs to a stable host so assertions don't depend on whichever
// VITE_SUPABASE_URL happens to be in .env.
vi.mock('../lib/supabaseClient.js', () => ({
  isConfigured: () => true,
  publicPhotoUrl: (p) => `https://cdn.test/${p}`,
  getSupabase: () => Promise.resolve(null),
}))

const { __setStateForTests, normalizeRow } = await import('../lib/productStore.js')
const { getFeaturedProducts } = await import('../lib/catalog.js')

// Minimal DB row. category_id must be a real leaf from src/data/categories.js.
const row = (id, extra = {}) => ({
  id,
  category_id: 'top-opening-toolboxes',
  title: id.toUpperCase(),
  slug: id,
  product_images: [],
  ...extra,
})

const seed = (rows) =>
  __setStateForTests({ status: 'ready', products: rows.map((r) => normalizeRow(r)) })

describe('getFeaturedProducts', () => {
  it('returns only featured products, in catalogue order', () => {
    seed([row('a'), row('b', { featured: true }), row('c'), row('d', { featured: true })])
    expect(getFeaturedProducts().map((p) => p.id)).toEqual(['b', 'd'])
  })

  it('caps the rail at the limit', () => {
    seed(['a', 'b', 'c'].map((id) => row(id, { featured: true })))
    expect(getFeaturedProducts(2).map((p) => p.id)).toEqual(['a', 'b'])
  })

  it('returns nothing when nothing is featured', () => {
    seed([row('a'), row('b')])
    expect(getFeaturedProducts()).toEqual([])
  })

  it('returns nothing when the catalogue failed to load', () => {
    __setStateForTests({ status: 'error', products: [] })
    expect(getFeaturedProducts()).toEqual([])
  })
})
