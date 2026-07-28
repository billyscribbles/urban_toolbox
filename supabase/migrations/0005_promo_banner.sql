-- 0005: optional promotional banner shown above the navbar.
-- Two more columns on the existing store_settings singleton — it already has
-- `public read` / `admin write` RLS, so the banner inherits that posture and
-- needs no new policies. Messages are a jsonb array of plain strings, matching
-- the specs/features/colors precedent on products; array order is display order.
--
-- Ships DISABLED with one sample message seeded, so applying this migration
-- changes nothing on the live site until an admin turns it on.

alter table public.store_settings
  add column promo_enabled  boolean not null default false,
  add column promo_messages jsonb   not null default '[]'::jsonb;

update public.store_settings
   set promo_messages = '["30% off all Ute and Caravan Toolboxes"]'::jsonb
 where id;
