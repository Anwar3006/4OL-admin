-- Rollback for 20260924163000_p107c_enforce_provider_plan_capacity.sql
-- Existing staff and departments are never deleted by either direction.

drop trigger if exists trg_provider_member_plan_capacity on public.provider_members;
drop trigger if exists trg_provider_invite_plan_capacity on public.provider_member_invites;
drop trigger if exists trg_provider_department_plan_capacity on public.provider_departments;

drop function if exists public.enforce_provider_member_plan_capacity();
drop function if exists public.enforce_provider_invite_plan_capacity();
drop function if exists public.enforce_provider_department_plan_capacity();
