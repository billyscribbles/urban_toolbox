// Production static server for the built site (dist/).
//
// Why this exists instead of `vite preview`: a domain migration needs real
// HTTP 301 redirects for the URLs the old GoDaddy site ranked for. `vite
// preview` can't emit them — it soft-loads the SPA (HTTP 200) for every path.
// Server-side 301s pass SEO signal cleanly; the React Router <Navigate> routes
// in App.jsx remain only as a client-side safety net.
//
// Zero dependencies on purpose — keeps the deploy surface small and readable.

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { gzipSync, brotliCompressSync, constants as zlibConstants } from 'node:zlib'
import { join, extname, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { legacyRedirects } from './src/config/redirects.js'

const DIST = fileURLToPath(new URL('./dist', import.meta.url))
const ASSETS = join(DIST, 'assets')
const PORT = process.env.PORT || 4173

// The legacy 301 map, shared with src/App.jsx's client-side safety net — see
// src/config/redirects.js. This is the copy search engines and link checkers
// see; a redirect that exists only on the client is a 404 to them.
//
// /laser-cutting and /folding are deliberately absent: they were separately
// ranking pages on the old site and are served as real 200 pages (see
// src/pages/ServicePage.jsx). Redirecting them into #anchors would have thrown
// the ranking away — Google discards the fragment.
const REDIRECTS = legacyRedirects

// Paths under these prefixes are resolved by the client from the live catalogue,
// so an unprerendered one may still be a real page (a product added in /admin
// after the last deploy). Everything else that isn't a file on disk is a
// genuine 404 and must say so — see the fallback at the bottom.
const DYNAMIC_PREFIXES = ['/product/', '/toolboxes/', '/accessories/']

// Real pages that are deliberately never prerendered. /admin is auth-gated and
// noindexed, so it has no static HTML — but it is a working page and must not
// answer 404.
const CLIENT_ONLY_ROUTES = new Set(['/admin'])

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}

// Text assets ship uncompressed otherwise — the JS bundle alone is a few
// hundred KB of highly compressible source. Images and fonts are already
// compressed, so compressing them just burns CPU for nothing.
const COMPRESSIBLE = /^(text\/|application\/(javascript|json|xml|manifest))/
// Brotli is ~15% smaller than gzip on our JS/CSS, which matters on the LCP
// critical path under throttled connections (and to the Lighthouse gate).
// Prefer it when the client advertises it, and fall back to gzip otherwise.
// Max quality (11) is fine because responses are memoised — see below.
const BROTLI_OPTS = { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 } }
const compressed = new Map()

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers)
  res.end(body)
}

// Compress a file's bytes if the client accepts it and the type is worth it,
// preferring Brotli over gzip. Responses are memoised by "path|encoding":
// dist/ is immutable for the life of the process, so each file is only ever
// compressed once per encoding.
function maybeCompress(req, res, key, body, type, headers) {
  if (!COMPRESSIBLE.test(type)) return { body, headers }
  const accept = req.headers['accept-encoding'] || ''
  const encoding = accept.includes('br') ? 'br' : accept.includes('gzip') ? 'gzip' : null
  if (!encoding) return { body, headers }

  const cacheKey = `${key}|${encoding}`
  let out = compressed.get(cacheKey)
  if (!out) {
    out = encoding === 'br' ? brotliCompressSync(body, BROTLI_OPTS) : gzipSync(body)
    compressed.set(cacheKey, out)
  }
  res.setHeader('Vary', 'Accept-Encoding')
  return { body: out, headers: { ...headers, 'Content-Encoding': encoding } }
}

// Fallback documents written by scripts/prerender.mjs. `404.html` is the
// prerendered error page (noindex already in the markup); `app-shell.html` is
// the bare Vite shell, used for a path that may still resolve to a real page on
// the client. Both fall back to dist/index.html when the build skipped
// prerendering, so the server still works on a plain `vite build`.
const FALLBACKS = { 404: '404.html', 200: 'app-shell.html' }

