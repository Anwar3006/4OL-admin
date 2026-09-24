-- Rollback for p203d_chat_rls_close_holes (applied to prod as `p204_chat_rls_close_holes`).
-- Restores the two original INSERT policies exactly as they were, and the grant state.
-- WARNING: this reopens both holes (any authenticated user can post into, or join, any conversation).

drop policy if exists "Members send messages" on public.messages;
create policy "Users send messages" on public.messages
  for insert to authenticated
  with check ((select auth.uid()) = sender_id);

drop policy if exists "Join open groups or be added by a manager" on public.conversation_members;
create policy "Members can insert memberships" on public.conversation_members
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

revoke execute on function public.user_can_manage_conversation(uuid) from authenticated;
drop function if exists public.is_open_group(uuid);
