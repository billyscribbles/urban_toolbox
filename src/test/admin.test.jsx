import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

// Pins photo URLs to a stable host so thumbnail assertions don't depend on
// whichever VITE_SUPABASE_URL happens to be in .env.
vi.mock('../lib/supabaseClient.js', () => ({
  isConfigured: () => true,
  publicPhotoUrl: (p) => `https://cdn.test/${p}`,
  getSupabase: () => Promise.resolve(null),
}))

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
  fetchPromoBanner: vi.fn(async () => ({ enabled: false, messages: [] })),
  uploadPhotos: vi.fn(),
  deletePhoto: vi.fn(),
  swapPhotoPositions: vi.fn(),
  fetchProductImages: vi.fn(async () => []),
  fetchCategoryImages: vi.fn(async () => []),
  uploadCategoryImage: vi.fn(async () => {}),
  deleteCategoryImage: vi.fn(async () => {}),
  uploadBrochure: vi.fn(async () => 'brochures/x/new12345.pdf'),
  deleteBrochure: vi.fn(async () => null),
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

  it('splits the dashboard into Products and Home carousel tabs, Products first', async () => {
    renderSignedIn()
    const tablist = await screen.findByRole('tablist', { name: /admin sections/i })
    const tabs = within(tablist).getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual(['Products', 'Home carousel'])
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    // Only the selected panel is mounted — the carousel card is not just hidden.
    expect(screen.getByRole('button', { name: /new product/i })).toBeInTheDocument()
    expect(screen.queryByText(/home carousel photos/i)).toBeNull()
  })

  it('swaps the panel when the Home carousel tab is chosen', async () => {
    const user = userEvent.setup()
    renderSignedIn()
    await user.click(await screen.findByRole('tab', { name: /home carousel/i }))
    expect(await screen.findByText(/home carousel photos/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /new product/i })).toBeNull()
  })

  it('moves between tabs with the arrow keys, carrying focus', async () => {
    const user = userEvent.setup()
    renderSignedIn()
    const products = await screen.findByRole('tab', { name: /products/i })
    products.focus()
    await user.keyboard('{ArrowRight}')
    const carousel = screen.getByRole('tab', { name: /home carousel/i })
    expect(carousel).toHaveAttribute('aria-selected', 'true')
    expect(carousel).toHaveFocus()
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
    category_id: 'top-opening-toolboxes',
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
const { saveStoreDiscount, fetchPromoBanner } = await import('../lib/adminApi.js')

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
    // /store-wide discount/i, and so does the close button's aria-label
    // ("Close store-wide discount dialog", derived from AdminModal's title
    // prop), so an unanchored match would resolve to multiple elements.
    // Anchor to the exact form label text to isolate the input.
    const input = within(dialog).getByLabelText(/^store-wide discount$/i)
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

  it('shows a promo banner card that opens the editor', async () => {
    const user = userEvent.setup()
    fetchPromoBanner.mockResolvedValueOnce({ enabled: true, messages: ['30% off', 'Aussie made'] })
    render(
      <StatCards total={3} visibleCount={2} hiddenCount={1} filter="all" onFilter={() => {}} />,
    )

    expect(await screen.findByTestId('stat-promo')).toHaveTextContent('On')
    expect(screen.getByTestId('stat-promo')).toHaveTextContent('2 messages')

    await user.click(screen.getByRole('button', { name: /manage banner/i }))
    expect(await screen.findByRole('dialog', { name: /promo banner/i })).toBeInTheDocument()
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

  it('defaults a new product to in stock and saves the back-order choice', async () => {
    const user = userEvent.setup()
    render(<ProductEditor row={null} rows={[]} onDone={() => {}} onCancel={() => {}} />)
    expect(screen.getByLabelText('In stock')).toBeChecked()
    expect(screen.getByLabelText('Back order')).not.toBeChecked()
    await user.type(screen.getByLabelText(/^title/i), 'Back Order Box')
    await user.selectOptions(screen.getByLabelText(/category/i), 'locks')
    await user.click(screen.getByLabelText('Back order'))
    expect(screen.getByLabelText('In stock')).not.toBeChecked()
    await user.click(screen.getByRole('button', { name: /save product/i }))
    expect(saveProduct).toHaveBeenCalledWith(expect.objectContaining({ inStock: false }), {
      isNew: true,
    })
  })

  // The dashboard axe pass renders the list, not the tray, so the editor's own
  // form controls were never checked. Availability added two more, so close it.
  it('has no axe violations, availability radios included', async () => {
    const { container } = render(
      <ProductEditor row={null} rows={[]} onDone={() => {}} onCancel={() => {}} />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('reflects a stored back-order row when editing', () => {
    const row = {
      id: 'x',
      title: 'Job Site Box',
      category_id: 'locks',
      in_stock: false,
      product_images: [],
    }
    render(<ProductEditor row={row} rows={[row]} onDone={() => {}} onCancel={() => {}} />)
    expect(screen.getByLabelText('Back order')).toBeChecked()
    expect(screen.getByLabelText('In stock')).not.toBeChecked()
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

const { default: CarouselImages } = await import('../pages/admin/CarouselImages.jsx')
const { homeCarousel } = await import('../content/homeCarousel.js')
const { fetchCategoryImages, uploadCategoryImage } = await import('../lib/adminApi.js')

const tileRows = [
  // Hidden — the storefront carousel never borrows a hidden product's photo,
  // so this must not become the Under Tray tile's preview.
  {
    id: 'hidden-one',
    category_id: 'under-tray-toolboxes',
    title: 'Hidden',
    sort_order: 0,
    hidden: true,
    product_images: [{ storage_path: 'products/hidden-one/a.jpg', position: 0 }],
  },
  {
    id: 'visible-one',
    category_id: 'under-tray-toolboxes',
    title: 'Visible',
    sort_order: 1,
    hidden: false,
    product_images: [{ storage_path: 'products/visible-one/a.jpg', position: 0 }],
  },
]

describe('CarouselImages', () => {
  it('renders one entry per carousel tile', async () => {
    render(<CarouselImages rows={[]} />)
    await waitFor(() => expect(fetchCategoryImages).toHaveBeenCalled())
    for (const tile of homeCarousel) {
      expect(screen.getByText(tile.label)).toBeInTheDocument()
    }
  })

  it('previews the first VISIBLE product photo as the fallback', async () => {
    render(<CarouselImages rows={tileRows} />)
    const tile = await screen.findByTestId('tile-under-tray-toolboxes')
    // Query the node directly, not getByRole('img') — the thumbnail is alt=""
    // (decorative, the label beside it names the tile), so it has no img role.
    expect(tile.querySelector('.admin-tile__img')).toHaveAttribute(
      'src',
      'https://cdn.test/products/visible-one/a.jpg',
    )
    expect(within(tile).getByText(/from first product/i)).toBeInTheDocument()
  })

  it('says No image when the category has no products and no upload', async () => {
    render(<CarouselImages rows={[]} />)
    const tile = await screen.findByTestId('tile-dog-boxes')
    expect(within(tile).getByText(/no image/i)).toBeInTheDocument()
    expect(tile.querySelector('.admin-tile__img')).toBeNull()
  })

  it('uploads the chosen file against the right category', async () => {
    const user = userEvent.setup()
    render(<CarouselImages rows={[]} />)
    const tile = await screen.findByTestId('tile-canopies')
    const input = within(tile).getByLabelText(/upload photo for canopies/i)
    // The input stays disabled until the mount fetch resolves; uploading to a
    // disabled input silently does nothing, so wait for it to enable first.
    await waitFor(() => expect(input).toBeEnabled())
    const file = new File(['x'], 'tile.jpg', { type: 'image/jpeg' })
    await user.upload(input, file)
    await waitFor(() => expect(uploadCategoryImage).toHaveBeenCalledWith('canopies', file))
  })
})
