-- ============================================================================
-- Mobile contract fixes for the Plasence native integration (PLB-002, PLB-004)
--
-- Reconstructed 9 Sept 2026 from supabase_migrations.schema_migrations: this
-- migration is live in the project's history (applied 14 Aug 2026) but had
-- no corresponding file in this repo's local supabase/migrations/ checkout —
-- discovered while investigating what turned out to be a non-existent
-- period_cycles owner-write RLS gap during the Plasence Phase 0 trust-repair
-- work (see 20260909_period_phase0_trust_repair.sql). Content below is
-- pulled verbatim from the live statements column; nothing here is re-run,
-- it documents what's already applied. The local migrations directory
-- should be treated as potentially incomplete relative to production beyond
-- this one file.
-- ============================================================================

-- PLB-002: dedicated personalization consent type, separate from
-- marketing/research, so the Library API can gate symptom/phase-based
-- ranking on an explicit opt-in rather than repurposing another consent.
alter table public.period_consent_events
  drop constraint period_consent_events_consent_type_check;
alter table public.period_consent_events
  add constraint period_consent_events_consent_type_check
  check (consent_type in ('tracking','notifications','marketing','research_analytics','personalization'));

-- PLB-004: onboarding's "confirm period start" needs to create a
-- period_cycles row as the signed-in owner (previously admin-only insert,
-- since no owner-facing write path existed yet when RLS was first wired).
drop policy if exists owner_read on public.period_cycles;
create policy owner_read on public.period_cycles
  for select to authenticated using (
    public.is_app_admin() or user_id = (select auth.uid())
  );
drop policy if exists admin_insert on public.period_cycles;
drop policy if exists owner_insert on public.period_cycles;
create policy owner_insert on public.period_cycles
  for insert to authenticated with check (
    public.is_app_admin() or user_id = (select auth.uid())
  );
drop policy if exists admin_update on public.period_cycles;
drop policy if exists owner_update on public.period_cycles;
create policy owner_update on public.period_cycles
  for update to authenticated using (
    public.is_app_admin() or user_id = (select auth.uid())
  ) with check (
    public.is_app_admin() or user_id = (select auth.uid())
  );
-- delete stays admin-only: a user corrects cycle data via
-- period_cycle_revisions (reviewed), never a raw delete.
drop policy if exists admin_delete on public.period_cycles;
create policy admin_delete on public.period_cycles
  for delete to authenticated using (public.is_app_admin());
