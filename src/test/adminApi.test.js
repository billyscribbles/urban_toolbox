import { describe, it, expect, vi, beforeEach } from 'vitest'

const calls = { upserts: [], updates: [], deletes: [], removed: [], uploads: [] }

// store_settings singleton reads/writes are configured per-test via these two
// module-level slots (mirroring `calls` above) rather than fixed canned data,
// since promo banner tests need to vary both the read payload and the write
// outcome from one test to the next.
let maybeSingleResult = { data: null, error: null }
let updateError = null

// Swapped per-test so "replace an existing photo" can assert the old files are
// swept; null means "no photo yet".
let existingCategoryImage = null

// The product row uploadBrochure reads before replacing; null means "no
// brochure yet". Separate from existingCategoryImage because both reach the
// same select().eq().maybeSingle() path, on different tables.
let existingBrochure = null

function tableApi(table) {
  return {
    insert: vi.fn((row) => {
      calls.upserts.push({ table, row })
      return Promise.resolve({ error: null })
    }),
    upsert: vi.fn((row) => {
      calls.upserts.push({ table, row })
      return Promise.resolve({ error: null })
    }),
    update: vi.fn((patch) => ({
      eq: vi.fn((col, val) => {
        calls.updates.push({ table, patch, col, val })
        return Promise.resolve({ error: updateError })
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
        // Filtered single-row read — uploadCategoryImage looking up the photo
        // it is about to replace, or uploadBrochure looking up the PDF it is
        // about to replace. Distinct from the unfiltered maybeSingle below,
        // which is the store_settings singleton.
        maybeSingle: vi.fn(() =>
          Promise.resolve({
            data: table === 'products' ? existingBrochure : existingCategoryImage,
            error: null,
          }),
        ),
      })),
      maybeSingle: vi.fn(() => Promise.resolve(maybeSingleResult)),
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
      upload: vi.fn((path, body, opts) => {
        calls.uploads.push({ path, opts })
        return Promise.resolve({ error: null })
      }),
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

vi.mock('../lib/imageResize.js', async (importOriginal) => ({
  ...(await importOriginal()),
  // jsdom has no createImageBitmap/canvas encoder; the resize pipeline itself
  // is covered by imageResize.test.js, so stub just the browser-only part.
  processPhoto: vi.fn(async () => ({
    jpeg: new Blob(['jpeg']),
    variants: [
      { width: 400, blob: new Blob(['400']) },
      { width: 800, blob: new Blob(['800']) },
    ],
  })),
}))

const {
  saveProduct,
  deletePhoto,
  deleteProduct,
  setProductHidden,
  fetchPromoBanner,
  savePromoBanner,
  uploadCategoryImage,
  deleteCategoryImage,
  uploadBrochure,
  deleteBrochure,
} = await import('../lib/adminApi.js')
const { retryLoad } = await import('../lib/productStore.js')

beforeEach(() => {
  calls.upserts.length = 0
  calls.updates.length = 0
  calls.deletes.length = 0
  calls.removed.length = 0
  calls.uploads.length = 0
  maybeSingleResult = { data: null, error: null }
  updateError = null
  existingCategoryImage = null
  existingBrochure = null
  retryLoad.mockClear()
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
        colors: ['black', 'nope', 'silver'],
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
      // Persisted cleaned + in canonical order.
      colors: ['silver', 'black'],
      // Nothing passed inStock, so the row lands in stock — the same default
      // the column itself carries.
      in_stock: true,
      sort_order: 3,
    })
  })

  it('persists a back-order product as in_stock false', async () => {
    await saveProduct(
      {
        id: 'bo',
        slug: 'bo',
        title: 'Back Order Box',
        categoryId: 'locks',
        price: null,
        discountPct: null,
        inStock: false,
      },
      { isNew: true },
    )
    expect(calls.upserts[0].row).toMatchObject({ in_stock: false })
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

describe('setProductHidden', () => {
  it('updates only the hidden flag for the given id', async () => {
    await setProductHidden('x', true)
    expect(calls.updates[0]).toMatchObject({
      table: 'products',
      patch: { hidden: true },
      col: 'id',
      val: 'x',
    })
  })
})

describe('fetchPromoBanner', () => {
  it('reads enabled + normalized messages', async () => {
    maybeSingleResult = {
      data: { promo_enabled: true, promo_messages: ['30% off', '  ', 'Aussie made'] },
      error: null,
    }
    const promo = await fetchPromoBanner()
    expect(promo).toEqual({ enabled: true, messages: ['30% off', 'Aussie made'] })
  })

  it('treats a pre-migration row missing the columns as disabled rather than throwing', async () => {
    maybeSingleResult = { data: {}, error: null }
    const promo = await fetchPromoBanner()
    expect(promo).toEqual({ enabled: false, messages: [] })
  })
})

describe('savePromoBanner', () => {
  it('writes both columns to the singleton row and skips the catalogue refresh', async () => {
    await savePromoBanner({ enabled: true, messages: ['30% off'] })
    expect(calls.updates[0]).toMatchObject({
      table: 'store_settings',
      patch: { promo_enabled: true, promo_messages: ['30% off'] },
      col: 'id',
      val: true,
    })
    // Unlike saveStoreDiscount and every product mutation above, the banner
    // must NOT trigger retryLoad() — /admin never renders it, so there's no
    // storefront view to sync.
    expect(retryLoad).not.toHaveBeenCalled()
  })

  it('throws the supabase error message on write failure', async () => {
    updateError = { message: 'permission denied' }
    await expect(savePromoBanner({ enabled: true, messages: ['x'] })).rejects.toThrow(
      'permission denied',
    )
  })
})

describe('uploadCategoryImage', () => {
  it('upserts the row keyed by category, under the categories/ prefix', async () => {
    await uploadCategoryImage('under-tray-toolboxes', new File(['x'], 'x.jpg'))
    const up = calls.upserts.find((u) => u.table === 'category_images')
    expect(up.row.category_id).toBe('under-tray-toolboxes')
    expect(up.row.storage_path).toMatch(/^categories\/under-tray-toolboxes\/[a-f0-9]{8}\.jpg$/)
  })

  it('sweeps the previous photo files when replacing', async () => {
    existingCategoryImage = {
      category_id: 'under-tray-toolboxes',
      storage_path: 'categories/under-tray-toolboxes/old.jpg',
    }
    await uploadCategoryImage('under-tray-toolboxes', new File(['x'], 'x.jpg'))
    expect(calls.removed).toEqual([
      'categories/under-tray-toolboxes/old.jpg',
      'categories/under-tray-toolboxes/old-400.webp',
      'categories/under-tray-toolboxes/old-800.webp',
    ])
  })

  it('removes nothing when there was no previous photo', async () => {
    await uploadCategoryImage('locks', new File(['x'], 'x.jpg'))
    expect(calls.removed).toHaveLength(0)
  })
})

describe('deleteCategoryImage', () => {
  it('removes the JPEG and both WebP derivatives, then the row', async () => {
    await deleteCategoryImage({
      category_id: 'locks',
      storage_path: 'categories/locks/a.jpg',
    })
    expect(calls.removed).toEqual([
      'categories/locks/a.jpg',
      'categories/locks/a-400.webp',
      'categories/locks/a-800.webp',
    ])
    expect(calls.deletes[0]).toMatchObject({
      table: 'category_images',
      col: 'category_id',
      val: 'locks',
    })
  })
})

describe('brochures', () => {
  it('uploads under brochures/<id>/ as application/pdf and stores the path', async () => {
    const path = await uploadBrochure('job-site-toolbox-1', new File(['pdf'], 'a.pdf'))

    expect(path).toMatch(/^brochures\/job-site-toolbox-1\/[a-f0-9-]{8}\.pdf$/)
    expect(calls.uploads).toHaveLength(1)
    expect(calls.uploads[0].path).toBe(path)
    expect(calls.uploads[0].opts.contentType).toBe('application/pdf')
    expect(calls.updates).toContainEqual({
      table: 'products',
      patch: { brochure_path: path },
      col: 'id',
      val: 'job-site-toolbox-1',
    })
    expect(retryLoad).toHaveBeenCalled()
  })

  it('sweeps the previous file before writing the replacement', async () => {
    existingBrochure = { brochure_path: 'brochures/job-site-toolbox-1/old12345.pdf' }

    await uploadBrochure('job-site-toolbox-1', new File(['pdf'], 'a.pdf'))

    expect(calls.removed).toEqual(['brochures/job-site-toolbox-1/old12345.pdf'])
  })

  it('deleteBrochure removes the file, nulls the column and returns null', async () => {
    const result = await deleteBrochure({
      id: 'job-site-toolbox-1',
      brochure_path: 'brochures/job-site-toolbox-1/abc12345.pdf',
    })

    expect(result).toBeNull()
    expect(calls.removed).toEqual(['brochures/job-site-toolbox-1/abc12345.pdf'])
    expect(calls.updates).toContainEqual({
      table: 'products',
      patch: { brochure_path: null },
      col: 'id',
      val: 'job-site-toolbox-1',
    })
    expect(retryLoad).toHaveBeenCalled()
  })

  it('deleteProduct sweeps the brochure alongside the photos', async () => {
    await deleteProduct({
      id: 'job-site-toolbox-1',
      brochure_path: 'brochures/job-site-toolbox-1/abc12345.pdf',
      product_images: [],
    })

    expect(calls.removed).toContain('brochures/job-site-toolbox-1/abc12345.pdf')
  })

  it('toRow never carries brochure_path — a form save must not wipe it', async () => {
    await saveProduct(
      {
        id: 'job-site-toolbox-1',
        slug: 'job-site-box',
        title: 'Job Site Box',
        categoryId: 'locks',
        price: null,
        discountPct: null,
        colors: [],
        sortOrder: 0,
      },
      { isNew: false },
    )

    const update = calls.updates.find((u) => u.table === 'products')
    expect(update.patch).not.toHaveProperty('brochure_path')
  })
})
