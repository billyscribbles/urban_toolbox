// Post-build step: write dist/sitemap.xml and rewrite the placeholder domain in
// dist/robots.txt from VITE_SITE_URL.
//
// The sitemap is GENERATED, not copied: public/sitemap.xml is a template
// placeholder, and the real list comes from scripts/routes.mjs — the category
// tree plus every product slug in Supabase. A hand-maintained list silently
// omitted all 114 product pages, which are the long-tail URLs worth the most.
//
// Wired into the `build` script in package.json. Never fails the build for
// missing config: it warns and leaves the placeholder in place.

import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { allRoutes, loadEnv } from './routes.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const PLACEHOLDER = 'https://example.com'

async function rewriteRobots(siteUrl) {
  const distPath = join(root, 'dist', 'robots.txt')
  if (!existsSync(distPath)) {
    console.warn('[gen-seo-files] dist/robots.txt not found — skipped.')
    return
  }
  const updated = (await readFile(distPath, 'utf8')).replaceAll(PLACEHOLDER, siteUrl)
  await writeFile(distPath, updated)
  console.log(`[gen-seo-files] dist/robots.txt -> ${siteUrl}`)
}

async function writeSitemap(siteUrl, routes) {
  const urls = routes
    .map(({ path, priority, lastmod }) => {
      const parts = [`<loc>${siteUrl}${path}</loc>`]
      if (lastmod) parts.push(`<lastmod>${lastmod}</lastmod>`)
      parts.push(`<priority>${priority}</priority>`)
      return `  <url>${parts.join('')}</url>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
  await writeFile(join(root, 'dist', 'sitemap.xml'), xml)
  console.log(`[gen-seo-files] dist/sitemap.xml -> ${routes.length} URLs`)
}

const env = await loadEnv()
const siteUrl = (env.VITE_SITE_URL || '').replace(/\/+$/, '')

if (!siteUrl || siteUrl === PLACEHOLDER) {
  console.warn(
    '[gen-seo-files] VITE_SITE_URL not set — sitemap.xml/robots.txt keep the placeholder domain.',
  )
  process.exit(0)
}

await rewriteRobots(siteUrl)
await writeSitemap(siteUrl, await allRoutes(env))
