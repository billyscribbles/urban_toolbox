import { useEffect, useState } from 'react'
import { Package, Eye, EyeOff, Tag } from 'lucide-react'
import { fetchStoreDiscount } from '../../lib/adminApi.js'
import DiscountModal from './DiscountModal.jsx'

// The four dashboard summary cards. Counts are derived by the parent from the
// product rows; the discount card owns its own value (store_settings) and opens
// the manage-discount modal.
export default function StatCards({ total, visibleCount, hiddenCount }) {
  const [pct, setPct] = useState(0)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let alive = true
    fetchStoreDiscount()
      .then((v) => alive && setPct(v || 0))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="admin-statcards">
      <StatCard variant="dark" icon={<Package size={22} strokeWidth={2} aria-hidden="true" />}>
        <span className="admin-statcard__num" data-testid="stat-total">
          {total}
        </span>
        <span className="admin-statcard__label">Total products</span>
        <span className="admin-statcard__sub">All products in store</span>
      </StatCard>

      <StatCard variant="accent" icon={<Eye size={22} strokeWidth={2} aria-hidden="true" />}>
        <span className="admin-statcard__num" data-testid="stat-visible">
          {visibleCount}
        </span>
        <span className="admin-statcard__label">Visible products</span>
        <span className="admin-statcard__sub">Currently visible online</span>
      </StatCard>

      <StatCard variant="muted" icon={<EyeOff size={22} strokeWidth={2} aria-hidden="true" />}>
        <span className="admin-statcard__num" data-testid="stat-hidden">
          {hiddenCount}
        </span>
        <span className="admin-statcard__label">Hidden products</span>
        <span className="admin-statcard__sub">Not visible to customers</span>
      </StatCard>

      <StatCard variant="accent" icon={<Tag size={22} strokeWidth={2} aria-hidden="true" />}>
        <span className="admin-statcard__label">Store-wide discount</span>
        <span className="admin-statcard__num admin-statcard__num--pct">{pct}%</span>
        <button
          type="button"
          className="admin__ghost admin-statcard__btn"
          onClick={() => setOpen(true)}
        >
          Manage discount
        </button>
      </StatCard>

      {open && <DiscountModal onSaved={(v) => setPct(v)} onClose={() => setOpen(false)} />}
    </div>
  )
}

function StatCard({ variant, icon, children }) {
  return (
    <div className="admin-statcard">
      <span className={`admin-statcard__tile admin-statcard__tile--${variant}`}>{icon}</span>
      <span className="admin-statcard__body">{children}</span>
    </div>
  )
}
