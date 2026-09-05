-- Fix: two SECURITY DEFINER functions call pgcrypto's gen_random_bytes() but
-- pin `SET search_path = public`, where that function does not exist.
--
-- In Supabase, pgcrypto is installed into the `extensions` schema, not
-- `public`. Pinning search_path is correct hardening for a SECURITY DEFINER
-- function -- it stops a caller shadowing an unqualified name with their own
-- object -- but it also makes every extension function unreachable unless it
-- is schema-qualified. Both functions were written unqualified, so both fail
-- at runtime with SQLSTATE 42883, "function gen_random_bytes(integer) does
-- not exist".
--
-- What this looked like from the outside, and why it went unnoticed:
--
--   public.issue_canary          PostgREST maps 42883 to HTTP 404, so the
--                                browser saw "404 Not Found" on an RPC that
--                                exists, is granted to `authenticated`, and
--                                has a matching signature. It read as an
--                                unapplied migration. SecurityCanary catches
--                                and renders nothing, so the DOM canary has
--                                never once been issued.
--
--   public.start_admin_session   Surfaces as a 500 from /api/admin/session on
--                                every dashboard page load.
--
-- The fix is to qualify the call rather than widen search_path, which keeps
-- the SECURITY DEFINER hardening intact.
--
-- Bodies are otherwise reproduced verbatim from:
--   20260822_anti_screen_reading_ak.sql   (issue_canary)
--   20260812_epic11_admin_access_management.sql / 20260821_admin_profile_extension.sql
--                                         (start_admin_session)

CREATE OR REPLACE FUNCTION public.issue_canary(
  p_context text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  -- Reuse the freshest un-hit token per (owner, context) so repeated page
  -- loads don't flood the table.
  SELECT token INTO v_token
  FROM public.security_canaries
  WHERE owner_id = auth.uid()
    AND context = p_context
    AND hit_at IS NULL
  ORDER BY issued_at DESC
  LIMIT 1;

  IF v_token IS NULL THEN
    -- Schema-qualified: pgcrypto lives in `extensions`, and search_path is
    -- pinned to public above.
    v_token := encode(extensions.gen_random_bytes(16), 'hex');
    INSERT INTO public.security_canaries (owner_id, context, token)
    VALUES (auth.uid(), p_context, v_token);
  END IF;

  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.issue_canary(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_canary(text) TO authenticated;

-- Same defect, different symptom: this one 500s /api/admin/session, which the
-- dashboard calls on every page load. Signature (including the three DEFAULT
-- NULLs) and body preserved exactly as deployed; only the gen_random_bytes
-- call is qualified.
CREATE OR REPLACE FUNCTION public.start_admin_session(
  p_admin_id   uuid,
  p_ip_address text DEFAULT NULL::text,
  p_user_agent text DEFAULT NULL::text,
  p_device_info text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_token text := encode(extensions.gen_random_bytes(24), 'hex');
  v_id    uuid;
BEGIN
  INSERT INTO public.admin_sessions (admin_id, session_token, ip_address, user_agent, device_info)
  VALUES (p_admin_id, v_token, p_ip_address, p_user_agent, p_device_info)
  RETURNING id INTO v_id;

  UPDATE public.user_profiles
  SET last_active = now(),
      last_login_at = now()
  WHERE user_id = p_admin_id;

  RETURN jsonb_build_object('id', v_id, 'session_token', v_token);
END;
$function$;

NOTIFY pgrst, 'reload schema';
