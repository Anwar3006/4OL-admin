-- Fix: reconcile_notification_receipts() has never once worked, and since
-- 12 Sept it has also been burning a worker for 2 minutes every 10 minutes.
--
-- ── What was happening ───────────────────────────────────────────────────
--
-- From cron.job_run_details (job 26, `*/10 * * * *`): 1,492 failed runs since
-- 2026-09-12 02:00, every one of them **120.1 seconds** long, every one of them
-- dying at the same place:
--
--   ERROR: canceling statement due to statement timeout
--   CONTEXT: SQL statement "SELECT pg_sleep(0.05)"
--     PL/pgSQL function net._await_response(bigint) line 13 at PERFORM
--     PL/pgSQL function net._http_collect_response(bigint,boolean) line 8
--     PL/pgSQL function reconcile_notification_receipts() line 45
--
-- The function called `net.http_post(...)` and then, in the SAME transaction,
-- `net._http_collect_response(v_request_id, false)` — `false` meaning "don't
-- return until the response is here". **pg_net cannot deliver a response in the
-- transaction that queued the request.** `http_post` inserts into
-- `net.http_request_queue`; the pg_net background worker only sees that row once
-- the transaction COMMITS. So the function committed nothing, waited, and
-- `_await_response` busy-looped on `pg_sleep(0.05)` until the 120s
-- statement_timeout killed it. Every single time.
--
-- Two things hid this for a month:
--
--   1. **The `EXCEPTION WHEN OTHERS THEN NULL` around the block did not catch
--      it.** PL/pgSQL's `WHEN OTHERS` deliberately does not trap
--      `query_canceled` (or `assert_failure`), so the statement timeout blew
--      straight through the handler that was meant to make this best-effort.
--   2. **The 4,452 "succeeded" runs before 18 Sept were runs that did nothing.**
--      They took 0.1s because `v_batch_ids` was NULL — no receipts were old
--      enough to ask about — so the HTTP block was skipped entirely. As soon as
--      there was anything to reconcile, it hung.
--
-- The proof that it never worked: `receipt_checked_at` is NULL on **every** row
-- in notification_delivery_receipts, and `receipt_status` is 'pending' on all of
-- them. Not one Expo receipt has ever been read. Delivery failures —
-- DeviceNotRegistered in particular, which is how a dead push token is supposed
-- to get cleaned up — have been invisible since the feature shipped.
--
-- ── The fix: do what the sibling function already does ───────────────────
--
-- `collect_push_tickets()` (job 32, every minute) solves exactly this problem
-- correctly, and has 1,440 successful runs a day at 0.05s each: it stores the
-- pg_net request id at send time and, on a LATER run, reads
-- `net._http_response` by that id. It never waits.
--
-- This rewrite gives receipts the same two-phase shape, in one function so the
-- cron entry does not change:
--
--   Phase 1 COLLECT — for each in-flight request, read net._http_response. Got a
--     200? Parse it and settle those rows. Nothing there yet? Leave it. Nothing
--     there after an hour, or a non-200? Un-stamp the rows so a later run asks
--     again.
--   Phase 2 REQUEST — take up to 300 pending rows nobody is currently asking
--     about, POST to Expo, stamp them with the request id, and return. **No
--     wait anywhere**, so statement_timeout has nothing to bite.
--
-- Collect runs BEFORE request, so one invocation finishes the previous batch and
-- starts the next; at a 10-minute cadence pg_net has ample time in between.
--
-- Also fixed while in here: the campaign rollup ran FOUR correlated subqueries
-- per campaign over the whole receipts table. Rewritten as one grouped pass.
-- With 14 rows that is academic; it is the next thing that would have timed out.

-- ── 1. Track which pg_net request is asking about which rows ──────────────

alter table public.notification_delivery_receipts
  add column if not exists receipt_request_id bigint;

alter table public.notification_delivery_receipts
  add column if not exists receipt_requested_at timestamptz;

comment on column public.notification_delivery_receipts.receipt_request_id is
  'The pg_net request id currently asking Expo about this row, mirroring expo_request_id on the send side. NULL = nobody is asking, so it is eligible for the next batch.';
