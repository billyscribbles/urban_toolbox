import { useSyncExternalStore } from 'react'

// Cart-shaped enquiry store. A single module-level state object holds the item
// list and the drawer's open flag; components subscribe via useQuote() and
// mutate through the exported actions. Mirrors the "mounted once, dumb
// components" ethos of Lightbox — no React context needed.

const STORAGE_KEY = 'urbantoolboxes:quote'
const MAX_ITEMS = 20

function load() {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persist(items) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* private-mode / quota — ignore, the list simply won't survive reloads */
  }
}

let state = { items: load(), isOpen: false }
const listeners = new Set()

function setState(next) {
  state = next
  persist(state.items)
  listeners.forEach((fn) => fn())
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function getSnapshot() {
  return state
}

export function addItem(descriptor) {
  if (state.items.some((i) => i.id === descriptor.id) || state.items.length >= MAX_ITEMS) {
    setState({ ...state, isOpen: true })
    return
  }
  const item = {
    id: descriptor.id,
    name: descriptor.name,
    category: descriptor.category,
    priceFrom: descriptor.priceFrom ?? null,
    standardDims: descriptor.standardDims ?? '',
    dims: { w: '', h: '', d: '' },
    qty: 1,
    notes: '',
  }
  setState({ items: [...state.items, item], isOpen: true })
}

export function updateItem(id, patch) {
  setState({ ...state, items: state.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })
}

export function removeItem(id) {
  setState({ ...state, items: state.items.filter((i) => i.id !== id) })
}

export function clearItems() {
  setState({ ...state, items: [] })
}

export function openQuote() {
  setState({ ...state, isOpen: true })
}

export function closeQuote() {
  setState({ ...state, isOpen: false })
}

export function useQuote() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
// Test-only escape hatch so pure-logic tests can read the snapshot without React.
useQuote.__getSnapshot = getSnapshot

// Build the plain-text list the shop receives by email:
//   "2× TB-150 (Caravan) — custom 1600×600×900mm — from $1800+GST — Notes: …"
export function serializeQuoteItems(items) {
  return items
    .map((it) => {
      const { w, h, d } = it.dims
      const dims =
        w && h && d
          ? `custom ${w}×${h}×${d}mm`
          : it.standardDims
            ? `${it.standardDims}mm`
            : 'size TBC'
      const price = it.priceFrom ? `from $${it.priceFrom}+GST` : 'price on enquiry'
      const notes = it.notes && it.notes.trim() ? it.notes.trim() : '—'
      return `${it.qty}× ${it.name} (${it.category}) — ${dims} — ${price} — Notes: ${notes}`
    })
    .join('\n')
}
