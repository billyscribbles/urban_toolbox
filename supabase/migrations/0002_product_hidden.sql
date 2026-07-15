-- Visibility flag: lets an admin hide a product from the public storefront
-- without deleting it. Existing rows default to visible. Enforced app-side
-- (storefront query filters hidden; admin still reads all rows), matching the
-- category-in-code convention from 0001.
alter table public.products
  add column hidden boolean not null default false;
