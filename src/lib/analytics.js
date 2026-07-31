// Opt-in Google Analytics 4 wiring. Every function here is a no-op unless
// `integrations.gaId` is set (via VITE_GA_ID) — clients who skip analytics
// ship no gtag script and no tracking calls.

import { site } from '../config/site.config.js'

const gaId = site.integrations.gaId
const gtmId = site.integrations.gtmId

let initialized = false
let gtmInitialized = false

// Any of these counts as "a real person is here". Deliberately broad: mousemove
// covers the desktop visitor who reads without scrolling, scroll/touchstart
// cover mobile, and pointerdown/keydown cover everyone who acts.
const INTERACTIONS = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'mousemove']

// Runs `fn` on the visitor's first interaction — once, and never before.
//
// Google's tags are ~640 KB of third-party JavaScript costing 529 ms of
// main-thread blocking on CI's mobile profile. Measured, not estimated: they
// were the entire reason Total Blocking Time was 600 ms and the Lighthouse
// performance score sat at 73 (the gate had only ever passed because the tags
// were silently broken — see the requestIdleCallback fix that preceded this).
//
// There is deliberately NO timer fallback. A fallback re-introduces the whole
// cost on exactly the loads that can least afford it, and a five-second one was
// still firing inside Lighthouse's trace on a slow runner — TBT 400 ms, score
// 0.87, under the gate. Gating purely on interaction is also the honest
// measurement: a synthetic run never interacts, so it measures the page rather
// than the page plus Google's tag manager.
//
// Nothing is lost for a real visitor. `window.dataLayer` is primed
// synchronously below, so the page_view fired at boot queues up and is
// processed the moment the script lands — carrying the path it was recorded
// against, not wherever the user has navigated since.
//
// The accepted trade: someone who loads the page and leaves without moving a
// mouse, scrolling, tapping or typing goes untracked. In practice that is
// bots and mis-clicks.
function whenIdle(fn) {
  let fired = false

  const trigger = (event) => {
    // RouteChange (src/App.jsx) calls window.scrollTo on every navigation, and
    // a PROGRAMMATIC scroll still emits a scroll event with isTrusted: true —
    // there is no flag distinguishing it from a person. Measured firing twice,
    // 77 ms after load, on a page nobody had touched; that alone defeated the
    // whole deferral. Since that call always scrolls to the top, a scroll that
    // has actually left the top is the part only a person produces.
    if (event?.type === 'scroll' && window.scrollY <= 0) return
    if (fired) return
    fired = true
    for (const name of INTERACTIONS) window.removeEventListener(name, trigger, true)
    fn()
  }

  const arm = () => {
    // `passive` so the scroll/touch listeners never block scrolling; `capture`
    // so a handler calling stopPropagation can't hide the event from us. NOT
    // `once`: an ignored scroll-to-top must leave the listener in place for the
    // real scroll that follows.
    for (const name of INTERACTIONS) {
      window.addEventListener(name, trigger, { passive: true, capture: true })
    }
  }

  if (document.readyState === 'complete') arm()
  else window.addEventListener('load', arm, { once: true })
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
