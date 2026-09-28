-- =============================================================================
-- AF-01 — Dependents / Family Care Circle  (Phase 1 + Phase 2 data spine)
-- =============================================================================
-- Formalises the existing Ghanaian behaviour where one tech-literate family
-- member manages health for parents, children and siblings. Ships the shared
-- data model + RPCs for:
--   Phase 1 — dependents (linked-account AND profile-only kinds), caregiver-set
--             medication reminders with push fan-out, read-only caregiver
--             adherence aggregates, premium-tier dependent limits + overrides.
--   Phase 2 — granular revocable consent scopes, escalation metadata,
--             claim-my-profile link path, daughter-side guardian read audit.
--
-- Plasence cycle sharing (Phase 3) intentionally NOT projected here: the
-- guardian cycle-view RPC is added in a follow-up migration against the real
-- period_tracker schema. The consent scopes that gate it (period_signals /
-- period_calendar) ARE created now so the trust model is complete.
--
-- Trust design enforced at the data layer ("Calendar yes. Diary never."):
--   * dependent_share_scopes is the audit trail (granted_by/granted_at/revoked_at)
--   * caregiver adherence RPC returns AGGREGATES only — never raw notes/chat
--   * guardian read audit table records every caregiver read of shared data
--
-- Conventions (mirrors 20260822_app_reviews.sql):
--   * Additive + re-runnable: IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY
--     IF EXISTS before CREATE.
--   * SECURITY DEFINER RPCs, SET search_path = public, resolve caller via
--     public.request_user_id(); admin gates via public.is_app_admin().
--   * RLS-complete from day one (facility_reviews no-RLS is the anti-pattern).
--   * epic30 GRANT pattern: REVOKE ALL FROM PUBLIC, anon; GRANT EXECUTE TO
--     authenticated, service_role.
--   * Premium tier via coalesce((public.get_my_entitlement()->>'is_premium')
--     ::boolean, false).
-- Depends on: public.user_profiles(user_id), public.medication_reminders,
--   public.medication_adherence, public.request_user_id(), public.is_app_admin(),
--   public.get_my_entitlement().
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Enums
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.dependent_relationship AS ENUM
    ('parent','child','sibling','spouse','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.dependent_status AS ENUM
    ('invited','active','paused','revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Granular, revocable consent scopes. period_* gate the Phase-3 guardian view.
DO $$ BEGIN
  CREATE TYPE public.dependent_share_scope AS ENUM
    ('meds_set','meds_view','adherence_view',
     'workouts_set','workouts_view',
     'period_signals','period_calendar');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 2. dependents — the care-circle membership row.
--    dependent_user_id NULL  => profile-only dependent (no account/smartphone;
--                               caregiver's device receives all notifications).
--    dependent_user_id SET   => linked account (must grant each scope).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dependents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_user_id uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  dependent_user_id uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
  display_name text NOT NULL,
  relationship public.dependent_relationship NOT NULL DEFAULT 'other',
  date_of_birth date,
  avatar_color text,
  status public.dependent_status NOT NULL DEFAULT 'invited',
  -- profile-only dependents are caregiver-managed by definition
  is_profile_only boolean GENERATED ALWAYS AS (dependent_user_id IS NULL) STORED,
  invite_token text,
  invited_at timestamptz,
  linked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dependents_not_self CHECK (dependent_user_id IS DISTINCT FROM caregiver_user_id)
);

CREATE INDEX IF NOT EXISTS idx_dependents_caregiver
  ON public.dependents (caregiver_user_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_dependents_linked_account
  ON public.dependents (dependent_user_id)
  WHERE dependent_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_dependents_invite_token
  ON public.dependents (invite_token)
  WHERE invite_token IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. dependent_share_scopes — consent matrix + audit trail.
--    A live grant is a row with revoked_at IS NULL. Revoke sets revoked_at
--    (row is retained for the audit trail, never deleted).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dependent_share_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dependent_id uuid NOT NULL REFERENCES public.dependents(id) ON DELETE CASCADE,
  scope public.dependent_share_scope NOT NULL,
  granted_by uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL
);

-- Only one LIVE grant per (dependent, scope).
CREATE UNIQUE INDEX IF NOT EXISTS uq_dependent_scope_live
  ON public.dependent_share_scopes (dependent_id, scope)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dependent_scope_dependent
  ON public.dependent_share_scopes (dependent_id, scope);

-- -----------------------------------------------------------------------------
-- 4. guardian_read_audit — every caregiver read of shared dependent data.
--    Daughter-side "see audit of guardian reads" (AF-01 trust design).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guardian_read_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dependent_id uuid NOT NULL REFERENCES public.dependents(id) ON DELETE CASCADE,
  caregiver_user_id uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  data_layer text NOT NULL CHECK (data_layer IN ('adherence','cycle','meds','workouts')),
  read_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guardian_read_audit_dependent
  ON public.guardian_read_audit (dependent_id, read_at DESC);

-- -----------------------------------------------------------------------------
-- 5. family_dependent_overrides — admin-adjustable per-account tier limits.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.family_dependent_overrides (
  caregiver_user_id uuid PRIMARY KEY REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  max_dependents integer NOT NULL CHECK (max_dependents >= 0 AND max_dependents <= 50),
  note text,
  set_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 6. medication_reminders.managed_by — caregiver who created/owns the reminder.
--    Additive + nullable: existing self-set reminders keep managed_by = NULL.
-- -----------------------------------------------------------------------------
ALTER TABLE public.medication_reminders
  ADD COLUMN IF NOT EXISTS managed_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_medication_reminders_managed_by
  ON public.medication_reminders (managed_by)
  WHERE managed_by IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 7. RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.dependents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dependent_share_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardian_read_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_dependent_overrides ENABLE ROW LEVEL SECURITY;

-- dependents: caregiver sees rows they manage; the linked dependent sees their
-- own row; admins see all. Writes go through SECURITY DEFINER RPCs.
DROP POLICY IF EXISTS dependents_select ON public.dependents;
CREATE POLICY dependents_select ON public.dependents
FOR SELECT TO authenticated
USING (
  caregiver_user_id = nullif(public.request_user_id(), '')::uuid
  OR dependent_user_id = nullif(public.request_user_id(), '')::uuid
  OR public.is_app_admin()
);

-- scopes: visible to the caregiver of the dependent, the granting dependent,
-- and admins.
DROP POLICY IF EXISTS dependent_share_scopes_select ON public.dependent_share_scopes;
CREATE POLICY dependent_share_scopes_select ON public.dependent_share_scopes
FOR SELECT TO authenticated
USING (
  granted_by = nullif(public.request_user_id(), '')::uuid
  OR EXISTS (
    SELECT 1 FROM public.dependents d
    WHERE d.id = dependent_id
      AND (d.caregiver_user_id = nullif(public.request_user_id(), '')::uuid
           OR d.dependent_user_id = nullif(public.request_user_id(), '')::uuid)
  )
  OR public.is_app_admin()
);

-- guardian_read_audit: the dependent (data owner) and admins only.
DROP POLICY IF EXISTS guardian_read_audit_select ON public.guardian_read_audit;
CREATE POLICY guardian_read_audit_select ON public.guardian_read_audit
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.dependents d
    WHERE d.id = dependent_id
      AND d.dependent_user_id = nullif(public.request_user_id(), '')::uuid
  )
  OR public.is_app_admin()
);

-- overrides: admin-only surface (caregivers must not read/edit their own cap
-- directly; the RPC exposes the effective limit).
DROP POLICY IF EXISTS family_dependent_overrides_admin ON public.family_dependent_overrides;
CREATE POLICY family_dependent_overrides_admin ON public.family_dependent_overrides
FOR ALL TO authenticated
USING (public.is_app_admin())
WITH CHECK (public.is_app_admin());

GRANT SELECT, INSERT, UPDATE ON public.dependents TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.dependent_share_scopes TO service_role;
GRANT SELECT, INSERT ON public.guardian_read_audit TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_dependent_overrides TO service_role;

-- -----------------------------------------------------------------------------
-- 8. Helper — effective dependent limit for a caregiver.
--    Free: 1 profile-only dependent. Premium: 5. Override wins if present.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.family_dependent_limit(p_caregiver uuid)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
  SELECT coalesce(
    (SELECT o.max_dependents FROM public.family_dependent_overrides o
      WHERE o.caregiver_user_id = p_caregiver),
    CASE WHEN coalesce((public.get_my_entitlement_for(p_caregiver) ->> 'is_premium')::boolean, false)
         THEN 5 ELSE 1 END
  );
$function$;

-- Entitlement resolver that works for an arbitrary user (the mobile
-- get_my_entitlement() is caller-scoped). Falls back to free if unavailable.
CREATE OR REPLACE FUNCTION public.get_my_entitlement_for(p_user uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $function$
BEGIN
  -- Reuse the caller-scoped entitlement when the caller asks about themselves.
  IF p_user = nullif(public.request_user_id(), '')::uuid THEN
    RETURN public.get_my_entitlement();
  END IF;
  -- Otherwise (caregiver/admin viewing another account) derive from period
  -- premium grants, the same source get_my_entitlement() uses.
  RETURN json_build_object(
    'is_premium',
    EXISTS (
      SELECT 1 FROM public.period_premium_grants g
      WHERE g.user_id = p_user
        AND g.revoked_at IS NULL
        AND g.starts_at <= now()
        AND g.expires_at > now()
    )
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('is_premium', false);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 9. RPC — caregiver adds a dependent (enforces tier limit + kind rules).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_dependent(
  p_display_name text,
  p_relationship public.dependent_relationship DEFAULT 'other',
  p_date_of_birth date DEFAULT NULL,
  p_avatar_color text DEFAULT NULL,
  p_dependent_email text DEFAULT NULL   -- present => linked-account invite
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := nullif(public.request_user_id(), '')::uuid;
  v_active int;
  v_limit int;
  v_is_premium boolean;
  v_id uuid;
  v_token text;
  v_status public.dependent_status;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_display_name IS NULL OR length(trim(p_display_name)) = 0 THEN
    RAISE EXCEPTION 'display_name is required';
  END IF;

  v_active := (SELECT count(*) FROM public.dependents
               WHERE caregiver_user_id = v_uid AND status <> 'revoked');
  v_limit  := public.family_dependent_limit(v_uid);
  IF v_active >= v_limit THEN
    RAISE EXCEPTION 'Dependent limit reached (%). Upgrade to add more.', v_limit;
  END IF;

  v_is_premium := coalesce((public.get_my_entitlement_for(v_uid) ->> 'is_premium')::boolean, false);

  -- Free tier: profile-only dependents only (no linked-account invites).
  IF p_dependent_email IS NOT NULL AND NOT v_is_premium THEN
    RAISE EXCEPTION 'Linked-account dependents require Premium';
  END IF;

  IF p_dependent_email IS NULL THEN
    -- profile-only: active immediately (caregiver's device gets notifications)
    v_status := 'active';
    v_token  := NULL;
  ELSE
    -- linked account: invited until the dependent accepts + grants scopes
    v_status := 'invited';
    v_token  := encode(gen_random_bytes(16), 'hex');
  END IF;

  INSERT INTO public.dependents
    (caregiver_user_id, display_name, relationship, date_of_birth, avatar_color,
     status, invite_token, invited_at)
  VALUES
    (v_uid, trim(p_display_name), p_relationship, p_date_of_birth, p_avatar_color,
     v_status, v_token, CASE WHEN v_token IS NOT NULL THEN now() END)
  RETURNING id INTO v_id;

  -- Profile-only dependents: caregiver inherently holds meds_set + adherence_view.
  IF v_status = 'active' THEN
    INSERT INTO public.dependent_share_scopes (dependent_id, scope, granted_by)
    VALUES (v_id, 'meds_set', v_uid), (v_id, 'adherence_view', v_uid)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN json_build_object('ok', true, 'id', v_id, 'status', v_status,
                           'invite_token', v_token);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 10. RPC — claim-my-profile: a profile-only dependent who installs the app
--     links into the EXISTING record (link, don't duplicate).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_dependent_profile(p_invite_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := nullif(public.request_user_id(), '')::uuid;
  v_dep public.dependents%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_dep FROM public.dependents
  WHERE invite_token = p_invite_token AND dependent_user_id IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found or already claimed';
  END IF;
  IF v_dep.caregiver_user_id = v_uid THEN
    RAISE EXCEPTION 'Cannot claim your own dependent profile';
  END IF;

  UPDATE public.dependents
  SET dependent_user_id = v_uid, status = 'active', linked_at = now(),
      invite_token = NULL, updated_at = now()
  WHERE id = v_dep.id;

  -- Linked accounts require the dependent to grant scopes explicitly; nothing
  -- is shared until they do (daughter/parent initiates sharing).
  RETURN json_build_object('ok', true, 'dependent_id', v_dep.id,
                           'caregiver_user_id', v_dep.caregiver_user_id);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 11. RPC — dependent (linked account) grants/revokes a scope. Consent always
--     originates from the data owner; caregiver may only revoke what they hold.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_dependent_scope(
  p_dependent_id uuid,
  p_scope public.dependent_share_scope,
  p_grant boolean
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := nullif(public.request_user_id(), '')::uuid;
  v_dep public.dependents%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_dep FROM public.dependents WHERE id = p_dependent_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Dependent not found'; END IF;

  IF p_grant THEN
    -- Only the linked dependent (data owner) may grant. Profile-only rows have
    -- no data owner, so caregiver-set scopes were granted at creation.
    IF v_dep.dependent_user_id IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'Only the dependent account can grant sharing';
    END IF;
    IF v_dep.status = 'revoked' THEN RAISE EXCEPTION 'Link is revoked'; END IF;

    INSERT INTO public.dependent_share_scopes (dependent_id, scope, granted_by)
    VALUES (p_dependent_id, p_scope, v_uid)
    ON CONFLICT DO NOTHING;
    -- accept the invite on first grant
    UPDATE public.dependents SET status = 'active', updated_at = now()
    WHERE id = p_dependent_id AND status = 'invited';
  ELSE
    -- Revoke: the data owner, or the caregiver (for scopes they manage), or admin.
    IF NOT (v_dep.dependent_user_id = v_uid OR v_dep.caregiver_user_id = v_uid
            OR public.is_app_admin()) THEN
      RAISE EXCEPTION 'Not authorized to revoke this scope';
    END IF;
    UPDATE public.dependent_share_scopes
    SET revoked_at = now(),
        revoked_by = v_uid
    WHERE dependent_id = p_dependent_id AND scope = p_scope AND revoked_at IS NULL;
  END IF;

  RETURN json_build_object('ok', true);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 12. RPC — caregiver sets status (pause/activate/revoke a link).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_dependent_status(
  p_dependent_id uuid,
  p_status public.dependent_status
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := nullif(public.request_user_id(), '')::uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  UPDATE public.dependents
  SET status = p_status, updated_at = now(),
      -- one-tap revoke also seals every live scope
      invite_token = CASE WHEN p_status = 'revoked' THEN NULL ELSE invite_token END
  WHERE id = p_dependent_id
    AND (caregiver_user_id = v_uid OR dependent_user_id = v_uid OR public.is_app_admin());

  IF NOT FOUND THEN RAISE EXCEPTION 'Dependent not found or not authorized'; END IF;

  IF p_status = 'revoked' THEN
    UPDATE public.dependent_share_scopes
    SET revoked_at = now(), revoked_by = v_uid
    WHERE dependent_id = p_dependent_id AND revoked_at IS NULL;
  END IF;

  RETURN json_build_object('ok', true);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 13. RPC — caregiver's family list (My Family tab).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_dependents()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := nullif(public.request_user_id(), '')::uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  RETURN json_build_object(
    'limit', public.family_dependent_limit(v_uid),
    'is_premium', coalesce((public.get_my_entitlement_for(v_uid) ->> 'is_premium')::boolean, false),
    'dependents', coalesce((
      SELECT json_agg(json_build_object(
        'id', d.id,
        'display_name', d.display_name,
        'relationship', d.relationship,
        'date_of_birth', d.date_of_birth,
        'avatar_color', d.avatar_color,
        'status', d.status,
        'is_profile_only', d.is_profile_only,
        'scopes', (
          SELECT coalesce(json_agg(s.scope), '[]'::json)
          FROM public.dependent_share_scopes s
          WHERE s.dependent_id = d.id AND s.revoked_at IS NULL
        )
      ) ORDER BY d.created_at)
      FROM public.dependents d
      WHERE d.caregiver_user_id = v_uid AND d.status <> 'revoked'
    ), '[]'::json)
  );
END;
$function$;

-- -----------------------------------------------------------------------------
-- 14. RPC — daughter/parent side: who can see my data, and the read audit.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_guardian_links()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := nullif(public.request_user_id(), '')::uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  RETURN json_build_object(
    'links', coalesce((
      SELECT json_agg(json_build_object(
        'dependent_id', d.id,
        'caregiver_user_id', d.caregiver_user_id,
        'status', d.status,
        'scopes', (
          SELECT coalesce(json_agg(s.scope), '[]'::json)
          FROM public.dependent_share_scopes s
          WHERE s.dependent_id = d.id AND s.revoked_at IS NULL
        )
      ) ORDER BY d.created_at)
      FROM public.dependents d
      WHERE d.dependent_user_id = v_uid
    ), '[]'::json)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_guardian_read_audit(p_dependent_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := nullif(public.request_user_id(), '')::uuid;
  v_dep public.dependents%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_dep FROM public.dependents WHERE id = p_dependent_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Dependent not found'; END IF;
  -- Only the data owner (linked dependent) or an admin may read the audit.
  IF v_dep.dependent_user_id IS DISTINCT FROM v_uid AND NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN json_build_object(
    'reads', coalesce((
      SELECT json_agg(json_build_object(
        'data_layer', a.data_layer,
        'caregiver_user_id', a.caregiver_user_id,
        'read_at', a.read_at
      ) ORDER BY a.read_at DESC)
      FROM public.guardian_read_audit a
      WHERE a.dependent_id = p_dependent_id
    ), '[]'::json)
  );
END;
$function$;

-- -----------------------------------------------------------------------------
-- 15. RPC — caregiver adherence dashboard (AGGREGATES ONLY). Requires the
--     adherence_view scope. Logs a guardian read for the audit trail.
--     Never returns raw notes, chat, or diary content.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dependent_adherence_summary(
  p_dependent_id uuid,
  p_days integer DEFAULT 30
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := nullif(public.request_user_id(), '')::uuid;
  v_dep public.dependents%ROWTYPE;
  v_days integer := least(greatest(coalesce(p_days, 30), 1), 90);
  v_target uuid;
  v_taken int; v_missed int; v_skipped int; v_total int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_dep FROM public.dependents WHERE id = p_dependent_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Dependent not found'; END IF;
  IF v_dep.caregiver_user_id <> v_uid AND NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Consent gate: caregiver must hold a LIVE adherence_view scope.
  IF NOT EXISTS (
    SELECT 1 FROM public.dependent_share_scopes
    WHERE dependent_id = p_dependent_id AND scope = 'adherence_view' AND revoked_at IS NULL
  ) THEN
    RETURN json_build_object('ok', false, 'reason', 'sharing_paused');
  END IF;

  -- Profile-only dependents have no own account: reminders are stored with
  -- user_id = caregiver but tagged managed_by; linked dependents use their own
  -- user_id. Resolve the reminder owner accordingly.
  v_target := coalesce(v_dep.dependent_user_id, v_dep.caregiver_user_id);

  SELECT
    count(*) FILTER (WHERE a.status = 'taken'),
    count(*) FILTER (WHERE a.status = 'missed'),
    count(*) FILTER (WHERE a.status = 'skipped'),
    count(*)
  INTO v_taken, v_missed, v_skipped, v_total
  FROM public.medication_adherence a
  JOIN public.medication_reminders r ON r.id = a.reminder_id
  WHERE a.scheduled_time >= now() - (v_days || ' days')::interval
    AND (
      (v_dep.dependent_user_id IS NOT NULL AND a.user_id = v_target)
      OR (v_dep.dependent_user_id IS NULL AND r.managed_by = v_uid
          AND r.drug_name IS NOT NULL)  -- profile-only: caregiver-managed rows
    );

  -- Audit the guardian read (data owner sees this).
  INSERT INTO public.guardian_read_audit (dependent_id, caregiver_user_id, data_layer)
  VALUES (p_dependent_id, v_uid, 'adherence');

  RETURN json_build_object(
    'ok', true,
    'days', v_days,
    'taken', coalesce(v_taken, 0),
    'missed', coalesce(v_missed, 0),
    'skipped', coalesce(v_skipped, 0),
    'adherence_pct', CASE WHEN coalesce(v_total,0) = 0 THEN NULL
                          ELSE round((v_taken::numeric / v_total) * 100, 1) END
  );
END;
$function$;

-- -----------------------------------------------------------------------------
-- 16. RPC — notification fan-out (extends, never replaces, the frozen
--     get_due_medication_reminders). Returns each due reminder PLUS the
--     caregiver token(s) so the push layer can fan out ("Ama's dose — 8 PM")
--     and drive the +15 min escalation nudge to the caregiver only.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_due_medication_reminders_fanout(p_now timestamptz DEFAULT now())
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_ts timestamptz := coalesce(p_now, now());
BEGIN
  RETURN json_build_object(
    'due', coalesce((
      SELECT json_agg(json_build_object(
        'reminder_id', r.id,
        'dependent_user_id', r.user_id,
        'managed_by', r.managed_by,
        'drug_name', r.drug_name,
        'dosage_amount', r.dosage_amount,
        'dependent_token', (SELECT up.expo_push_token FROM public.user_profiles up
                            WHERE up.user_id = r.user_id),
        'caregiver_token', (SELECT up.expo_push_token FROM public.user_profiles up
                            WHERE up.user_id = r.managed_by),
        -- profile-only dependent: caregiver's device is the delivery target
        'deliver_to_caregiver', (r.managed_by IS NOT NULL)
      ))
      FROM public.medication_reminders r
      WHERE r.is_active AND r.is_enabled
        AND r.managed_by IS NOT NULL
        AND (r.last_sent_at IS NULL OR r.last_sent_at < v_ts - interval '1 hour')
    ), '[]'::json)
  );
END;
$function$;

-- -----------------------------------------------------------------------------
-- 17. Admin RPC — family-circle oversight (links + consent matrix + counts).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_family_links(p_limit integer DEFAULT 100)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_limit integer := least(greatest(coalesce(p_limit,100),1),500);
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN json_build_object(
    'links', coalesce((
      SELECT json_agg(row_to_json(x))
      FROM (
        SELECT d.id, d.caregiver_user_id, d.dependent_user_id, d.display_name,
               d.relationship, d.status, d.is_profile_only, d.created_at,
               (SELECT count(*) FROM public.dependents d2
                 WHERE d2.caregiver_user_id = d.caregiver_user_id
                   AND d2.status <> 'revoked') AS caregiver_dependent_count,
               public.family_dependent_limit(d.caregiver_user_id) AS caregiver_limit,
               (SELECT coalesce(json_agg(s.scope), '[]'::json)
                  FROM public.dependent_share_scopes s
                 WHERE s.dependent_id = d.id AND s.revoked_at IS NULL) AS live_scopes
        FROM public.dependents d
        ORDER BY d.created_at DESC
        LIMIT v_limit
      ) x
    ), '[]'::json)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_family_override(
  p_caregiver uuid, p_max_dependents integer, p_note text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_admin uuid := nullif(public.request_user_id(), '')::uuid;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_max_dependents < 0 OR p_max_dependents > 50 THEN
    RAISE EXCEPTION 'max_dependents must be 0..50';
  END IF;

  INSERT INTO public.family_dependent_overrides (caregiver_user_id, max_dependents, note, set_by, updated_at)
  VALUES (p_caregiver, p_max_dependents, p_note, v_admin, now())
  ON CONFLICT (caregiver_user_id) DO UPDATE
    SET max_dependents = EXCLUDED.max_dependents,
        note = EXCLUDED.note,
        set_by = EXCLUDED.set_by,
        updated_at = now();

  RETURN json_build_object('ok', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_family_kpi_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN json_build_object(
    'active_circles', (SELECT count(DISTINCT caregiver_user_id) FROM public.dependents WHERE status = 'active'),
    'total_dependents', (SELECT count(*) FROM public.dependents WHERE status <> 'revoked'),
    'profile_only', (SELECT count(*) FROM public.dependents WHERE is_profile_only AND status <> 'revoked'),
    'linked_accounts', (SELECT count(*) FROM public.dependents WHERE dependent_user_id IS NOT NULL AND status <> 'revoked'),
    'live_scopes', (SELECT count(*) FROM public.dependent_share_scopes WHERE revoked_at IS NULL),
    'revocation_rate', (
      SELECT CASE WHEN count(*) = 0 THEN 0
        ELSE round((count(*) FILTER (WHERE revoked_at IS NOT NULL)::numeric / count(*)) * 100, 1) END
      FROM public.dependent_share_scopes
    ),
    'caregiver_set_reminders', (SELECT count(*) FROM public.medication_reminders WHERE managed_by IS NOT NULL)
  );
END;
$function$;

-- -----------------------------------------------------------------------------
-- 18. updated_at trigger for dependents
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dependents_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $function$;

DROP TRIGGER IF EXISTS trg_dependents_touch ON public.dependents;
CREATE TRIGGER trg_dependents_touch BEFORE UPDATE ON public.dependents
FOR EACH ROW EXECUTE FUNCTION public.dependents_touch_updated_at();

-- -----------------------------------------------------------------------------
-- 19. Grants — epic30 pattern
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.family_dependent_limit(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.family_dependent_limit(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_my_entitlement_for(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_entitlement_for(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.add_dependent(text, public.dependent_relationship, date, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_dependent(text, public.dependent_relationship, date, text, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.claim_dependent_profile(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_dependent_profile(text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.set_dependent_scope(uuid, public.dependent_share_scope, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_dependent_scope(uuid, public.dependent_share_scope, boolean) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.set_dependent_status(uuid, public.dependent_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_dependent_status(uuid, public.dependent_status) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_my_dependents() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_dependents() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_my_guardian_links() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_guardian_links() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_guardian_read_audit(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_guardian_read_audit(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_dependent_adherence_summary(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dependent_adherence_summary(uuid, integer) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_due_medication_reminders_fanout(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_due_medication_reminders_fanout(timestamptz) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_list_family_links(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_family_links(integer) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_set_family_override(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_family_override(uuid, integer, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_family_kpi_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_family_kpi_stats() TO authenticated, service_role;
