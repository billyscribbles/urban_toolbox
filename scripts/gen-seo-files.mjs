// Post-build step: rewrite the placeholder domain in the built sitemap.xml and
// robots.txt with the real VITE_SITE_URL. Runs against dist/ only, so the
// committed files in public/ stay as clean template placeholders.
//
// Wired into the `build` script in package.json. No-ops (with a warning) when
// VITE_SITE_URL is unset, so a build never fails just for missing config.

import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const PLACEHOLDER = 'https://example.com'

async function readSiteUrl() {
  if (process.env.VITE_SITE_URL) return process.env.VITE_SITE_URL
  const envPath = join(root, '.env')
  if (existsSync(envPath)) {
    const env = await readFile(envPath, 'utf8')
    const match = env.match(/^VITE_SITE_URL=(.+)$/m)
    if (match) return match[1].trim()
  }
  return null
}

async function rewrite(file, siteUrl) {
  const distPath = join(root, 'dist', file)
  if (!existsSync(distPath)) {
    console.warn(`[gen-seo-files] dist/${file} not found — skipped.`)
    return
  }
  const updated = (await readFile(distPath, 'utf8')).replaceAll(PLACEHOLDER, siteUrl)
  await writeFile(distPath, updated)
  console.log(`[gen-seo-files] dist/${file} -> ${siteUrl}`)
}

const siteUrl = await readSiteUrl()
if (!siteUrl || siteUrl === PLACEHOLDER) {
  console.warn(
    '[gen-seo-files] VITE_SITE_URL not set — sitemap.xml/robots.txt keep the placeholder domain.',
  )
  process.exit(0)
}

const normalized = siteUrl.replace(/\/+$/, '')
await rewrite('sitemap.xml', normalized)
await rewrite('robots.txt', normalized)
