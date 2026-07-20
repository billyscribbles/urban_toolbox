import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useLayoutEffect, useState, lazy, Suspense } from 'react'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import Lightbox from './components/Lightbox.jsx'
import Home from './pages/Home.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import RouteFallback from './components/RouteFallback.jsx'
import { trackPageview } from './lib/analytics.js'
import { useQuote } from './lib/quoteStore.js'

// Retry lazy imports once, then force a reload if the chunk is gone.
// Prevents white-pages on stale tabs after a redeploy.
const RELOAD_KEY = 'urbantoolboxes:chunk-reloaded'
function lazyWithRetry(factory) {
  return lazy(() =>
    factory().catch((err) => {
      const already = sessionStorage.getItem(RELOAD_KEY) === '1'
      if (!already) {
        sessionStorage.setItem(RELOAD_KEY, '1')
        window.location.reload()
        return new Promise(() => {})
      }
      sessionStorage.removeItem(RELOAD_KEY)
      throw err
    }),
  )
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => sessionStorage.removeItem(RELOAD_KEY))
}

// The quote drawer pulls in framer-motion, which is otherwise the single
// biggest chunk on the home route's critical path. Nothing above the fold needs
// it, and the SPA can't paint the LCP hero until its JS arrives, so keeping
// motion out of the initial bundle is the main lever on LCP. The drawer is
// mounted the first time it opens, then stays mounted so its exit animation
// still runs — see DeferredQuoteDrawer below.
const QuoteDrawer = lazyWithRetry(() => import('./components/QuoteDrawer.jsx'))

// Latches the quote drawer's chunk in on its first open, without ever
// unmounting it again (so framer-motion's AnimatePresence keeps handling the
// slide-out). The set-state-during-render is the sanctioned "adjust state when a
// prop changes" pattern — it's guarded, so it runs once and doesn't loop.
function DeferredQuoteDrawer() {
  const { isOpen: quoteOpen } = useQuote()
  const [quoteMounted, setQuoteMounted] = useState(false)
  if (quoteOpen && !quoteMounted) setQuoteMounted(true)
  return <Suspense fallback={null}>{quoteMounted && <QuoteDrawer />}</Suspense>
}

const CategoryPage = lazyWithRetry(() => import('./pages/CategoryPage.jsx'))
const ProductPage = lazyWithRetry(() => import('./pages/ProductPage.jsx'))
const VehiclePage = lazyWithRetry(() => import('./pages/VehiclePage.jsx'))
const FabricationPage = lazyWithRetry(() => import('./pages/FabricationPage.jsx'))
const AboutPage = lazyWithRetry(() => import('./pages/AboutPage.jsx'))
const QuotePage = lazyWithRetry(() => import('./pages/QuotePage.jsx'))
const LegalPage = lazyWithRetry(() => import('./pages/LegalPage.jsx'))
const NotFoundPage = lazyWithRetry(() => import('./pages/NotFoundPage.jsx'))
const AdminPage = lazyWithRetry(() => import('./pages/admin/AdminPage.jsx'))

// Resets scroll on navigation and reports the page view to analytics.
function RouteChange() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  }, [])
  useLayoutEffect(() => {
    if (hash) return
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname, hash])
  // Scroll to a #hash target once it exists. The destination page is lazy-
  // loaded, so the element may not be mounted on the first frame — retry across
  // a few frames until it appears. Powers the /laser-cutting & /folding legacy
  // redirects that land on sections of /fabrication.
  useEffect(() => {
    if (!hash) return
    const id = decodeURIComponent(hash.slice(1))
    let frame
    let tries = 0
    const tryScroll = () => {
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else if (tries++ < 60) {
        frame = requestAnimationFrame(tryScroll)
      }
    }
    frame = requestAnimationFrame(tryScroll)
    return () => cancelAnimationFrame(frame)
  }, [pathname, hash])
  useEffect(() => {
    trackPageview(`${pathname}${hash}`)
  }, [pathname, hash])
  return null
}

function AppBody() {
  // The admin is a standalone full-screen dashboard — it owns the viewport, so
  // the marketing Navbar/Footer and the storefront-only drawers don't render there.
  const isAdmin = useLocation().pathname === '/admin'
  return (
    <>
      <RouteChange />
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      {!isAdmin && <Navbar />}
      {/* Skip-link target. Each routed page renders its own <main> landmark;
          this wrapper just gives the skip link a stable, focusable anchor. */}
      <div id="main" tabIndex={-1}>
        <ErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />

              {/* Data-driven catalog. Both tops show an overview of their
                  subcategories, each of which is its own CategoryPage. Driven
                  entirely by src/data/categories.js. */}
              <Route
                path="/toolboxes"
                element={
                  <CategoryPage
                    slug="toolboxes"
                    intro="Custom aluminium toolboxes for utes, trucks and trailers — under-tray, top-opening, side-opening, truck boxes, dog boxes and canopies. Every model, built to order in Dandenong South."
                  />
                }
              />
              <Route path="/toolboxes/:subSlug" element={<CategoryPage />} />
              <Route path="/accessories" element={<CategoryPage slug="accessories" />} />
              <Route path="/accessories/:subSlug" element={<CategoryPage />} />

              {/* Individual product page — shareable, replaces the old
                  ?product= detail drawer. Token is the product slug (or id). */}
              <Route path="/product/:slug" element={<ProductPage />} />

              {/* Explore-by-vehicle pages — the whole range filtered to
                  products flagged for utes / caravans in the admin. */}
              <Route path="/utes" element={<VehiclePage vehicle="ute" />} />
              <Route path="/caravans" element={<VehiclePage vehicle="caravan" />} />

              <Route path="/fabrication" element={<FabricationPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/quote" element={<QuotePage />} />
              {/* /contact is an enquiry intent — send it to the quote form. */}
              <Route path="/contact" element={<Navigate to="/quote" replace />} />
              <Route path="/privacy" element={<LegalPage type="privacy" />} />
              <Route path="/terms" element={<LegalPage type="terms" />} />

              {/* Legacy product routes retired in the catalog restructure —
                  redirected to their nearest new home so inbound links and search
                  rankings survive. */}
              <Route path="/caravan-toolboxes" element={<Navigate to="/caravans" replace />} />
              <Route
                path="/trucks"
                element={<Navigate to="/toolboxes/truck-toolboxes" replace />}
              />

              {/* Legacy URLs from the previous GoDaddy site — kept alive so
                  existing search rankings and inbound links don't 404 after
                  migration. laser-cutting & folding were separate pages that are
                  now sections of /fabrication; photos had no equivalent. */}
              <Route path="/ute-accessories" element={<Navigate to="/accessories" replace />} />
              <Route path="/ute-accesories" element={<Navigate to="/accessories" replace />} />
              <Route
                path="/laser-cutting"
                element={<Navigate to="/fabrication#laser-cutting" replace />}
              />
              <Route path="/folding" element={<Navigate to="/fabrication#folding" replace />} />
              <Route path="/photos" element={<Navigate to="/" replace />} />

              {/* Catalogue admin — auth-gated, noindexed, deliberately not in the nav. */}
              <Route path="/admin" element={<AdminPage />} />

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
      {!isAdmin && (
        <>
          <Footer />
          <Lightbox />
          <DeferredQuoteDrawer />
        </>
      )}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppBody />
    </BrowserRouter>
  )
}
