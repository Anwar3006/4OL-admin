-- P1-08e · A staff member can be scoped to more than one department.
--
-- `provider_members.department_id` predates this migration and remains the
-- primary/fallback scope for compatibility.  The join tables below are the
-- authoritative list when a member (or an unclaimed invite) spans units.

create table public.provider_member_department_memberships (
  member_id uuid not null references public.provider_members(id) on delete cascade,
  department_id uuid not null references public.provider_departments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (member_id, department_id)
);

create index provider_member_department_memberships_department_idx
  on public.provider_member_department_memberships(department_id, member_id);

create table public.provider_member_invite_departments (
  invite_id uuid not null references public.provider_member_invites(id) on delete cascade,
  department_id uuid not null references public.provider_departments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (invite_id, department_id)
);

alter table public.provider_member_department_memberships enable row level security;
alter table public.provider_member_invite_departments enable row level security;

-- Preserve every existing single-department assignment before the helper
-- begins consulting the new mapping.
insert into public.provider_member_department_memberships (member_id, department_id)
select id, department_id
from public.provider_members
where department_id is not null
on conflict do nothing;

insert into public.provider_member_invite_departments (invite_id, department_id)
select id, department_id
from public.provider_member_invites
where department_id is not null and claimed_at is null
on conflict do nothing;

