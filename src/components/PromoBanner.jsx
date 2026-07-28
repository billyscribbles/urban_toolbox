import { useEffect, useState } from 'react'
import { Tag, X } from 'lucide-react'
import { usePromo, loadPromo, dismissPromo, signatureOf } from '../lib/promoStore.js'
import './PromoBanner.css'

const ROTATE_MS = 5000

// Optional promo strip above the navbar. Copy and on/off live in Supabase
// (store_settings) and are edited from /admin.
//
// It sits in normal flow above the sticky navbar, so it scrolls away while the
// navbar keeps pinning on its own — no Navbar.css changes needed.
//
// Every message renders into the DOM at once, stacked into one grid cell with
// only the active one visible. A screen reader therefore reads the whole set,
// in order, and we avoid an aria-live region announcing a new message every
// five seconds. The stack also fixes the bar's height to its tallest message,
// so rotation never reflows the page.
//
// CSS transitions rather than framer-motion, deliberately: that library is kept
// off the storefront's initial bundle (see DeferredQuoteDrawer in App.jsx).
export default function PromoBanner() {
  const { enabled, messages, dismissed } = usePromo()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    loadPromo()
  }, [])

  const signature = signatureOf(messages)
  const visible = enabled && messages.length > 0 && dismissed !== signature

  // A late network reconcile can shorten the list — restart the cycle rather
  // than leave the index pointing past the end of it.
  useEffect(() => {
    setIndex(0)
  }, [signature])

  useEffect(() => {
    if (!visible || messages.length < 2) return
    const id = setInterval(() => setIndex((i) => (i + 1) % messages.length), ROTATE_MS)
    return () => clearInterval(id)
  }, [visible, messages.length])

  if (!visible) return null

  return (
    <aside className="promo" aria-label="Promotions">
      <div className="promo__inner container">
        <Tag className="promo__icon" size={15} strokeWidth={2.2} aria-hidden="true" />
        <p className="promo__stack">
          {messages.map((message, i) => (
            <span
              key={`${i}:${message}`}
              className={`promo__msg${i === index ? ' promo__msg--on' : ''}`}
            >
              {message}
            </span>
          ))}
        </p>
        <button
          type="button"
          className="promo__close"
          onClick={dismissPromo}
          aria-label="Dismiss promotion"
        >
          <X size={16} strokeWidth={2.2} aria-hidden="true" />
        </button>
      </div>
    </aside>
  )
}
