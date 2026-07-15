import { useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import ProductEditor from './ProductEditor.jsx'

// Right-side slide-out that hosts the product create/edit form. Mirrors the
// storefront QuoteDrawer's dialog semantics (Esc-to-close, backdrop, body
// scroll lock, focus the close button, restore focus on exit). Prop-driven:
// open whenever `editing` is set — AdminPage owns that state.
export default function EditorTray({ editing, rows, onDone, onCancel }) {
  const open = editing !== null
  const row = editing === 'new' ? null : editing
  const isNew = !row
  const title = isNew ? 'New product' : `Edit — ${row.title}`
  const reduce = useReducedMotion()
  const closeRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const trigger = document.activeElement
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && onCancel()
    document.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      trigger?.focus?.()
    }
  }, [open, onCancel])

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

  return (
    <AnimatePresence>
      {open && (
        <div className="editor-tray" role="dialog" aria-modal="true" aria-label={title}>
          <motion.button
            type="button"
            className="editor-tray__backdrop"
            aria-label="Close editor"
            onClick={onCancel}
            {...fade}
          />
          <motion.div className="editor-tray__panel" {...panelMotion}>
            <div className="editor-tray__head">
              <h2 className="editor-tray__title">{title}</h2>
              <button
                ref={closeRef}
                type="button"
                className="editor-tray__close"
                onClick={onCancel}
                aria-label="Close editor"
              >
                <X size={22} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>
            <ProductEditor
              key={row ? row.id : 'new'}
              row={row}
              rows={rows}
              onDone={onDone}
              onCancel={onCancel}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
