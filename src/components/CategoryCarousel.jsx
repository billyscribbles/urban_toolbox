import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { homeCarousel, rangeSection } from '../content/homeCarousel.js'
import { getCategoryTileImage } from '../lib/catalog.js'
import { useProductCatalog } from '../lib/productStore.js'
import Eyebrow from './Eyebrow.jsx'
import Img from './Img.jsx'
import './CategoryCarousel.css'

// Cards render at up to ~230px, so the 400px catalog derivative covers 1x/2x.
const TILE_SIZES = '230px'

// One visible track plus enough aria-hidden duplicates that the belt is always
// wider than the viewport, so the loop never exposes its own tail as a gap. The
// CSS keyframe translates the belt by exactly one track width (-100% /
// TRACK_COUNT) — keep the two in step or the loop stutters.
const TRACK_COUNT = 4

// Touch drifts at the same pace as the desktop marquee — one track width per
// TRACK_SECONDS — so both read as the same quiet rotation. Keep it in step with
// the range-marquee duration in the CSS, and MOBILE_QUERY in step with that
// file's media query (the CSS is what makes the strip scrollable at all).
const TRACK_SECONDS = 48
const MOBILE_QUERY = '(max-width: 700px)'

// A swipe hands the strip to the reader; it drifts on again this long after
// the last touch, from wherever they left it.
const RESUME_MS = 2000

// Rotates a scroll container by advancing scrollLeft, for the touch layout
// only. Returns the ref to hand the container.
//
// The belt is TRACK_COUNT identical tracks, so any two positions one track
// width apart look the same. Every frame the position is folded back into
// [track, 2 × track): the drift can run forever without reaching the end, and
// a backward swipe has a full track of runway behind it. That fold is the same
// seam trick the CSS keyframe uses, expressed in scroll position.
function useDrift() {
  const ref = useRef(null)

  useEffect(() => {
    const viewport = ref.current
    // matchMedia is absent in jsdom without a stub; no media, no drift.
    if (!viewport || typeof window.matchMedia !== 'function') return undefined

    const touch = window.matchMedia(MOBILE_QUERY)
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)')

    let frame = 0
    // null, not 0 — a frame can legitimately arrive at timestamp 0, and a
    // truthiness check would re-baseline on it and never advance.
    let previous = null
    let restUntil = 0
    let position = 0
    // False means "the reader moved it" — re-read scrollLeft before advancing
    // again rather than resuming from a stale position.
    let driving = false

    const handOver = () => {
      restUntil = performance.now() + RESUME_MS
      driving = false
    }

    const step = (now) => {
      frame = requestAnimationFrame(step)

      const track = viewport.scrollWidth / TRACK_COUNT
      // Zero until the catalogue's tiles have laid out. Nothing to fold yet.
      if (!track) return

      const at = viewport.scrollLeft
      const folded = at >= 2 * track ? at - track : at < track ? at + track : at
      if (folded !== at) {
        viewport.scrollLeft = folded
        driving = false
      }

      // Clamped so a backgrounded tab doesn't resume with one huge jump.
      const elapsed = previous === null ? 0 : Math.min(now - previous, 100)
      previous = now

      if (now < restUntil) {
        driving = false
        return
      }
      if (!driving) {
        position = viewport.scrollLeft
        driving = true
      }
      position += (track / (TRACK_SECONDS * 1000)) * elapsed
      viewport.scrollLeft = position
    }

    const stop = () => {
      if (!frame) return
      cancelAnimationFrame(frame)
      frame = 0
    }

    const start = () => {
      if (frame) return
      previous = null
      driving = false
      frame = requestAnimationFrame(step)
    }

    // Reduce motion leaves the strip exactly where it is — still swipeable,
    // just never moving on its own.
    const sync = () => (touch.matches && !calm.matches ? start() : stop())

    // Passive: these only note that the reader took over, they never
    // preventDefault. touchend is in the list so the rest is measured from the
    // finger lifting, and so the browser's momentum fling can coast out before
    // the drift takes the wheel again.
    const takes = ['pointerdown', 'touchstart', 'touchmove', 'touchend', 'wheel']
    takes.forEach((type) => viewport.addEventListener(type, handOver, { passive: true }))
    touch.addEventListener('change', sync)
    calm.addEventListener('change', sync)
    sync()

    return () => {
      stop()
      takes.forEach((type) => viewport.removeEventListener(type, handOver))
      touch.removeEventListener('change', sync)
      calm.removeEventListener('change', sync)
    }
  }, [])

  return ref
}

// Home range carousel: the "Built for every adventure" strip. A seamless,
// continuously rotating marquee of product-category cards.
//
// Two mechanisms, one look. On desktop it's a pure-CSS transform loop — no JS
// timer — that keeps moving regardless of the OS "reduce motion" setting, and
// hover or keyboard focus pauses it. Under MOBILE_QUERY the CSS swaps that for
// a native scroll container so the strip can be swiped, and useDrift below
// rotates it by moving scrollLeft instead (a transformed belt can't be
// scrolled, which is why touch needs the other mechanism).
//
// Duplicate tracks are purely visual — aria-hidden with untabbable links — so
// the keyboard and screen readers meet each category exactly once.
export default function CategoryCarousel() {
  // Subscribe so the strip repaints when the catalogue — and with it the
  // admin's tile photos — lands. main.jsx kicks the load off at boot, so
  // there's no load call to make here.
  useProductCatalog()
  const viewportRef = useDrift()

  const track = (hidden, key) => (
    <ul className="range__track" aria-hidden={hidden || undefined} key={key}>
      {homeCarousel.map((tile) => {
        const img = getCategoryTileImage(tile.categoryId)
        return (
          <li className="range__tile" key={tile.to}>
            <Link to={tile.to} className="range__card" tabIndex={hidden ? -1 : undefined}>
              {/* Kept even when there's no photo: .range__media is a flex item
                  with aspect-ratio 1/1, so the empty box holds the card's
                  shape and the belt stays exactly one-quarter of its width —
                  which is what the CSS keyframe's -100%/TRACK_COUNT assumes. */}
              <span className="range__media">
                {img && (
                  <Img
                    className="range__img"
                    src={img}
                    alt=""
                    sizes={TILE_SIZES}
                    width={400}
                    height={300}
                  />
                )}
              </span>
              <span className="range__label">{tile.label}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )

  return (
    <section className="range">
      <div className="container">
        <div className="range__head">
          <Eyebrow>{rangeSection.eyebrow}</Eyebrow>
          <h2 className="h2 h2--md range__heading">{rangeSection.heading}</h2>
        </div>
      </div>
      <div className="range__viewport" ref={viewportRef}>
        <div className="range__belt">
          {track(false, 'visible')}
          {Array.from({ length: TRACK_COUNT - 1 }, (_, i) => track(true, `dup-${i}`))}
        </div>
      </div>
    </section>
  )
}
