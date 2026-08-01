// The site's indexable URL list, derived rather than hand-maintained.
//
// Shared by the two build steps that must never disagree: prerender.mjs (which
// snapshots each of these to static HTML) and gen-seo-files.mjs (which writes
// them into sitemap.xml). A hand-kept list drifts the moment a category or a
// product is added — this one can't.
//
// Deliberately excluded: /admin (noindex, auth-gated), /contact (redirects to
// /quote), and the legacy 301s in server.js. None of them belong in a sitemap.

import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { categories } from '../src/data/categories.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// Fixed pages, with the sitemap priority each should carry. Home first.
const PAGES = [
  ['/', '1.0'],
  ['/utes', '0.9'],
  ['/caravans', '0.9'],
  ['/trucks', '0.9'],
  ['/fabrication', '0.8'],
  // Legacy GoDaddy URLs that kept their rankings and are now real pages.
  ['/laser-cutting', '0.8'],
  ['/folding', '0.8'],
  ['/australian-made', '0.6'],
  ['/about', '0.6'],
  ['/quote', '0.7'],
  ['/privacy', '0.3'],
  ['/terms', '0.3'],
]

// Category pages, straight off the tree in src/data/categories.js.
//
// A top with `pages: true` (Toolboxes) gives each child its own indexable page.
// A top without it (Accessories) flattens its children into anchors on the one
// page, so only the top is a URL. Vehicle-exclusive tops (Trays, Canopy,
// Service Canopy, Truck Toolboxes, Truck Accessories) are bare single-segment
// routes. `exclusive` nodes render on their own page, which is already in
// PAGES.
function categoryRoutes() {
  const routes = []
  for (const top of categories) {
    if (top.exclusive) continue
    if (top.vehicle) {
      routes.push([`/${top.slug}`, '0.8'])
      continue
    }
    routes.push([`/${top.slug}`, '0.9'])
    if (top.pages) {
      for (const child of top.children ?? []) {
        routes.push([`/${top.slug}/${child.slug}`, '0.8'])
      }
    }
  }
  return routes
}

// Every product page, from the live catalogue. `lastmod` comes from the row's
// own updated_at, so Google is told precisely which products changed.
//
// Reads Supabase over its REST endpoint with the public anon key — the same
// data the browser fetches, so no service-role secret is needed at build time.
//
// `hidden=eq.false` MUST mirror the storefront query in lib/productStore.js.
// Without it this listed every hidden product too, and each one prerendered to
// "Page not found" and went into the sitemap — submitting known-dead URLs to
// Google, which costs crawl budget and earns Search Console coverage errors.
async function productRoutes(env) {
  const url = env.VITE_SUPABASE_URL
  const key = env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.warn('[routes] Supabase env missing — product pages omitted.')
    return []
  }
  const endpoint =
    `${url.replace(/\/+$/, '')}/rest/v1/products` +
    '?select=slug,updated_at&hidden=eq.false&order=slug'
  const res = await fetch(endpoint, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  if (!res.ok) {
    throw new Error(`[routes] Supabase returned ${res.status} fetching product slugs.`)
  }
  const rows = await res.json()
  return rows
    .filter((row) => row.slug)
    .map((row) => ({
      path: `/product/${row.slug}`,
      priority: '0.7',
      lastmod: row.updated_at ? row.updated_at.slice(0, 10) : undefined,
    }))
}

// Parses .env for the build steps, which run outside Vite and so don't get
// import.meta.env. Real process env wins, matching gen-seo-files.mjs.
export async function loadEnv() {
  const env = { ...process.env }
  const envPath = join(root, '.env')
  if (existsSync(envPath)) {
    const contents = await readFile(envPath, 'utf8')
    for (const line of contents.split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
      if (match && !env[match[1]]) env[match[1]] = match[2].trim()
    }
  }
  return env
}

// Every indexable URL that doesn't depend on the catalogue — i.e. everything
// except /product/<slug>. Sync and network-free, so the contract suite can
// assert against it (src/test/redirects.test.js).
export function staticRoutes() {
  return [...PAGES, ...categoryRoutes()].map(([path, priority]) => ({ path, priority }))
}

// [{ path, priority, lastmod? }] for every indexable URL on the site.
export async function allRoutes(env) {
  return [...staticRoutes(), ...(await productRoutes(env))]
}
