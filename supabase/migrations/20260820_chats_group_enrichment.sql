-- Gap Analysis Part E — Chats group enrichment + support ticket vocabulary.
--
-- Findings E.2/E.3:
--   * conversations has no status, group type, region restriction,
--     group permissions or group rules (mockup m-create-group needs all).
--   * chat_support.status is only Open/Closed; the mockup triage flow needs
--     Open/Unread/Pending/Resolved/Escalated (decision E-D1).
--   * TKT-XXXX display ids are formatted from the existing bigserial at
--     render time — no new column (decision E-D2).
--
-- All changes are additive / constraint-swapping; safe to re-run.

-- ---------------------------------------------------------------------------
-- conversations enrichment
-- ---------------------------------------------------------------------------

alter table public.conversations
  add column if not exists status text not null default 'active';

-- Re-apply the vocabulary guard on every run.
alter table public.conversations
  drop constraint if exists conversations_status_check;
alter table public.conversations
  add constraint conversations_status_check
  check (status in ('active', 'inactive', 'archived'));

alter table public.conversations
  add column if not exists group_type text not null default 'open';

alter table public.conversations
  drop constraint if exists conversations_group_type_check;
alter table public.conversations
  add constraint conversations_group_type_check
  check (group_type in ('open', 'verified', 'hcp_verified', 'premium', 'admin'));

-- Backfill group_type from the legacy verified-only toggle.
update public.conversations
set group_type = case when coalesce(is_verified_only, false) then 'hcp_verified' else 'open' end
where group_type = 'open';

alter table public.conversations
  add column if not exists region_restriction text;

-- Keys: allow_messages, allow_media, allow_links, approval_required,
-- announcements_only, moderation_alerts (all boolean, default true for
-- messaging per mockup m-create-group permission checkboxes).
alter table public.conversations
  add column if not exists group_permissions jsonb not null default '{}';

alter table public.conversations
  add column if not exists group_rules text;

comment on column public.conversations.status is
  'Admin-controlled lifecycle: active / inactive / archived (Gap Analysis E.3).';
comment on column public.conversations.group_type is
  'Membership gate: open / verified / hcp_verified / premium / admin (Gap Analysis E.3).';
comment on column public.conversations.group_permissions is
  'Group capability flags managed from m-create-group (Gap Analysis E.3).';

-- ---------------------------------------------------------------------------
-- chat_support 5-status vocabulary (decision E-D1)
-- ---------------------------------------------------------------------------

-- Additive columns the mockup triage flow needs (may already exist from the
-- mobile-side schema — guarded).
alter table public.chat_support
  add column if not exists assigned_to uuid references auth.users(id),
  add column if not exists assigned_at timestamptz,
  add column if not exists escalated_at timestamptz,
  add column if not exists escalated_to uuid references auth.users(id),
  add column if not exists resolution_notes text,
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by uuid references auth.users(id);

-- Backfill legacy Closed tickets to Resolved before tightening the check.
update public.chat_support
set status = 'Resolved'
where status = 'Closed';

alter table public.chat_support
  drop constraint if exists chat_support_status_check;
alter table public.chat_support
  add constraint chat_support_status_check
  check (status in ('Open', 'Unread', 'Pending', 'Resolved', 'Escalated'));

comment on column public.chat_support.status is
  'Triage vocabulary: Open / Unread / Pending / Resolved / Escalated (Gap Analysis E-D1).';
