-- =============================================================================
-- FIX: handle_new_user trigger function
-- Populates public.user_profiles on every auth.users INSERT.
-- All columns in user_profiles are handled here so new sign-ups need zero
-- additional DB calls after supabase.auth.signUp().
--
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================================================

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
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    COALESCE(new.raw_user_meta_data->>'phone_number', COALESCE(new.phone, '')),
    COALESCE(new.raw_user_meta_data->>'sex', NULL),
    COALESCE(new.raw_user_meta_data->>'dob', NULL),
    -- Use the role from metadata only if it is a known safe value;
    -- default to 'user' for all mobile sign-ups.
    CASE
      WHEN new.raw_user_meta_data->>'role' IN ('user', 'admin', 'super_admin', 'group_leader')
      THEN new.raw_user_meta_data->>'role'
      ELSE 'user'
    END,
    COALESCE(new.raw_user_meta_data->>'user_type', 'customer'),
    'active'
  )
  ON CONFLICT (user_id) DO NOTHING; -- Idempotent: skip if row already exists

  RETURN NEW;
END;
$$;

-- Ensure the trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
