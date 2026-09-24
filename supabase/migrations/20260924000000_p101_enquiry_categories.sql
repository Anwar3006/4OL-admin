-- P1-01 · Category-aware enquiries
--
-- The patient enquiry form is hardcoded to medicine, so a request for tiger
-- nuts is routed to pharmacies. This migration makes the *category* of the
-- thing decide which vendors hear about it: medicines to pharmacies,
-- nuts and seeds to natural/wholefood vendors.
--
-- ── The model: two orthogonal columns, not one ────────────────────────────
--
-- `enquiry_type` is NOT widened. It answers "does this need a prescription?"
-- and its three values already mean that. The new `enquiry_category` answers
-- "what kind of thing is it?". They are independent, and a supplement is
-- never `with_rx`.
--
-- The category maps 1:1 onto capability keys that already exist in
-- `capabilities` (applies_to = {vendor}), so no new vocabulary is introduced:
--
--     medicines + otc      -> otc_medicines
--     medicines + with_rx  -> rx_medicines
--     supplements          -> supplements
--     healthy_foods        -> healthy_foods
--     medical_devices      -> medical_devices
--     herbal_products      -> herbal_products
--
-- `enquiry_category` is NOT NULL DEFAULT 'medicines', so every existing row
-- and every already-shipped client keeps working untouched — this is the
-- "additive parameter with a default" P1-01 asks for. `submit_medication_enquiry`
-- reads it out of the existing `p jsonb` bag, so its SIGNATURE DOES NOT CHANGE
-- (same approach as `delivery_gps`).
--
-- `medication_enquiries` deliberately keeps its name even though it now
-- carries tiger nuts. Renaming a contracted table for tidiness would break the
-- mobile contract for no functional gain.
--
-- ── Naming note for whoever reads this next ───────────────────────────────
--
-- The matching TRIGGER is `trg_match_enquiry_to_vendors`; the FUNCTION behind
-- it is `fn_match_enquiry_to_vendors()`. PLAN.md and the handover refer to the
-- trigger name for both, which is why `pg_proc` has no
-- `trg_match_enquiry_to_vendors` in it.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. The category column
-- ─────────────────────────────────────────────────────────────────────────

alter table public.medication_enquiries
  add column if not exists enquiry_category text not null default 'medicines';

alter table public.medication_enquiries
  drop constraint if exists medication_enquiries_enquiry_category_check;

alter table public.medication_enquiries
  add constraint medication_enquiries_enquiry_category_check
  check (enquiry_category in
    ('medicines', 'supplements', 'healthy_foods', 'medical_devices', 'herbal_products'));

comment on column public.medication_enquiries.enquiry_category is
  'What kind of thing is being asked for. Orthogonal to enquiry_type, which answers whether a prescription is needed. Drives vendor routing through enquiry_required_capability(). Defaulted so pre-category clients keep working.';

-- ─────────────────────────────────────────────────────────────────────────
-- 2. drugs.is_prescription_only — deliberately three-state
-- ─────────────────────────────────────────────────────────────────────────
--
-- Nullable on purpose: yes / no / nobody has checked. A `not null default
-- false` would assert that every unreviewed drug is over-the-counter, which is
-- the dangerous direction to be wrong in. The backfill (separate script) sets
-- it where `category` or `atc_code` is unambiguous and leaves the rest null.

alter table public.drugs
  add column if not exists is_prescription_only boolean;

comment on column public.drugs.is_prescription_only is
  'true = prescription only, false = confirmed over-the-counter, NULL = not yet reviewed. NULL is not "OTC": the patient picker must show it as unconfirmed rather than offering OTC silently.';

-- ─────────────────────────────────────────────────────────────────────────
-- 3. One source of truth for routing
-- ─────────────────────────────────────────────────────────────────────────
--
-- Both the matching trigger and the vendor inbox need this map. Before this,
-- the inbox hardcoded its own two-branch copy of it, which is how they could
-- drift; a shared function means adding a category touches one place.

create or replace function public.enquiry_required_capability(
  p_category text,
  p_type text
)
returns text
language sql
immutable
set search_path to ''
as $function$
  select case coalesce(nullif(trim(coalesce(p_category, '')), ''), 'medicines')
           when 'supplements'     then 'supplements'
           when 'healthy_foods'   then 'healthy_foods'
           when 'medical_devices' then 'medical_devices'
           when 'herbal_products' then 'herbal_products'
           -- 'medicines', and anything unrecognised, falls back to the
           -- prescription question. Unrecognised cannot reach here from
           -- submit_medication_enquiry (it rejects unknown categories), but a
           -- direct insert by an admin could, and medicines is the safe
           -- default: it routes to licensed pharmacies, not to grocers.
           else case when p_type = 'with_rx' then 'rx_medicines' else 'otc_medicines' end
         end;
$function$;

