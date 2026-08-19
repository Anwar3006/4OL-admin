-- =============================================================================
-- Atomic role-defaults replacement.
--
-- app/api/admin/rbac/route.ts PUT previously did a separate delete() then
-- insert() against admin_role_permissions via two independent HTTP round
-- trips to PostgREST — not a transaction. If the insert failed after the
-- delete succeeded (dropped connection, timeout), the role was left with
-- zero permissions until an operator retried the save. This wraps both
-- steps in one plpgsql function body so they commit or roll back together.
-- =============================================================================

create or replace function public.replace_role_permissions(p_role text, p_permission_keys text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.admin_role_permissions where role = p_role;

  insert into public.admin_role_permissions (role, permission_key)
  select p_role, k from unnest(p_permission_keys) as k
  on conflict do nothing;
end;
$$;

revoke all on function public.replace_role_permissions(text, text[]) from public;
revoke all on function public.replace_role_permissions(text, text[]) from anon;
revoke all on function public.replace_role_permissions(text, text[]) from authenticated;
