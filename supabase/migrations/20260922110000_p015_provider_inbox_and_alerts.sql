-- =============================================================================
-- P0-15: Provider inbox and alerts.
--
-- Applied directly to prod via the Supabase MCP connector 22 Sept 2026. This
-- file is the corrected, final state — see the note at the bottom about the
-- overload-duplication mistake made and fixed in that same session.
-- =============================================================================

-- 1. provider_inbox: item_type, ref_id, status, created_at, read_at exactly
-- as specified, plus title/body (needed to render the inbox without a
-- second round trip per item, and to pass through to dispatch_notification).
-- RLS mirrors provider_activity_log's owner-or-admin-read pattern exactly,
-- plus an owner/admin UPDATE policy so the Business app can mark items
-- read/archived. No INSERT/DELETE policy at all, by design — every write
-- goes through dispatch_provider_alert() below.
create table public.provider_inbox (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  item_type text not null check (item_type in ('enquiry','booking','review','chat','job_application','credential','system')),
  ref_id uuid,
  title text,
  body text,
  status text not null default 'unread' check (status in ('unread','read','archived')),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index provider_inbox_provider_id_idx on public.provider_inbox (provider_id, status, created_at desc);

alter table public.provider_inbox enable row level security;

create policy "provider_inbox owner and admin read" on public.provider_inbox
  for select to authenticated
  using (
    (select public.is_app_admin())
    or exists (select 1 from public.providers p where p.id = provider_inbox.provider_id and p.owner_id = (select auth.uid()))
  );

create policy "provider_inbox owner and admin mark read" on public.provider_inbox
  for update to authenticated
  using (
    (select public.is_app_admin())
    or exists (select 1 from public.providers p where p.id = provider_inbox.provider_id and p.owner_id = (select auth.uid()))
  )
  with check (
    (select public.is_app_admin())
    or exists (select 1 from public.providers p where p.id = provider_inbox.provider_id and p.owner_id = (select auth.uid()))
  );

-- Unlike existing provider_* tables, this project does not auto-grant table
-- privileges to `authenticated` on a newly created table — RLS policies
-- alone don't help if the role has no grant at all (confirmed live: a real
-- authenticated session got 42501 "permission denied for table
-- provider_inbox" until this was added, even though the SELECT policy
-- above was already in place and correct).
grant select, update on public.provider_inbox to authenticated;

-- 2. push tokens per app.
alter table public.user_push_tokens
  add column app text not null default 'consumer' check (app in ('consumer','business'));

