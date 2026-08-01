import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
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
const { default: ProductPage } = await import('../pages/ProductPage.jsx')

function renderProduct(slug) {
  __setStateForTests({
    status: 'ready',
    products: productRows.map((r) => normalizeRow(r)),
    categoryImages: {},
  })
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/product/${slug}`]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductPage />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  )
}

describe('product page brochure', () => {
  it('links to the brochure with a forced download when the product has one', () => {
    renderProduct('job-site-box')

    const link = screen.getByRole('link', { name: /download brochure/i })
    expect(link).toHaveAttribute(
      'href',
      'https://cdn.test/brochures/job-site-toolbox-1/abc12345.pdf?download=urban-toolbox-job-site-box-brochure.pdf',
    )
  })

  it('renders no brochure link when the product has none', () => {
    renderProduct('580-x-230-x-400mm-aluminium-checker-ute-toolbox')

    expect(screen.queryByRole('link', { name: /download brochure/i })).toBeNull()
  })
})
