import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

vi.mock('../lib/adminApi.js', () => ({
  watchSession: async (onChange) => {
    onChange(null)
    return () => {}
  },
  signIn: vi.fn(async () => ({ error: { message: 'Invalid login credentials' } })),
  signOut: vi.fn(),
  fetchAdminProducts: vi.fn(async () => []),
  saveProduct: vi.fn(async () => ({ error: null })),
  deleteProduct: vi.fn(),
  uploadPhotos: vi.fn(),
  deletePhoto: vi.fn(),
  swapPhotoPositions: vi.fn(),
  fetchProductImages: vi.fn(async () => []),
}))

const { default: AdminPage } = await import('../pages/admin/AdminPage.jsx')

function renderAdmin() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    </HelmetProvider>,
  )
}

describe('AdminPage — signed out', () => {
  it('shows the login form, not the dashboard', async () => {
    renderAdmin()
    expect(await screen.findByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.queryByText(/catalogue admin/i)).toBeNull()
  })

  it('has no axe violations', async () => {
    const { container } = renderAdmin()
    await screen.findByLabelText(/email/i)
    expect(await axe(container)).toHaveNoViolations()
  })
})

const { default: ProductList } = await import('../pages/admin/ProductList.jsx')

const listRows = [
  {
    id: 'a',
    category_id: 'locks',
    title: 'Whale Tail Lock',
    price: 45,
    discount_pct: null,
    featured: false,
    product_images: [],
  },
  {
    id: 'b',
    category_id: 'job-site-toolbox',
    title: 'Job Site Box',
    price: 450,
    discount_pct: 15,
    featured: true,
    product_images: [{ storage_path: 'products/b/x.jpg', alt: '', position: 0 }],
  },
]

describe('ProductList', () => {
  it('renders a row per product with price and discount', () => {
    render(
      <MemoryRouter>
        <ProductList rows={listRows} onEdit={() => {}} onNew={() => {}} onChanged={() => {}} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Whale Tail Lock')).toBeInTheDocument()
    expect(screen.getByText('$450')).toBeInTheDocument()
    expect(screen.getByText('15%')).toBeInTheDocument()
  })

  it('filters by title search', async () => {
    render(
      <MemoryRouter>
        <ProductList rows={listRows} onEdit={() => {}} onNew={() => {}} onChanged={() => {}} />
      </MemoryRouter>,
    )
    await userEvent.type(screen.getByLabelText(/search/i), 'whale')
    expect(screen.getByText('Whale Tail Lock')).toBeInTheDocument()
    expect(screen.queryByText('Job Site Box')).toBeNull()
  })
})
