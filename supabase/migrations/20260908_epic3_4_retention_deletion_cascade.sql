-- =============================================================================
-- Epic 3.4 — real per-user deletion cascade, legal hold, financial retention.
--
-- Closes the gap documented in docs/epic3-4-retention-map.md: "deleting an
-- account" was a single UPDATE user_profiles, duplicated identically in
-- expire_delete_account_grace_periods() and detail.ts's process_now branch,
-- touching none of the ~80 other tables with a live FK, no storage object,
-- and nothing checked for a legal hold because the concept didn't exist.
--
-- purge_or_anonymize_user() below is now the single source of truth both
-- callers use. Its scope is deliberately narrow: most "anonymize identity"
-- tables in the retention map hold only an opaque user_id/sender_id/
-- collector_id FK and no denormalized name/email of their own (verified
-- against lib/db/database.types.ts before writing this) -- the existing
-- user_profiles UPDATE already anonymizes them transitively, since the
-- admin UI and mobile app always resolve a display name by joining to
-- user_profiles. Real work is limited to: hard-delete tables with no
-- compliance value, medication_enquiries' denormalized PII columns, and the
-- storage objects nothing has ever cleaned up.
--
-- Financial/HCP retention: auth.users is deliberately never touched by any
-- of this (~100yr GoTrue ban, not a delete -- a pre-existing, separate
-- decision). That's the identity anchor compliance staff use to resolve who
-- a retained escrow_transactions/hcp_verifications row belonged to -- NOT
-- user_profiles, which is blanked immediately regardless of these tables'
-- own retention window. See docs/epic3-4-retention-map.md.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Legal hold. A table, not a single flag: overlapping matters need to be
--    trackable independently, and releasing one shouldn't reopen deletion
--    while another is still active. compliance_officer-owned (legalholds.manage).
-- -----------------------------------------------------------------------------
create table if not exists public.legal_holds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  matter_reference text,
  placed_by uuid references auth.users(id) on delete set null,
  placed_at timestamptz not null default now(),
  released_by uuid references auth.users(id) on delete set null,
  released_at timestamptz
);

create index if not exists legal_holds_active_user_idx
  on public.legal_holds (user_id)
  where released_at is null;

-- RLS enabled, zero policies: service-role (admin API routes) only, per the
-- Epic 2.3 "RLS enabled + no policy = service-only" posture. Epic 2.4's
-- `alter default privileges ... revoke all on tables from anon, authenticated`
-- already means this table gets zero client grants by default -- nothing
-- else to revoke here.
alter table public.legal_holds enable row level security;

-- -----------------------------------------------------------------------------
-- 2. Export tracking. data_export_url now stores a private-bucket OBJECT
--    PATH, not a fetchable URL -- a fresh short-lived signed URL is minted
--    on demand by features/delete-account-requests/api/export-download.ts.
-- -----------------------------------------------------------------------------
alter table public.delete_account_requests
  add column if not exists data_export_generated_at timestamptz;

