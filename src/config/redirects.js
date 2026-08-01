// Legacy URL map for the GoDaddy → this-site migration.
//
// Single source of truth, imported by both server.js (which serves the real
// 301s) and src/App.jsx (the client-side safety net), so the two can never
// drift. src/test/redirects.test.js asserts every URL the old site published is
// still accounted for and that no redirect points at a dead route.
//
// Plain data — no import.meta.env, no Vite-only syntax — because server.js
// loads it directly under Node.

// Old URL -> canonical target. Every target must be a real 200 route, or a
// deeper redirect that terminates, so we never build a loop.
export const legacyRedirects = {
  '/ute-accesories': '/accessories', // the misspelling Google actually indexed
  '/ute-accessories': '/accessories', // corrected spelling, same destination
  '/caravan-toolboxes': '/caravans', // retired product page → caravans vehicle page
  '/photos': '/toolboxes', // gallery page → the catalogue, its closest match
  '/contact': '/quote', // enquiry intent → the quote form
}

// Every URL the old site published, taken verbatim from its sitemap
// (https://urbantoolboxes.com.au/sitemap.website.xml, read 2026-07-31).
// Each of these must still resolve — either to a redirect above or to a page
// this site serves at the same URL. Losing one loses its rankings and its
// inbound links.
export const oldSiteUrls = [
  '/',
  '/ute-accesories',
  '/fabrication',
  '/caravan-toolboxes',
  '/photos',
  '/folding',
  '/laser-cutting',
]
