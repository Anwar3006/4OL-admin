-- ROLLBACK for p106_provider_analytics
--
-- Restores the 10-column `get_provider_home` and its owner-only guard.
--
-- WARNING: that guard is the bug this migration fixed. Restoring it locks
-- every non-owner staff member out of the Home tab — the one screen every
-- session opens on — with a 42501. Only run this alongside a rollback of
-- P1-08 as a whole.
--
-- `analytics_events.provider_id` is dropped last. Any funnel history
-- collected goes with it; there is nowhere else to put it.

drop function if exists public.get_provider_home(uuid, text);

create or replace function public.get_provider_home(p_provider_id uuid, p_timeframe text default 'today'::text)
returns table(requests_open integer, quotes_won integer, orders_to_prepare integer,
  sales_amount numeric, currency text, catalogue_published integer,
  catalogue_out_of_stock integer, credentials_outstanding integer,
  verification_status text, provider_status text)
language plpgsql security definer set search_path to ''
as $function$
declare
  v_owner uuid; v_kind public.provider_kind; v_type text; v_since timestamptz;
begin
  select p.owner_id, p.kind, p.provider_type into v_owner, v_kind, v_type
  from public.providers p where p.id = p_provider_id;

  if v_owner is null or v_owner <> (select auth.uid()) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  v_since := case lower(coalesce(p_timeframe, 'today'))
    when 'week' then date_trunc('week', now())
    when 'month' then date_trunc('month', now())
    else date_trunc('day', now()) end;

  return query
  select
    coalesce((select count(*)::int from public.medication_enquiries me
      where v_kind = 'vendor' and me.status = 'pending_match'
        and ((me.enquiry_type = 'otc' and exists (select 1 from public.provider_capabilities pc
               where pc.provider_id = p_provider_id and pc.capability = 'otc_medicines'))
          or (me.enquiry_type = 'with_rx' and exists (select 1 from public.provider_capabilities pc
               where pc.provider_id = p_provider_id and pc.capability = 'rx_medicines')))), 0),
    coalesce((select count(*)::int from public.enquiry_responses er
      where er.facility_id = p_provider_id and er.status = 'accepted' and er.responded_at >= v_since), 0),
    coalesce((select count(*)::int from public.medication_enquiries me
      where me.pharmacy_id = p_provider_id and me.status in ('matched','in_escrow')), 0),
    coalesce((select sum(er.price)::numeric from public.enquiry_responses er
      where er.facility_id = p_provider_id and er.status = 'accepted' and er.responded_at >= v_since), 0::numeric),
    'GHS'::text,
    coalesce((select count(*)::int from public.provider_catalogue_items ci
      where ci.provider_id = p_provider_id and ci.status = 'published'), 0),
    coalesce((select count(*)::int from public.provider_catalogue_items ci
      where ci.provider_id = p_provider_id and ci.stock_status = 'out'), 0),
    coalesce((select count(*)::int from public.provider_type_requirements ptr
      where ptr.provider_type = v_type and ptr.required_for_activation
        and not exists (select 1 from public.provider_credentials pc
          where pc.provider_id = p_provider_id and pc.credential_type = ptr.credential_type
            and pc.status = 'verified')), 0),
    (select p.verification_status from public.providers p where p.id = p_provider_id),
    (select p.status::text from public.providers p where p.id = p_provider_id);
end;
$function$;

revoke execute on function public.get_provider_home(uuid, text) from public, anon;
grant execute on function public.get_provider_home(uuid, text) to authenticated;

drop index if exists public.analytics_events_provider_idx;
alter table public.analytics_events drop column if exists provider_id;
