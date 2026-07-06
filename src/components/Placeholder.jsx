import './Placeholder.css'

// Intentional photo slot — diagonal-stripe box with a mono label describing the
// shot the client will drop in. `dark` switches to the dark-section variant.
export default function Placeholder({ label, sub, height = 220, dark = false }) {
  return (
    <div
      className={`placeholder${dark ? ' placeholder--dark' : ''}`}
      style={{ height }}
      role="img"
      aria-label={sub ? `${label} — ${sub}` : label}
    >
      <span className="placeholder__label">
        {label}
        {sub && (
          <>
            <br />
            {sub}
          </>
        )}
      </span>
    </div>
  )
}
