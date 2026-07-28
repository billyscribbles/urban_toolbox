import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { fetchPromoBanner, savePromoBanner } from '../../lib/adminApi.js'

// Promo banner editor: the on/off switch, the rotating message list, and a live
// preview of the real green bar. Messages rotate on the storefront in list
// order. Reordering is deliberately not offered — with a handful of short
// strings, retyping beats building drag handles.
const MAX_MESSAGES = 6
const MAX_LENGTH = 120

export default function PromoBannerForm({ onSaved }) {
  const [enabled, setEnabled] = useState(false)
  const [messages, setMessages] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    fetchPromoBanner()
      .then((promo) => {
        if (!alive) return
        setEnabled(promo.enabled)
        setMessages(promo.messages.length ? promo.messages : [''])
        setLoaded(true)
      })
      .catch((err) => alive && setError(err.message))
    return () => {
      alive = false
    }
  }, [])

  function setMessage(i, value) {
    setMessages(messages.map((m, idx) => (idx === i ? value.slice(0, MAX_LENGTH) : m)))
  }
  function addMessage() {
    setMessages([...messages, ''])
  }
  function removeMessage(i) {
    setMessages(messages.filter((_, idx) => idx !== i))
  }

  const cleaned = messages.map((m) => m.trim()).filter(Boolean)

  async function onSubmit(e) {
    e.preventDefault()
    setStatus('')
    if (enabled && cleaned.length === 0) {
      setError('Add at least one message before switching the banner on.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await savePromoBanner({ enabled, messages: cleaned })
      setMessages(cleaned.length ? cleaned : [''])
      setStatus(enabled ? 'Promo banner is live.' : 'Promo banner is off.')
      onSaved?.({ enabled, messages: cleaned })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="admin-promo" onSubmit={onSubmit}>
      <label className="admin-editor__check">
        <input
          type="checkbox"
          checked={enabled}
          disabled={!loaded || busy}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        Show the promo banner on the site
      </label>

      <fieldset className="admin-promo__list">
        <legend className="admin__label">Messages (they rotate in this order)</legend>
        {messages.map((message, i) => (
          <div className="admin-promo__row" key={i}>
            <input
              className="admin__input"
              aria-label={`Message ${i + 1}`}
              placeholder="30% off all Ute and Caravan Toolboxes"
              maxLength={MAX_LENGTH}
              value={message}
              disabled={!loaded || busy}
              onChange={(e) => setMessage(i, e.target.value)}
            />
            <button
              type="button"
              className="admin__ghost admin-promo__remove"
              aria-label={`Remove message ${i + 1}`}
              disabled={!loaded || busy || messages.length === 1}
              onClick={() => removeMessage(i)}
            >
              <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="admin__ghost"
          disabled={!loaded || busy || messages.length >= MAX_MESSAGES}
          onClick={addMessage}
        >
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
          Add message
        </button>
      </fieldset>

      <div className="admin-promo__preview" aria-hidden="true">
        <span className="admin__label">Preview</span>
        <div className="admin-promo__bar">{cleaned[0] || 'Your message appears here'}</div>
      </div>

      <div className="admin-promo__actions">
        <button type="submit" className="admin__primary" disabled={!loaded || busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
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
      </div>
    </form>
  )
}
