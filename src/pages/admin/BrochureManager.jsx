import { useRef, useState } from 'react'
import { FileText, FileUp, Trash2 } from 'lucide-react'
import { uploadBrochure, deleteBrochure } from '../../lib/adminApi.js'

const MAX_BYTES = 20 * 1024 * 1024

// One optional PDF per product. Mirrors PhotoManager's busy/error shape, minus
// everything that only a gallery needs — no ordering, no positions, no list.
// The bucket sets no size limit, so an oversized file would otherwise upload
// slowly and fail against the project-wide cap with an opaque error; the guard
// below fails it immediately with something readable instead.
export default function BrochureManager({ productId, brochurePath, onBrochureChange }) {
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run(action) {
    setBusy(true)
    setError('')
    try {
      onBrochureChange(await action())
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function onInputChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      setError('That file isn’t a PDF. Choose a PDF brochure.')
      e.target.value = ''
      return
    }
    if (file.size > MAX_BYTES) {
      setError('That PDF is over 20MB. Compress it and try again.')
      e.target.value = ''
      return
    }
    run(() => uploadBrochure(productId, file))
  }

  const filename = brochurePath ? brochurePath.split('/').pop() : null

  return (
    <div className="admin-brochure">
      <span className="admin__label" id="pe-brochure-label">
        Brochure {busy && <span aria-live="polite">— working…</span>}
      </span>
      <label className="admin-drop" htmlFor="pe-brochure">
        <FileUp className="admin-drop__icon" size={26} strokeWidth={1.6} aria-hidden="true" />
        <span className="admin-drop__title">
          {brochurePath ? 'Replace the brochure' : 'Choose a PDF brochure'}
        </span>
        <span className="admin-drop__sub">
          PDF only · up to 20MB · customers download this from the product page
        </span>
      </label>
      <input
        id="pe-brochure"
        ref={fileRef}
        className="sr-only"
        type="file"
        accept="application/pdf"
        aria-labelledby="pe-brochure-label"
        disabled={busy}
        onChange={onInputChange}
      />
      {error && (
        <p className="admin__error" role="alert">
          {error}
        </p>
      )}
      {brochurePath && (
        <div className="admin-brochure__file">
          <FileText size={16} strokeWidth={1.8} aria-hidden="true" />
          <span className="admin-brochure__name">{filename}</span>
          <button
            type="button"
            className="admin__danger"
            aria-label="Delete brochure"
            disabled={busy}
            onClick={() =>
              run(() => deleteBrochure({ id: productId, brochure_path: brochurePath }))
            }
          >
            <Trash2 size={14} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}
