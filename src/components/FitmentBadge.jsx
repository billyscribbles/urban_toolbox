import { BadgeCheck } from 'lucide-react'
import { fitment } from '../content/fitment.js'
import './FitmentBadge.css'

// The "Fits all utes" answer. Two forms of the same fact:
//
//   plate  — the full statement for a dark page hero: green edge bar, the claim,
//            a mono spec line and the made-to-measure caveat. Styled after the
//            compliance plate riveted to a finished tray.
//   inline — a compact chip for light surfaces (product buy box, section heads)
//            where the claim alone is enough.
//
// Copy comes from content/fitment.js keyed by the category's `vehicle` scope, so
// this component holds no client strings. Renders nothing for an unknown scope.
export default function FitmentBadge({ vehicle, variant = 'plate' }) {
  const copy = fitment[vehicle]
  if (!copy) return null

  if (variant === 'inline') {
    return (
      <p className="fitment fitment--inline">
        <BadgeCheck size={17} strokeWidth={2.2} aria-hidden="true" />
        <span className="fitment__label">{copy.label}</span>
      </p>
    )
  }

  return (
    <div className="fitment fitment--plate">
      <span className="fitment__icon" aria-hidden="true">
        <BadgeCheck size={26} strokeWidth={1.9} />
      </span>
      <div className="fitment__body">
        <p className="fitment__label">{copy.label}</p>
        {copy.spec && <p className="fitment__spec">{copy.spec}</p>}
        {copy.note && <p className="fitment__note">{copy.note}</p>}
      </div>
    </div>
  )
}
