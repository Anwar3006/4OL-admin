-- Epic 30.2: RLS/service-role audit — the single most severe finding of
-- this entire audit pass.
--
-- A full sweep of every SECURITY DEFINER function in the public schema
-- (via pg_proc + has_function_privilege) found that the vast majority had
-- never had their default PUBLIC/anon EXECUTE grant revoked — including
-- admin_delete_facility, admin_upsert_medication_reminder,
-- fn_make_group_leader, award_fitcoins, and ~30 others. Worse: several of
-- these have ZERO internal authorization check at all — they accept a
-- "p_admin_id" parameter that is used only to stamp an audit-log session
-- variable, never verified to actually belong to an admin. Concretely,
-- before this migration, any authenticated (and in most cases fully
-- unauthenticated/anon) request could:
--   - delete any facility outright (admin_delete_facility)
--   - overwrite any user's medication reminder with arbitrary dosage/drug
--     data (admin_upsert_medication_reminder) — the most severe finding,
--     since this is health data
--   - delete any user's medication reminder (admin_delete_medication_reminder)
--   - hijack any chat conversation as "group leader" and overwrite the
--     target user's global user_profiles.role (fn_make_group_leader)
--   - self-promote to conversation admin in any chat (fn_assign_admin_with_rules)
--   - mint or drain arbitrary FitCoin balances (award_fitcoins) or redeem
--     rewards against another user's balance (redeem_fitcoin_reward)
--   - change any facility's approval status, or manipulate reviews/ratings
--
-- Fix has two layers, matching how each function is actually called
-- (verified against every call site in both repos before choosing a fix,
-- not guessed):
--   1. Functions called ONLY via service-role Next.js server actions get
--      locked to `service_role` only (no client, authenticated or not,
--      can ever legitimately need them).
--   2. Functions called directly from the browser/mobile client via the
--      user's own authenticated session (confirmed real, existing
--      features — e.g. the admin panel's "Make Group Leader" dialog, or
--      the mobile app's own medication reminders) keep `authenticated`
--      access, but now have a real internal check added
--      (`is_app_admin()`, or `auth.uid() = <owner param>` for
--      self-service functions like redeem_fitcoin_reward) instead of
--      trusting a caller-supplied id.
-- Every fixed function also gets the internal check even where locked to
-- service_role-only, as defense-in-depth — this exact class of bug (a new
-- migration forgetting REVOKE/GRANT) already happened once this session
-- (Epic 27's original migration), so grants alone aren't treated as
-- sufficient going forward.

-- ─────────────────────────────────────────────────────────────────────────
-- Group A — service-role only, real admin actions, called exclusively via
-- getSupabaseAdmin() in actions/facility-admin.actions.ts /
-- actions/conversation.actions.ts. Confirmed via grep — no client-side
-- caller exists for any of these in either repo.
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_change_facility_status(p_admin_id text, payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  EXECUTE format('SET LOCAL app.current_user_id = %L', p_admin_id);

  UPDATE public.facility_profile
  SET
    status = (payload->>'p_new_status')::public.facility_status_enum,
    featured_image_url = (payload->>'featured_image_url'),
    media_urls = (payload->'p_media_urls')::jsonb,
    approved_at = CASE WHEN payload->>'p_new_status' = 'active' THEN now() ELSE approved_at END,
    updated_at = now()
  WHERE id = (payload->>'p_facility_id')::UUID;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_delete_facility(p_admin_id text, p_facility_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  EXECUTE format('SET LOCAL app.current_user_id = %L', p_admin_id);
  DELETE FROM public.facility_profile WHERE id = p_facility_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_facility_profile(
  p_admin_id text, p_facility_id uuid, p_payload jsonb, p_final_media_urls text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  EXECUTE format('SET LOCAL app.current_user_id = %L', p_admin_id);

  UPDATE public.facility_profile
  SET
    name = COALESCE(p_payload->>'name', name),
    address = COALESCE(p_payload->>'address', address),
    phone_number = COALESCE(p_payload->>'phone_number', phone_number),
    email = COALESCE(p_payload->>'email', email),
    facility_type = COALESCE((p_payload->>'facility_type')::facility_type_enum, facility_type),
    media_urls = p_final_media_urls,
    updated_at = now()
  WHERE id = p_facility_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.register_facility_with_profile(
  p_admin_id uuid, p_owner_id uuid, p_first_name text, p_last_name text,
  p_phone_number text, p_facility_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_facility_id uuid;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO public.facility_profile (
    owner_id, facility_name, facility_type, contact_number, whatsapp_number,
    email, gps_address, street, post_code, area, district, region, country,
    first_name, last_name, owner_email, person_contact_number, "position",
    featured_image_url, media_urls, services, amenities, business_hours,
    keywords, ownership, accepts_nhis, latitude, longitude, status
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
    'pending'
  )
  RETURNING id INTO v_facility_id;

  INSERT INTO public.activity_logs (actor_id, action_type, target_table, record_id, new_data)
  VALUES (p_admin_id::text, 'create_facility', 'facility_profile', v_facility_id::text,
    jsonb_build_object('facility_name', p_facility_data->>'facility_name', 'owner_id', p_owner_id));

  RETURN jsonb_build_object('id', v_facility_id, 'status', 'success');
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_assign_admin_with_rules(
  p_conversation_id uuid, p_user_id text, p_role text DEFAULT 'admin'::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE conversations
  SET last_message_at = NOW(), last_message_preview = 'System: Rules of Conduct updated'
  WHERE id = p_conversation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation % not found', p_conversation_id;
  END IF;

  INSERT INTO messages (conversation_id, sender_id, content, message_type)
  VALUES (
    p_conversation_id, p_user_id,
    E'RULES OF CONDUCT:\n1. Be respectful to all members.\n2. No spam or self-promotion.\n3. Keep discussions relevant to group\'s subject matter.\n4. Protect your privacy and others\'.',
    'system'
  );

  INSERT INTO conversation_members (conversation_id, user_id, role, joined_at)
  VALUES (p_conversation_id, p_user_id, p_role, NOW())
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET role = EXCLUDED.role, joined_at = NOW(), left_at = NULL;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Group B — must stay `authenticated`-callable (confirmed real client-side
-- callers via the browser's own authenticated session, not service-role),
-- now with a real internal admin check instead of none at all.
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_delete_medication_reminder(p_admin_id text, p_reminder_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  EXECUTE format('SET LOCAL app.current_user_id = %L', p_admin_id);
  DELETE FROM public.medication_reminders WHERE id = p_reminder_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_perform_facility_review_action(
  p_admin_id text, p_facility_id uuid, p_is_top_rated boolean,
  p_comment_text text DEFAULT NULL, p_rating integer DEFAULT NULL, p_parent_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_new_avg_rating numeric;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  EXECUTE format('SET LOCAL app.current_user_id = %L', p_admin_id);

  IF (p_comment_text IS NOT NULL AND p_comment_text != '') OR p_rating IS NOT NULL THEN
    INSERT INTO public.facility_reviews (facility_id, user_id, parent_id, comment_text, rating)
    VALUES (p_facility_id, p_admin_id, p_parent_id, p_comment_text, p_rating);
  END IF;

  SELECT COALESCE(AVG(rating), 0) INTO v_new_avg_rating
  FROM public.facility_reviews WHERE facility_id = p_facility_id AND rating IS NOT NULL;

  UPDATE public.facility_profile
  SET is_top_rated = p_is_top_rated, avg_rating = v_new_avg_rating, updated_at = now()
  WHERE id = p_facility_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_upsert_top_rated_item(
  p_module text, p_item_id uuid, p_title text, p_subtitle text DEFAULT NULL::text,
  p_image_url text DEFAULT NULL::text, p_rating numeric DEFAULT NULL::numeric,
  p_rating_count integer DEFAULT NULL::integer, p_source text DEFAULT 'manual'::text,
  p_rank integer DEFAULT NULL::integer, p_added_by uuid DEFAULT NULL::uuid
)
RETURNS TABLE(id uuid, module text, item_id uuid, title text, subtitle text, image_url text, rating numeric, rating_count integer, source text, rank integer, added_by uuid, added_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
#variable_conflict use_column
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
    INSERT INTO public.top_rated_items (
      module, item_id, title, subtitle, image_url, rating, rating_count, source, rank, added_by
    )
    VALUES (
      p_module, p_item_id, p_title, p_subtitle, p_image_url, p_rating, p_rating_count, p_source, p_rank, p_added_by
    )
    ON CONFLICT (module, item_id)
    DO UPDATE SET
      title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, image_url = EXCLUDED.image_url,
      rating = EXCLUDED.rating, rating_count = EXCLUDED.rating_count, source = EXCLUDED.source,
      rank = EXCLUDED.rank, added_by = EXCLUDED.added_by, updated_at = NOW()
    RETURNING
      top_rated_items.id, top_rated_items.module, top_rated_items.item_id, top_rated_items.title,
      top_rated_items.subtitle, top_rated_items.image_url, top_rated_items.rating,
      top_rated_items.rating_count, top_rated_items.source, top_rated_items.rank,
      top_rated_items.added_by, top_rated_items.added_at, top_rated_items.updated_at;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_remove_top_rated_item(p_module text, p_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
#variable_conflict use_column
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM public.top_rated_items
  WHERE top_rated_items.module = p_module AND top_rated_items.item_id = p_item_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_make_group_leader(p_conversation_id uuid, p_user_id uuid, p_facility_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_existing_leader UUID;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT user_id INTO v_existing_leader
  FROM conversation_members
  WHERE conversation_id = p_conversation_id AND role = 'group_leader' AND left_at IS NULL
  LIMIT 1;

  IF v_existing_leader IS NOT NULL THEN
    RAISE EXCEPTION 'This conversation already has a group leader.';
  END IF;

  INSERT INTO conversation_members (conversation_id, user_id, role, joined_at, left_at)
  VALUES (p_conversation_id, p_user_id, 'group_leader', NOW(), NULL)
  ON CONFLICT (conversation_id, user_id) DO UPDATE SET role = 'group_leader', left_at = NULL, joined_at = NOW();

  UPDATE conversations
  SET last_message_at = NOW(), last_message_preview = 'System: Rules of Conduct updated'
  WHERE id = p_conversation_id;

  INSERT INTO messages (conversation_id, sender_id, content, message_type)
  VALUES (p_conversation_id, p_user_id,
    'RULES OF CONDUCT:\n1. Be respectful to all members.\n2. No spam or self-promotion.\n3. Keep discussions relevant to health.\n4. Protect your privacy and others.',
    'system');

  INSERT INTO facility_conversations (facility_id, conversation_id)
  VALUES (p_facility_id, p_conversation_id)
  ON CONFLICT (facility_id, conversation_id) DO NOTHING;

  UPDATE user_profiles SET role = 'group_leader' WHERE user_id = p_user_id;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Group C — self-service function real mobile users call directly for
-- their OWN reminder; the admin panel also calls it (on behalf of any
-- user) via the browser's authenticated session, not service-role, so
-- `authenticated` access must stay — but it must now prove the caller
-- either owns p_user_id or is an admin, instead of trusting p_user_id
-- blindly.
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_upsert_medication_reminder(
  p_user_id uuid, p_reminder_id uuid, p_payload jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_id UUID;
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id AND NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized to modify this medication reminder';
  END IF;

  INSERT INTO public.medication_reminders (
    id, user_id, drug_name, dosage_amount, drug_type, drug_color, interval,
    interval_unit, start_date, end_date, is_active, is_enabled, instructions,
    purpose, notification_schedule, gap_days, week_days, number_of_intakes
  )
  VALUES (
    COALESCE(p_reminder_id, gen_random_uuid()), p_user_id, p_payload->>'drug_name',
    p_payload->>'dosage_amount', p_payload->>'drug_type', p_payload->>'drug_color',
    (p_payload->>'interval')::INTEGER, COALESCE(p_payload->>'interval_unit', 'hours'),
    (p_payload->>'start_date')::TIMESTAMPTZ, (p_payload->>'end_date')::TIMESTAMPTZ,
    COALESCE((p_payload->>'is_active')::boolean, true), COALESCE((p_payload->>'is_enabled')::boolean, true),
    p_payload->>'instructions', COALESCE((p_payload->'purpose'), '[]'::jsonb),
    COALESCE(p_payload->>'notification_schedule', 'Daily'), (p_payload->>'gap_days')::INTEGER,
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_payload->'week_days', '[]'::jsonb))),
    COALESCE((p_payload->>'number_of_intakes')::INTEGER, 1)
  )
  ON CONFLICT (id) DO UPDATE SET
    drug_name = EXCLUDED.drug_name, dosage_amount = EXCLUDED.dosage_amount, drug_type = EXCLUDED.drug_type,
    drug_color = EXCLUDED.drug_color, interval = EXCLUDED.interval, interval_unit = EXCLUDED.interval_unit,
    start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date, is_enabled = EXCLUDED.is_enabled,
    is_active = EXCLUDED.is_active, instructions = EXCLUDED.instructions, purpose = EXCLUDED.purpose,
    notification_schedule = EXCLUDED.notification_schedule, gap_days = EXCLUDED.gap_days,
    week_days = EXCLUDED.week_days, number_of_intakes = EXCLUDED.number_of_intakes, updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Group D — self-only. redeem_fitcoin_reward is called directly by the
-- mobile app (getSupabaseClient(), the user's own session) with
-- caller-supplied p_user_id — must now match auth.uid().
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.redeem_fitcoin_reward(p_user_id uuid, p_reward_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_reward record;
  v_redemption_id uuid;
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized to redeem rewards for this user';
  END IF;

  SELECT * INTO v_reward FROM public.fitcoin_rewards WHERE id = p_reward_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reward not found or inactive';
  END IF;

  PERFORM public.award_fitcoins(p_user_id, -v_reward.cost, 'reward_redemption', p_reward_id);

  INSERT INTO public.fitcoin_rewards_redemption (user_id, reward_id, cost_at_redemption)
  VALUES (p_user_id, p_reward_id, v_reward.cost)
  RETURNING id INTO v_redemption_id;

  RETURN json_build_object(
    'redemption_id', v_redemption_id,
    'new_balance', (SELECT fitcoins_balance FROM public.user_profiles WHERE user_id = p_user_id)
  );
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Group E — no client caller anywhere in either repo (confirmed via grep);
-- lock to service_role only. award_fitcoins is only ever reached
-- internally (e.g. via redeem_fitcoin_reward's `PERFORM`, which runs
-- under that function's own SECURITY DEFINER context and does not need a
-- direct grant). create_ibp_profile has zero callers anywhere — dead code,
-- left in place but no longer reachable by any client.
-- ─────────────────────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.award_fitcoins(uuid, numeric, character varying, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_fitcoins(uuid, numeric, character varying, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.create_ibp_profile(text, text, text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_ibp_profile(text, text, text, text, text, text, jsonb) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- Explicit grants for every function rewritten above (CREATE OR REPLACE
-- resets to the default PUBLIC grant — must be set explicitly every time).
-- ─────────────────────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.admin_change_facility_status(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_change_facility_status(text, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.admin_delete_facility(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_facility(text, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.admin_update_facility_profile(text, uuid, jsonb, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_facility_profile(text, uuid, jsonb, text[]) TO service_role;

REVOKE ALL ON FUNCTION public.register_facility_with_profile(uuid, uuid, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_facility_with_profile(uuid, uuid, text, text, text, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.fn_assign_admin_with_rules(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_assign_admin_with_rules(uuid, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.admin_delete_medication_reminder(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_medication_reminder(text, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_perform_facility_review_action(text, uuid, boolean, text, integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_perform_facility_review_action(text, uuid, boolean, text, integer, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_upsert_top_rated_item(text, uuid, text, text, text, numeric, integer, text, integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_upsert_top_rated_item(text, uuid, text, text, text, numeric, integer, text, integer, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_remove_top_rated_item(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_remove_top_rated_item(text, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_upsert_top_rated(text, uuid, text, text, text, numeric, integer, text, integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_upsert_top_rated(text, uuid, text, text, text, numeric, integer, text, integer, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_remove_top_rated(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_remove_top_rated(text, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.fn_make_group_leader(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_make_group_leader(uuid, uuid, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_upsert_medication_reminder(uuid, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_upsert_medication_reminder(uuid, uuid, jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.redeem_fitcoin_reward(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_fitcoin_reward(uuid, uuid) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- Blanket safety net: revoke anon from every remaining SECURITY DEFINER
-- function in public that isn't one of the 3 confirmed RLS-policy-embedded
-- helpers (is_admin/is_app_admin/get_user_app_role — verified via
-- pg_policies that no other function name appears in any policy's
-- qual/with_check, so nothing else can legitimately need anon here).
-- Also revokes `authenticated` from pure trigger functions (return type
-- `trigger`) and the 3 confirmed-orphaned non-RLS helpers
-- (can_insert_conversation_member, facility_has_privilege,
-- user_can_manage_conversation — zero callers anywhere in either repo,
-- not referenced by any RLS policy or CHECK constraint).
-- ─────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args,
           t.typname AS return_type
    FROM pg_proc p
    JOIN pg_type t ON t.oid = p.prorettype
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.prosecdef = true
      AND p.proname NOT IN ('is_admin', 'is_app_admin', 'get_user_app_role')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon', rec.proname, rec.args);

    IF rec.return_type = 'trigger'
      OR rec.proname IN ('can_insert_conversation_member', 'facility_has_privilege', 'user_can_manage_conversation')
    THEN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM authenticated', rec.proname, rec.args);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role', rec.proname, rec.args);
    END IF;
  END LOOP;
END $$;
