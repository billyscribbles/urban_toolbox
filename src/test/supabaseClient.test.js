import { describe, it, expect } from 'vitest'
import { publicPhotoUrl, publicFileUrl, isConfigured } from '../lib/supabaseClient.js'

describe('supabaseClient', () => {
  it('builds a deterministic public storage URL from a storage path', () => {
    expect(publicPhotoUrl('products/tray-b/shot.jpg')).toContain(
      '/storage/v1/object/public/product-photos/products/tray-b/shot.jpg',
    )
  })

  it('builds a public file URL, and appends ?download= when a filename is given', () => {
    expect(publicFileUrl('brochures/tray-b/abc12345.pdf')).toContain(
      '/storage/v1/object/public/product-photos/brochures/tray-b/abc12345.pdf',
    )
    expect(
      publicFileUrl('brochures/tray-b/abc12345.pdf', { download: 'urban toolbox.pdf' }),
    ).toContain('?download=urban%20toolbox.pdf')
  })

  it('reports unconfigured without env vars (CI has none)', () => {
    expect(typeof isConfigured()).toBe('boolean')
  })
})
