// Opt-in Google Analytics 4 wiring. Every function here is a no-op unless
// `integrations.gaId` is set (via VITE_GA_ID) — clients who skip analytics
// ship no gtag script and no tracking calls.

import { site } from '../config/site.config.js'

const gaId = site.integrations.gaId
const gtmId = site.integrations.gtmId

let initialized = false
let gtmInitialized = false

// Runs `fn` once the page has finished loading and the browser is idle.
//
// Google's tags are ~600 KB of third-party JavaScript. Fetched during the
// initial load they compete with the hero image for bandwidth and push LCP out
// by roughly a second on a slow connection. Nothing is lost by waiting: both
// tags read from `window.dataLayer`, which we prime synchronously below, so
// events fired before the script lands (the first page_view, most importantly)
// sit in the queue and are processed the moment it does.
function whenIdle(fn) {
  const run = () => (window.requestIdleCallback || window.setTimeout)(fn, 1)
  if (document.readyState === 'complete') run()
  else window.addEventListener('load', run, { once: true })
}

// Injects the GA4 gtag script. Safe (and free) to call when no gaId is set.
// Call once at app boot, before the first route renders.
export function initAnalytics() {
  if (!gaId || initialized || typeof document === 'undefined') return
  initialized = true

  window.dataLayer = window.dataLayer || []
  // gtag must forward `arguments` verbatim — this is the GA-prescribed shim.
  window.gtag = function gtag() {
    window.dataLayer.push(arguments)
  }
  window.gtag('js', new Date())
  // SPA: we emit page_view manually on route change (see trackPageview).
  window.gtag('config', gaId, { send_page_view: false })

  // The queue above is live immediately; only the download waits for idle.
  whenIdle(() => {
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
    document.head.appendChild(script)
  })
}

// Injects the Google Tag Manager container. No-op unless `integrations.gtmId`
// is set. GTM is where the old site's Google Ads conversion / remarketing tags
// live, so loading the same container preserves them. Route changes are picked
// up by GTM's native History Change trigger — no manual dataLayer push needed.
export function initGtm() {
  if (!gtmId || gtmInitialized || typeof document === 'undefined') return
  gtmInitialized = true

  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' })

  whenIdle(() => {
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`
    document.head.appendChild(script)

    // <noscript> iframe fallback, per Google's canonical GTM snippet.
    const noscript = document.createElement('noscript')
    const iframe = document.createElement('iframe')
    iframe.src = `https://www.googletagmanager.com/ns.html?id=${gtmId}`
    iframe.height = '0'
    iframe.width = '0'
    iframe.style.display = 'none'
    iframe.style.visibility = 'hidden'
    noscript.appendChild(iframe)
    document.body.insertBefore(noscript, document.body.firstChild)
  })
}

// Records a single-page-app page view. No-ops when analytics is not configured.
export function trackPageview(path) {
  if (!gaId || typeof window.gtag !== 'function') return
  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  })
}
