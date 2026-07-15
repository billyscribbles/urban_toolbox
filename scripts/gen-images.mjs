// Generates the WebP derivatives that <Img> and the hero serve.
//
// Run this LOCALLY whenever you add or replace a photo in public/images or
// public/brand, then commit the generated *.webp alongside the original:
//
//   yarn images
//
// The derivatives are committed on purpose. CI and the Railway builder never
// run this script, so neither needs cwebp installed — they just serve the files
// that are already in the repo. Originals stay put as the <img> fallback for
// browsers without WebP.
//
// Requires cwebp (`brew install webp`).

import { execFileSync } from 'node:child_process'
import { readdirSync, existsSync, statSync } from 'node:fs'
import { join, extname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
// 68 is the point where these photos stop shrinking meaningfully without
// visible artefacts at the sizes they render. The originals stay lossless-ish
// as the fallback, so this only affects the WebP path.
const QUALITY = 68

// Card and section photos never render wider than ~800 CSS px (a third of the
// container, or full-bleed on a phone), so 400/800 covers 1x and 2x. The hero
// is full-bleed on desktop and needs the extra step up.
const TARGETS = [
  { dir: 'public/images', widths: [400, 800] },
  // readdirSync is non-recursive, so the catalog subfolder needs its own entry.
  { dir: 'public/images/catalog', widths: [400, 800] },
  { dir: 'public/brand', widths: [800, 1600], only: /^hero-/ },
]

function sourceWidth(file) {
  const out = execFileSync('sips', ['-g', 'pixelWidth', file], { encoding: 'utf8' })
  return Number(out.match(/pixelWidth:\s*(\d+)/)[1])
}

let made = 0
let skipped = 0

for (const { dir, widths, only } of TARGETS) {
  const abs = join(ROOT, dir)
  if (!existsSync(abs)) continue

  for (const name of readdirSync(abs)) {
    if (!/\.(jpe?g|png)$/i.test(name)) continue
    if (only && !only.test(name)) continue

    const src = join(abs, name)
    const stem = basename(name, extname(name))
    const srcW = sourceWidth(src)

    for (const w of widths) {
      const out = join(abs, `${stem}-${w}.webp`)
      // Never upscale: a 600px-wide source still produces a "-800.webp", it
      // just holds the original 600px. Keeping the filename predictable is what
      // lets <Img> build a srcset without a manifest.
      const target = Math.min(w, srcW)

      if (existsSync(out) && statSync(out).mtimeMs > statSync(src).mtimeMs) {
        skipped++
        continue
      }

      execFileSync(
        'cwebp',
        ['-q', String(QUALITY), '-resize', String(target), '0', src, '-o', out],
        {
          stdio: 'ignore',
        },
      )
      made++
    }
  }
}

console.log(`WebP derivatives: ${made} written, ${skipped} already current.`)
console.log(`Output next to the originals in ${TARGETS.map((t) => t.dir).join(' and ')}.`)
