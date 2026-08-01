import { describe, it, expect, vi } from 'vitest'

// Pins photo URLs to a stable host so assertions don't depend on whichever
// VITE_SUPABASE_URL happens to be in .env.
vi.mock('../lib/supabaseClient.js', () => ({
  isConfigured: () => true,
  publicPhotoUrl: (p) => `https://cdn.test/${p}`,
  getSupabase: () => Promise.resolve(null),
}))

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

const { __setStateForTests, normalizeRow } = await import('../lib/productStore.js')
const { getFeaturedProducts } = await import('../lib/catalog.js')
const { default: FeaturedRail } = await import('../components/FeaturedRail.jsx')
const { featuredSection } = await import('../content/featured.js')

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

const renderRail = () =>
  render(
    <MemoryRouter>
      <FeaturedRail />
    </MemoryRouter>,
  )

describe('FeaturedRail', () => {
  it('renders one card per featured product, linking to its product page', () => {
    seed([
      row('a', { featured: true, title: 'Alloy Toolbox', slug: 'alloy-toolbox', price: 1299 }),
      row('b'),
      row('c', { featured: true, title: 'Dog Box', slug: 'dog-box', price: 890 }),
    ])
    renderRail()

    expect(screen.getByRole('heading', { name: featuredSection.heading })).toBeInTheDocument()
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', '/product/alloy-toolbox')
    expect(links[1]).toHaveAttribute('href', '/product/dog-box')
    expect(screen.getByText('Alloy Toolbox')).toBeInTheDocument()
    // PriceTag formats to "from $1,299 + GST" — assert the money, not the chrome.
    expect(screen.getByText(/\$1,299/)).toBeInTheDocument()
  })

  it('falls back to the id when a product predates slugs', () => {
    seed([row('legacy-id', { featured: true, slug: undefined })])
    renderRail()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/product/legacy-id')
  })

  it('shows the enquiry line instead of a price when a product has none', () => {
    seed([row('a', { featured: true, price: null })])
    renderRail()
    expect(screen.getByText(/enquire for pricing/i)).toBeInTheDocument()
  })

  it('renders nothing at all when no product is featured', () => {
    seed([row('a'), row('b')])
    const { container } = renderRail()
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when the catalogue failed to load', () => {
    __setStateForTests({ status: 'error', products: [] })
    const { container } = renderRail()
    expect(container).toBeEmptyDOMElement()
  })

  it('has no axe violations', async () => {
    seed([
      row('a', { featured: true, title: 'Alloy Toolbox', slug: 'alloy-toolbox', price: 1299 }),
      row('c', { featured: true, title: 'Dog Box', slug: 'dog-box', price: 890 }),
    ])
    const { container } = renderRail()
    expect(await axe(container)).toHaveNoViolations()
  })
})
