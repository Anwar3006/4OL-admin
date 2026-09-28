-- =============================================================================
-- AF-05 Phase B — Group governance tables: invitations + join requests
-- =============================================================================
-- Two net-new tables backing the moderator governance model:
--   * conversation_invitations   — a moderator invites a user (Accept/Decline).
--   * conversation_join_requests — covers BOTH "user requests to join" AND
--     "member adds someone into a restricted / approval_required group" (which
--     becomes a request, never a direct membership).
--
-- Writes happen only through SECURITY DEFINER RPCs (next migration) and the
-- service-role BFF; RLS here is SELECT-only so the owner (RPC) and admin bypass
-- still work while members/moderators can read the rows they care about.
-- New RLS uses `(select auth.uid())` per repo convention.
-- =============================================================================

create table if not exists public.conversation_invitations (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  invited_user_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid references auth.users(id) on delete set null,
  role text not null default 'member' check (role in ('member', 'moderator')),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'revoked', 'expired')),
  message text,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  expires_at timestamptz
);

create table if not exists public.conversation_join_requests (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  reason text,
  created_at timestamptz not null default now()
);

-- Only one live pending row per (conversation, user) for each table.
create unique index if not exists uq_conversation_invitations_pending
  on public.conversation_invitations (conversation_id, invited_user_id)
  where status = 'pending';
create unique index if not exists uq_conversation_join_requests_pending
  on public.conversation_join_requests (conversation_id, user_id)
  where status = 'pending';

create index if not exists idx_conversation_invitations_user
  on public.conversation_invitations (invited_user_id, status);
create index if not exists idx_conversation_join_requests_conversation
  on public.conversation_join_requests (conversation_id, status);

-- -----------------------------------------------------------------------------
-- RLS — SELECT only. Writes are RPC/service-role only (no INSERT/UPDATE/DELETE
-- policies by design, mirroring the rest of the chat schema).
-- -----------------------------------------------------------------------------
alter table public.conversation_invitations enable row level security;
alter table public.conversation_join_requests enable row level security;

drop policy if exists "conversation_invitations_select" on public.conversation_invitations;
create policy "conversation_invitations_select"
on public.conversation_invitations for select to authenticated
using (
  invited_user_id = (select auth.uid())
  or public.user_can_manage_conversation(conversation_id)
  or public.is_app_admin()
);

drop policy if exists "conversation_join_requests_select" on public.conversation_join_requests;
create policy "conversation_join_requests_select"
on public.conversation_join_requests for select to authenticated
using (
  user_id = (select auth.uid())
  or requested_by = (select auth.uid())
  or public.user_can_manage_conversation(conversation_id)
  or public.is_app_admin()
);

comment on table public.conversation_invitations is
  'AF-05 Phase B: moderator-sent group invitations (Accept/Decline by the invited user).';
comment on table public.conversation_join_requests is
  'AF-05 Phase B: pending group join requests — self-join AND member-adds-someone in a restricted/approval_required group.';

notify pgrst, 'reload schema';
