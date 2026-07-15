import { describe, it, expect, vi, beforeEach } from 'vitest'

const calls = { upserts: [], updates: [], deletes: [], removed: [] }

function tableApi(table) {
  return {
    insert: vi.fn((row) => {
      calls.upserts.push({ table, row })
      return Promise.resolve({ error: null })
    }),
    update: vi.fn((patch) => ({
      eq: vi.fn((col, val) => {
        calls.updates.push({ table, patch, col, val })
        return Promise.resolve({ error: null })
      }),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn((col, val) => {
        calls.deletes.push({ table, col, val })
        return Promise.resolve({ error: null })
      }),
    })),
    select: vi.fn(() => ({
      order: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      eq: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  }
}

const fakeClient = {
  from: vi.fn((table) => tableApi(table)),
  storage: {
    from: vi.fn(() => ({
      remove: vi.fn((paths) => {
        calls.removed.push(...paths)
        return Promise.resolve({ error: null })
      }),
      upload: vi.fn(() => Promise.resolve({ error: null })),
    })),
  },
  auth: { signOut: vi.fn() },
}

vi.mock('../lib/supabaseClient.js', () => ({
  isConfigured: () => true,
  publicPhotoUrl: (p) => `https://cdn.test/${p}`,
  getSupabase: () => Promise.resolve(fakeClient),
}))
vi.mock('../lib/productStore.js', () => ({ retryLoad: vi.fn() }))

const { saveProduct, deletePhoto, deleteProduct } = await import('../lib/adminApi.js')

beforeEach(() => {
  calls.upserts.length = 0
  calls.updates.length = 0
  calls.deletes.length = 0
  calls.removed.length = 0
})

describe('saveProduct', () => {
  it('maps camelCase fields to snake_case columns on insert', async () => {
    const { error } = await saveProduct(
      {
        id: 'new-box',
        slug: 'new-box',
        title: ' New Box ',
        categoryId: 'locks',
        summary: 'A box',
        specs: [{ label: 'Material', value: 'Aluminium' }],
        features: ['Lockable'],
        price: 450,
        discountPct: 15,
        standardDims: '600 × 400',
        featured: true,
        sortOrder: 3,
      },
      { isNew: true },
    )
    expect(error).toBeNull()
    expect(calls.upserts[0].table).toBe('products')
    expect(calls.upserts[0].row).toMatchObject({
      id: 'new-box',
      category_id: 'locks',
      title: 'New Box',
      price: 450,
      discount_pct: 15,
      standard_dims: '600 × 400',
      featured: true,
      sort_order: 3,
    })
  })

  it('updates by id when not new', async () => {
    await saveProduct(
      { id: 'x', slug: 'x', title: 'X', categoryId: 'locks', price: null, discountPct: null },
      { isNew: false },
    )
    expect(calls.updates[0]).toMatchObject({ table: 'products', col: 'id', val: 'x' })
  })
})

describe('deletePhoto', () => {
  it('removes the JPEG and both WebP derivatives, then the row', async () => {
    await deletePhoto({ id: 'img-1', storage_path: 'products/x/shot.jpg' })
    expect(calls.removed).toEqual([
      'products/x/shot.jpg',
      'products/x/shot-400.webp',
      'products/x/shot-800.webp',
    ])
    expect(calls.deletes[0]).toMatchObject({ table: 'product_images', val: 'img-1' })
  })
})

describe('deleteProduct', () => {
  it('sweeps all image files then deletes the product row', async () => {
    await deleteProduct({
      id: 'x',
      product_images: [{ storage_path: 'products/x/a.jpg' }, { storage_path: 'products/x/b.jpg' }],
    })
    expect(calls.removed).toHaveLength(6)
    expect(calls.deletes[0]).toMatchObject({ table: 'products', val: 'x' })
  })
})
