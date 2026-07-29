// Client-side photo pipeline for admin uploads. Produces a downscaled JPEG
// master plus the -400/-800 WebP derivatives <Img> expects (same naming
// contract as scripts/gen-images.mjs) so storefront srcsets keep working for
// photos that never touch the repo.

export const DERIVATIVE_WIDTHS = [400, 800]
const MASTER_MAX_WIDTH = 1600
const JPEG_QUALITY = 0.85
const WEBP_QUALITY = 0.68

// Both photo kinds share one derivative contract (`<name>.jpg` plus
// `<name>-400.webp` / `<name>-800.webp` beside it) so <Img> can build a srcset
// from the JPEG path alone, with no manifest to keep in sync.
function pathsFor(base) {
  return {
    jpeg: `${base}.jpg`,
    webp: DERIVATIVE_WIDTHS.map((width) => ({ width, path: `${base}-${width}.webp` })),
  }
}

export function photoPaths(productId, name) {
  return pathsFor(`products/${productId}/${name}`)
}

// Home-carousel tile photos. Keyed by category, not product — a tile photo is
// deliberately standalone, so it needs no product to hang off.
export function categoryPhotoPaths(categoryId, name) {
  return pathsFor(`categories/${categoryId}/${name}`)
}

function scaled(bitmap, targetWidth) {
  const width = Math.min(targetWidth, bitmap.width)
  const height = Math.round((bitmap.height / bitmap.width) * width)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)
  return canvas
}

function encode(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error(`Could not encode ${type}`))),
      type,
      quality,
    )
  })
}

export async function processPhoto(file) {
  const bitmap = await createImageBitmap(file)
  const jpeg = await encode(scaled(bitmap, MASTER_MAX_WIDTH), 'image/jpeg', JPEG_QUALITY)
  const variants = []
  for (const width of DERIVATIVE_WIDTHS) {
    variants.push({ width, blob: await encode(scaled(bitmap, width), 'image/webp', WEBP_QUALITY) })
  }
  bitmap.close()
  return { jpeg, variants }
}
