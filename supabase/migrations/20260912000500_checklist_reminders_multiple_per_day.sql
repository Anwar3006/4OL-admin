-- Removes `distinct on (pr.user_id)` from the checklist "due today" loop —
-- previously that silently collapsed multiple due items for the same user
-- down to just one per day. Now every qualifying item gets its own
-- reminder (and independently, its own 2h follow-up), matching the new
-- per-item dedup key on period_reminder_log.
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
      on conflict (user_id, reminder_kind, sent_on, (coalesce(checklist_item_id, '00000000-0000-0000-0000-000000000000'::uuid))) do nothing;
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
      on conflict (user_id, reminder_kind, sent_on, (coalesce(checklist_item_id, '00000000-0000-0000-0000-000000000000'::uuid))) do nothing;
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
      on conflict (user_id, reminder_kind, sent_on, (coalesce(checklist_item_id, '00000000-0000-0000-0000-000000000000'::uuid))) do nothing;
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

  -- Checklist "due today" ping — every qualifying item for the user, not
  -- just one (previously distinct-on-user silently dropped the rest).
  for rec in
    select
      pr.user_id, pr.checklist_item_id, ci.title as item_title, up.expo_push_token,
      (p_current_time at time zone coalesce(np.timezone, 'UTC'))::date as local_date,
      (p_current_time at time zone coalesce(np.timezone, 'UTC'))::time as local_clock,
      pr.reminder_time
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
      and (
        pr.reminder_time is null
        or pr.reminder_time <= (p_current_time at time zone coalesce(np.timezone, 'UTC'))::time
      )
    order by pr.user_id, pr.checklist_item_id
  loop
    insert into public.period_reminder_log (user_id, reminder_kind, sent_on, checklist_item_id)
    values (rec.user_id, 'checklist_due', rec.local_date, rec.checklist_item_id)
    on conflict (user_id, reminder_kind, sent_on, (coalesce(checklist_item_id, '00000000-0000-0000-0000-000000000000'::uuid))) do nothing;
    if found then
      user_id := rec.user_id;
      reminder_kind := 'checklist_due';
      title := 'Checklist reminder';
      body := rec.item_title || ' is due today.';
      metadata := jsonb_build_object(
        'reminder_kind', 'checklist_due',
        'checklist_item_id', rec.checklist_item_id
      );
      expo_push_token := rec.expo_push_token;
      return next;
    end if;
  end loop;

  -- Checklist follow-up — 2 hours after each 'checklist_due' ping (one per
  -- item now), ask whether it actually got done, with Yes/No actions.
  for rec in
    select
      l.user_id, l.checklist_item_id, l.sent_on, ci.title as item_title,
      up.expo_push_token
    from public.period_reminder_log l
    join public.period_ttc_checklist_progress pr
      on pr.user_id = l.user_id and pr.checklist_item_id = l.checklist_item_id
    join public.period_ttc_checklist_items ci on ci.id = l.checklist_item_id
    join public.user_profiles up on up.user_id = l.user_id
    where l.reminder_kind = 'checklist_due'
      and l.checklist_item_id is not null
      and l.created_at <= p_current_time - interval '2 hours'
      and pr.status <> 'done'
      and up.expo_push_token is not null
      and coalesce(up.push_notifications_enabled, true)
      and public.period_user_has_premium(l.user_id)
      and not exists (
        select 1 from public.period_reminder_log f
        where f.user_id = l.user_id
          and f.reminder_kind = 'checklist_followup'
          and f.sent_on = l.sent_on
          and f.checklist_item_id = l.checklist_item_id
      )
  loop
    insert into public.period_reminder_log (user_id, reminder_kind, sent_on, checklist_item_id)
    values (rec.user_id, 'checklist_followup', rec.sent_on, rec.checklist_item_id)
    on conflict (user_id, reminder_kind, sent_on, (coalesce(checklist_item_id, '00000000-0000-0000-0000-000000000000'::uuid))) do nothing;
    if found then
      user_id := rec.user_id;
      reminder_kind := 'checklist_followup';
      title := 'Did you get to it?';
      body := rec.item_title || ' — mark it done?';
      metadata := jsonb_build_object(
        'reminder_kind', 'checklist_followup',
        'checklist_item_id', rec.checklist_item_id,
        'category_id', 'checklist_followup_actions'
      );
      expo_push_token := rec.expo_push_token;
      return next;
    end if;
  end loop;
end;
$function$;

revoke all on function public.get_due_period_reminders(timestamptz) from public, anon, authenticated;
grant execute on function public.get_due_period_reminders(timestamptz) to service_role;
