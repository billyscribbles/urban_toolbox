import { describe, it, expect } from 'vitest'
import { PRODUCT_COLORS, COLOR_KEYS, colorLabel, normalizeColors } from '../data/colors.js'

describe('colours vocabulary', () => {
  it('ships exactly silver, white and black in display order', () => {
    expect(COLOR_KEYS).toEqual(['silver', 'white', 'black'])
    expect(PRODUCT_COLORS.map((c) => c.label)).toEqual(['Silver', 'White', 'Black'])
  })

  it('resolves labels, falling back to the raw key for unknowns', () => {
    expect(colorLabel('black')).toBe('Black')
    expect(colorLabel('teal')).toBe('teal')
  })
})

describe('normalizeColors', () => {
  it('drops unknown keys and restores canonical order', () => {
    expect(normalizeColors(['black', 'teal', 'silver'])).toEqual(['silver', 'black'])
  })

  it('treats undefined / non-array / empty as no colours', () => {
    expect(normalizeColors(undefined)).toEqual([])
    expect(normalizeColors(null)).toEqual([])
    expect(normalizeColors('silver')).toEqual([])
    expect(normalizeColors([])).toEqual([])
  })

  it('de-dupes repeated keys', () => {
    expect(normalizeColors(['white', 'white'])).toEqual(['white'])
  })
})
