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
export function normalizeRow(row) {
  const photos = [...(row.product_images ?? [])].sort((a, b) => a.position - b.position)
  const first = photos[0]
  const price = row.price == null ? null : Number(row.price)
  const discountPct = row.discount_pct == null ? null : Number(row.discount_pct)
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
    quote: {
      id: row.id,
      priceFrom: discountedPrice(price, discountPct) ?? price,
      standardDims: row.standard_dims || '',
    },
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
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })
  if (error) {
    setState({ status: 'error', products: [] })
    return
  }
  setState({ status: 'ready', products: data.map(normalizeRow) })
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
