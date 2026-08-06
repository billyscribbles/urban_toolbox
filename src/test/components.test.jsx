// Contract: components are "dumb" — they render brand strings and links
// straight from site.config, never hardcoded. This proves the wire is live,
// so a config swap is enough to reskin the chrome.
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import CategoryCarousel from '../components/CategoryCarousel.jsx'
import { site } from '../config/site.config.js'
import { homeCarousel } from '../content/homeCarousel.js'

const renderNavbar = () =>
  render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>,
  )

describe('Navbar — renders brand + nav from site.config', () => {
  it('labels the logo with the brand name', () => {
    renderNavbar()
    expect(screen.getByLabelText(site.brand.name)).toBeInTheDocument()
  })

  it('renders every nav item from config', () => {
    renderNavbar()
    for (const item of site.nav) {
      // Each label appears in both the desktop and mobile nav.
      expect(screen.getAllByText(item.label).length).toBeGreaterThan(0)
    }
  })

  it('renders the CTA label from config', () => {
    renderNavbar()
    expect(screen.getAllByText(site.cta.label).length).toBeGreaterThan(0)
  })
})

describe('CategoryCarousel', () => {
  it('renders every tile as a link once for keyboard/AT users', () => {
    render(
      <MemoryRouter>
        <CategoryCarousel />
      </MemoryRouter>,
    )
    for (const tile of homeCarousel) {
      // The duplicated marquee track is aria-hidden, so each label is
      // accessible exactly once.
      const links = screen.getAllByRole('link', { name: new RegExp(tile.label, 'i') })
      expect(links).toHaveLength(1)
      expect(links[0]).toHaveAttribute('href', tile.to)
    }
  })
})

// The touch strip rotates by moving scrollLeft (a transformed belt can't be
// swiped). jsdom has no layout, so the container's metrics are stood up by
// hand — what's under test is the guard logic and the arithmetic, not layout.
describe('CategoryCarousel — touch drift', () => {
  const TRACK = 1000
  const BELT = TRACK * 4 // TRACK_COUNT identical tracks

  afterEach(() => {
    vi.unstubAllGlobals()
    delete window.matchMedia
  })

  // matches: true for whichever queries the test names, false for the rest.
  const stubMedia = (...live) => {
    window.matchMedia = (query) => ({
      matches: live.some((q) => query.includes(q)),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })
  }

  // jsdom's scrollLeft is a no-op and scrollWidth is always 0, so back both
  // with real values the component can read and write.
  const mountViewport = () => {
    const frames = []
    vi.stubGlobal('requestAnimationFrame', (cb) => frames.push(cb))
    vi.stubGlobal('cancelAnimationFrame', () => {})

    const { container } = render(
      <MemoryRouter>
        <CategoryCarousel />
      </MemoryRouter>,
    )
    const viewport = container.querySelector('.range__viewport')
    let scrollLeft = 0
    Object.defineProperty(viewport, 'scrollWidth', { value: BELT, configurable: true })
    Object.defineProperty(viewport, 'scrollLeft', {
      get: () => scrollLeft,
      set: (v) => {
        scrollLeft = v
      },
      configurable: true,
    })
    return { viewport, frames }
  }

  it('advances scrollLeft on touch layouts, folded a track in', () => {
    stubMedia('max-width: 700px')
    const { viewport, frames } = mountViewport()
    expect(frames).toHaveLength(1)

    // First frame folds 0 into [TRACK, 2 × TRACK) and sets the time baseline.
    frames.at(-1)(0)
    expect(viewport.scrollLeft).toBe(TRACK)

    // One 16ms frame on, the strip has moved that frame's share of one track
    // per TRACK_SECONDS (48s) — and stays inside the fold window.
    frames.at(-1)(16)
    expect(viewport.scrollLeft).toBeCloseTo(TRACK + (TRACK * 16) / 48000, 5)
    expect(viewport.scrollLeft).toBeLessThan(2 * TRACK)
  })

  it('caps a single frame so a backgrounded tab does not jump', () => {
    stubMedia('max-width: 700px')
    const { viewport, frames } = mountViewport()

    frames.at(-1)(0)
    // Gone for 5s. Only the 100ms clamp is applied, not the whole gap.
    frames.at(-1)(5000)
    expect(viewport.scrollLeft).toBeCloseTo(TRACK + (TRACK * 100) / 48000, 5)
  })

  it('parks while a finger is on it, then picks up from where it was left', () => {
    stubMedia('max-width: 700px')
    const { viewport, frames } = mountViewport()
    frames.at(-1)(0)
    expect(viewport.scrollLeft).toBe(TRACK)

    fireEvent.touchStart(viewport)
    // handOver stamps off performance.now(), which shares rAF's time origin.
    const touchedAt = performance.now()

    // Mid-swipe and just after: the drift stays out of the way.
    frames.at(-1)(touchedAt + 500)
    const parked = viewport.scrollLeft
    frames.at(-1)(touchedAt + 1000)
    expect(viewport.scrollLeft).toBe(parked)

    // Past RESUME_MS it resumes from the parked position, not a stale one.
    frames.at(-1)(touchedAt + 2100)
    expect(viewport.scrollLeft).toBeGreaterThan(parked)
    expect(viewport.scrollLeft).toBeCloseTo(parked + (TRACK * 100) / 48000, 5)
  })

  it('never starts the drift when Reduce Motion is set, leaving it swipeable', () => {
    stubMedia('max-width: 700px', 'prefers-reduced-motion')
    const { viewport, frames } = mountViewport()
    expect(frames).toHaveLength(0)
    expect(viewport.scrollLeft).toBe(0)
  })

  it('leaves desktop to the CSS marquee', () => {
    stubMedia() // no query matches — wider than MOBILE_QUERY
    const { frames } = mountViewport()
    expect(frames).toHaveLength(0)
  })
})
