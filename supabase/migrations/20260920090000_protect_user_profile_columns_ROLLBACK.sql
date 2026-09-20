-- ROLLBACK for 20260920090000_protect_user_profile_columns
-- Removes the column guard. The API allow-list (lib/user-profile-patch.ts)
-- stays in place; only the direct-PostgREST protection goes away.
begin;
drop trigger if exists trg_protect_user_profile_columns on public.user_profiles;
drop function if exists public.protect_user_profile_columns();
commit;
