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

export function closeDetail() {
  setState({ ...state, isOpen: false })
}

export function useDetail() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
