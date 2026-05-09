-- =============================================================================
-- FIX: All facility admin RPCs — correct activity_logs column names
--
-- activity_logs real schema:
--   actor_id     text    (NOT admin_id / NOT uuid)
--   action_type  text    (NOT action)
--   target_table text    (NOT target_type)
--   record_id    text    (NOT target_id)
--   new_data     jsonb   (NOT details)
--
-- These three RPCs all had the wrong column names in their activity_logs
-- INSERT statements. Run this in Supabase Dashboard → SQL Editor.
-- =============================================================================


-- ── 1. admin_update_facility_profile ─────────────────────────────────────────
-- Inspect current definition first so we can preserve the exact signature
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'admin_update_facility_profile'
  AND pronamespace = 'public'::regnamespace;

CREATE OR REPLACE FUNCTION public.admin_update_facility_profile(
  p_admin_id      uuid,
  p_facility_id   uuid,
  p_payload       jsonb,
  p_final_media_urls jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_data jsonb;
BEGIN
  -- Capture old row for the audit log
  SELECT row_to_json(fp)::jsonb
  INTO v_old_data
  FROM public.facility_profile fp
  WHERE id = p_facility_id;

  UPDATE public.facility_profile SET
    facility_name         = COALESCE(p_payload->>'facility_name',         facility_name),
    facility_type         = COALESCE(p_payload->>'facility_type',         facility_type),
    contact_number        = COALESCE(p_payload->>'contact_number',        contact_number),
    whatsapp_number       = COALESCE(p_payload->>'whatsapp_number',       whatsapp_number),
    email                 = COALESCE(p_payload->>'email',                 email),
    gps_address           = COALESCE(p_payload->>'gps_address',           gps_address),
    street                = COALESCE(p_payload->>'street',                street),
    post_code             = COALESCE(p_payload->>'post_code',             post_code),
    area                  = COALESCE(p_payload->>'area',                  area),
    district              = COALESCE(p_payload->>'district',              district),
    region                = COALESCE(p_payload->>'region',                region),
    country               = COALESCE(p_payload->>'country',               country),
    first_name            = COALESCE(p_payload->>'first_name',            first_name),
    last_name             = COALESCE(p_payload->>'last_name',             last_name),
    owner_email           = COALESCE(p_payload->>'owner_email',           owner_email),
    person_contact_number = COALESCE(p_payload->>'person_contact_number', person_contact_number),
    position              = COALESCE(p_payload->>'position',              position),
    featured_image_url    = COALESCE(p_payload->>'featured_image_url',    featured_image_url),
    ownership             = COALESCE(p_payload->>'ownership',             ownership),
    accepts_nhis          = COALESCE((p_payload->>'accepts_nhis')::boolean, accepts_nhis),
    latitude              = COALESCE((p_payload->>'latitude')::double precision, latitude),
    longitude             = COALESCE((p_payload->>'longitude')::double precision, longitude),
    -- jsonb array columns
    media_urls            = CASE WHEN p_final_media_urls IS NOT NULL AND jsonb_array_length(p_final_media_urls) > 0
                              THEN p_final_media_urls
                              ELSE COALESCE(p_payload->'media_urls', media_urls)
                            END,
    services              = COALESCE(p_payload->'services',      services),
    amenities             = COALESCE(p_payload->'amenities',     amenities),
    business_hours        = COALESCE(p_payload->'business_hours', business_hours),
    keywords              = CASE
                              WHEN jsonb_typeof(p_payload->'keywords') = 'array'
                                THEN p_payload->'keywords'
                              WHEN p_payload->>'keywords' IS NOT NULL
                                THEN (
                                  SELECT jsonb_agg(trim(kw))
                                  FROM unnest(string_to_array(p_payload->>'keywords', ',')) AS kw
                                  WHERE trim(kw) <> ''
                                )
                              ELSE keywords
                            END,
    updated_at            = now()
  WHERE id = p_facility_id;

  INSERT INTO public.activity_logs (
    actor_id,
    action_type,
    target_table,
    record_id,
    old_data,
    new_data
  )
  VALUES (
    p_admin_id::text,
    'update_facility',
    'facility_profile',
    p_facility_id::text,
    v_old_data,
    p_payload
  );

  RETURN jsonb_build_object('id', p_facility_id, 'status', 'updated');
END;
$$;


-- ── 2. admin_change_facility_status ──────────────────────────────────────────
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'admin_change_facility_status'
  AND pronamespace = 'public'::regnamespace;

CREATE OR REPLACE FUNCTION public.admin_change_facility_status(
  p_admin_id uuid,
  payload    jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_facility_id uuid;
  v_new_status  text;
  v_media_urls  jsonb;
  v_featured    text;
BEGIN
  v_facility_id := (payload->>'p_facility_id')::uuid;
  v_new_status  := payload->>'p_new_status';
  v_media_urls  := COALESCE(payload->'p_media_urls', '[]'::jsonb);
  v_featured    := payload->>'featured_image_url';

  UPDATE public.facility_profile SET
    status             = v_new_status,
    media_urls         = v_media_urls,
    featured_image_url = COALESCE(v_featured, featured_image_url),
    approved_at        = CASE WHEN v_new_status = 'active' THEN now() ELSE approved_at END,
    updated_at         = now()
  WHERE id = v_facility_id;

  INSERT INTO public.activity_logs (
    actor_id,
    action_type,
    target_table,
    record_id,
    new_data
  )
  VALUES (
    p_admin_id::text,
    CASE WHEN v_new_status = 'active' THEN 'approve_facility' ELSE 'reject_facility' END,
    'facility_profile',
    v_facility_id::text,
    jsonb_build_object('new_status', v_new_status)
  );

  RETURN jsonb_build_object('id', v_facility_id, 'status', v_new_status);
END;
$$;


-- ── 3. admin_delete_facility ──────────────────────────────────────────────────
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'admin_delete_facility'
  AND pronamespace = 'public'::regnamespace;

CREATE OR REPLACE FUNCTION public.admin_delete_facility(
  p_admin_id    uuid,
  p_facility_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_data jsonb;
BEGIN
  SELECT row_to_json(fp)::jsonb
  INTO v_old_data
  FROM public.facility_profile fp
  WHERE id = p_facility_id;

  DELETE FROM public.facility_profile
  WHERE id = p_facility_id;

  INSERT INTO public.activity_logs (
    actor_id,
    action_type,
    target_table,
    record_id,
    old_data
  )
  VALUES (
    p_admin_id::text,
    'delete_facility',
    'facility_profile',
    p_facility_id::text,
    v_old_data
  );

  RETURN jsonb_build_object('id', p_facility_id, 'status', 'deleted');
END;
$$;


-- =============================================================================
-- Verify: confirm activity_logs columns match what the functions now use
-- =============================================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'activity_logs'
ORDER BY ordinal_position;
