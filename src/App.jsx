import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useLayoutEffect, useState, lazy, Suspense } from 'react'
import Navbar from './components/Navbar.jsx'
import PromoBanner from './components/PromoBanner.jsx'
import Footer from './components/Footer.jsx'
import Lightbox from './components/Lightbox.jsx'
import Home from './pages/Home.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import RouteFallback from './components/RouteFallback.jsx'
import { trackPageview } from './lib/analytics.js'
import { useQuote } from './lib/quoteStore.js'
import { categories } from './data/categories.js'
import { legacyRedirects } from './config/redirects.js'

// Vehicle-exclusive tops (Trays, Canopy, Service Canopy) are single-segment
// top-level categories — each gets its own /<slug> CategoryPage route. Derived
// from the tree so a new ute-exclusive top wires up its route automatically.
const vehicleTops = categories.filter((c) => c.vehicle)

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
const ServicePage = lazyWithRetry(() => import('./pages/ServicePage.jsx'))
const AustralianMadePage = lazyWithRetry(() => import('./pages/AustralianMadePage.jsx'))
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
      {!isAdmin && <PromoBanner />}
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
                    intro="Custom aluminium toolboxes for utes, trucks, campers and trailers — under-tray, top-opening, side-opening, truck boxes, dog boxes, drawer units and canopies. Every model, built to order in Dandenong South."
                  />
                }
              />
              <Route path="/toolboxes/:subSlug" element={<CategoryPage />} />
              <Route path="/accessories" element={<CategoryPage slug="accessories" />} />
              <Route path="/accessories/:subSlug" element={<CategoryPage />} />

              {/* Ute-exclusive tops — Trays, Canopy, Service Canopy. Each is a
                  bare top-level category (no /toolboxes|/accessories parent), so
                  it owns a single-segment route rendering its own CategoryPage. */}
              {vehicleTops.map((top) => (
                <Route
                  key={top.slug}
                  path={`/${top.slug}`}
                  element={<CategoryPage slug={top.slug} />}
                />
              ))}

              {/* Individual product page — shareable, replaces the old
                  ?product= detail drawer. Token is the product slug (or id). */}
              <Route path="/product/:slug" element={<ProductPage />} />

              {/* Explore-by-vehicle pages. Utes and caravans are the whole
                  range filtered to products flagged for them in the admin;
                  trucks renders its own two scoped categories. */}
              <Route path="/utes" element={<VehiclePage vehicle="ute" />} />
              <Route path="/caravans" element={<VehiclePage vehicle="caravan" />} />
              <Route path="/trucks" element={<VehiclePage vehicle="truck" />} />

              <Route path="/fabrication" element={<FabricationPage />} />
              {/* /laser-cutting and /folding are legacy GoDaddy URLs that rank
                  on their own. They stay real pages (not redirects into
                  #anchors on /fabrication — Google drops the fragment, which
                  would merge two ranking URLs and two distinct search intents
                  into one). Content lives in content/fabrication.js. */}
              <Route path="/laser-cutting" element={<ServicePage slug="laser-cutting" />} />
              <Route path="/folding" element={<ServicePage slug="folding" />} />
              <Route path="/australian-made" element={<AustralianMadePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/quote" element={<QuotePage />} />
              <Route path="/privacy" element={<LegalPage type="privacy" />} />
              <Route path="/terms" element={<LegalPage type="terms" />} />

              {/* Legacy URLs — from the old GoDaddy site and from the catalogue
                  restructure — kept alive so inbound links and search rankings
                  survive. server.js serves these as real 301s (the version
                  search engines see); these client routes are the safety net for
                  in-app navigation. Both read the same map, so they can't drift. */}
              {Object.entries(legacyRedirects).map(([from, to]) => (
                <Route key={from} path={from} element={<Navigate to={to} replace />} />
              ))}

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
