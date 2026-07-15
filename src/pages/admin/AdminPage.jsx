import { useCallback, useEffect, useState } from 'react'
import SEO from '../../lib/seo.jsx'
import AdminLogin from './AdminLogin.jsx'
import ProductList from './ProductList.jsx'
import ProductEditor from './ProductEditor.jsx'
import { watchSession, signOut, fetchAdminProducts } from '../../lib/adminApi.js'
import './Admin.css'

// The whole admin lives on this one lazy route: auth gate -> product list
// <-> product editor. Data is raw DB rows (snake_case) — the storefront's
// normalized shape never leaks in here.
export default function AdminPage() {
  const [session, setSession] = useState(null)
  const [checked, setChecked] = useState(false)
  const [rows, setRows] = useState([])
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
    }
  }, [])

  useEffect(() => {
    if (session) refresh()
  }, [session, refresh])

  return (
    <main className="admin section">
      <SEO title="Admin" description="Catalogue admin" path="/admin" noindex />
      {!checked ? null : !session ? (
        <div className="container">
          <AdminLogin />
        </div>
      ) : (
        <div className="container">
          <header className="admin__head">
            <h1 className="admin__title">Catalogue admin</h1>
            <button type="button" className="admin__ghost" onClick={signOut}>
              Sign out
            </button>
          </header>
          {loadError && (
            <p className="admin__error" role="alert">
              {loadError}
            </p>
          )}
          {editing ? (
            <ProductEditor
              row={editing === 'new' ? null : editing}
              rows={rows}
              onDone={() => {
                setEditing(null)
                refresh()
              }}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <ProductList
              rows={rows}
              onEdit={setEditing}
              onNew={() => setEditing('new')}
              onChanged={refresh}
            />
          )}
        </div>
      )}
    </main>
  )
}
