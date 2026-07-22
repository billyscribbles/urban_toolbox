import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import ColorSelector from '../components/ColorSelector.jsx'

expect.extend(toHaveNoViolations)

describe('ColorSelector', () => {
  it('renders nothing when no colours are available', () => {
    const { container } = render(<ColorSelector colors={[]} value={null} onChange={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a radio per available colour and marks the selected one', () => {
    render(<ColorSelector colors={['silver', 'black']} value="black" onChange={() => {}} />)
    const group = screen.getByRole('radiogroup', { name: /colour/i })
    expect(group).toBeInTheDocument()
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(2)
    expect(screen.getByRole('radio', { name: 'Black' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Silver' })).not.toBeChecked()
  })

  it('reflects the choice in visible text, not colour alone', () => {
    render(<ColorSelector colors={['silver', 'black']} value="black" onChange={() => {}} />)
    expect(screen.getByText(/colour:/i)).toHaveTextContent(/black/i)
  })

  it('calls onChange with the clicked colour key', async () => {
    const onChange = vi.fn()
    render(<ColorSelector colors={['silver', 'black']} value="silver" onChange={onChange} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Black' }))
    expect(onChange).toHaveBeenCalledWith('black')
  })

  it('moves selection with the arrow keys', async () => {
    const onChange = vi.fn()
    render(<ColorSelector colors={['silver', 'black']} value="silver" onChange={onChange} />)
    screen.getByRole('radio', { name: 'Silver' }).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith('black')
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <ColorSelector colors={['silver', 'white', 'black']} value="silver" onChange={() => {}} />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
