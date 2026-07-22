import { useRef } from 'react'
import { PRODUCT_COLORS, colorLabel } from '../data/colors.js'
import './ColorSelector.css'

// Controlled swatch picker for a product's available powder-coat colours.
// Dumb: the parent owns the selected value and passes the enabled colour keys.
// Renders an accessible radio group (roving tabindex + arrow-key navigation) so
// it reads correctly to assistive tech and passes the axe gate. A text label
// echoes the choice so it never relies on colour alone.
export default function ColorSelector({ colors, value, onChange }) {
  const options = PRODUCT_COLORS.filter((c) => colors.includes(c.key))
  const refs = useRef([])
  if (options.length === 0) return null

  const activeIndex = Math.max(
    0,
    options.findIndex((c) => c.key === value),
  )

  function focusAt(i) {
    const next = (i + options.length) % options.length
    onChange(options[next].key)
    refs.current[next]?.focus()
  }

  function onKeyDown(e, i) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      focusAt(i + 1)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      focusAt(i - 1)
    }
  }

  return (
    <div className="color-selector">
      <p className="color-selector__label">
        Colour:{' '}
        <span className="color-selector__value">{colorLabel(options[activeIndex].key)}</span>
      </p>
      <div className="color-selector__swatches" role="radiogroup" aria-label="Colour">
        {options.map((c, i) => {
          const selected = c.key === options[activeIndex].key
          return (
            <button
              type="button"
              key={c.key}
              ref={(el) => (refs.current[i] = el)}
              className={`color-selector__swatch${
                c.border ? ' color-selector__swatch--bordered' : ''
              }${selected ? ' is-selected' : ''}`}
              style={{ '--swatch': c.hex }}
              role="radio"
              aria-checked={selected}
              aria-label={c.label}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(c.key)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              <span className="color-selector__dot" aria-hidden="true" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
