import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'

vi.mock('../lib/supabaseClient.js', () => ({ getSupabase: () => Promise.resolve(null) }))

const { __setStateForTests } = await import('../lib/promoStore.js')
const { default: PromoBanner } = await import('../components/PromoBanner.jsx')

// jsdom lays nothing out, so every rect is zero-sized and the belt can never
// size itself. Feed the component the widths a real browser would report.
function stubWidths({ viewport, group }) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
    let width = 0
    if (this.classList.contains('promo__viewport')) width = viewport
    if (this.classList.contains('promo__group')) width = group
    return { width, height: 0, top: 0, left: 0, right: width, bottom: 0, x: 0, y: 0 }
  })
}

beforeEach(() => {
  localStorage.clear()
  __setStateForTests({})
})

afterEach(() => vi.restoreAllMocks())

describe('PromoBanner — visibility', () => {
  it('renders nothing when the banner is disabled', () => {
    __setStateForTests({ enabled: false, messages: ['30% off'] })
    const { container } = render(<PromoBanner />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when enabled with no messages', () => {
    __setStateForTests({ enabled: true, messages: [] })
    const { container } = render(<PromoBanner />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders every message so a screen reader gets the whole set', () => {
    __setStateForTests({ enabled: true, messages: ['30% off', 'Aussie made'] })
    const { container } = render(<PromoBanner />)
    const exposed = container.querySelector('.promo__group:not([aria-hidden])')
    expect(exposed).toHaveTextContent('30% off')
    expect(exposed).toHaveTextContent('Aussie made')
  })

  it('offers no dismiss control — the strip is not closable', () => {
    __setStateForTests({ enabled: true, messages: ['30% off'] })
    render(<PromoBanner />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('PromoBanner — marquee', () => {
  it('clones the set enough times to cover the viewport', () => {
    stubWidths({ viewport: 1200, group: 300 })
    __setStateForTests({ enabled: true, messages: ['30% off'] })
    const { container } = render(<PromoBanner />)

    // ceil(1200 / 300) + 1: four groups fill the belt, the fifth is queued off
    // the right edge so the loop reset never exposes a gap.
    expect(container.querySelectorAll('.promo__group')).toHaveLength(5)
  })

  it('exposes exactly one copy to assistive tech and hides the clones', () => {
    stubWidths({ viewport: 1200, group: 300 })
    __setStateForTests({ enabled: true, messages: ['30% off'] })
    const { container } = render(<PromoBanner />)

    expect(container.querySelectorAll('.promo__group:not([aria-hidden])')).toHaveLength(1)
    expect(container.querySelectorAll('.promo__group[aria-hidden="true"]')).toHaveLength(4)
  })

  it('travels one group width to sub-pixel precision, so the loop point is invisible', () => {
    // A fractional width is the real-world case: rounding the shift to whole
    // pixels leaves the belt short and twitches on every restart.
    stubWidths({ viewport: 1200, group: 300.44 })
    __setStateForTests({ enabled: true, messages: ['30% off'] })
    const { container } = render(<PromoBanner />)

    const track = container.querySelector('.promo__track')
    expect(track.className).toContain('promo__track--rolling')
    expect(track.style.getPropertyValue('--promo-shift')).toBe('-300.44px')
  })

  it('scales duration with width so wide and narrow message sets travel at one speed', () => {
    stubWidths({ viewport: 1200, group: 300 })
    __setStateForTests({ enabled: true, messages: ['30% off'] })
    const narrow = render(<PromoBanner />)
    const narrowSeconds = parseFloat(
      narrow.container.querySelector('.promo__track').style.getPropertyValue('--promo-duration'),
    )
    narrow.unmount()

    vi.restoreAllMocks()
    stubWidths({ viewport: 1200, group: 600 })
    __setStateForTests({ enabled: true, messages: ['30% off on everything in the range'] })
    const wide = render(<PromoBanner />)
    const wideSeconds = parseFloat(
      wide.container.querySelector('.promo__track').style.getPropertyValue('--promo-duration'),
    )

    expect(narrowSeconds).toBeGreaterThan(0)
    expect(wideSeconds).toBeCloseTo(narrowSeconds * 2, 1)
  })

  it('parks the track rather than animating a placeholder distance before measurement', () => {
    // No width stub: offsetWidth stays 0, as it does on the very first paint
    // before layout has run.
    __setStateForTests({ enabled: true, messages: ['30% off'] })
    const { container } = render(<PromoBanner />)

    const track = container.querySelector('.promo__track')
    expect(track.className).not.toContain('promo__track--rolling')
    expect(track.style.getPropertyValue('--promo-shift')).toBe('')
  })

  it('drives the loop from CSS, not a timer', () => {
    const spy = vi.spyOn(global, 'setInterval')
    stubWidths({ viewport: 1200, group: 300 })
    __setStateForTests({ enabled: true, messages: ['first', 'second'] })
    render(<PromoBanner />)
    expect(spy).not.toHaveBeenCalled()
  })

  it('re-measures the belt when a network reconcile changes the message set', () => {
    stubWidths({ viewport: 1200, group: 300 })
    __setStateForTests({ enabled: true, messages: ['first', 'second', 'third'] })
    const { container } = render(<PromoBanner />)
    expect(container.querySelectorAll('.promo__group')).toHaveLength(5)

    // Simulates loadPromo() reconciling against the network after the banner
    // already painted from the localStorage cache. The stub now reports a
    // narrower group, so the belt needs more clones to stay covered.
    vi.restoreAllMocks()
    stubWidths({ viewport: 1200, group: 200 })
    act(() => {
      __setStateForTests({ enabled: true, messages: ['fourth'] })
    })

    expect(container.querySelectorAll('.promo__group')).toHaveLength(7)
    expect(container.querySelector('.promo__group:not([aria-hidden])')).toHaveTextContent('fourth')
  })
})