comment on column public.notification_delivery_receipts.receipt_requested_at is
  'When receipt_request_id was stamped. Needed to abandon a request whose response never arrived — the row''s own created_at can be up to 48h old and says nothing about when we asked.';

-- Phase 1 groups by this; phase 2 filters on it being null.
create index if not exists idx_ndr_receipt_request
  on public.notification_delivery_receipts (receipt_request_id)
  where receipt_status = 'pending';

-- ── 2. The function ──────────────────────────────────────────────────────

create or replace function public.reconcile_notification_receipts()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_req record;
  v_resp record;
  v_receipts jsonb;
  v_batch_ids uuid[];
  v_batch_tickets text[];
  v_request_id bigint;
  v_ok int := 0;
  v_error int := 0;
  v_expired int := 0;
  v_retried int := 0;
  v_requested int := 0;
begin
  -- Two runs must never ask Expo about the same rows. Cheap insurance: if a
  -- previous run is somehow still going, this one does nothing rather than
  -- double-posting. Released automatically at end of transaction.
  if not pg_try_advisory_xact_lock(hashtext('reconcile_notification_receipts')) then
    return jsonb_build_object('skipped', 'already running');
  end if;

  -- ── Phase 0: give up on anything too old to be worth asking about ───────
  -- Expo keeps receipts for about 24h; past 48h the answer is never coming.
  update public.notification_delivery_receipts
  set receipt_status = 'expired',
      receipt_checked_at = now()
  where receipt_status = 'pending'
    and send_status = 'ok'
    and expo_ticket_id is not null
    and created_at < now() - interval '48 hours';
  get diagnostics v_expired = row_count;

  -- ── Phase 1: collect responses to requests already in flight ───────────
  for v_req in
    select distinct receipt_request_id, min(receipt_requested_at) as asked_at
    from public.notification_delivery_receipts
    where receipt_status = 'pending'
      and receipt_request_id is not null
    group by receipt_request_id
    order by 1
    limit 50
  loop
    select * into v_resp from net._http_response where id = v_req.receipt_request_id;

    if not found then
      -- pg_net garbage-collects responses after a few hours. If nothing landed
      -- within the hour, the request is lost; un-stamp so a later run re-asks.
      if v_req.asked_at is null or v_req.asked_at < now() - interval '1 hour' then
        update public.notification_delivery_receipts
        set receipt_request_id = null, receipt_requested_at = null
        where receipt_request_id = v_req.receipt_request_id
          and receipt_status = 'pending';
        v_retried := v_retried + 1;
      end if;
      continue;
    end if;

    v_receipts := null;
    if v_resp.status_code = 200 and v_resp.content is not null then
      begin
        v_receipts := (v_resp.content::jsonb) -> 'data';
      exception when others then
        -- A body that is not the JSON we expect. Treated as no answer, below.
        v_receipts := null;
      end;
    end if;

    if v_receipts is null then
      -- Expo said something we cannot use (non-200, or unparseable). Nothing is
      -- known about delivery either way, so un-stamp and let a later run ask
      -- again; the 48h sweep in phase 0 is the backstop that ends the retrying.
      update public.notification_delivery_receipts
      set receipt_request_id = null, receipt_requested_at = null
      where receipt_request_id = v_req.receipt_request_id
        and receipt_status = 'pending';
      v_retried := v_retried + 1;
      continue;
    end if;

    -- Expo returns an object keyed by ticket id, so settle by ticket rather
    -- than by array position (the send side has to use position; this does not,
    -- and keying off the id is the safer of the two).
    update public.notification_delivery_receipts r
    set receipt_status = case when v_receipts -> r.expo_ticket_id ->> 'status' = 'ok'
                              then 'ok' else 'error' end,
        receipt_error = case when v_receipts -> r.expo_ticket_id ->> 'status' = 'ok'
                              then null
                            else coalesce(
                              v_receipts -> r.expo_ticket_id -> 'details' ->> 'error',
                              v_receipts -> r.expo_ticket_id ->> 'message') end,
        receipt_checked_at = now()
    where r.receipt_request_id = v_req.receipt_request_id
      and r.receipt_status = 'pending'
      and v_receipts ? r.expo_ticket_id;

    -- A dead token is the main thing receipts are for. Mirrors
    -- collect_push_tickets(): drop that one token, then re-sync the legacy
    -- user_profiles column — never blank the user's token wholesale, because
    -- the failure belongs to one device, not to the person.
    delete from public.user_push_tokens upt
    using public.notification_delivery_receipts r
    where r.receipt_request_id = v_req.receipt_request_id
      and r.receipt_error = 'DeviceNotRegistered'
      and upt.expo_push_token = r.expo_push_token;

    perform public.sync_legacy_push_token(r.user_id)
      from public.notification_delivery_receipts r
     where r.receipt_request_id = v_req.receipt_request_id
       and r.receipt_error = 'DeviceNotRegistered'
       and r.user_id is not null;

    -- Rows Expo had no receipt for yet stay pending, but must be un-stamped or
    -- they would never be asked about again.
    update public.notification_delivery_receipts
    set receipt_request_id = null, receipt_requested_at = null
    where receipt_request_id = v_req.receipt_request_id
      and receipt_status = 'pending';
  end loop;

  -- ── Phase 2: ask about the next batch, and do NOT wait for the answer ───
  select array_agg(id), array_agg(expo_ticket_id)
  into v_batch_ids, v_batch_tickets
  from (
    select id, expo_ticket_id
    from public.notification_delivery_receipts
    where receipt_status = 'pending'
      and send_status = 'ok'
      and expo_ticket_id is not null
      and receipt_request_id is null
      and created_at < now() - interval '15 minutes'
      and created_at >= now() - interval '48 hours'
    order by created_at
    limit 300
  ) batch;

  if v_batch_ids is not null and array_length(v_batch_ids, 1) > 0 then
    v_request_id := net.http_post(
      url := 'https://exp.host/--/api/v2/push/getReceipts',
      headers := '{"Content-Type": "application/json", "Accept": "application/json", "Accept-Encoding": "gzip, deflate"}'::jsonb,
      body := jsonb_build_object('ids', to_jsonb(v_batch_tickets))
    );

    update public.notification_delivery_receipts
    set receipt_request_id = v_request_id,
        receipt_requested_at = now()
    where id = any(v_batch_ids);
    v_requested := array_length(v_batch_ids, 1);
  end if;

  -- ── Phase 3: campaign rollup, in one pass instead of four per campaign ──
  with touched as (
    select distinct campaign_id
    from public.notification_delivery_receipts
    where campaign_id is not null
      and receipt_checked_at > now() - interval '20 minutes'
  ),
  stats as (
    select r.campaign_id,
           count(*) filter (where r.receipt_status = 'ok') as ok,
           count(*) filter (where r.receipt_status = 'error') as err,
           count(*) filter (where r.receipt_status = 'pending') as pending,
           count(*) filter (where r.receipt_status = 'expired') as expired
    from public.notification_delivery_receipts r
    join touched t on t.campaign_id = r.campaign_id
    group by r.campaign_id
  )
  update public.notification_campaigns c
  set delivery_stats = coalesce(c.delivery_stats, '{}'::jsonb) || jsonb_build_object(
        'receipts_ok', s.ok,
        'receipts_error', s.err,
        'receipts_pending', s.pending,
        'receipts_expired', s.expired)
  from stats s
  where s.campaign_id = c.id;

  select count(*) filter (where receipt_status = 'ok'),
         count(*) filter (where receipt_status = 'error')
    into v_ok, v_error
    from public.notification_delivery_receipts
   where receipt_checked_at > now() - interval '20 minutes';

  return jsonb_build_object(
    'receipts_ok', v_ok,
    'receipts_error', v_error,
    'receipts_expired', v_expired,
    'batches_retried', v_retried,
    'receipts_requested', v_requested
  );
end;
$function$;
