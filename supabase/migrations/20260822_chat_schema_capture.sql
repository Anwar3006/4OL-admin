-- =============================================================================
-- Gap Analysis Part AH — Chat schema capture + mobile report pipeline
-- =============================================================================
-- Decision points CH-D1/CH-D2:
--   * CH-D1  conversations / conversation_members / messages / message_reads /
--            facility_conversations / content_moderation_flags have existed
--            live-only since before the repo — CREATE TABLE IF NOT EXISTS
--            captures them for fresh builds without touching live state.
--            Ghost RPCs get_conversations / fn_create_group_conversation /
--            fn_mark_conversation_read are captured behind pg_proc guards so
--            the live definitions are NEVER replaced.
--            RLS policies (membership-scoped + admin bypass) are applied so
--            realtime delivery and admin reads keep working either way.
--   * CH-D2  report_chat_content(): the mobile "Report message" entry point
--            that feeds the existing Flagged moderation tab — previously the
--            queue had no manual feed at all.
--
-- Ordering note: 20260820_chats_group_enrichment.sql alters conversations
-- before this file creates it on a fresh build — that pre-existing ordering
-- hazard is documented there; live DBs (the only environment that has ever
-- run these migrations) are unaffected.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. moderation_status enum (live-only until now; labels verified against
--    20260813_reconcile_live_db_fixes.sql).
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'moderation_status') then
    create type public.moderation_status as enum (
      'pending_review', 'approved', 'rejected', 'flagged', 'escalated', 'auto_moderated'
    );
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Table captures (no-ops on the live DB).
-- -----------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'group' check (type in ('direct', 'group')),
  name text,
  description text,
  avatar_url text,
  group_category text,
  is_verified_only boolean not null default false,
  max_members int default 500,
  created_by uuid references auth.users(id),
  last_message_at timestamptz,
  last_message_preview text,
  is_flagged boolean not null default false,
  flagged_reason text,
  flagged_at timestamptz,
  flagged_by uuid,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'admin', 'owner', 'group_leader')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  last_read_at timestamptz,
  is_muted boolean not null default false,
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid references auth.users(id),
  content text,
  message_type text not null default 'text',
  attachment_url text,
  attachment_name text,
  attachment_size int,
  reply_to_id uuid references public.messages(id),
  is_edited boolean not null default false,
  edited_at timestamptz,
  is_flagged boolean not null default false,
  flag_reason text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.message_reads (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table if not exists public.facility_conversations (
  facility_id uuid not null,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  primary key (facility_id, conversation_id)
);

create table if not exists public.content_moderation_flags (
  id uuid primary key default gen_random_uuid(),
  content_type text not null,
  content_id text not null,
  reported_by uuid references auth.users(id),
  report_reason text,
  report_detail text,
  ai_detected boolean not null default false,
  ai_confidence numeric,
  ai_reason text,
  status public.moderation_status not null default 'pending_review',
  action_taken text,
  action_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Additive columns the admin panel already writes (Part E group enrichment).
-- No-ops on the live DB; keeps a fresh DB in step with the code.
alter table public.conversations add column if not exists is_group boolean not null default false;
alter table public.conversations add column if not exists group_name text;
alter table public.conversations add column if not exists group_description text;
alter table public.conversations add column if not exists group_type text not null default 'open';
alter table public.conversations add column if not exists region_restriction text;
alter table public.conversations add column if not exists group_permissions jsonb not null default '{}'::jsonb;
alter table public.conversations add column if not exists group_rules text;
alter table public.conversations add column if not exists status text not null default 'active';

create index if not exists idx_messages_conversation_created
  on public.messages (conversation_id, created_at desc);
create index if not exists idx_conversation_members_user
  on public.conversation_members (user_id);
create index if not exists idx_content_moderation_flags_status
  on public.content_moderation_flags (status, created_at desc);

-- -----------------------------------------------------------------------------
-- 3. RLS — membership-scoped reads with an admin bypass. Admins browse via
--    the browser client (authenticated session, role in user_profiles) and
--    get_flagged_content() is NOT SECURITY DEFINER, so the bypass is required
--    for the Flagged tab to keep working after RLS turns on.
-- -----------------------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_reads enable row level security;
alter table public.facility_conversations enable row level security;
alter table public.content_moderation_flags enable row level security;

create or replace function public.is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id::text = public.request_user_id()
      and cm.left_at is null
  );
$$;

grant execute on function public.is_conversation_member(uuid) to anon, authenticated;

drop policy if exists "conversations_select_member_or_admin" on public.conversations;
create policy "conversations_select_member_or_admin"
on public.conversations for select to authenticated
using (
  public.is_conversation_member(id)
  or public.is_app_admin()
);

drop policy if exists "conversation_members_select_member_or_admin" on public.conversation_members;
create policy "conversation_members_select_member_or_admin"
on public.conversation_members for select to authenticated
using (
  user_id::text = public.request_user_id()
  or public.is_conversation_member(conversation_id)
  or public.is_app_admin()
);

drop policy if exists "messages_select_member_or_admin" on public.messages;
create policy "messages_select_member_or_admin"
on public.messages for select to authenticated
using (
  public.is_conversation_member(conversation_id)
  or public.is_app_admin()
);

drop policy if exists "message_reads_select_own_or_admin" on public.message_reads;
create policy "message_reads_select_own_or_admin"
on public.message_reads for select to authenticated
using (user_id::text = public.request_user_id() or public.is_app_admin());

drop policy if exists "facility_conversations_select" on public.facility_conversations;
create policy "facility_conversations_select"
on public.facility_conversations for select to authenticated
using (public.is_conversation_member(conversation_id) or public.is_app_admin());

drop policy if exists "content_moderation_flags_select_admin" on public.content_moderation_flags;
create policy "content_moderation_flags_select_admin"
on public.content_moderation_flags for select to authenticated
using (public.is_app_admin());

-- Writes stay server-side (service-role API routes + SECURITY DEFINER RPCs);
-- no INSERT/UPDATE/DELETE policies for regular users by design.

-- -----------------------------------------------------------------------------
-- 4. Ghost RPC captures — pg_proc-guarded so live definitions are untouched.
-- -----------------------------------------------------------------------------
do $do$
begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'get_conversations'
  ) then
    create function public.get_conversations(p_user_id uuid, p_limit int default 50)
    returns table (
      id uuid, type text, name text, description text, avatar_url text,
      group_category text, is_verified_only boolean, max_members int,
      last_message_at timestamptz, last_message_preview text,
      unread_count bigint, member_count bigint, is_archived boolean,
      members jsonb
    )
    language plpgsql
    security definer
    set search_path = public
    as $fn$
    begin
      return query
      select
        c.id, c.type, c.name, c.description, c.avatar_url,
        c.group_category, c.is_verified_only, c.max_members,
        c.last_message_at, c.last_message_preview,
        (
          select count(*) from public.messages m
          where m.conversation_id = c.id and m.is_deleted = false
            and m.created_at > coalesce(cm.last_read_at, to_timestamp(0))
            and m.sender_id <> p_user_id
        ) as unread_count,
        (
          select count(*) from public.conversation_members x
          where x.conversation_id = c.id and x.left_at is null
        ) as member_count,
        false as is_archived,
        (
          select coalesce(jsonb_agg(jsonb_build_object(
            'user_id', xm.user_id,
            'first_name', xp.first_name,
            'last_name', xp.last_name,
            'role', xm.role,
            'avatar_url', xp.avatar_url
          )), '[]'::jsonb)
          from public.conversation_members xm
          left join public.user_profiles xp on xp.user_id = xm.user_id
          where xm.conversation_id = c.id and xm.left_at is null
        ) as members
      from public.conversations c
      join public.conversation_members cm
        on cm.conversation_id = c.id and cm.user_id = p_user_id and cm.left_at is null
      where c.is_deleted = false
      order by coalesce(c.last_message_at, c.created_at) desc
      limit p_limit;
    end;
    $fn$;

    revoke all on function public.get_conversations(uuid, int) from public, anon;
    grant execute on function public.get_conversations(uuid, int) to authenticated, service_role;
  end if;

  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'fn_create_group_conversation'
  ) then
    create function public.fn_create_group_conversation(
      p_name text,
      p_description text default null,
      p_created_by uuid default null,
      p_member_ids uuid[] default '{}',
      p_avatar_url text default null,
      p_facility_id uuid default null
    )
    returns uuid
    language plpgsql
    security definer
    set search_path = public
    as $fn$
    declare
      v_id uuid;
      v_member uuid;
    begin
      insert into public.conversations (type, name, description, avatar_url, created_by)
      values ('group', p_name, p_description, p_avatar_url, p_created_by)
      returning id into v_id;

      insert into public.conversation_members (conversation_id, user_id, role)
      values (v_id, p_created_by, 'owner')
      on conflict (conversation_id, user_id) do nothing;

      foreach v_member in array coalesce(p_member_ids, '{}'::uuid[]) loop
        if v_member <> p_created_by then
          insert into public.conversation_members (conversation_id, user_id, role)
          values (v_id, v_member, 'member')
          on conflict (conversation_id, user_id) do nothing;
        end if;
      end loop;

      if p_facility_id is not null then
        insert into public.facility_conversations (facility_id, conversation_id)
        values (p_facility_id, v_id)
        on conflict do nothing;
      end if;

      return v_id;
    end;
    $fn$;

    revoke all on function public.fn_create_group_conversation(text, text, uuid, uuid[], text, uuid) from public, anon;
    grant execute on function public.fn_create_group_conversation(text, text, uuid, uuid[], text, uuid) to authenticated, service_role;
  end if;

  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'fn_mark_conversation_read'
  ) then
    create function public.fn_mark_conversation_read(p_conversation_id uuid, p_user_id uuid)
    returns void
    language plpgsql
    security definer
    set search_path = public
    as $fn$
    begin
      update public.conversation_members
      set last_read_at = now()
      where conversation_id = p_conversation_id and user_id = p_user_id;
    end;
    $fn$;

    revoke all on function public.fn_mark_conversation_read(uuid, uuid) from public, anon;
    grant execute on function public.fn_mark_conversation_read(uuid, uuid) to authenticated, service_role;
  end if;
