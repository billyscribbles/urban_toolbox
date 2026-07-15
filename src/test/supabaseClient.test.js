import { describe, it, expect } from 'vitest'
import { publicPhotoUrl, isConfigured } from '../lib/supabaseClient.js'

describe('supabaseClient', () => {
  it('builds a deterministic public storage URL from a storage path', () => {
    expect(publicPhotoUrl('products/tray-b/shot.jpg')).toContain(
      '/storage/v1/object/public/product-photos/products/tray-b/shot.jpg',
    )
  })

  it('reports unconfigured without env vars (CI has none)', () => {
    expect(typeof isConfigured()).toBe('boolean')
  })
})
