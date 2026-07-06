import './Eyebrow.css'

// The section eyebrow: a 38×2px green tick followed by an uppercase label.
// Used on every section (light and dark) — the accent reads on both.
export default function Eyebrow({ children, className = '' }) {
  return (
    <div className={`eyebrow ${className}`.trim()}>
      <span className="eyebrow__tick" aria-hidden="true" />
      <span className="eyebrow__label">{children}</span>
    </div>
  )
}
