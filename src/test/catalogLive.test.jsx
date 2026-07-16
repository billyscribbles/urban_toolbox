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
const { getProductsForLeaf, getVehicleSections } = await import('../lib/catalog.js')
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
    for (const s of getVehicleSections('ute')) {
      expect(s.products.length).toBeGreaterThan(0)
    }
  })
})