// Serves an SPA document. `status` is 200 for paths that may still be real, and
// 404 for paths that definitely aren't — a 200 on an unknown URL is a soft 404,
// which Google penalises and which would otherwise apply to every typo and
// every retired URL.
async function serveIndex(req, res, status = 200) {
  const name = FALLBACKS[status] || 'index.html'
  for (const file of [name, 'index.html']) {
    try {
      const html = await readFile(join(DIST, file))
      const { body, headers } = maybeCompress(req, res, file, html, MIME['.html'], {
        'Content-Type': MIME['.html'],
        'Cache-Control': 'no-cache',
      })
      return send(res, status, body, headers)
    } catch {
      // try the next candidate
    }
  }
  send(res, 500, 'dist/index.html missing — run `yarn build` before starting.')
}

const server = createServer(async (req, res) => {
  const url = req.url || '/'
  const queryIndex = url.indexOf('?')
  // Preserved verbatim across redirects. Ad clicks land on the legacy URLs
  // carrying ?gclid=…, and Google Ads can only attribute the conversion if that
  // parameter survives the hop — dropping it silently breaks campaign reporting.
  const query = queryIndex === -1 ? '' : url.slice(queryIndex)
  const rawPath = decodeURIComponent(queryIndex === -1 ? url : url.slice(0, queryIndex))

  // 0) www -> apex. The old GoDaddy edge served this 301; nothing in this stack
  //    did, so after the DNS cutover every page would have answered 200 on both
  //    hostnames and split the domain's equity in two. Railway does not add the
  //    redirect for you — pointing both names at the service just serves both.
  //
  //    Scheme comes from x-forwarded-proto because TLS terminates at Railway's
  //    edge and this process only ever sees http; hardcoding https would break
  //    a plain-http local test, and echoing `http` would send a live visitor to
  //    an insecure URL. Port-bearing hosts (localhost:4297) are left alone.
  const host = req.headers.host || ''
  if (host.startsWith('www.')) {
    const proto = req.headers['x-forwarded-proto'] || 'https'
    return send(res, 301, null, { Location: `${proto}://${host.slice(4)}${url}` })
  }

  // 1) Canonicalise the trailing slash so /about/ and /about aren't two
  //    indexable URLs for one page. Root is exempt.
  if (rawPath !== '/' && rawPath.endsWith('/')) {
    return send(res, 301, null, { Location: rawPath.slice(0, -1) + query })
  }

  // 2) Legacy 301 redirects.
  if (REDIRECTS[rawPath]) {
    return send(res, 301, null, { Location: REDIRECTS[rawPath] + query })
  }

  // The fallback documents are internal plumbing, not pages. Serving them at
  // their own URLs would put an empty shell (and a duplicate 404) into the index.
  if (rawPath === '/app-shell.html' || rawPath === '/404.html') {
    return serveIndex(req, res, 404)
  }

  // 3) Serve a real file from dist/, if one exists — including the prerendered
  //    per-route HTML the build writes to dist/<route>/index.html. normalize()
  //    + the strip below block "../" path-traversal attempts.
  const safePath = normalize(rawPath).replace(/^(\.\.[/\\])+/, '')
  let filePath = join(DIST, safePath)
  try {
    let info = await stat(filePath)
    if (info.isDirectory()) {
      filePath = join(filePath, 'index.html')
      info = await stat(filePath)
    }
    const raw = await readFile(filePath)
    const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream'
    // Content-hashed assets are immutable; everything else must revalidate.
    const cache = filePath.startsWith(ASSETS) ? 'public, max-age=31536000, immutable' : 'no-cache'
    const { body, headers } = maybeCompress(req, res, filePath, raw, type, {
      'Content-Type': type,
      'Cache-Control': cache,
    })
    return send(res, 200, body, headers)
  } catch {
    // 4) SPA fallback. Paths under a dynamic prefix may still be real pages the
    //    client resolves from the live catalogue, so they keep a 200. Anything
    //    else has no route and gets an honest 404 — React Router still renders
    //    the 404 page on the client, it just arrives with the right status.
    const maybeReal =
      CLIENT_ONLY_ROUTES.has(rawPath) ||
      DYNAMIC_PREFIXES.some((prefix) => rawPath.startsWith(prefix))
    return serveIndex(req, res, maybeReal ? 200 : 404)
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Serving dist/ on http://0.0.0.0:${PORT}`)
})
