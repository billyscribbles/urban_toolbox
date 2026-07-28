import { useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'

// Shared centered-dialog shell for the admin's settings modals. Mirrors
// EditorTray's dialog semantics: Esc-to-close, backdrop, body scroll lock,
// focus the close button on open, restore focus to the trigger on exit.
// Prop-driven — the caller owns `open`, and this stays mounted so the exit
// animation still runs.
export default function AdminModal({ open, title, onClose, children }) {
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
        <div className="admin-modal" role="dialog" aria-modal="true" aria-label={title}>
          <motion.button
            type="button"
            className="admin-modal__backdrop"
            aria-label={`Close ${title.toLowerCase()} dialog`}
            onClick={onClose}
            {...fade}
          />
          <motion.div className="admin-modal__panel" {...panelMotion}>
            <div className="admin-modal__head">
              <h2 className="admin-modal__title">{title}</h2>
              <button
                ref={closeRef}
                type="button"
                className="editor-tray__close"
                onClick={onClose}
                aria-label={`Close ${title.toLowerCase()} dialog`}
              >
                <X size={22} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>
            <div className="admin-modal__body">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
