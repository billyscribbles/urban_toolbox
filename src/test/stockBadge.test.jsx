import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StockBadge from '../components/StockBadge.jsx'

describe('StockBadge', () => {
  it('reads "In stock" for a stocked product', () => {
    render(<StockBadge inStock />)
    expect(screen.getByText('In stock')).toBeInTheDocument()
    expect(screen.queryByText(/back order/i)).toBeNull()
  })

  it('reads "Back order" when the product is not stocked', () => {
    render(<StockBadge inStock={false} />)
    expect(screen.getByText('Back order')).toBeInTheDocument()
    expect(screen.queryByText(/in stock/i)).toBeNull()
  })

  it('treats a missing flag as in stock, matching the column default', () => {
    render(<StockBadge />)
    expect(screen.getByText('In stock')).toBeInTheDocument()
  })

  it('marks the coloured dot decorative so the label is the only announced text', () => {
    const { container } = render(<StockBadge inStock={false} />)
    expect(container.querySelector('.stock-badge__dot')).toHaveAttribute('aria-hidden', 'true')
  })
})
