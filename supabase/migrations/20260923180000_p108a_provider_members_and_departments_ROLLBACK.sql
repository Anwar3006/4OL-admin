-- ROLLBACK for 20260923180000_p108a_provider_members_and_departments.sql
--
-- Safe to run only while P1-08b has NOT been applied. Once the 9 functions
-- and 19 policies have been swapped to `is_provider_member(...)`, dropping
-- that function takes provider authorisation with it — roll back P1-08b
-- first, which restores the `owner_id = auth.uid()` checks.
--
-- Nothing read these tables before P1-08b, so up to that point this is a
-- clean removal. It does destroy any staff memberships and departments
-- created in the meantime; there is no way to preserve them, because the
-- model they live in is what is being removed.

drop trigger if exists trg_provider_members_updated_at on public.provider_members;
drop trigger if exists trg_provider_departments_updated_at on public.provider_departments;

drop function if exists public.is_provider_member(uuid, text, uuid);

-- Order matters: role_permissions references permissions, members references
-- departments, and both reference providers.
drop table if exists public.provider_role_permissions;
drop table if exists public.provider_permissions;
drop table if exists public.provider_members;
drop table if exists public.provider_departments;
