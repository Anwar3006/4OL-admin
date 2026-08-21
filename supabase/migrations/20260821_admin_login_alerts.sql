-- Concurrent-login interception for super admins.
--
-- When a super admin signs in on a second device while another admin session
-- is active, /api/admin/session inserts a row here. The owner's other devices
-- see it instantly via Supabase Realtime (publication below) and render a
-- countdown modal: sign the new device out, acknowledge it, or let the timer
-- lapse (the new device stays signed in — lapse is an implicit acknowledge,
-- matching the product decision). An email fires from the same route at the
-- same moment the row is created.
--
-- Privacy note: new_session_jwt stores the new device's GoTrue access token
-- so "Sign out that device" can revoke its session via auth.admin.signOut().
-- The column is only ever readable by the alert's owner (RLS below) or the
-- service role, and the token is short-lived (~1h) anyway.

CREATE TABLE IF NOT EXISTS public.admin_login_alerts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id         uuid NOT NULL REFERENCES public.user_profiles(user_id),
  new_session_id   uuid REFERENCES public.admin_sessions(id) ON DELETE SET NULL,
  new_session_jwt  text,
  ip_address       text,
  user_agent       text,
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'acknowledged', 'locked_out', 'expired')),
  expires_at       timestamptz NOT NULL,
  resolved_at      timestamptz,
  resolved_by      uuid REFERENCES public.user_profiles(user_id),
  email_sent       boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_login_alerts_admin_recent
  ON public.admin_login_alerts (admin_id, created_at DESC);

ALTER TABLE public.admin_login_alerts ENABLE ROW LEVEL SECURITY;

-- Owner can read their own alerts (also what Realtime RLS filtering relies
-- on). All writes happen through the service role, which bypasses RLS —
-- deliberately no INSERT/UPDATE/DELETE policies for authenticated users.
DROP POLICY IF EXISTS admin_login_alerts_owner_select ON public.admin_login_alerts;
CREATE POLICY admin_login_alerts_owner_select ON public.admin_login_alerts
  FOR SELECT
  USING (auth.uid() = admin_id);

GRANT SELECT ON public.admin_login_alerts TO authenticated;

-- Realtime fan-out: the dashboard guard subscribes to INSERTs on this table,
-- filtered by RLS to the owner.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_login_alerts;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
