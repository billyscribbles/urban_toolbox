import { useMemo, useState } from 'react'
import { Pencil, Plus, Star } from 'lucide-react'
import { getTree, getLeaves } from '../../lib/catalog.js'
import { publicPhotoUrl } from '../../lib/supabaseClient.js'
import { formatPrice } from '../../lib/pricing.js'
import { deleteProduct } from '../../lib/adminApi.js'

// Flat, filterable table of every product. Delete is two-step (Delete ->
// Confirm) instead of window.confirm so nothing blocks the tab.
export default function ProductList({ rows, onEdit, onNew, onChanged }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [confirmId, setConfirmId] = useState(null)
  const [busyId, setBusyId] = useState(null)
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

  function thumb(row) {
    const first = [...(row.product_images ?? [])].sort((a, b) => a.position - b.position)[0]
    return first ? publicPhotoUrl(first.storage_path) : null
  }

  return (
    <div>
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

      {visible.length === 0 ? (
        <p className="admin__empty">No products match.</p>
      ) : (
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
              <th scope="col">Discount</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id}>
                <td>
                  {thumb(row) ? (
                    <img className="admin-table__thumb" src={thumb(row)} alt="" />
                  ) : (
                    <span className="admin-table__thumb" aria-hidden="true" />
                  )}
                </td>
                <td>
                  {row.title}{' '}
                  {row.featured && (
                    <Star size={13} strokeWidth={2} aria-label="Featured" fill="currentColor" />
                  )}
                </td>
                <td className="admin-table__hide-sm">
                  {leafLabel.get(row.category_id) ?? row.category_id}
                </td>
                <td>{row.price == null ? '—' : formatPrice(Number(row.price))}</td>
                <td>{row.discount_pct ? `${Number(row.discount_pct)}%` : '—'}</td>
                <td>
                  <div className="admin-photos__buttons">
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
      )}
    </div>
  )
}
