import { getSupabase } from './supabaseClient.js'
import { processPhoto, photoPaths } from './imageResize.js'
import { retryLoad } from './productStore.js'

// Auth + CRUD surface for the /admin dashboard. Every write refreshes the
// storefront productStore so an open tab reflects edits without a reload.

const BUCKET = 'product-photos'

async function client() {
  const supabase = await getSupabase()
  if (!supabase) {
    throw new Error(
      'Supabase is not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    )
  }
  return supabase
}

export async function signIn(email, password) {
  try {
    const c = await client()
    const { error } = await c.auth.signInWithPassword({ email, password })
    return { error }
  } catch (err) {
    return { error: err }
  }
}

export async function signOut() {
  const c = await client()
  await c.auth.signOut()
}

// Emits the current session immediately, then on every auth change.
// Resolves to an unsubscribe function.
export async function watchSession(onChange) {
  const supabase = await getSupabase()
  if (!supabase) {
    onChange(null)
    return () => {}
  }
  const {
    data: { session },
  } = await supabase.auth.getSession()
  onChange(session)
  const { data } = supabase.auth.onAuthStateChange((_event, next) => onChange(next))
  return () => data.subscription.unsubscribe()
}

export async function fetchAdminProducts() {
  const c = await client()
  const { data, error } = await c
    .from('products')
    .select('*, product_images(*)')
    .order('category_id')
    .order('sort_order')
  if (error) throw new Error(error.message)
  return data
}

export async function fetchProductImages(productId) {
  const c = await client()
  const { data, error } = await c
    .from('product_images')
    .select('*')
    .eq('product_id', productId)
    .order('position')
  if (error) throw new Error(error.message)
  return data
}

function toRow(p) {
  return {
    id: p.id,
    category_id: p.categoryId,
    title: p.title.trim(),
    slug: p.slug,
    summary: p.summary ?? '',
    specs: p.specs ?? [],
    features: p.features ?? [],
    price: p.price,
    discount_pct: p.discountPct,
    standard_dims: p.standardDims ?? '',
    featured: !!p.featured,
    sort_order: p.sortOrder ?? 0,
  }
}

export async function saveProduct(p, { isNew } = {}) {
  const c = await client()
  const row = toRow(p)
  const { error } = isNew
    ? await c.from('products').insert(row)
    : await c.from('products').update(row).eq('id', p.id)
  if (!error) retryLoad()
  return { error }
}

// Toggle a product's storefront visibility without touching any other field.
export async function setProductHidden(id, hidden) {
  const c = await client()
  const { error } = await c.from('products').update({ hidden }).eq('id', id)
  if (error) throw new Error(error.message)
  retryLoad()
}

// The DB stores only the JPEG path; the WebP derivatives sit beside it with
// the -400/-800 suffix (same contract as <Img> and scripts/gen-images.mjs).
function storageFilesFor(image) {
  const base = image.storage_path.replace(/\.jpe?g$/i, '')
  return [image.storage_path, `${base}-400.webp`, `${base}-800.webp`]
}

export async function deleteProduct(row) {
  const c = await client()
  const images = row.product_images ?? []
  if (images.length) {
    // Best-effort: DB rows are the source of truth; orphaned files are harmless.
    await c.storage.from(BUCKET).remove(images.flatMap(storageFilesFor))
  }
  const { error } = await c.from('products').delete().eq('id', row.id)
  if (error) throw new Error(error.message)
  retryLoad()
}

export async function uploadPhotos(productId, files, startPosition, defaultAlt) {
  const c = await client()
  const rows = []
  for (let i = 0; i < files.length; i++) {
    const { jpeg, variants } = await processPhoto(files[i])
    const name = crypto.randomUUID().slice(0, 8)
    const paths = photoPaths(productId, name)
    const master = await c.storage
      .from(BUCKET)
      .upload(paths.jpeg, jpeg, { contentType: 'image/jpeg' })
    if (master.error) throw new Error(master.error.message)
    for (const v of variants) {
      const { path } = paths.webp.find((w) => w.width === v.width)
      const { error } = await c.storage
        .from(BUCKET)
        .upload(path, v.blob, { contentType: 'image/webp' })
      if (error) throw new Error(error.message)
    }
    rows.push({
      product_id: productId,
      storage_path: paths.jpeg,
      alt: defaultAlt ?? '',
      position: startPosition + i,
    })
  }
  const { error } = await c.from('product_images').insert(rows)
  if (error) throw new Error(error.message)
  retryLoad()
}

export async function deletePhoto(image) {
  const c = await client()
  await c.storage.from(BUCKET).remove(storageFilesFor(image))
  const { error } = await c.from('product_images').delete().eq('id', image.id)
  if (error) throw new Error(error.message)
  retryLoad()
}

export async function swapPhotoPositions(a, b) {
  const c = await client()
  const first = await c.from('product_images').update({ position: b.position }).eq('id', a.id)
  if (first.error) throw new Error(first.error.message)
  const second = await c.from('product_images').update({ position: a.position }).eq('id', b.id)
  if (second.error) throw new Error(second.error.message)
  retryLoad()
}
