# SEO migration — urbantoolboxes.com.au

The old site is a GoDaddy site builder page at `https://urbantoolboxes.com.au`
with years of rankings, inbound links, Google Ads traffic and a Google Business
Profile attached to it. This site replaces it **on the same domain**, which is
the single biggest thing working in our favour: same-domain replacements keep
most of their equity automatically, and no Search Console "Change of address" is
needed (that tool is only for domain moves).

Everything below is what makes the rest of it survive.

---

## What the old site published

Read from `https://urbantoolboxes.com.au/sitemap.website.xml` on 2026-07-31.
Seven URLs, and that is the complete set:

| Old URL              | New treatment        | Why                                                                                                           |
| -------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------- |
| `/`                  | same URL, 200        | —                                                                                                             |
| `/fabrication`       | same URL, 200        | Kept verbatim — an unchanged URL is the strongest possible carry-over.                                        |
| `/laser-cutting`     | same URL, 200        | Ranked separately, so it stays a real page (see below).                                                       |
| `/folding`           | same URL, 200        | Ranked separately, so it stays a real page (see below).                                                       |
| `/ute-accesories`    | 301 → `/accessories` | The misspelling Google actually indexed. Both spellings redirect.                                             |
| `/caravan-toolboxes` | 301 → `/caravans`    | Retired in the catalogue restructure; the vehicle page is its closest heir.                                   |
| `/photos`            | 301 → `/toolboxes`   | Gallery page. Redirected to the catalogue, **not** home — Google treats an irrelevant redirect as a soft 404. |

The list lives in `src/config/redirects.js` and is asserted by
`src/test/redirects.test.js`, so a future refactor can't quietly drop one.

### Why `/laser-cutting` and `/folding` are pages, not redirects

