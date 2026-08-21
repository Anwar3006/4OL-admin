-- =============================================================================
-- Deletion policy extension (Gap Analysis Part Z).
--
-- 1. delete_account_requests: processed_at / processed_by so the admin
--    log can show WHO finalized a deletion and WHEN (Z gap matrix).
-- 2. platform_settings.deletion_settings jsonb — grace window, OTP expiry,
--    auto-processing flag. Z-D1: values editable from the Delete Account
--    Requests > Settings tab behind settings.security.
-- 3. expire_delete_account_grace_periods() becomes settings-driven
--    (was hard-coded INTERVAL '30 days') with a 30-day fallback.
-- Additive and re-runnable.
-- =============================================================================

alter table public.delete_account_requests
  add column if not exists processed_at timestamptz,
  add column if not exists processed_by uuid references public.user_profiles (user_id);

alter table public.platform_settings
  add column if not exists deletion_settings jsonb not null default '{}'::jsonb;

-- Seed defaults once, without clobbering operator edits.
insert into public.platform_settings (id, deletion_settings)
values ('global', jsonb_build_object(
  'grace_days', 30,
  'otp_expiry_mins', 10,
  'auto_process', true,
  'data_download_reminder_days', 7
))
on conflict (id) do update
  set deletion_settings = coalesce(public.platform_settings.deletion_settings, '{}'::jsonb) || '{}'::jsonb;

-- ── grace-period expiry RPC (parameterized version of Epic 21) ─────────────
DROP FUNCTION IF EXISTS public.expire_delete_account_grace_periods();

CREATE OR REPLACE FUNCTION public.expire_delete_account_grace_periods()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grace_days  int;
  rec           RECORD;
  processed_count int := 0;
BEGIN
  SELECT coalesce((deletion_settings->>'grace_days')::int, 30)
  INTO v_grace_days
  FROM public.platform_settings WHERE id = 'global';

  IF v_grace_days IS NULL THEN v_grace_days := 30; END IF;

  -- ⚠️ Same scope as Epic 21: anonymizes app-owned user_profiles fields
  -- only. Does NOT touch auth.users / login email — that remains a
  -- separate, explicitly-reviewed policy decision.
  FOR rec IN
    SELECT id, user_id
    FROM public.delete_account_requests
    WHERE status = 'grace_period'
      AND grace_period_started_at IS NOT NULL
      AND grace_period_started_at <= now() - make_interval(days => v_grace_days)
  LOOP
    UPDATE public.user_profiles
    SET
      first_name = 'Deleted',
      last_name = 'User',
      -- phone_number is NOT NULL, so a placeholder rather than NULL.
      phone_number = 'deleted',
      avatar_url = NULL,
      dob = NULL,
      sex = NULL,
      notes = NULL,
      expo_push_token = NULL,
      status = 'banned',
      deleted_at = now()
    WHERE user_id = rec.user_id;

    UPDATE public.delete_account_requests
    SET status = 'completed',
        processed_at = now(),
        processed_by = NULL          -- automated pg_cron processing
    WHERE id = rec.id;

    processed_count := processed_count + 1;
  END LOOP;

  RETURN jsonb_build_object('grace_days', v_grace_days, 'processed', processed_count);
END;
$$;

REVOKE ALL ON FUNCTION public.expire_delete_account_grace_periods() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_delete_account_grace_periods() FROM anon;
REVOKE ALL ON FUNCTION public.expire_delete_account_grace_periods() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.expire_delete_account_grace_periods() TO service_role;
