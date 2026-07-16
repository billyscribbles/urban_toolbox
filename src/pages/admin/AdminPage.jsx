import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import SEO from '../../lib/seo.jsx'
import { site } from '../../config/site.config.js'
import AdminLogin from './AdminLogin.jsx'
import ProductList from './ProductList.jsx'
import EditorTray from './EditorTray.jsx'
import { watchSession, signOut, fetchAdminProducts } from '../../lib/adminApi.js'
import './Admin.css'

// The whole admin lives on this one lazy route: auth gate -> product list, with
// create/edit in a slide-out tray. Data is raw DB rows (snake_case) — the
// storefront's normalized shape never leaks in here.
export default function AdminPage() {
  const [session, setSession] = useState(null)
  const [checked, setChecked] = useState(false)
  const [rows, setRows] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | row

  useEffect(() => {
    let cleanup = () => {}
    watchSession((s) => {
      setSession(s)
      setChecked(true)
    }).then((unsub) => {
      cleanup = unsub
    })
    return () => cleanup()
  }, [])

  const refresh = useCallback(async () => {
    try {
      setRows(await fetchAdminProducts())
      setLoadError('')
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (session) refresh()
  }, [session, refresh])

  return (
    <main className="admin">
      <SEO title="Admin" description="Catalogue admin" path="/admin" noindex />
      {!checked ? null : !session ? (
        <AdminLogin />
      ) : (
        <>
          <header className="admin-topbar">
            <div className="admin-topbar__brand">
              <img
                className="admin-topbar__mark"
                src={site.brand.logoMark}
                alt=""
                width="40"
                height="40"
              />
              <span className="admin-topbar__lockup">
                <span className="admin-topbar__word">{site.brand.logoText}</span>
                <span className="admin-topbar__tag">Admin</span>
              </span>
            </div>
            <div className="admin-topbar__actions">
              <Link className="admin-topbar__link" to="/">
                ← Return to site
              </Link>
              <button type="button" className="admin__ghost" onClick={signOut}>
                Sign out
              </button>
            </div>
          </header>

          <div className="admin__body">
            {loadError && (
              <p className="admin__error" role="alert">
                {loadError}
              </p>
            )}
            <ProductList
              rows={rows}
              loading={!loaded}
              onEdit={setEditing}
              onNew={() => setEditing('new')}
              onChanged={refresh}
            />
          </div>

          <EditorTray
            editing={editing}
            rows={rows}
            onDone={() => {
              setEditing(null)
              refresh()
            }}
            onCancel={() => setEditing(null)}
          />
        </>
      )}
    </main>
  )
}
