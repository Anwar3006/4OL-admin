-- P1-01 · Vendor enquiry inbox + provider home metrics
--
-- Read-only additions. No schema changes, no RLS changes, no writes.
--
-- Why SECURITY DEFINER: `medication_enquiries` is readable only by the
-- patient who created it or an admin. A vendor legitimately needs to see
-- OPEN enquiries near them in order to quote, but must NOT see the patient's
-- identity until an offer is accepted (PLAN.md P1-01). A definer function is
-- the only way to expose that narrow slice without widening the table policy.

create or replace function public.get_vendor_enquiry_inbox(
  p_provider_id uuid
)
returns table (
  enquiry_id uuid,
  medication_name text,
  dosage text,
  quantity int,
  unit text,
  enquiry_type text,
  urgency text,
  fulfilment_mode text,
  distance_km numeric,
  created_at timestamptz,
  expires_at timestamptz,
  already_quoted boolean,
  my_response_id uuid,
  my_response_status text
)
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_owner uuid;
  v_lat double precision;
  v_lng double precision;
  v_kind public.provider_kind;
begin
  -- Ownership is checked here, not by the caller: a definer function that
  -- took provider_id on trust would let any signed-in user read any
  -- vendor's inbox.
  select p.owner_id, p.latitude, p.longitude, p.kind
    into v_owner, v_lat, v_lng, v_kind
  from public.providers p
  where p.id = p_provider_id;

  if v_owner is null or v_owner <> (select auth.uid()) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if v_kind <> 'vendor' then
    return;
  end if;

  return query
  select
    me.id,
    me.medication_name,
    me.dosage,
    me.quantity,
    me.unit,
    me.enquiry_type,
    me.urgency,
    me.fulfilment_mode,
    -- Straight-line distance. Good enough to rank and filter an inbox; the
    -- patient's exact address is deliberately never returned.
    case
      when v_lat is null or v_lng is null or me.delivery_gps is null then null
      else round(
        (6371 * acos(
          greatest(-1, least(1,
            cos(radians(v_lat))
            * cos(radians(split_part(me.delivery_gps, ',', 1)::double precision))
            * cos(radians(split_part(me.delivery_gps, ',', 2)::double precision) - radians(v_lng))
            + sin(radians(v_lat))
            * sin(radians(split_part(me.delivery_gps, ',', 1)::double precision))
          ))
        ))::numeric, 1)
    end as distance_km,
    me.created_at,
    -- Vendors get a fixed window to respond. Surfaced so the app can show the
    -- countdown pill the design calls for without inventing its own clock.
    me.created_at + interval '2 hours' as expires_at,
    (er.id is not null) as already_quoted,
    er.id,
    er.status
  from public.medication_enquiries me
  left join public.enquiry_responses er
    on er.enquiry_id = me.id
   and er.facility_id = p_provider_id
  where me.status = 'pending_match'
    -- Only enquiries this vendor is licensed to fulfil. `with_rx` needs the
    -- prescription capability; OTC needs the OTC one.
    and (
      (me.enquiry_type = 'otc' and exists (
        select 1 from public.provider_capabilities pc
        where pc.provider_id = p_provider_id
          and pc.capability = 'otc_medicines'
      ))
      or
      (me.enquiry_type = 'with_rx' and exists (
        select 1 from public.provider_capabilities pc
        where pc.provider_id = p_provider_id
          and pc.capability = 'rx_medicines'
      ))
    )
  order by me.is_priority desc nulls last, me.created_at asc;
end;
$$;

revoke execute on function public.get_vendor_enquiry_inbox(uuid) from public;
grant execute on function public.get_vendor_enquiry_inbox(uuid) to authenticated;

comment on function public.get_vendor_enquiry_inbox(uuid) is
  'P1-01. Open enquiries a vendor may quote on, scoped by capability. Patient identity is never returned; distance is straight-line only.';