They were originally folded into `#anchors` on `/fabrication`. Google discards
the fragment, so that redirect would have merged two separately-ranking URLs —
and two distinct commercial intents ("laser cutting Dandenong", "metal folding
Melbourne") — into a single page. Keeping a ranking URL live beats redirecting
it every time. Both are now real pages with their own titles, copy and `Service`
schema (`src/pages/ServicePage.jsx`, content in `src/content/fabrication.js`).

---

## Prerendering — read this before changing the build

The old site served real HTML on every URL. This one is a Vite SPA whose
catalogue arrives from Supabase _after_ boot, so a plain `vite build` ships
`<div id="root"></div>` and nothing else. Google would eventually render it;
Bing, the Facebook/LinkedIn/WhatsApp preview bots and the AI crawlers largely
would not. **Replacing server-rendered HTML with client-only rendering is the
classic way to lose rankings in a migration.**

So `yarn build` runs `scripts/prerender.mjs`, which boots the built bundle in
headless Chrome and writes each route to `dist/<route>/index.html` — 122 pages
today (23 marketing/category + 99 products). `server.js` serves those ahead of
the SPA fallback. React still takes over on the client, so nothing about
interactivity changes; the snapshot is what crawlers and the first paint see.

Consequences worth knowing:

- **The snapshot is point-in-time.** A price or stock change made in `/admin`
  reaches visitors immediately (the client re-renders from Supabase) but only
  reaches the static HTML — and the `Product` schema in it — on the next deploy.
  **Redeploy after a significant catalogue change.**
- **Chrome is a build dependency.** `puppeteer-core` ships no browser on
  purpose. Local macOS and GitHub Actions already have one; Railway gets it from
  the root `Dockerfile`, which installs Debian's `chromium` and points
  `PUPPETEER_EXECUTABLE_PATH` at it. That Dockerfile is why the build isn't on a
  managed Railway builder: those run Ubuntu, whose `chromium` apt packages are
  snap stubs that cannot launch. Override with `PUPPETEER_EXECUTABLE_PATH` if
  needed.
- **The build fails loudly if prerendering fails.** That is deliberate — a
  silent skip would ship a build that looks fine and serves an empty shell to
  every crawler. `SKIP_PRERENDER=1` opts out explicitly.
- **Route lists must match the storefront's filters.** `scripts/routes.mjs`
  mirrors `hidden = false` from `lib/productStore.js`. When it didn't, 15 hidden
  products prerendered as "Page not found" and went into the sitemap. The
  prerenderer now fails the build if any listed route renders the 404 page.

---

## Cutover runbook

Do these in order on launch day.

### 1. Before switching DNS

- [ ] Confirm Railway has `VITE_SITE_URL=https://urbantoolboxes.com.au`. Without
      it, `sitemap.xml` and `robots.txt` ship the `https://example.com`
      placeholder.
- [ ] Confirm `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are set — the build
      needs them to enumerate product routes. Missing keys silently drop all 99
      product pages from the sitemap and the prerender.
- [ ] Confirm `VITE_GA_ID=G-SSNHCGBC00` and `VITE_GTM_ID=GTM-5LSFWFMN` (they
      also have baked-in defaults in `site.config.js`).
- [ ] Deploy and check the build log shows `122 routes + 404.html written`.

### 2. DNS + host

**Full step-by-step in [domain-migration.md](./domain-migration.md)** — it is
more involved than "point the apex at Railway": GoDaddy's DNS can't CNAME a root
domain at all, so DNS hosting has to move, and the domain's Microsoft 365 mail
records have to come with it.

- [ ] Point the apex at Railway (per `domain-migration.md`, Phases 2–3).
- [ ] **Re-create the `www` → apex 301.** GoDaddy does this today
      (`https://www.urbantoolboxes.com.au/` → `https://urbantoolboxes.com.au/`).
      If it's lost, both hostnames serve the site and the equity splits.
      `server.js` does not do this yet — see that doc's `www` section.
- [ ] Confirm HTTPS is live and HTTP 301s to it.

### 3. Verify on the live domain

```bash
# Every legacy URL — expect 301 with the query string intact
for u in /ute-accesories /ute-accessories /caravan-toolboxes /photos /trucks /contact; do
  curl -sI "https://urbantoolboxes.com.au$u?gclid=TEST" | head -2
done

# Pages that must stay 200
for u in / /fabrication /laser-cutting /folding /toolboxes /accessories; do
  curl -so /dev/null -w "$u %{http_code}\n" "https://urbantoolboxes.com.au$u"
done

# A junk URL must be a real 404, not a 200
curl -so /dev/null -w "404 check: %{http_code}\n" https://urbantoolboxes.com.au/nope

# Real HTML, not an empty shell — expect hundreds of words, not zero
curl -s https://urbantoolboxes.com.au/toolboxes | grep -c "Under Tray"

curl -s https://urbantoolboxes.com.au/robots.txt
curl -s https://urbantoolboxes.com.au/sitemap.xml | grep -c "<loc>"   # expect 122
```

- [ ] Submit the quote form and confirm the Formspree email lands.
- [ ] Paste a product URL into the Facebook Sharing Debugger and Slack — the
      card must show the product's own title and image, not the generic one.

### 4. Google

- [ ] **Search Console:** the property already exists for this domain. Do _not_
      use Change of Address — the domain isn't changing. Submit
      `https://urbantoolboxes.com.au/sitemap.xml` and re-submit it after any
      catalogue-shaped deploy.
- [ ] Use URL Inspection → "Test live URL" on `/`, `/fabrication`,
      `/laser-cutting` and one product page. Confirm the rendered HTML contains
      the real content and the right canonical.
- [ ] **Google Business Profile:** confirm the website link still points at
      `https://urbantoolboxes.com.au` (it does — same domain), and that the
      address and hours match the `LocalBusiness` schema
      (23/10 Assembly Drive, Dandenong South VIC 3175; Mon–Fri 08:00–16:30).
- [ ] **Google Ads:** the GTM container is unchanged, so conversion and
      remarketing tags carry over. Confirm a conversion fires from the live
      site. Two things to know about how the tags now load — see below.
- [ ] **Rich Results Test** on a product URL — expect `Product` with price and
      availability, plus `BreadcrumbList`.

### 5. First fortnight

- [ ] Watch Search Console → Pages for a spike in "Not found (404)" or
      "Redirect error". A legacy URL appearing there means a redirect is missing.
- [ ] Watch Performance → compare clicks/impressions week-on-week against the
      pre-launch baseline. A dip in week one is normal; it should recover.
- [ ] `site:urbantoolboxes.com.au` after ~a week — product pages should start
      appearing. There were 7 indexable URLs before; there are 122 now.

---

## Analytics: expect pageviews to differ from the old site

Two changes landed here, and both move the numbers. Read this before concluding
GA4 is broken.

**1. The tags were never loading at all.** `whenIdle()` in `lib/analytics.js`
called `requestIdleCallback` unbound and passed it `setTimeout`'s numeric delay,
which it rejects as invalid `IdleRequestOptions`. It threw on every browser that
_has_ the API — Chrome, Edge, Firefox — so gtag.js and the GTM container, and
with them the Google Ads conversion and remarketing tags, never loaded. The IDs
looked correctly wired in `site.config.js` the whole time. Fixed.

**2. The tags now load on first interaction, not on page load.** They are 638 KB
costing 529 ms of main-thread blocking on a throttled mobile profile — measured;
they were single-handedly the reason Lighthouse performance sat at 73 against a
90 gate. They now load on the first `mousemove`, `pointerdown`, `keydown`,
`touchstart`, or a scroll that leaves the top of the page.

What this means in the data:

- A visitor who loads a page and leaves **without moving a mouse, scrolling,
  tapping or typing** is not counted. In practice that's bots and mis-clicks,
  but it will read as slightly lower raw pageviews than the old site.
- Everyone else is counted normally. `window.dataLayer` is primed synchronously,
  so the `page_view` fired at boot queues and is processed the moment the script
  lands, carrying the path it was recorded against.
- Conversions are unaffected — submitting a quote form is an interaction by
  definition.
- The scroll signal deliberately ignores scrolls at the top of the page:
  `RouteChange` in `App.jsx` calls `window.scrollTo` on every navigation, and a
  programmatic scroll emits a `scroll` event with `isTrusted: true`. Nothing
  distinguishes it from a person, so it fired 77 ms after every load and made
  the deferral a silent no-op until this was handled.

If pageviews ever need to be strictly comparable to the old site, the lever is
`INTERACTIONS` / the gating in `src/lib/analytics.js` — but loading the tags
eagerly costs roughly 20 Lighthouse performance points on mobile.

---

## Where the SEO lives in the code

| Concern                                       | File                                                    |
| --------------------------------------------- | ------------------------------------------------------- |
| Per-page title / description / canonical / OG | `src/lib/seo.jsx`                                       |
| Sitewide `LocalBusiness` schema               | `src/lib/seo.jsx`                                       |
| `Product` / `BreadcrumbList` / `ItemList`     | `src/lib/schema.js`                                     |
| Legacy 301 map (+ its contract test)          | `src/config/redirects.js`, `src/test/redirects.test.js` |
| Server 301s, 404 statuses, trailing slash     | `server.js`                                             |
| Prerendering                                  | `scripts/prerender.mjs`                                 |
| Route enumeration (prerender + sitemap)       | `scripts/routes.mjs`                                    |
| `sitemap.xml` / `robots.txt` generation       | `scripts/gen-seo-files.mjs`                             |
| Chromium for the Railway build                | `Dockerfile`                                            |