comment on function public.enquiry_required_capability(text, text) is
  'The capability a vendor must hold to be shown an enquiry of this (category, type). Used by fn_match_enquiry_to_vendors() and get_vendor_enquiry_inbox() so the alert and the inbox can never disagree.';

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Matching trigger: route by category
-- ─────────────────────────────────────────────────────────────────────────
--
-- Changes from the previous version, and nothing else:
--   a. v_cap comes from enquiry_required_capability() instead of a two-branch
--      CASE on enquiry_type.
--   b. the rx_epharmacy gate calls is_feature_enabled(), whose expression is
--      character-for-character the one that was inline here. Same result, one
--      definition, and it is the function submit_medication_enquiry now gates
--      on too, so the two cannot disagree.
--   c. the alert payload carries enquiry_category, so the Business app can
--      show the right icon and label from the push alone.

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

  v_cap := public.enquiry_required_capability(new.enquiry_category, new.enquiry_type);

  -- D13: prescription medicines stay dark until the flag is on.
  if new.enquiry_type = 'with_rx'
     and not public.is_feature_enabled('rx_epharmacy')
  then
    return new;
  end if;

  select g.lat, g.lng into v_lat, v_lng
  from public._parse_gps(new.delivery_gps) g;

  v_radius := least(greatest(coalesce(new.search_radius_km, 5), 1), 20);

  -- Fallback keys, used only when there is no usable origin.
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
          -- Both ends located: the real distance rule.
          when v_lat is not null and p.latitude is not null and p.longitude is not null
            then (6371 * acos(greatest(-1, least(1,
                    cos(radians(v_lat)) * cos(radians(p.latitude))
                    * cos(radians(p.longitude) - radians(v_lng))
                    + sin(radians(v_lat)) * sin(radians(p.latitude))
                 )))) <= v_radius
          -- An explicit custom area the patient typed.
          when v_area is not null
            then p.area ilike '%' || v_area || '%' or p.region::text ilike v_area
          -- The patient's home region.
          when v_region is not null
            then p.region::text = v_region
          -- Nothing to go on: alert every licensed vendor rather than none.
          else true
        end
      )
    -- A hard ceiling. 50 licensed vendors inside one patient's radius is far
    -- beyond anything real here, and an unbounded loop inside the patient's
    -- own INSERT is not something to leave open.
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
          'enquiry_category', new.enquiry_category,
          'urgency', new.urgency,
          'fulfilment_mode', new.fulfilment_mode
        )
      );
      v_sent := v_sent + 1;
    exception when others then
      -- One provider's push failing must not cost the other matches.
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

