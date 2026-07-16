import { useEffect, useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
} from 'lucide-react'
import { getTree, getLeaves } from '../../lib/catalog.js'
import { publicPhotoUrl } from '../../lib/supabaseClient.js'
import { formatPrice } from '../../lib/pricing.js'
import { deleteProduct, setProductHidden } from '../../lib/adminApi.js'
import StatCards from './StatCards.jsx'

// Compact page-number window: always the first and last page, the current page
// with a neighbour either side, and '…' gaps where pages are skipped.
function pageItems(current, count) {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1)
  const pages = new Set([1, count, current, current - 1, current + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b)
  const out = []
  let prev = 0
  for (const p of sorted) {
    if (p - prev > 1) out.push('…')
    out.push(p)
    prev = p
  }
  return out
}

// Full-width, filterable table of every product. Delete is two-step (Delete ->
// Confirm) instead of window.confirm so nothing blocks the tab.
export default function ProductList({ rows, loading, onEdit, onNew, onChanged }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [vis, setVis] = useState('all') // 'all' | 'visible' | 'hidden'
  const [confirmId, setConfirmId] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [togglingId, setTogglingId] = useState(null)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const leaves = useMemo(() => getTree().flatMap((t) => getLeaves(t)), [])
  const leafLabel = useMemo(() => new Map(leaves.map((l) => [l.id, l.label])), [leaves])

  const visible = rows.filter(
    (r) =>
      (!cat || r.category_id === cat) &&
      (!q || r.title.toLowerCase().includes(q.toLowerCase())) &&
      (vis === 'all' || (vis === 'visible' ? !r.hidden : r.hidden)),
  )

  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize))
  const clampedPage = Math.min(page, pageCount)
  const start = (clampedPage - 1) * pageSize
  const paged = visible.slice(start, start + pageSize)

  // Any change to the filters or page size sends the user back to page 1 so they
  // never land on an out-of-range page.
  useEffect(() => {
    setPage(1)
  }, [q, cat, vis, pageSize])

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
    <div className="admin-dash">
      <StatCards
        total={total}
        visibleCount={visibleCount}
        hiddenCount={hiddenCount}
        filter={vis}
        onFilter={setVis}
      />

      <div className="admin-card">
        <div className="admin-toolbar">
          <div className="admin-toolbar__search">
            <Search size={16} strokeWidth={2} aria-hidden="true" />
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
          </div>
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

        <div className="admin-card__scroll">
          {loading ? (
            <ul className="admin-skel" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="admin-skel__row" />
              ))}
            </ul>
          ) : rows.length === 0 ? (
            <div className="admin-empty">
              <p className="admin-empty__title">No products yet</p>
              <p className="admin-empty__sub">Add your first catalogue product to get started.</p>
              <button
                type="button"
                className="admin__primary"
                style={{ marginTop: 0 }}
                onClick={onNew}
              >
                <Plus size={15} strokeWidth={2.5} aria-hidden="true" /> Add your first product
              </button>
            </div>
          ) : visible.length === 0 ? (
            <p className="admin__empty">No products match your search.</p>
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
                  <th scope="col">Status</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paged.map((row) => (
                  // Clicking a row opens its editor; clicks that land on a control
                  // (toggle/edit/delete) are ignored so those keep their own action.
                  // The row-level Edit button stays the keyboard/AT-accessible path.
                  <tr
                    key={row.id}
                    className={`admin-table__row${row.hidden ? ' admin-table__row--hidden' : ''}`}
                    onClick={(e) => {
                      if (!e.target.closest('button, a')) onEdit(row)
                    }}
                  >
                    <td>
                      {thumb(row) ? (
                        <img className="admin-table__thumb" src={thumb(row)} alt="" />
                      ) : (
                        <span className="admin-table__thumb" aria-hidden="true" />
                      )}
                    </td>
                    <td className="admin-table__product">
                      <span className="admin-table__title">{row.title}</span>
                      <span className="admin-table__sku">SKU: {row.id}</span>
                    </td>
                    <td className="admin-table__hide-sm">
                      {leafLabel.get(row.category_id) ?? row.category_id}
                    </td>
                    <td>{row.price == null ? '—' : formatPrice(Number(row.price))}</td>
                    <td>
                      <div className="admin-badges">
                        {row.hidden ? (
                          <span className="admin-badge admin-badge--hidden">Hidden</span>
                        ) : (
                          <span className="admin-badge admin-badge--live">
                            <span className="admin-badge__dot" aria-hidden="true" /> Live
                          </span>
                        )}
                        {row.featured && (
                          <span className="admin-badge admin-badge--featured">
                            <Star
                              size={12}
                              strokeWidth={2}
                              fill="currentColor"
                              aria-hidden="true"
                            />{' '}
                            Featured
                          </span>
                        )}
                        {row.discount_pct ? (
                          <span className="admin-badge admin-badge--off">
                            {Number(row.discount_pct)}% off
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <div className="admin-table__actions">
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
                          <>
                            <button
                              type="button"
                              className="admin__icon"
                              disabled={togglingId === row.id}
                              aria-pressed={!row.hidden}
                              aria-label={row.hidden ? `Show ${row.title}` : `Hide ${row.title}`}
                              onClick={() => onToggleHidden(row)}
                            >
                              {row.hidden ? (
                                <EyeOff size={15} strokeWidth={2} aria-hidden="true" />
                              ) : (
                                <Eye size={15} strokeWidth={2} aria-hidden="true" />
                              )}
                            </button>
                            <button
                              type="button"
                              className="admin__icon"
                              aria-label={`Edit ${row.title}`}
                              onClick={() => onEdit(row)}
                            >
                              <Pencil size={14} strokeWidth={2} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="admin__icon admin__icon--danger"
                              aria-label={`Delete ${row.title}`}
                              onClick={() => setConfirmId(row.id)}
                            >
                              <Trash2 size={15} strokeWidth={2} aria-hidden="true" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && rows.length > 0 && visible.length > 0 && (
          <nav className="admin-pager" aria-label="Pagination">
            <span className="admin-pager__count">
              Showing {start + 1} to {Math.min(start + pageSize, visible.length)} of{' '}
              {visible.length} products
            </span>
            <div className="admin-pager__controls">
              <button
                type="button"
                className="admin__icon"
                aria-label="Previous page"
                disabled={clampedPage === 1}
                onClick={() => setPage(clampedPage - 1)}
              >
                <ChevronLeft size={15} strokeWidth={2} aria-hidden="true" />
              </button>
              {pageItems(clampedPage, pageCount).map((it, i) =>
                it === '…' ? (
                  <span key={`gap-${i}`} className="admin-pager__gap" aria-hidden="true">
                    …
                  </span>
                ) : (
                  <button
                    key={it}
                    type="button"
                    className={`admin-pager__num${it === clampedPage ? ' admin-pager__num--on' : ''}`}
                    aria-label={`Go to page ${it}`}
                    aria-current={it === clampedPage ? 'page' : undefined}
                    onClick={() => setPage(it)}
                  >
                    {it}
                  </button>
                ),
              )}
              <button
                type="button"
                className="admin__icon"
                aria-label="Next page"
                disabled={clampedPage === pageCount}
                onClick={() => setPage(clampedPage + 1)}
              >
                <ChevronRight size={15} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
            <label className="sr-only" htmlFor="admin-pagesize">
              Products per page
            </label>
            <select
              id="admin-pagesize"
              className="admin__select admin-pager__size"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </nav>
        )}
      </div>
    </div>
  )
}
