-- 1. Let a registrar create a facility through the same path every admin
-- already uses (register_facility_with_profile), which always inserts
-- status = 'pending' regardless of caller — a registrar-created facility
-- needs approval exactly like an admin-created one. is_app_admin() itself
-- is untouched: it also gates delete/approve/moderate RPCs that a registrar
-- must not get.
create or replace function public.register_facility_with_profile(p_admin_id uuid, p_owner_id uuid, p_first_name text, p_last_name text, p_phone_number text, p_facility_data jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
DECLARE
  v_facility_id uuid;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_app_admin()
     AND public.get_user_app_role() <> 'registrar' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO public.facility_profile (
    owner_id, facility_name, facility_type, contact_number, whatsapp_number,
    email, gps_address, street, post_code, area, district, region, country,
    first_name, last_name, owner_email, person_contact_number, "position",
    featured_image_url, media_urls, services, amenities, business_hours,
    keywords, ownership, accepts_nhis, latitude, longitude, status, submitted_by
  )
  VALUES (
    p_owner_id, (p_facility_data->>'facility_name'), (p_facility_data->>'facility_type'),
    (p_facility_data->>'contact_number'), (p_facility_data->>'whatsapp_number'),
    (p_facility_data->>'email'), (p_facility_data->>'gps_address'), (p_facility_data->>'street'),
    (p_facility_data->>'post_code'), (p_facility_data->>'area'), (p_facility_data->>'district'),
    (p_facility_data->>'region')::public.region_enum, COALESCE(p_facility_data->>'country', 'Ghana'),
    p_first_name, p_last_name, (p_facility_data->>'owner_email'), p_phone_number,
    (p_facility_data->>'position'), (p_facility_data->>'featured_image_url'),
    COALESCE(p_facility_data->'media_urls', '[]'::jsonb),
    COALESCE(p_facility_data->'services', '[]'::jsonb),
    COALESCE(p_facility_data->'amenities', '[]'::jsonb),
    COALESCE(p_facility_data->'business_hours', '[]'::jsonb),
    CASE
      WHEN jsonb_typeof(p_facility_data->'keywords') = 'array' THEN p_facility_data->'keywords'
      ELSE (SELECT jsonb_agg(trim(kw)) FROM unnest(string_to_array(COALESCE(p_facility_data->>'keywords', ''), ',')) AS kw WHERE trim(kw) <> '')
    END,
    (p_facility_data->>'ownership'), COALESCE((p_facility_data->>'accepts_nhis')::boolean, false),
    (p_facility_data->>'latitude')::double precision, (p_facility_data->>'longitude')::double precision,
    'pending', p_admin_id
  )
  RETURNING id INTO v_facility_id;

  INSERT INTO public.activity_logs (actor_id, action_type, target_table, record_id, new_data)
  VALUES (p_admin_id::text, 'create_facility', 'facility_profile', v_facility_id::text,
    jsonb_build_object('facility_name', p_facility_data->>'facility_name', 'owner_id', p_owner_id));

  RETURN jsonb_build_object('id', v_facility_id, 'status', 'success');
END;
$function$;

-- 2. Narrowly-scoped edit: a registrar (or admin) may update a facility
-- only while it is their own AND still pending/rejected — never once it is
-- active/inactive. This is what makes "locked until admin approves" real,
-- not just a UI convention. Resubmitting a rejected facility clears the
-- rejection reason and puts it back in the pending queue.
create or replace function public.registrar_update_own_facility(
  p_user_id uuid,
  p_facility_id uuid,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_current_status facility_status_enum;
  v_submitted_by uuid;
  v_is_admin boolean := public.is_app_admin();
begin
  if not (v_is_admin or public.get_user_app_role() = 'registrar') then
    raise exception 'Not authorized';
  end if;

  select status, submitted_by into v_current_status, v_submitted_by
  from public.facility_profile
  where id = p_facility_id;

  if v_submitted_by is null then
    raise exception 'Facility not found';
  end if;

  if v_submitted_by <> p_user_id and not v_is_admin then
    raise exception 'Not your facility';
  end if;

  if v_current_status not in ('pending', 'rejected') and not v_is_admin then
    raise exception 'This facility is locked -- it can only be edited while pending or rejected';
  end if;

  update public.facility_profile
  set
    facility_name = coalesce(p_payload->>'facility_name', facility_name),
    facility_type = coalesce(p_payload->>'facility_type', facility_type),
    contact_number = coalesce(p_payload->>'contact_number', contact_number),
    whatsapp_number = coalesce(p_payload->>'whatsapp_number', whatsapp_number),
    email = coalesce(p_payload->>'email', email),
    gps_address = coalesce(p_payload->>'gps_address', gps_address),
    street = coalesce(p_payload->>'street', street),
    post_code = coalesce(p_payload->>'post_code', post_code),
    area = coalesce(p_payload->>'area', area),
    district = coalesce(p_payload->>'district', district),
    region = coalesce((p_payload->>'region')::public.region_enum, region),
    first_name = coalesce(p_payload->>'first_name', first_name),
    last_name = coalesce(p_payload->>'last_name', last_name),
    owner_email = coalesce(p_payload->>'owner_email', owner_email),
    person_contact_number = coalesce(p_payload->>'person_contact_number', person_contact_number),
    "position" = coalesce(p_payload->>'position', "position"),
    media_urls = coalesce(p_payload->'media_urls', media_urls),
    services = coalesce(p_payload->'services', services),
    amenities = coalesce(p_payload->'amenities', amenities),
    business_hours = coalesce(p_payload->'business_hours', business_hours),
    accepts_nhis = coalesce((p_payload->>'accepts_nhis')::boolean, accepts_nhis),
    latitude = coalesce((p_payload->>'latitude')::double precision, latitude),
    longitude = coalesce((p_payload->>'longitude')::double precision, longitude),
    status = case when v_current_status = 'rejected' then 'pending'::facility_status_enum else status end,
    status_reason = case when v_current_status = 'rejected' then null else status_reason end,
    updated_at = now()
  where id = p_facility_id;
end;
$$;