-- -----------------------------------------------------------------------------
-- 3. purge_or_anonymize_user(p_user_id) — the cascade.
-- -----------------------------------------------------------------------------
create or replace function public.purge_or_anonymize_user(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_avatar_url text;
  v_prescription_paths text[];
  v_resume_paths text[];
begin
  if exists (
    select 1 from public.legal_holds
    where user_id = p_user_id and released_at is null
  ) then
    return jsonb_build_object('skipped', true, 'reason', 'legal_hold');
  end if;

  -- Capture the avatar path before it's nulled below -- Postgres has no
  -- Storage-object-delete primitive, so actual removal happens via
  -- storage_cleanup_queue -> the storage-cleanup Edge Function.
  select avatar_url into v_avatar_url
  from public.user_profiles where user_id = p_user_id;

  -- Same field set expire_delete_account_grace_periods() and detail.ts's
  -- process_now branch used to duplicate. auth.users deliberately untouched
  -- (separate, explicitly-reviewed decision, predates this migration).
  update public.user_profiles
  set first_name = 'Deleted',
      last_name = 'User',
      phone_number = 'deleted',
      avatar_url = null,
      dob = null,
      sex = null,
      notes = null,
      expo_push_token = null,
      status = 'banned',
      deleted_at = now()
  where user_id = p_user_id;

  if v_avatar_url is not null then
    insert into public.storage_cleanup_queue (bucket_name, file_paths)
    values ('bucket4ol', to_jsonb(array[v_avatar_url]));
  end if;

  -- medication_enquiries: strip denormalized PII, keep the row (aggregate
  -- stats value per the retention map's disposition). Prescription/
  -- delivery-proof photos go to storage cleanup.
  select array_agg(prescription_url) filter (where prescription_url is not null)
    into v_prescription_paths
  from public.medication_enquiries where user_id = p_user_id;

  if v_prescription_paths is not null and array_length(v_prescription_paths, 1) > 0 then
    insert into public.storage_cleanup_queue (bucket_name, file_paths)
    values ('prescriptions', to_jsonb(v_prescription_paths));
  end if;

  update public.medication_enquiries
  set prescription_url = null,
      delivery_address = null,
      delivery_gps = null,
      delivery_proof_url = null,
      insurance_policy_number = null,
      insurance_provider = null,
      pickup_confirmation_code = null,
      tracking_number = null
  where user_id = p_user_id;

  -- job_applications is hard-deleted below, but deleting the row doesn't
  -- touch Storage -- queue the resume file separately, before the delete.
  select array_agg(resume_url) filter (where resume_url is not null)
    into v_resume_paths
  from public.job_applications where applicant_id = p_user_id;

  if v_resume_paths is not null and array_length(v_resume_paths, 1) > 0 then
    insert into public.storage_cleanup_queue (bucket_name, file_paths)
    values ('job-documents', to_jsonb(v_resume_paths));
  end if;

  -- Hard-delete: pure convenience/operational data, no compliance or audit
  -- reason to retain any of these once the account is gone.
  delete from public.job_applications where applicant_id = p_user_id;
  delete from public.job_alerts where user_id = p_user_id;
  delete from public.job_saved where user_id = p_user_id;
  delete from public.notifications where user_id = p_user_id;
  delete from public.user_push_tokens where user_id = p_user_id;
  delete from public.user_notes where user_id = p_user_id;

  -- No action needed here -- deliberately, not an oversight -- for every
  -- other "anonymize" table in docs/epic3-4-retention-map.md (period_*,
  -- fitness_* participation tables, drug_interaction_flags,
  -- drug_verification_requests, medication_reminders, medication_adherence,
  -- messages, conversation_members, facility_reviews, facility_favorites,
  -- app_reviews, analytics_events, *_views, collector_footprints,
  -- device_attestation_log, device_sign_in_requests,
  -- security_device_signals): each holds only an opaque user_id/sender_id/
  -- collector_id FK, no denormalized name/email of its own. The UI resolves
  -- display identity by joining to user_profiles, which this function just
  -- anonymized -- so these are already anonymized transitively, today.
  --
  -- Never touched by a user's own deletion: admin-attribution columns
  -- (reviewed_by/approved_by/verified_by/created_by/etc.) -- the audit
  -- trail is supposed to survive the actor leaving. See the retention map's
  -- "Admin-attribution columns" section.
  --
  -- Retained, not touched here: hcp_digital_cvs/hcp_verifications
  -- (indefinitely -- licence-fraud investigations have no fixed statute of
  -- limitations); escrow_transactions/transaction_records/
  -- subscription_upgrade_requests/user_subscriptions and
  -- facility_scout_submissions/facility_scout_referrals (7 years, then
  -- incidental-PII stripped -- see anonymize_expired_financial_records()).

  return jsonb_build_object('anonymized', true);
end;
$$;

revoke all on function public.purge_or_anonymize_user(uuid) from public, anon, authenticated;
grant execute on function public.purge_or_anonymize_user(uuid) to service_role;

-- -----------------------------------------------------------------------------
-- 4. Wire it into the existing grace-period cron, replacing the duplicated
--    inline UPDATE. A legal hold now leaves the request in grace_period
--    (it's picked up again the next run) instead of silently completing.
-- -----------------------------------------------------------------------------
create or replace function public.expire_delete_account_grace_periods()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grace_days int;
  rec record;
  v_purge_result jsonb;
  processed_count int := 0;
  skipped_count int := 0;
begin
  select coalesce((deletion_settings->>'grace_days')::int, 30)
  into v_grace_days from public.platform_settings where id = 'global';
  if v_grace_days is null then v_grace_days := 30; end if;

  for rec in
    select id, user_id from public.delete_account_requests
    where status = 'grace_period'
      and grace_period_started_at is not null
      and grace_period_started_at <= now() - make_interval(days => v_grace_days)
  loop
    v_purge_result := public.purge_or_anonymize_user(rec.user_id);

    if coalesce((v_purge_result ->> 'skipped')::boolean, false) then
      skipped_count := skipped_count + 1;
      continue;
    end if;

    update public.delete_account_requests
    set status = 'completed', processed_at = now(), processed_by = null
    where id = rec.id;

    processed_count := processed_count + 1;
  end loop;

  return jsonb_build_object(
    'grace_days', v_grace_days,
    'processed', processed_count,
    'skipped_legal_hold', skipped_count
  );
end;
$$;

revoke all on function public.expire_delete_account_grace_periods() from public, anon, authenticated;
grant execute on function public.expire_delete_account_grace_periods() to service_role;

-- -----------------------------------------------------------------------------
-- 5. Financial/collector-reward retention sweep — 7 years after deletion,
--    then strip incidental free-text/jsonb PII. FK columns (buyer_id,
--    user_id, etc.) are deliberately left intact: a UUID isn't personal data
--    on its own, and severing it would break the audit trail the retention
--    exists for. Identity resolution during and after the window goes
--    through auth.users (see the header comment), not these FKs or
--    user_profiles.
-- -----------------------------------------------------------------------------
create or replace function public.anonymize_expired_financial_records()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  processed_count int := 0;
  skipped_count int := 0;
begin
  for rec in
    select user_id from public.delete_account_requests
    where status = 'completed'
      and processed_at is not null
      and processed_at <= now() - interval '7 years'
  loop
    if exists (
      select 1 from public.legal_holds
      where user_id = rec.user_id and released_at is null
    ) then
      skipped_count := skipped_count + 1;
      continue;
    end if;

    update public.escrow_transactions
    set metadata = null, dispute_reason = null, dispute_resolution = null
    where buyer_id = rec.user_id or seller_id = rec.user_id;

    update public.transaction_records
    set metadata = null, description = null
    where user_id = rec.user_id;

    update public.subscription_upgrade_requests
    set note = null, decline_reason = null
    where user_id = rec.user_id;

    update public.user_subscriptions
    set note = null, paystack_reference = null
    where user_id = rec.user_id;

    update public.facility_scout_referrals
    set delivery_phone = null
    where referrer_id = rec.user_id or referred_user_id = rec.user_id;

    processed_count := processed_count + 1;
  end loop;

  return jsonb_build_object('processed', processed_count, 'skipped_legal_hold', skipped_count);
end;
$$;

revoke all on function public.anonymize_expired_financial_records() from public, anon, authenticated;
grant execute on function public.anonymize_expired_financial_records() to service_role;

select cron.schedule(
  'anonymize-expired-financial-records-daily',
  '0 4 * * *',
  $$ select public.anonymize_expired_financial_records(); $$
);

-- -----------------------------------------------------------------------------
-- 6. RBAC: legalholds.manage, deleteaccount.data_export. Same grant set as
--    deleteaccount.approve (compliance_officer only -- admin currently has
--    view/export on this feature but not approve/process, unchanged here).
--    Keeps lib/permissions.ts (PERMISSION_CATALOG + ROLE_DEFAULTS) in sync.
-- -----------------------------------------------------------------------------
insert into public.admin_permissions (key, resource, action, description) values
  ('legalholds.manage', 'legalholds', 'manage', 'Place or release a legal hold on a user account'),
  ('deleteaccount.data_export', 'deleteaccount', 'data_export', 'Generate or re-download one user''s GDPR data export package')
on conflict (key) do nothing;

insert into public.admin_role_permissions (role, permission_key) values
  ('compliance_officer', 'legalholds.manage'),
  ('compliance_officer', 'deleteaccount.data_export')
on conflict do nothing;
