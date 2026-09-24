-- Rollback for 20260924003000_fix_reconcile_notification_receipts.sql
--
-- ⚠ THIS RESTORES A FUNCTION THAT IS KNOWN TO BE BROKEN. The previous
-- definition posts to Expo and then waits for the response inside the same
-- transaction, which pg_net cannot deliver, so every invocation that has
-- anything to reconcile busy-waits until the 120s statement_timeout and fails.
-- It failed 1,492 consecutive times before being replaced, and had never
-- successfully read a single Expo receipt. There is no state in the new version
-- that makes rolling back safer than fixing forward.
--
-- The only sane reason to run this is if the NEW function turns out to break
-- something worse. If you do run it, consider also unscheduling the job so it
-- stops burning a worker every 10 minutes:
--
--     select cron.unschedule('reconcile-notification-receipts');
--
-- Data note: rows stamped with receipt_request_id / receipt_requested_at lose
-- those values when the columns are dropped. Receipts already settled to
-- 'ok'/'error' by the new version KEEP their status and receipt_checked_at —
-- that data is correct and is not undone here. Push tokens deleted because Expo
-- reported DeviceNotRegistered are NOT restored, and should not be: that device
-- genuinely cannot receive pushes.

create or replace function public.reconcile_notification_receipts()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  v_batch_ids uuid[];
  v_batch_tickets text[];
  v_request_id bigint;
  v_result net.http_response_result;
  v_receipts jsonb;
  v_ticket_id text;
  v_receipt jsonb;
  v_ok int := 0;
  v_error int := 0;
  v_expired int := 0;
  i int;
BEGIN
  UPDATE public.notification_delivery_receipts
  SET receipt_status = 'expired'
  WHERE receipt_status = 'pending'
    AND send_status = 'ok'
    AND expo_ticket_id IS NOT NULL
    AND created_at < now() - interval '48 hours';
  GET DIAGNOSTICS v_expired = ROW_COUNT;

  SELECT array_agg(id), array_agg(expo_ticket_id)
  INTO v_batch_ids, v_batch_tickets
  FROM (
    SELECT id, expo_ticket_id
    FROM public.notification_delivery_receipts
    WHERE receipt_status = 'pending'
      AND send_status = 'ok'
      AND expo_ticket_id IS NOT NULL
      AND created_at < now() - interval '15 minutes'
      AND created_at >= now() - interval '48 hours'
    ORDER BY created_at
    LIMIT 300
  ) batch;

  IF v_batch_ids IS NOT NULL AND array_length(v_batch_ids, 1) > 0 THEN
    BEGIN
      v_request_id := net.http_post(
        url := 'https://exp.host/--/api/v2/push/getReceipts',
        headers := '{"Content-Type": "application/json", "Accept": "application/json", "Accept-Encoding": "gzip, deflate"}'::jsonb,
        body := jsonb_build_object('ids', to_jsonb(v_batch_tickets))
      );

      SELECT * INTO v_result FROM net._http_collect_response(v_request_id, false);

      IF v_result.status = 'SUCCESS' AND (v_result.response).status_code = 200 THEN
        v_receipts := ((v_result.response).body::jsonb) -> 'data';

        FOR i IN 1 .. array_length(v_batch_ids, 1) LOOP
          v_ticket_id := v_batch_tickets[i];
          v_receipt := v_receipts -> v_ticket_id;

          IF v_receipt IS NOT NULL THEN
            IF v_receipt ->> 'status' = 'ok' THEN
              UPDATE public.notification_delivery_receipts
              SET receipt_status = 'ok', receipt_checked_at = now()
              WHERE id = v_batch_ids[i];
              v_ok := v_ok + 1;
            ELSE
              UPDATE public.notification_delivery_receipts
              SET receipt_status = 'error',
                  receipt_error = coalesce(v_receipt -> 'details' ->> 'error', v_receipt ->> 'message'),
                  receipt_checked_at = now()
              WHERE id = v_batch_ids[i];
              v_error := v_error + 1;

              IF coalesce(v_receipt -> 'details' ->> 'error', '') = 'DeviceNotRegistered' THEN
                UPDATE public.user_profiles up
                SET expo_push_token = NULL
                FROM public.notification_delivery_receipts r
                WHERE r.id = v_batch_ids[i] AND up.user_id = r.user_id;
              END IF;
            END IF;
          END IF;
        END LOOP;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  UPDATE public.notification_campaigns c
  SET delivery_stats = coalesce(c.delivery_stats, '{}'::jsonb) || jsonb_build_object(
    'receipts_ok', (SELECT count(*) FROM public.notification_delivery_receipts r WHERE r.campaign_id = c.id AND r.receipt_status = 'ok'),
    'receipts_error', (SELECT count(*) FROM public.notification_delivery_receipts r WHERE r.campaign_id = c.id AND r.receipt_status = 'error'),
    'receipts_pending', (SELECT count(*) FROM public.notification_delivery_receipts r WHERE r.campaign_id = c.id AND r.receipt_status = 'pending'),
    'receipts_expired', (SELECT count(*) FROM public.notification_delivery_receipts r WHERE r.campaign_id = c.id AND r.receipt_status = 'expired')
  )
  WHERE c.id IN (
    SELECT DISTINCT campaign_id FROM public.notification_delivery_receipts
    WHERE campaign_id IS NOT NULL AND receipt_checked_at > now() - interval '20 minutes'
  );

  RETURN jsonb_build_object('receipts_ok', v_ok, 'receipts_error', v_error, 'receipts_expired', v_expired);
END;
$function$;

drop index if exists public.idx_ndr_receipt_request;

alter table public.notification_delivery_receipts
  drop column if exists receipt_requested_at;
alter table public.notification_delivery_receipts
  drop column if exists receipt_request_id;
