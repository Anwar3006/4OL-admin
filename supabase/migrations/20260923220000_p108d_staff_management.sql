-- P1-08d · Managing staff and departments
--
-- P1-08a gave `provider_members` and `provider_departments` SELECT policies
-- and no INSERT/UPDATE/DELETE, deliberately: a write policy on
-- provider_members lets a member set their own role, which is a
-- privilege-escalation hole no amount of care in the app closes. Every write
-- goes through the RPCs below — the same reasoning as `provider_inbox` having
-- no INSERT policy (P0-15).
--
-- Invites intentionally do NOT create auth users. A staff member signs up (or
-- already has an account) and the membership is keyed on their email until
-- they do. Minting accounts from here would let anyone with `staff.manage`
-- create logins on the platform.

create table if not exists public.provider_member_invites (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  email text not null,
  department_id uuid references public.provider_departments(id) on delete set null,
  role text not null check (role in ('admin', 'department_manager', 'staff')),
  job_title text,
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  constraint provider_member_invites_unique unique (provider_id, email)
);

create index if not exists provider_member_invites_email_idx
  on public.provider_member_invites (lower(email))
  where claimed_at is null;

alter table public.provider_member_invites enable row level security;

drop policy if exists "provider_member_invites manager read" on public.provider_member_invites;
create policy "provider_member_invites manager read"
  on public.provider_member_invites for select to authenticated
  using (
    (select public.is_app_admin())
    or public.is_provider_member(provider_id, 'staff.manage')
  );

grant select on public.provider_member_invites to authenticated;

-- `owner` is absent from the role check above and from every RPC below. There
-- is exactly one owner and it is `providers.owner_id`; handing the role out
-- through staff management would create a second with no way to say which is
-- the real one.

/**
 * Invite someone to work here.
 *
 * If they already have an account they become an `active` member
 * immediately. If not, the invite waits in `provider_member_invites` and is
 * claimed on sign-up.
 *
 * A department-scoped manager may only invite into their OWN department and
 * may not invite an admin. Without that, `staff.manage` would let a
 * department manager grant business-wide access and escalate sideways.
 */
