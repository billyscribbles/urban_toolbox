import { useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from 'lucide-react'
import { publicPhotoUrl } from '../../lib/supabaseClient.js'
import {
  uploadPhotos,
  deletePhoto,
  swapPhotoPositions,
  fetchProductImages,
} from '../../lib/adminApi.js'

// Gallery editor: multi-upload (resized client-side), reorder with up/down,
// delete. Position 0 is the storefront card thumbnail.
export default function PhotoManager({ productId, title, images, onImagesChange }) {
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const sorted = [...images].sort((a, b) => a.position - b.position)

  async function run(action) {
    setBusy(true)
    setError('')
    try {
      await action()
      onImagesChange(await fetchProductImages(productId))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const ACCEPT = ['image/jpeg', 'image/png', 'image/webp']

  function handleFiles(files) {
    const images = files.filter((f) => ACCEPT.includes(f.type))
    if (!images.length) return
    // Positions aren't renumbered on delete, so append after the current max
    // rather than at `sorted.length` — otherwise a delete-then-upload reuses an
    // existing position and two rows collide.
    const nextPosition = sorted.length ? Math.max(...sorted.map((p) => p.position)) + 1 : 0
    run(() => uploadPhotos(productId, images, nextPosition, title)).then(() => {
      if (fileRef.current) fileRef.current.value = ''
    })
  }

  function onInputChange(e) {
    handleFiles([...e.target.files])
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    if (busy) return
    handleFiles([...e.dataTransfer.files])
  }

  function onDragOver(e) {
    e.preventDefault()
    if (!busy) setDragging(true)
  }

  function onDragLeave(e) {
    // Ignore drags moving between child nodes of the dropzone.
    if (e.currentTarget.contains(e.relatedTarget)) return
    setDragging(false)
  }

  function onMove(i, dir) {
    const j = i + dir
    if (j < 0 || j >= sorted.length) return
    run(() => swapPhotoPositions(sorted[i], sorted[j]))
  }

  return (
    <div className="admin-photos">
      <span className="admin__label" id="pe-photos-label">
        Photos {busy && <span aria-live="polite">— working…</span>}
      </span>
      <label
        className={`admin-drop${dragging ? ' admin-drop--active' : ''}`}
        htmlFor="pe-photos"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <ImagePlus className="admin-drop__icon" size={26} strokeWidth={1.6} aria-hidden="true" />
        <span className="admin-drop__title">
          Drag photos here, or <span className="admin-drop__link">browse</span>
        </span>
        <span className="admin-drop__sub">
          JPEG, PNG or WebP · the first photo becomes the card thumbnail · resized automatically
        </span>
      </label>
      <input
        id="pe-photos"
        ref={fileRef}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-labelledby="pe-photos-label"
        multiple
        disabled={busy}
        onChange={onInputChange}
      />
      {error && (
        <p className="admin__error" role="alert">
          {error}
        </p>
      )}
      {sorted.length > 0 && (
        <ul className="admin-photos__list">
          {sorted.map((img, i) => (
            <li key={img.id} className="admin-photos__item">
              <img className="admin-photos__img" src={publicPhotoUrl(img.storage_path)} alt="" />
              {i === 0 && <span className="admin-photos__badge">Card thumbnail</span>}
              <div className="admin-photos__buttons">
                <button
                  type="button"
                  className="admin__ghost"
                  aria-label={`Move photo ${i + 1} up`}
                  disabled={busy || i === 0}
                  onClick={() => onMove(i, -1)}
                >
                  <ArrowUp size={14} strokeWidth={2} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="admin__ghost"
                  aria-label={`Move photo ${i + 1} down`}
                  disabled={busy || i === sorted.length - 1}
                  onClick={() => onMove(i, 1)}
                >
                  <ArrowDown size={14} strokeWidth={2} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="admin__danger"
                  aria-label={`Delete photo ${i + 1}`}
                  disabled={busy}
                  onClick={() => run(() => deletePhoto(img))}
                >
                  <Trash2 size={14} strokeWidth={2} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
