// Opt-in Google Analytics 4 wiring. Every function here is a no-op unless
// `integrations.gaId` is set (via VITE_GA_ID) — clients who skip analytics
// ship no gtag script and no tracking calls.

import { site } from '../config/site.config.js'

const gaId = site.integrations.gaId
const gtmId = site.integrations.gtmId

let initialized = false
let gtmInitialized = false

// How long to wait for an interaction before loading the tags anyway.
const TAG_DELAY_MS = 5000

const INTERACTIONS = ['pointerdown', 'keydown', 'scroll', 'touchstart']

// Runs `fn` on the visitor's first interaction, or TAG_DELAY_MS after load —
// whichever comes first, and only ever once.
//
// Google's tags are ~640 KB of third-party JavaScript that cost 776 ms of main-
// thread blocking on a throttled mobile run — measured, not estimated: they are
// the entire reason Total Blocking Time was 600 ms and the Lighthouse
// performance score sat at 73. Loading them during the initial page load makes
// the site materially slower for every visitor, so we hold them until the
// visitor does something (which is also when they stop being a bounce) or until
// five seconds have passed.
//
// Nothing is lost by waiting. Both tags read from `window.dataLayer`, which is
// primed synchronously below, so page_view events fired before the script lands
// queue up and are processed the moment it arrives — with the path they were
// recorded against, not the one the user has since navigated to.
//
// Note this deliberately does NOT fire for a visitor who lands and leaves
// within five seconds without touching anything. That is the accepted trade:
// it keeps 640 KB off the critical path for everyone else.
function whenIdle(fn) {
  let fired = false
  let timer = null

  const trigger = () => {
    if (fired) return
    fired = true
    window.clearTimeout(timer)
    for (const event of INTERACTIONS) window.removeEventListener(event, trigger, true)
    fn()
  }

  const arm = () => {
    // `passive` because scroll/touchstart listeners block scrolling otherwise;
    // `capture` so a handler calling stopPropagation can't hide the event.
    for (const event of INTERACTIONS) {
      window.addEventListener(event, trigger, { once: true, passive: true, capture: true })
    }
    timer = window.setTimeout(trigger, TAG_DELAY_MS)
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
