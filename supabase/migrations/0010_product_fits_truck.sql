-- Third vehicle-fit flag: /trucks flips from scope-owned (only its two truck
-- categories) to flag-sliced like /utes and /caravans. `not null default true`
-- is the whole backfill — every existing product fits trucks on apply, and the
-- admin unticks the ones that don't. Enforced app-side (the storefront filters
-- on it), matching fits_ute/fits_caravan which predate the migration files.
alter table public.products
  add column fits_truck boolean not null default true;
