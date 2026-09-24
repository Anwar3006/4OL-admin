-- P2-03 steps 3 · One-to-one conversations, and the three helpers that never worked
--
-- ── fn_get_or_create_direct_conversation ─────────────────────────────────
--
-- PLAN.md refers to this function; it was documented but never written.
-- Everything that existed was group-shaped, which is why `conversations` holds
-- 4 groups and **0 direct rows**.
--
-- Design notes:
--   · It is idempotent, and that is enforced rather than hoped for. A
--     `pg_advisory_xact_lock` on the sorted user pair (plus the enquiry)
--     serialises concurrent callers, so a double tap cannot create two
--     conversations between the same two people. Without it, two taps land two
--     rows and the thread silently forks.
--   · "The same conversation" means: type='direct', not deleted, the same
--     enquiry_id (`is not distinct from`, so NULL matches NULL), both people
--     present, and **exactly two** live members. The member count matters —
--     without it a group that happened to contain both people could be
--     returned as their direct chat.
--   · `p_enquiry_id` ties a chat to the order it is about (Sheet 14 assumes it
--     can). It is authorised: the caller must either own the enquiry or be an
--     active member of a provider that quoted on it. Otherwise anyone could
--     attach a conversation to a stranger's enquiry by guessing its id.
--   · Errors use real SQLSTATEs (42501 / 22023 / 23503) so the client can tell
--     "not allowed" from "bad input" without string-matching a message.
--
-- ── conversations.enquiry_id ─────────────────────────────────────────────
--
-- Nullable, `on delete set null`: a chat about an enquiry is still a real
-- conversation with real messages after the enquiry is gone, so deleting the
-- enquiry must not cascade away the thread. Partial index because the column is
-- NULL on every general conversation.
--
-- ── The three helpers that never worked ──────────────────────────────────
--
-- The handover lists `can_insert_conversation_member`, `user_can_manage_conversation`
-- and `facility_has_privilege` as existing functions to build on. **All three
-- error on every call**, all for the same reason: `conversation_members.user_id`
-- and `user_profiles.user_id` are `uuid`, and each function compares them to a
-- `text` JWT claim, which has no operator:
--
--   ERROR: 42883 operator does not exist: uuid = text
--   ERROR: 42883 operator does not exist: text = subscription_privilege
--
-- `is_conversation_member` is the only one that works, and only because it casts
-- (`cm.user_id::text = public.request_user_id()`). The chat schema was clearly
-- migrated from text to uuid and these three were left behind — the same
-- "written, never called, therefore never found broken" pattern as the rest of
-- this phase. Verified live before this migration by calling each one.
--
-- They are fixed here because P2-03 is about to enforce an access rule and those
-- helpers are what it would naturally be built on. `facility_has_privilege` in
-- particular is the provider half of the `paid_chat` check.
--
-- **`can_insert_conversation_member` is fixed but still attached to nothing.**
-- It is not wired into any policy by this migration — see the note at the end of
-- the P2-03 section in PLAN.md about the conversation_members INSERT policy,
-- which is a behaviour change to a shipped surface and wants its own decision.
--
-- Dry-run on prod in a rolled-back transaction: conversation created with 2
-- members, three consecutive calls returned the same id, self / unknown user /
-- someone else's enquiry refused with 22023 / 23503 / 42501, and both repaired
-- helpers returned a boolean instead of raising.

-- 1. Tie a conversation to the enquiry it is about.
alter table public.conversations
  add column if not exists enquiry_id uuid
  references public.medication_enquiries(id) on delete set null;

comment on column public.conversations.enquiry_id is
  'The enquiry this chat is about (P2-03). NULL for a general conversation. ON DELETE SET NULL, not CASCADE: the thread outlives the enquiry.';

create index if not exists idx_conversations_enquiry
  on public.conversations (enquiry_id)
  where enquiry_id is not null;

-- 2. Repair user_can_manage_conversation: uuid vs text.
create or replace function public.user_can_manage_conversation(target_conversation_id uuid)
returns boolean
language sql
security definer
set search_path to 'public'
as $function$
  -- Casts to text and goes through request_user_id(), matching
  -- is_conversation_member() — the one helper here that always worked.
  select exists (
    select 1 from public.conversation_members
    where conversation_id = target_conversation_id
      and user_id::text = public.request_user_id()
      and role in ('owner', 'admin', 'group_leader')
      and left_at is null
  );
$function$;

