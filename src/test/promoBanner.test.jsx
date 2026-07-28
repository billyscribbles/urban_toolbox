import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/supabaseClient.js', () => ({ getSupabase: () => Promise.resolve(null) }))

const { __setStateForTests } = await import('../lib/promoStore.js')
const { default: PromoBanner } = await import('../components/PromoBanner.jsx')

beforeEach(() => {
  localStorage.clear()
  __setStateForTests({})
})

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
    render(<PromoBanner />)
    expect(screen.getByText('30% off')).toBeInTheDocument()
    expect(screen.getByText('Aussie made')).toBeInTheDocument()
  })
})

describe('PromoBanner — rotation', () => {
  afterEach(() => vi.useRealTimers())

  it('marks the next message active after the interval and wraps around', () => {
    vi.useFakeTimers()
    __setStateForTests({ enabled: true, messages: ['first', 'second'] })
    render(<PromoBanner />)

    expect(screen.getByText('first').className).toContain('promo__msg--on')
    expect(screen.getByText('second').className).not.toContain('promo__msg--on')

    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByText('second').className).toContain('promo__msg--on')

    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByText('first').className).toContain('promo__msg--on')
  })

  it('does not start an interval for a single message', () => {
    vi.useFakeTimers()
    const spy = vi.spyOn(global, 'setInterval')
    __setStateForTests({ enabled: true, messages: ['only one'] })
    render(<PromoBanner />)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('resets the active index when a network reconcile shrinks the message set mid-rotation', () => {
    vi.useFakeTimers()
    __setStateForTests({ enabled: true, messages: ['first', 'second', 'third'] })
    render(<PromoBanner />)

    act(() => vi.advanceTimersByTime(5000))
    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByText('third').className).toContain('promo__msg--on')

    // Simulates loadPromo() reconciling against the network after the banner
    // already painted from the localStorage cache — the list shrinks while
    // the rotation index is pointing at the end of the old, longer list.
    act(() => {
      __setStateForTests({ enabled: true, messages: ['fourth'] })
    })

    expect(screen.getByText('fourth').className).toContain('promo__msg--on')
  })
})

describe('PromoBanner — dismissal', () => {
  it('hides the banner and persists the signature', async () => {
    const user = userEvent.setup()
    __setStateForTests({ enabled: true, messages: ['30% off'] })
    const { container } = render(<PromoBanner />)

    await user.click(screen.getByRole('button', { name: /dismiss promotion/i }))

    expect(container).toBeEmptyDOMElement()
    expect(localStorage.getItem('urbantoolboxes:promo-dismissed')).toBe('30% off')
  })

  it('stays hidden for the same message set', () => {
    __setStateForTests({ enabled: true, messages: ['30% off'], dismissed: '30% off' })
    const { container } = render(<PromoBanner />)
    expect(container).toBeEmptyDOMElement()
  })

  it('reappears once the messages change', () => {
    __setStateForTests({ enabled: true, messages: ['50% off'], dismissed: '30% off' })
    render(<PromoBanner />)
    expect(screen.getByText('50% off')).toBeInTheDocument()
  })
})
