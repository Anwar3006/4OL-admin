-- P1-07 · Enforce provider plan staff-seat and department limits.
--
-- The checks live in triggers, not just the invite UI/RPC. That protects the
-- limits from direct writes, signup-time invite claims and future clients.
-- Pending invites reserve seats; the matching invite is excluded when it
-- becomes an active membership so the transition does not consume two seats.

create or replace function public.enforce_provider_member_plan_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_used integer;
  v_email text;
begin
  if new.role = 'owner' or new.status <> 'active' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.role <> 'owner' and old.status = 'active' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.provider_id::text, 0));
  select coalesce(max(ms.tier_limit), 0) into v_limit
  from public.facility_subscriptions fs
  join public.marketing_subscriptions ms on ms.id = fs.subscription_id
  where fs.facility_id = new.provider_id
    and fs.status = 'active'
    and (fs.current_period_end is null or fs.current_period_end > now());

  select lower(email) into v_email from auth.users where id = new.user_id;
  select count(*)::integer into v_used
  from public.provider_members pm
  where pm.provider_id = new.provider_id
    and pm.status = 'active'
    and pm.role <> 'owner';
  v_used := v_used + (
    select count(*)::integer
    from public.provider_member_invites i
    where i.provider_id = new.provider_id
      and i.claimed_at is null
      and (v_email is null or lower(i.email) <> v_email)
  );

  if v_used >= v_limit then
    raise exception 'Staff seat limit reached (% seats). Upgrade your provider plan to invite more staff.', v_limit
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_provider_invite_plan_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_used integer;
begin
  -- Editing an existing unclaimed invitation only changes its metadata; it
  -- does not reserve another seat.
  if tg_op = 'UPDATE' and old.claimed_at is null and new.claimed_at is null then
    return new;
  end if;
  if new.claimed_at is not null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.provider_id::text, 0));
  select coalesce(max(ms.tier_limit), 0) into v_limit
  from public.facility_subscriptions fs
  join public.marketing_subscriptions ms on ms.id = fs.subscription_id
  where fs.facility_id = new.provider_id
    and fs.status = 'active'
    and (fs.current_period_end is null or fs.current_period_end > now());

  select (
    (select count(*) from public.provider_members pm
      where pm.provider_id = new.provider_id and pm.status = 'active' and pm.role <> 'owner')
    +
    (select count(*) from public.provider_member_invites i
      where i.provider_id = new.provider_id and i.claimed_at is null)
  )::integer into v_used;

  if v_used >= v_limit then
    raise exception 'Staff seat limit reached (% seats). Upgrade your provider plan to invite more staff.', v_limit
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_provider_department_plan_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_used integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.provider_id::text, 0));
  select coalesce(max(ms.department_limit), 0) into v_limit
  from public.facility_subscriptions fs
  join public.marketing_subscriptions ms on ms.id = fs.subscription_id
  where fs.facility_id = new.provider_id
    and fs.status = 'active'
    and (fs.current_period_end is null or fs.current_period_end > now());
  select count(*)::integer into v_used
  from public.provider_departments d
  where d.provider_id = new.provider_id;
  if v_used >= v_limit then
    raise exception 'Department limit reached (% departments). Upgrade your provider plan to add another department.', v_limit
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_provider_member_plan_capacity on public.provider_members;
create trigger trg_provider_member_plan_capacity
  before insert or update of status, role on public.provider_members
  for each row execute function public.enforce_provider_member_plan_capacity();

drop trigger if exists trg_provider_invite_plan_capacity on public.provider_member_invites;
create trigger trg_provider_invite_plan_capacity
  before insert or update of claimed_at, email on public.provider_member_invites
  for each row execute function public.enforce_provider_invite_plan_capacity();

drop trigger if exists trg_provider_department_plan_capacity on public.provider_departments;
create trigger trg_provider_department_plan_capacity
  before insert on public.provider_departments
  for each row execute function public.enforce_provider_department_plan_capacity();

revoke execute on function public.enforce_provider_member_plan_capacity() from public, anon, authenticated;
revoke execute on function public.enforce_provider_invite_plan_capacity() from public, anon, authenticated;
revoke execute on function public.enforce_provider_department_plan_capacity() from public, anon, authenticated;
