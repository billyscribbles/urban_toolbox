import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { productRows } from './fixtures/productRows.js'

vi.mock('../lib/supabaseClient.js', () => ({
  isConfigured: () => true,
  publicPhotoUrl: (p) => `https://cdn.test/${p}`,
  getSupabase: () => Promise.resolve(null),
}))

const { __setStateForTests, normalizeRow } = await import('../lib/productStore.js')
const {
  getProductsForLeaf,
  getVehicleSections,
  getRelatedProducts,
  getProductByToken,
  getMegaMenu,
  getVehicleMenu,
  buildSections,
  getCategoryBySlug,
  getTree,
  getLeaves,
} = await import('../lib/catalog.js')
const { default: CategoryPage } = await import('../pages/CategoryPage.jsx')

const idsIn = (sections) => sections.flatMap((s) => s.products.map((p) => p.id))

function renderPage(slug) {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <CategoryPage slug={slug} />
      </MemoryRouter>
    </HelmetProvider>,
  )
}

describe('live catalog wiring', () => {
  it('getProductsForLeaf reads the store', () => {
    __setStateForTests({ status: 'ready', products: productRows.map(normalizeRow) })
    expect(getProductsForLeaf('job-site-toolbox')).toHaveLength(1)
    expect(getProductsForLeaf('nonexistent-leaf')).toHaveLength(0)
  })

  it('renders product cards when the store is ready', () => {
    __setStateForTests({ status: 'ready', products: productRows.map(normalizeRow) })
    renderPage('accessories')
    // Accessories page renders; the ready store means no loading status region
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('shows a loading state while fetching', () => {
    __setStateForTests({ status: 'loading', products: [] })
    renderPage('accessories')
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows a retry action when the fetch failed', () => {
    __setStateForTests({ status: 'error', products: [] })
    renderPage('accessories')
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })
})

describe('getRelatedProducts — same-category rail', () => {
  it('excludes the current product and respects the limit', () => {
    const rows = ['a', 'b', 'c', 'd'].map((id) => ({
      id,
      category_id: 'full-lid-opening',
      title: id.toUpperCase(),
      slug: id,
      product_images: [],
    }))
    __setStateForTests({ status: 'ready', products: rows.map((r) => normalizeRow(r)) })

    const current = getProductByToken('a')
    const related = getRelatedProducts(current, 2)
    expect(related.map((p) => p.id)).not.toContain('a')
    expect(related).toHaveLength(2)
  })

  it('floats featured products to the front', () => {
    const rows = [
      { id: 'a', category_id: 'full-lid-opening', title: 'A', slug: 'a', product_images: [] },
      { id: 'b', category_id: 'full-lid-opening', title: 'B', slug: 'b', product_images: [] },
      {
        id: 'c',
        category_id: 'full-lid-opening',
        title: 'C',
        slug: 'c',
        featured: true,
        product_images: [],
      },
    ]
    __setStateForTests({ status: 'ready', products: rows.map((r) => normalizeRow(r)) })

    const related = getRelatedProducts(getProductByToken('a'), 3)
    expect(related[0].id).toBe('c')
  })
})

describe('getVehicleSections — vehicle-filtered range', () => {
  it('keeps only products flagged for the vehicle and drops empty sections', () => {
    __setStateForTests({ status: 'ready', products: productRows.map(normalizeRow) })

    // job-site-toolbox-1 is caravan-only (fits_ute: false); the other row omits
    // the flags and so fits both.
    const uteIds = idsIn(getVehicleSections('ute'))
    expect(uteIds).toContain('ute-under-tray-boxes-1')
    expect(uteIds).not.toContain('job-site-toolbox-1')

    const caravanIds = idsIn(getVehicleSections('caravan'))
    expect(caravanIds).toContain('ute-under-tray-boxes-1')
    expect(caravanIds).toContain('job-site-toolbox-1')

    // No section is returned empty — the pill nav only shows populated groups.
    // Vehicle-exclusive sections are the one exception: they stay pinned so the
    // category is browsable before its first product lands.
    for (const s of getVehicleSections('ute')) {
      if (!s.pinned) expect(s.products.length).toBeGreaterThan(0)
    }
  })

  it('pins ute-exclusive categories to the ute page even before products exist', () => {
    __setStateForTests({ status: 'ready', products: [] })

    const uteSections = getVehicleSections('ute')
    const uteIds = uteSections.map((s) => s.id)
    expect(uteIds).toEqual(expect.arrayContaining(['trays', 'canopy', 'service-canopy']))

    // Each is its own top-level group (not folded under Accessories), so the
    // vehicle page nav renders it beside the Browse buttons, not inside one.
    for (const id of ['trays', 'canopy', 'service-canopy']) {
      const s = uteSections.find((x) => x.id === id)
      expect(s.group).toBe(s.label)
    }

    const caravanIds = getVehicleSections('caravan').map((s) => s.id)
    expect(caravanIds).not.toContain('trays')
    expect(caravanIds).not.toContain('canopy')
    expect(caravanIds).not.toContain('service-canopy')
  })

  it('vehicle menu lists each page’s top-level groups under its heading', () => {
    const menu = getVehicleMenu()
    expect(menu.columns.map((c) => c.label)).toEqual(['Caravans', 'Utes'])

    const [caravans, utes] = menu.columns
    expect(caravans.items.map((i) => i.label)).toEqual(['Toolboxes', 'Accessories'])
    expect(utes.items.map((i) => i.label)).toEqual([
      'Toolboxes',
      'Accessories',
      'Trays',
      'Canopy',
      'Service Canopy',
    ])
    for (const item of utes.items) expect(item.to).toMatch(/^\/utes#/)
    for (const item of caravans.items) expect(item.to).toMatch(/^\/caravans#/)
  })

  it('hides the exclusive Australian Made category from generic + vehicle surfaces but keeps it admin-selectable', () => {
    __setStateForTests({ status: 'ready', products: productRows.map(normalizeRow) })

    // The admin category dropdown is built from every tree leaf — so the
    // exclusive node must still be a selectable leaf.
    const leafIds = getTree().flatMap((t) => getLeaves(t).map((l) => l.id))
    expect(leafIds).toContain('australian-made')

    // …but it never leaks into the generic menus or the vehicle pages/menus.
    for (const top of ['toolboxes', 'accessories']) {
      expect(getMegaMenu(top).columns.map((c) => c.label)).not.toContain('Australian Made')
    }
    for (const v of ['ute', 'caravan']) {
      expect(idsIn(getVehicleSections(v))).not.toContain('australian-made')
    }
    const vehicleGroupLabels = getVehicleMenu().columns.flatMap((c) => c.items.map((i) => i.label))
    expect(vehicleGroupLabels).not.toContain('Australian Made')
  })

  it('hides vehicle-exclusive categories from the generic menu and category page', () => {
    __setStateForTests({ status: 'ready', products: productRows.map(normalizeRow) })

    const menuLabels = getMegaMenu('accessories').columns.map((c) => c.label)
    expect(menuLabels).not.toContain('Trays')
    expect(menuLabels).not.toContain('Canopy')
    expect(menuLabels).not.toContain('Service Canopy')

    const pageIds = buildSections(getCategoryBySlug('accessories')).map((s) => s.id)
    expect(pageIds).not.toContain('trays')
    expect(pageIds).not.toContain('canopy')
    expect(pageIds).not.toContain('service-canopy')
  })
})
