import { describe, it, expect, beforeEach, vi } from 'vitest'

// clientState lets a single test flip getSupabase() to resolve null, simulating
// an unconfigured backend, without a second vi.mock/module reset.
const { maybeSingleMock, clientState } = vi.hoisted(() => ({
  maybeSingleMock: vi.fn(),
  clientState: { enabled: true },
}))

vi.mock('../lib/supabaseClient.js', () => ({
  getSupabase: () =>
    Promise.resolve(
      clientState.enabled
        ? { from: () => ({ select: () => ({ maybeSingle: maybeSingleMock }) }) }
        : null,
    ),
}))

const { normalizeMessages, signatureOf, loadPromo, dismissPromo, usePromo, __setStateForTests } =
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
    clientState.enabled = true
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
    // The cache write is only half the contract — usePromo() must also see the
    // update, since PromoBanner (Task 2) renders off the live snapshot, not localStorage.
    expect(usePromo.__getSnapshot()).toMatchObject({ enabled: true, messages: ['30% off'] })
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

  it('stays disabled and writes no cache when the backend is unconfigured', async () => {
    clientState.enabled = false
    await expect(loadPromo()).resolves.toBeUndefined()
    expect(localStorage.getItem('urbantoolboxes:promo-cache')).toBeNull()
    expect(maybeSingleMock).not.toHaveBeenCalled()
    expect(usePromo.__getSnapshot()).toMatchObject({ enabled: false, messages: [] })
  })
})

describe('initialState — corrupt cache', () => {
  it('falls back to the empty default instead of throwing when the cache is invalid JSON', async () => {
    localStorage.clear()
    localStorage.setItem('urbantoolboxes:promo-cache', '{not json')
    // initialState() runs at module load, so the corrupt value must be seeded
    // BEFORE a fresh module instance evaluates it — reset the registry and
    // re-import rather than calling anything on the already-loaded module.
    vi.resetModules()
    const { usePromo: freshUsePromo } = await import('../lib/promoStore.js')
    expect(freshUsePromo.__getSnapshot()).toMatchObject({ enabled: false, messages: [] })
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
