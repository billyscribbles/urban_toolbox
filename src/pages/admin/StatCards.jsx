import { useEffect, useState } from 'react'
import { Package, Eye, EyeOff, Tag } from 'lucide-react'
import { fetchStoreDiscount } from '../../lib/adminApi.js'
import DiscountModal from './DiscountModal.jsx'

// The four dashboard summary cards. Counts are derived by the parent from the
// product rows; the three count cards double as filters (click to show all /
// visible / hidden), and the discount card owns its value + manage modal.
export default function StatCards({ total, visibleCount, hiddenCount, filter, onFilter }) {
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
      <StatCard
        variant="dark"
        icon={<Package size={22} strokeWidth={2} aria-hidden="true" />}
        active={filter === 'all'}
        onClick={() => onFilter('all')}
      >
        <span className="admin-statcard__num" data-testid="stat-total">
          {total}
        </span>
        <span className="admin-statcard__label">Total products</span>
      </StatCard>

      <StatCard
        variant="accent"
        icon={<Eye size={22} strokeWidth={2} aria-hidden="true" />}
        active={filter === 'visible'}
        onClick={() => onFilter('visible')}
      >
        <span className="admin-statcard__num" data-testid="stat-visible">
          {visibleCount}
        </span>
        <span className="admin-statcard__label">Visible products</span>
      </StatCard>

      <StatCard
        variant="muted"
        icon={<EyeOff size={22} strokeWidth={2} aria-hidden="true" />}
        active={filter === 'hidden'}
        onClick={() => onFilter('hidden')}
      >
        <span className="admin-statcard__num" data-testid="stat-hidden">
          {hiddenCount}
        </span>
        <span className="admin-statcard__label">Hidden products</span>
      </StatCard>

      <StatCard variant="accent" icon={<Tag size={22} strokeWidth={2} aria-hidden="true" />}>
        <span className="admin-statcard__label">Store-wide discount</span>
        <span className="admin-statcard__row">
          <span className="admin-statcard__num admin-statcard__num--pct">{pct}%</span>
          <button
            type="button"
            className="admin__ghost admin-statcard__btn"
            onClick={() => setOpen(true)}
          >
            Manage discount
          </button>
        </span>
      </StatCard>

      <DiscountModal open={open} onSaved={(v) => setPct(v)} onClose={() => setOpen(false)} />
    </div>
  )
}

// A card is a plain surface, or — when given onClick — a filter button that
// highlights while its filter is active.
function StatCard({ variant, icon, children, active, onClick }) {
  const inner = (
    <>
      <span className={`admin-statcard__tile admin-statcard__tile--${variant}`}>{icon}</span>
      <span className="admin-statcard__body">{children}</span>
    </>
  )
  if (!onClick) return <div className="admin-statcard">{inner}</div>
  return (
    <button
      type="button"
      className={`admin-statcard admin-statcard--btn${active ? ' admin-statcard--on' : ''}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {inner}
    </button>
  )
}
