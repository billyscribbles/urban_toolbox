-- Availability flag: lets an admin mark a product as back-order rather than
-- in stock. `not null default true` is the whole backfill — every existing row
-- becomes in stock on apply. Enforced app-side (the storefront renders a badge
-- from it), matching the convention from 0001/0002.
--
-- Unlike `hidden`, nothing filters on this column: a back-order product is
-- still listed, still priced, and still quotable. Only its badge changes.
alter table public.products
  add column in_stock boolean not null default true;
