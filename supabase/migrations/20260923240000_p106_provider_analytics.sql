-- P1-06 · Provider analytics
--
-- Two things, one of which is a bug fix that belongs to P1-08b.
--
-- 1. `analytics_events` had no `provider_id`, so nothing the patient app
--    recorded could ever be attributed to a provider. The funnel on the
--    provider Home ("people who saw you → people who called you") had no
--    source data and could not have been built.
--
-- 2. **`get_provider_home` still gated on `owner_id`.** P1-08b swapped eight
--    functions and missed this one: the grep looked for
--    `owner_id = auth.uid()` and this writes `v_owner <> (select auth.uid())`
--    through a local variable. The effect is that a staff member signs in,
--    lands on Home, and Home alone raises 42501 — the one screen every
--    session opens on. Fixed here, and a broader search confirmed it is the
--    only function left doing this (the remaining `owner_id` references are
--    admin create paths, or read it to decide who to notify, which is not an
--    authorisation check).

alter table public.analytics_events
  add column if not exists provider_id uuid references public.providers(id) on delete set null;

-- Partial: the overwhelming majority of analytics rows have no provider, and
-- the funnel only ever queries the ones that do.
create index if not exists analytics_events_provider_idx
  on public.analytics_events (provider_id, event_name, created_at desc)
  where provider_id is not null;

comment on column public.analytics_events.provider_id is
  'Set on provider-directed events from the patient app: profile_view, call_tap, directions_tap, whatsapp_tap (P1-06). Null on everything else.';

-- The existing "Users can insert their own analytics events" policy
-- (auth.uid() = user_id) already covers these writes, so the patient app
-- inserts directly and no new RPC is needed. Deliberately NOT opened to
-- `anon`: an unauthenticated writer could inflate any provider's funnel
-- without limit, and the patient app requires a session for these screens.

drop function if exists public.get_provider_home(uuid, text);

create or replace function public.get_provider_home(
  p_provider_id uuid,
  p_timeframe text default 'today'::text
)
returns table(
  requests_open integer,
  quotes_won integer,
  orders_to_prepare integer,
  sales_amount numeric,
  currency text,
  catalogue_published integer,
  catalogue_out_of_stock integer,
  credentials_outstanding integer,
  verification_status text,
  provider_status text,
  profile_views integer,
  call_taps integer,
  directions_taps integer,
  whatsapp_taps integer
)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_kind public.provider_kind;
  v_type text;
  v_since timestamptz;
begin
  -- P1-08b: membership, not ownership. `orders.view` rather than a bare
  -- membership check because Home leads with money taken and orders waiting.
  if not public.is_provider_member(p_provider_id, 'orders.view') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select p.kind, p.provider_type into v_kind, v_type
  from public.providers p where p.id = p_provider_id;

  v_since := case lower(coalesce(p_timeframe, 'today'))
    when 'week'  then date_trunc('week', now())
    when 'month' then date_trunc('month', now())
    else date_trunc('day', now())
  end;

  return query
  select
    coalesce((
      select count(*)::int from public.medication_enquiries me
      where v_kind = 'vendor'
        and me.status = 'pending_match'
        and (
          (me.enquiry_type = 'otc' and exists (
            select 1 from public.provider_capabilities pc
            where pc.provider_id = p_provider_id and pc.capability = 'otc_medicines'))
          or
          (me.enquiry_type = 'with_rx' and exists (
            select 1 from public.provider_capabilities pc
            where pc.provider_id = p_provider_id and pc.capability = 'rx_medicines'))
        )
    ), 0),

    coalesce((
      select count(*)::int from public.enquiry_responses er
      where er.facility_id = p_provider_id
        and er.status = 'accepted'
        and er.responded_at >= v_since
    ), 0),

    coalesce((
      select count(*)::int from public.medication_enquiries me
      where me.pharmacy_id = p_provider_id
        and me.status in ('matched', 'in_escrow')
    ), 0),

    coalesce((
      select sum(er.price)::numeric from public.enquiry_responses er
      where er.facility_id = p_provider_id
        and er.status = 'accepted'
        and er.responded_at >= v_since
    ), 0::numeric),

    'GHS'::text,

    coalesce((
      select count(*)::int from public.provider_catalogue_items ci
      where ci.provider_id = p_provider_id and ci.status = 'published'
    ), 0),

    coalesce((
      select count(*)::int from public.provider_catalogue_items ci
      where ci.provider_id = p_provider_id and ci.stock_status = 'out'
    ), 0),

    coalesce((
      select count(*)::int
      from public.provider_type_requirements ptr
      where ptr.provider_type = v_type
        and ptr.required_for_activation
        and not exists (
          select 1 from public.provider_credentials pc
          where pc.provider_id = p_provider_id
            and pc.credential_type = ptr.credential_type
            and pc.status = 'verified'
        )
    ), 0),

    (select p.verification_status from public.providers p where p.id = p_provider_id),
    (select p.status::text from public.providers p where p.id = p_provider_id),

    -- P1-06 funnel. Counted over the same timeframe as the money above, so
    -- "312 views this week" and "GHS 1,284 this week" mean the same week.
    coalesce((select count(*)::int from public.analytics_events ae
      where ae.provider_id = p_provider_id and ae.event_name = 'profile_view'
        and ae.created_at >= v_since), 0),
    coalesce((select count(*)::int from public.analytics_events ae
      where ae.provider_id = p_provider_id and ae.event_name = 'call_tap'
        and ae.created_at >= v_since), 0),
    coalesce((select count(*)::int from public.analytics_events ae
      where ae.provider_id = p_provider_id and ae.event_name = 'directions_tap'
        and ae.created_at >= v_since), 0),
    coalesce((select count(*)::int from public.analytics_events ae
      where ae.provider_id = p_provider_id and ae.event_name = 'whatsapp_tap'
        and ae.created_at >= v_since), 0);
end;
$function$;

revoke execute on function public.get_provider_home(uuid, text) from public, anon;
grant execute on function public.get_provider_home(uuid, text) to authenticated;
