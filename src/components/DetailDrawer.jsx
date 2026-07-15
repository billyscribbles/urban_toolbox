import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { useDetail, closeDetail } from '../lib/detailStore.js'
import PriceTag from './PriceTag.jsx'
import QuoteButton from './QuoteButton.jsx'
import './DetailDrawer.css'

// Site-wide product-detail drawer. Mounted once in App beside the quote drawer;
// borrows the same dialog semantics (role, Esc-to-close, scroll lock, focus the
// close button, restore focus on exit). The card supplies a product descriptor;
// this stays dumb and only lays out what's given — photo, spec chips, the shared
// "built into every box" list and an add-to-quote action.
export default function DetailDrawer() {
  const { product, isOpen } = useDetail()
  const reduce = useReducedMotion()
  const closeRef = useRef(null)
  // Products that ship extra angles carry an `images` array; the rest render a
  // single photo. Track which one the thumbnail strip has selected, and start
  // back at the first shot every time a different product opens the drawer.
  const [shot, setShot] = useState(0)
  const gallery = product?.images?.length > 1 ? product.images : null

  useEffect(() => {
    setShot(0)
  }, [product?.title])

  useEffect(() => {
    if (!isOpen) return
    const trigger = document.activeElement
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && closeDetail()
    document.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      trigger?.focus?.()
    }
  }, [isOpen])

  const panelMotion = reduce
    ? {}
    : {
        initial: { x: '100%' },
        animate: { x: 0 },
        exit: { x: '100%' },
        transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
      }
  const fade = reduce
    ? {}
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
  const imageFit = product?.imageFit || (product?.img?.match(/\.(png|svg)$/i) ? 'contain' : 'cover')
  const imageTone = product?.imageTone || (imageFit === 'contain' ? 'white' : 'photo')
  const imagePosition = product?.imagePosition
    ? { objectPosition: product.imagePosition }
    : undefined

  return (
    <AnimatePresence>
      {isOpen && product && (
        <div
          className="detail-drawer"
          role="dialog"
          aria-modal="true"
          aria-label={`${product.title} details`}
        >
          <motion.button
            type="button"
            className="detail-drawer__backdrop"
            aria-label="Close details"
            onClick={closeDetail}
            {...fade}
          />
          <motion.div className="detail-drawer__panel" {...panelMotion}>
            <div className="detail-drawer__head">
              <div>
                {product.category && <p className="detail-drawer__eyebrow">{product.category}</p>}
                <h2 className="detail-drawer__title">{product.title}</h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                className="detail-drawer__close"
                onClick={closeDetail}
                aria-label="Close details"
              >
                <X size={22} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>

            <div className="detail-drawer__scroll">
              {product.img && (
                <div
                  className={`detail-drawer__media detail-drawer__media--${imageFit} detail-drawer__media--${imageTone}`}
                >
                  <img
                    className="detail-drawer__img"
                    src={gallery ? gallery[shot].src : product.img}
                    alt={
                      gallery ? gallery[shot].alt || product.title : product.imgAlt || product.title
                    }
                    style={imagePosition}
                  />
                </div>
              )}

              {gallery && (
                <div
                  className="detail-drawer__thumbs"
                  role="group"
                  aria-label={`${product.title} photos`}
                >
                  {gallery.map((g, i) => (
                    <button
                      key={g.src}
                      type="button"
                      className={`detail-drawer__thumb${i === shot ? ' is-active' : ''}`}
                      aria-label={`Show photo ${i + 1} of ${gallery.length}`}
                      aria-current={i === shot}
                      onClick={() => setShot(i)}
                    >
                      <img src={g.src} alt="" />
                    </button>
                  ))}
                </div>
              )}

              <div className="detail-drawer__price">
                <PriceTag
                  price={product.price ?? product.priceFrom}
                  discountPct={product.discountPct}
                />
              </div>

              {product.specs?.length > 0 && (
                <dl className="detail-drawer__specs">
                  {product.specs.map((s) => (
                    <div key={s.label + s.value} className="detail-drawer__spec">
                      <dt className="detail-drawer__spec-label">{s.label}</dt>
                      <dd className="detail-drawer__spec-value">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {product.features?.length > 0 && (
                <div className="detail-drawer__features">
                  <h3 className="detail-drawer__features-heading">Features</h3>
                  <ul className="detail-drawer__features-list">
                    {product.features.map((f) => (
                      <li key={f} className="detail-drawer__features-item">
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {product.quoteItem && (
              <div className="detail-drawer__foot">
                <QuoteButton item={product.quoteItem} />
                <p className="detail-drawer__note">
                  No payment — add it to your quote and we’ll call back to confirm size and price.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
