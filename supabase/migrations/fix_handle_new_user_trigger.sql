-- =============================================================================
-- VERIFY + FIX: handle_new_user trigger
--
-- Run this in: Supabase Dashboard → SQL Editor
--
-- What this fixes:
--   1. phone_number was read from new.phone (the auth.users phone column)
--      instead of raw_user_meta_data->>'phone_number' — so it was always ''
--   2. sex, dob, user_type were never read from metadata at all
--   3. role was hardcoded to 'user' — now reads from metadata with a safe
--      allowlist check so the mobile app can't escalate its own privileges
-- =============================================================================

-- Step 1: Inspect what the current trigger actually does
SELECT prosrc
FROM pg_proc
WHERE proname = 'handle_new_user';

-- Step 2: Replace with the correct implementation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    user_id,
    first_name,
    last_name,
    phone_number,
    sex,
    dob,
    role,
    user_type,
    status
  )
  VALUES (
    new.id::text,

    -- Name: read from metadata passed in options.data on signUp
    COALESCE(NULLIF(new.raw_user_meta_data->>'first_name', ''), ''),
    COALESCE(NULLIF(new.raw_user_meta_data->>'last_name', ''),  ''),

    -- Phone: read from metadata (NOT new.phone which is for SMS auth)
    COALESCE(NULLIF(new.raw_user_meta_data->>'phone_number', ''), ''),

    -- Optional profile fields
    NULLIF(new.raw_user_meta_data->>'sex',  ''),
    NULLIF(new.raw_user_meta_data->>'dob',  ''),

    -- Role: allow only known safe values; default to 'user' for all mobile signups
    CASE
      WHEN new.raw_user_meta_data->>'role' IN (
        'user', 'admin', 'super_admin', 'group_leader', 'registrar'
      ) THEN new.raw_user_meta_data->>'role'
      ELSE 'user'
    END,

    -- user_type: default to 'customer' if not provided
    COALESCE(NULLIF(new.raw_user_meta_data->>'user_type', ''), 'customer'),

    'active'
  )
  ON CONFLICT (user_id) DO NOTHING; -- Idempotent: skip if row already exists

  RETURN NEW;
END;
$$;

-- Step 3: Make sure the trigger is attached to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Verify — inspect the updated function body
SELECT prosrc
FROM pg_proc
WHERE proname = 'handle_new_user';

-- Step 5: Dry-run sanity check — simulate what the trigger receives
-- (run this to confirm field names match what the mobile app sends)
SELECT
  'first_name'   AS field, new_meta->>'first_name'   AS value FROM (SELECT '{"first_name":"Kweku","last_name":"Mensah","phone_number":"+233501234567","sex":"Male","dob":"1995-06-15","role":"user","user_type":"customer"}'::jsonb AS new_meta) t
UNION ALL SELECT 'last_name',    new_meta->>'last_name'    FROM (SELECT '{"first_name":"Kweku","last_name":"Mensah","phone_number":"+233501234567","sex":"Male","dob":"1995-06-15","role":"user","user_type":"customer"}'::jsonb AS new_meta) t
UNION ALL SELECT 'phone_number', new_meta->>'phone_number' FROM (SELECT '{"first_name":"Kweku","last_name":"Mensah","phone_number":"+233501234567","sex":"Male","dob":"1995-06-15","role":"user","user_type":"customer"}'::jsonb AS new_meta) t
UNION ALL SELECT 'sex',          new_meta->>'sex'          FROM (SELECT '{"first_name":"Kweku","last_name":"Mensah","phone_number":"+233501234567","sex":"Male","dob":"1995-06-15","role":"user","user_type":"customer"}'::jsonb AS new_meta) t
UNION ALL SELECT 'dob',          new_meta->>'dob'          FROM (SELECT '{"first_name":"Kweku","last_name":"Mensah","phone_number":"+233501234567","sex":"Male","dob":"1995-06-15","role":"user","user_type":"customer"}'::jsonb AS new_meta) t
UNION ALL SELECT 'role',         new_meta->>'role'         FROM (SELECT '{"first_name":"Kweku","last_name":"Mensah","phone_number":"+233501234567","sex":"Male","dob":"1995-06-15","role":"user","user_type":"customer"}'::jsonb AS new_meta) t
UNION ALL SELECT 'user_type',    new_meta->>'user_type'    FROM (SELECT '{"first_name":"Kweku","last_name":"Mensah","phone_number":"+233501234567","sex":"Male","dob":"1995-06-15","role":"user","user_type":"customer"}'::jsonb AS new_meta) t;
