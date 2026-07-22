import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
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
  setProductHidden: vi.fn(async () => {}),
  fetchStoreDiscount: vi.fn(async () => 0),
  saveStoreDiscount: vi.fn(async () => {}),
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

  it('shows the Admin page heading', async () => {
    renderSignedIn()
    expect(await screen.findByRole('heading', { name: /^admin$/i })).toBeInTheDocument()
  })

  it('has no axe violations on the dashboard', async () => {
    const { container } = renderSignedIn()
    await screen.findByRole('heading', { name: /^admin$/i })
    expect(await axe(container)).toHaveNoViolations()
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
    hidden: true,
    product_images: [],
  },
  {
    id: 'b',
    category_id: 'job-site-toolbox',
    title: 'Job Site Box',
    price: 450,
    discount_pct: 15,
    featured: true,
    hidden: false,
    product_images: [{ storage_path: 'products/b/x.jpg', alt: '', position: 0 }],
  },
]

describe('ProductList', () => {
  it('renders a row per product with price and status badges', () => {
    render(
      <MemoryRouter>
        <ProductList rows={listRows} onEdit={() => {}} onNew={() => {}} onChanged={() => {}} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Whale Tail Lock')).toBeInTheDocument()
    expect(screen.getByText('$450')).toBeInTheDocument()
    expect(screen.getByText(/15% off/i)).toBeInTheDocument()
    expect(screen.getByText(/featured/i)).toBeInTheDocument()
  })

  it('shows a skeleton while loading', () => {
    const { container } = render(
      <MemoryRouter>
        <ProductList rows={[]} loading onEdit={() => {}} onNew={() => {}} onChanged={() => {}} />
      </MemoryRouter>,
    )
    expect(container.querySelector('.admin-skel')).not.toBeNull()
  })

  it('shows a friendly empty state with a create CTA when there are no products', () => {
    render(
      <MemoryRouter>
        <ProductList rows={[]} onEdit={() => {}} onNew={() => {}} onChanged={() => {}} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: /add your first product/i })).toBeInTheDocument()
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

  it('shows total / visible / hidden stats', () => {
    render(
      <MemoryRouter>
        <ProductList rows={listRows} onEdit={() => {}} onNew={() => {}} onChanged={() => {}} />
      </MemoryRouter>,
    )
    const total = screen.getByTestId('stat-total')
    const visible = screen.getByTestId('stat-visible')
    const hidden = screen.getByTestId('stat-hidden')
    expect(total).toHaveTextContent('2')
    expect(visible).toHaveTextContent('1')
    expect(hidden).toHaveTextContent('1')
  })

  it('filters the grid by clicking the visible / hidden stat cards', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <ProductList rows={listRows} onEdit={() => {}} onNew={() => {}} onChanged={() => {}} />
      </MemoryRouter>,
    )
    // Both show under the default "all" filter.
    expect(screen.getByText('Whale Tail Lock')).toBeInTheDocument()
    expect(screen.getByText('Job Site Box')).toBeInTheDocument()

    // Hidden card → only the hidden product (Whale Tail Lock).
    await user.click(screen.getByRole('button', { name: /hidden products/i }))
    expect(screen.getByText('Whale Tail Lock')).toBeInTheDocument()
    expect(screen.queryByText('Job Site Box')).toBeNull()

    // Visible card → only the visible product (Job Site Box).
    await user.click(screen.getByRole('button', { name: /visible products/i }))
    expect(screen.getByText('Job Site Box')).toBeInTheDocument()
    expect(screen.queryByText('Whale Tail Lock')).toBeNull()
  })

  it('toggles visibility from the row eye button', async () => {
    const user = userEvent.setup()
    const onChanged = vi.fn()
    render(
      <MemoryRouter>
        <ProductList rows={listRows} onEdit={() => {}} onNew={() => {}} onChanged={onChanged} />
      </MemoryRouter>,
    )
    // The hidden row (Whale Tail Lock) offers a "Show" action; the visible row offers "Hide".
    await user.click(screen.getByRole('button', { name: /show whale tail lock/i }))
    expect(setProductHidden).toHaveBeenCalledWith('a', false)
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
  })

  it('shows the product id as a SKU subline', () => {
    render(
      <MemoryRouter>
        <ProductList rows={listRows} onEdit={() => {}} onNew={() => {}} onChanged={() => {}} />
      </MemoryRouter>,
    )
    expect(screen.getByText(/SKU:\s*a/i)).toBeInTheDocument()
  })

  it('edits from the row pencil button', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    render(
      <MemoryRouter>
        <ProductList rows={listRows} onEdit={onEdit} onNew={() => {}} onChanged={() => {}} />
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('button', { name: /edit whale tail lock/i }))
    expect(onEdit).toHaveBeenCalledWith(listRows[0])
  })

  it('deletes in two steps from the trash button', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <ProductList rows={listRows} onEdit={() => {}} onNew={() => {}} onChanged={() => {}} />
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('button', { name: /delete whale tail lock/i }))
    expect(await screen.findByRole('button', { name: /confirm delete/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('paginates to 10 rows per page by default and pages through the rest', async () => {
    const user = userEvent.setup()
    const many = Array.from({ length: 14 }, (_, i) => ({
      id: `p${i}`,
      category_id: 'locks',
      title: `Product ${i}`,
      price: 10,
      discount_pct: null,
      featured: false,
      hidden: false,
      product_images: [],
    }))
    render(
      <MemoryRouter>
        <ProductList rows={many} onEdit={() => {}} onNew={() => {}} onChanged={() => {}} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Product 0')).toBeInTheDocument()
    expect(screen.queryByText('Product 12')).toBeNull()
    expect(screen.getByText(/showing 1 to 10 of 14/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /go to page 2/i }))
    expect(screen.getByText('Product 12')).toBeInTheDocument()
    expect(screen.queryByText('Product 0')).toBeNull()
  })

  it('resets to page 1 when the search query changes', async () => {
    const user = userEvent.setup()
    const many = Array.from({ length: 14 }, (_, i) => ({
      id: `p${i}`,
      category_id: 'locks',
      title: `Product ${i}`,
      price: 10,
      discount_pct: null,
      featured: false,
      hidden: false,
      product_images: [],
    }))
    render(
      <MemoryRouter>
        <ProductList rows={many} onEdit={() => {}} onNew={() => {}} onChanged={() => {}} />
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('button', { name: /go to page 2/i }))
    await userEvent.type(screen.getByLabelText(/search/i), 'Product 1')
    expect(screen.getByText(/showing 1 to/i)).toBeInTheDocument()
  })
})

const { default: StatCards } = await import('../pages/admin/StatCards.jsx')
const { saveStoreDiscount } = await import('../lib/adminApi.js')

describe('StatCards', () => {
  it('renders total / visible / hidden counts', () => {
    render(<StatCards total={5} visibleCount={3} hiddenCount={2} />)
    expect(screen.getByTestId('stat-total')).toHaveTextContent('5')
    expect(screen.getByTestId('stat-visible')).toHaveTextContent('3')
    expect(screen.getByTestId('stat-hidden')).toHaveTextContent('2')
  })

  it('opens the discount modal, applies a value, and closes', async () => {
    const user = userEvent.setup()
    render(<StatCards total={5} visibleCount={3} hiddenCount={2} />)
    await user.click(screen.getByRole('button', { name: /manage discount/i }))
    const dialog = await screen.findByRole('dialog', { name: /store-wide discount/i })
    expect(dialog).toBeInTheDocument()
    // Scoped to the dialog: the dialog's own aria-label also matches
    // /store-wide discount/i, so an unscoped screen.getByLabelText would
    // resolve to two elements (the dialog and the form's input).
    const input = within(dialog).getByLabelText(/store-wide discount/i)
    await user.clear(input)
    await user.type(input, '20')
    await user.click(screen.getByRole('button', { name: /^apply$/i }))
    expect(saveStoreDiscount).toHaveBeenCalledWith(20)
    expect(await screen.findByText('20%')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /store-wide discount/i })).toBeNull(),
    )
  })
})

