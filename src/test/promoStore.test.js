import { describe, it, expect, beforeEach, vi } from 'vitest'

const { maybeSingleMock } = vi.hoisted(() => ({ maybeSingleMock: vi.fn() }))

vi.mock('../lib/supabaseClient.js', () => ({
  getSupabase: () =>
    Promise.resolve({
      from: () => ({ select: () => ({ maybeSingle: maybeSingleMock }) }),
    }),
}))

const { normalizeMessages, signatureOf, loadPromo, dismissPromo, __setStateForTests } =
  await import('../lib/promoStore.js')

describe('normalizeMessages', () => {
  it('keeps trimmed non-empty strings in order', () => {
    expect(normalizeMessages(['  30% off  ', 'Aussie made'])).toEqual(['30% off', 'Aussie made'])
  })

  it('drops blanks and non-strings', () => {
    expect(normalizeMessages(['ok', '', '   ', null, 42, {}])).toEqual(['ok'])
  })

  it('returns empty for anything that is not an array', () => {
    expect(normalizeMessages(null)).toEqual([])
    expect(normalizeMessages('30% off')).toEqual([])
    expect(normalizeMessages(undefined)).toEqual([])
  })

  it('caps at 6 messages and 120 characters each', () => {
    expect(normalizeMessages(['a', 'b', 'c', 'd', 'e', 'f', 'g'])).toHaveLength(6)
    expect(normalizeMessages(['x'.repeat(200)])[0]).toHaveLength(120)
  })
})

describe('signatureOf', () => {
  it('changes when any message changes, so an old dismissal stops matching', () => {
    expect(signatureOf(['a', 'b'])).toBe(signatureOf(['a', 'b']))
    expect(signatureOf(['a', 'b'])).not.toBe(signatureOf(['a', 'c']))
  })
})

describe('loadPromo', () => {
  beforeEach(() => {
    localStorage.clear()
    maybeSingleMock.mockReset()
    __setStateForTests({})
  })

  it('stores enabled + normalized messages and caches them', async () => {
    maybeSingleMock.mockResolvedValue({
      data: { promo_enabled: true, promo_messages: ['30% off', ''] },
      error: null,
    })
    await loadPromo()
    expect(JSON.parse(localStorage.getItem('urbantoolboxes:promo-cache'))).toEqual({
      enabled: true,
      messages: ['30% off'],
    })
  })

  it('stays disabled when the query errors rather than throwing', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: { message: 'no such column' } })
    await expect(loadPromo()).resolves.toBeUndefined()
    expect(localStorage.getItem('urbantoolboxes:promo-cache')).toBeNull()
  })

  it('stays disabled when the client rejects rather than throwing', async () => {
    maybeSingleMock.mockRejectedValue(new Error('offline'))
    await expect(loadPromo()).resolves.toBeUndefined()
  })
})

describe('dismissPromo', () => {
  beforeEach(() => {
    localStorage.clear()
    __setStateForTests({ enabled: true, messages: ['30% off'] })
  })

  it('persists the signature of the current message set', () => {
    dismissPromo()
    expect(localStorage.getItem('urbantoolboxes:promo-dismissed')).toBe('30% off')
  })
})
