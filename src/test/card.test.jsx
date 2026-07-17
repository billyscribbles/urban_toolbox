// Contract: a product Card links the photo, title and "View details" to the
// product's own page (/product/<slug>), replacing the old ?product= drawer.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Card from '../components/Card.jsx'

describe('Card — product cards link to their product page', () => {
  it('links the title and View details to /product/<slug>', () => {
    render(
      <MemoryRouter>
        <Card
          title="580 Toolbox"
          slug="580-toolbox"
          img="https://cdn.test/x.jpg"
          quote={{ id: '580', priceFrom: 450 }}
          price={450}
          quoteCategory="Toolboxes"
        />
      </MemoryRouter>,
    )
    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThan(0)
    for (const l of links) expect(l).toHaveAttribute('href', '/product/580-toolbox')
    expect(screen.getByText(/view details/i)).toBeInTheDocument()
  })

  it('falls back to the id when a product has no slug', () => {
    render(
      <MemoryRouter>
        <Card
          title="No Slug"
          img="https://cdn.test/x.jpg"
          quote={{ id: 42, priceFrom: null }}
          quoteCategory="Toolboxes"
        />
      </MemoryRouter>,
    )
    for (const l of screen.getAllByRole('link')) {
      expect(l).toHaveAttribute('href', '/product/42')
    }
  })

  it('does not link a plain content card (no quote descriptor)', () => {
    render(
      <MemoryRouter>
        <Card title="Just Info" body="No shop wiring here." img="https://cdn.test/x.jpg" />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('link')).toBeNull()
  })
})
