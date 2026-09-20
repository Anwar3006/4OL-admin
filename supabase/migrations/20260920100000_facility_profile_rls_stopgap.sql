-- ============================================================================
-- P0-02 · facility_profile RLS stop-gap (PLAN.md P0-02)
-- ============================================================================
--
-- Before this migration (checked on prod 20 Sept 2026):
--   SELECT "Anyone can read active facilities"   TO anon, authenticated  USING (true)
--          → every row (pending/rejected too) and every column, including
--            owner_email, person_contact_number, admin_notes,
--            verification_documents, readable by anyone with the anon key.
--   UPDATE "Owners manage own facility"           owner_id = auth.uid()
--   UPDATE facility_profile_update_admin_or_owner is_app_admin() OR owner
--          → an owner could set status='active', is_featured, is_top_rated,
--            subscription_tier, approved_by on their own row.
--   INSERT "Owners insert facility"               owner_id = auth.uid()
--   INSERT facility_profile_insert_admin          is_app_admin() OR owner
--          → any signed-in user could create a facility with any status.
--
-- After:
--   anon            SELECT  status = 'active' only
--   authenticated   SELECT  active/approved, OR own (owner_id), OR registered by
--                           me (submitted_by — registrars), OR admin, OR staff
--                           holding the facilities.view permission (the admin
--                           console reads through the browser client)
--   authenticated   INSERT / UPDATE  admins only (is_app_admin()).
--   DELETE and the super_admin ALL policy are unchanged.
--
-- Who still writes, and why they're unaffected:
--   - Admin console writes use getAdminClient() (service role, bypasses RLS)
--     or SECURITY DEFINER RPCs (register_facility_with_profile,
--     admin_update_facility_profile, admin_change_facility_status,
--     registrar_update_own_facility …).
--   - The mobile app never writes facility_profile (checked 20 Sept).
--   - Owners get a safe edit path in P0-10 (update_my_provider RPC).
--
-- Still open until P0-10: active rows expose owner PII columns to anon.
-- The permanent fix moves those columns to provider_private.
-- ============================================================================

-- ── SELECT ──────────────────────────────────────────────────────────────────
drop policy if exists "Anyone can read active facilities" on public.facility_profile;

create policy facility_profile_select_public_active
  on public.facility_profile
  for select
  to anon
  using (status = 'active');

drop policy if exists facility_profile_select_active_or_admin on public.facility_profile;
create policy facility_profile_select_active_or_admin
  on public.facility_profile
  for select
  to authenticated
  using (
    lower(status::text) = any (array['active', 'approved'])
    or owner_id = (select auth.uid())
    or submitted_by = (select auth.uid())
    or (select public.is_app_admin())
    or (select public.has_4ol_permission((select auth.uid()), 'facilities.view'))
  );

-- ── UPDATE: admins only ────────────────────────────────────────────────────
drop policy if exists "Owners manage own facility" on public.facility_profile;
drop policy if exists facility_profile_update_admin_or_owner on public.facility_profile;
create policy facility_profile_update_admin
  on public.facility_profile
  for update
  to authenticated
  using ((select public.is_app_admin()))
  with check ((select public.is_app_admin()));

-- ── INSERT: admins only ────────────────────────────────────────────────────
drop policy if exists "Owners insert facility" on public.facility_profile;
drop policy if exists facility_profile_insert_admin on public.facility_profile;
create policy facility_profile_insert_admin
  on public.facility_profile
  for insert
  to authenticated
  with check ((select public.is_app_admin()));
