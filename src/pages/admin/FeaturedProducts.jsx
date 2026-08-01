import { useMemo, useState } from 'react'
import { Star } from 'lucide-react'
import { getAdminCategoryGroups, FEATURED_RAIL_LIMIT } from '../../lib/catalog.js'
import { publicPhotoUrl } from '../../lib/supabaseClient.js'
import { formatPrice } from '../../lib/pricing.js'
import { setProductFeatured } from '../../lib/adminApi.js'

// The Featured Products tab: what the home page rail is showing right now,
// with a one-click Unfeature on each. Reads the same `rows` fetch the other
// panels take, so switching to this tab costs no network.
//
// Rows arrive ordered category_id then sort_order (fetchAdminProducts), but the
// storefront orders sort_order then id. Re-sort so this tab lists them in the
// order a visitor actually sees — the same reason CarouselImages re-sorts its
// own copy rather than trusting the admin fetch's order.
export default function FeaturedProducts({ rows, loading, onChanged }) {
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  const leafLabel = useMemo(
    () => new Map(getAdminCategoryGroups().flatMap((g) => g.options.map((o) => [o.id, o.label]))),
    [],
  )

  const featured = useMemo(
    () =>
      (rows ?? [])
        .filter((r) => r.featured)
        .slice()
        .sort(
          (a, b) =>
            (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.id).localeCompare(String(b.id)),
        ),
    [rows],
  )

  // Which of these actually reach the rail. The cap is applied to the
  // storefront list, and that fetch already drops hidden rows
  // (`.eq('hidden', false)`), so hidden rows don't consume a slot — counting
  // positions in the list above would mislabel the tail whenever one is hidden.
  const railIds = useMemo(
    () =>
      new Set(
        featured
          .filter((r) => !r.hidden)
          .slice(0, FEATURED_RAIL_LIMIT)
          .map((r) => r.id),
      ),
    [featured],
  )

  function thumb(row) {
    const first = [...(row.product_images ?? [])].sort((a, b) => a.position - b.position)[0]
    return first ? publicPhotoUrl(first.storage_path) : null
  }

  async function onUnfeature(row) {
    setBusyId(row.id)
    setError('')
    try {
      await setProductFeatured(row.id, false)
      // Awaited, not fired-and-forgotten: `rows` is what ProductEditor snapshots
      // when a row is opened, and `featured` is one of the columns toRow() writes
      // back. Clearing busy before the refetch lands would hand the editor a
      // pre-toggle row, and saving would silently undo this write.
      await onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="admin-card">
      <div className="admin-toolbar">
        <div>
          <span className="admin__label">
            Featured products{' '}
            <span className="admin-featured__count">
              {featured.length} of {FEATURED_RAIL_LIMIT}
            </span>
          </span>
          <span className="admin__label-hint">
            The “Featured Products” rail on the home page, in the order visitors see it. Up to{' '}
            {FEATURED_RAIL_LIMIT} can be featured — unfeature one here to make room. Use the star on
            a row in the Products tab to add one.
          </span>
        </div>
      </div>

      {error && (
        <p className="admin__error" role="alert">
          {error}
        </p>
      )}

      {/* The empty state instructs, so it must never render over a list that
          simply hasn't arrived — on a cold /admin load, or a failed one, it
          would be telling the truth about `rows` and lying about the store.
          Same skeleton the Products tab shows for the same fetch. */}
      {loading ? (
        <ul className="admin-skel" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="admin-skel__row" />
          ))}
        </ul>
      ) : featured.length === 0 ? (
        <p className="admin__empty">
          No featured products yet. Use the star on a row in the Products tab to add one.
        </p>
      ) : (
        <ul className="admin-featured">
          {featured.map((row) => (
            <li className="admin-featured__item" key={row.id}>
              {thumb(row) ? (
                <img className="admin-table__thumb" src={thumb(row)} alt="" />
              ) : (
                <span className="admin-table__thumb" aria-hidden="true" />
              )}

              <span className="admin-featured__text">
                <span className="admin-featured__title">{row.title}</span>
                <span className="admin-featured__meta">
                  {leafLabel.get(row.category_id) ?? row.category_id} ·{' '}
                  {row.price == null ? 'No price' : formatPrice(Number(row.price))}
                </span>
              </span>

              {/* Two ways a starred product never reaches the rail, both
                  otherwise invisible: it's hidden from the storefront, or it
                  sits past the rail's cap. --hidden is the muted badge; both
                  cases mean the same thing to the reader. */}
              {row.hidden && (
                <span className="admin-badge admin-badge--hidden">
                  Hidden — not on the home page
                </span>
              )}
              {!row.hidden && !railIds.has(row.id) && (
                <span className="admin-badge admin-badge--hidden">
                  Not on the home page — over the {FEATURED_RAIL_LIMIT} limit
                </span>
              )}

              <button
                type="button"
                className="admin__ghost"
                disabled={busyId === row.id}
                // The visible label repeats across rows, so the accessible name
                // carries the title too. It still starts with the visible text,
                // which is what WCAG's label-in-name asks for.
                aria-label={`Unfeature ${row.title}`}
                onClick={() => onUnfeature(row)}
              >
                <Star size={14} strokeWidth={2} fill="currentColor" aria-hidden="true" />
                {busyId === row.id ? 'Working…' : 'Unfeature'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
