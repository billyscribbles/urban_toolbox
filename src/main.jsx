import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { applyTheme } from './lib/applyTheme.js'
import { initAnalytics, initGtm } from './lib/analytics.js'
import { loadProducts } from './lib/productStore.js'
import './fonts.css'
import './index.css'
import App from './App.jsx'

applyTheme()
initAnalytics()
initGtm()

// The build-time prerenderer (scripts/prerender.mjs) waits on this flag before
// snapshotting a route, so the static HTML contains the real catalogue rather
// than a loading skeleton. `finally` — a failed fetch still means "as loaded as
// this page is going to get", and the store renders its own error state.
loadProducts().finally(() => {
  window.__APP_READY__ = true
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
)
