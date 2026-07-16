import { useSyncExternalStore } from 'react'
import { getSupabase, isConfigured, publicPhotoUrl } from './supabaseClient.js'
import { discountedPrice } from './pricing.js'

// Live product catalog. Mirrors quoteStore's "single module-level state, dumb
// components" shape: one fetch per session pulls every product (+ photos) from
// Supabase; pages subscribe via useProductCatalog() and read slices through
// lib/catalog.js, which keeps its static-era API.

let state = { status: 'idle', products: [] }
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

// DB row (+ joined product_images) -> the product shape the storefront
// components already consume. quote.priceFrom carries the EFFECTIVE price
// (discounted when a discount is set) so the tray and the quote email show
// what the customer would actually pay.
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
    // Vehicle-fit flags drive the /utes and /caravans explore pages. Missing
    // (older rows read before the migration) counts as fits-both.
    fitsUte: row.fits_ute !== false,
    fitsCaravan: row.fits_caravan !== false,
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

// Only 'idle' auto-loads: a failed fetch stays failed until the user hits
// Retry (force) — otherwise every route change would hammer a dead backend.
export async function loadProducts({ force = false } = {}) {
  if (!force && state.status !== 'idle') return
  if (!isConfigured()) {
    setState({ status: 'error', products: [] })
    return
  }
  setState({ status: 'loading', products: state.products })
  const supabase = await getSupabase()
  if (!supabase) {
    setState({ status: 'error', products: [] })
    return
  }
  const { data, error } = await supabase
    .from('products')
    .select('*, product_images(*)')
    .eq('hidden', false)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })
  if (error) {
    setState({ status: 'error', products: [] })
    return
  }
  const storeDiscountPct = await fetchStoreDiscount(supabase)
  setState({ status: 'ready', products: data.map((row) => normalizeRow(row, storeDiscountPct)) })
}

export function retryLoad() {
  return loadProducts({ force: true })
}

export function getProducts() {
  return state.products
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