const { default: ProductEditor } = await import('../pages/admin/ProductEditor.jsx')
const { saveProduct, watchSession, setProductHidden } = await import('../lib/adminApi.js')

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

  it('shows a hero preview of the primary photo when editing', () => {
    const row = {
      id: 'x',
      title: 'Job Site Box',
      category_id: 'locks',
      product_images: [
        { id: 'i2', storage_path: 'products/x/b.jpg', position: 1, alt: '' },
        { id: 'i1', storage_path: 'products/x/a.jpg', position: 0, alt: '' },
      ],
    }
    const { container } = render(
      <ProductEditor row={row} rows={[row]} onDone={() => {}} onCancel={() => {}} />,
    )
    const hero = container.querySelector('.admin-editor__hero-img')
    expect(hero).not.toBeNull()
    // Position 0 wins as the hero, regardless of array order.
    expect(hero.getAttribute('src')).toContain('products/x/a.jpg')
  })

  it('offers the three colour checkboxes, unchecked by default', () => {
    render(<ProductEditor row={null} rows={[]} onDone={() => {}} onCancel={() => {}} />)
    for (const label of ['Silver', 'White', 'Black']) {
      const box = screen.getByLabelText(label)
      expect(box).toBeInTheDocument()
      expect(box).not.toBeChecked()
    }
  })

  it('saves the ticked colours in canonical order', async () => {
    const user = userEvent.setup()
    render(<ProductEditor row={null} rows={[]} onDone={() => {}} onCancel={() => {}} />)
    await user.type(screen.getByLabelText(/^title/i), 'Colour Box')
    await user.selectOptions(screen.getByLabelText(/category/i), 'locks')
    // Tick out of order — the payload must still come back silver-then-black.
    await user.click(screen.getByLabelText('Black'))
    await user.click(screen.getByLabelText('Silver'))
    await user.click(screen.getByRole('button', { name: /save product/i }))
    expect(saveProduct).toHaveBeenCalledWith(
      expect.objectContaining({ colors: ['silver', 'black'] }),
      { isNew: true },
    )
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
