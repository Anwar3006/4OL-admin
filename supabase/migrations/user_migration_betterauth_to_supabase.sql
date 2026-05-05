-- =============================================================================
-- USER MIGRATION: BetterAuth → Supabase Auth
--
-- Strategy: Delete all existing users and recreate them via Supabase Auth.
-- This is safe because you have few users and want a clean slate.
--
-- HOW TO RUN:
--   Step 1: Run STEP_1 below in Supabase Dashboard → SQL Editor
--           This clears all existing auth + profile data.
--
--   Step 2: For each user listed in STEP_2's output, use the Supabase
--           Dashboard → Authentication → Users → "Invite user" OR run the
--           Node.js script (user-migration.mjs) in this folder which uses
--           the Admin API to create users programmatically.
--
--   Step 3: Run STEP_3 to verify everything looks correct.
-- =============================================================================


-- =============================================================================
-- STEP 1: WIPE existing users
-- WARNING: This deletes ALL rows from auth.users and public.user_profiles.
--          The FK cascade on user_profiles will handle profile deletion.
--          Run this ONLY when you are ready to recreate all users.
-- =============================================================================

-- First, capture a snapshot of the BetterAuth user table so we know who to recreate
-- (run the SELECT first to review before deleting)

SELECT
  u.id            AS better_auth_id,
  u.email,
  u.name,
  u.created_at,
  up.first_name,
  up.last_name,
  up.phone_number,
  up.sex,
  up.dob,
  up.role,
  up.user_type,
  up.status,
  up.expo_push_token
FROM "user" u
LEFT JOIN public.user_profiles up ON up.user_id = u.id
ORDER BY u.created_at;

-- !! UNCOMMENT THE LINES BELOW ONLY AFTER REVIEWING THE OUTPUT ABOVE !!

-- DELETE FROM auth.users;    -- Cascades to auth.sessions, auth.identities, etc.
-- DELETE FROM public.user_profiles;  -- Safety net in case FK cascade didn't fire
-- DELETE FROM "user";  -- BetterAuth user table — no longer needed after migration


-- =============================================================================
-- STEP 3: VERIFICATION — run after recreating users via the Node.js script
-- =============================================================================

-- Check auth.users were created
SELECT id, email, created_at, raw_user_meta_data
FROM auth.users
ORDER BY created_at;

-- Check user_profiles were auto-populated by the trigger
SELECT
  up.*,
  au.email AS auth_email
FROM public.user_profiles up
JOIN auth.users au ON au.id::text = up.user_id
ORDER BY up.created_at;

-- Check for any auth.users with no corresponding profile (trigger failure)
SELECT au.id, au.email
FROM auth.users au
LEFT JOIN public.user_profiles up ON up.user_id = au.id::text
WHERE up.user_id IS NULL;
