-- ============================================================================
-- Plasence Phase 1 ("credible TTC core")
--
-- 1. Loosen period_ttc_profiles / period_ovulation_tests /
--    period_preconception_appointments writes from premium-gated back to
--    plain owner-write. close_premium_bypass_gaps (3 Sept 2026) added
--    `and coalesce((get_my_entitlement()->>'period_premium')::boolean,false)`
--    to each of these tables' INSERT/UPDATE policies. That directly
--    contradicts the product audit's free/premium model — "don't charge
--    users to enter the data needed to make the product accurate; charge for
--    interpretation, automation, collaboration and deeper guidance" — and,
--    concretely, means a free user selecting "Get Pregnant" in onboarding
--    today has their period_ttc_profiles write silently RLS-rejected
--    (save_ttc_profile fires unconditionally for that goal in
--    usePlasence.ts's completeOnboarding). period_fertility_insights stays
--    gated — that's server-generated interpretation, correctly premium.
--
-- 2. period_pregnancy_tests: new table, mirrors period_ovulation_tests'
--    shape, ungated (free to log, same reasoning as above).
--
-- 3. Reminders actually firing: period_notification_preferences booleans
--    have been saved with zero consumer since the table existed — no cron,
--    edge function or RPC reads them. New get_due_period_reminders() RPC +
--    period_reminder_log dedup table, following the exact pattern already
--    proven for workout/medication reminders
--    (get_due_workout_reminders/get_due_medication_reminders,
--    dispatch_notification, the x-cron-secret shared-secret auth from Epic
--    2.6) — service-role only, called from a new send-period-reminders edge
--    function on the same 10-minute cron cadence.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Loosen the three tables back to plain owner-write.
-- ----------------------------------------------------------------------------

drop policy if exists owner_write on public.period_ttc_profiles;
create policy owner_write on public.period_ttc_profiles
  for insert with check (user_id = auth.uid());
drop policy if exists owner_update on public.period_ttc_profiles;
create policy owner_update on public.period_ttc_profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists owner_write on public.period_ovulation_tests;
create policy owner_write on public.period_ovulation_tests
  for insert with check (user_id = auth.uid());
drop policy if exists owner_update on public.period_ovulation_tests;
create policy owner_update on public.period_ovulation_tests
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists owner_write on public.period_preconception_appointments;
create policy owner_write on public.period_preconception_appointments
  for insert with check (user_id = auth.uid());
drop policy if exists owner_update on public.period_preconception_appointments;
create policy owner_update on public.period_preconception_appointments
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 2. period_pregnancy_tests
-- ----------------------------------------------------------------------------

create table if not exists public.period_pregnancy_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_on date not null,
  tested_at time without time zone,
  result text not null check (result in ('negative','faint_positive','positive','invalid')),
  brand text,
  notes_ciphertext text,
  source text not null default 'user' check (source in ('user','device','offline_sync')),
  client_event_id text,
  app_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_period_pregnancy_tests_user_logged on public.period_pregnancy_tests(user_id, logged_on desc);

alter table public.period_pregnancy_tests enable row level security;

create policy admin_access on public.period_pregnancy_tests
  for all using (is_app_admin()) with check (is_app_admin());
create policy owner_read on public.period_pregnancy_tests
  for select using (user_id = auth.uid());
create policy owner_write on public.period_pregnancy_tests
  for insert with check (user_id = auth.uid());
create policy owner_update on public.period_pregnancy_tests
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy owner_delete on public.period_pregnancy_tests
  for delete using (user_id = auth.uid());

create index if not exists idx_period_pregnancy_tests_created_by on public.period_pregnancy_tests(user_id);

-- ----------------------------------------------------------------------------
-- 3. Reminders pipeline
-- ----------------------------------------------------------------------------

create table if not exists public.period_reminder_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reminder_kind text not null check (reminder_kind in ('period_upcoming','fertile_window_start','ovulation_test_due','checklist_due')),
  sent_on date not null,
  created_at timestamptz not null default now(),
  unique (user_id, reminder_kind, sent_on)
);

create index if not exists idx_period_reminder_log_user_kind_date on public.period_reminder_log(user_id, reminder_kind, sent_on);

-- Service-role only — no owner needs to read a delivery-dedup log, matching
-- the epic2_3 "RLS enabled, no policy = service-only" convention.
alter table public.period_reminder_log enable row level security;

create or replace function public.get_due_period_reminders(p_current_time timestamptz)
returns table(
  user_id uuid,
  reminder_kind text,
  title text,
  body text,
  metadata jsonb,
  expo_push_token text
)
language plpgsql
as $function$
declare
  rec record;
  local_time timestamp;
  local_date date;
  local_clock time;
  in_quiet_hours boolean;
