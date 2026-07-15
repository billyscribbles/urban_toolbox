import { useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
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

  function onFiles(e) {
    const files = [...e.target.files]
    if (!files.length) return
    // Positions aren't renumbered on delete, so append after the current max
    // rather than at `sorted.length` — otherwise a delete-then-upload reuses an
    // existing position and two rows collide.
    const nextPosition = sorted.length ? Math.max(...sorted.map((p) => p.position)) + 1 : 0
    run(() => uploadPhotos(productId, files, nextPosition, title)).then(() => {
      if (fileRef.current) fileRef.current.value = ''
    })
  }

  function onMove(i, dir) {
    const j = i + dir
    if (j < 0 || j >= sorted.length) return
    run(() => swapPhotoPositions(sorted[i], sorted[j]))
  }

  return (
    <div className="admin-photos">
      <label className="admin__label" htmlFor="pe-photos">
        Photos {busy && <span aria-live="polite">— working…</span>}
      </label>
      <input
        id="pe-photos"
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={busy}
        onChange={onFiles}
      />
      <p className="admin-photos__hint">
        The first photo is the storefront card thumbnail. Uploads are resized automatically.
      </p>
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
