import { useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { X, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuote, updateItem, removeItem, closeQuote } from '../lib/quoteStore.js'
import './QuoteDrawer.css'

const DIM_KEYS = ['w', 'h', 'd']

// standardDims like "2200×570×1010" → the matching W/H/D placeholder.
function placeholder(standardDims, key) {
  if (!standardDims) return ''
  const part = standardDims.split('×')[DIM_KEYS.indexOf(key)]
  return part ? part.trim() : ''
}

// Site-wide quote drawer. Mounted once in App beside Lightbox; borrows its
// dialog semantics (role, Esc-to-close, scroll lock, focus the close button).
export default function QuoteDrawer() {
  const { items, isOpen } = useQuote()
  const reduce = useReducedMotion()
  const navigate = useNavigate()
  const closeRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const trigger = document.activeElement
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && closeQuote()
    document.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      trigger?.focus?.()
    }
  }, [isOpen])

  function handleSend() {
    closeQuote()
    navigate('/quote')
  }

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
      {isOpen && (
        <div className="quote-drawer" role="dialog" aria-modal="true" aria-label="Your quote">
          <motion.button
            type="button"
            className="quote-drawer__backdrop"
            aria-label="Close quote"
            onClick={closeQuote}
            {...fade}
          />
          <motion.div className="quote-drawer__panel" {...panelMotion}>
            <div className="quote-drawer__head">
              <h2 className="quote-drawer__title">Your quote</h2>
              <button
                ref={closeRef}
                type="button"
                className="quote-drawer__close"
                onClick={closeQuote}
                aria-label="Close quote"
              >
                <X size={22} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>

            {items.length === 0 ? (
              <p className="quote-drawer__empty">
                Nothing in your quote yet — browse the range and add the boxes you’re after.
              </p>
            ) : (
              <ul className="quote-drawer__list">
                {items.map((it) => (
                  <li key={it.id} className="quote-item">
                    <div className="quote-item__head">
                      <div>
                        <h3 className="quote-item__name">{it.name}</h3>
                        <p className="quote-item__meta">
                          {it.category} ·{' '}
                          {it.priceFrom
                            ? `from $${it.priceFrom} + GST (indicative)`
                            : 'Price on enquiry'}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="quote-item__remove"
                        onClick={() => removeItem(it.id)}
                        aria-label={`Remove ${it.name}`}
                      >
                        <Trash2 size={18} strokeWidth={1.7} aria-hidden="true" />
                      </button>
                    </div>

                    <div
                      className="quote-item__dims"
                      role="group"
                      aria-label={`${it.name} dimensions in millimetres`}
                    >
                      {DIM_KEYS.map((k) => (
                        <label key={k} className="quote-item__dim">
                          <span className="quote-item__dim-label">{k.toUpperCase()}</span>
                          <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            placeholder={placeholder(it.standardDims, k)}
                            value={it.dims[k]}
                            onChange={(e) =>
                              updateItem(it.id, { dims: { ...it.dims, [k]: e.target.value } })
                            }
                          />
                        </label>
                      ))}
                      <span className="quote-item__dim-unit" aria-hidden="true">
                        mm
                      </span>
                    </div>

                    <label className="quote-item__qty">
                      <span>Qty</span>
                      <input
                        type="number"
                        min="1"
                        value={it.qty}
                        onChange={(e) =>
                          updateItem(it.id, { qty: Math.max(1, Number(e.target.value) || 1) })
                        }
                      />
                    </label>

                    <label className="quote-item__notes">
                      <span className="quote-item__notes-label">Notes</span>
                      <textarea
                        rows={2}
                        placeholder="Anything specific — mounting, colour, cut-outs…"
                        value={it.notes}
                        onChange={(e) => updateItem(it.id, { notes: e.target.value })}
                      />
                    </label>
                  </li>
                ))}
              </ul>
            )}

            {items.length > 0 && (
              <div className="quote-drawer__foot">
                <button
                  type="button"
                  className="btn btn--green quote-drawer__send"
                  onClick={handleSend}
                >
                  Send enquiry →
                </button>
                <p className="quote-drawer__note">
                  No payment — we’ll call you back to confirm details and price.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