create or replace function public.invite_provider_member(
  p_provider_id uuid,
  p_email text,
  p_role text,
  p_department_id uuid default null,
  p_job_title text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_email text := lower(trim(p_email));
  v_actor uuid := (select auth.uid());
  v_actor_dept uuid;
  v_actor_role text;
  v_user_id uuid;
begin
  if not public.is_provider_member(p_provider_id, 'staff.manage', p_department_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_role not in ('admin', 'department_manager', 'staff') then
    return jsonb_build_object('ok', false, 'error', 'bad_role');
  end if;
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'error', 'bad_email');
  end if;

  select m.role, m.department_id into v_actor_role, v_actor_dept
  from public.provider_members m
  where m.provider_id = p_provider_id and m.user_id = v_actor and m.status = 'active';

  if v_actor_dept is not null then
    if p_department_id is distinct from v_actor_dept then
      return jsonb_build_object('ok', false, 'error', 'outside_your_department');
    end if;
    if p_role = 'admin' then
      return jsonb_build_object('ok', false, 'error', 'cannot_grant_admin');
    end if;
  end if;

  select u.id into v_user_id from auth.users u where lower(u.email) = v_email;

  if v_user_id is not null then
    insert into public.provider_members
      (provider_id, user_id, department_id, role, status, job_title, invited_by, accepted_at)
    values
      (p_provider_id, v_user_id, p_department_id, p_role, 'active', p_job_title, v_actor, now())
    on conflict (provider_id, user_id) do update
      set department_id = excluded.department_id,
          role = excluded.role,
          status = 'active',
          job_title = coalesce(excluded.job_title, public.provider_members.job_title)
      where public.provider_members.role <> 'owner';

    return jsonb_build_object('ok', true, 'status', 'added');
  end if;

  insert into public.provider_member_invites
    (provider_id, email, department_id, role, job_title, invited_by)
  values
    (p_provider_id, v_email, p_department_id, p_role, p_job_title, v_actor)
  on conflict (provider_id, email) do update
    set department_id = excluded.department_id,
        role = excluded.role,
        job_title = excluded.job_title,
        claimed_at = null;

  return jsonb_build_object('ok', true, 'status', 'invited');
end;
$function$;

revoke execute on function public.invite_provider_member(uuid, text, text, uuid, text) from public, anon;
grant execute on function public.invite_provider_member(uuid, text, text, uuid, text) to authenticated;

/**
 * Change a member's role or department, or suspend them.
 *
 * The owner's row is untouchable here: it is derived from
 * `providers.owner_id`, and letting an admin suspend the owner would lock the
 * business out of itself.
 */
create or replace function public.update_provider_member(
  p_member_id uuid,
  p_role text default null,
  p_department_id uuid default null,
  p_status text default null,
  p_clear_department boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_member public.provider_members%rowtype;
  v_actor_dept uuid;
begin
  select * into v_member from public.provider_members where id = p_member_id;
  if v_member.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if not public.is_provider_member(v_member.provider_id, 'staff.manage', v_member.department_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if v_member.role = 'owner' then
    return jsonb_build_object('ok', false, 'error', 'cannot_modify_owner');
  end if;
  if p_role is not null and p_role not in ('admin', 'department_manager', 'staff') then
    return jsonb_build_object('ok', false, 'error', 'bad_role');
  end if;
  if p_status is not null and p_status not in ('active', 'suspended') then
    return jsonb_build_object('ok', false, 'error', 'bad_status');
  end if;

  select m.department_id into v_actor_dept
  from public.provider_members m
  where m.provider_id = v_member.provider_id
    and m.user_id = (select auth.uid()) and m.status = 'active';

  if v_actor_dept is not null then
    if p_role = 'admin' then
      return jsonb_build_object('ok', false, 'error', 'cannot_grant_admin');
    end if;
    if p_clear_department or (p_department_id is not null and p_department_id <> v_actor_dept) then
      return jsonb_build_object('ok', false, 'error', 'outside_your_department');
    end if;
  end if;

  update public.provider_members
     set role = coalesce(p_role, role),
         department_id = case when p_clear_department then null
                              else coalesce(p_department_id, department_id) end,
         status = coalesce(p_status, status),
         updated_at = now()
   where id = p_member_id;

  return jsonb_build_object('ok', true);
end;
$function$;

revoke execute on function public.update_provider_member(uuid, text, uuid, text, boolean) from public, anon;
grant execute on function public.update_provider_member(uuid, text, uuid, text, boolean) to authenticated;

/** Create or rename a department. `settings.manage`, not `staff.manage`. */
create or replace function public.upsert_provider_department(
  p_provider_id uuid,
  p_name text,
  p_id uuid default null,
  p_department_type text default null,
  p_code text default null,
  p_status text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid;
  v_name text := nullif(trim(p_name), '');
begin
  if not public.is_provider_member(p_provider_id, 'settings.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if v_name is null then
    raise exception 'A department needs a name';
  end if;

  if p_id is null then
    insert into public.provider_departments (provider_id, name, department_type, code, status)
    values (p_provider_id, v_name, p_department_type, p_code, coalesce(p_status, 'active'))
    returning id into v_id;
  else
    update public.provider_departments
       set name = v_name,
           department_type = coalesce(p_department_type, department_type),
           code = coalesce(p_code, code),
           status = coalesce(p_status, status),
           updated_at = now()
     where id = p_id and provider_id = p_provider_id
    returning id into v_id;

    if v_id is null then
      raise exception 'Department not found for this provider';
    end if;
  end if;

  return v_id;
end;
$function$;

revoke execute on function public.upsert_provider_department(uuid, text, uuid, text, text, text) from public, anon;
grant execute on function public.upsert_provider_department(uuid, text, uuid, text, text, text) to authenticated;

/**
 * The Staff screen's read: who works here, with their email.
 *
 * Email comes from `auth.users`, which the app cannot read directly — that is
 * the whole reason this is an RPC rather than a view. Pending invites are
 * included with a null `user_id` so the screen can show "invited, waiting for
 * them to sign up" rather than losing them.
 */
create or replace function public.get_provider_members(p_provider_id uuid)
returns table(
  member_id uuid,
  user_id uuid,
  email text,
  full_name text,
  role text,
  status text,
  department_id uuid,
  department_name text,
  job_title text,
  is_you boolean,
  invited_at timestamptz,
  accepted_at timestamptz
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_provider_member(p_provider_id, 'staff.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
  select m.id, m.user_id, u.email::text,
         nullif(trim(coalesce(up.first_name,'') || ' ' || coalesce(up.last_name,'')), ''),
         m.role, m.status, m.department_id, d.name, m.job_title,
         (m.user_id = (select auth.uid())),
         m.invited_at, m.accepted_at
  from public.provider_members m
  left join auth.users u on u.id = m.user_id
  left join public.user_profiles up on up.user_id = m.user_id
  left join public.provider_departments d on d.id = m.department_id
  where m.provider_id = p_provider_id

  union all

  select i.id, null::uuid, i.email, null::text,
         i.role, 'invited'::text, i.department_id, d.name, i.job_title,
         false, i.created_at, null::timestamptz
  from public.provider_member_invites i
  left join public.provider_departments d on d.id = i.department_id
  where i.provider_id = p_provider_id and i.claimed_at is null

  order by 5, 6;
end;
$function$;

revoke execute on function public.get_provider_members(uuid) from public, anon;
grant execute on function public.get_provider_members(uuid) to authenticated;

/**
 * Turns pending invites into memberships when someone signs up.
 *
 * Fires on `user_profiles` insert rather than `auth.users`: this project's
 * own trigger convention lives on user_profiles (`handle_new_user`), and
 * `auth.users` is Supabase's table, not ours.
 */
create or replace function public.fn_claim_provider_invites()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_email text;
begin
  select lower(u.email) into v_email from auth.users u where u.id = new.user_id;
  if v_email is null then
    return new;
  end if;

  insert into public.provider_members
    (provider_id, user_id, department_id, role, status, job_title, invited_by, invited_at, accepted_at)
  select i.provider_id, new.user_id, i.department_id, i.role, 'active', i.job_title,
         i.invited_by, i.created_at, now()
  from public.provider_member_invites i
  where lower(i.email) = v_email and i.claimed_at is null
  on conflict (provider_id, user_id) do nothing;

  update public.provider_member_invites
     set claimed_at = now()
   where lower(email) = v_email and claimed_at is null;

  return new;
exception when others then
  -- Never cost someone their sign-up because an invite could not be claimed.
  raise warning 'claim_provider_invites failed for %: %', new.user_id, sqlerrm;
  return new;
end;
$function$;

revoke execute on function public.fn_claim_provider_invites() from public, anon, authenticated;

drop trigger if exists trg_claim_provider_invites on public.user_profiles;
create trigger trg_claim_provider_invites
  after insert on public.user_profiles
  for each row
  execute function public.fn_claim_provider_invites();
