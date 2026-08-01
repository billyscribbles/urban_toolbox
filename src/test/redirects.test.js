// Migration contract: the old GoDaddy site's URLs must keep resolving.
//
// These assertions are the reason the migration holds. urbantoolboxes.com.au
// has years of rankings and inbound links attached to seven URLs; if a future
// refactor drops one of them the site silently starts 404ing traffic Google
// already sends it, and nothing else in the suite would notice.

import { describe, it, expect } from 'vitest'
import { legacyRedirects, oldSiteUrls } from '../config/redirects.js'
import { staticRoutes } from '../../scripts/routes.mjs'

const served = new Set(staticRoutes().map((route) => route.path))
const redirected = new Set(Object.keys(legacyRedirects))

describe('legacy URL coverage', () => {
  it.each(oldSiteUrls)('%s still resolves', (url) => {
    expect(
      served.has(url) || redirected.has(url),
      `${url} was published by the old site but is neither served nor redirected`,
    ).toBe(true)
  })

  // /laser-cutting and /folding ranked separately on the old site. Redirecting
  // them into /fabrication (or its #anchors, which Google discards outright)
  // throws that away, so they must stay real pages.
  it.each(['/laser-cutting', '/folding', '/fabrication'])(
    '%s is a real page, not a redirect',
    (url) => {
      expect(served.has(url)).toBe(true)
      expect(redirected.has(url)).toBe(false)
    },
  )
})

describe('redirect targets', () => {
  it.each(Object.entries(legacyRedirects))('%s -> %s lands on a real page', (from, to) => {
    expect(from).not.toBe(to)
    // Product pages are the only targets that can't be checked without the
    // live catalogue; none are used today, and this keeps that honest.
    expect(to.startsWith('/product/')).toBe(false)
    expect(served.has(to), `${from} redirects to ${to}, which no route serves`).toBe(true)
  })

  it('never chains one redirect into another', () => {
    for (const target of Object.values(legacyRedirects)) {
      expect(
        redirected.has(target),
        `${target} is both a redirect target and a redirect source`,
      ).toBe(false)
    }
  })

  // /trucks was an internal path retired in the catalogue restructure, not one
  // of the seven ranked GoDaddy URLs — it is now the Trucks vehicle page, and
  // must never go back to being a redirect.
  it('serves /trucks as a real page rather than redirecting it', () => {
    expect(served.has('/trucks')).toBe(true)
    expect(redirected.has('/trucks')).toBe(false)
  })
})
