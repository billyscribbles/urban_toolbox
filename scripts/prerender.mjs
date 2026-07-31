// Post-build step: snapshot every route to static HTML.
//
// WHY THIS EXISTS. The old GoDaddy site served real HTML on every URL. This one
// is a Vite SPA whose catalogue arrives from Supabase after boot, so without
// this step `dist/index.html` ships `<div id="root"></div>` and nothing else —
// every title, description, canonical, JSON-LD and product name would exist
// only after JavaScript ran. Google would eventually render it; Bing, the
// Facebook/LinkedIn/WhatsApp preview bots and the AI crawlers largely would
// not. Serving less HTML than the site you're replacing is the classic way to
// lose rankings in a migration, so we render each route once at build time and
// write the result to disk.
//
// HOW. Boot the built bundle in headless Chrome, wait for the catalogue to
// land, then write document.outerHTML to dist/<route>/index.html — which
// server.js already serves ahead of the SPA fallback. React still takes over on
// the client (main.jsx uses createRoot, not hydrateRoot), so the snapshot is
// purely what a crawler and the first paint see; interactivity is unaffected.
//
// The snapshot is a point-in-time copy of the catalogue. Prices and stock edited
// in /admin reach visitors immediately (the client re-renders from Supabase) but
// only reach the static HTML on the next deploy — so redeploy after a big
// catalogue change. See docs/seo-migration.md.

import { createServer } from 'node:http'
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises'
import { join, extname, normalize, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import puppeteer from 'puppeteer-core'
import { allRoutes, loadEnv } from './routes.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(root, 'dist')

// Snapshots are written concurrently; each one is an independent page load, and
// beyond a handful the browser becomes the bottleneck rather than the network.
const CONCURRENCY = 4
// A route that hasn't signalled ready by now is treated as a failure, not a
// slow page — better to fail the build than to ship an empty snapshot.
const READY_TIMEOUT_MS = 30_000
// Every route loads the full catalogue, so a handful time out purely from
// contention when several tabs hit Supabase at once. Retrying serially clears
// them; only a route that fails alone is a real failure.
const ATTEMPTS = 3

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
}

// Where Chrome lives. puppeteer-core ships no browser of its own on purpose —
// downloading a second Chromium into every CI run and every Railway build is
// ~180 MB for something all three environments already have.
function findChrome() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/nix/var/nix/profiles/default/bin/chromium',
  ]
  return candidates.find((path) => existsSync(path)) || null
}

// Minimal static server over dist/. Deliberately not server.js: this runs while
// we're rewriting the very files server.js reads, and the snapshots must come
// from the SPA shell every time, not from a half-written prerendered page.
function startServer(shell) {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent((req.url || '/').split('?')[0])
    const safe = normalize(path).replace(/^(\.\.[/\\])+/, '')
    const filePath = join(DIST, safe)
    try {
      const info = await stat(filePath)
      if (info.isFile()) {
        const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream'
        res.writeHead(200, { 'Content-Type': type })
        return res.end(await readFile(filePath))
      }
    } catch {
      // fall through to the shell
    }
    res.writeHead(200, { 'Content-Type': MIME['.html'] })
    res.end(shell)
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }))
  })
}

// Renders one route and returns its HTML. `expect404` is set only for the
// deliberate 404 render at the end of the run.
async function snapshot(browser, origin, route, { expect404 = false } = {}) {
  const page = await browser.newPage()
  try {
    await page.setViewport({ width: 1440, height: 900 })
    // Reduced motion makes useScrollIn (src/lib/motion.js) return inert props,
    // so nothing is captured mid-animation. Without this, every below-the-fold
    // section would be frozen at `opacity: 0` in the static HTML — present in
    // the DOM but styled invisible, which is exactly the pattern search engines
    // discount as hidden text.
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
    await page.goto(`${origin}${route}`, { waitUntil: 'domcontentloaded' })
    // main.jsx flips this once the catalogue fetch settles (either way).
    await page.waitForFunction('window.__APP_READY__ === true', { timeout: READY_TIMEOUT_MS })
    // React re-renders on the tick after the store updates; wait for the routed
    // page's own <main> landmark rather than guessing at a delay.
    await page.waitForSelector('main', { timeout: READY_TIMEOUT_MS })

    const html = await page.evaluate(() => {
      // index.html carries a generic fallback <meta description>, og:* and
      // twitter:* set. Helmet adds the per-page versions but can't remove tags
      // it didn't create, so a snapshot contains BOTH — with the generic one
      // first, which is the one a crawler is liable to believe. Drop any static
      // tag that a Helmet-managed tag (data-rh) supersedes; anything Helmet
      // doesn't manage (charset, viewport, theme-color, icons, preloads) is
      // untouched because no managed tag shares its key.
      const keyOf = (el) =>
        `${el.tagName}|${el.getAttribute('name') || el.getAttribute('property') || el.getAttribute('rel') || ''}`
      const managed = new Set(
        [...document.head.querySelectorAll('meta[data-rh], link[data-rh]')].map(keyOf),
      )
      for (const el of document.head.querySelectorAll('meta, link')) {
        if (!el.hasAttribute('data-rh') && managed.has(keyOf(el))) el.remove()
      }
      return `<!doctype html>\n${document.documentElement.outerHTML}`
    })
    // A route in the list that renders the 404 page means the list and the app
    // disagree about what exists — which is how 15 hidden products once got
    // prerendered as "Page not found" and written into the sitemap. Fail the
    // build: a dead URL submitted to Google is worse than no URL.
    if (!expect404 && /<title>Page not found/.test(html)) {
      throw new Error('rendered the 404 page — route is in the list but not in the app')
    }
    return html
  } finally {
    await page.close()
  }
}

