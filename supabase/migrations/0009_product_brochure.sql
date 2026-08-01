-- One optional PDF brochure per product, downloadable from the product page.
-- Nullable with no default: every existing row starts with no brochure, which
-- is the correct state, so there is no backfill.
--
-- No new table — a single optional file is a property of the product, not a
-- collection. No storage changes either: files go in the existing public
-- `product-photos` bucket under a `brochures/` prefix, exactly as 0006 put
-- category tiles under `categories/`. That bucket has no MIME or size
-- restriction, and its SELECT policy (restored in 0007) is what makes
-- storage remove() actually delete instead of silently no-opping.
alter table public.products
  add column brochure_path text;
