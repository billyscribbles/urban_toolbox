import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { fetchMock, saveMock } = vi.hoisted(() => ({ fetchMock: vi.fn(), saveMock: vi.fn() }))

vi.mock('../lib/adminApi.js', () => ({
  fetchPromoBanner: fetchMock,
  savePromoBanner: saveMock,
}))

const { default: PromoBannerForm } = await import('../pages/admin/PromoBannerForm.jsx')

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue({ enabled: false, messages: ['30% off'] })
  saveMock.mockReset().mockResolvedValue(undefined)
})

describe('PromoBannerForm', () => {
  it('loads the current banner into the form', async () => {
    fetchMock.mockResolvedValue({ enabled: true, messages: ['30% off'] })
    render(<PromoBannerForm />)
    expect(await screen.findByDisplayValue('30% off')).toBeInTheDocument()
    // enabled:true differs from the checkbox's own default (unchecked), so this
    // actually pins the setEnabled(promo.enabled) assignment rather than just
    // matching whatever the component initializes to.
    expect(screen.getByLabelText(/show the promo banner/i)).toBeChecked()
  })

  it('adds and removes messages, capping at 6', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ enabled: true, messages: ['a'] })
    render(<PromoBannerForm />)
    await screen.findByDisplayValue('a')

    const add = screen.getByRole('button', { name: /add message/i })
    for (let i = 0; i < 5; i++) await user.click(add)
    expect(screen.getAllByLabelText(/^message \d+$/i)).toHaveLength(6)
    expect(add).toBeDisabled()

    await user.click(screen.getAllByRole('button', { name: /remove message/i })[0])
    expect(screen.getAllByLabelText(/^message \d+$/i)).toHaveLength(5)
    expect(add).toBeEnabled()
  })

  it('keeps each remaining row bound to its own DOM node when an earlier row is removed', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ enabled: false, messages: ['first', 'second', 'third'] })
    render(<PromoBannerForm />)
    await screen.findByDisplayValue('first')

    // Capture the actual <input> elements before the removal. If rows were
    // keyed by array index, removing row 0 would make React reuse row 0's old
    // DOM node (mid-typing focus and all) to now display row 1's text instead
    // of unmounting the removed row and leaving the others alone — so the
    // element that used to show "second" would silently start showing
    // something else. Comparing node identity (`toBe`), not just displayed
    // text, is what actually catches that.
    const secondInput = screen.getByDisplayValue('second')
    const thirdInput = screen.getByDisplayValue('third')

    await user.click(screen.getAllByRole('button', { name: /remove message/i })[0])

    const remaining = screen.getAllByLabelText(/^message \d+$/i)
    expect(remaining).toHaveLength(2)
    expect(remaining[0]).toHaveValue('second')
    expect(remaining[1]).toHaveValue('third')
    expect(screen.getByDisplayValue('second')).toBe(secondInput)
    expect(screen.getByDisplayValue('third')).toBe(thirdInput)
  })

  it('saves the toggle and trimmed non-empty messages', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    // Whitespace-padded and blank entries so trimming/dropping empties is
    // actually exercised — a fixture with no whitespace and no blanks would
    // pass even if the raw `messages` array were saved untrimmed.
    fetchMock.mockResolvedValue({ enabled: false, messages: ['  30% off  ', '', 'Aussie made'] })
    render(<PromoBannerForm onSaved={onSaved} />)
    await screen.findByDisplayValue('Aussie made')

    await user.click(screen.getByLabelText(/show the promo banner/i))
    await user.click(screen.getByRole('button', { name: /^save/i }))

    await waitFor(() =>
      expect(saveMock).toHaveBeenCalledWith({
        enabled: true,
        messages: ['30% off', 'Aussie made'],
      }),
    )
    expect(onSaved).toHaveBeenCalledWith({ enabled: true, messages: ['30% off', 'Aussie made'] })
  })

  it('refuses to enable the banner with no messages', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ enabled: false, messages: [] })
    render(<PromoBannerForm />)
    await screen.findByLabelText(/show the promo banner/i)

    await user.click(screen.getByLabelText(/show the promo banner/i))
    await user.click(screen.getByRole('button', { name: /^save/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/at least one message/i)
    expect(saveMock).not.toHaveBeenCalled()
  })

  it('surfaces a save failure', async () => {
    const user = userEvent.setup()
    saveMock.mockRejectedValue(new Error('permission denied'))
    render(<PromoBannerForm />)
    await screen.findByDisplayValue('30% off')

    await user.click(screen.getByRole('button', { name: /^save/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('permission denied')
  })
})
