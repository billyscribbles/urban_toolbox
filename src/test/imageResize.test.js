import { describe, it, expect } from 'vitest'
import { photoPaths, categoryPhotoPaths, DERIVATIVE_WIDTHS } from '../lib/imageResize.js'

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

describe('categoryPhotoPaths', () => {
  it('builds carousel-tile paths under categories/, same derivative naming', () => {
    const p = categoryPhotoPaths('under-tray-toolboxes', 'a1b2c3')
    expect(p.jpeg).toBe('categories/under-tray-toolboxes/a1b2c3.jpg')
    expect(p.webp).toEqual([
      { width: 400, path: 'categories/under-tray-toolboxes/a1b2c3-400.webp' },
      { width: 800, path: 'categories/under-tray-toolboxes/a1b2c3-800.webp' },
    ])
  })

  it('keeps the product path contract untouched', () => {
    expect(photoPaths('x', 'y').jpeg).toBe('products/x/y.jpg')
  })
})
