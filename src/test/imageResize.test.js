import { describe, it, expect } from 'vitest'
import { photoPaths, DERIVATIVE_WIDTHS } from '../lib/imageResize.js'

describe('photoPaths', () => {
  it('builds the bucket paths matching <Img> derivative naming', () => {
    const p = photoPaths('job-site-toolbox-1', 'a1b2c3')
    expect(p.jpeg).toBe('products/job-site-toolbox-1/a1b2c3.jpg')
    expect(p.webp).toEqual([
      { width: 400, path: 'products/job-site-toolbox-1/a1b2c3-400.webp' },
      { width: 800, path: 'products/job-site-toolbox-1/a1b2c3-800.webp' },
    ])
  })
  it('derivative widths match the storefront <Img> contract', () => {
    expect(DERIVATIVE_WIDTHS).toEqual([400, 800])
  })
})
