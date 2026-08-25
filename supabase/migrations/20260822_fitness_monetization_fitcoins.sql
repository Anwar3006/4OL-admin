-- =============================================================================
-- Fitness monetization, engagement alerts & FitCoins configuration
-- (Fitness Mockup Gap Analysis — 2026-08-22).
--
-- Sections:
--   A. Subscriptions schema (tiers + user grants + entitlement RPCs)
--   B. Server-driven fitness notifications (shared notifications table,
--      pg_cron alert functions for streak / challenge / billing)
--   C. FitCoins reward tiers (admin-managed amounts consumed by the
--      session-completion trigger) + config RPC
--   D. Coach attribution (fitness_plans.coach_display_name)
--   E. Dashboard data RPCs (week strip, activity history, social proof)
--   F. IDOR hardening of get_fitness_dashboard
--   G. RBAC seeds
--
-- Additive and re-runnable. No destructive operations.
-- =============================================================================


-- ─── A. Subscriptions ────────────────────────────────────────────────────────

create table if not exists public.subscription_tiers (
  id uuid not null default gen_random_uuid(),
  key text not null check (key in ('free', 'premium', 'lifetime')),
  name text not null,
  description text,
  price_ghs numeric(10, 2) not null default 0,
  duration_days integer,               -- null = lifetime / non-expiring
  benefits jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint subscription_tiers_pkey primary key (id),
  constraint subscription_tiers_key_unique unique (key)
);

insert into public.subscription_tiers (key, name, description, price_ghs, duration_days, benefits, display_order)
values
  ('free', 'Free', 'Core fitness experience: plans, challenges, FitCoins.', 0, null,
   '["Personalized workout plans", "Challenges & leaderboards", "FitCoins rewards"]'::jsonb, 0),
  ('premium', 'Premium', 'AI plans, health metrics and priority coaching.', 29.90, 30,
   '["Unlimited AI plan generation", "Health metrics & integrations", "Advanced progress analytics", "Priority support"]'::jsonb, 1),
  ('lifetime', 'Lifetime Premium', 'One-time premium access, forever.', 299.00, null,
   '["Everything in Premium", "Never expires", "Founding-member badge"]'::jsonb, 2)
on conflict (key) do nothing;

create table if not exists public.user_subscriptions (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tier_id uuid not null references public.subscription_tiers(id),
  status text not null default 'active'
    check (status in ('active', 'expired', 'revoked')),
  source text not null default 'admin_grant'
    check (source in ('paystack', 'admin_grant', 'promo')),
  granted_by uuid,                     -- admin user id for admin_grant rows
  starts_at timestamptz not null default now(),
  expires_at timestamptz,              -- null = lifetime / non-expiring
  paystack_reference text,             -- populated once Paystack is wired
  note text,
  created_at timestamptz not null default now(),
  constraint user_subscriptions_pkey primary key (id)
);

-- One active subscription per user (partial unique, same pattern as
-- fitness_user_assignments_one_active_per_user).
create unique index if not exists user_subscriptions_one_active_per_user
  on public.user_subscriptions (user_id)
  where status = 'active';
create index if not exists idx_user_subscriptions_user_id
  on public.user_subscriptions (user_id);
create index if not exists idx_user_subscriptions_expires_at
  on public.user_subscriptions (expires_at)
  where status = 'active' and expires_at is not null;

alter table public.subscription_tiers enable row level security;
alter table public.user_subscriptions enable row level security;
-- No policies: reads go through SECURITY DEFINER RPCs below and
-- service-role admin routes only.

