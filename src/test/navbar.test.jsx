// Contract: the catalog-driven mega-menu is keyboard-openable and has no axe
// violations when open. The Home a11y test never mounts the Navbar, so the
// dropdown ARIA lives or dies here.
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { axe, toHaveNoViolations } from 'jest-axe'
import Navbar from '../components/Navbar.jsx'

expect.extend(toHaveNoViolations)

const renderNavbar = () =>
  render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>,
  )

describe('Navbar mega-menu', () => {
  it('toggle exposes aria-expanded wired to the panel id', () => {
    renderNavbar()
    const toggle = screen.getByRole('button', { name: /toolboxes menu/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('aria-controls', 'megapanel-toolboxes')

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const panel = document.getElementById('megapanel-toolboxes')
    expect(panel).toBeInTheDocument()
    // The panel lists the subcategory topics (leaf links live on the pages).
    expect(within(panel).getByText('Under Tray Toolboxes')).toBeInTheDocument()
    expect(within(panel).getByText('Top Opening Toolboxes')).toBeInTheDocument()
  })

  it('has no axe violations with a dropdown open', async () => {
    const { container } = renderNavbar()
    fireEvent.click(screen.getByRole('button', { name: /toolboxes menu/i }))
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
