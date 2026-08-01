import { describe, it, expect, vi } from 'vitest'

// Pins photo URLs to a stable host so assertions don't depend on whichever
// VITE_SUPABASE_URL happens to be in .env.
vi.mock('../lib/supabaseClient.js', () => ({
  isConfigured: () => true,
  publicPhotoUrl: (p) => `https://cdn.test/${p}`,
  getSupabase: () => Promise.resolve(null),
}))

import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

// jsdom has no layout: every width reads 0, so overflow never happens by
// itself. Force the numbers the component measures, and stand in for the
// scrollBy that jsdom doesn't implement.
function stubTrack({ clientWidth = 1000, scrollWidth = 3000, scrollLeft = 0 } = {}) {
  const scrollBy = vi.fn()
  const track = document.querySelector('.featured__track')
  Object.defineProperty(track, 'clientWidth', { value: clientWidth, configurable: true })
  Object.defineProperty(track, 'scrollWidth', { value: scrollWidth, configurable: true })
  Object.defineProperty(track, 'scrollLeft', {
    value: scrollLeft,
    writable: true,
    configurable: true,
  })
  track.scrollBy = scrollBy
  // The component measures on scroll; fire one so it re-reads the stubs.
  // fireEvent (not dispatchEvent) so React's state update is wrapped in act().
  fireEvent.scroll(track)
  return { track, scrollBy }
}

const seedTwo = () =>
  seed([
    row('a', { featured: true, title: 'Alloy Toolbox', slug: 'alloy-toolbox', price: 1299 }),
    row('c', { featured: true, title: 'Dog Box', slug: 'dog-box', price: 890 }),
  ])

describe('FeaturedRail — paging', () => {
  it('hides the arrows when every card already fits', () => {
    seedTwo()
    renderRail()
    // jsdom's zero widths mean no overflow, which is exactly the "it all fits"
    // case: no arrows should render.
    expect(screen.queryByRole('button', { name: /next featured/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /previous featured/i })).toBeNull()
  })

  it('shows the arrows and pages one full screen at a time when it overflows', async () => {
    const user = userEvent.setup()
    seedTwo()
    renderRail()
    const { scrollBy } = stubTrack()

    const next = await screen.findByRole('button', { name: /next featured/i })
    await user.click(next)
    expect(scrollBy).toHaveBeenCalledWith({ left: 1000, behavior: 'smooth' })
  })

  it('disables Previous at the start and Next at the end', async () => {
    const user = userEvent.setup()
    seedTwo()
    renderRail()
    stubTrack({ scrollLeft: 0 })

    expect(await screen.findByRole('button', { name: /previous featured/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /next featured/i })).toBeEnabled()

    // Scrolled hard right: 3000 - 1000 = 2000 is the maximum.
    stubTrack({ scrollLeft: 2000 })
    expect(await screen.findByRole('button', { name: /next featured/i })).toBeDisabled()

    const prev = screen.getByRole('button', { name: /previous featured/i })
    expect(prev).toBeEnabled()
    await user.click(prev)
    expect(document.querySelector('.featured__track').scrollBy).toHaveBeenCalledWith({
      left: -1000,
      behavior: 'smooth',
    })
  })
})

const { default: Home } = await import('../pages/Home.jsx')
const { HelmetProvider } = await import('react-helmet-async')

describe('Home — featured rail placement', () => {
  it('renders the rail directly after the category carousel', () => {
    seed([row('a', { featured: true, title: 'Alloy Toolbox', slug: 'alloy-toolbox', price: 1299 })])
    const { container } = render(
      <HelmetProvider>
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </HelmetProvider>,
    )
    const carousel = container.querySelector('.range')
    const featured = container.querySelector('.featured')
    expect(carousel).not.toBeNull()
    expect(featured).not.toBeNull()
    // compareDocumentPosition: FOLLOWING (4) means `featured` comes after.
    expect(carousel.compareDocumentPosition(featured) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(carousel.nextElementSibling).toBe(featured)
  })
})
