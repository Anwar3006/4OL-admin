-- Mobile parity for completed analytics/reviews/support epics.

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
  event_name text NOT NULL,
  module text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'mobile',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT analytics_events_event_name_not_blank CHECK (length(trim(event_name)) > 0),
  CONSTRAINT analytics_events_module_not_blank CHECK (length(trim(module)) > 0),
  CONSTRAINT analytics_events_source_check CHECK (source IN ('mobile', 'admin', 'system'))
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own analytics events" ON public.analytics_events;
CREATE POLICY "Users can insert their own analytics events"
ON public.analytics_events
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own analytics events" ON public.analytics_events;
CREATE POLICY "Users can view their own analytics events"
ON public.analytics_events
FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx
  ON public.analytics_events (created_at DESC);

CREATE INDEX IF NOT EXISTS analytics_events_module_name_created_idx
  ON public.analytics_events (module, event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS analytics_events_metadata_gin_idx
  ON public.analytics_events USING gin (metadata);

CREATE UNIQUE INDEX IF NOT EXISTS facility_reviews_one_top_level_per_user_facility_idx
  ON public.facility_reviews (user_id, facility_id)
  WHERE parent_id IS NULL;

GRANT SELECT, INSERT ON public.analytics_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analytics_events TO service_role;
