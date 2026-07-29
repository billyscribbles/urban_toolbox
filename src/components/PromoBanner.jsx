import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { usePromo, loadPromo, signatureOf } from '../lib/promoStore.js'
import './PromoBanner.css'

// How fast the strip travels. Tying duration to measured width (rather than
// picking a flat number of seconds) keeps this speed constant whether the
// promotion is one short line or six long ones.
const SPEED_PX_PER_SEC = 55
const MIN_COPIES = 2

// Optional promo strip above the navbar. Copy and on/off live in Supabase
// (store_settings) and are edited from /admin.
//
// It sits in normal flow above the sticky navbar, so it scrolls away while the
// navbar keeps pinning on its own — no Navbar.css changes needed.
//
// The messages ride a marquee: one group holds the real set, and enough
// aria-hidden clones follow it to cover the viewport. A CSS animation slides
// the track left by exactly one group width and loops, so a clone is always
// arriving as the original leaves and the reset is invisible. Only the first
// group is exposed to assistive tech — a screen reader reads the set once, in
// order, with no live region announcing anything.
//
// CSS animation rather than framer-motion, deliberately: that library is kept
// off the storefront's initial bundle (see DeferredQuoteDrawer in App.jsx).
export default function PromoBanner() {
  const { enabled, messages } = usePromo()
  const viewportRef = useRef(null)
  const groupRef = useRef(null)
  const [belt, setBelt] = useState({ copies: MIN_COPIES, width: 0 })

  useEffect(() => {
    loadPromo()
  }, [])

  const signature = signatureOf(messages)
  const visible = enabled && messages.length > 0

  // Clone count and travel distance both depend on rendered width, which
  // depends on the message set, the font once it loads, and the window size —
  // so measure rather than guess, and re-measure when any of those move.
  useLayoutEffect(() => {
    const viewport = viewportRef.current
    const group = groupRef.current
    if (!viewport || !group) return

    const measure = () => {
      // getBoundingClientRect, not offsetWidth: the latter rounds to whole
      // pixels, and a shift half a pixel short of a group width shows up as a
      // twitch every time the loop restarts.
      const width = group.getBoundingClientRect().width
      if (!width) return
      // One clone beyond what fills the viewport, so there is always a group
      // queued off the right edge at the moment the track snaps back.
      const viewportWidth = viewport.getBoundingClientRect().width
      const copies = Math.max(MIN_COPIES, Math.ceil(viewportWidth / width) + 1)
      setBelt((prev) => (prev.copies === copies && prev.width === width ? prev : { copies, width }))
    }

    measure()
    // jsdom has no ResizeObserver — the one-shot measure above still runs.
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    observer.observe(group)
    return () => observer.disconnect()
  }, [signature, visible])

  if (!visible) return null

  // Before the first measurement there is no honest distance to travel, so the
  // track stays parked rather than animating by a placeholder amount.
  const rolling = belt.width > 0

  return (
    <aside className="promo" aria-label="Promotions">
      <div className="promo__viewport" ref={viewportRef}>
        <div
          className={`promo__track${rolling ? ' promo__track--rolling' : ''}`}
          style={
            rolling
              ? {
                  '--promo-shift': `${(-belt.width).toFixed(2)}px`,
                  '--promo-duration': `${(belt.width / SPEED_PX_PER_SEC).toFixed(2)}s`,
                }
              : undefined
          }
        >
          {Array.from({ length: belt.copies }, (_, copy) => (
            <div
              key={copy}
              ref={copy === 0 ? groupRef : null}
              className="promo__group"
              // Clones exist only to fill the belt — one read of the set is enough.
              aria-hidden={copy > 0 ? 'true' : undefined}
            >
              {messages.map((message, i) => (
                <span key={`${i}:${message}`} className="promo__msg">
                  {message}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
