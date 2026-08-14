-- ============================================================================
-- Period Tracker RLS hardening
-- ============================================================================
-- Completes RLS coverage left unfinished by 20260814_period_tracker_full_schema.sql.
-- Supabase's security advisor flagged:
--   - 7 tables with RLS fully disabled while exposed on the public API
--     (period_cycles, period_consent_events, period_notes, period_campaigns,
--      period_symptom_logs, period_ai_model_metrics, period_content)
--   - 10 tables with RLS enabled but zero policies (default-deny)
--   - 13 policies using bare auth.uid() (re-evaluated per row; wrapped as
--     `(select auth.uid())` so the planner caches it once per statement)
--   - 12 tables with two overlapping permissive policies for the same
--     command (admin_access + an owner policy both matching authenticated
--     SELECT/INSERT/etc.) — merged into one policy per command instead.
--
-- Ownership/scope below is derived from how the ported API routes actually
-- query each table (getSupabaseAdmin = service role, bypasses RLS entirely;
-- getSupabaseServerClient = session-scoped, subject to RLS), not guessed.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enable RLS on tables the advisor flagged as fully unprotected
-- ---------------------------------------------------------------------------
alter table public.period_cycles enable row level security;
alter table public.period_consent_events enable row level security;
alter table public.period_notes enable row level security;
alter table public.period_campaigns enable row level security;
alter table public.period_symptom_logs enable row level security;
alter table public.period_ai_model_metrics enable row level security;
alter table public.period_content enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Admin-only tables (no session-client access anywhere in the ported
--    routes; every read/write for these goes through getSupabaseAdmin()).
-- ---------------------------------------------------------------------------
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'period_notes','period_campaigns','period_symptom_logs','period_ai_model_metrics',
    'period_content_sources','period_ai_jobs','period_trivia_submissions','period_trivia_leads',
    'period_content_publications','period_content_collections','period_content_collection_items',
    'period_source_documents','period_source_chunks','period_source_embeddings'
  ] loop
    execute format('drop policy if exists admin_access on public.%I', table_name);
    execute format(
      'create policy admin_access on public.%I for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin())',
      table_name
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Owner + admin tables where both sides need "for all" — merge into one
--    policy per table instead of two overlapping ones (fixes
--    multiple_permissive_policies and auth_rls_initplan together).
-- ---------------------------------------------------------------------------
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'period_user_settings','period_daily_logs','period_forecasts',
    'period_notification_preferences','period_trivia_attempts','period_privacy_requests',
    'period_content_events','period_ai_recommendations','period_content_bookmarks',
    'period_content_progress'
  ] loop
    execute format('drop policy if exists admin_access on public.%I', table_name);
    execute format('drop policy if exists owner_access on public.%I', table_name);
    execute format('drop policy if exists owner_period_content_events on public.%I', table_name);
    execute format('drop policy if exists period_recommendations_owner on public.%I', table_name);
    execute format('drop policy if exists owner_period_content_bookmarks on public.%I', table_name);
    execute format('drop policy if exists owner_period_content_progress on public.%I', table_name);
    execute format('drop policy if exists owner_or_admin on public.%I', table_name);
    execute format(
      'create policy owner_or_admin on public.%I for all to authenticated using (public.is_app_admin() or user_id = (select auth.uid())) with check (public.is_app_admin() or user_id = (select auth.uid()))',
      table_name
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4. period_cycles: owner reads their own cycles only (GET /api/period/me,
--    and the before-values snapshot in request_correction); all writes go
--    through the admin/service-role client or the review_period_cycle_revision
--    RPC, never a direct owner mutation.
-- ---------------------------------------------------------------------------
drop policy if exists owner_read on public.period_cycles;
create policy owner_read on public.period_cycles
  for select to authenticated using (
    public.is_app_admin() or user_id = (select auth.uid())
  );
drop policy if exists admin_insert on public.period_cycles;
create policy admin_insert on public.period_cycles
  for insert to authenticated with check (public.is_app_admin());
drop policy if exists admin_update on public.period_cycles;
create policy admin_update on public.period_cycles
  for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
drop policy if exists admin_delete on public.period_cycles;
create policy admin_delete on public.period_cycles
  for delete to authenticated using (public.is_app_admin());

-- ---------------------------------------------------------------------------
-- 5. period_consent_events: append-only consent log. Owner reads and inserts
--    their own rows (GET + POST record_consent in /api/period/me); never
--    updated or deleted by anyone but admin.
-- ---------------------------------------------------------------------------
drop policy if exists owner_read on public.period_consent_events;
create policy owner_read on public.period_consent_events
  for select to authenticated using (
    public.is_app_admin() or user_id = (select auth.uid())
  );
drop policy if exists owner_insert on public.period_consent_events;
create policy owner_insert on public.period_consent_events
  for insert to authenticated with check (
    public.is_app_admin() or user_id = (select auth.uid())
  );
drop policy if exists admin_update on public.period_consent_events;
create policy admin_update on public.period_consent_events
  for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
drop policy if exists admin_delete on public.period_consent_events;
create policy admin_delete on public.period_consent_events
  for delete to authenticated using (public.is_app_admin());

-- ---------------------------------------------------------------------------
-- 6. period_content: merge the existing published-read policy with admin
--    into one SELECT policy; writes stay admin-only (content is authored
--    and reviewed in the admin panel, never by the reading user).
-- ---------------------------------------------------------------------------
drop policy if exists published_period_content on public.period_content;
drop policy if exists content_read on public.period_content;
create policy content_read on public.period_content
  for select to authenticated using (
    public.is_app_admin()
    or (status = 'published' and (published_at is null or published_at <= now()))
  );
drop policy if exists admin_insert on public.period_content;
create policy admin_insert on public.period_content
  for insert to authenticated with check (public.is_app_admin());
drop policy if exists admin_update on public.period_content;
create policy admin_update on public.period_content
  for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
drop policy if exists admin_delete on public.period_content;
create policy admin_delete on public.period_content
  for delete to authenticated using (public.is_app_admin());

-- ---------------------------------------------------------------------------
-- 7. period_trivia_questions: merge published-read with admin into one
--    SELECT policy; writes admin-only.
-- ---------------------------------------------------------------------------
drop policy if exists admin_access on public.period_trivia_questions;
drop policy if exists published_period_trivia on public.period_trivia_questions;
drop policy if exists questions_read on public.period_trivia_questions;
create policy questions_read on public.period_trivia_questions
  for select to authenticated using (
    public.is_app_admin()
    or (status = 'published' and (published_at is null or published_at <= now()))
  );
drop policy if exists admin_insert on public.period_trivia_questions;
create policy admin_insert on public.period_trivia_questions
  for insert to authenticated with check (public.is_app_admin());
drop policy if exists admin_update on public.period_trivia_questions;
create policy admin_update on public.period_trivia_questions
  for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
drop policy if exists admin_delete on public.period_trivia_questions;
create policy admin_delete on public.period_trivia_questions
  for delete to authenticated using (public.is_app_admin());

-- ---------------------------------------------------------------------------
-- 8. period_feature_flags: merge enabled-read with admin into one SELECT
--    policy; writes admin-only (rollout changes are audited admin actions).
-- ---------------------------------------------------------------------------
drop policy if exists admin_access on public.period_feature_flags;
drop policy if exists enabled_period_feature_flags_read on public.period_feature_flags;
drop policy if exists flags_read on public.period_feature_flags;
create policy flags_read on public.period_feature_flags
  for select to authenticated using (public.is_app_admin() or enabled = true);
drop policy if exists admin_insert on public.period_feature_flags;
create policy admin_insert on public.period_feature_flags
  for insert to authenticated with check (public.is_app_admin());
drop policy if exists admin_update on public.period_feature_flags;
create policy admin_update on public.period_feature_flags
  for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
drop policy if exists admin_delete on public.period_feature_flags;
create policy admin_delete on public.period_feature_flags
  for delete to authenticated using (public.is_app_admin());

-- ---------------------------------------------------------------------------
-- 9. period_notification_events: merge owner-read with admin into one
--    SELECT policy; writes admin-only (delivery events are system-recorded).
-- ---------------------------------------------------------------------------
drop policy if exists admin_access on public.period_notification_events;
drop policy if exists owner_period_notification_events_read on public.period_notification_events;
drop policy if exists notification_events_read on public.period_notification_events;
create policy notification_events_read on public.period_notification_events
  for select to authenticated using (
    public.is_app_admin() or user_id = (select auth.uid())
  );
drop policy if exists admin_insert on public.period_notification_events;
create policy admin_insert on public.period_notification_events
  for insert to authenticated with check (public.is_app_admin());
drop policy if exists admin_update on public.period_notification_events;
create policy admin_update on public.period_notification_events
  for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
drop policy if exists admin_delete on public.period_notification_events;
create policy admin_delete on public.period_notification_events
  for delete to authenticated using (public.is_app_admin());

-- ---------------------------------------------------------------------------
-- 10. period_app_events: owner inserts their own events (POST app_event in
--     /api/period/me); the user never reads them back, only admin does.
-- ---------------------------------------------------------------------------
drop policy if exists admin_access on public.period_app_events;
drop policy if exists owner_period_app_events_insert on public.period_app_events;
drop policy if exists admin_read on public.period_app_events;
create policy admin_read on public.period_app_events
  for select to authenticated using (public.is_app_admin());
drop policy if exists owner_insert on public.period_app_events;
create policy owner_insert on public.period_app_events
  for insert to authenticated with check (
    public.is_app_admin() or user_id = (select auth.uid())
  );
drop policy if exists admin_update on public.period_app_events;
create policy admin_update on public.period_app_events
  for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
drop policy if exists admin_delete on public.period_app_events;
create policy admin_delete on public.period_app_events
  for delete to authenticated using (public.is_app_admin());

-- ---------------------------------------------------------------------------
-- 11. period_cycle_revisions: owner reads their own correction requests and
--     files new ones (request_correction in /api/period/me); review/decide
--     goes through the review_period_cycle_revision() RPC (service role) or
--     admin directly.
-- ---------------------------------------------------------------------------
drop policy if exists admin_access on public.period_cycle_revisions;
drop policy if exists owner_read_revisions on public.period_cycle_revisions;
drop policy if exists revisions_read on public.period_cycle_revisions;
create policy revisions_read on public.period_cycle_revisions
  for select to authenticated using (
    public.is_app_admin() or user_id = (select auth.uid())
  );
drop policy if exists owner_create_revisions on public.period_cycle_revisions;
create policy revisions_insert on public.period_cycle_revisions
  for insert to authenticated with check (
    public.is_app_admin()
    or (user_id = (select auth.uid()) and requested_by = (select auth.uid()))
  );
drop policy if exists admin_update on public.period_cycle_revisions;
create policy admin_update on public.period_cycle_revisions
  for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
drop policy if exists admin_delete on public.period_cycle_revisions;
create policy admin_delete on public.period_cycle_revisions
  for delete to authenticated using (public.is_app_admin());

-- ---------------------------------------------------------------------------
-- 12. period_trivia_events: not flagged by the advisor (already has exactly
--     one policy), but had no admin oversight policy at all — add one so
--     admin has RLS-level access consistent with every other table here,
--     without touching the existing authenticated-read policy.
-- ---------------------------------------------------------------------------
drop policy if exists admin_access on public.period_trivia_events;
create policy admin_access on public.period_trivia_events
  for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());

