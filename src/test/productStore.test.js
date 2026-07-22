import { describe, it, expect, vi } from 'vitest'
import { productRows } from './fixtures/productRows.js'
import { categories } from '../data/categories.js'

// Hoisted so the vi.mock factory below (itself hoisted above imports) can
// close over it — lets the "ready" test assert loadProducts filtered on the
// right column/value, not just that .eq() was called with something.
const { eqMock } = vi.hoisted(() => ({ eqMock: vi.fn() }))

vi.mock('../lib/supabaseClient.js', () => ({
  isConfigured: () => true,
  publicPhotoUrl: (p) => `https://cdn.test/${p}`,
  getSupabase: () =>
    Promise.resolve({
      from: () => ({
        select: () => ({
          eq: (...args) => {
            eqMock(...args)
            return {
              order: () => ({
                order: () => Promise.resolve({ data: productRows, error: null }),
              }),
            }
          },
        }),
      }),
    }),
}))

const { normalizeRow, loadProducts, getProducts, getStatus } =
  await import('../lib/productStore.js')

describe('normalizeRow — DB row to storefront product', () => {
  it('maps columns, sorts photos by position and builds the quote descriptor', () => {
    const p = normalizeRow(productRows[1])
    expect(p.categoryId).toBe('job-site-toolbox')
    expect(p.img).toBe('https://cdn.test/products/job-site-toolbox-1/hero.jpg')
    expect(p.images.map((i) => i.src)).toEqual([
      'https://cdn.test/products/job-site-toolbox-1/hero.jpg',
      'https://cdn.test/products/job-site-toolbox-1/front.jpg',
    ])
    expect(p.price).toBe(450)
    expect(p.discountPct).toBe(15)
    // quote carries the EFFECTIVE price so the tray/email show the sale price
    expect(p.quote).toEqual({
      id: 'job-site-toolbox-1',
      priceFrom: 382.5,
      standardDims: '1200 × 500 × 700mm',
    })
  })

  it('a single photo yields img but no images gallery, and null price passes through', () => {
    const p = normalizeRow(productRows[0])
    expect(p.images).toBeUndefined()
    expect(p.price).toBeNull()
    expect(p.quote.priceFrom).toBeNull()
  })

  it('maps vehicle-fit flags, defaulting to fits-both when the columns are absent', () => {
    // productRows[0] omits the flags entirely → both true.
    const both = normalizeRow(productRows[0])
    expect(both.fitsUte).toBe(true)
    expect(both.fitsCaravan).toBe(true)
    // productRows[1] is caravan-only.
    const caravanOnly = normalizeRow(productRows[1])
    expect(caravanOnly.fitsUte).toBe(false)
    expect(caravanOnly.fitsCaravan).toBe(true)
  })

  it('normalizes colours to known keys in canonical order, empty when absent', () => {
    // Row 1 stores ['black','nope','silver'] → cleaned + reordered.
    expect(normalizeRow(productRows[1]).colors).toEqual(['silver', 'black'])
    // Row 0 omits the column entirely → no colours.
    expect(normalizeRow(productRows[0]).colors).toEqual([])
  })
})

describe('fixture stays honest against the category tree', () => {
  it('every fixture category_id resolves to a real leaf', () => {
    const leafIds = new Set()
    const walk = (nodes) =>
      nodes.forEach((n) => (n.children ? walk(n.children) : leafIds.add(n.id)))
    walk(categories)
    for (const row of productRows) expect(leafIds.has(row.category_id)).toBe(true)
  })
})

describe('loadProducts', () => {
  it('fetches once and lands on ready with normalized products', async () => {
    await loadProducts()
    expect(getStatus()).toBe('ready')
    expect(getProducts()).toHaveLength(2)
    expect(getProducts()[0].quote.id).toBeDefined()
    // Hidden products must never reach the public storefront — assert the
    // exact filter, not just that .eq() was called with something.
    expect(eqMock).toHaveBeenCalledWith('hidden', false)
  })
})