// '/' -> dist/index.html; '/about' -> dist/about/index.html. server.js already
// resolves a directory to its index.html, so no routing change is needed.
async function writeSnapshot(route, html) {
  const file =
    route === '/' ? join(DIST, 'index.html') : join(DIST, route.replace(/^\//, ''), 'index.html')
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, html)
}

// Runs `worker` over `items`, at most CONCURRENCY in flight.
async function pool(items, worker) {
  const queue = [...items]
  const runners = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length) await worker(queue.shift())
  })
  await Promise.all(runners)
}

async function main() {
  if (process.env.SKIP_PRERENDER === '1') {
    console.warn('[prerender] SKIP_PRERENDER=1 — shipping a client-rendered build.')
    return
  }

  const chrome = findChrome()
  if (!chrome) {
    // Loud on purpose. A silent skip would ship a build that looks fine and
    // quietly serves an empty shell to every crawler.
    console.error(
      '[prerender] No Chrome/Chromium found. Install one, or set ' +
        'PUPPETEER_EXECUTABLE_PATH. To ship without prerendering (and lose the ' +
        'static HTML every crawler reads), set SKIP_PRERENDER=1.',
    )
    process.exit(1)
  }

  const shellPath = join(DIST, 'index.html')
  if (!existsSync(shellPath)) {
    console.error('[prerender] dist/index.html missing — run `vite build` first.')
    process.exit(1)
  }
  const shell = await readFile(shellPath, 'utf8')
  // Kept for server.js: the neutral shell it serves for a path that may still
  // resolve to a real page on the client (a product added after this deploy).
  // dist/index.html itself is about to become the prerendered home page.
  await writeFile(join(DIST, 'app-shell.html'), shell)

  const env = await loadEnv()
  const routes = (await allRoutes(env)).map((r) => r.path)

  const { server, port } = await startServer(shell)
  const origin = `http://127.0.0.1:${port}`
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })

  const failures = []
  let done = 0
  try {
    const retry = []
    await pool(routes, async (route) => {
      try {
        await writeSnapshot(route, await snapshot(browser, origin, route))
        done += 1
        if (done % 20 === 0) console.log(`[prerender] ${done}/${routes.length}`)
      } catch {
        retry.push(route)
      }
    })

    // Second pass, one page at a time — no contention, so anything still
    // failing here is a genuine problem with the route.
    for (const route of retry) {
      let lastError
      for (let attempt = 2; attempt <= ATTEMPTS; attempt += 1) {
        try {
          await writeSnapshot(route, await snapshot(browser, origin, route))
          done += 1
          lastError = null
          break
        } catch (err) {
          lastError = err
        }
      }
      if (lastError) failures.push({ route, message: lastError.message })
    }
    if (retry.length) {
      console.log(`[prerender] retried ${retry.length} route(s), ${failures.length} still failing`)
    }

    // The 404 shell, rendered from a path that matches no route. server.js
    // serves this with a real 404 status, so the error page ships with its
    // noindex tag already in the HTML rather than only after JS runs.
    try {
      const html = await snapshot(browser, origin, '/__prerender_404__', { expect404: true })
      await writeFile(join(DIST, '404.html'), html)
    } catch (err) {
      failures.push({ route: '404.html', message: err.message })
    }
  } finally {
    await browser.close()
    server.close()
  }

  if (failures.length) {
    console.error(`[prerender] ${failures.length} route(s) failed:`)
    for (const f of failures) console.error(`  ${f.route}: ${f.message}`)
    process.exit(1)
  }

  console.log(`[prerender] ${routes.length} routes + 404.html written to dist/.`)
}

await main()
