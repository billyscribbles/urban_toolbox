// Contract: the catalog search filter matches on titles only — every typed
// keyword must appear (case-insensitive) in a product's title, sections that
// end up empty vanish, and an empty query is a no-op passthrough. The
// ProductRange search box drives that filter live, announces the match count,
// and offers a way back out of a zero-result dead end.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ProductRange from '../components/ProductRange.jsx'
import { filterSections } from '../lib/productSearch.js'

const sections = [
  {
    id: 'canopies',
    label: 'Canopies',
    heading: 'Canopies',
    products: [
      { id: 1, title: 'Black Service Canopy' },
      { id: 2, title: 'Flat Top Canopy' },
    ],
  },
  {
    id: 'trays',
    label: 'Trays',
    heading: 'Trays',
    products: [{ id: 3, title: 'Heavy Duty Ute Tray' }],
  },
]

describe('filterSections — title keyword matching', () => {
  it('returns sections untouched for an empty or whitespace query', () => {
    expect(filterSections(sections, '')).toBe(sections)
    expect(filterSections(sections, '   ')).toBe(sections)
  })

  it('matches case-insensitively on title substrings', () => {
    const out = filterSections(sections, 'CANOPY')
    expect(out).toHaveLength(1)
    expect(out[0].products.map((p) => p.id)).toEqual([1, 2])
  })

  it('requires every keyword to match (AND semantics, any order)', () => {
    const out = filterSections(sections, 'canopy black')
    expect(out).toHaveLength(1)
    expect(out[0].products.map((p) => p.id)).toEqual([1])
  })

  it('drops sections left with no matching products', () => {
    const out = filterSections(sections, 'tray')
    expect(out.map((s) => s.id)).toEqual(['trays'])
  })

  it('returns an empty list when nothing matches', () => {
    expect(filterSections(sections, 'toolbox')).toEqual([])
  })
})

const renderRange = () =>
  render(
    <MemoryRouter>
      <ProductRange data={{ header: { title: 'Toolboxes' }, sections }} />
    </MemoryRouter>,
  )

describe('ProductRange — search box filters the grids', () => {
  it('shows every product until a query is typed', () => {
    renderRange()
    expect(screen.getByRole('searchbox', { name: /search products/i })).toBeInTheDocument()
    expect(screen.getByText('Black Service Canopy')).toBeInTheDocument()
    expect(screen.getByText('Heavy Duty Ute Tray')).toBeInTheDocument()
  })

  it('narrows to matching titles and announces the count', async () => {
    renderRange()
    await userEvent.type(screen.getByRole('searchbox', { name: /search products/i }), 'canopy')
    expect(screen.getByText('Black Service Canopy')).toBeInTheDocument()
    expect(screen.getByText('Flat Top Canopy')).toBeInTheDocument()
    expect(screen.queryByText('Heavy Duty Ute Tray')).not.toBeInTheDocument()
    // The empty Trays section heading disappears with its products.
    expect(screen.queryByRole('heading', { name: 'Trays' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('2 products match')
  })

  it('restores the full range when the query is cleared', async () => {
    renderRange()
    const box = screen.getByRole('searchbox', { name: /search products/i })
    await userEvent.type(box, 'tray')
    expect(screen.queryByText('Flat Top Canopy')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /clear search/i }))
    expect(box).toHaveValue('')
    expect(screen.getByText('Flat Top Canopy')).toBeInTheDocument()
  })

  it('offers a clear button in the zero-result empty state', async () => {
    renderRange()
    await userEvent.type(screen.getByRole('searchbox', { name: /search products/i }), 'gullwing')
    expect(screen.getByText(/no products match/i)).toBeInTheDocument()
    // Two clear affordances: the input's ✕ and the empty state's button.
    const clears = screen.getAllByRole('button', { name: /clear search/i })
    await userEvent.click(clears[clears.length - 1])
    expect(screen.getByText('Heavy Duty Ute Tray')).toBeInTheDocument()
  })
})
