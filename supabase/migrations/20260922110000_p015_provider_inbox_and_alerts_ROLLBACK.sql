-- Rollback for 20260922110000_p015_provider_inbox_and_alerts.sql

DROP FUNCTION IF EXISTS public.dispatch_provider_alert(uuid, text, uuid, text, text, jsonb);

-- Restore dispatch_notification to its exact pre-migration 2-arg body and
-- grants (fetched via pg_get_functiondef() off prod before this migration
-- ran). Also restores the original PUBLIC execute grant, whatever its
-- actual prior value was assumed to be from Postgres's function-creation
-- default (the original object was dropped when this migration replaced it
-- with a new-signature version, so its literal prior grant row is not
-- recoverable — this reinstates the same PUBLIC default the surviving
-- register_push_token overload still carries).
DROP FUNCTION IF EXISTS public.dispatch_notification(jsonb, uuid, text);
CREATE OR REPLACE FUNCTION public.dispatch_notification(p_recipients jsonb, p_campaign_id uuid DEFAULT NULL::uuid)
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
        UNION
        SELECT up.expo_push_token
          FROM public.user_profiles up
         WHERE up.user_id = recipients.user_id
           AND up.expo_push_token IS NOT NULL
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
GRANT EXECUTE ON FUNCTION public.dispatch_notification(jsonb, uuid) TO PUBLIC;

DROP FUNCTION IF EXISTS public.register_push_token(text, text, text, text, text, text);
CREATE OR REPLACE FUNCTION public.register_push_token(p_token text, p_platform text DEFAULT NULL::text, p_device_name text DEFAULT NULL::text, p_os_version text DEFAULT NULL::text, p_app_version text DEFAULT NULL::text)
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
    user_id, expo_push_token, platform, device_name, os_version, app_version
  )
  VALUES (
    v_user_id, trim(p_token), p_platform, p_device_name, p_os_version, p_app_version
  )
  ON CONFLICT (expo_push_token) DO UPDATE
    SET user_id      = EXCLUDED.user_id,
        platform     = COALESCE(EXCLUDED.platform, public.user_push_tokens.platform),
        device_name  = COALESCE(EXCLUDED.device_name, public.user_push_tokens.device_name),
        os_version   = COALESCE(EXCLUDED.os_version, public.user_push_tokens.os_version),
        app_version  = COALESCE(EXCLUDED.app_version, public.user_push_tokens.app_version),
        last_seen_at = now();

  UPDATE public.user_profiles
     SET expo_push_token = NULL
   WHERE expo_push_token = trim(p_token)
     AND user_id <> v_user_id;

  PERFORM public.sync_legacy_push_token(v_user_id);
END;
$function$;

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
            ORDER BY t.last_seen_at DESC
            LIMIT 1
         )
   WHERE up.user_id = p_user_id;
$function$;

alter table public.user_push_tokens drop column app;

drop table public.provider_inbox;
