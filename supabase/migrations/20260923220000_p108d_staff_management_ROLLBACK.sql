-- ROLLBACK for p108d_staff_management
--
-- Drops the staff-management write path. Memberships themselves live in
-- `provider_members` (P1-08a) and are NOT removed here — only the ability to
-- create or change them from the app. Roll back P1-08a to remove those.
--
-- Pending invites ARE destroyed: the table holding them is dropped.

drop trigger if exists trg_claim_provider_invites on public.user_profiles;
drop function if exists public.fn_claim_provider_invites();
drop function if exists public.get_provider_members(uuid);
drop function if exists public.upsert_provider_department(uuid, text, uuid, text, text, text);
drop function if exists public.update_provider_member(uuid, text, uuid, text, boolean);
drop function if exists public.invite_provider_member(uuid, text, text, uuid, text);
drop table if exists public.provider_member_invites;
