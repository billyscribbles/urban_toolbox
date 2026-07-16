-- 0003: three admin additions.
--  1. `model` — optional manufacturer/model name shown on the product.
--  2. Editable product id — repoint product_images via ON UPDATE CASCADE so an
--     admin can rename a product's primary key without orphaning its photos.
--  3. `store_settings` — singleton row holding a store-wide discount % that the
--     storefront applies at display time (0 = off). Non-destructive: it never
--     touches per-product discount_pct.

alter table public.products
  add column model text not null default '';

-- Let products.id change and carry product_images.product_id along with it.
alter table public.product_images
  drop constraint product_images_product_id_fkey,
  add constraint product_images_product_id_fkey
    foreign key (product_id) references public.products(id)
    on update cascade on delete cascade;

-- Singleton settings row (id is a boolean pinned to true, so only one row can exist).
create table public.store_settings (
  id boolean primary key default true check (id),
  discount_pct numeric not null default 0
    check (discount_pct >= 0 and discount_pct < 100),
  updated_at timestamptz not null default now()
);

insert into public.store_settings (id) values (true) on conflict (id) do nothing;

create trigger store_settings_updated_at
  before update on public.store_settings
  for each row execute function public.set_updated_at();

alter table public.store_settings enable row level security;

create policy "public read store_settings" on public.store_settings
  for select using (true);
create policy "admin write store_settings" on public.store_settings
  for all to authenticated using (true) with check (true);