-- ─────────────────────────────────────────────────────────────────────────
-- 5. submit_medication_enquiry: category in, and the rx gate closed
-- ─────────────────────────────────────────────────────────────────────────
--
-- Signature unchanged (still one jsonb bag), so no client has to be redeployed
-- and PostgREST needs no new shape.
--
-- Four new rules, in this order, because each depends on the one before:
--   a. Unknown `enquiry_category` is REJECTED, not coerced. Coercing a typo to
--      'medicines' would route food to pharmacies — silently doing the wrong
--      thing is worse than an error the client can show.
--   b. A non-medicine category forces enquiry_type = 'otc'. Tiger nuts are
--      never a prescription, and the alternative (a third enquiry_type value)
--      would widen a contracted CHECK for no gain.
--   c. A prescription-only drug forces enquiry_type = 'with_rx', instead of
--      trusting the client's claim. Only `is true` forces: NULL means nobody
--      has reviewed that drug yet, and forcing on NULL would block every
--      unreviewed medicine — which is currently almost all of them. The
--      patient picker carries the "not confirmed" warning for NULL; tightening
--      the server rule is what the backfill is for.
--   d. `with_rx` is refused outright while `rx_epharmacy` is off, and requires
--      a `prescription_url` when it is on. Before this, such an enquiry was
--      accepted and then silently seen by nobody, because the matching trigger
--      already declines to alert anyone for it — the patient waited for offers
--      that could never arrive.

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
  v_category_in text := nullif(trim(coalesce(p ->> 'enquiry_category', '')), '');
  v_category text;
  v_mode text := coalesce(nullif(trim(p ->> 'fulfilment_mode'), ''), 'pickup');
  v_area_mode text := coalesce(nullif(trim(p ->> 'search_area_mode'), ''), 'current');
  v_radius numeric := nullif(trim(coalesce(p ->> 'search_radius_km', '')), '')::numeric;
  v_qty int := coalesce(nullif(trim(coalesce(p ->> 'quantity', '')), '')::int, 1);
  v_notify boolean := coalesce((p ->> 'notify_on_availability')::boolean, true);
  v_gps text;
  v_drug_id uuid := nullif(p ->> 'drug_id', '')::uuid;
  v_rx_only boolean;
  v_rx_url text := nullif(trim(coalesce(p ->> 'prescription_url', '')), '');
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

  -- (a) category. Absent = 'medicines' (pre-category clients). Present but
  -- unrecognised = an error, never a silent reroute.
  v_category := coalesce(v_category_in, 'medicines');
  if v_category not in
     ('medicines', 'supplements', 'healthy_foods', 'medical_devices', 'herbal_products')
  then
    return jsonb_build_object('ok', false, 'error', 'bad_category');
  end if;

  -- (b) only medicines can carry a prescription.
  if v_category <> 'medicines' then
    v_type := 'otc';
    v_rx_url := null;
  end if;

  -- (c) the drug catalogue overrides the client's claim.
  if v_category = 'medicines' and v_drug_id is not null then
    select d.is_prescription_only into v_rx_only
    from public.drugs d where d.id = v_drug_id;
    if v_rx_only is true then
      v_type := 'with_rx';
    end if;
  end if;

  -- (d) the rx_epharmacy gate.
  if v_type = 'with_rx' then
    if not public.is_feature_enabled('rx_epharmacy') then
      return jsonb_build_object('ok', false, 'error', 'rx_disabled');
    end if;
    if v_rx_url is null then
      return jsonb_build_object('ok', false, 'error', 'prescription_required');
    end if;
  end if;

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

  -- P1-01: where the patient is. Accepted either as a ready-made "lat,lng"
  -- string or as separate numbers, because the two callers in the patient app
  -- hold it in both shapes. Anything unparseable is stored as NULL rather
  -- than rejected — a bad coordinate must not cost someone their enquiry, and
  -- the matching trigger falls back to region when it is missing.
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
    enquiry_type, enquiry_category, fulfilment_mode, delivery_address, delivery_gps,
    prescription_url, drug_id, search_radius_km, search_area_mode, custom_area,
    notify_on_availability, is_priority
  ) values (
    v_uid, v_name,
    nullif(trim(coalesce(p ->> 'dosage', '')), ''),
    v_qty,
    nullif(trim(coalesce(p ->> 'unit', '')), ''),
    v_urgency, 'pending_match',
    v_type, v_category, v_mode,
    nullif(trim(coalesce(p ->> 'delivery_address', '')), ''),
    v_gps,
    v_rx_url,
    v_drug_id,
    v_radius, v_area_mode,
    nullif(trim(coalesce(p ->> 'custom_area', '')), ''),
    v_notify,
    v_is_premium and coalesce((p ->> 'is_priority')::boolean, true)
  )
  returning id into v_id;

  -- The `pharmacy_campaigns` broadcast that used to sit here is gone (P1-01:
  -- "Stop using `pharmacy_campaigns` for this"). It was a premium-only blast
  -- that wrote a marketing campaign row per pharmacy and notified nobody, and
  -- it never actually ran: `pharmacy_campaigns.start_date` is NOT NULL with no
  -- default and was absent from its INSERT column list, so every execution
  -- raised and was swallowed by its own `exception when others then null`.
  -- `trg_match_enquiry_to_vendors` above replaces it for every user, not just
  -- premium ones, and alerts vendors for real.

  return jsonb_build_object('ok', true, 'id', v_id, 'enquiry_category', v_category,
                            'enquiry_type', v_type);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 6. get_vendor_enquiry_inbox: return the category, match on the shared map
-- ─────────────────────────────────────────────────────────────────────────
--
-- DROP + CREATE, not CREATE OR REPLACE: the return shape gains a column and
-- Postgres refuses to replace OUT parameters. `enquiry_category` is APPENDED
-- LAST so the mobile contract stays additive for anything reading positionally.
-- The grants are re-issued below because DROP takes them with it.
--
-- Two behaviour changes, both deliberate:
--   a. the hardcoded otc/with_rx branch becomes
--      enquiry_required_capability(), so a vendor with `healthy_foods` now
--      sees food enquiries. Without this the alert would arrive and the inbox
--      would be empty — the exact split-brain the shared function prevents.
--   b. the capability match now honours `expires_at`. It did not before, so a
--      vendor whose licence-derived capability had lapsed kept seeing
--      enquiries in the inbox even though the trigger had stopped alerting
--      them. The trigger's rule is the correct one; this aligns the inbox to it.

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
  my_response_status text,
  enquiry_category text
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
    er.status,
    me.enquiry_category
  from public.medication_enquiries me
  left join public.enquiry_responses er
    on er.enquiry_id = me.id and er.facility_id = p_provider_id
  where me.status = 'pending_match'
    and exists (
      select 1 from public.provider_capabilities pc
      where pc.provider_id = p_provider_id
        and pc.capability =
              public.enquiry_required_capability(me.enquiry_category, me.enquiry_type)
        and (pc.expires_at is null or pc.expires_at > now())
    )
  order by me.is_priority desc nulls last, me.created_at asc;
end;
$function$;

grant execute on function public.get_vendor_enquiry_inbox(uuid) to authenticated, service_role;

-- CREATE FUNCTION grants EXECUTE to PUBLIC by default, which the dropped
-- function did not have. Not exploitable (the is_provider_member check above
-- fails anon with 42501), but it is a wider grant than before, so take it back.
revoke execute on function public.get_vendor_enquiry_inbox(uuid) from public;

-- PostgREST caches the function's shape; without this it keeps serving the
-- 14-column version and the new column never appears.
notify pgrst, 'reload schema';
