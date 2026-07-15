// Lazily-created Supabase singleton. The SDK is dynamically imported so the
// storefront's main bundle stays lean — only code that actually talks to
// Supabase (product fetch, admin CRUD) pays for it. Missing env (e.g. CI unit
// tests) resolves to null and callers treat that as "backend not configured".

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export function isConfigured() {
  return Boolean(url && anonKey)
}

let clientPromise = null

export function getSupabase() {
  if (!isConfigured()) return Promise.resolve(null)
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url, anonKey),
  )
  return clientPromise
}

// Public bucket URLs are deterministic — no client round-trip needed.
export function publicPhotoUrl(storagePath) {
  return `${url}/storage/v1/object/public/product-photos/${storagePath}`
}
