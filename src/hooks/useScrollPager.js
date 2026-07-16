import { useCallback, useEffect, useRef, useState } from 'react'

// Drives a native scroll-snap carousel: give it the scrolling element's ref and
// it tracks the current "page" (one viewport-width of cards) plus prev/next
// handlers that scroll by exactly one page. Pure CSS scroll — no transforms,
// no timers — so it stays smooth and keyboard/trackpad friendly, and degrades
// to a plain scroll row if JS is disabled.
export default function useScrollPager() {
  const ref = useRef(null)
  const [page, setPage] = useState(0)
  const [pageCount, setPageCount] = useState(1)

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    const per = el.clientWidth || 1
    // ceil, so a row that overflows by even a partial card still counts as a
    // second page (round would swallow a <½-viewport tail and hide the arrows).
    const pages = Math.max(1, Math.ceil((el.scrollWidth - 1) / per))
    const maxScroll = el.scrollWidth - el.clientWidth
    // Snap the last page active once scrolled to the end — the final page's
    // travel is clamped short, so scrollLeft never reaches (pages-1) × per.
    const atEnd = maxScroll > 0 && el.scrollLeft >= maxScroll - 2
    setPageCount(pages)
    setPage(atEnd ? pages - 1 : Math.round(el.scrollLeft / per))
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    measure()
    el.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      el.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [measure])

  const goTo = useCallback((i) => {
    const el = ref.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }, [])

  const prev = useCallback(() => goTo(Math.max(0, page - 1)), [goTo, page])
  const next = useCallback(() => goTo(Math.min(pageCount - 1, page + 1)), [goTo, page, pageCount])

  return {
    ref,
    page,
    pageCount,
    goTo,
    prev,
    next,
    canPrev: page > 0,
    canNext: page < pageCount - 1,
  }
}
