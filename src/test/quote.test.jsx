// Contract: the quote store holds the enquiry list, persists it, and serializes
// it into the exact text the shop receives by email. Pure-logic tests — no React.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HelmetProvider } from 'react-helmet-async'
import {
  addItem,
  updateItem,
  removeItem,
  clearItems,
  openQuote,
  closeQuote,
  serializeQuoteItems,
  useQuote,
} from '../lib/quoteStore.js'
import QuoteButton from '../components/QuoteButton.jsx'
import { MemoryRouter } from 'react-router-dom'
import { axe, toHaveNoViolations } from 'jest-axe'
import QuoteDrawer from '../components/QuoteDrawer.jsx'
import Navbar from '../components/Navbar.jsx'
import QuotePage from '../pages/QuotePage.jsx'

expect.extend(toHaveNoViolations)

// The /quote form only renders once Formspree is configured (a real
// VITE_FORMSPREE_ID). That env var is developer/CI-local and unset here, so
// force it on for this file only — QuotePage's rendered form is what we're
// testing, not the env wiring itself.
vi.mock('../config/site.config.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    site: {
      ...actual.site,
      integrations: { ...actual.site.integrations, formspreeId: 'test-form-id' },
    },
  }
})

// The store is a module singleton; reset it (and its localStorage mirror)
// before each test so cases don't leak into one another.
beforeEach(() => {
  clearItems()
  closeQuote()
  window.localStorage.clear()
})

const TB295 = {
  id: 'tb-295',
  name: 'TB-295',
  category: 'Caravan',
  priceFrom: 3900,
  standardDims: '2200×570×1010',
}
const TB150 = {
  id: 'tb-150',
  name: 'TB-150',
  category: 'Caravan',
  priceFrom: 1800,
  standardDims: '1500×600×900',
}

// A tiny non-React reader for the store snapshot in logic tests.
const snap = () => useQuote.__getSnapshot()

describe('quoteStore — actions', () => {
  it('adds an item with normalized defaults and opens the drawer', () => {
    addItem(TB295)
    const s = snap()
    expect(s.isOpen).toBe(true)
    expect(s.items).toHaveLength(1)
    expect(s.items[0]).toMatchObject({
      id: 'tb-295',
      name: 'TB-295',
      category: 'Caravan',
      priceFrom: 3900,
      standardDims: '2200×570×1010',
      dims: { w: '', h: '', d: '' },
      qty: 1,
      notes: '',
    })
  })

  it('dedupes by id — re-adding does not duplicate the line', () => {
    addItem(TB295)
    addItem(TB295)
    expect(snap().items).toHaveLength(1)
  })

  it('updates, removes and clears items', () => {
    addItem(TB295)
    updateItem('tb-295', { qty: 3, dims: { w: '2100', h: '560', d: '1000' }, notes: 'raise lid' })
    expect(snap().items[0]).toMatchObject({
      qty: 3,
      dims: { w: '2100', h: '560', d: '1000' },
      notes: 'raise lid',
    })
    removeItem('tb-295')
    expect(snap().items).toHaveLength(0)
    addItem(TB150)
    clearItems()
    expect(snap().items).toHaveLength(0)
  })

  it('persists the list to localStorage', () => {
    addItem(TB295)
    const raw = window.localStorage.getItem('urbantoolboxes:quote')
    expect(JSON.parse(raw)[0].id).toBe('tb-295')
  })
})

describe('quoteStore — serializeQuoteItems', () => {
  it('renders standard, custom and price-on-enquiry lines exactly', () => {
    const items = [
      {
        id: 'tb-295',
        name: 'TB-295',
        category: 'Caravan',
        priceFrom: 3900,
        standardDims: '2200×570×1010',
        dims: { w: '', h: '', d: '' },
        qty: 1,
        notes: 'extra lid clearance',
      },
      {
        id: 'tb-150',
        name: 'TB-150',
        category: 'Caravan',
        priceFrom: 1800,
        standardDims: '1500×600×900',
        dims: { w: '1600', h: '600', d: '900' },
        qty: 2,
        notes: '',
      },
      {
        id: 'tray-a',
        name: 'Tray A',
        category: 'Utes',
        priceFrom: null,
        standardDims: '',
        dims: { w: '', h: '', d: '' },
        qty: 1,
        notes: '',
      },
    ]
    expect(serializeQuoteItems(items)).toBe(
      [
        '1× TB-295 (Caravan) — 2200×570×1010mm — from $3900+GST — Notes: extra lid clearance',
        '2× TB-150 (Caravan) — custom 1600×600×900mm — from $1800+GST — Notes: —',
        '1× Tray A (Utes) — size TBC — price on enquiry — Notes: —',
      ].join('\n'),
    )
  })
})

describe('QuoteButton', () => {
  it('adds the item and flips to the in-quote state', async () => {
    const user = userEvent.setup()
    render(
      <QuoteButton
        item={{
          id: 'tb-165',
          name: 'TB-165',
          category: 'Caravan',
          priceFrom: 1750,
          standardDims: '1565×520×680',
        }}
      />,
    )
    const btn = screen.getByRole('button', { name: /add to quote/i })
    await user.click(btn)
    expect(useQuote.__getSnapshot().items.some((i) => i.id === 'tb-165')).toBe(true)
    expect(screen.getByText(/in your quote/i)).toBeInTheDocument()
  })
})

describe('QuoteDrawer', () => {
  it('lists added items with editable specs and has no axe violations', async () => {
    addItem({
      id: 'tb-277',
      name: 'TB-277',
      category: 'Caravan',
      priceFrom: 1900,
      standardDims: '2000×710×700',
    })
    openQuote()
    const { container } = render(
      <MemoryRouter>
        <QuoteDrawer />
      </MemoryRouter>,
    )
    expect(screen.getByRole('dialog', { name: /your quote/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'TB-277' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send enquiry/i })).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('Navbar quote badge', () => {
  it('is hidden when empty and shows the count once items are added', async () => {
    const { rerender } = render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('button', { name: /open your quote/i })).toBeNull()

    act(() => {
      addItem({
        id: 'tb-199',
        name: 'TB-199',
        category: 'Caravan',
        priceFrom: 1950,
        standardDims: '1900×540×950',
      })
    })
    rerender(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    )
    // Badge appears in both desktop and mobile navs.
    expect(screen.getAllByRole('button', { name: /open your quote/i })).toHaveLength(2)
  })
})

describe('QuotePage — quote list summary', () => {
  it('shows the item summary and the serialized hidden field', () => {
    addItem({
      id: 'tb-150',
      name: 'TB-150',
      category: 'Caravan',
      priceFrom: 1800,
      standardDims: '1500×600×900',
    })
    const { container } = render(
      <HelmetProvider>
        <MemoryRouter>
          <QuotePage />
        </MemoryRouter>
      </HelmetProvider>,
    )
    // Item name appears in the on-page summary.
    expect(screen.getByText('TB-150')).toBeInTheDocument()
    // Hidden field carries the serialized list for Formspree.
    const hidden = container.querySelector('input[name="quote_items"]')
    expect(hidden).not.toBeNull()
    expect(hidden.value).toBe(serializeQuoteItems(useQuote.__getSnapshot().items))
  })
})
