# Go-Live Checklist — Supabase catalog + /admin dashboard

The code is merged to `main` and CI-green. Products now live in Supabase; the
static catalog is gone. Work through these **in order** before the site is
publicly reachable. Items marked 🔒 are hard security gates — do not skip.

Supabase project: `jxyruzhotemmcqcrndbp` — https://supabase.com/dashboard/project/jxyruzhotemmcqcrndbp

---

## 1. Security — lock down auth (do FIRST) 🔒

RLS write policies grant full catalog + storage write to **any** authenticated
user. Supabase ships with email sign-up **on** and the anon key is public in the
browser bundle, so until sign-ups are off, a stranger could self-register and
edit/delete the whole catalog.

- [ ] 🔒 **Disable public sign-ups.** Dashboard → Authentication → Sign In / Providers → turn **off** "Allow new users to sign up".
- [ ] 🔒 **Create the admin user.** Dashboard → Authentication → Users → Add user → your email + a strong password, "Auto Confirm User" **on**.
- [ ] Verify a fresh/incognito browser cannot self-register (sign-up call is rejected).
- [ ] (Recommended, optional hardening) Gate the RLS `for all to authenticated` policies on an admin role/claim instead of mere authentication, so a future accidental sign-up can't write. Deferred by the plan; worth doing before high traffic.

## 2. Seed the catalog

Loads all 73 products + their photos into Supabase. Needs the admin user from step 1.
Until this runs, category pages render empty ranges (handled gracefully).

- [ ] Confirm `.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- [ ] Run the seed:
  ```bash
  set -a && source .env && set +a
  SEED_ADMIN_EMAIL='<admin email>' SEED_ADMIN_PASSWORD='<admin password>' node scripts/seed-catalog.mjs
  ```
  Expect `✓ <product-id> (N photos)` per product, ending `Seeded 73 products.`
- [ ] Verify counts: `select count(*) from products;` → 73; `select count(*) from product_images;` → ≥ 73.

## 3. Deploy config (Railway)

- [ ] Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Railway service env.
- [ ] Confirm existing `PORT` / 4173 domain settings still hold (see memory: railway-port-4173).
- [ ] Trigger a deploy from `main`; confirm the build passes and the site serves.

## 4. Live verification (after deploy)

- [ ] Home page: hero + category carousel render; every route works incl. `/does-not-exist` (404).
- [ ] Category pages (`/toolboxes/...`, `/accessories`) list products with photos served from `…supabase.co/storage/…`.
- [ ] Sign in at `/admin` → lands on "Catalogue admin"; wrong password shows an inline error; Sign out returns to the form.
- [ ] `/admin` is noindexed (view-source has the robots meta) and `robots.txt` disallows `/admin`.
- [ ] Edit a product: set price 450 + discount 15 → storefront card shows ~~$450~~ from $382.50 + GST + "Save 15%".
- [ ] Upload 2 photos to a product → reorder → storefront thumbnail + detail gallery update. Delete one → gone after reload.
- [ ] Create a new product (title + category only) → appears with "Enquire for pricing". Delete it → gone.
- [ ] Contact/quote form submits against the real Formspree endpoint.

## 5. Known non-blocking follow-ups (track, not gate)

From the whole-branch review — admin-only, recoverable, safe to defer. Full list:
`.superpowers/sdd/accumulated-findings.md`.

- [ ] `deleteProduct`: wrap `storage.remove()` in try/catch so a storage error doesn't abort the row delete.
- [ ] `uploadPhotos`: best-effort clean up already-uploaded files if the DB insert fails (orphan-storage prevention).
- [ ] `productStore`: preserve existing products on a failed forced `retryLoad` (don't blank an open storefront tab on a transient error).
- [ ] `CategoryOverview`: show an error/retry state on catalog fetch failure (currently stuck on "Loading range…").
- [ ] Remove dead price CSS in `Card.css` / `DetailDrawer.css` (superseded by `PriceTag`).
- [ ] Fix stale `data/catalog.js` prose comment in `App.jsx`.
