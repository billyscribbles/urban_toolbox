-- Product catalog behind the /admin dashboard.
-- Categories stay in code (src/data/categories.js); category_id must match a
-- leaf id there — enforced app-side, not by FK.

create table public.products (
  id text primary key,
  category_id text not null,
  title text not null,
  slug text not null unique,
  summary text not null default '',
  specs jsonb not null default '[]',
  features jsonb not null default '[]',
  price numeric(10,2) check (price is null or price >= 0),
  discount_pct numeric check (discount_pct is null or (discount_pct > 0 and discount_pct < 100)),
  standard_dims text not null default '',
  featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt text not null default '',
  position integer not null default 0
);

create index product_images_product_idx on public.product_images (product_id, position);

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

alter table public.products enable row level security;
alter table public.product_images enable row level security;

create policy "public read products" on public.products
  for select using (true);
create policy "admin write products" on public.products
  for all to authenticated using (true) with check (true);

create policy "public read product_images" on public.product_images
  for select using (true);
create policy "admin write product_images" on public.product_images
  for all to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true)
on conflict (id) do nothing;

create policy "public read product photos" on storage.objects
  for select using (bucket_id = 'product-photos');
create policy "admin insert product photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-photos');
create policy "admin update product photos" on storage.objects
  for update to authenticated using (bucket_id = 'product-photos');
create policy "admin delete product photos" on storage.objects
  for delete to authenticated using (bucket_id = 'product-photos');
