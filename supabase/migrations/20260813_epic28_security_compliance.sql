-- Epic 28: Security & Compliance.
--
-- 28.5: compliance_settings — singleton table, same convention as the
-- existing platform_settings singleton (fixed text id).
CREATE TABLE IF NOT EXISTS public.compliance_settings (
  id                   text PRIMARY KEY DEFAULT 'default',
  gra_tax_id           text,
  vat_rate             numeric,
  vat_filing_frequency text CHECK (vat_filing_frequency IN ('monthly', 'quarterly', 'annually')),
  next_filing_due_date date,
  last_filed_at        date,
  updated_by           uuid REFERENCES public.user_profiles(user_id),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.compliance_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_full_access_compliance_settings ON public.compliance_settings;
CREATE POLICY admin_full_access_compliance_settings ON public.compliance_settings
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.user_id = auth.uid() AND up.role IN ('admin', 'super_admin', 'registrar'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.user_id = auth.uid() AND up.role IN ('admin', 'super_admin'))
  );

CREATE OR REPLACE FUNCTION public.set_compliance_settings_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compliance_settings_updated_at ON public.compliance_settings;
CREATE TRIGGER trg_compliance_settings_updated_at
  BEFORE UPDATE ON public.compliance_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_compliance_settings_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- 28.2: threat-event ingestion primitive + one concrete, verifiable
-- detector.
--
-- Scope note: a "failed-login spike" detector was the most obvious ask
-- here, but this app's admin login (LoginForm.tsx) calls
-- supabase.auth.signInWithPassword() directly from the browser — nothing
-- server-side ever records a failed attempt today (user_profiles.
-- login_attempts/locked_until exist but are never incremented, confirmed
-- during Epic 11's audit). auth.audit_log_entries exists but is
-- completely empty in this project, so there was no way to verify its
-- actual payload shape for a failed-login event against real data before
-- writing a parser for it — building that honestly requires moving login
-- to a server route that can track attempts, which is a separate, larger
-- change, not "wire real detection to existing data." Flagged as real
-- follow-up rather than guessed at.
--
-- What IS built: a real, verifiable detector using data this session
-- already created and confirmed working — admin_sessions (Epic 11.3). An
-- admin authenticating from 3+ distinct IPs within a rolling hour is a
-- genuine, checkable signal (credential sharing or a compromised
-- session), computed from real rows, not fabricated.
-- ─────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.report_security_threat(text, text, text, text, integer, text, text, jsonb);

CREATE OR REPLACE FUNCTION public.report_security_threat(
  p_threat_level  text,
  p_threat_type   text,
  p_title         text,
  p_description   text DEFAULT NULL,
  p_affected_users integer DEFAULT 0,
  p_source_ip     text DEFAULT NULL,
  p_source_module text DEFAULT NULL,
  p_metadata      jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.security_threats (
    threat_level, threat_type, title, description, affected_users,
    source_ip, source_module, auto_detected, metadata
  )
  VALUES (
    p_threat_level::threat_level, p_threat_type, p_title, p_description, p_affected_users,
    p_source_ip, p_source_module, true, p_metadata
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.report_security_threat(text, text, text, text, integer, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_security_threat(text, text, text, text, integer, text, text, jsonb) TO service_role;

DROP FUNCTION IF EXISTS public.detect_admin_multi_ip_sessions();

CREATE OR REPLACE FUNCTION public.detect_admin_multi_ip_sessions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created int := 0;
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT
      s.admin_id,
      coalesce(up.first_name || ' ' || up.last_name, 'Unknown admin') AS admin_name,
      count(DISTINCT s.ip_address) AS ip_count,
      array_agg(DISTINCT s.ip_address) AS ips
    FROM public.admin_sessions s
    JOIN public.user_profiles up ON up.user_id = s.admin_id
    WHERE s.started_at >= now() - interval '1 hour'
      AND s.ip_address IS NOT NULL
    GROUP BY s.admin_id, up.first_name, up.last_name
    HAVING count(DISTINCT s.ip_address) >= 3
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.security_threats
      WHERE threat_type = 'admin_multi_ip_session'
        AND status = 'open'
        AND metadata ->> 'admin_id' = rec.admin_id::text
        AND created_at >= now() - interval '24 hours'
    ) THEN
      PERFORM public.report_security_threat(
        'medium', 'admin_multi_ip_session',
        format('Admin "%s" active from %s different IPs in the last hour', rec.admin_name, rec.ip_count),
        format('IPs: %s', array_to_string(rec.ips, ', ')),
        1, NULL, 'admin_sessions',
        jsonb_build_object('admin_id', rec.admin_id, 'ips', rec.ips)
      );
      v_created := v_created + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('threats_created', v_created);
END;
$$;

REVOKE ALL ON FUNCTION public.detect_admin_multi_ip_sessions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.detect_admin_multi_ip_sessions() TO service_role;

SELECT cron.schedule(
  'detect-admin-multi-ip-sessions',
  '*/15 * * * *',
  $$SELECT public.detect_admin_multi_ip_sessions();$$
);
