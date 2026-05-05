-- =============================================================================
-- CREATE SUPER ADMIN USER
-- Run this in: Supabase Dashboard → SQL Editor
--
-- INSTRUCTIONS:
--   1. Replace the placeholder values below with your real details.
--   2. Run the entire script.
--   3. The user will receive a password reset email (since we can't set a
--      plaintext password via SQL — that's Supabase Auth's responsibility).
--      Alternatively, use the Dashboard to set a password manually after.
-- =============================================================================

DO $$
DECLARE
  v_user_id   uuid;
  v_email     text    := 'your@email.com';       -- ← CHANGE THIS
  v_first     text    := 'Your First Name';       -- ← CHANGE THIS
  v_last      text    := 'Your Last Name';        -- ← CHANGE THIS
  v_phone     text    := '+233000000000';         -- ← CHANGE THIS
  v_password  text    := 'ChangeMe123!';          -- ← CHANGE THIS (temporary)
BEGIN

  -- ── 1. Create the auth.users record ──────────────────────────────────────
  --    We use Supabase's internal auth schema directly.
  --    The password is stored as a bcrypt hash.
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    raw_app_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    is_super_admin
  )
  VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    v_email,
    crypt(v_password, gen_salt('bf')),  -- bcrypt hash
    now(),                               -- mark email as confirmed immediately
    jsonb_build_object(
      'first_name', v_first,
      'last_name',  v_last,
      'phone_number', v_phone,
      'role',       'super_admin',
      'user_type',  'customer'
    ),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    now(),
    now(),
    '',
    '',
    '',
    '',
    false
  )
  RETURNING id INTO v_user_id;

  RAISE NOTICE '✅ auth.users created: %', v_user_id;

  -- ── 2. Create the auth.identities record (required for email login) ───────
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    v_user_id,
    v_email,             -- provider_id = email for email/password auth
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email',
    now(),
    now(),
    now()
  );

  RAISE NOTICE '✅ auth.identities created';

  -- ── 3. Upsert public.user_profiles ───────────────────────────────────────
  --    The handle_new_user trigger should have already fired on the
  --    auth.users INSERT above, but we UPSERT here as a safety net to
  --    guarantee the role is set to super_admin.
  INSERT INTO public.user_profiles (
    user_id,
    first_name,
    last_name,
    phone_number,
    sex,
    dob,
    role,
    user_type,
    status,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id::text,
    v_first,
    v_last,
    v_phone,
    NULL,
    NULL,
    'super_admin',
    'customer',
    'active',
    now(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
    SET role       = 'super_admin',
        first_name = EXCLUDED.first_name,
        last_name  = EXCLUDED.last_name,
        phone_number = EXCLUDED.phone_number,
        updated_at = now();

  RAISE NOTICE '✅ user_profiles upserted with role = super_admin';
  RAISE NOTICE '🎉 Done. User ID: %  |  Email: %', v_user_id, v_email;
  RAISE NOTICE '⚠️  Temporary password: %  — change this immediately!', v_password;

END $$;


-- =============================================================================
-- VERIFY — run this after the block above to confirm everything looks right
-- =============================================================================
SELECT
  au.id,
  au.email,
  au.email_confirmed_at,
  au.created_at,
  up.first_name,
  up.last_name,
  up.role,
  up.user_type,
  up.status
FROM auth.users au
JOIN public.user_profiles up ON up.user_id = au.id::text
WHERE au.email = 'your@email.com';  -- ← match the email you set above
