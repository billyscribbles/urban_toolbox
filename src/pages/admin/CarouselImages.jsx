import { useEffect, useMemo, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { homeCarousel } from '../../content/homeCarousel.js'
import { firstProductImageIn } from '../../lib/catalog.js'
import { publicPhotoUrl } from '../../lib/supabaseClient.js'
import {
  fetchCategoryImages,
  uploadCategoryImage,
  deleteCategoryImage,
} from '../../lib/adminApi.js'

// Home-carousel tile photos. Each tile takes a standalone upload — no product
// involved. Without one, the tile falls back to its category's first product
// photo, so "Remove" is never destructive: something always renders.
//
// The tile list itself (which categories, their order, their labels) stays in
// src/content/homeCarousel.js — this card only edits photos.
export default function CarouselImages({ rows }) {
  const [images, setImages] = useState({}) // categoryId -> storage_path
  const [loaded, setLoaded] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  async function refresh() {
    const list = await fetchCategoryImages()
    setImages(Object.fromEntries(list.map((r) => [r.category_id, r.storage_path])))
    setLoaded(true)
  }

  useEffect(() => {
    // Mount load. Errors surface in the card rather than throwing — a broken
    // read here must not take the product table down with it.
    refresh().catch((err) => setError(err.message))
  }, [])

  // The admin holds raw DB rows; the fallback rule lives in catalog.js and
  // wants the storefront's shape. Map once, matching the storefront exactly:
  // hidden products are excluded (the carousel never shows them) and the order
  // is sort_order then id (what productStore loads), so "first product" means
  // the same thing on both sides.
  const catalogue = useMemo(
    () =>
      (rows ?? [])
        .filter((r) => !r.hidden)
        .slice()
        .sort(
          (a, b) =>
            (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.id).localeCompare(String(b.id)),
        )
        .map((r) => {
          const first = [...(r.product_images ?? [])].sort((a, b) => a.position - b.position)[0]
          return {
            categoryId: r.category_id,
            img: first ? publicPhotoUrl(first.storage_path) : null,
          }
        }),
    [rows],
  )

  async function run(categoryId, action) {
    setBusyId(categoryId)
    setError('')
    try {
      await action()
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  function onPick(categoryId, e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) run(categoryId, () => uploadCategoryImage(categoryId, file))
  }

  return (
    <div className="admin-card">
      <div className="admin-toolbar">
        <div>
          <span className="admin__label">Home carousel photos</span>
          <span className="admin__label-hint">
            One photo per tile in the “Built for every adventure” strip. No upload → the tile uses
            its category’s first product photo.
          </span>
        </div>
      </div>

      {error && (
        <p className="admin__error" role="alert">
          {error}
        </p>
      )}

      <ul className="admin-tiles">
        {homeCarousel.map((tile) => {
          const uploaded = images[tile.categoryId]
          const fallback = firstProductImageIn(tile.categoryId, catalogue)
          const src = uploaded ? publicPhotoUrl(uploaded) : fallback
          const busy = busyId === tile.categoryId
          const inputId = `tile-upload-${tile.categoryId}`
          return (
            <li
              className="admin-tile"
              key={tile.categoryId}
              data-testid={`tile-${tile.categoryId}`}
            >
              <span className="admin-tile__media">
                {src && <img className="admin-tile__img" src={src} alt="" />}
              </span>
              <span className="admin-tile__label">{tile.label}</span>
              <span className="admin-badge">
                {uploaded ? 'Custom' : src ? 'From first product' : 'No image'}
              </span>

              <div className="admin-tile__actions">
                <label className="admin__ghost admin-tile__upload" htmlFor={inputId}>
                  <ImagePlus size={14} strokeWidth={2} aria-hidden="true" />
                  {uploaded ? 'Replace' : 'Upload'}
                </label>
                <input
                  id={inputId}
                  className="sr-only"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label={`Upload photo for ${tile.label}`}
                  disabled={!loaded || busy}
                  onChange={(e) => onPick(tile.categoryId, e)}
                />
                {uploaded && (
                  <button
                    type="button"
                    className="admin__icon admin__icon--danger"
                    aria-label={`Remove photo for ${tile.label}`}
                    disabled={busy}
                    onClick={() =>
                      run(tile.categoryId, () =>
                        deleteCategoryImage({
                          category_id: tile.categoryId,
                          storage_path: uploaded,
                        }),
                      )
                    }
                  >
                    <Trash2 size={14} strokeWidth={2} aria-hidden="true" />
                  </button>
                )}
              </div>
              {busy && (
                <span className="admin-tile__status" role="status">
                  Working…
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
