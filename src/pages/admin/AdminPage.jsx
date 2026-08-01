import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import SEO from '../../lib/seo.jsx'
import { site } from '../../config/site.config.js'
import AdminLogin from './AdminLogin.jsx'
import ProductList from './ProductList.jsx'
import CarouselImages from './CarouselImages.jsx'
import FeaturedProducts from './FeaturedProducts.jsx'
import EditorTray from './EditorTray.jsx'
import { watchSession, signOut, fetchAdminProducts } from '../../lib/adminApi.js'
import './Admin.css'

// Dashboard sections. All three read the same `rows` fetch, so switching tabs
// costs no network — only the selected panel is mounted.
const TABS = [
  { id: 'products', label: 'Products' },
  { id: 'carousel', label: 'Home carousel' },
  { id: 'featured', label: 'Featured Products' },
]

// The whole admin lives on this one lazy route: auth gate -> tabbed dashboard,
// with product create/edit in a slide-out tray. Data is raw DB rows
// (snake_case) — the storefront's normalized shape never leaks in here.
export default function AdminPage() {
  const [session, setSession] = useState(null)
  const [checked, setChecked] = useState(false)
  const [rows, setRows] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | row
  const [tab, setTab] = useState(TABS[0].id)

  // Arrow keys move selection along the strip, as a tablist is expected to.
  // The button elements persist across the re-render (same id), so focusing
  // straight away lands on the right one.
  function onTabKey(e) {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const i = TABS.findIndex((t) => t.id === tab)
    const next = TABS[(i + step + TABS.length) % TABS.length]
    setTab(next.id)
    document.getElementById(`admin-tab-${next.id}`)?.focus()
  }

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
            <div className="admin-topbar__lead">
              <img
                className="admin-topbar__mark"
                src={site.brand.logoMark}
                alt=""
                width="40"
                height="40"
              />
              <h1 className="admin-topbar__title">Admin</h1>
            </div>
            <div className="admin-topbar__actions">
              <Link className="admin-topbar__pill" to="/">
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

            <div className="admin-tabs" role="tablist" aria-label="Admin sections">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`admin-tab-${t.id}`}
                  aria-controls={`admin-panel-${t.id}`}
                  aria-selected={tab === t.id}
                  // Roving tabindex: the strip is one Tab stop, and the arrow
                  // keys move within it (onTabKey below).
                  tabIndex={tab === t.id ? 0 : -1}
                  className={`admin-tab${tab === t.id ? ' admin-tab--on' : ''}`}
                  onClick={() => setTab(t.id)}
                  onKeyDown={onTabKey}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div
              className="admin-panel"
              role="tabpanel"
              id={`admin-panel-${tab}`}
              aria-labelledby={`admin-tab-${tab}`}
              tabIndex={0}
            >
              {tab === 'products' ? (
                <ProductList
                  rows={rows}
                  loading={!loaded}
                  onEdit={setEditing}
                  onNew={() => setEditing('new')}
                  onChanged={refresh}
                />
              ) : tab === 'carousel' ? (
                <CarouselImages rows={rows} />
              ) : (
                <FeaturedProducts rows={rows} onChanged={refresh} />
              )}
            </div>
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
