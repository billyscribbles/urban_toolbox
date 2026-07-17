import { useEffect, useState } from 'react'
import Img from './Img.jsx'
import './ProductGallery.css'

// Product-page image gallery: a large main photo with a thumbnail strip beneath
// it when a product carries extra angles. The main image opts into the site
// Lightbox (class="zoomable") so a click enlarges it — the "open the photo"
// affordance the old detail drawer used to provide. Dumb: it only lays out the
// photos handed to it. Fit/tone resolve the same way cards do (PNG/SVG →
// contain-on-white, photos → cover).
export default function ProductGallery({
  img,
  imgAlt,
  images,
  title,
  imageFit,
  imageTone,
  imagePosition,
}) {
  const gallery = images?.length > 1 ? images : null
  const [shot, setShot] = useState(0)
  // Reset to the first shot whenever a different product mounts this gallery.
  useEffect(() => {
    setShot(0)
  }, [img])

  if (!img) return null

  const active = gallery ? gallery[shot] : { src: img, alt: imgAlt || title }
  const fit = imageFit || (active.src?.match(/\.(png|svg)$/i) ? 'contain' : 'cover')
  const tone = imageTone || (fit === 'contain' ? 'white' : 'photo')
  const style = imagePosition ? { objectPosition: imagePosition } : undefined

  return (
    <div className="product-gallery">
      <div
        className={`product-gallery__media product-gallery__media--${fit} product-gallery__media--${tone}`}
      >
        <Img
          key={active.src}
          className="product-gallery__img zoomable"
          src={active.src}
          alt={active.alt || title}
          style={style}
          sizes="(max-width: 900px) 100vw, 46vw"
          loading="eager"
          fetchPriority="high"
        />
      </div>

      {gallery && (
        <div className="product-gallery__thumbs" role="group" aria-label={`${title} photos`}>
          {gallery.map((g, i) => (
            <button
              key={g.src}
              type="button"
              className={`product-gallery__thumb${i === shot ? ' is-active' : ''}`}
              aria-label={`Show photo ${i + 1} of ${gallery.length}`}
              aria-current={i === shot}
              onClick={() => setShot(i)}
            >
              <img src={g.src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      <p className="product-gallery__disclaimer">
        *Images are for illustration only and may not perfectly reflect the finished product.
      </p>
    </div>
  )
}
