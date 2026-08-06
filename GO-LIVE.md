# Go-Live Checklist — Urban Toolboxes

Outstanding items to finish before this site is launched. Created during the
June 2026 catalogue restructure (Caravan / Utes / Trucks). Tick these off, then
run the full verification pass at the bottom.

## 1. Hero — AI renders (blocking, visual)

The home hero is a **split-4** layout (2 caravans + 2 utes). The two **caravan**
tiles currently reuse the previous single hero photo; the two **ute** tiles
render clean labelled **placeholders**.

- [ ] Generate/collect the **2 ute** (and ideally 2 fresh **caravan**) lifestyle
      renders (the "AI work").
- [ ] Add them to `public/images/` and set the paths in
      `src/content/hero.js` → `hero.quads[].img` (top two = caravans, bottom two = utes).
- Recommended size: ≥1200×900, landscape, similar lighting/angle for a consistent grid.

## 2. Formspree (blocking, functional)

- [ ] Create the quote form at [formspree.io](https://formspree.io) and paste its ID
      into `.env` → `VITE_FORMSPREE_ID` (currently the placeholder
      `your_formspree_form_id_here`). Until then the quote page shows the
      call/email fallback instead of the form.
- [ ] Set the same var in the Railway environment for production.

## 3. New-product images (quality pass)

The **caravan** boxes and the **23 toolbox/canopy renders** (Utes → Toolboxes,
Trucks, Canopies) use the client's own clean renders — good to ship.

The **Trays (A–D)**, **Canopies (Tourer/Combo)**, **Service Body** and
**Accessories** images were extracted from the Hofast supplier PDFs. They're
usable but some carry blurred plates/logos and vary in framing.

- [ ] Replace the PDF-extracted images with clean supplier product shots where
      available (files: `public/images/ute-tray-*.jpg`, `ute-canopy*.jpg`,
      `ute-service-body.jpg`, `acc-*.jpg`).

## 4. Pricing

- New products all show **"Enquire for pricing"** + the Get-a-Quote CTA (per brief).
- [ ] If real prices are wanted on any new products, append them to the `body`
      line in `src/content/utes.js` / `trucks.js` (same `· $X + GST` style as the
      caravan boxes).

## 5. Category mapping confirmation

- [ ] Confirm the split of the 23 toolbox renders between **Utes → Toolboxes**
      (tray-top chests) and **Trucks → Tool Boxes / Under-Tray** (full-height +
      tapered). Reassign any in `src/content/utes.js` / `trucks.js` if needed —
      it's just moving a product object between files.

## 6. SEO / meta

The migration off the old GoDaddy site is handled end to end — full detail,
including the launch-day runbook, in **[docs/seo-migration.md](docs/seo-migration.md)**.
Summary of what's already done:

- [x] `sitemap.xml` is now **generated** at build from the category tree + the
      live Supabase catalogue (122 URLs, was a hand-written 18 that omitted every
      product page). Never needs manual editing again.
- [x] All 7 old-site URLs accounted for — `/fabrication`, `/laser-cutting` and
      `/folding` keep their exact URLs as real pages; the rest 301 with the query
      string preserved. Asserted by `src/test/redirects.test.js`.
- [x] Every route prerendered to real HTML (`scripts/prerender.mjs`) — the site
      no longer serves an empty shell to crawlers.
- [x] `og-image.jpg` confirmed a real 1200×630 JPEG.
- [ ] Work through the cutover runbook in `docs/seo-migration.md` on launch day —
      the `www` → apex 301 and the Search Console sitemap submission are the two
      items that can only be done against the live domain.

## 6b. Domain cutover — GoDaddy → Railway

The DNS/hosting half of go-live, including the GoDaddy account steps, is in
**[docs/domain-migration.md](docs/domain-migration.md)**. Three blockers are
called out there and all are open as of 2026-07-31:

- [ ] 🔴 **The Railway build is failing.** Every deploy since `716007c` errored in
      the prerender step (Chromium isn't resolving on the Railway image), so the
      live app is a stale pre-SEO build. Nothing else can proceed until this is
      green.
- [ ] 🔴 **DNS hosting must move off GoDaddy.** GoDaddy can't point a root domain
      at Railway — no CNAME flattening, no ALIAS. Cloudflare (free) is the
      recommended host; registration stays at GoDaddy.
- [ ] 🔴 **Carry the Microsoft 365 mail records across.** MX, both TXT records,
      `autodiscover`, `lyncdiscover` and `sip`. Miss them and company email
      stops.

## 7. Final verification (run before declaring done)

```
yarn lint && yarn format:check
yarn test
yarn build && yarn preview
```

- [ ] Lighthouse on `yarn preview` home page: perf ≥ 90, SEO ≥ 95, a11y ≥ 90.
- [ ] Walk every route incl. `/utes`, `/trucks`, section sub-nav jumps, and `/does-not-exist`.
- [ ] Submit the quote form against the real Formspree endpoint.
- [ ] Check 375 / 768 / 1280px — hero grid, sub-nav pills, product grids, footer.
- [ ] Deploy via the `railway-deploy` skill, then re-verify routes + form on the live domain.
