import { useState } from 'react'
import { signIn } from '../../lib/adminApi.js'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error: err } = await signIn(email, password)
    if (err) setError(err.message)
    setBusy(false)
    // On success watchSession fires with the new session and AdminPage swaps views.
  }

  return (
    <div className="admin-login">
      <form className="admin-login__form" onSubmit={onSubmit}>
        <h1 className="admin__title">Admin sign in</h1>
        <label className="admin__label" htmlFor="admin-email">
          Email
        </label>
        <input
          id="admin-email"
          className="admin__input"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label className="admin__label" htmlFor="admin-password">
          Password
        </label>
        <input
          id="admin-password"
          className="admin__input"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p className="admin__error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="admin__primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
