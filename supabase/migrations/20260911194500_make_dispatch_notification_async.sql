-- dispatch_notification(jsonb, uuid) fired net.http_post (async, fine) then
-- immediately blocked on net._http_collect_response(v_request_id, false) in
-- the same statement, waiting inline for Expo's response. Called through
-- PostgREST/an edge function, that blocking wait exceeded the platform's
-- statement/request timeout the moment Expo took more than a few seconds to
-- respond -- which is exactly what just happened testing this live.
--
-- notification_delivery_receipts already has expo_request_id/expo_batch_index
-- columns and send_status already allows 'queued', and collect_push_tickets()
-- (cron, every minute) already reads exactly that shape to reconcile ticket
-- status asynchronously, including the DeviceNotRegistered cleanup -- but
-- dispatch_notification never wrote a 'queued' row, so that cron had nothing
-- to reconcile. This makes dispatch_notification fire-and-forget: enqueue the
-- push, record one 'queued' receipt per recipient with the request id + this
-- recipient's position in the batch, and let collect_push_tickets finish the
-- job it was already built for.
create or replace function public.dispatch_notification(p_recipients jsonb, p_campaign_id uuid default null::uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
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
      coalesce(r.channel_id, 'default') AS channel_id
    FROM jsonb_to_recordset(p_recipients) AS r(
      user_id uuid,
      title text,
      body text,
      type text,
      metadata jsonb,
      channel_id text
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
        )
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
