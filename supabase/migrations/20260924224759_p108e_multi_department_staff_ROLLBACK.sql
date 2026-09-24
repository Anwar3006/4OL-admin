-- Rollback for 20260924224759_p108e_multi_department_staff.sql.
-- Run only after no client depends on the multi-department RPCs.

drop function if exists public.update_provider_member_multi_department(uuid, text, uuid[], text);
drop function if exists public.invite_provider_member_multi_department(uuid, text, text, uuid[], text);
drop function if exists public.get_provider_member_departments(uuid);

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
  update public.provider_member_invites set claimed_at = now()
  where lower(email) = v_email and claimed_at is null;
  return new;
exception when others then
  raise warning 'claim_provider_invites failed for %: %', new.user_id, sqlerrm;
  return new;
end;
$function$;
revoke execute on function public.fn_claim_provider_invites() from public, anon, authenticated;

create or replace function public.is_provider_member(
  p_provider_id uuid, p_permission text default null, p_department_id uuid default null
) returns boolean language sql stable security definer set search_path to 'public' as $function$
  select exists (select 1 from public.providers p where p.id = p_provider_id and p.owner_id = (select auth.uid()))
  or exists (select 1 from public.provider_members m where m.provider_id = p_provider_id
    and m.user_id = (select auth.uid()) and m.status = 'active'
    and (p_permission is null or exists (select 1 from public.provider_role_permissions rp where rp.role=m.role and rp.permission_key=p_permission))
    and (p_department_id is null or m.department_id is null or m.department_id=p_department_id));
$function$;
revoke execute on function public.is_provider_member(uuid, text, uuid) from public;
grant execute on function public.is_provider_member(uuid, text, uuid) to authenticated;

drop table if exists public.provider_member_invite_departments;
drop table if exists public.provider_member_department_memberships;
notify pgrst, 'reload schema';
