-- 0007: restore the missing SELECT policy on storage.objects.
--
-- 0001_catalog.sql declares four policies for the `product-photos` bucket, but
-- only INSERT/UPDATE/DELETE ever made it into the live database — the SELECT
-- one was absent. Nobody noticed because the bucket is public, so storefront
-- reads go through the CDN path and never consult RLS.
--
-- Deletes DID notice. Supabase Storage resolves `remove()` by first SELECTing
-- the matching objects under RLS; with no SELECT policy the query matched
-- nothing, so every delete returned `200 []` and silently left its files
-- behind. That is how ~46 orphaned product masters accumulated before this was
-- caught (adminApi's storage removes are best-effort by design, so the no-op
-- never surfaced an error).
--
-- Guarded so it is a no-op on any environment where 0001 applied in full.

do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'storage'
       and tablename  = 'objects'
       and policyname = 'public read product photos'
  ) then
    create policy "public read product photos" on storage.objects
      for select using (bucket_id = 'product-photos');
  end if;
end $$;