create or replace function public.is_provider_member(
  p_provider_id uuid,
  p_permission text default null,
  p_department_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    exists (
      select 1 from public.providers p
      where p.id = p_provider_id and p.owner_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.provider_members m
      where m.provider_id = p_provider_id
        and m.user_id = (select auth.uid())
        and m.status = 'active'
        and (
          p_permission is null
          or exists (
            select 1 from public.provider_role_permissions rp
            where rp.role = m.role and rp.permission_key = p_permission
          )
        )
        and (
          p_department_id is null
          or m.department_id is null
          or exists (
            select 1
            from public.provider_member_department_memberships md
            where md.member_id = m.id and md.department_id = p_department_id
          )
        )
    );
$function$;

revoke execute on function public.is_provider_member(uuid, text, uuid) from public;
grant execute on function public.is_provider_member(uuid, text, uuid) to authenticated;

create or replace function public.get_provider_member_departments(p_provider_id uuid)
returns table(member_id uuid, department_id uuid, department_name text)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_provider_member(p_provider_id, 'staff.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
  select md.member_id, d.id, d.name
  from public.provider_member_department_memberships md
  join public.provider_members m on m.id = md.member_id
  join public.provider_departments d on d.id = md.department_id
  where m.provider_id = p_provider_id and d.status = 'active'
  order by d.name;
end;
$function$;

revoke execute on function public.get_provider_member_departments(uuid) from public, anon;
grant execute on function public.get_provider_member_departments(uuid) to authenticated;

create or replace function public.invite_provider_member_multi_department(
  p_provider_id uuid,
  p_email text,
  p_role text,
  p_department_ids uuid[] default '{}',
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
  v_unscoped boolean;
  v_departments uuid[];
  v_department_id uuid;
  v_user_id uuid;
  v_member_id uuid;
  v_invite_id uuid;
begin
  if not public.is_provider_member(p_provider_id, 'staff.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_role not in ('admin', 'department_manager', 'staff') then
    return jsonb_build_object('ok', false, 'error', 'bad_role');
  end if;
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'error', 'bad_email');
  end if;

  select coalesce(m.department_id is null, true) into v_unscoped
  from public.provider_members m
  where m.provider_id = p_provider_id and m.user_id = v_actor and m.status = 'active';
  v_unscoped := coalesce(v_unscoped, exists(
    select 1 from public.providers p where p.id = p_provider_id and p.owner_id = v_actor
  ));

  select coalesce(array_agg(distinct id order by id), '{}') into v_departments
  from unnest(coalesce(p_department_ids, '{}')) as id;

  if exists (
    select 1 from unnest(v_departments) as id
    where not exists (
      select 1 from public.provider_departments d
      where d.id = id and d.provider_id = p_provider_id and d.status = 'active'
    )
  ) then
    return jsonb_build_object('ok', false, 'error', 'bad_department');
  end if;

  if not v_unscoped and (p_role = 'admin' or cardinality(v_departments) = 0) then
    return jsonb_build_object('ok', false, 'error', 'outside_your_department');
  end if;
  foreach v_department_id in array v_departments loop
    if not public.is_provider_member(p_provider_id, 'staff.manage', v_department_id) then
      return jsonb_build_object('ok', false, 'error', 'outside_your_department');
    end if;
  end loop;

  select u.id into v_user_id from auth.users u where lower(u.email) = v_email;
  if v_user_id is not null then
    insert into public.provider_members
      (provider_id, user_id, department_id, role, status, job_title, invited_by, accepted_at)
    values (p_provider_id, v_user_id, v_departments[1], p_role, 'active', p_job_title, v_actor, now())
    on conflict (provider_id, user_id) do update
      set department_id = excluded.department_id, role = excluded.role,
          status = 'active', job_title = coalesce(excluded.job_title, public.provider_members.job_title)
      where public.provider_members.role <> 'owner'
    returning id into v_member_id;
    if v_member_id is null then
      return jsonb_build_object('ok', false, 'error', 'cannot_modify_owner');
    end if;
    delete from public.provider_member_department_memberships where member_id = v_member_id;
    insert into public.provider_member_department_memberships(member_id, department_id)
    select v_member_id, id from unnest(v_departments) as id;
    return jsonb_build_object('ok', true, 'status', 'added');
  end if;

  insert into public.provider_member_invites
    (provider_id, email, department_id, role, job_title, invited_by)
  values (p_provider_id, v_email, v_departments[1], p_role, p_job_title, v_actor)
  on conflict (provider_id, email) do update
    set department_id = excluded.department_id, role = excluded.role,
        job_title = excluded.job_title, claimed_at = null
  returning id into v_invite_id;
  delete from public.provider_member_invite_departments where invite_id = v_invite_id;
  insert into public.provider_member_invite_departments(invite_id, department_id)
  select v_invite_id, id from unnest(v_departments) as id;
  return jsonb_build_object('ok', true, 'status', 'invited');
end;
$function$;

revoke execute on function public.invite_provider_member_multi_department(uuid, text, text, uuid[], text) from public, anon;
grant execute on function public.invite_provider_member_multi_department(uuid, text, text, uuid[], text) to authenticated;

create or replace function public.update_provider_member_multi_department(
  p_member_id uuid,
  p_role text default null,
  p_department_ids uuid[] default null,
  p_status text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_member public.provider_members%rowtype;
  v_unscoped boolean;
  v_departments uuid[];
  v_department_id uuid;
begin
  select * into v_member from public.provider_members where id = p_member_id;
  if v_member.id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v_member.role = 'owner' then return jsonb_build_object('ok', false, 'error', 'cannot_modify_owner'); end if;
  if not public.is_provider_member(v_member.provider_id, 'staff.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_role is not null and p_role not in ('admin', 'department_manager', 'staff') then
    return jsonb_build_object('ok', false, 'error', 'bad_role');
  end if;
  if p_status is not null and p_status not in ('active', 'suspended') then
    return jsonb_build_object('ok', false, 'error', 'bad_status');
  end if;

  select coalesce(m.department_id is null, true) into v_unscoped
  from public.provider_members m
  where m.provider_id = v_member.provider_id and m.user_id = (select auth.uid()) and m.status = 'active';
  v_unscoped := coalesce(v_unscoped, exists(
    select 1 from public.providers p where p.id = v_member.provider_id and p.owner_id = (select auth.uid())
  ));
  if not v_unscoped and (v_member.department_id is null or not public.is_provider_member(v_member.provider_id, 'staff.manage', v_member.department_id)) then
    return jsonb_build_object('ok', false, 'error', 'outside_your_department');
  end if;

  if p_department_ids is not null then
    select coalesce(array_agg(distinct id order by id), '{}') into v_departments
    from unnest(p_department_ids) as id;
    if exists (
      select 1 from unnest(v_departments) as id where not exists (
        select 1 from public.provider_departments d
        where d.id = id and d.provider_id = v_member.provider_id and d.status = 'active'
      )
    ) then return jsonb_build_object('ok', false, 'error', 'bad_department'); end if;
    if not v_unscoped and (cardinality(v_departments) = 0 or coalesce(p_role, v_member.role) = 'admin') then
      return jsonb_build_object('ok', false, 'error', 'outside_your_department');
    end if;
    foreach v_department_id in array v_departments loop
      if not public.is_provider_member(v_member.provider_id, 'staff.manage', v_department_id) then
        return jsonb_build_object('ok', false, 'error', 'outside_your_department');
      end if;
    end loop;
  end if;
  if not v_unscoped and coalesce(p_role, v_member.role) = 'admin' then
    return jsonb_build_object('ok', false, 'error', 'cannot_grant_admin');
  end if;

  update public.provider_members
  set role = coalesce(p_role, role), status = coalesce(p_status, status),
      department_id = case when p_department_ids is null then department_id else v_departments[1] end,
      updated_at = now()
  where id = p_member_id;
  if p_department_ids is not null then
    delete from public.provider_member_department_memberships where member_id = p_member_id;
    insert into public.provider_member_department_memberships(member_id, department_id)
    select p_member_id, id from unnest(v_departments) as id;
  end if;
  return jsonb_build_object('ok', true);
end;
$function$;

revoke execute on function public.update_provider_member_multi_department(uuid, text, uuid[], text) from public, anon;
grant execute on function public.update_provider_member_multi_department(uuid, text, uuid[], text) to authenticated;

-- Claim every department selected before sign-up, not merely the legacy
-- primary one. Existing claim trigger has already created the member row.
create or replace function public.fn_claim_provider_invites()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_email text;
begin
  select lower(u.email) into v_email from auth.users u where u.id = new.user_id;
  if v_email is null then return new; end if;
  insert into public.provider_members
    (provider_id, user_id, department_id, role, status, job_title, invited_by, invited_at, accepted_at)
  select i.provider_id, new.user_id, i.department_id, i.role, 'active', i.job_title,
         i.invited_by, i.created_at, now()
  from public.provider_member_invites i
  where lower(i.email) = v_email and i.claimed_at is null
  on conflict (provider_id, user_id) do nothing;
  insert into public.provider_member_department_memberships(member_id, department_id)
  select m.id, mid.department_id
  from public.provider_member_invites i
  join public.provider_members m on m.provider_id = i.provider_id and m.user_id = new.user_id
  join public.provider_member_invite_departments mid on mid.invite_id = i.id
  where lower(i.email) = v_email and i.claimed_at is null
  on conflict do nothing;
  update public.provider_member_invites set claimed_at = now()
  where lower(email) = v_email and claimed_at is null;
  return new;
exception when others then
  raise warning 'claim_provider_invites failed for %: %', new.user_id, sqlerrm;
  return new;
end;
$function$;

revoke execute on function public.fn_claim_provider_invites() from public, anon, authenticated;
notify pgrst, 'reload schema';
