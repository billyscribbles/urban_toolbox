import { useMemo, useState } from 'react'
import { Eye, EyeOff, Pencil, Plus, Star } from 'lucide-react'
import { getTree, getLeaves } from '../../lib/catalog.js'
import { publicPhotoUrl } from '../../lib/supabaseClient.js'
import { formatPrice } from '../../lib/pricing.js'
import { deleteProduct, setProductHidden } from '../../lib/adminApi.js'

// Full-width, filterable table of every product. Delete is two-step (Delete ->
// Confirm) instead of window.confirm so nothing blocks the tab.
export default function ProductList({ rows, loading, onEdit, onNew, onChanged }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [confirmId, setConfirmId] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [togglingId, setTogglingId] = useState(null)
  const [error, setError] = useState('')

  const leaves = useMemo(() => getTree().flatMap((t) => getLeaves(t)), [])
  const leafLabel = useMemo(() => new Map(leaves.map((l) => [l.id, l.label])), [leaves])

  const visible = rows.filter(
    (r) =>
      (!cat || r.category_id === cat) && (!q || r.title.toLowerCase().includes(q.toLowerCase())),
  )

  async function onDelete(row) {
    setBusyId(row.id)
    setError('')
    try {
      await deleteProduct(row)
      onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
      setConfirmId(null)
    }
  }

  async function onToggleHidden(row) {
    setTogglingId(row.id)
    setError('')
    try {
      await setProductHidden(row.id, !row.hidden)
      onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setTogglingId(null)
    }
  }

  function thumb(row) {
    const first = [...(row.product_images ?? [])].sort((a, b) => a.position - b.position)[0]
    return first ? publicPhotoUrl(first.storage_path) : null
  }

  const total = rows.length
  const hiddenCount = rows.filter((r) => r.hidden).length
  const visibleCount = total - hiddenCount

  return (
    <div>
      <div className="admin-stats">
        <div className="admin-stat">
          <span className="admin-stat__num" data-testid="stat-total">
            {total}
          </span>
          <span className="admin-stat__label">Total</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat__num" data-testid="stat-visible">
            {visibleCount}
          </span>
          <span className="admin-stat__label">Visible</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat__num" data-testid="stat-hidden">
            {hiddenCount}
          </span>
          <span className="admin-stat__label">Hidden</span>
        </div>
      </div>

      <div className="admin-toolbar">
        <label className="sr-only" htmlFor="admin-search">
          Search products
        </label>
        <input
          id="admin-search"
          className="admin__input"
          type="search"
          placeholder="Search products…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label className="sr-only" htmlFor="admin-cat">
          Filter by category
        </label>
        <select
          id="admin-cat"
          className="admin__select"
          value={cat}
          onChange={(e) => setCat(e.target.value)}
        >
          <option value="">All categories</option>
          {leaves.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
        <span className="admin-toolbar__spacer" />
        <button type="button" className="admin__primary" style={{ marginTop: 0 }} onClick={onNew}>
          <Plus size={15} strokeWidth={2.5} aria-hidden="true" /> New product
        </button>
      </div>

      {error && (
        <p className="admin__error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <div className="admin-card">
          <ul className="admin-skel" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="admin-skel__row" />
            ))}
          </ul>
        </div>
      ) : rows.length === 0 ? (
        <div className="admin-empty">
          <p className="admin-empty__title">No products yet</p>
          <p className="admin-empty__sub">Add your first catalogue product to get started.</p>
          <button type="button" className="admin__primary" style={{ marginTop: 0 }} onClick={onNew}>
            <Plus size={15} strokeWidth={2.5} aria-hidden="true" /> Add your first product
          </button>
        </div>
      ) : visible.length === 0 ? (
        <p className="admin__empty">No products match your search.</p>
      ) : (
        <div className="admin-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">Photo</span>
                </th>
                <th scope="col">Product</th>
                <th scope="col" className="admin-table__hide-sm">
                  Category
                </th>
                <th scope="col">Price</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id} className={row.hidden ? 'admin-table__row--hidden' : undefined}>
                  <td>
                    {thumb(row) ? (
                      <img className="admin-table__thumb" src={thumb(row)} alt="" />
                    ) : (
                      <span className="admin-table__thumb" aria-hidden="true" />
                    )}
                  </td>
                  <td className="admin-table__title">{row.title}</td>
                  <td className="admin-table__hide-sm">
                    {leafLabel.get(row.category_id) ?? row.category_id}
                  </td>
                  <td>{row.price == null ? '—' : formatPrice(Number(row.price))}</td>
                  <td>
                    <div className="admin-badges">
                      {row.featured && (
                        <span className="admin-badge admin-badge--featured">
                          <Star size={12} strokeWidth={2} fill="currentColor" aria-hidden="true" />{' '}
                          Featured
                        </span>
                      )}
                      {row.discount_pct ? (
                        <span className="admin-badge admin-badge--off">
                          {Number(row.discount_pct)}% off
                        </span>
                      ) : null}
                      {row.hidden && (
                        <span className="admin-badge admin-badge--hidden">Hidden</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="admin-photos__buttons">
                      <button
                        type="button"
                        className="admin__ghost"
                        disabled={togglingId === row.id}
                        aria-pressed={!row.hidden}
                        aria-label={row.hidden ? `Show ${row.title}` : `Hide ${row.title}`}
                        onClick={() => onToggleHidden(row)}
                      >
                        {row.hidden ? (
                          <EyeOff size={14} strokeWidth={2} aria-hidden="true" />
                        ) : (
                          <Eye size={14} strokeWidth={2} aria-hidden="true" />
                        )}
                      </button>
                      <button type="button" className="admin__ghost" onClick={() => onEdit(row)}>
                        <Pencil size={13} strokeWidth={2} aria-hidden="true" /> Edit
                      </button>
                      {confirmId === row.id ? (
                        <>
                          <button
                            type="button"
                            className="admin__danger"
                            disabled={busyId === row.id}
                            onClick={() => onDelete(row)}
                          >
                            {busyId === row.id ? 'Deleting…' : 'Confirm delete'}
                          </button>
                          <button
                            type="button"
                            className="admin__ghost"
                            onClick={() => setConfirmId(null)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="admin__danger"
                          onClick={() => setConfirmId(row.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