-- 3. Repair facility_has_privilege: text vs subscription_privilege.
create or replace function public.facility_has_privilege(p_facility_id uuid, p_privilege text)
returns boolean
language sql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
  -- ms.privileges is subscription_privilege[]; comparing a text parameter to it
  -- has no operator. Casting the ARRAY to text[] (rather than the parameter to
  -- the enum) means an unknown privilege name returns false instead of raising
  -- 22P02 — the right direction for an authorisation check.
  select exists (
    select 1
    from public.facility_subscriptions fs
    join public.marketing_subscriptions ms on fs.subscription_id = ms.id
    where fs.facility_id = p_facility_id
      and fs.status = 'active'
      and (fs.current_period_end is null or fs.current_period_end > now())
      and p_privilege = any (ms.privileges::text[])
  );
$function$;

-- 4. Repair can_insert_conversation_member, and take the debug noise out.
--    Still deliberately not attached to any policy.
create or replace function public.can_insert_conversation_member(
  target_user_id text,
  target_conversation_id uuid
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  -- Was plpgsql with three RAISE NOTICE lines logging every membership check,
  -- and compared uuid columns to a text claim so it raised 42883 regardless.
  -- coalesced to false: with no JWT, `target_user_id = request_user_id()` is
  -- NULL and `null or false or false` is null. RLS reads NULL as "not
  -- permitted", so that failed closed by luck; this fails closed by design.
  select coalesce(
    target_user_id = public.request_user_id()
    or exists (
      select 1 from public.user_profiles
      where user_id::text = public.request_user_id()
        and role in ('admin', 'super_admin')
    )
    or exists (
      select 1 from public.conversation_members
      where conversation_id = target_conversation_id
        and user_id::text = public.request_user_id()
        and role in ('owner', 'admin', 'group_leader')
        and left_at is null
    ),
    false);
$function$;

-- 5. The function P2-03 is actually for.
create or replace function public.fn_get_or_create_direct_conversation(
  p_other_user_id uuid,
  p_enquiry_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_me uuid := auth.uid();
  v_id uuid;
begin
  if v_me is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if p_other_user_id is null or p_other_user_id = v_me then
    raise exception 'A direct conversation needs a different second person'
      using errcode = '22023';
  end if;
  if not exists (select 1 from public.user_profiles up where up.user_id = p_other_user_id) then
    raise exception 'No such user' using errcode = '23503';
  end if;

  -- An enquiry-linked chat has to be an enquiry the caller is part of: either
  -- the patient who raised it, or someone acting for a provider that quoted.
  if p_enquiry_id is not null and not exists (
    select 1 from public.medication_enquiries me
    where me.id = p_enquiry_id
      and (me.user_id = v_me
           or exists (select 1
                        from public.enquiry_responses er
                        join public.provider_members pm on pm.provider_id = er.facility_id
                       where er.enquiry_id = me.id
                         and pm.user_id = v_me
                         and pm.status = 'active'))
  ) then
    raise exception 'That enquiry is not yours' using errcode = '42501';
  end if;

  -- Serialise on the pair so a double tap cannot fork the thread.
  perform pg_advisory_xact_lock(hashtextextended(
    least(v_me::text, p_other_user_id::text) || '|' ||
    greatest(v_me::text, p_other_user_id::text) || '|' ||
    coalesce(p_enquiry_id::text, ''), 0));

  select c.id into v_id
  from public.conversations c
  where c.type = 'direct'
    and c.is_deleted = false
    and c.enquiry_id is not distinct from p_enquiry_id
    and exists (select 1 from public.conversation_members m
                 where m.conversation_id = c.id and m.user_id = v_me and m.left_at is null)
    and exists (select 1 from public.conversation_members m
                 where m.conversation_id = c.id and m.user_id = p_other_user_id and m.left_at is null)
    -- Exactly two live members, or a group containing both people could be
    -- mistaken for their direct chat.
    and (select count(*) from public.conversation_members m
          where m.conversation_id = c.id and m.left_at is null) = 2
  order by c.created_at
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  insert into public.conversations (type, is_group, created_by, enquiry_id)
  values ('direct', false, v_me, p_enquiry_id)
  returning id into v_id;

  insert into public.conversation_members (conversation_id, user_id, role)
  values (v_id, v_me, 'member'), (v_id, p_other_user_id, 'member')
  on conflict (conversation_id, user_id) do nothing;

  return v_id;
end;
$function$;

revoke execute on function public.fn_get_or_create_direct_conversation(uuid, uuid) from public;
grant execute on function public.fn_get_or_create_direct_conversation(uuid, uuid)
  to authenticated, service_role;

notify pgrst, 'reload schema';
