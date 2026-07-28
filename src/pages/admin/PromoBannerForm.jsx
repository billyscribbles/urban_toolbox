import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { fetchPromoBanner, savePromoBanner } from '../../lib/adminApi.js'

// Promo banner editor: the on/off switch, the rotating message list, and a live
// preview of the real green bar. Messages rotate on the storefront in list
// order. Reordering is deliberately not offered — with a handful of short
// strings, retyping beats building drag handles.
const MAX_MESSAGES = 6
const MAX_LENGTH = 120

// Messages are held as { id, text } rather than plain strings so each row's
// <input> can be keyed by a stable id instead of its array position. Keying
// by index would let React rebind a mid-typing input's DOM node to a
// different row's text whenever an earlier row is removed (focus and cursor
// position stay on the DOM node while its value prop swaps out from under
// the user). An id survives reordering/removal, so React unmounts exactly
// the removed row and leaves every other row's DOM node — and focus — alone.
function newRow(text = '') {
  return { id: crypto.randomUUID(), text }
}

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
        setMessages(promo.messages.length ? promo.messages.map((text) => newRow(text)) : [newRow()])
        setLoaded(true)
      })
      .catch((err) => {
        if (!alive) return
        setError(err.message)
        // A failed load must still leave the form usable — otherwise every
        // control stays disabled forever with no way to retry.
        setLoaded(true)
      })
    return () => {
      alive = false
    }
  }, [])

  function setMessage(i, value) {
    setMessages(
      messages.map((m, idx) => (idx === i ? { ...m, text: value.slice(0, MAX_LENGTH) } : m)),
    )
  }
  function addMessage() {
    setMessages([...messages, newRow()])
  }
  function removeMessage(i) {
    setMessages(messages.filter((_, idx) => idx !== i))
  }

  const cleaned = messages.map((m) => m.text.trim()).filter(Boolean)

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
      setMessages(cleaned.length ? cleaned.map((text) => newRow(text)) : [newRow()])
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
          <div className="admin-promo__row" key={message.id}>
            <input
              className="admin__input"
              aria-label={`Message ${i + 1}`}
              placeholder="30% off all Ute and Caravan Toolboxes"
              maxLength={MAX_LENGTH}
              value={message.text}
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
