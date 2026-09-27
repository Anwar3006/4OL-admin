-- =============================================================================
-- AF-05 Part 3 — Group visibility & discovery model (public / locked / private)
-- =============================================================================
-- Adds an explicit Super-Admin `visibility` switch to conversations, ORTHOGONAL
-- to `group_type`:
--   * group_type gates JOINABILITY (open / verified / hcp_verified / premium / admin)
--   * visibility gates LISTING in Discover (public = directory-visible, private
--     = members-only, never listed)
--
-- Before this, visibility was implicit (derived from group_type + category +
-- eligibility) and there was no way for a Super Admin to make a group private.
--
-- Default 'public' preserves existing behaviour: every current group stays
-- directory-visible until a Super Admin flips it.
--
-- Ordering: additive column + check constraint; no data rewrite. Safe to apply
-- before or after the code deploy (the code reads visibility defensively with a
-- 'public' fallback).
-- =============================================================================

alter table public.conversations
  add column if not exists visibility text not null default 'public';

-- Swap in a named check constraint (idempotent).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'conversations_visibility_check'
      and conrelid = 'public.conversations'::regclass
  ) then
    alter table public.conversations
      add constraint conversations_visibility_check
      check (visibility in ('public', 'private'));
  end if;
end;
$$;

-- Discovery lists active public groups; index the filter.
create index if not exists idx_conversations_visibility_group
  on public.conversations (visibility)
  where type = 'group' and is_deleted = false;

comment on column public.conversations.visibility is
  'AF-05 Part 3: directory listing switch. public = shown in Discover to everyone (joinability still gated by group_type/eligibility); private = members-only, never listed. Super-Admin editable. Orthogonal to group_type.';
