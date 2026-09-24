-- P2-03 step 4a: close the two pre-existing holes in chat RLS.
-- Applied to prod 24 Sept 2026 as `p204_chat_rls_close_holes` (the applied name; this file is the same SQL).
--
--   1. messages INSERT required only auth.uid() = sender_id  -> now also requires live membership.
--   2. conversation_members INSERT was auth.uid() = user_id  -> now: self-join only into an OPEN group
--      (not full, not verified-only, not facility, not direct), or be added by a manager of that conversation.
--      Either way the inserted role must be 'member' (before, a self-joiner could insert themselves as owner).
--
-- The service-role API routes (/api/chat/*) bypass RLS and are unaffected.
-- NOTE: can_insert_conversation_member() is NOT attached. Its first disjunct is `target_user_id = request_user_id()`,
-- i.e. the same self-insert-anywhere hole, so attaching it would not have closed hole 2.

create or replace function public.is_open_group(p_conversation_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id
      and c.type = 'group'
      and coalesce(c.is_deleted, false) = false
      and c.group_type = 'open'
      and coalesce(c.is_verified_only, false) = false
      and c.group_category is distinct from 'facility'
      and (select count(*) from public.conversation_members m
           where m.conversation_id = c.id and m.left_at is null) < coalesce(c.max_members, 500)
  );
$$;
revoke all on function public.is_open_group(uuid) from public, anon;
grant execute on function public.is_open_group(uuid) to authenticated, service_role;

-- The August authorization audit revoked authenticated; the new policy below calls it, so it must be granted back.
grant execute on function public.user_can_manage_conversation(uuid) to authenticated;

drop policy if exists "Users send messages" on public.messages;
create policy "Members send messages" on public.messages
  for insert to authenticated
  with check ((select auth.uid()) = sender_id and public.is_conversation_member(conversation_id));

drop policy if exists "Members can insert memberships" on public.conversation_members;
create policy "Join open groups or be added by a manager" on public.conversation_members
  for insert to authenticated
  with check (
    role = 'member'
    and ( ((select auth.uid()) = user_id and public.is_open_group(conversation_id))
          or public.user_can_manage_conversation(conversation_id) )
  );
