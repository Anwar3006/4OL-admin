-- ============================================================================
-- RLS Helper Functions
-- ============================================================================
-- These functions are required for the RLS policies to work correctly.
-- They should be created in the public schema.
-- ============================================================================

-- 1. Standardize "who is calling?"
create or replace function public.request_user_id()
returns text
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::text
$$;

-- 2. Centralize role checks
create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles up
    where up.user_id = public.request_user_id()
      and up.role in ('admin', 'super_admin')
  );
$$;

-- 3. Standard trigger function for updated_at columns
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Grant execute permissions
grant execute on function public.request_user_id() to anon, authenticated;
grant execute on function public.is_app_admin() to anon, authenticated;
grant execute on function public.update_updated_at_column() to anon, authenticated;