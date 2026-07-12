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
import { gzipSync } from 'node:zlib'
import { join, extname, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = fileURLToPath(new URL('./dist', import.meta.url))
const ASSETS = join(DIST, 'assets')
const PORT = process.env.PORT || 4173

// Legacy URL -> canonical target. Every value must be a real 200 route (or a
// deeper redirect) so we never build a redirect loop.
const REDIRECTS = {
  '/ute-accesories': '/ute-accessories', // old misspelling Google indexed
  '/laser-cutting': '/fabrication#laser-cutting', // now a section of /fabrication
  '/folding': '/fabrication#folding', // now a section of /fabrication
  '/photos': '/', // no equivalent page — send to home
}

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
// compressed, so gzipping them just burns CPU for nothing.
const COMPRESSIBLE = /^(text\/|application\/(javascript|json|xml|manifest))/
const compressed = new Map()

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers)
  res.end(body)
}

// Gzip a file's bytes if the client accepts it and the type is worth it.
// Responses are memoised by path: dist/ is immutable for the life of the
// process, so each file is only ever compressed once.
function maybeGzip(req, res, key, body, type, headers) {
  const accepts = (req.headers['accept-encoding'] || '').includes('gzip')
  if (!accepts || !COMPRESSIBLE.test(type)) return { body, headers }

  let gz = compressed.get(key)
  if (!gz) {
    gz = gzipSync(body)
    compressed.set(key, gz)
  }
  res.setHeader('Vary', 'Accept-Encoding')
  return { body: gz, headers: { ...headers, 'Content-Encoding': 'gzip' } }
}

async function serveIndex(req, res) {
  try {
    const html = await readFile(join(DIST, 'index.html'))
    const { body, headers } = maybeGzip(req, res, 'index.html', html, MIME['.html'], {
      'Content-Type': MIME['.html'],
      'Cache-Control': 'no-cache',
    })
    send(res, 200, body, headers)
  } catch {
    send(res, 500, 'dist/index.html missing — run `yarn build` before starting.')
  }
}

const server = createServer(async (req, res) => {
  const rawPath = decodeURIComponent((req.url || '/').split('?')[0])

  // 1) Legacy 301 redirects — exact match, tolerant of a trailing slash.
  const key = rawPath !== '/' && rawPath.endsWith('/') ? rawPath.slice(0, -1) : rawPath
  if (REDIRECTS[key]) {
    return send(res, 301, null, { Location: REDIRECTS[key] })
  }

  // 2) Serve a real file from dist/, if one exists. normalize() + the strip
  //    below block "../" path-traversal attempts.
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
    const { body, headers } = maybeGzip(req, res, filePath, raw, type, {
      'Content-Type': type,
      'Cache-Control': cache,
    })
    return send(res, 200, body, headers)
  } catch {
    // 3) SPA fallback — hand unknown paths to index.html so React Router (and
    //    the 404 page) take over on the client.
    return serveIndex(req, res)
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Serving dist/ on http://0.0.0.0:${PORT}`)
})
