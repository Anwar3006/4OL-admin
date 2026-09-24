-- Rollback for 20260924000000_p101_enquiry_categories.sql
--
-- Restores every object to the definition that was live on prod before the
-- migration, in reverse dependency order. The two data columns are dropped
-- LAST because the restored functions must stop referencing them first.
--
-- Data loss on rollback: `medication_enquiries.enquiry_category` and
-- `drugs.is_prescription_only` are dropped, so any category recorded after the
-- migration and any prescription-only review is lost. Non-medicine enquiries
-- submitted in the meantime SURVIVE as rows but become indistinguishable from
-- medicine enquiries, and the restored trigger would route them to pharmacies.
-- If any such rows exist, export them before running this:
--
--     select id, medication_name, enquiry_category, created_at
--     from public.medication_enquiries
--     where enquiry_category <> 'medicines';

-- 1. Vendor inbox — back to the 14-column shape and the hardcoded branch.
drop function if exists public.get_vendor_enquiry_inbox(uuid);

create function public.get_vendor_enquiry_inbox(p_provider_id uuid)
returns table(
  enquiry_id uuid,
  medication_name text,
  dosage text,
  quantity integer,
  unit text,
  enquiry_type text,
  urgency text,
  fulfilment_mode text,
  distance_km numeric,
  created_at timestamp with time zone,
  expires_at timestamp with time zone,
  already_quoted boolean,
  my_response_id uuid,
  my_response_status text
)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_lat double precision;
  v_lng double precision;
  v_kind public.provider_kind;
begin
  if not public.is_provider_member(p_provider_id, 'requests.quote') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select p.latitude, p.longitude, p.kind into v_lat, v_lng, v_kind
  from public.providers p where p.id = p_provider_id;

  if v_kind <> 'vendor' then
    return;
  end if;

  return query
  select
    me.id, me.medication_name, me.dosage, me.quantity, me.unit,
    me.enquiry_type, me.urgency, me.fulfilment_mode,
    case
      when v_lat is null or v_lng is null or me.delivery_gps is null then null
      else round(
        (6371 * acos(greatest(-1, least(1,
          cos(radians(v_lat))
          * cos(radians(split_part(me.delivery_gps, ',', 1)::double precision))
          * cos(radians(split_part(me.delivery_gps, ',', 2)::double precision) - radians(v_lng))
          + sin(radians(v_lat))
          * sin(radians(split_part(me.delivery_gps, ',', 1)::double precision))
        ))))::numeric, 1)
    end,
    me.created_at,
    me.created_at + interval '2 hours',
    (er.id is not null),
    er.id,
    er.status
  from public.medication_enquiries me
  left join public.enquiry_responses er
    on er.enquiry_id = me.id and er.facility_id = p_provider_id
  where me.status = 'pending_match'
    and (
      (me.enquiry_type = 'otc' and exists (
        select 1 from public.provider_capabilities pc
        where pc.provider_id = p_provider_id and pc.capability = 'otc_medicines'))
      or
      (me.enquiry_type = 'with_rx' and exists (
        select 1 from public.provider_capabilities pc
        where pc.provider_id = p_provider_id and pc.capability = 'rx_medicines'))
    )
  order by me.is_priority desc nulls last, me.created_at asc;
end;
$function$;

grant execute on function public.get_vendor_enquiry_inbox(uuid) to authenticated, service_role;
revoke execute on function public.get_vendor_enquiry_inbox(uuid) from public;

