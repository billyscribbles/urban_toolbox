import { getSupabase } from './supabaseClient.js'
import { processPhoto, photoPaths, categoryPhotoPaths } from './imageResize.js'
import { normalizeColors } from '../data/colors.js'
import { retryLoad } from './productStore.js'
import { normalizeMessages } from './promoStore.js'
import { FEATURED_RAIL_LIMIT } from './catalog.js'

// Auth + CRUD surface for the /admin dashboard. Every write refreshes the
// storefront productStore so an open tab reflects edits without a reload.

const BUCKET = 'product-photos'

export const FEATURED_LIMIT_MESSAGE = `Maximum ${FEATURED_RAIL_LIMIT} featured products. Unfeature one first.`

// The home rail only ever shows FEATURED_RAIL_LIMIT products, so the admin is
// held to that ceiling rather than being allowed to flag more than can appear.
//
// The check lives here, not in the components, because TWO paths raise the
// flag — the row star and the editor's checkbox — and guarding only the UI
// would leave the other open. `id` is excluded from the count so re-saving an
// already-featured product never trips on itself.
//
// Counted against every featured row, hidden or not: "maximum 12" is a rule an
// admin can hold in their head, where "12 unless some are hidden" is not.
async function assertFeaturedCapacity(c, id) {
  const { count, error } = await c
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('featured', true)
    .neq('id', id)
  if (error) throw new Error(error.message)
  if ((count ?? 0) >= FEATURED_RAIL_LIMIT) throw new Error(FEATURED_LIMIT_MESSAGE)
}

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
    model: p.model ?? '',
    price: p.price,
    discount_pct: p.discountPct,
    standard_dims: p.standardDims ?? '',
    featured: !!p.featured,
    fits_ute: p.fitsUte !== false,
    fits_caravan: p.fitsCaravan !== false,
    fits_truck: p.fitsTruck !== false,
    colors: normalizeColors(p.colors),
    in_stock: p.inStock !== false,
    sort_order: p.sortOrder ?? 0,
  }
}

// `prevId` lets an edit rename the primary key: we update the row matched by the
// old id, and the FK's ON UPDATE CASCADE repoints product_images to the new id.
export async function saveProduct(p, { isNew, prevId } = {}) {
  const c = await client()
  const row = toRow(p)
  // saveProduct reports failures by returning them, not throwing, so the cap
  // breach has to be shaped like any other save error for the editor to show it.
  if (row.featured) {
    try {
      await assertFeaturedCapacity(c, prevId ?? p.id)
    } catch (err) {
      return { error: err }
    }
  }
  const { error } = isNew
    ? await c.from('products').insert(row)
    : await c
        .from('products')
        .update(row)
        .eq('id', prevId ?? p.id)
  if (!error) retryLoad()
  return { error }
}

// Store-wide discount — a single settings row read by the storefront.
export async function fetchStoreDiscount() {
  const c = await client()
  const { data, error } = await c.from('store_settings').select('discount_pct').maybeSingle()
  if (error) throw new Error(error.message)
  const pct = data?.discount_pct == null ? 0 : Number(data.discount_pct)
  return Number.isFinite(pct) ? pct : 0
}

export async function saveStoreDiscount(pct) {
  const c = await client()
  const { error } = await c.from('store_settings').update({ discount_pct: pct }).eq('id', true)
  if (error) throw new Error(error.message)
  retryLoad()
}

// Promo banner — the same store_settings singleton. Note there is deliberately
// no retryLoad() here: that refreshes the product catalogue, which the banner
// has nothing to do with, and /admin never renders PromoBanner anyway (AppBody
// drops the marketing chrome on that route), so there's no open view to sync.
export async function fetchPromoBanner() {
  const c = await client()
  const { data, error } = await c
    .from('store_settings')
    .select('promo_enabled, promo_messages')
    .maybeSingle()
  if (error) throw new Error(error.message)
  return {
    enabled: !!data?.promo_enabled,
    messages: normalizeMessages(data?.promo_messages),
  }
}

export async function savePromoBanner({ enabled, messages }) {
  const c = await client()
  const { error } = await c
    .from('store_settings')
    .update({ promo_enabled: !!enabled, promo_messages: normalizeMessages(messages) })
    .eq('id', true)
  if (error) throw new Error(error.message)
}

// Toggle a product's storefront visibility without touching any other field.
export async function setProductHidden(id, hidden) {
  const c = await client()
  const { error } = await c.from('products').update({ hidden }).eq('id', id)
  if (error) throw new Error(error.message)
  retryLoad()
}