-- 3. register_push_token gains a trailing, defaulted p_app param. Additive:
-- every existing call (5 positional/named args, no p_app) keeps working
-- and keeps registering 'consumer' tokens exactly as before. The Business
-- app will pass p_app => 'business'.
CREATE OR REPLACE FUNCTION public.register_push_token(
  p_token text,
  p_platform text DEFAULT NULL::text,
  p_device_name text DEFAULT NULL::text,
  p_os_version text DEFAULT NULL::text,
  p_app_version text DEFAULT NULL::text,
  p_app text DEFAULT 'consumer'::text
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_token IS NULL OR length(trim(p_token)) = 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.user_push_tokens (
    user_id, expo_push_token, platform, device_name, os_version, app_version, app
  )
  VALUES (
    v_user_id, trim(p_token), p_platform, p_device_name, p_os_version, p_app_version, p_app
  )
  ON CONFLICT (expo_push_token) DO UPDATE
    SET user_id      = EXCLUDED.user_id,
        platform     = COALESCE(EXCLUDED.platform, public.user_push_tokens.platform),
        device_name  = COALESCE(EXCLUDED.device_name, public.user_push_tokens.device_name),
        os_version   = COALESCE(EXCLUDED.os_version, public.user_push_tokens.os_version),
        app_version  = COALESCE(EXCLUDED.app_version, public.user_push_tokens.app_version),
        app          = EXCLUDED.app,
        last_seen_at = now();

  UPDATE public.user_profiles
     SET expo_push_token = NULL
   WHERE expo_push_token = trim(p_token)
     AND user_id <> v_user_id;

  PERFORM public.sync_legacy_push_token(v_user_id);
END;
$function$;

-- 4. sync_legacy_push_token must never let a business-app token become the
-- legacy single-slot field that dispatch_notification's consumer fallback
-- reads — otherwise a {member,provider} user who opened the Business app
-- most recently would have their personal (consumer) notifications routed
-- to their business device. Same signature as before, so this is a plain
-- CREATE OR REPLACE, no overload created.
CREATE OR REPLACE FUNCTION public.sync_legacy_push_token(p_user_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE public.user_profiles up
     SET expo_push_token = (
           SELECT t.expo_push_token
             FROM public.user_push_tokens t
            WHERE t.user_id = up.user_id
              AND t.app = 'consumer'
            ORDER BY t.last_seen_at DESC
            LIMIT 1
         )
   WHERE up.user_id = p_user_id;
$function$;

-- 5. dispatch_notification gains a trailing, defaulted p_app param. Every
-- existing caller (chat, jobs, cron reminders — none of which pass p_app)
-- keeps sending to 'consumer' tokens only, unchanged. The legacy
-- user_profiles.expo_push_token fallback is included only for p_app =
-- 'consumer', since that field is inherently the old single-app-era slot.
CREATE OR REPLACE FUNCTION public.dispatch_notification(p_recipients jsonb, p_campaign_id uuid DEFAULT NULL::uuid, p_app text DEFAULT 'consumer'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inserted int := 0;
  v_push_attempted int := 0;
  v_push_queued int := 0;
  v_push_enqueue_error int := 0;
  v_chunk jsonb;
  v_chunk_rows jsonb;
  v_chunk_start int := 0;
  v_total int;
  v_request_id bigint;
BEGIN
  DROP TABLE IF EXISTS _dispatch_rows;

  CREATE TEMP TABLE _dispatch_rows ON COMMIT DROP AS
  WITH recipients AS (
    SELECT
      gen_random_uuid() AS notification_id,
      r.user_id,
      r.title,
      r.body,
      r.type,
      coalesce(r.metadata, '{}'::jsonb) AS metadata,
      coalesce(r.channel_id, 'default') AS channel_id,
      r.category_id
    FROM jsonb_to_recordset(p_recipients) AS r(
      user_id uuid,
      title text,
      body text,
      type text,
      metadata jsonb,
      channel_id text,
      category_id text
    )
  ),
  inserted AS (
    INSERT INTO public.notifications (id, user_id, title, body, type, metadata, campaign_id, is_broadcast)
    SELECT notification_id, user_id, title, body, type, metadata, p_campaign_id, (p_campaign_id IS NOT NULL)
    FROM recipients
  )
  SELECT
    recipients.notification_id AS id,
    recipients.user_id,
    recipients.title,
    recipients.body,
    recipients.type,
    recipients.metadata,
    recipients.channel_id,
    recipients.category_id,
    tokens.expo_push_token
  FROM recipients
  LEFT JOIN LATERAL (
    SELECT DISTINCT t.expo_push_token
      FROM (
        SELECT upt.expo_push_token
          FROM public.user_push_tokens upt
         WHERE upt.user_id = recipients.user_id
           AND upt.app = p_app
        UNION
        SELECT up.expo_push_token
          FROM public.user_profiles up
         WHERE up.user_id = recipients.user_id
           AND up.expo_push_token IS NOT NULL
           AND p_app = 'consumer'
      ) t
  ) tokens ON true;

  SELECT count(DISTINCT id) INTO v_inserted FROM _dispatch_rows;

  INSERT INTO public.notification_delivery_receipts
    (notification_id, campaign_id, user_id, send_status, receipt_status)
  SELECT id, p_campaign_id, user_id, 'skipped_no_token', 'not_applicable'
  FROM _dispatch_rows WHERE expo_push_token IS NULL;

  SELECT count(*) INTO v_total
  FROM _dispatch_rows WHERE expo_push_token IS NOT NULL;

  WHILE v_chunk_start < v_total LOOP
    SELECT jsonb_agg(to_jsonb(chunk_rows) ORDER BY chunk_rows.id, chunk_rows.expo_push_token)
    INTO v_chunk_rows
    FROM (
      SELECT *
      FROM _dispatch_rows
      WHERE expo_push_token IS NOT NULL
      ORDER BY id, expo_push_token
      OFFSET v_chunk_start LIMIT 100
    ) chunk_rows;

    IF v_chunk_rows IS NOT NULL THEN
      SELECT jsonb_agg(
        jsonb_build_object(
          'to', r ->> 'expo_push_token',
          'sound', 'default',
          'title', r ->> 'title',
          'body', r ->> 'body',
          'channelId', r ->> 'channel_id',
          'data', (r -> 'metadata') || jsonb_build_object('type', r ->> 'type', 'notification_id', r ->> 'id')
        ) || case when r ->> 'category_id' is not null
               then jsonb_build_object('categoryId', r ->> 'category_id')
               else '{}'::jsonb end
      ) INTO v_chunk
      FROM jsonb_array_elements(v_chunk_rows) r;

      v_push_attempted := v_push_attempted + jsonb_array_length(v_chunk_rows);

      BEGIN
        v_request_id := net.http_post(
          url := 'https://exp.host/--/api/v2/push/send',
          headers := '{"Content-Type": "application/json", "Accept": "application/json", "Accept-Encoding": "gzip, deflate"}'::jsonb,
          body := v_chunk
        );

        INSERT INTO public.notification_delivery_receipts
          (notification_id, campaign_id, user_id, send_status, expo_request_id, expo_batch_index, expo_push_token)
        SELECT
          (r.value ->> 'id')::uuid,
          p_campaign_id,
          (r.value ->> 'user_id')::uuid,
          'queued',
          v_request_id,
          (r.ordinality - 1)::int,
          r.value ->> 'expo_push_token'
        FROM jsonb_array_elements(v_chunk_rows) WITH ORDINALITY AS r(value, ordinality);

        v_push_queued := v_push_queued + jsonb_array_length(v_chunk_rows);
      EXCEPTION WHEN OTHERS THEN
        INSERT INTO public.notification_delivery_receipts
          (notification_id, campaign_id, user_id, send_status, send_error)
        SELECT (r ->> 'id')::uuid, p_campaign_id, (r ->> 'user_id')::uuid, 'error', SQLERRM
        FROM jsonb_array_elements(v_chunk_rows) r;
        v_push_enqueue_error := v_push_enqueue_error + jsonb_array_length(v_chunk_rows);
      END;
    END IF;

    v_chunk_start := v_chunk_start + 100;
  END LOOP;

  RETURN jsonb_build_object(
    'inserted', v_inserted,
    'push_attempted', v_push_attempted,
    'push_queued', v_push_queued,
    'push_enqueue_error', v_push_enqueue_error
  );
END;
$function$;

-- 6. dispatch_provider_alert: writes the inbox row, then calls
-- dispatch_notification scoped to app='business'. Not wired to any real
-- event trigger yet — nothing in Phase 0/0b fires it (enquiry matching is
-- P1-01, bookings are P2-01, chat is P2-03) — so it's built ahead of its
-- callers, same as grant_provider_capability_override was in P0-11.
CREATE OR REPLACE FUNCTION public.dispatch_provider_alert(
  p_provider_id uuid,
  p_item_type text,
  p_ref_id uuid,
  p_title text,
  p_body text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_owner_id uuid;
  v_inbox_id uuid;
BEGIN
  SELECT owner_id INTO v_owner_id FROM public.providers WHERE id = p_provider_id;
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Provider % not found', p_provider_id;
  END IF;

  INSERT INTO public.provider_inbox (provider_id, item_type, ref_id, title, body, status)
  VALUES (p_provider_id, p_item_type, p_ref_id, p_title, p_body, 'unread')
  RETURNING id INTO v_inbox_id;

  PERFORM public.dispatch_notification(
    jsonb_build_array(
      jsonb_build_object(
        'user_id', v_owner_id,
        'title', p_title,
        'body', p_body,
        'type', p_item_type,
        'metadata', p_metadata || jsonb_build_object('provider_id', p_provider_id, 'inbox_id', v_inbox_id)
      )
    ),
    NULL,
    'business'
  );

  RETURN v_inbox_id;
END;
$function$;

-- No caller yet (see the comment above) — revoke the default PUBLIC grant so
-- this doesn't join the "anon/authenticated-executable, no evidenced
-- caller" pile the epic2 cleanups keep finding.
REVOKE EXECUTE ON FUNCTION public.dispatch_provider_alert(uuid, text, uuid, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dispatch_provider_alert(uuid, text, uuid, text, text, jsonb) TO service_role;

-- dispatch_notification is exclusively a service-role primitive (see its
-- own migration's doc comment, 20260812000000_notification_dispatch_
-- primitive.sql in the mobile repo: "Both just call: supabase.rpc(...)"
-- meaning a service-role client, in Next.js API routes or Edge Functions —
-- never the end-user client). It is SECURITY DEFINER with no internal
-- auth.uid() check, so leaving it PUBLIC-executable (Postgres's default for
-- a newly created function, which this became by gaining a new parameter)
-- would let any authenticated user push arbitrary notifications to any
-- user_id. Checked both repos for a direct client-side .rpc() caller: none.
REVOKE EXECUTE ON FUNCTION public.dispatch_notification(jsonb, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dispatch_notification(jsonb, uuid, text) TO service_role;

-- =============================================================================
-- CREATE OR REPLACE FUNCTION does not replace a function when the new
-- parameter list differs from the old one (a new trailing parameter makes
-- it a distinct signature/overload in Postgres, even with a default) — it
-- creates a second, additional function. Both register_push_token and
-- dispatch_notification briefly had two overloads live on prod (the old
-- 5-arg / 2-arg signature plus the new 6-arg / 3-arg one) until this was
-- caught via a duplicate-row error on a diagnostic query and fixed within
-- the same session, before anything called either function in that window.
-- The two DROP FUNCTION statements below are what actually closes that gap;
-- included here so a fresh apply of this file doesn't recreate it.
-- =============================================================================
DROP FUNCTION IF EXISTS public.dispatch_notification(jsonb, uuid);
DROP FUNCTION IF EXISTS public.register_push_token(text, text, text, text, text);
