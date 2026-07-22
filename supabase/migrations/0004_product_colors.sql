-- 0004: per-product colour availability.
-- A product can be offered in Silver / White / Black (see src/data/colors.js for
-- the canonical vocabulary). `colors` holds an array of enabled colour keys,
-- e.g. ["silver","black"]. Default '[]' means "no colours marked" → the
-- storefront shows no colour selector. Values are validated app-side (like
-- category_id), so no enum/FK is enforced here.

alter table public.products
  add column colors jsonb not null default '[]';
