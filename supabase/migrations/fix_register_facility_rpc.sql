-- =============================================================================
-- FIX: register_facility_with_profile RPC
--
-- Errors fixed:
--   1. media_urls, services, amenities: column is jsonb but ARRAY(...) is text[]
--      Fix: use -> operator to pass jsonb directly
--   2. keywords: column is jsonb array but ->> returns text
--      Fix: split the comma-separated string into a jsonb array
--   3. activity_logs INSERT used wrong column names (admin_id, action,
--      target_type, target_id, details) — real columns are:
--      actor_id, action_type, target_table, record_id, new_data
--
-- No application code changes needed.
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================================================

CREATE OR REPLACE FUNCTION public.register_facility_with_profile(
  p_admin_id      uuid,
  p_owner_id      uuid,
  p_first_name    text,
  p_last_name     text,
  p_phone_number  text,
  p_facility_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_facility_id uuid;
BEGIN

  INSERT INTO public.facility_profile (
    owner_id,
    facility_name,
    facility_type,
    contact_number,
    whatsapp_number,
    email,
    gps_address,
    street,
    post_code,
    area,
    district,
    region,
    country,
    first_name,
    last_name,
    owner_email,
    person_contact_number,
    position,
    featured_image_url,
    media_urls,
    services,
    amenities,
    business_hours,
    keywords,
    ownership,
    accepts_nhis,
    latitude,
    longitude,
    status
  )
  VALUES (
    p_owner_id,
    (p_facility_data->>'facility_name'),
    (p_facility_data->>'facility_type'),
    (p_facility_data->>'contact_number'),
    (p_facility_data->>'whatsapp_number'),
    (p_facility_data->>'email'),
    (p_facility_data->>'gps_address'),
    (p_facility_data->>'street'),
    (p_facility_data->>'post_code'),
    (p_facility_data->>'area'),
    (p_facility_data->>'district'),
    (p_facility_data->>'region'),
    COALESCE(p_facility_data->>'country', 'Ghana'),
    p_first_name,
    p_last_name,
    (p_facility_data->>'owner_email'),
    p_phone_number,
    (p_facility_data->>'position'),
    (p_facility_data->>'featured_image_url'),

    -- jsonb array columns: use -> not ->>
    COALESCE(p_facility_data->'media_urls',     '[]'::jsonb),
    COALESCE(p_facility_data->'services',       '[]'::jsonb),
    COALESCE(p_facility_data->'amenities',      '[]'::jsonb),
    COALESCE(p_facility_data->'business_hours', '[]'::jsonb),

    -- keywords: jsonb array in DB, arrives as comma-separated text from form
    CASE
      WHEN jsonb_typeof(p_facility_data->'keywords') = 'array'
        THEN p_facility_data->'keywords'
      ELSE (
        SELECT jsonb_agg(trim(kw))
        FROM unnest(
          string_to_array(COALESCE(p_facility_data->>'keywords', ''), ',')
        ) AS kw
        WHERE trim(kw) <> ''
      )
    END,

    (p_facility_data->>'ownership'),
    COALESCE((p_facility_data->>'accepts_nhis')::boolean, false),
    (p_facility_data->>'latitude')::double precision,
    (p_facility_data->>'longitude')::double precision,
    'pending'
  )
  RETURNING id INTO v_facility_id;

  -- ── activity_logs: use the ACTUAL column names from the table ─────────────
  -- Real schema:
  --   actor_id    text   (was: admin_id uuid  ← wrong name + wrong type)
  --   action_type text   (was: action         ← wrong name)
  --   target_table text  (was: target_type    ← wrong name)
  --   record_id   text   (was: target_id      ← wrong name)
  --   new_data    jsonb  (was: details        ← wrong name)
  INSERT INTO public.activity_logs (
    actor_id,
    action_type,
    target_table,
    record_id,
    new_data
  )
  VALUES (
    p_admin_id::text,
    'create_facility',
    'facility_profile',
    v_facility_id::text,
    jsonb_build_object(
      'facility_name', p_facility_data->>'facility_name',
      'owner_id',      p_owner_id
    )
  );

  RETURN jsonb_build_object('id', v_facility_id, 'status', 'success');
END;
$$;

-- =============================================================================
-- Verify column names match what the function now uses
-- =============================================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'activity_logs'
ORDER BY ordinal_position;
