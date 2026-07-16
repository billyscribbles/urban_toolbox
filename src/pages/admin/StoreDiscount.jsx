import { useEffect, useState } from 'react'
import { Tag } from 'lucide-react'
import { fetchStoreDiscount, saveStoreDiscount } from '../../lib/adminApi.js'

// Store-wide discount: one % applied to every storefront price at display time
// (the greater of this and each product's own discount wins). 0 turns it off.
// Non-destructive — it never overwrites per-product discounts.
export default function StoreDiscount() {
  const [value, setValue] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    fetchStoreDiscount()
      .then((pct) => {
        if (!alive) return
        setValue(pct ? String(pct) : '')
        setLoaded(true)
      })
      .catch((err) => alive && setError(err.message))
    return () => {
      alive = false
    }
  }, [])

  async function apply(next) {
    const pct = next === '' ? 0 : Number(next)
    if (!Number.isFinite(pct) || pct < 0 || pct >= 100) {
      setError('Enter a number from 0 to 99.')
      return
    }
    setBusy(true)
    setError('')
    setStatus('')
    try {
      await saveStoreDiscount(pct)
      setValue(pct ? String(pct) : '')
      setStatus(pct ? `Store-wide ${pct}% discount is live.` : 'Store-wide discount cleared.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="admin-discount"
      onSubmit={(e) => {
        e.preventDefault()
        apply(value)
      }}
    >
      <div className="admin-discount__label">
        <Tag size={16} strokeWidth={2} aria-hidden="true" />
        <label htmlFor="store-discount">Store-wide discount</label>
      </div>
      <div className="admin-discount__field">
        <input
          id="store-discount"
          className="admin__input admin-discount__input"
          inputMode="numeric"
          placeholder="0"
          value={value}
          disabled={!loaded || busy}
          onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ''))}
        />
        <span className="admin-discount__pct" aria-hidden="true">
          %
        </span>
      </div>
      <button
        type="submit"
        className="admin__primary admin-discount__apply"
        disabled={!loaded || busy}
      >
        {busy ? 'Saving…' : 'Apply'}
      </button>
      {value !== '' && (
        <button
          type="button"
          className="admin__ghost"
          disabled={!loaded || busy}
          onClick={() => apply('')}
        >
          Clear
        </button>
      )}
      {status && (
        <span className="admin-discount__status" role="status">
          {status}
        </span>
      )}
      {error && (
        <span className="admin__error admin-discount__status" role="alert">
          {error}
        </span>
      )}
    </form>
  )
}
