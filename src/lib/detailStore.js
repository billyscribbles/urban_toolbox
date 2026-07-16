import { useSyncExternalStore } from 'react'

// Product-detail store. Mirrors quoteStore's "single module-level state, dumb
// components" shape: a card opens the detail drawer with a product descriptor,
// the drawer subscribes via useDetail() and closes through closeDetail(). No
// persistence — the selection is ephemeral UI state, not saved like the quote.

let state = { product: null, isOpen: false }
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

export function openDetail(product) {
  setState({ product, isOpen: true })
}

// The stable token that identifies a product in the shareable URL: its slug,
// falling back to the id for products that predate slugs.
export function detailToken(product) {
  return product?.slug || (product?.id != null ? String(product.id) : null)
}

// Build the drawer descriptor from a normalized catalog product (+ its top
// category label). The single source of truth for what the drawer shows, used
// both when a card is clicked and when a shared ?product=<slug> URL is opened
// cold — so a deep link renders identically to an in-session open.
export function detailFromProduct(product, categoryLabel) {
  const priceFrom = product.quote?.priceFrom ?? null
  const quoteItem = {
    id: product.id,
    name: product.title,
    category: categoryLabel,
    priceFrom,
    standardDims: product.quote?.standardDims ?? '',
    img: product.img,
    imgAlt: product.imgAlt,
    imageFit: product.imageFit,
    imageTone: product.imageTone,
    imagePosition: product.imagePosition,
  }
  return {
    id: product.id,
    slug: detailToken(product),
    title: product.title,
    img: product.img,
    imgAlt: product.imgAlt,
    images: product.images,
    imageFit: product.imageFit,
    imageTone: product.imageTone,
    imagePosition: product.imagePosition,
    category: categoryLabel,
    priceFrom,
    price: product.price ?? priceFrom,
    discountPct: product.discountPct ?? null,
    specs: product.specs,
    features: product.features,
    quoteItem,
  }
}

export function closeDetail() {
  setState({ ...state, isOpen: false })
}

export function useDetail() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