end;
$do$;

-- -----------------------------------------------------------------------------
-- 5. Sync trigger attachment — fn_sync_moderation_flag() is defined in
--    20260710_message_moderation_sync.sql but its trigger attachment was
--    live-only; capture it here.
-- -----------------------------------------------------------------------------
drop trigger if exists trg_content_moderation_flags_sync on public.content_moderation_flags;
create trigger trg_content_moderation_flags_sync
  after insert on public.content_moderation_flags
  for each row
  when (new.status = 'pending_review')
  execute function public.fn_sync_moderation_flag();

-- -----------------------------------------------------------------------------
-- 6. CH-D2 — mobile report entry point. Feeds the existing Flagged tab:
--    insert flag row -> sync trigger marks the message/conversation flagged.
--    Duplicate pending reports on the same content are coalesced.
-- -----------------------------------------------------------------------------
create or replace function public.report_chat_content(
  p_content_type text,
  p_content_id text,
  p_report_reason text,
  p_report_detail text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_uid uuid := nullif(public.request_user_id(), '')::uuid;
  v_flag_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_content_type not in ('message', 'conversation') then
    raise exception 'Invalid content type';
  end if;

  if nullif(trim(coalesce(p_report_reason, '')), '') is null then
    raise exception 'A report reason is required';
  end if;

  -- The reported content must exist and the reporter must not report their
  -- own content.
  if p_content_type = 'message' then
    if not exists (
      select 1 from public.messages m
      where m.id = p_content_id::uuid and m.is_deleted = false
        and m.sender_id <> v_uid
    ) then
      raise exception 'Message not found';
    end if;
  else
    if not exists (
      select 1 from public.conversations c
      where c.id = p_content_id::uuid and c.is_deleted = false
        and c.created_by <> v_uid
    ) then
      raise exception 'Conversation not found';
    end if;
  end if;

  -- Coalesce: extend an existing pending flag instead of stacking duplicates.
  select id into v_flag_id
  from public.content_moderation_flags
  where content_type = p_content_type
    and content_id = p_content_id
    and status = 'pending_review'
  limit 1;

  if v_flag_id is not null then
    update public.content_moderation_flags
    set report_detail = coalesce(report_detail || ' | ', '') ||
          'Additional report by ' || v_uid::text || ': ' || coalesce(p_report_detail, p_report_reason),
        updated_at = now()
    where id = v_flag_id;
    return jsonb_build_object('ok', true, 'flag_id', v_flag_id, 'deduplicated', true);
  end if;

  insert into public.content_moderation_flags (
    content_type, content_id, reported_by, report_reason, report_detail,
    ai_detected, status
  ) values (
    p_content_type, p_content_id, v_uid, trim(p_report_reason),
    nullif(trim(coalesce(p_report_detail, '')), ''),
    false, 'pending_review'
  )
  returning id into v_flag_id;

  return jsonb_build_object('ok', true, 'flag_id', v_flag_id, 'deduplicated', false);
end;
$function$;

revoke all on function public.report_chat_content(text, text, text, text) from public, anon;
grant execute on function public.report_chat_content(text, text, text, text) to authenticated, service_role;
