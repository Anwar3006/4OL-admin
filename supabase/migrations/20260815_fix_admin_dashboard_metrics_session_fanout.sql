-- get_admin_dashboard_metrics counted admin_totals with count(*) AFTER a
-- LEFT JOIN to admin_sessions, so an admin with multiple session rows got
-- counted once per session instead of once total (confirmed live: 1 actual
-- admin with 9 admin_sessions rows reported "9 Total"). online_now already
-- correctly used count(DISTINCT ...); every other stat here didn't. Fix:
-- compute admin-attribute counts directly from admins (no join needed --
-- none of these fields come from admin_sessions), and isolate the join to
-- its own CTE for online_now only.

create or replace function public.get_admin_dashboard_metrics(time_filter text default '30d'::text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  since timestamptz;
  admin_roles text[] := ARRAY['admin', 'super_admin', 'registrar'];
begin
  since := case time_filter
    when '24h' then now() - interval '24 hours'
    when '7d'  then now() - interval '7 days'
    when '30d' then now() - interval '30 days'
    when '90d' then now() - interval '90 days'
    else now() - interval '30 days'
  end;

  return (
    with admins as (
      select * from public.user_profiles where role = any(admin_roles)
    ),
    admin_totals as (
      select
        count(*)::int as total,
        count(*) filter (where status = 'active')::int as active,
        count(*) filter (where status = 'inactive')::int as inactive,
        count(*) filter (where status = 'suspended')::int as suspended,
        count(*) filter (where status = 'banned')::int as banned,
        count(*) filter (where not coalesce(mfa_enabled, false))::int as mfa_not_set
      from admins
    ),
    online_totals as (
      select count(distinct s.admin_id) filter (
        where s.is_active and s.last_active_at >= now() - interval '15 minutes'
      )::int as online_now
      from admins a
      left join public.admin_sessions s on s.admin_id = a.user_id
    ),
    role_breakdown as (
      select coalesce(jsonb_object_agg(role, cnt), '{}'::jsonb) as data
      from (select role, count(*)::int as cnt from admins group by role) r
    ),
    pending_invites as (
      select count(*)::int as pending
      from public.user_invites
      where role = any(admin_roles)
        and used_at is null
        and not coalesce(is_revoked, false)
        and expires_at > now()
    ),
    admin_ids as (
      select user_id::text as id from admins
    ),
    window_logs as (
      select * from public.activity_logs
      where created_at >= since and actor_id in (select id from admin_ids)
    ),
    activity_totals as (
      select
        count(*)::int as total_actions,
        count(*) filter (where severity = 'critical')::int as critical_events,
        count(*) filter (where severity = 'warning')::int as high_risk_actions
      from window_logs
    ),
    most_active as (
      select actor_name, count(*)::int as cnt
      from window_logs
      group by actor_name
      order by cnt desc
      limit 1
    ),
    peak_hour as (
      select extract(hour from created_at at time zone 'Africa/Accra')::int as hr, count(*) as cnt
      from window_logs
      group by hr
      order by cnt desc
      limit 1
    ),
    recent_activity as (
      select coalesce(jsonb_agg(row_to_json(l)), '[]'::jsonb) as data
      from (
        select id, actor_name, action_type, target_table, record_id, severity, created_at
        from window_logs
        order by created_at desc
        limit 10
      ) l
    )
    select jsonb_build_object(
      'time_filter', time_filter,
      'admins', jsonb_build_object(
        'total', admin_totals.total,
        'active', admin_totals.active,
        'inactive', admin_totals.inactive,
        'suspended', admin_totals.suspended,
        'banned', admin_totals.banned,
        'pending', pending_invites.pending,
        'mfa_not_set', admin_totals.mfa_not_set,
        'online_now', online_totals.online_now,
        'by_role', role_breakdown.data
      ),
      'activity', jsonb_build_object(
        'total_actions', activity_totals.total_actions,
        'critical_events', activity_totals.critical_events,
        'high_risk_actions', activity_totals.high_risk_actions,
        'most_active_admin', (select actor_name from most_active),
        'peak_hour', (select hr from peak_hour),
        'recent', recent_activity.data
      )
    )
    from admin_totals, online_totals, role_breakdown, pending_invites, activity_totals, recent_activity
  );
end;
$function$;
