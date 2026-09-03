-- =============================================================================
-- HCP digital CV RLS
--
-- Closes the remaining public-schema RLS advisory for hcp_digital_cvs.
-- The table stores metadata-only CV settings used by jobs/open-to-offers.
-- Users own their CV metadata; platform admins manage the operational registry.
-- =============================================================================

alter table public.hcp_digital_cvs enable row level security;

drop policy if exists "hcp_digital_cvs_own_select" on public.hcp_digital_cvs;
create policy "hcp_digital_cvs_own_select"
  on public.hcp_digital_cvs
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_platform_admin((select auth.uid()))
  );

drop policy if exists "hcp_digital_cvs_own_insert" on public.hcp_digital_cvs;
create policy "hcp_digital_cvs_own_insert"
  on public.hcp_digital_cvs
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    or public.is_platform_admin((select auth.uid()))
  );

drop policy if exists "hcp_digital_cvs_own_update" on public.hcp_digital_cvs;
create policy "hcp_digital_cvs_own_update"
  on public.hcp_digital_cvs
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_platform_admin((select auth.uid()))
  )
  with check (
    user_id = (select auth.uid())
    or public.is_platform_admin((select auth.uid()))
  );

drop policy if exists "hcp_digital_cvs_admin_delete" on public.hcp_digital_cvs;
create policy "hcp_digital_cvs_admin_delete"
  on public.hcp_digital_cvs
  for delete
  to authenticated
  using (public.is_platform_admin((select auth.uid())));
