-- The device sign-in OTP flow: the two functions it was missing.
--
-- The Expo app's device-approval flow has four steps. Three worked:
--
--   1. request_device_sign_in        RPC      exists
--   2. POST /api/auth/device-sign-in/send-otp  ->  issue_device_sign_in_otp
--                                    RPC      DID NOT EXIST  -> route 500'd
--   3. verify_device_sign_in_otp     RPC      DID NOT EXIST  -> PGRST202 404
--   4. resolve_device_sign_in        RPC      exists (the trusted-device path)
--
-- So a user signing in on a new device with no other trusted device to
-- approve from could not complete the email-OTP fallback at all. Step 2 is in
-- the mobile contract, which made it look protected; the RPC it delegates to
-- was not in the contract, so nothing caught it.
--
-- `device_sign_in_requests` already carried `otp_hash`, `otp_expires_at` and
-- `otp_attempts` — the schema was designed for this and the functions were
-- never written. Nothing in supabase/migrations/ defines them.
--
-- Conventions below match request_device_sign_in / resolve_device_sign_in
-- exactly: SECURITY DEFINER, search_path pinned to public, jsonb in and out,
-- {ok:false, reason:...} on failure, and expire_device_sign_in_requests()
-- called first so a stale row is never treated as live.
--
-- pgcrypto lives in the `extensions` schema and search_path is pinned, so
-- digest() MUST be schema-qualified. An unqualified call fails with SQLSTATE
-- 42883, which PostgREST reports as a 404 — see
-- 20260905_fix_pgcrypto_search_path.sql for the same bug in issue_canary.

-- ── Tunables, stated once ────────────────────────────────────────────────
--   OTP length        6 digits
--   OTP lifetime      10 minutes, CLAMPED to the request's own expiry, which
--                     defaults to 5 minutes — so 5 is the real number
--   Resend cooldown   60 seconds
--   Attempt limit     5 wrong codes, then the request is dead even for the
--                     correct code
--
-- 6 digits is only safe because of the attempt limit. Do not raise the limit
-- without lengthening the code.
--
-- The cooldown reads a stored `otp_issued_at`. The first version of this
-- migration derived it as `otp_expires_at - 10 minutes`, which is wrong
-- whenever the expiry is clamped — and it always is, because the request
-- expires in 5 minutes. The derived timestamp landed permanently in the past
-- and the cooldown never fired. Testing the flow found it; reading the code
-- did not.

ALTER TABLE public.device_sign_in_requests
  ADD COLUMN IF NOT EXISTS otp_issued_at timestamptz;

CREATE OR REPLACE FUNCTION public.issue_device_sign_in_otp(
  p_request_id uuid,
  p_user_id    uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_request    public.device_sign_in_requests;
  v_otp        text;
  v_bytes      bytea;
  v_expires_at timestamptz;
  v_email      text;
BEGIN
  PERFORM public.expire_device_sign_in_requests();

  SELECT * INTO v_request
    FROM public.device_sign_in_requests
   WHERE id = p_request_id AND user_id = p_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF v_request.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'reason', v_request.status);
  END IF;

  IF v_request.otp_attempts >= 5 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'too_many_attempts');
  END IF;

  -- 60-second resend cooldown, from the stored timestamp.
  IF v_request.otp_issued_at IS NOT NULL
     AND now() < v_request.otp_issued_at + interval '60 seconds' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'too_many_sends');
  END IF;

  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = p_user_id;
  IF v_email IS NULL OR trim(v_email) = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_email_on_file');
  END IF;

  -- 6 digits, zero-padded, from a CSPRNG rather than random(). Four bytes are
  -- drawn ONCE and combined; drawing separately per byte would be four
  -- syscalls for no gain. Modulo bias over 2^32 into 10^6 is ~0.02%, which
  -- does not matter against a 5-attempt limit.
  v_bytes := extensions.gen_random_bytes(4);
  v_otp := lpad(
    ((get_byte(v_bytes, 0)::bigint * 16777216
    + get_byte(v_bytes, 1)::bigint * 65536
    + get_byte(v_bytes, 2)::bigint * 256
    + get_byte(v_bytes, 3)::bigint) % 1000000)::text,
    6, '0');

  -- The OTP can never outlive the sign-in request. In practice the request
  -- window (5 minutes) always wins over the 10-minute cap.
  v_expires_at := least(now() + interval '10 minutes', v_request.expires_at);

  UPDATE public.device_sign_in_requests
     SET otp_hash = encode(
           extensions.digest(v_otp || ':' || p_request_id::text, 'sha256'), 'hex'),
         otp_issued_at = now(),
         otp_expires_at = v_expires_at,
         otp_attempts = 0
   WHERE id = p_request_id;

  -- `otp` is returned so the caller can email it. It is never stored in the
  -- clear and never logged: the API route passes it straight to SendGrid.
  RETURN jsonb_build_object(
    'ok', true,
    'email', v_email,
    'otp', v_otp,
    'expires_at', v_expires_at
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.issue_device_sign_in_otp(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.issue_device_sign_in_otp(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.issue_device_sign_in_otp(uuid, uuid) FROM authenticated;
-- Service role only: it returns the plaintext OTP, so it must never be
-- callable by a signed-in user, who could then read their own code without
-- access to the mailbox and defeat the whole check.
GRANT EXECUTE ON FUNCTION public.issue_device_sign_in_otp(uuid, uuid) TO service_role;


CREATE OR REPLACE FUNCTION public.verify_device_sign_in_otp(
  p_request_id uuid,
  p_otp        text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_request public.device_sign_in_requests;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  PERFORM public.expire_device_sign_in_requests();

  SELECT * INTO v_request
    FROM public.device_sign_in_requests
   WHERE id = p_request_id AND user_id = v_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF v_request.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'reason', v_request.status);
  END IF;

  IF v_request.otp_hash IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_otp_issued');
  END IF;

  IF v_request.otp_expires_at IS NULL OR v_request.otp_expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'otp_expired');
  END IF;

  IF v_request.otp_attempts >= 5 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'too_many_attempts');
  END IF;

  IF v_request.otp_hash <> encode(
       extensions.digest(coalesce(p_otp, '') || ':' || p_request_id::text, 'sha256'), 'hex') THEN
    -- Count the attempt before returning, so a brute force is bounded even
    -- when the caller ignores the response.
    UPDATE public.device_sign_in_requests
       SET otp_attempts = otp_attempts + 1
     WHERE id = p_request_id;

    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'invalid_otp',
      'attempts_remaining', greatest(5 - (v_request.otp_attempts + 1), 0)
    );
  END IF;

  -- Correct code. Approve, and burn the OTP so it cannot be replayed.
  UPDATE public.device_sign_in_requests
     SET status = 'approved',
         resolved_at = now(),
         resolved_by = 'email_otp',
         otp_hash = NULL,
         otp_issued_at = NULL,
         otp_expires_at = NULL
   WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'ok', true,
    'status', 'approved',
    'session_id', v_request.session_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.verify_device_sign_in_otp(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_device_sign_in_otp(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.verify_device_sign_in_otp(uuid, text) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
