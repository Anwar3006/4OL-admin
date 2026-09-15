-- Server-side attempt start. Mirrors submit_period_trivia's shape (security
-- definer, service_role only). Idempotent on retry: returning the existing
-- started_at for a live unsubmitted attempt (instead of resetting it) is the
-- whole point — otherwise a client could call "start" repeatedly to keep
-- pushing its clock forward, which defeats server-side timing entirely.
create or replace function public.start_period_trivia_attempt(
  p_event_id uuid, p_user_id uuid, p_device_hash text
) returns table(attempt_id uuid, started_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.period_trivia_attempts%rowtype;
  v_id uuid;
  v_started timestamptz;
begin
  if not exists (
    select 1 from public.period_trivia_events
    where id = p_event_id and status in ('ready', 'live') and now() between starts_at and ends_at
  ) then
    raise exception 'this trivia is not accepting entries right now';
  end if;

  if exists (
    select 1 from public.period_trivia_submissions
    where event_id = p_event_id and user_id = p_user_id
  ) then
    raise exception 'this account has already completed this trivia';
  end if;

  select * into v_existing from public.period_trivia_attempts
  where event_id = p_event_id and user_id = p_user_id
  for update;

  if found then
    if v_existing.submitted_at is not null then
      raise exception 'this account has already completed this trivia';
    elsif v_existing.expires_at > now() then
      return query select v_existing.id, v_existing.started_at;
      return;
    else
      delete from public.period_trivia_attempts where id = v_existing.id;
    end if;
  end if;

  insert into public.period_trivia_attempts (event_id, user_id, device_hash, started_at, expires_at)
  values (p_event_id, p_user_id, p_device_hash, now(), now() + interval '30 minutes')
  returning id, period_trivia_attempts.started_at into v_id, v_started;

  return query select v_id, v_started;
end;
$$;

revoke all on function public.start_period_trivia_attempt(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.start_period_trivia_attempt(uuid, uuid, text) to service_role;

-- submit_period_trivia rewrite: p_duration_seconds is gone (never kept as a
-- client-trusted fallback — that would keep alive the exact attack surface
-- this change exists to close); p_attempt_id is now required and is looked
-- up under FOR UPDATE in the same transaction as the insert, so the
-- check-and-reject for "already submitted" happens under a row lock instead
-- of relying solely on the app-layer pre-check + unique-index race.
drop function if exists public.submit_period_trivia(uuid, uuid, text, text, smallint, jsonb, integer, text, text, text, text, text, text, text, text, text);

create or replace function public.submit_period_trivia(
  p_event_id uuid, p_user_id uuid, p_attempt_id uuid, p_device_hash text, p_mobile_hash text,
  p_score smallint, p_answers jsonb, p_minimum_completion_seconds integer,
  p_full_name_ciphertext text, p_mobile_ciphertext text, p_social_platform text,
  p_social_handle_ciphertext text, p_consent_version text, p_campaign_code text,
  p_utm_source text, p_utm_medium text, p_utm_campaign text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission_id uuid;
  v_attempt public.period_trivia_attempts%rowtype;
  v_duration integer;
begin
  if not exists (
    select 1 from public.period_trivia_events
    where id = p_event_id and status in ('ready', 'live') and now() between starts_at and ends_at
  ) then
    raise exception 'event is not accepting submissions';
  end if;

  if jsonb_array_length(p_answers) <> 10 or p_score not between 0 and 10 then
    raise exception 'invalid trivia submission';
  end if;

  if exists (
    select 1 from public.period_trivia_submissions
    where event_id = p_event_id and user_id = p_user_id
  ) then
    raise exception 'this account has already completed this trivia';
  end if;

  select * into v_attempt from public.period_trivia_attempts
  where id = p_attempt_id and event_id = p_event_id and user_id = p_user_id
  for update;
  if not found then
    raise exception 'no active attempt found for this trivia — start the quiz again';
  end if;
  if v_attempt.submitted_at is not null then
    raise exception 'this attempt has already been submitted';
  end if;

  -- Measured from the same UX moment the client used to stamp its own clock
  -- (the "Start Quiz Now" tap) so the *meaning* of duration doesn't change —
  -- only *where* it's measured does.
  v_duration := greatest(0, extract(epoch from (now() - v_attempt.started_at))::integer);
  if p_minimum_completion_seconds > 0 and v_duration < p_minimum_completion_seconds then
    raise exception 'completed too quickly';
  end if;

  insert into public.period_trivia_submissions(event_id, user_id, device_hash, mobile_hash, score, answers, duration_seconds, attempt_id)
  values(p_event_id, p_user_id, p_device_hash, p_mobile_hash, p_score, p_answers, v_duration, p_attempt_id)
  returning id into v_submission_id;

  update public.period_trivia_attempts set submitted_at = now() where id = p_attempt_id;

  insert into public.period_trivia_leads(
    event_id, submission_id, user_id, full_name_ciphertext, mobile_ciphertext,
    social_platform, social_handle_ciphertext, mobile_hash, consent_version,
    campaign_code, utm_source, utm_medium, utm_campaign
  )
  values(
    p_event_id, v_submission_id, p_user_id, p_full_name_ciphertext, p_mobile_ciphertext,
    coalesce(nullif(trim(p_social_platform), ''), 'unknown'), p_social_handle_ciphertext,
    p_mobile_hash, p_consent_version, p_campaign_code, p_utm_source, p_utm_medium, p_utm_campaign
  );
  return v_submission_id;
end;
$$;

revoke all on function public.submit_period_trivia(uuid, uuid, uuid, text, text, smallint, jsonb, integer, text, text, text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_period_trivia(uuid, uuid, uuid, text, text, smallint, jsonb, integer, text, text, text, text, text, text, text, text, text) to service_role;
