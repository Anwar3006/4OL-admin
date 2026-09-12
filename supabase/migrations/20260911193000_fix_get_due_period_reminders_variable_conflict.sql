-- get_due_period_reminders declares `user_id` (and reminder_kind) as OUT
-- params via RETURNS TABLE(...), which collides with the identically-named
-- columns referenced unqualified in `insert into period_reminder_log
-- (user_id, reminder_kind, sent_on) ... on conflict (user_id, reminder_kind,
-- sent_on)`. Under the default plpgsql.variable_conflict = 'error', every
-- one of those inserts (both loops: period/fertile/OPK and checklist) threw
-- "column reference \"user_id\" is ambiguous" the instant a real reminder
-- matched, aborting the whole function call — meaning no automated reminder
-- of any kind has been deliverable since this shipped. Fix: prefer the
-- table column whenever a bare identifier could mean either.
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
security invoker
set search_path = public
as $function$
#variable_conflict use_column
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
      and public.period_user_has_premium(p.user_id)
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
      and public.period_user_has_premium(pr.user_id)
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