-- Caller reads their OWN entitlement only — identity from the JWT, never
-- a parameter. Paystack rows drop into user_subscriptions unchanged once
-- payment collection is wired (source = 'paystack').
create or replace function public.get_my_entitlement()
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_row record;
begin
  select t.key as tier_key, t.name as tier_name, us.expires_at, us.source
    into v_row
  from public.user_subscriptions us
  join public.subscription_tiers t on t.id = us.tier_id
  where us.user_id = auth.uid()
    and us.status = 'active'
    and (us.expires_at is null or us.expires_at > now())
  order by us.created_at desc
  limit 1;

  if v_row is null then
    return jsonb_build_object(
      'is_premium', false, 'tier_key', 'free', 'tier_name', 'Free',
      'is_lifetime', false, 'expires_at', null, 'source', null
    );
  end if;

  return jsonb_build_object(
    'is_premium', true,
    'tier_key', v_row.tier_key,
    'tier_name', v_row.tier_name,
    'is_lifetime', v_row.expires_at is null,
    'expires_at', v_row.expires_at,
    'source', v_row.source
  );
end;
$$;

-- Paywall tier list (active tiers only, ordered).
create or replace function public.get_subscription_tiers()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id, 'key', key, 'name', name, 'description', description,
        'price_ghs', price_ghs, 'duration_days', duration_days, 'benefits', benefits
      ) order by display_order
    ), '[]'::jsonb)
  from public.subscription_tiers
  where is_active = true;
$$;

revoke all on function public.get_my_entitlement() from public;
revoke all on function public.get_subscription_tiers() from public;
grant execute on function public.get_my_entitlement() to authenticated, service_role;
grant execute on function public.get_subscription_tiers() to authenticated, service_role;


-- ─── B. Server-driven fitness notifications ─────────────────────────────────
-- Reuses the shared `notifications` table that powers the main app inbox —
-- the mobile bell does NOT get a parallel feed. New fitness types are added
-- to the API allowlist (/api/user/notifications) alongside these writers.