-- 2. submit_medication_enquiry — back to the pre-category version.
create or replace function public.submit_medication_enquiry(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_is_premium boolean;
  v_active int;
  v_name text := nullif(trim(coalesce(p ->> 'medication_name', '')), '');
  v_urgency text := coalesce(nullif(trim(p ->> 'urgency'), ''), 'normal');
  v_type text := coalesce(nullif(trim(p ->> 'enquiry_type'), ''), 'otc');
  v_mode text := coalesce(nullif(trim(p ->> 'fulfilment_mode'), ''), 'pickup');
  v_area_mode text := coalesce(nullif(trim(p ->> 'search_area_mode'), ''), 'current');
  v_radius numeric := nullif(trim(coalesce(p ->> 'search_radius_km', '')), '')::numeric;
  v_qty int := coalesce(nullif(trim(coalesce(p ->> 'quantity', '')), '')::int, 1);
  v_notify boolean := coalesce((p ->> 'notify_on_availability')::boolean, true);
  v_gps text;
  v_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'auth');
  end if;
  if v_name is null or length(v_name) < 2 then
    return jsonb_build_object('ok', false, 'error', 'name_required');
  end if;
  if v_urgency not in ('normal', 'urgent', 'emergency') then v_urgency := 'normal'; end if;
  if v_type not in ('with_rx', 'otc') then v_type := 'otc'; end if;
  if v_mode not in ('pickup', 'delivery') then v_mode := 'pickup'; end if;
  if v_area_mode not in ('current', 'custom') then v_area_mode := 'current'; end if;
  select coalesce((public.get_my_entitlement() ->> 'is_premium')::boolean, false)
    into v_is_premium;
  select count(*) into v_active
  from public.medication_enquiries
  where user_id = v_uid
    and status in ('pending_match', 'matched', 'in_escrow',
                   'pickup_ready', 'delivery_in_progress');
  if not v_is_premium and v_active >= 3 then
    return jsonb_build_object('ok', false, 'error', 'limit');
  end if;
  if v_radius is null or v_radius < 1 then v_radius := 5; end if;
  if v_radius > 20 then v_radius := 20; end if;
  if not v_is_premium and v_radius > 10 then v_radius := 10; end if;
  if v_mode = 'delivery' and not v_is_premium then
    v_mode := 'pickup';
  end if;

  v_gps := nullif(trim(coalesce(p ->> 'delivery_gps', '')), '');
  if v_gps is null
     and nullif(trim(coalesce(p ->> 'latitude', '')), '') is not null
     and nullif(trim(coalesce(p ->> 'longitude', '')), '') is not null
  then
    v_gps := trim(p ->> 'latitude') || ',' || trim(p ->> 'longitude');
  end if;
  if v_gps is not null and not exists (select 1 from public._parse_gps(v_gps)) then
    v_gps := null;
  end if;

  insert into public.medication_enquiries (
    user_id, medication_name, dosage, quantity, unit, urgency, status,
    enquiry_type, fulfilment_mode, delivery_address, delivery_gps,
    prescription_url, drug_id, search_radius_km, search_area_mode, custom_area,
    notify_on_availability, is_priority
  ) values (
    v_uid, v_name,
    nullif(trim(coalesce(p ->> 'dosage', '')), ''),
    v_qty,
    nullif(trim(coalesce(p ->> 'unit', '')), ''),
    v_urgency, 'pending_match',
    v_type, v_mode,
    nullif(trim(coalesce(p ->> 'delivery_address', '')), ''),
    v_gps,
    nullif(trim(coalesce(p ->> 'prescription_url', '')), ''),
    nullif(p ->> 'drug_id', '')::uuid,
    v_radius, v_area_mode,
    nullif(trim(coalesce(p ->> 'custom_area', '')), ''),
    v_notify,
    v_is_premium and coalesce((p ->> 'is_priority')::boolean, true)
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$function$;

-- 3. Matching trigger — back to the inline flag read and the two-branch map.
create or replace function public.fn_match_enquiry_to_vendors()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_cap text;
  v_lat double precision;
  v_lng double precision;
  v_radius numeric;
  v_region text;
  v_area text;
  v_title text;
  v_body text;
  v_qty text;
  v_vendor record;
  v_sent int := 0;
begin
  if new.status is distinct from 'pending_match' then
    return new;
  end if;

  v_cap := case new.enquiry_type
             when 'with_rx' then 'rx_medicines'
             else 'otc_medicines'
           end;

  if new.enquiry_type = 'with_rx'
     and not exists (
       select 1 from public.feature_flags f
       where f.name = 'rx_epharmacy'
         and f.enabled
         and coalesce(f.rollout_percentage, 100) > 0
     )
  then
    return new;
  end if;

  select g.lat, g.lng into v_lat, v_lng
  from public._parse_gps(new.delivery_gps) g;

  v_radius := least(greatest(coalesce(new.search_radius_km, 5), 1), 20);

  if new.search_area_mode = 'custom' then
    v_area := nullif(trim(coalesce(new.custom_area, '')), '');
  end if;
  if v_area is null then
    select nullif(trim(coalesce(up.region, '')), '')
      into v_region
    from public.user_profiles up
    where up.user_id = new.user_id;
  end if;

  v_qty := case
             when new.quantity is null then ''
             else ' (qty ' || new.quantity ||
                  coalesce(' ' || nullif(trim(coalesce(new.unit, '')), ''), '') || ')'
           end;

  v_title := case new.urgency
               when 'emergency' then 'Emergency request'
               when 'urgent' then 'Urgent request'
               else 'New request'
             end || ': ' || new.medication_name;

  v_body := new.medication_name
            || coalesce(' ' || nullif(trim(coalesce(new.dosage, '')), ''), '')
            || v_qty
            || ' · '
            || case when new.fulfilment_mode = 'delivery' then 'Delivery' else 'Pickup' end
            || '. Quote in the Requests tab.';

  for v_vendor in
    select p.id
    from public.providers p
    where p.kind = 'vendor'
      and p.status::text = 'active'
      and p.owner_id is not null
      and exists (
        select 1 from public.provider_capabilities pc
        where pc.provider_id = p.id
          and pc.capability = v_cap
          and (pc.expires_at is null or pc.expires_at > now())
      )
      and (
        case
          when v_lat is not null and p.latitude is not null and p.longitude is not null
            then (6371 * acos(greatest(-1, least(1,
                    cos(radians(v_lat)) * cos(radians(p.latitude))
                    * cos(radians(p.longitude) - radians(v_lng))
                    + sin(radians(v_lat)) * sin(radians(p.latitude))
                 )))) <= v_radius
          when v_area is not null
            then p.area ilike '%' || v_area || '%' or p.region::text ilike v_area
          when v_region is not null
            then p.region::text = v_region
          else true
        end
      )
    limit 50
  loop
    begin
      perform public.dispatch_provider_alert(
        v_vendor.id,
        'enquiry',
        new.id,
        v_title,
        v_body,
        jsonb_build_object(
          'enquiry_id', new.id,
          'enquiry_type', new.enquiry_type,
          'urgency', new.urgency,
          'fulfilment_mode', new.fulfilment_mode
        )
      );
      v_sent := v_sent + 1;
    exception when others then
      raise warning 'enquiry % : alert to provider % failed: %',
        new.id, v_vendor.id, sqlerrm;
    end;
  end loop;

  return new;
exception when others then
  raise warning 'enquiry % : vendor matching failed: %', new.id, sqlerrm;
  return new;
end;
$function$;

-- 4. The shared routing map, now unreferenced.
drop function if exists public.enquiry_required_capability(text, text);

-- 5. The columns, last.
alter table public.medication_enquiries
  drop constraint if exists medication_enquiries_enquiry_category_check;
alter table public.medication_enquiries
  drop column if exists enquiry_category;
alter table public.drugs
  drop column if exists is_prescription_only;

notify pgrst, 'reload schema';
