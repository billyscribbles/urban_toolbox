import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

vi.mock('../lib/adminApi.js', () => ({
  watchSession: vi.fn(async (onChange) => {
    onChange(null)
    return () => {}
  }),
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
    expect(screen.queryByRole('link', { name: /return to site/i })).toBeNull()
  })

  it('has no axe violations', async () => {
    const { container } = renderAdmin()
    await screen.findByLabelText(/email/i)
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('AdminPage — signed in', () => {
  function renderSignedIn() {
    watchSession.mockImplementationOnce(async (onChange) => {
      onChange({ user: { id: 'u1' } })
      return () => {}
    })
    return renderAdmin()
  }

  it('shows the standalone top bar with a Return to site link and Sign out', async () => {
    renderSignedIn()
    expect(await screen.findByRole('link', { name: /return to site/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })

  it('opens the editor tray on New product and closes it on Escape', async () => {
    const user = userEvent.setup()
    renderSignedIn()
    const newBtn = await screen.findByRole('button', { name: /new product/i })
    await user.click(newBtn)
    expect(await screen.findByRole('dialog', { name: /new product/i })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /new product/i })).toBeNull())
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

const { default: ProductEditor } = await import('../pages/admin/ProductEditor.jsx')
const { saveProduct, watchSession } = await import('../lib/adminApi.js')

describe('ProductEditor', () => {
  it('blocks save with inline errors when title is empty', async () => {
    render(<ProductEditor row={null} rows={[]} onDone={() => {}} onCancel={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /save product/i }))
    expect(await screen.findByText(/title is required/i)).toBeInTheDocument()
    expect(saveProduct).not.toHaveBeenCalled()
  })

  it('rejects a discount without a price', async () => {
    render(<ProductEditor row={null} rows={[]} onDone={() => {}} onCancel={() => {}} />)
    await userEvent.type(screen.getByLabelText(/^title/i), 'Test Box')
    await userEvent.selectOptions(screen.getByLabelText(/category/i), 'locks')
    await userEvent.type(screen.getByLabelText(/discount/i), '15')
    await userEvent.click(screen.getByRole('button', { name: /save product/i }))
    expect(await screen.findByText(/set a price before/i)).toBeInTheDocument()
  })

  it('saves a valid new product with generated id and slug', async () => {
    const onDone = vi.fn()
    render(<ProductEditor row={null} rows={[]} onDone={onDone} onCancel={() => {}} />)
    await userEvent.type(screen.getByLabelText(/^title/i), 'Whale Lock MkII')
    await userEvent.selectOptions(screen.getByLabelText(/category/i), 'locks')
    await userEvent.click(screen.getByRole('button', { name: /save product/i }))
    expect(saveProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'whale-lock-mkii',
        slug: 'whale-lock-mkii',
        categoryId: 'locks',
      }),
      { isNew: true },
    )
    expect(onDone).toHaveBeenCalled()
  })
})

const { default: EditorTray } = await import('../pages/admin/EditorTray.jsx')

describe('EditorTray', () => {
  it('renders a labelled dialog for a new product and closes via Escape', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<EditorTray editing="new" rows={[]} onDone={() => {}} onCancel={onCancel} />)
    expect(screen.getByRole('dialog', { name: /new product/i })).toBeInTheDocument()
    // The form is hosted inside the tray.
    expect(screen.getByRole('button', { name: /save product/i })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalled()
  })

  it('labels the dialog with the product title when editing', () => {
    const row = { id: 'x', title: 'Job Site Box', category_id: 'locks', product_images: [] }
    render(<EditorTray editing={row} rows={[row]} onDone={() => {}} onCancel={() => {}} />)
    expect(screen.getByRole('dialog', { name: /edit — job site box/i })).toBeInTheDocument()
  })

  it('renders nothing when editing is null', () => {
    render(<EditorTray editing={null} rows={[]} onDone={() => {}} onCancel={() => {}} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
