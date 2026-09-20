-- ROLLBACK for 20260920100000_facility_profile_rls_stopgap
-- Restores the exact policies captured from prod on 20 Sept 2026.
-- WARNING: this re-opens the holes described in the forward migration.
begin;

drop policy if exists facility_profile_select_public_active on public.facility_profile;
drop policy if exists facility_profile_select_active_or_admin on public.facility_profile;
drop policy if exists facility_profile_update_admin on public.facility_profile;
drop policy if exists facility_profile_insert_admin on public.facility_profile;

create policy "Anyone can read active facilities"
  on public.facility_profile for select to anon, authenticated
  using (true);

create policy facility_profile_select_active_or_admin
  on public.facility_profile for select to authenticated
  using (
    (lower((status)::text) = any (array['active'::text, 'approved'::text]))
    or (select is_app_admin())
    or (owner_id = (select auth.uid()))
  );

create policy "Owners manage own facility"
  on public.facility_profile for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy facility_profile_update_admin_or_owner
  on public.facility_profile for update to authenticated
  using ((select is_app_admin()) or (owner_id = (select auth.uid())))
  with check ((select is_app_admin()) or (owner_id = (select auth.uid())));

create policy "Owners insert facility"
  on public.facility_profile for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy facility_profile_insert_admin
  on public.facility_profile for insert to authenticated
  with check ((select is_app_admin()) or (owner_id = (select auth.uid())));

commit;
