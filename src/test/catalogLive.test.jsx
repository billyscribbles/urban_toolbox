import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { productRows } from './fixtures/productRows.js'

vi.mock('../lib/supabaseClient.js', () => ({
  isConfigured: () => true,
  publicPhotoUrl: (p) => `https://cdn.test/${p}`,
  publicFileUrl: (p, opts) =>
    `https://cdn.test/${p}${opts?.download ? `?download=${opts.download}` : ''}`,
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
  getAdminCategoryGroups,
  firstProductImageIn,
  getCategoryTileImage,
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
    expect(getProductsForLeaf('top-opening-toolboxes')).toHaveLength(1)
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
      category_id: 'side-opening-toolboxes',
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
      { id: 'a', category_id: 'side-opening-toolboxes', title: 'A', slug: 'a', product_images: [] },
      { id: 'b', category_id: 'side-opening-toolboxes', title: 'B', slug: 'b', product_images: [] },
      {
        id: 'c',
        category_id: 'side-opening-toolboxes',
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
    // They also carry the fitment scope that drives the "Fits all utes" chip —
    // these three have no hero of their own on the vehicle page, so the answer
    // has to ride on the section heading.
    for (const id of ['trays', 'canopy', 'service-canopy']) {
      const s = uteSections.find((x) => x.id === id)
      expect(s.group).toBe(s.label)
      expect(s.fitment).toBe('ute')
    }

    // Generic tops carry no fitment scope — the chip must not leak onto
    // Toolboxes / Accessories sections, which fit more than utes.
    for (const s of uteSections) {
      if (['Toolboxes', 'Accessories'].includes(s.group)) expect(s.fitment).toBeUndefined()
    }

    const caravanIds = getVehicleSections('caravan').map((s) => s.id)
    expect(caravanIds).not.toContain('trays')
    expect(caravanIds).not.toContain('canopy')
    expect(caravanIds).not.toContain('service-canopy')
  })

  it('pins the two truck sections to /trucks even before products exist', () => {
    __setStateForTests({ status: 'ready', products: [] })

    // The page is exactly these two, present before any product lands. Truck
    // Accessories drops its qualifier on the page itself (shortLabel) — the
    // /trucks pill and heading read plain "Accessories".
    const sections = getVehicleSections('truck')
    expect(sections.map((s) => s.id)).toEqual(['truck-toolboxes', 'truck-accessories'])
    expect(sections.map((s) => s.label)).toEqual(['Truck Toolboxes', 'Accessories'])
    for (const s of sections) {
      expect(s.pinned).toBe(true)
      expect(s.products).toEqual([])
      expect(s.fitment).toBe('truck')
      expect(s.group).toBe(s.label)
    }
  })

  it('folds the flagged generic catalogue into the two truck sections', () => {
    __setStateForTests({ status: 'ready', products: productRows.map(normalizeRow) })

    // Still only two sections — the generic groups never render on /trucks…
    const sections = getVehicleSections('truck')
    expect(sections.map((s) => s.id)).toEqual(['truck-toolboxes', 'truck-accessories'])

    // …but generic stock folds in by flag: the toolbox row omitting the flag
    // lands in Truck Toolboxes, the opted-out row (fits_truck: false) stays off.
    const truckBoxes = sections.find((s) => s.id === 'truck-toolboxes')
    expect(truckBoxes.products.map((p) => p.id)).toContain('ute-under-tray-boxes-1')
    expect(idsIn(sections)).not.toContain('job-site-toolbox-1')

    // …while the truck categories stay off every generic and rival-vehicle surface.
    for (const top of ['toolboxes', 'accessories']) {
      const labels = getMegaMenu(top).columns.map((c) => c.label)
      expect(labels).not.toContain('Truck Toolboxes')
      expect(labels).not.toContain('Truck Accessories')
    }
    for (const v of ['ute', 'caravan']) {
      const ids = getVehicleSections(v).map((s) => s.id)
      expect(ids).not.toContain('truck-toolboxes')
      expect(ids).not.toContain('truck-accessories')
    }
  })

  it('lists a product filed under a truck category on /trucks, and nowhere else', () => {
    // fits_ute/fits_caravan true is irrelevant here: truck-toolboxes is
    // exclusive to /trucks, and the other vehicle pages never surface a rival
    // vehicle's scoped tops.
    const truckRow = {
      id: 'truck-drawer-1',
      category_id: 'truck-toolboxes',
      title: 'Truck Drawer System',
      slug: 'truck-drawer-1',
      product_images: [],
      fits_ute: true,
      fits_caravan: true,
    }
    __setStateForTests({
      status: 'ready',
      products: [...productRows, truckRow].map((r) => normalizeRow(r)),
    })

    const truckSection = getVehicleSections('truck').find((s) => s.id === 'truck-toolboxes')
    expect(truckSection.products.map((p) => p.id)).toContain('truck-drawer-1')
    // Truck-filed products lead; absorbed generic stock follows.
    expect(truckSection.products[0].id).toBe('truck-drawer-1')

    // Filed for trucks, not fitted for utes/caravans — the fitment flags don't
    // matter because those pages slice the generic catalogue, and
    // truck-toolboxes was never part of it.
    expect(idsIn(getVehicleSections('ute'))).not.toContain('truck-drawer-1')
    expect(idsIn(getVehicleSections('caravan'))).not.toContain('truck-drawer-1')

    for (const top of ['toolboxes', 'accessories']) {
      const labels = getMegaMenu(top).columns.map((c) => c.label)
      expect(labels).not.toContain('Truck Toolboxes')
    }

    // The flag governs the pinned sections too — untick and it leaves /trucks.
    __setStateForTests({
      status: 'ready',
      products: [...productRows, { ...truckRow, fits_truck: false }].map((r) => normalizeRow(r)),
    })
    expect(idsIn(getVehicleSections('truck'))).not.toContain('truck-drawer-1')
  })

  it('vehicle menu lists each page’s top-level groups under its heading', () => {
    const menu = getVehicleMenu()
    expect(menu.columns.map((c) => c.label)).toEqual(['Caravans', 'Utes', 'Trucks'])

    const [caravans, utes, trucks] = menu.columns
    expect(caravans.items.map((i) => i.label)).toEqual(['Toolboxes', 'Accessories'])
    expect(utes.items.map((i) => i.label)).toEqual([
      'Toolboxes',
      'Accessories',
      'Trays',
      'Canopy',
      'Service Canopy',
    ])
    // Trucks' two sections absorb the generic tops, so its column is exactly
    // its own pair — Truck Accessories under its shortLabel.
    expect(trucks.items.map((i) => i.label)).toEqual(['Truck Toolboxes', 'Accessories'])
    for (const item of utes.items) expect(item.to).toMatch(/^\/utes#/)
    for (const item of caravans.items) expect(item.to).toMatch(/^\/caravans#/)
    for (const item of trucks.items) expect(item.to).toMatch(/^\/trucks#/)
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

  it('admin category groups mirror the nav — the seven Toolboxes and every Accessories entry', () => {
    const groups = getAdminCategoryGroups()
    const group = (label) => groups.find((g) => g.label === label)

    // The Toolboxes optgroup is exactly the seven families the mega-menu lists.
    expect(group('Toolboxes').options.map((o) => o.label)).toEqual(
      getMegaMenu('toolboxes').columns.map((c) => c.label),
    )
    expect(group('Toolboxes').options).toHaveLength(7)

    // Accessories: one option per menu column, with a nesting column's leaves
    // qualified by their parent so no two options read the same. Nothing nests
    // today, so the option list is the column list verbatim.
    const accessories = group('Accessories').options.map((o) => o.label)
    for (const column of getMegaMenu('accessories').columns) {
      expect(accessories).toContain(
        column.items.length ? `${column.label} → ${column.items[0].label}` : column.label,
      )
    }
    expect(accessories).toEqual(getMegaMenu('accessories').columns.map((c) => c.label))

    // Scope-exclusive tops keep their own headings rather than sitting loose.
    expect(group('Utes').options.map((o) => o.id)).toEqual(['trays', 'canopy', 'service-canopy'])
    expect(group('Trucks').options.map((o) => o.id)).toEqual([
      'truck-toolboxes',
      'truck-accessories',
    ])
    expect(group('Custom').options.map((o) => o.id)).toEqual(['australian-made'])

    // Still every leaf, so no product can be left unfileable.
    expect(groups.flatMap((g) => g.options.map((o) => o.id)).sort()).toEqual(
      getTree()
        .flatMap((t) => getLeaves(t).map((l) => l.id))
        .sort(),
    )
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

describe('carousel tile images', () => {
  const rows = [
    // No photo — must be skipped, not treated as "the first product has none".
    { id: 'no-pic', category_id: 'locks', title: 'No Pic', slug: 'no-pic', product_images: [] },
    {
      id: 'has-pic',
      category_id: 'locks',
      title: 'Has Pic',
      slug: 'has-pic',
      product_images: [{ storage_path: 'products/has-pic/a.jpg', alt: '', position: 0 }],
    },
  ]

  it('prefers an admin upload over any product photo', () => {
    __setStateForTests({
      status: 'ready',
      products: rows.map((r) => normalizeRow(r)),
      categoryImages: { locks: 'categories/locks/tile.jpg' },
    })
    expect(getCategoryTileImage('locks')).toBe('https://cdn.test/categories/locks/tile.jpg')
  })

  it('falls back to the first product with a photo, skipping photo-less ones', () => {
    __setStateForTests({
      status: 'ready',
      products: rows.map((r) => normalizeRow(r)),
      categoryImages: {},
    })
    expect(getCategoryTileImage('locks')).toBe('https://cdn.test/products/has-pic/a.jpg')
  })

  it('resolves a parent node through its leaves — the Accessories tile', () => {
    // `accessories` is a parent, not a leaf; its products are filed under
    // `locks`. getProductsForLeaf('accessories') would find nothing.
    __setStateForTests({
      status: 'ready',
      products: rows.map((r) => normalizeRow(r)),
      categoryImages: {},
    })
    expect(getCategoryTileImage('accessories')).toBe('https://cdn.test/products/has-pic/a.jpg')
  })

  it('returns null for an empty category and for an unknown one', () => {
    __setStateForTests({ status: 'ready', products: [], categoryImages: {} })
    expect(getCategoryTileImage('locks')).toBeNull()
    expect(getCategoryTileImage('not-a-category')).toBeNull()
  })

  it('honours the caller’s array order so the admin preview matches the storefront', () => {
    const supplied = [
      { categoryId: 'locks', img: 'https://cdn.test/second.jpg' },
      { categoryId: 'locks', img: 'https://cdn.test/first.jpg' },
    ]
    expect(firstProductImageIn('locks', supplied)).toBe('https://cdn.test/second.jpg')
  })
})
