import { useSyncExternalStore } from 'react'
import { getSupabase } from './supabaseClient.js'

// Promo banner state. Same shape as productStore/quoteStore: one module-level
// state object, one fetch per session, components subscribe via usePromo().
//
// Everything here is best-effort. An unconfigured backend, an un-migrated
// column or a dead network all resolve to "no banner" — a marketing strip is
// never worth blocking or erroring a page render over.

const CACHE_KEY = 'urbantoolboxes:promo-cache'
const DISMISS_KEY = 'urbantoolboxes:promo-dismissed'
export const MAX_MESSAGES = 6
export const MAX_LENGTH = 120

// localStorage throws in private browsing and when storage is disabled.
function readStorage(key) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Nothing to do — the banner just loses its cache/dismissal memory.
  }
}

export function normalizeMessages(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((m) => typeof m === 'string')
    .map((m) => m.trim().slice(0, MAX_LENGTH))
    .filter(Boolean)
    .slice(0, MAX_MESSAGES)
}

// Identifies the current promotion. A dismissal only sticks while this matches,
// so editing any message re-shows the banner to everyone who closed the old one.
export function signatureOf(messages) {
  return messages.join('|')
}

// The banner sits at the very top of the document, so inserting it after an
// async fetch shifts the whole page down (a CLS hit on every route). Seeding
// from the last known value lets it paint on the first frame instead; the
// network result then reconciles it.
function initialState() {
  let enabled = false
  let messages = []
  const cached = readStorage(CACHE_KEY)
  if (cached) {
    try {
      const parsed = JSON.parse(cached)
      enabled = !!parsed.enabled
      messages = normalizeMessages(parsed.messages)
    } catch {
      // Corrupt cache — fall through to the empty default.
    }
  }
  return { enabled, messages, dismissed: readStorage(DISMISS_KEY) }
}

let state = initialState()
let loaded = false
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

export async function loadPromo() {
  if (loaded) return
  loaded = true
  const supabase = await getSupabase()
  if (!supabase) return
  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('promo_enabled, promo_messages')
      .maybeSingle()
    if (error || !data) return
    const enabled = !!data.promo_enabled
    const messages = normalizeMessages(data.promo_messages)
    writeStorage(CACHE_KEY, JSON.stringify({ enabled, messages }))
    setState({ ...state, enabled, messages })
  } catch {
    // Offline, or the columns aren't migrated yet — keep whatever the cache gave us.
  }
}

export function dismissPromo() {
  const signature = signatureOf(state.messages)
  writeStorage(DISMISS_KEY, signature)
  setState({ ...state, dismissed: signature })
}

export function usePromo() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
// Test-only escape hatch so pure-logic tests can read the snapshot without React.
usePromo.__getSnapshot = getSnapshot

// Test-only: reset the module without a network.
export function __setStateForTests(next) {
  loaded = false
  setState({ enabled: false, messages: [], dismissed: null, ...next })
}
