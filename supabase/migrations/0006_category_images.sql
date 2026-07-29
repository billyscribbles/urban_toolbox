-- 0006: standalone photos for the home carousel's category tiles.
-- One optional photo per category. The tile is NOT tied to a product — this is
-- an image the admin uploads directly. When no row exists, the storefront falls
-- back to the first product in that category (see lib/catalog.js).
--
-- category_id matches an id in src/data/categories.js. Validated app-side, not
-- by FK — categories live in code, not the DB (same convention as
-- products.category_id).
--
-- Files land in the existing `product-photos` bucket under a `categories/`
-- prefix, so no new bucket or storage policy is needed.

create table public.category_images (
  category_id  text primary key,
  storage_path text not null,
  updated_at   timestamptz not null default now()
);

create trigger category_images_updated_at
  before update on public.category_images
  for each row execute function public.set_updated_at();

alter table public.category_images enable row level security;

create policy "public read category_images" on public.category_images
  for select using (true);
create policy "admin write category_images" on public.category_images
  for all to authenticated using (true) with check (true);