// Toggle a product's place in the home page's featured rail without touching
// any other field. Mirrors setProductHidden: one column, one row, then a
// storefront refresh so an open tab picks the change up without a reload.
export async function setProductFeatured(id, featured) {
  const c = await client()
  // Only raising the flag can breach the cap — unfeaturing is always allowed,
  // which matters when the data already sits over the limit.
  if (featured) await assertFeaturedCapacity(c, id)
  const { error } = await c.from('products').update({ featured }).eq('id', id)
  if (error) throw new Error(error.message)
  retryLoad()
}

// The DB stores only the JPEG path; the WebP derivatives sit beside it with
// the -400/-800 suffix (same contract as <Img> and scripts/gen-images.mjs).
function storageFilesFor(image) {
  const base = image.storage_path.replace(/\.jpe?g$/i, '')
  return [image.storage_path, `${base}-400.webp`, `${base}-800.webp`]
}

// Brochures live beside the photos in the same bucket, under their own prefix
// (the `categories/` precedent from 0006). The random component matters more
// here than for photos: a fixed path would serve the old PDF from CDN cache
// after a replace, so each upload gets a fresh key instead.
function brochurePath(productId, name) {
  return `brochures/${productId}/${name}.pdf`
}

export async function deleteProduct(row) {
  const c = await client()
  const images = row.product_images ?? []
  const files = images.flatMap(storageFilesFor)
  if (row.brochure_path) files.push(row.brochure_path)
  if (files.length) {
    // Best-effort: DB rows are the source of truth; orphaned files are harmless.
    await c.storage.from(BUCKET).remove(files)
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

// --- Home-carousel tile photos -------------------------------------------
// One optional photo per category, independent of any product. When a category
// has no row the storefront falls back to its first product's photo, so these
// writes are never destructive to the carousel — a missing tile photo still
// renders something.

export async function fetchCategoryImages() {
  const c = await client()
  const { data, error } = await c.from('category_images').select('category_id, storage_path')
  if (error) throw new Error(error.message)
  return data
}

export async function uploadCategoryImage(categoryId, file) {
  const c = await client()
  // The row is keyed by category, so a replace would orphan the old files —
  // sweep them first. Best-effort, same as deleteProduct: the DB row is the
  // source of truth and orphaned objects are harmless.
  const { data: existing } = await c
    .from('category_images')
    .select('storage_path')
    .eq('category_id', categoryId)
    .maybeSingle()
  if (existing?.storage_path) {
    await c.storage.from(BUCKET).remove(storageFilesFor(existing))
  }

  const { jpeg, variants } = await processPhoto(file)
  const name = crypto.randomUUID().slice(0, 8)
  const paths = categoryPhotoPaths(categoryId, name)
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

  const { error } = await c
    .from('category_images')
    .upsert({ category_id: categoryId, storage_path: paths.jpeg })
  if (error) throw new Error(error.message)
  retryLoad()
}

export async function deleteCategoryImage(row) {
  const c = await client()
  await c.storage.from(BUCKET).remove(storageFilesFor(row))
  const { error } = await c.from('category_images').delete().eq('category_id', row.category_id)
  if (error) throw new Error(error.message)
  retryLoad()
}

// --- Product brochure ------------------------------------------------------
// One optional PDF per product, stored as a path on the product row. The
// column is deliberately absent from toRow(): the editor form has no brochure
// field, so routing it through a form save would write undefined over a file
// that was just uploaded. Same split `hidden` uses.

export async function uploadBrochure(productId, file) {
  const c = await client()
  // A replace would orphan the old object, so sweep it first. Best-effort,
  // matching uploadCategoryImage — the row is the source of truth.
  const { data: existing } = await c
    .from('products')
    .select('brochure_path')
    .eq('id', productId)
    .maybeSingle()
  if (existing?.brochure_path) {
    await c.storage.from(BUCKET).remove([existing.brochure_path])
  }

  const path = brochurePath(productId, crypto.randomUUID().slice(0, 8))
  const upload = await c.storage.from(BUCKET).upload(path, file, { contentType: 'application/pdf' })
  if (upload.error) throw new Error(upload.error.message)

  const { error } = await c.from('products').update({ brochure_path: path }).eq('id', productId)
  if (error) throw new Error(error.message)
  retryLoad()
  return path
}

export async function deleteBrochure(row) {
  const c = await client()
  await c.storage.from(BUCKET).remove([row.brochure_path])
  const { error } = await c.from('products').update({ brochure_path: null }).eq('id', row.id)
  if (error) throw new Error(error.message)
  retryLoad()
  return null
}
