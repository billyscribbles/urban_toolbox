import { useSyncExternalStore } from 'react'
import { getSupabase, isConfigured, publicPhotoUrl, publicFileUrl } from './supabaseClient.js'
import { normalizeColors } from '../data/colors.js'
import { discountedPrice } from './pricing.js'

// Live product catalog. Mirrors quoteStore's "single module-level state, dumb
// components" shape: one fetch per session pulls every product (+ photos) from
// Supabase; pages subscribe via useProductCatalog() and read slices through
// lib/catalog.js, which keeps its static-era API.

let state = { status: 'idle', products: [], categoryImages: {} }
const listeners = new Set()

function setState(next) {
  state = next
  listeners.forEach((fn) => fn())
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function getSnapshot() {
  return state
}

// Customers get a branded, predictable filename rather than whatever the admin
// happened to upload. Slugs are already URL-safe, so no extra escaping beyond
// the encodeURIComponent inside publicFileUrl.
function brochureFilename(row) {
  return `urban-toolbox-${row.slug || row.id}-brochure.pdf`
}

// DB row (+ joined product_images) -> the product shape the storefront
// components already consume. quote.priceFrom carries the EFFECTIVE price
// (discounted when a discount is set) so the product page and the quote email
// show what the customer would actually pay.
export function normalizeRow(row, storeDiscountPct = 0) {
  const photos = [...(row.product_images ?? [])].sort((a, b) => a.position - b.position)
  const first = photos[0]
  const price = row.price == null ? null : Number(row.price)
  const productPct = row.discount_pct == null ? null : Number(row.discount_pct)
  // The customer always gets the better of the product's own discount and the
  // store-wide discount. 0 collapses to null so no "Save 0%" badge appears.
  const effectivePct = Math.max(productPct ?? 0, Number(storeDiscountPct) || 0)
  const discountPct = effectivePct > 0 ? effectivePct : null
  return {
    id: row.id,
    categoryId: row.category_id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    specs: row.specs ?? [],
    features: row.features ?? [],
    img: first ? publicPhotoUrl(first.storage_path) : null,
    imgAlt: first?.alt || row.title,
    images:
      photos.length > 1
        ? photos.map((p) => ({ src: publicPhotoUrl(p.storage_path), alt: p.alt || row.title }))
        : undefined,
    price,
    discountPct,
    featured: !!row.featured,
    // Vehicle-fit flags drive the /utes, /caravans and /trucks explore pages.
    // Missing (older rows read before the migrations) counts as fits-all.
    fitsUte: row.fits_ute !== false,
    fitsCaravan: row.fits_caravan !== false,
    fitsTruck: row.fits_truck !== false,
    // Enabled powder-coat colours (empty when none marked → no selector shown).
    colors: normalizeColors(row.colors),
    // Availability. Missing (a row read before 0008) counts as in stock, so an
    // un-migrated environment doesn't flip the whole catalogue to Back order.
    inStock: row.in_stock !== false,
    // Fully-resolved download URL rather than a raw path, matching how `img`
    // is handled — it keeps ProductPage dumb. Null when there is no brochure,
    // which is also how a row reads before 0009 is applied.
    brochureUrl: row.brochure_path
      ? publicFileUrl(row.brochure_path, { download: brochureFilename(row) })
      : null,
    quote: {
      id: row.id,
      priceFrom: discountedPrice(price, discountPct) ?? price,
      standardDims: row.standard_dims || '',
    },
  }
}

// Store-wide discount, applied to every product at display time. Best-effort:
// any failure (missing table, offline) falls back to no discount rather than
// blocking the catalogue load.
async function fetchStoreDiscount(supabase) {
  try {
    const { data } = await supabase.from('store_settings').select('discount_pct').maybeSingle()
    const pct = data?.discount_pct == null ? 0 : Number(data.discount_pct)
    return Number.isFinite(pct) ? pct : 0
  } catch {
    return 0
  }
}

// Admin-uploaded photos for the home carousel's category tiles, keyed by
// category id. Best-effort like the store discount: a failure (table missing on
// an environment that hasn't run 0006, offline) means "no custom tile photos"
// rather than failing the whole catalogue load.
async function fetchCategoryImages(supabase) {
  try {
    const { data, error } = await supabase
      .from('category_images')
      .select('category_id, storage_path')
    if (error) return {}
    return Object.fromEntries((data ?? []).map((r) => [r.category_id, r.storage_path]))
  } catch {
    return {}
  }
}

// Only 'idle' auto-loads: a failed fetch stays failed until the user hits
// Retry (force) — otherwise every route change would hammer a dead backend.
export async function loadProducts({ force = false } = {}) {
  if (!force && state.status !== 'idle') return
  if (!isConfigured()) {
    setState({ status: 'error', products: [], categoryImages: {} })
    return
  }
  setState({ status: 'loading', products: state.products })
  const supabase = await getSupabase()
  if (!supabase) {
    setState({ status: 'error', products: [], categoryImages: {} })
    return
  }
  const { data, error } = await supabase
    .from('products')
    .select('*, product_images(*)')
    .eq('hidden', false)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })
  if (error) {
    setState({ status: 'error', products: [], categoryImages: {} })
    return
  }
  // Both are independent of the product fetch, so run them together rather than
  // paying two serial round trips on every cold load.
  const [storeDiscountPct, categoryImages] = await Promise.all([
    fetchStoreDiscount(supabase),
    fetchCategoryImages(supabase),
  ])
  setState({
    status: 'ready',
    products: data.map((row) => normalizeRow(row, storeDiscountPct)),
    categoryImages,
  })
}

export function retryLoad() {
  return loadProducts({ force: true })
}

export function getProducts() {
  return state.products
}

// `?? {}` because tests (and any older caller) seed state via
// __setStateForTests without this key.
export function getCategoryImages() {
  return state.categoryImages ?? {}
}

export function getStatus() {
  return state.status
}

export function useProductCatalog() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

// Test-only: seed the store without a network.
export function __setStateForTests(next) {
  setState(next)
}
