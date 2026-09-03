-- =============================================================================
-- Drug auxiliary RLS + JSON seed support
--
-- Closes the live Supabase advisory where drug-adjacent tables in the exposed
-- public schema had RLS disabled. Policies keep operational catalog tables
-- admin-only, while preserving the intended mobile path where a signed-in user
-- can create/read their own unknown-drug verification request.
-- =============================================================================

alter table public.drug_import_batches enable row level security;
alter table public.drug_verification_requests enable row level security;
alter table public.drug_interaction_flags enable row level security;
alter table public.drug_body_parts enable row level security;

-- Import bookkeeping is admin operational data.
drop policy if exists "drug_import_batches_admin_all" on public.drug_import_batches;
create policy "drug_import_batches_admin_all"
  on public.drug_import_batches
  for all
  to authenticated
  using (public.is_platform_admin((select auth.uid())))
  with check (public.is_platform_admin((select auth.uid())));

-- Unknown-drug verification requests:
-- users can submit and inspect their own request; platform admins manage all.
drop policy if exists "drug_verification_requests_own_select" on public.drug_verification_requests;
create policy "drug_verification_requests_own_select"
  on public.drug_verification_requests
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_platform_admin((select auth.uid()))
  );

drop policy if exists "drug_verification_requests_own_insert" on public.drug_verification_requests;
create policy "drug_verification_requests_own_insert"
  on public.drug_verification_requests
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    or public.is_platform_admin((select auth.uid()))
  );

drop policy if exists "drug_verification_requests_admin_update" on public.drug_verification_requests;
create policy "drug_verification_requests_admin_update"
  on public.drug_verification_requests
  for update
  to authenticated
  using (public.is_platform_admin((select auth.uid())))
  with check (public.is_platform_admin((select auth.uid())));

drop policy if exists "drug_verification_requests_admin_delete" on public.drug_verification_requests;
create policy "drug_verification_requests_admin_delete"
  on public.drug_verification_requests
  for delete
  to authenticated
  using (public.is_platform_admin((select auth.uid())));

-- Interaction flags should be visible to admins only. Users can create their
-- own flag rows if the mobile AI checker later exposes this path.
drop policy if exists "drug_interaction_flags_admin_select" on public.drug_interaction_flags;
create policy "drug_interaction_flags_admin_select"
  on public.drug_interaction_flags
  for select
  to authenticated
  using (public.is_platform_admin((select auth.uid())));

drop policy if exists "drug_interaction_flags_own_insert" on public.drug_interaction_flags;
create policy "drug_interaction_flags_own_insert"
  on public.drug_interaction_flags
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    or public.is_platform_admin((select auth.uid()))
  );

drop policy if exists "drug_interaction_flags_admin_update" on public.drug_interaction_flags;
create policy "drug_interaction_flags_admin_update"
  on public.drug_interaction_flags
  for update
  to authenticated
  using (public.is_platform_admin((select auth.uid())))
  with check (public.is_platform_admin((select auth.uid())));

drop policy if exists "drug_interaction_flags_admin_delete" on public.drug_interaction_flags;
create policy "drug_interaction_flags_admin_delete"
  on public.drug_interaction_flags
  for delete
  to authenticated
  using (public.is_platform_admin((select auth.uid())));

-- Body-part drug links are curated reference data for admin/anatomy surfaces.
drop policy if exists "drug_body_parts_admin_all" on public.drug_body_parts;
create policy "drug_body_parts_admin_all"
  on public.drug_body_parts
  for all
  to authenticated
  using (public.is_platform_admin((select auth.uid())))
  with check (public.is_platform_admin((select auth.uid())));
