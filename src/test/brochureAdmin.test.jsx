import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

// The factory replaces the whole module, so every export the components under
// test reach for must appear here — an unlisted one arrives as undefined and
// vitest throws. ProductList itself only needs the first two below, but it
// renders StatCards (store discount + promo banner), which pulls in the rest
// through its DiscountModal/PromoModal children.
vi.mock('../lib/adminApi.js', () => ({
  uploadBrochure: vi.fn(async () => 'brochures/p1/new12345.pdf'),
  deleteBrochure: vi.fn(async () => null),
  deleteProduct: vi.fn(async () => {}),
  setProductHidden: vi.fn(async () => {}),
  fetchStoreDiscount: vi.fn(async () => 0),
  saveStoreDiscount: vi.fn(async () => {}),
  fetchPromoBanner: vi.fn(async () => ({ enabled: false, messages: [] })),
  savePromoBanner: vi.fn(async () => {}),
}))

vi.mock('../lib/supabaseClient.js', () => ({
  isConfigured: () => true,
  publicPhotoUrl: (p) => `https://cdn.test/${p}`,
  publicFileUrl: (p) => `https://cdn.test/${p}`,
  getSupabase: () => Promise.resolve(null),
}))

const { default: BrochureManager } = await import('../pages/admin/BrochureManager.jsx')
const { uploadBrochure, deleteBrochure } = await import('../lib/adminApi.js')

describe('BrochureManager', () => {
  // applyAccept is a *setup* option in user-event v14, not an argument to
  // upload(). Setting it false skips the input's accept filter, which is what
  // the native file dialog does when the user switches it to "All files".
  // Left on, user-event drops the file before onChange and the guard is never
  // exercised — but the guard exists precisely for the bypassed-filter case,
  // so that is the scenario worth covering.
  it('rejects a non-PDF without uploading', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<BrochureManager productId="p1" brochurePath={null} onBrochureChange={vi.fn()} />)

    await user.upload(
      screen.getByLabelText(/brochure/i),
      new File(['x'], 'photo.png', { type: 'image/png' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(/pdf/i)
    expect(uploadBrochure).not.toHaveBeenCalled()
  })

  it('rejects a PDF over 20MB without uploading', async () => {
    const user = userEvent.setup()
    render(<BrochureManager productId="p1" brochurePath={null} onBrochureChange={vi.fn()} />)

    const big = new File(['x'], 'big.pdf', { type: 'application/pdf' })
    Object.defineProperty(big, 'size', { value: 21 * 1024 * 1024 })
    await user.upload(screen.getByLabelText(/brochure/i), big)

    expect(await screen.findByRole('alert')).toHaveTextContent(/20MB/i)
    expect(uploadBrochure).not.toHaveBeenCalled()
  })

  it('uploads a valid PDF and reports the new path upward', async () => {
    const user = userEvent.setup()
    const onBrochureChange = vi.fn()
    render(
      <BrochureManager productId="p1" brochurePath={null} onBrochureChange={onBrochureChange} />,
    )

    await user.upload(
      screen.getByLabelText(/brochure/i),
      new File(['x'], 'spec.pdf', { type: 'application/pdf' }),
    )

    await waitFor(() => expect(onBrochureChange).toHaveBeenCalledWith('brochures/p1/new12345.pdf'))
  })

  it('deletes the current brochure and reports null upward', async () => {
    const user = userEvent.setup()
    const onBrochureChange = vi.fn()
    render(
      <BrochureManager
        productId="p1"
        brochurePath="brochures/p1/old12345.pdf"
        onBrochureChange={onBrochureChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: /delete brochure/i }))

    await waitFor(() => expect(onBrochureChange).toHaveBeenCalledWith(null))
    expect(deleteBrochure).toHaveBeenCalledWith({
      id: 'p1',
      brochure_path: 'brochures/p1/old12345.pdf',
    })
  })

  it('has no accessibility violations', async () => {
    const { container } = render(
      <BrochureManager
        productId="p1"
        brochurePath="brochures/p1/old12345.pdf"
        onBrochureChange={vi.fn()}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

const { default: ProductList } = await import('../pages/admin/ProductList.jsx')

describe('admin list brochure chip', () => {
  const baseRow = {
    category_id: 'locks',
    title: 'Job Site Box',
    slug: 'job-site-box',
    price: 450,
    hidden: false,
    featured: false,
    sort_order: 0,
    product_images: [],
  }

  function renderList(rows) {
    return render(
      <MemoryRouter>
        <ProductList
          rows={rows}
          loading={false}
          onEdit={vi.fn()}
          onNew={vi.fn()}
          onChanged={vi.fn()}
        />
      </MemoryRouter>,
    )
  }

  it('shows a PDF chip only on rows that have a brochure', () => {
    renderList([
      { ...baseRow, id: 'with-pdf', brochure_path: 'brochures/with-pdf/a1b2c3d4.pdf' },
      { ...baseRow, id: 'no-pdf', title: 'Plain Box', slug: 'plain-box' },
    ])

    expect(screen.getAllByText('PDF')).toHaveLength(1)
  })
})
