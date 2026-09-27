-- ROLLBACK for 20260927000400_af05_governance_rpcs.sql
-- Drops the six AF-05 governance RPCs.

drop function if exists public.fn_invite_to_conversation(uuid, uuid, text, text);
drop function if exists public.fn_respond_invitation(uuid, boolean);
drop function if exists public.fn_request_join(uuid, text);
drop function if exists public.fn_request_add_member(uuid, uuid, text);
drop function if exists public.fn_review_join_request(uuid, boolean, text);
drop function if exists public.fn_set_group_avatar(uuid, text);

notify pgrst, 'reload schema';