begin
  for rec in
    select
      p.user_id, p.period_reminders, p.fertile_window_reminders, p.ovulation_test_reminders,
      p.quiet_hours_start, p.quiet_hours_end, p.timezone,
      up.expo_push_token,
      c.next_period_forecast, c.fertile_window
    from public.period_notification_preferences p
    join public.user_profiles up on up.user_id = p.user_id
    left join lateral (
      select pc.next_period_forecast, pc.fertile_window
      from public.period_cycles pc
      where pc.user_id = p.user_id
      order by pc.period_start_date desc
      limit 1
    ) c on true
    where up.expo_push_token is not null
      and coalesce(up.push_notifications_enabled, true)
      and (p.period_reminders or p.fertile_window_reminders or p.ovulation_test_reminders)
  loop
    local_time := p_current_time at time zone coalesce(rec.timezone, 'UTC');
    local_date := local_time::date;
    local_clock := local_time::time;

    in_quiet_hours := false;
    if rec.quiet_hours_start is not null and rec.quiet_hours_end is not null then
      if rec.quiet_hours_start <= rec.quiet_hours_end then
        in_quiet_hours := local_clock >= rec.quiet_hours_start and local_clock < rec.quiet_hours_end;
      else
        in_quiet_hours := local_clock >= rec.quiet_hours_start or local_clock < rec.quiet_hours_end;
      end if;
    end if;
    if in_quiet_hours then
      continue;
    end if;

    if rec.period_reminders and rec.next_period_forecast = local_date + 1 then
      insert into public.period_reminder_log (user_id, reminder_kind, sent_on)
      values (rec.user_id, 'period_upcoming', local_date)
      on conflict (user_id, reminder_kind, sent_on) do nothing;
      if found then
        user_id := rec.user_id;
        reminder_kind := 'period_upcoming';
        title := 'Period expected tomorrow';
        body := 'Your period is predicted to start tomorrow.';
        metadata := jsonb_build_object('reminder_kind', 'period_upcoming');
        expo_push_token := rec.expo_push_token;
        return next;
      end if;
    end if;

    if rec.fertile_window_reminders and rec.fertile_window is not null and lower(rec.fertile_window) = local_date then
      insert into public.period_reminder_log (user_id, reminder_kind, sent_on)
      values (rec.user_id, 'fertile_window_start', local_date)
      on conflict (user_id, reminder_kind, sent_on) do nothing;
      if found then
        user_id := rec.user_id;
        reminder_kind := 'fertile_window_start';
        title := 'Your fertile window has started';
        body := 'Today marks the start of your estimated fertile window.';
        metadata := jsonb_build_object('reminder_kind', 'fertile_window_start');
        expo_push_token := rec.expo_push_token;
        return next;
      end if;
    end if;

    if rec.ovulation_test_reminders and rec.fertile_window is not null and rec.fertile_window @> local_date then
      insert into public.period_reminder_log (user_id, reminder_kind, sent_on)
      values (rec.user_id, 'ovulation_test_due', local_date)
      on conflict (user_id, reminder_kind, sent_on) do nothing;
      if found then
        user_id := rec.user_id;
        reminder_kind := 'ovulation_test_due';
        title := 'Consider an ovulation test today';
        body := 'You are in your estimated fertile window — today may be a good day to test.';
        metadata := jsonb_build_object('reminder_kind', 'ovulation_test_due');
        expo_push_token := rec.expo_push_token;
        return next;
      end if;
    end if;
  end loop;

  for rec in
    select distinct on (pr.user_id)
      pr.user_id, ci.title as item_title, up.expo_push_token,
      (p_current_time at time zone coalesce(np.timezone, 'UTC'))::date as local_date
    from public.period_ttc_checklist_progress pr
    join public.period_ttc_checklist_items ci on ci.id = pr.checklist_item_id
    join public.period_notification_preferences np on np.user_id = pr.user_id
    join public.user_profiles up on up.user_id = pr.user_id
    where pr.reminder_enabled = true
      and pr.status in ('not_started', 'planned')
      and pr.target_date is not null
      and np.preconception_checklist_reminders = true
      and up.expo_push_token is not null
      and coalesce(up.push_notifications_enabled, true)
      and pr.target_date = (p_current_time at time zone coalesce(np.timezone, 'UTC'))::date
    order by pr.user_id, pr.target_date
  loop
    insert into public.period_reminder_log (user_id, reminder_kind, sent_on)
    values (rec.user_id, 'checklist_due', rec.local_date)
    on conflict (user_id, reminder_kind, sent_on) do nothing;
    if found then
      user_id := rec.user_id;
      reminder_kind := 'checklist_due';
      title := 'Checklist reminder';
      body := rec.item_title || ' is due today.';
      metadata := jsonb_build_object('reminder_kind', 'checklist_due');
      expo_push_token := rec.expo_push_token;
      return next;
    end if;
  end loop;
end;
$function$;

revoke all on function public.get_due_period_reminders(timestamptz) from public, anon, authenticated;
grant execute on function public.get_due_period_reminders(timestamptz) to service_role;

-- Cron: same 10-minute cadence and x-cron-secret auth as the other reminder
-- jobs (Epic 2.6). Date-level dedup lives in period_reminder_log, so a
-- 10-minute cadence just controls how promptly a newly-true condition is
-- caught, not how often a user is actually notified.
select cron.schedule(
  'period-reminders-every-10-min',
  '*/10 * * * *',
  $cmd$
    select net.http_post(
      url := 'https://rhbbxttxnvcziyqzptqs.supabase.co/functions/v1/send-period-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_function_shared_secret')
      ),
      body := '{}'::jsonb
    );
  $cmd$
);