create or replace function public.notify_fitness(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.notifications (user_id, title, body, type, metadata)
  values (p_user_id, p_title, p_body, p_type, p_metadata);
end;
$$;

revoke all on function public.notify_fitness(uuid, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.notify_fitness(uuid, text, text, text, jsonb) to service_role;

-- Streak at risk: logged yesterday (not today), streak >= 3, one alert/day.
create or replace function public.fn_fitness_streak_alerts()
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_count integer := 0;
  v_row record;
begin
  for v_row in
    select s.user_id, s.current_streak
    from public.fitness_user_streaks s
    where s.current_streak >= 3
      and s.last_active_date = current_date - 1
      and not exists (
        select 1 from public.notifications n
        where n.user_id = s.user_id
          and n.type = 'streak_alert'
          and n.created_at >= date_trunc('day', now())
      )
  loop
    perform public.notify_fitness(
      v_row.user_id,
      'streak_alert',
      'Streak Alert 🔥',
      format('Log activity today to keep your %s-day streak alive.', v_row.current_streak),
      jsonb_build_object('screen', 'fitness', 'streak', v_row.current_streak)
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- Challenges ending within 2 days: alert active participants once per challenge.
create or replace function public.fn_fitness_challenge_deadlines()
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_count integer := 0;
  v_row record;
begin
  for v_row in
    select p.user_id, c.id as challenge_id, c.title,
           (c.end_date - current_date) as days_left
    from public.fitness_challenges c
    join public.fitness_challenge_participants p on p.challenge_id = c.id
    where c.end_date between current_date and current_date + 2
      and p.status = 'active'
      and not exists (
        select 1 from public.notifications n
        where n.user_id = p.user_id
          and n.type = 'challenge'
          and n.metadata ->> 'challenge_id' = c.id::text
          and n.created_at >= now() - interval '3 days'
      )
  loop
    perform public.notify_fitness(
      v_row.user_id,
      'challenge',
      'Challenge Deadline 🏆',
      format('%s ends in %s day(s) — finish strong!', v_row.title, greatest(v_row.days_left, 0)),
      jsonb_build_object('screen', 'challenges', 'challenge_id', v_row.challenge_id::text)
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- Subscriptions renewing/expiring within 24 hours.
create or replace function public.fn_fitness_subscription_renewals()
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_count integer := 0;
  v_row record;
begin
  for v_row in
    select us.user_id, us.id as subscription_id, t.name as tier_name
    from public.user_subscriptions us
    join public.subscription_tiers t on t.id = us.tier_id
    where us.status = 'active'
      and us.expires_at is not null
      and us.expires_at between now() and now() + interval '24 hours'
      and not exists (
        select 1 from public.notifications n
        where n.user_id = us.user_id
          and n.type = 'billing'
          and n.metadata ->> 'subscription_id' = us.id::text
          and n.created_at >= now() - interval '3 days'
      )
  loop
    perform public.notify_fitness(
      v_row.user_id,
      'billing',
      'Subscription Update 💳',
      format('Your %s access expires within 24 hours. Renew to keep your benefits.', v_row.tier_name),
      jsonb_build_object('screen', 'premium', 'subscription_id', v_row.subscription_id::text)
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.fn_fitness_streak_alerts() from public, anon, authenticated;
revoke all on function public.fn_fitness_challenge_deadlines() from public, anon, authenticated;
revoke all on function public.fn_fitness_subscription_renewals() from public, anon, authenticated;
grant execute on function public.fn_fitness_streak_alerts() to service_role;
grant execute on function public.fn_fitness_challenge_deadlines() to service_role;
grant execute on function public.fn_fitness_subscription_renewals() to service_role;

-- Schedule with pg_cron when the extension is available (Supabase projects
-- enable it via dashboard). Runs daily at 07:00 UTC. Re-runnable: existing
-- job names are unscheduled first when the API supports it.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.unschedule('fitness-streak-alerts');
    exception when others then null;
    end;
    begin
      perform cron.unschedule('fitness-challenge-deadlines');
    exception when others then null;
    end;
    begin
      perform cron.unschedule('fitness-subscription-renewals');
    exception when others then null;
    end;
    perform cron.schedule('fitness-streak-alerts', '0 7 * * *',
      $cron$select public.fn_fitness_streak_alerts()$cron$);
    perform cron.schedule('fitness-challenge-deadlines', '10 7 * * *',
      $cron$select public.fn_fitness_challenge_deadlines()$cron$);
    perform cron.schedule('fitness-subscription-renewals', '20 7 * * *',
      $cron$select public.fn_fitness_subscription_renewals()$cron$);
  else
    raise notice 'pg_cron not installed — fitness alert functions created but not scheduled. Enable pg_cron and re-run this migration, or call the functions manually.';
  end if;
end;
$$;


-- ─── C. FitCoins reward tiers ────────────────────────────────────────────────
-- Admin-managed coin amounts per activity. handle_exercise_session_completed
-- reads these at award time (with legacy fallbacks), so tuning rewards needs
-- no code deploy. Purpose/usage copy is surfaced in the admin FitCoins tab
-- and (later) the mobile FitCoins screen.

create table if not exists public.fitcoin_activity_tiers (
  id uuid not null default gen_random_uuid(),
  activity_key text not null check (activity_key in (
    'workout_complete', 'outdoor_event_complete', 'streak_bonus',
    'challenge_reward', 'plan_day_complete', 'manual_activity'
  )),
  label text not null,
  coins integer not null default 0,
  daily_cap integer,                   -- null = unlimited
  purpose text,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint fitcoin_activity_tiers_pkey primary key (id),
  constraint fitcoin_activity_tiers_key_unique unique (activity_key)
);

insert into public.fitcoin_activity_tiers (activity_key, label, coins, daily_cap, purpose)
values
  ('workout_complete', 'Complete a workout', 50, null,
   'Awarded when a generated or plan workout session is completed.'),
  ('outdoor_event_complete', 'Complete an outdoor activity', 50, null,
   'Awarded when an outdoor run/ride session is completed.'),
  ('streak_bonus', 'Streak milestone bonus', 100, null,
   'Bonus for reaching 7/14/30/60/100-day streak milestones.'),
  ('challenge_reward', 'Challenge completion', 100, null,
   'Awarded by the challenges flow when a challenge goal is met.'),
  ('plan_day_complete', 'Complete a plan day', 25, 1,
   'Awarded for completing a scheduled day of the active plan.'),
  ('manual_activity', 'Log a manual activity', 10, 3,
   'Small reward for logging activities outside a plan (Today''s Flow).')
on conflict (activity_key) do nothing;

alter table public.fitcoin_activity_tiers enable row level security;
-- No policies: managed via service-role admin routes; mobile reads through
-- get_fitcoin_config() below.

create or replace function public.fitcoin_amount_for(p_activity_key text, p_fallback integer)
returns integer
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select coins from public.fitcoin_activity_tiers
      where activity_key = p_activity_key and is_active = true),
    p_fallback
  );
$$;

-- Rebuilt completion handler: identical pipeline to the 2026-07-14 version,
-- but award amounts now come from fitcoin_activity_tiers (legacy 50/100
-- values kept as fallbacks so behavior is unchanged until an admin edits
-- a tier).
create or replace function public.handle_exercise_session_completed()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_amount integer;
begin
  if new.status = 'completed' and (old.status is distinct from 'completed') then
    perform public.record_workout_completion(new.user_id);

    v_amount := public.fitcoin_amount_for(
      case when new.source = 'outdoor_event'
        then 'outdoor_event_complete' else 'workout_complete' end,
      50
    );
    if v_amount > 0 then
      perform public.award_fitcoins(
        new.user_id, v_amount,
        case when new.source = 'outdoor_event'
          then 'outdoor_event_complete' else 'workout_complete' end,
        new.id
      );
    end if;

    -- streak milestone bonus (7 / 14 / 30 / 60 / 100 days) — fires once per
    -- milestone since current_streak only crosses it a single time
    if (select current_streak from public.fitness_user_streaks where user_id = new.user_id)
       in (7, 14, 30, 60, 100) then
      v_amount := public.fitcoin_amount_for('streak_bonus', 100);
      if v_amount > 0 then
        perform public.award_fitcoins(new.user_id, v_amount, 'streak_bonus', new.id);
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_exercise_session_completed on public.exercise_sessions;
create trigger trg_exercise_session_completed
  after update on public.exercise_sessions
  for each row
  execute function public.handle_exercise_session_completed();

-- Config read for mobile (purpose/usage copy) and admin. fitcoin_rewards is
-- the existing redemption catalog.
create or replace function public.get_fitcoin_config()
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_result jsonb;
begin
  v_result := jsonb_build_object(
    'activity_tiers', (
      select coalesce(jsonb_agg(row_to_json(t) order by t.coins desc), '[]'::jsonb)
      from (
        select activity_key, label, coins, daily_cap, purpose, is_active
        from public.fitcoin_activity_tiers
      ) t
    )
  );

  -- Redemption catalog may predate this migration's repo copy; guard it.
  if to_regclass('public.fitcoin_rewards') is not null then
    v_result := v_result || jsonb_build_object(
      'rewards', (
        select coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb)
        from (
          select * from public.fitcoin_rewards where is_active = true
        ) r
      )
    );
  else
    v_result := v_result || jsonb_build_object('rewards', '[]'::jsonb);
  end if;

  return v_result;
end;
$$;

revoke all on function public.fitcoin_amount_for(text, integer) from public, anon, authenticated;
revoke all on function public.get_fitcoin_config() from public;
grant execute on function public.fitcoin_amount_for(text, integer) to service_role;
grant execute on function public.get_fitcoin_config() to authenticated, service_role;


-- ─── D. Coach attribution ────────────────────────────────────────────────────
-- Admin-entered display name shown as "by Coach Ama" on curated plans.
-- Never derived from the admin's real account name.

alter table public.fitness_plans
  add column if not exists coach_display_name text;


-- ─── E. Dashboard data RPCs ──────────────────────────────────────────────────
-- All user-scoped RPCs enforce identity: non-service-role callers may only
-- read their own data (IDOR guard repeated in every function).

create or replace function public.get_fitness_week(p_user_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_assignment record;
  v_week_start date := (date_trunc('week', now()))::date;
  v_days jsonb;
  v_today jsonb;
  v_next text;
  v_totals jsonb;
  d integer;
  v_date date;
  v_day record;
  v_day_rows jsonb := '[]'::jsonb;
  v_completed boolean;
begin
  if auth.role() <> 'service_role' and p_user_id is distinct from auth.uid() then
    return jsonb_build_object('error', 'forbidden');
  end if;

  select a.id as assignment_id, a.plan_id, a.current_week, a.total_workouts_completed,
         fp.title as plan_title, fp.style_tag, fp.duration_weeks, fp.workouts_per_week
    into v_assignment
  from public.fitness_user_assignments a
  join public.fitness_plans fp on fp.id = a.plan_id
  where a.user_id = p_user_id and a.status = 'active'
  order by a.started_at desc
  limit 1;

  -- Weekly totals from completed sessions + FitCoins earned this week.
  select jsonb_build_object(
    'sessions', count(*)::int,
    'minutes', coalesce(sum(es.total_duration_minutes), 0)::int,
    'kcal', coalesce(sum(es.kcal_burned), 0)::int,
    'fitcoins_earned', coalesce((
      select sum(l.amount)::int from public.app_ledger l
      where l.user_id = p_user_id
        and l.category = 'fitness'
        and l.amount > 0
        and l.created_at >= v_week_start
    ), 0)
  ) into v_totals
  from public.exercise_sessions es
  where es.user_id = p_user_id
    and es.status = 'completed'
    and es.start_time >= v_week_start;

  -- 7-day strip (Mon..Sun) with focus labels from the active plan.
  for d in 0..6 loop
    v_date := v_week_start + d;
    v_day := null;
    if v_assignment is not null then
      select pd.id, pd.title, pd.day_category, pd.is_rest, pd.duration_minutes
        into v_day
      from public.fitness_plan_days pd
      where pd.plan_id = v_assignment.plan_id
        and pd.week_number = v_assignment.current_week
        and pd.day_number = d + 1
      limit 1;
    end if;

    select exists(
      select 1 from public.exercise_sessions es
      where es.user_id = p_user_id
        and es.status = 'completed'
        and (es.start_time at time zone 'utc')::date = v_date
    ) into v_completed;

    v_day_rows := v_day_rows || jsonb_build_object(
      'date', v_date,
      'day_name', to_char(v_date, 'Dy'),
      'is_today', v_date = current_date,
      'focus', case when v_day is null then null else v_day.title end,
      'day_category', case when v_day is null then null else v_day.day_category end,
      'is_rest', case when v_day is null then true else v_day.is_rest end,
      'duration_minutes', case when v_day is null then null else v_day.duration_minutes end,
      'completed', v_completed
    );
  end loop;

  select jsonb_agg(elem) into v_days
  from jsonb_array_elements(v_day_rows) elem;

  -- Next non-rest day label from today onward in the current week.
  select elem ->> 'focus' into v_next
  from jsonb_array_elements(v_day_rows) elem
  where (elem ->> 'date')::date >= current_date
    and (elem ->> 'is_rest')::boolean = false
    and elem ->> 'focus' is not null
  order by (elem ->> 'date')::date
  limit 1;

  select elem into v_today
  from jsonb_array_elements(v_day_rows) elem
  where (elem ->> 'is_today')::boolean;

  return jsonb_build_object(
    'totals', v_totals,
    'days', coalesce(v_days, v_day_rows),
    'today', coalesce(v_today, jsonb_build_object('is_rest', true)),
    'plan', case when v_assignment is null then null else jsonb_build_object(
      'title', v_assignment.plan_title,
      'style_tag', v_assignment.style_tag,
      'current_week', v_assignment.current_week,
      'duration_weeks', v_assignment.duration_weeks,
      'workouts_completed', v_assignment.total_workouts_completed,
      'next_session', v_next
    ) end
  );
end;
$$;

create or replace function public.get_fitness_activity_history(
  p_user_id uuid, p_limit integer default 30, p_offset integer default 0
)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
begin
  if auth.role() <> 'service_role' and p_user_id is distinct from auth.uid() then
    return jsonb_build_object('error', 'forbidden');
  end if;

  return jsonb_build_object(
    'rows', (
      select coalesce(jsonb_agg(row_to_json(r) order by r.start_time desc), '[]'::jsonb)
      from (
        select es.id, es.start_time, es.source, es.total_duration_minutes,
               es.kcal_burned,
               pd.title as plan_day_title,
               oe.title as outdoor_event_title
        from public.exercise_sessions es
        left join public.fitness_plan_days pd on pd.id = es.plan_day_id
        left join public.fitness_outdoor_events oe on oe.id = es.outdoor_event_id
        where es.user_id = p_user_id and es.status = 'completed'
        order by es.start_time desc
        limit greatest(p_limit, 1) offset greatest(p_offset, 0)
      ) r
    ),
    'total', (
      select count(*)::int from public.exercise_sessions es
      where es.user_id = p_user_id and es.status = 'completed'
    )
  );
end;
$$;

-- Real social-proof aggregate (D4): fitness_users created in the last 7 days.
create or replace function public.get_fitness_social_proof()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'joined_last_7_days', (
      select count(*)::int from public.fitness_users
      where created_at >= now() - interval '7 days'
    ),
    'total_members', (select count(*)::int from public.fitness_users)
  );
$$;

revoke all on function public.get_fitness_week(uuid) from public;
revoke all on function public.get_fitness_activity_history(uuid, integer, integer) from public;
revoke all on function public.get_fitness_social_proof() from public;
grant execute on function public.get_fitness_week(uuid) to authenticated, service_role;
grant execute on function public.get_fitness_activity_history(uuid, integer, integer) to authenticated, service_role;
grant execute on function public.get_fitness_social_proof() to authenticated, service_role;


-- ─── F. IDOR hardening: get_fitness_dashboard ───────────────────────────────
-- Previous version accepted any p_user_id without verifying the caller, so
-- any authenticated user could read another user's streak/workouts/coins.
-- Signature kept identical; non-service callers are now locked to self.

create or replace function public.get_fitness_dashboard(p_user_id uuid)
returns json
language plpgsql stable security definer set search_path = public
as $$
begin
  if auth.role() <> 'service_role' and p_user_id is distinct from auth.uid() then
    return json_build_object(
      'day_streak', 0, 'best_streak', 0,
      'total_workouts', 0, 'fitcoins_balance', 0
    );
  end if;

  return (
    select json_build_object(
      'day_streak', case
        when s.last_active_date >= current_date - 1 then coalesce(s.current_streak, 0)
        else 0
      end,
      'best_streak', coalesce(s.best_streak, 0),
      'total_workouts', (
        select count(*) from public.exercise_sessions
        where user_id = p_user_id and status = 'completed'
      ),
      'fitcoins_balance', coalesce(up.fitcoins_balance, 0)
    )
    from public.user_profiles up
    left join public.fitness_user_streaks s on s.user_id = up.user_id
    where up.user_id = p_user_id
  );
end;
$$;


-- ─── G. RBAC seeds ───────────────────────────────────────────────────────────

insert into public.admin_permissions (key, resource, action, description) values
  ('subscriptions.view', 'subscriptions', 'view', 'View user subscriptions and tiers'),
  ('subscriptions.manage', 'subscriptions', 'manage', 'Grant or revoke user subscriptions'),
  ('fitcoins.view', 'fitcoins', 'view', 'View FitCoins tiers, redemptions and ledger'),
  ('fitcoins.manage', 'fitcoins', 'manage', 'Edit FitCoins reward tiers and catalog'),
  ('fitness_notifications.send', 'fitness_notifications', 'send', 'Send fitness notifications to users')
on conflict (key) do nothing;

insert into public.admin_role_permissions (role, permission_key) values
  ('admin', 'subscriptions.view'),
  ('admin', 'subscriptions.manage'),
  ('admin', 'fitcoins.view'),
  ('admin', 'fitcoins.manage'),
  ('admin', 'fitness_notifications.send'),
  ('finance_admin', 'subscriptions.view'),
  ('finance_admin', 'fitcoins.view'),
  ('content_manager', 'fitcoins.view'),
  ('content_manager', 'fitness_notifications.send')
on conflict do nothing;
