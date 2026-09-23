-- P1-01 · Vendors receive enquiries
--
-- Until now nothing fired when a patient submitted an enquiry. The vendor's
-- READ path (`get_vendor_enquiry_inbox`, 23 Sept) existed, so a vendor who
-- happened to open the Requests tab saw the row — but no alert was ever sent.
-- `dispatch_provider_alert` (P0-15) has been sitting there with no caller.
--
-- This migration wires the two together and retires the last use of
-- `pharmacy_campaigns` for enquiries, as P1-01 specifies.
--
-- Three parts:
--   1. `medication_enquiries.delivery_gps` finally gets written on submit.
--   2. `fn_match_enquiry_to_vendors()` + its AFTER INSERT trigger.
--   3. `submit_medication_enquiry` stops writing `pharmacy_campaigns`.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Where the patient is
--
-- `submit_medication_enquiry` never wrote `delivery_gps` — it is absent from
-- the INSERT's column list entirely, so the column is NULL on every one of
-- the enquiries on this database. `get_vendor_enquiry_inbox` already computes
-- a distance from it, which means that distance has always been NULL too.
--
-- Matching "by distance" is impossible without it, so the payload now carries
-- it. This is additive inside the existing `p jsonb` bag — the signature does
-- not change, and a client that omits it behaves exactly as before.
-- ─────────────────────────────────────────────────────────────────────────

/**
 * "lat,lng" → a point, or NULL if the text is anything else.
 *
 * `split_part(...)::double precision` throws on malformed input, and this is
 * reached from a trigger on the patient's own INSERT: a bad string must lose
 * the vendor alert, never the enquiry. Hence the guarded cast.
 */
create or replace function public._parse_gps(p_gps text)
returns table(lat double precision, lng double precision)
language plpgsql
immutable
set search_path to ''
as $$
begin
  if p_gps is null or position(',' in p_gps) = 0 then
    return;
  end if;
  begin
    lat := trim(split_part(p_gps, ',', 1))::double precision;
    lng := trim(split_part(p_gps, ',', 2))::double precision;
  exception when others then
    return;
  end;
  -- Reject the impossible rather than letting acos() take a wild value.
  if lat < -90 or lat > 90 or lng < -180 or lng > 180 then
    return;
  end if;
  return next;
end;
$$;

revoke execute on function public._parse_gps(text) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. The matching trigger
-- ─────────────────────────────────────────────────────────────────────────

/**
 * Matches a new enquiry to the vendors allowed to fulfil it, and alerts each
 * one through `dispatch_provider_alert` (P0-15), which writes the
 * `provider_inbox` row and pushes to that provider's `business` tokens only.
 *
 * Matching rules, in the order P1-01 states them:
 *
 *   capability — `otc` needs `otc_medicines`, `with_rx` needs `rx_medicines`.
 *                An expired grant does not count.
 *   status     — `kind = 'vendor'` and `status = 'active'`. A suspended or
 *                pending provider is invisible here, which is the same rule
 *                P0-02's RLS and P0-14's suspend flow already apply to the
 *                directory: suspension hides a vendor from matching for free.
 *   distance   — within the enquiry's own `search_radius_km` (the patient
 *                chose it; `submit_medication_enquiry` already clamps it to
 *                1–20 km, and to 10 km for non-premium users).
 *
 * DISTANCE FALLBACK, and why it is here: the shipped patient app does not send
 * coordinates yet — part 1 above only makes it possible. Until a build that
 * sends them reaches the stores, every enquiry would have a NULL origin and a
 * strict distance filter would match nobody at all, which would look exactly
 * like the bug this migration exists to fix. So when the enquiry has no
 * usable origin the function falls back to region/area matching, which is
 * what the `pharmacy_campaigns` broadcast being retired below did. A vendor
 * with no coordinates of its own is treated the same way.
 *
 * `with_rx` is additionally gated on the `rx_epharmacy` flag (D13). P1-01
 * asks for that to be enforced server-side; this is the alerting half of it.
 *
 * The whole body is exception-guarded. This runs inside the patient's INSERT,
 * and `submit_medication_enquiry` turns any exception into `ok: false`, so an
 * alerting failure here would read to the patient as "your enquiry failed".
 * Losing an alert is bad; losing the enquiry is worse.
 */
create or replace function public.fn_match_enquiry_to_vendors()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
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

  -- D13: prescription medicines stay dark until the flag is on.
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
$$;

-- Trigger-only, exactly like the three trigger functions P0-13 locked down.
revoke execute on function public.fn_match_enquiry_to_vendors() from public, anon, authenticated;

drop trigger if exists trg_match_enquiry_to_vendors on public.medication_enquiries;
create trigger trg_match_enquiry_to_vendors
  after insert on public.medication_enquiries
  for each row
  execute function public.fn_match_enquiry_to_vendors();

-- ─────────────────────────────────────────────────────────────────────────
-- 3. `submit_medication_enquiry`: store the origin, drop the campaign blast
--
-- Signature unchanged (`p jsonb`), so CREATE OR REPLACE really replaces —
-- no second overload, which is the trap P0-15 hit and documented.
-- ─────────────────────────────────────────────────────────────────────────

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

  -- The `pharmacy_campaigns` broadcast that used to sit here is gone (P1-01:
  -- "Stop using `pharmacy_campaigns` for this"). It was a premium-only blast
  -- that wrote a marketing campaign row per pharmacy and notified nobody, and
  -- it never actually ran: `pharmacy_campaigns.start_date` is NOT NULL with no
  -- default and was absent from its INSERT column list, so every execution
  -- raised and was swallowed by its own `exception when others then null`.
  -- `trg_match_enquiry_to_vendors` above replaces it for every user, not just
  -- premium ones, and alerts vendors for real.

  return jsonb_build_object('ok', true, 'id', v_id);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$function$;