-- ============================================================================
-- 13. Missing foreign-key covering indexes (performance advisor: 50 FKs
--     without an index, which forces a sequential scan on the referenced
--     side of every delete/update cascade check).
-- ============================================================================
create index if not exists idx_period_ai_jobs_requested_by on public.period_ai_jobs(requested_by);
create index if not exists idx_period_app_events_user_id on public.period_app_events(user_id);
create index if not exists idx_period_campaigns_approved_by on public.period_campaigns(approved_by);
create index if not exists idx_period_campaigns_created_by on public.period_campaigns(created_by);
create index if not exists idx_period_consent_events_user_id on public.period_consent_events(user_id);
create index if not exists idx_period_content_ai_job_id on public.period_content(ai_job_id);
create index if not exists idx_period_content_created_by on public.period_content(created_by);
create index if not exists idx_period_content_reviewed_by on public.period_content(reviewed_by);
create index if not exists idx_period_content_bookmarks_content_id on public.period_content_bookmarks(content_id);
create index if not exists idx_period_content_collection_items_added_by on public.period_content_collection_items(added_by);
create index if not exists idx_period_content_collection_items_content_id on public.period_content_collection_items(content_id);
create index if not exists idx_period_content_collections_created_by on public.period_content_collections(created_by);
create index if not exists idx_period_content_collections_reviewed_by on public.period_content_collections(reviewed_by);
create index if not exists idx_period_content_events_content_id on public.period_content_events(content_id);
create index if not exists idx_period_content_events_user_id on public.period_content_events(user_id);
create index if not exists idx_period_content_progress_content_id on public.period_content_progress(content_id);
create index if not exists idx_period_content_publications_published_by on public.period_content_publications(published_by);
create index if not exists idx_period_content_sources_linked_by on public.period_content_sources(linked_by);
create index if not exists idx_period_cycle_revisions_cycle_id on public.period_cycle_revisions(cycle_id);
create index if not exists idx_period_cycle_revisions_requested_by on public.period_cycle_revisions(requested_by);
create index if not exists idx_period_cycle_revisions_reviewed_by on public.period_cycle_revisions(reviewed_by);
create index if not exists idx_period_cycle_revisions_user_id on public.period_cycle_revisions(user_id);
create index if not exists idx_period_cycles_created_by on public.period_cycles(created_by);
create index if not exists idx_period_daily_logs_cycle_id on public.period_daily_logs(cycle_id);
create index if not exists idx_period_feature_flags_updated_by on public.period_feature_flags(updated_by);
create index if not exists idx_period_forecasts_cycle_id on public.period_forecasts(cycle_id);
create index if not exists idx_period_notes_assigned_to on public.period_notes(assigned_to);
create index if not exists idx_period_notes_cycle_id on public.period_notes(cycle_id);
create index if not exists idx_period_notes_reviewed_by on public.period_notes(reviewed_by);
create index if not exists idx_period_notes_user_id on public.period_notes(user_id);
create index if not exists idx_period_notification_events_campaign_id on public.period_notification_events(campaign_id);
create index if not exists idx_period_notification_events_user_id on public.period_notification_events(user_id);
create index if not exists idx_period_privacy_requests_assigned_to on public.period_privacy_requests(assigned_to);
create index if not exists idx_period_privacy_requests_user_id on public.period_privacy_requests(user_id);
create index if not exists idx_period_safety_flags_assigned_to on public.period_safety_flags(assigned_to);
create index if not exists idx_period_safety_flags_cycle_id on public.period_safety_flags(cycle_id);
create index if not exists idx_period_safety_flags_daily_log_id on public.period_safety_flags(daily_log_id);
create index if not exists idx_period_safety_flags_resolved_by on public.period_safety_flags(resolved_by);
create index if not exists idx_period_safety_flags_user_id on public.period_safety_flags(user_id);
create index if not exists idx_period_symptom_logs_cycle_id on public.period_symptom_logs(cycle_id);
create index if not exists idx_period_symptom_logs_user_id on public.period_symptom_logs(user_id);
create index if not exists idx_period_trivia_attempts_user_id on public.period_trivia_attempts(user_id);
create index if not exists idx_period_trivia_events_created_by on public.period_trivia_events(created_by);
create index if not exists idx_period_trivia_events_reviewed_by on public.period_trivia_events(reviewed_by);
create index if not exists idx_period_trivia_leads_assigned_to on public.period_trivia_leads(assigned_to);
create index if not exists idx_period_trivia_leads_event_id on public.period_trivia_leads(event_id);
create index if not exists idx_period_trivia_questions_ai_job_id on public.period_trivia_questions(ai_job_id);
create index if not exists idx_period_trivia_questions_created_by on public.period_trivia_questions(created_by);
create index if not exists idx_period_trivia_questions_reviewed_by on public.period_trivia_questions(reviewed_by);
create index if not exists idx_period_trivia_submissions_user_id on public.period_trivia_submissions(user_id);

-- ---------------------------------------------------------------------------
-- 14. Follow-up: the admin_access policy added for period_trivia_events in
--     section 12 overlaps with the existing authenticated-read policy on
--     SELECT (flagged by a second advisor pass). Same merge treatment as
--     period_content / period_trivia_questions above.
-- ---------------------------------------------------------------------------
drop policy if exists admin_access on public.period_trivia_events;
drop policy if exists period_events_authenticated_read on public.period_trivia_events;
drop policy if exists events_read on public.period_trivia_events;
create policy events_read on public.period_trivia_events
  for select to authenticated using (
    public.is_app_admin() or status in ('ready','live','ended')
  );
drop policy if exists admin_insert on public.period_trivia_events;
create policy admin_insert on public.period_trivia_events
  for insert to authenticated with check (public.is_app_admin());
drop policy if exists admin_update on public.period_trivia_events;
create policy admin_update on public.period_trivia_events
  for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
drop policy if exists admin_delete on public.period_trivia_events;
create policy admin_delete on public.period_trivia_events
  for delete to authenticated using (public.is_app_admin());
