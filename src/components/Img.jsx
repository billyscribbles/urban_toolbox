// Content photo: a WebP srcset with the original JPEG/PNG as the fallback.
//
// The derivatives are pre-generated and committed by `yarn images`
// (scripts/gen-images.mjs), which names them predictably — "hero.jpg" gets a
// "hero-400.webp" and a "hero-800.webp" beside it — so this component can build
// the srcset from the original's path with no manifest to keep in sync.
//
// The <picture> is `display: contents`, so it adds no box of its own and the
// <img> keeps inheriting the layout its parent's CSS already gives it.

const CARD_WIDTHS = [400, 800]

export default function Img({
  src,
  alt,
  className,
  style,
  // Cards sit one-per-row on a phone and a third of the container on desktop.
  sizes = '(max-width: 700px) 100vw, 33vw',
  widths = CARD_WIDTHS,
  loading = 'lazy',
  decoding = 'async',
  fetchPriority,
  width,
  height,
}) {
  const isRaster = /\.(jpe?g|png)$/i.test(src || '')
  const base = isRaster ? src.replace(/\.(jpe?g|png)$/i, '') : null
  const srcSet = base ? widths.map((w) => `${base}-${w}.webp ${w}w`).join(', ') : null

  const img = (
    <img
      className={className}
      src={src}
      alt={alt}
      style={style}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      width={width}
      height={height}
    />
  )

  // SVGs (and anything else) have no derivatives — serve them straight.
  if (!srcSet) return img

  return (
    <picture className="picture">
      <source type="image/webp" srcSet={srcSet} sizes={sizes} />
      {img}
    </picture>
  )
}
