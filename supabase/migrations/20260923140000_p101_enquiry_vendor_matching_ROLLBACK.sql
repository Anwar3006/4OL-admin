-- ROLLBACK for 20260923140000_p101_enquiry_vendor_matching.sql
--
-- Restores `submit_medication_enquiry` to the body that was live on prod
-- immediately before that migration ran — fetched with `pg_get_functiondef()`
-- off prod in the same session, not reconstructed from migration history.
-- That matters here: the `pharmacy_campaigns` block below carries the two
-- comment lines an earlier fix left in it, which no migration file contains.
--
-- Note: this restores the pre-existing `pharmacy_campaigns.start_date` bug
-- with it (the column is NOT NULL with no default and is absent from the
-- INSERT's column list, so the whole block always raised and was swallowed).
-- That is deliberate — a rollback puts back what was there.

drop trigger if exists trg_match_enquiry_to_vendors on public.medication_enquiries;
drop function if exists public.fn_match_enquiry_to_vendors();

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
  v_region text;
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
  insert into public.medication_enquiries (
    user_id, medication_name, dosage, quantity, unit, urgency, status,
    enquiry_type, fulfilment_mode, delivery_address, prescription_url,
    drug_id, search_radius_km, search_area_mode, custom_area,
    notify_on_availability, is_priority
  ) values (
    v_uid, v_name,
    nullif(trim(coalesce(p ->> 'dosage', '')), ''),
    v_qty,
    nullif(trim(coalesce(p ->> 'unit', '')), ''),
    v_urgency, 'pending_match',
    v_type, v_mode,
    nullif(trim(coalesce(p ->> 'delivery_address', '')), ''),
    nullif(trim(coalesce(p ->> 'prescription_url', '')), ''),
    nullif(p ->> 'drug_id', '')::uuid,
    v_radius, v_area_mode,
    nullif(trim(coalesce(p ->> 'custom_area', '')), ''),
    v_notify,
    v_is_premium and coalesce((p ->> 'is_priority')::boolean, true)
  )
  returning id into v_id;
  if v_is_premium and coalesce((p ->> 'is_priority')::boolean, true) then
    begin
      -- Source read user_profiles.id; the key on this database is user_id.
      -- The block is exception-guarded, so the original silently skipped the
      -- premium broadcast entirely.
      select region into v_region from public.user_profiles where user_id = v_uid;
      if v_area_mode = 'custom' then
        v_region := nullif(trim(coalesce(p ->> 'custom_area', '')), '');
      end if;
      insert into public.pharmacy_campaigns
        (pharmacy_id, title, description, campaign_type,
         target_regions, target_medications)
      select p2.id,
             'Availability request: ' || v_name,
             'A premium user is looking for ' || v_name ||
               coalesce(' ' || nullif(trim(coalesce(p ->> 'dosage', '')), ''), '') ||
               ' (qty ' || v_qty || '). Respond with price & availability in Medication Enquiry.',
             'med_enquiry_broadcast',
             case when v_region is not null then array[v_region] else '{}'::text[] end,
             array[v_name]
      from public.providers p2
      where p2.status::text = 'active'
        and p2.provider_type = 'pharmacy'
        and (v_region is null
             or p2.region::text = v_region
             or p2.area ilike '%' || v_region || '%')
      limit 25;
    exception when others then null;
    end;
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$function$;

-- Dropped last: the restored function above no longer references it, but the
-- new `submit_medication_enquiry` did, so order matters on a partial rollback.
drop function if exists public._parse_gps(text);
