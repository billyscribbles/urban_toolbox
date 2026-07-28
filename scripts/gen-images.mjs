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
  // The hero is full-bleed and the LCP image — it carries fine checkerplate
  // detail that q68 visibly softens, so encode it at a higher quality. The two
  // extra flags buy that crispness cheaply: -sharp_yuv keeps chroma off the
  // hard edges (a black canopy against a sunset sky is exactly where the
  // default subsampling bleeds), and -m 6 spends more search effort for the
  // same quality target.
  //
  // Quality is per width, because the two renditions are viewed at very
  // different angular sizes. The 1600 goes full-bleed across a desktop, where
  // the extra bytes are the difference between crisp and mushy. The 800 renders
  // at ~410 CSS px on a phone, where they buy nothing anyone can see — and it
  // is the only one a phone ever fetches, so it alone sets the LCP budget.
  {
    dir: 'public/brand',
    widths: [800, 1600],
    only: /^hero-/,
    quality: { 800: 88, 1600: 90 },
    sharp: true,
  },
]

function sourceWidth(file) {
  const out = execFileSync('sips', ['-g', 'pixelWidth', file], { encoding: 'utf8' })
  return Number(out.match(/pixelWidth:\s*(\d+)/)[1])
}

let made = 0
let skipped = 0

// `quality` is either one number for every width, or a map keyed by width.
const qualityFor = (quality, w) =>
  typeof quality === 'object' ? (quality[w] ?? QUALITY) : (quality ?? QUALITY)

for (const { dir, widths, only, quality, sharp } of TARGETS) {
  const extra = sharp ? ['-sharp_yuv', '-m', '6'] : []
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
        [
          '-q',
          String(qualityFor(quality, w)),
          ...extra,
          '-resize',
          String(target),
          '0',
          src,
          '-o',
          out,
        ],
        { stdio: 'ignore' },
      )
      made++
    }
  }
}

console.log(`WebP derivatives: ${made} written, ${skipped} already current.`)
console.log(`Output next to the originals in ${TARGETS.map((t) => t.dir).join(' and ')}.`)
