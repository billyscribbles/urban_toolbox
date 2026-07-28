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
    render(<PromoBannerForm />)
    expect(await screen.findByDisplayValue('30% off')).toBeInTheDocument()
    expect(screen.getByLabelText(/show the promo banner/i)).not.toBeChecked()
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

  it('saves the toggle and trimmed non-empty messages', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    render(<PromoBannerForm onSaved={onSaved} />)
    await screen.findByDisplayValue('30% off')

    await user.click(screen.getByLabelText(/show the promo banner/i))
    await user.click(screen.getByRole('button', { name: /^save/i }))

    await waitFor(() =>
      expect(saveMock).toHaveBeenCalledWith({ enabled: true, messages: ['30% off'] }),
    )
    expect(onSaved).toHaveBeenCalledWith({ enabled: true, messages: ['30% off'] })
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
