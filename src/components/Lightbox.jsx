import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import './Lightbox.css'

// Site-wide image lightbox. Mounted once in App. Uses event delegation:
// any `<img class="zoomable">` that isn't inside a link opens an enlarged
// overlay when clicked — so section components stay dumb and just opt in by
// adding the `zoomable` class to a photo.
export default function Lightbox() {
  const [active, setActive] = useState(null) // { src, alt } | null
  const triggerRef = useRef(null)
  const closeRef = useRef(null)

  // Delegate clicks on zoomable images.
  useEffect(() => {
    function onClick(e) {
      const img = e.target.closest('img.zoomable')
      if (!img || img.closest('a')) return
      e.preventDefault()
      triggerRef.current = img
      setActive({ src: img.currentSrc || img.src, alt: img.alt || '' })
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  // While open: lock body scroll, close on Esc, focus the close button, and
  // return focus to the image that opened it.
  useEffect(() => {
    if (!active) return
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    function onKey(e) {
      if (e.key === 'Escape') setActive(null)
    }
    document.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      triggerRef.current?.focus?.()
    }
  }, [active])

  if (!active) return null

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={active.alt || 'Enlarged image'}
    >
      <button
        type="button"
        className="lightbox__backdrop"
        aria-label="Close image"
        onClick={() => setActive(null)}
      />
      <button
        ref={closeRef}
        type="button"
        className="lightbox__close"
        aria-label="Close image"
        onClick={() => setActive(null)}
      >
        <X size={24} strokeWidth={2} aria-hidden="true" />
      </button>
      <figure className="lightbox__figure">
        <img className="lightbox__img" src={active.src} alt={active.alt} />
        {active.alt && <figcaption className="lightbox__caption">{active.alt}</figcaption>}
      </figure>
    </div>
  )
}
