import { useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import StoreDiscount from './StoreDiscount.jsx'

// Centered dialog that hosts the store-wide discount form. Mirrors EditorTray's
// dialog semantics (Esc-to-close, backdrop, body scroll lock, focus the close
// button, restore focus on exit). Prop-driven: open whenever `open` is set —
// StatCards owns that state, and the dialog stays mounted so its exit animates.
export default function DiscountModal({ open, onSaved, onClose }) {
  const reduce = useReducedMotion()
  const closeRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const trigger = document.activeElement
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      trigger?.focus?.()
    }
  }, [open, onClose])

  const panelMotion = reduce
    ? {}
    : {
        initial: { opacity: 0, scale: 0.96 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.96 },
        transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
      }
  const fade = reduce
    ? {}
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }

  return (
    <AnimatePresence>
      {open && (
        <div className="admin-modal" role="dialog" aria-modal="true" aria-label="Store-wide discount">
        <motion.button
          type="button"
          className="admin-modal__backdrop"
          aria-label="Close discount dialog"
          onClick={onClose}
          {...fade}
        />
        <motion.div className="admin-modal__panel" {...panelMotion}>
          <div className="admin-modal__head">
            <h2 className="admin-modal__title">Store-wide discount</h2>
            <button
              ref={closeRef}
              type="button"
              className="editor-tray__close"
              onClick={onClose}
              aria-label="Close discount dialog"
            >
              <X size={22} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>
          <div className="admin-modal__body">
            <p className="admin-modal__intro">
              One percentage applied to every storefront price at display time. The greater of this
              and each product&rsquo;s own discount wins. Set to 0 to turn it off.
            </p>
            <StoreDiscount onSaved={onSaved} />
          </div>
        </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
