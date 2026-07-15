import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PriceTag from '../components/PriceTag.jsx'

// Amounts sit next to a nested "from" span, so exact getByText on "$450"
// won't match — assert via textContent instead.
describe('PriceTag', () => {
  it('shows the enquiry line when there is no price', () => {
    render(<PriceTag price={null} />)
    expect(screen.getByText(/enquire for pricing/i)).toBeInTheDocument()
  })

  it('shows a plain from-price without discount', () => {
    const { container } = render(<PriceTag price={450} />)
    expect(container).toHaveTextContent('from $450')
    expect(container).toHaveTextContent('+ GST')
    expect(container.querySelector('s')).toBeNull()
    expect(screen.queryByText(/save/i)).toBeNull()
  })

  it('shows original struck through, sale price and save badge with a discount', () => {
    const { container } = render(<PriceTag price={450} discountPct={15} />)
    expect(container.querySelector('s')).toHaveTextContent('$450')
    expect(container).toHaveTextContent('from $382.50')
    expect(screen.getByText(/save 15%/i)).toBeInTheDocument()
  })
})
