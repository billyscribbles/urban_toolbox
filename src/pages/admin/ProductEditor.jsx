import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { getTree, getLeaves } from '../../lib/catalog.js'
import { slugify, validateProduct } from '../../lib/productForm.js'
import { saveProduct } from '../../lib/adminApi.js'
import PhotoManager from './PhotoManager.jsx'

function toForm(row) {
  if (!row) {
    return {
      title: '',
      categoryId: '',
      summary: '',
      specs: [],
      features: [],
      price: '',
      discountPct: '',
      standardDims: '',
      featured: false,
    }
  }
  return {
    title: row.title,
    categoryId: row.category_id,
    summary: row.summary ?? '',
    specs: row.specs ?? [],
    features: row.features ?? [],
    price: row.price ?? '',
    discountPct: row.discount_pct ?? '',
    standardDims: row.standard_dims ?? '',
    featured: !!row.featured,
  }
}

// Create + edit form. New products get id/slug from the title; photos attach
// after the first save (the rows need a product id to point at).
export default function ProductEditor({ row, rows, onDone, onCancel }) {
  const isNew = !row
  const [form, setForm] = useState(() => toForm(row))
  const [featuresText, setFeaturesText] = useState((row?.features ?? []).join('\n'))
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState('')
  const [busy, setBusy] = useState(false)
  const [images, setImages] = useState(row?.product_images ?? [])

  const leaves = useMemo(() => getTree().flatMap((t) => getLeaves(t)), [])

  const set = (key) => (e) =>
    setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  function setSpec(i, key, value) {
    const specs = form.specs.map((s, idx) => (idx === i ? { ...s, [key]: value } : s))
    setForm({ ...form, specs })
  }
  function addSpec() {
    setForm({ ...form, specs: [...form.specs, { label: '', value: '' }] })
  }
  function removeSpec(i) {
    setForm({ ...form, specs: form.specs.filter((_, idx) => idx !== i) })
  }

  async function onSubmit(e) {
    e.preventDefault()
    const features = featuresText
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean)
    const check = validateProduct(
      form,
      leaves.map((l) => l.id),
    )
    setErrors(check.errors)
    if (!check.valid) return

    setBusy(true)
    setSaveError('')
    const slug = isNew ? slugify(form.title) : row.slug
    const { error } = await saveProduct(
      {
        id: isNew ? slug : row.id,
        slug,
        title: form.title,
        categoryId: form.categoryId,
        summary: form.summary,
        specs: form.specs.filter((s) => s.label.trim() || s.value.trim()),
        features,
        price: check.price,
        discountPct: check.discountPct,
        standardDims: form.standardDims,
        featured: form.featured,
        sortOrder: isNew
          ? rows.filter((r) => r.category_id === form.categoryId).length
          : row.sort_order,
      },
      { isNew },
    )
    setBusy(false)
    if (error) {
      setSaveError(error.message)
      return
    }
    onDone()
  }

  return (
    <form className="admin-editor" onSubmit={onSubmit} noValidate>
      <h2 className="admin__title">{isNew ? 'New product' : `Edit — ${row.title}`}</h2>

      <label className="admin__label" htmlFor="pe-title">
        Title
      </label>
      <input id="pe-title" className="admin__input" value={form.title} onChange={set('title')} />
      {errors.title && (
        <p className="admin__error" role="alert">
          {errors.title}
        </p>
      )}

      <label className="admin__label" htmlFor="pe-category">
        Category
      </label>
      <select
        id="pe-category"
        className="admin__select"
        value={form.categoryId}
        onChange={set('categoryId')}
      >
        <option value="">Choose a category…</option>
        {leaves.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label}
          </option>
        ))}
      </select>
      {errors.categoryId && (
        <p className="admin__error" role="alert">
          {errors.categoryId}
        </p>
      )}

      <label className="admin__label" htmlFor="pe-summary">
        Summary (card subtitle)
      </label>
      <input
        id="pe-summary"
        className="admin__input"
        value={form.summary}
        onChange={set('summary')}
      />

      <div className="admin-editor__row">
        <div>
          <label className="admin__label" htmlFor="pe-price">
            Price (AUD, ex GST — blank for “Enquire for pricing”)
          </label>
          <input
            id="pe-price"
            className="admin__input"
            inputMode="decimal"
            value={form.price}
            onChange={set('price')}
          />
          {errors.price && (
            <p className="admin__error" role="alert">
              {errors.price}
            </p>
          )}
        </div>
        <div>
          <label className="admin__label" htmlFor="pe-discount">
            Discount % (blank for none)
          </label>
          <input
            id="pe-discount"
            className="admin__input"
            inputMode="numeric"
            value={form.discountPct}
            onChange={set('discountPct')}
          />
          {errors.discountPct && (
            <p className="admin__error" role="alert">
              {errors.discountPct}
            </p>
          )}
        </div>
      </div>

      <label className="admin__label" htmlFor="pe-dims">
        Standard dimensions (shown in the quote tray)
      </label>
      <input
        id="pe-dims"
        className="admin__input"
        value={form.standardDims}
        onChange={set('standardDims')}
      />

      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend className="admin__label">Specs</legend>
        {form.specs.map((s, i) => (
          <div key={i} className="admin-editor__spec">
            <label className="sr-only" htmlFor={`pe-spec-label-${i}`}>
              Spec {i + 1} label
            </label>
            <input
              id={`pe-spec-label-${i}`}
              className="admin__input"
              placeholder="Label"
              value={s.label}
              onChange={(e) => setSpec(i, 'label', e.target.value)}
            />
            <label className="sr-only" htmlFor={`pe-spec-value-${i}`}>
              Spec {i + 1} value
            </label>
            <input
              id={`pe-spec-value-${i}`}
              className="admin__input"
              placeholder="Value"
              value={s.value}
              onChange={(e) => setSpec(i, 'value', e.target.value)}
            />
            <button
              type="button"
              className="admin__ghost"
              aria-label={`Remove spec ${i + 1}`}
              onClick={() => removeSpec(i)}
            >
              <Trash2 size={14} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        ))}
        <button type="button" className="admin__ghost" onClick={addSpec}>
          <Plus size={14} strokeWidth={2.5} aria-hidden="true" /> Add spec
        </button>
      </fieldset>

      <label className="admin__label" htmlFor="pe-features">
        Features (one per line)
      </label>
      <textarea
        id="pe-features"
        className="admin__textarea"
        rows={6}
        value={featuresText}
        onChange={(e) => setFeaturesText(e.target.value)}
      />

      <label className="admin-editor__check">
        <input type="checkbox" checked={form.featured} onChange={set('featured')} />
        Featured product
      </label>

      {isNew ? (
        <p className="admin-photos__hint">Save the product first, then reopen it to add photos.</p>
      ) : (
        <PhotoManager
          productId={row.id}
          title={form.title}
          images={images}
          onImagesChange={setImages}
        />
      )}

      {saveError && (
        <p className="admin__error" role="alert">
          {saveError}
        </p>
      )}

      <div className="admin-editor__actions">
        <button type="submit" className="admin__primary" disabled={busy} style={{ marginTop: 0 }}>
          {busy ? 'Saving…' : 'Save product'}
        </button>
        <button type="button" className="admin__ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
