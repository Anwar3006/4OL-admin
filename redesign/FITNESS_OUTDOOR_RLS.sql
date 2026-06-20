-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR OUTDOOR FITNESS TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. FIX HELPER FUNCTIONS FOR TYPE SAFETY (UUID = TEXT)
-- ----------------------------------------------------------------------------

-- Redefine is_app_admin to cast up.user_id (UUID) to text before comparing with request_user_id() (TEXT)
CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.user_id::text = public.request_user_id()
      AND up.role IN ('admin', 'super_admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_app_admin() TO anon, authenticated;


-- ----------------------------------------------------------------------------
-- 1. TABLE: fitness_outdoor_routes
-- ----------------------------------------------------------------------------

-- Enable Row Level Security
ALTER TABLE public.fitness_outdoor_routes ENABLE ROW LEVEL SECURITY;

-- SELECT: Allow admins full access, or users to read active approved routes or routes they created
CREATE POLICY select_fitness_outdoor_routes ON public.fitness_outdoor_routes
    FOR SELECT
    TO authenticated
    USING (
        (public.is_app_admin() = true) OR
        (is_active = true AND verification_status = 'approved'::public.moderation_status) OR
        (created_by = nullif(public.request_user_id(), '')::uuid)
    );

-- INSERT: Allow authenticated users to create routes (normal users must set created_by to themselves)
CREATE POLICY insert_fitness_outdoor_routes ON public.fitness_outdoor_routes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        (public.is_app_admin() = true) OR
        (created_by = nullif(public.request_user_id(), '')::uuid)
    );

-- UPDATE: Allow admins or route creators to update route details
CREATE POLICY update_fitness_outdoor_routes ON public.fitness_outdoor_routes
    FOR UPDATE
    TO authenticated
    USING (
        (public.is_app_admin() = true) OR
        (created_by = nullif(public.request_user_id(), '')::uuid)
    )
    WITH CHECK (
        (public.is_app_admin() = true) OR
        (created_by = nullif(public.request_user_id(), '')::uuid)
    );

-- DELETE: Allow admins or route creators to delete routes
CREATE POLICY delete_fitness_outdoor_routes ON public.fitness_outdoor_routes
    FOR DELETE
    TO authenticated
    USING (
        (public.is_app_admin() = true) OR
        (created_by = nullif(public.request_user_id(), '')::uuid)
    );


-- ----------------------------------------------------------------------------
-- 2. TABLE: fitness_outdoor_events
-- ----------------------------------------------------------------------------

-- Enable Row Level Security
ALTER TABLE public.fitness_outdoor_events ENABLE ROW LEVEL SECURITY;

-- SELECT: Allow admins to read all events, and users to read published (non-draft) events or events they created
CREATE POLICY select_fitness_outdoor_events ON public.fitness_outdoor_events
    FOR SELECT
    TO authenticated
    USING (
        (public.is_app_admin() = true) OR
        (status != 'draft'::public.challenge_status) OR
        (created_by = nullif(public.request_user_id(), '')::uuid)
    );

-- INSERT: Allow authenticated users to organize events
CREATE POLICY insert_fitness_outdoor_events ON public.fitness_outdoor_events
    FOR INSERT
    TO authenticated
    WITH CHECK (
        (public.is_app_admin() = true) OR
        (created_by = nullif(public.request_user_id(), '')::uuid)
    );

-- UPDATE: Allow admins or event organizers to update events
CREATE POLICY update_fitness_outdoor_events ON public.fitness_outdoor_events
    FOR UPDATE
    TO authenticated
    USING (
        (public.is_app_admin() = true) OR
        (created_by = nullif(public.request_user_id(), '')::uuid)
    )
    WITH CHECK (
        (public.is_app_admin() = true) OR
        (created_by = nullif(public.request_user_id(), '')::uuid)
    );

-- DELETE: Allow admins or event organizers to delete events
CREATE POLICY delete_fitness_outdoor_events ON public.fitness_outdoor_events
    FOR DELETE
    TO authenticated
    USING (
        (public.is_app_admin() = true) OR
        (created_by = nullif(public.request_user_id(), '')::uuid)
    );


-- ----------------------------------------------------------------------------
-- 3. TABLE: fitness_outdoor_reviews
-- ----------------------------------------------------------------------------

-- Enable Row Level Security
ALTER TABLE public.fitness_outdoor_reviews ENABLE ROW LEVEL SECURITY;

-- SELECT: Allow admins to read all reviews, and users to read approved/unflagged reviews or reviews they authored
CREATE POLICY select_fitness_outdoor_reviews ON public.fitness_outdoor_reviews
    FOR SELECT
    TO authenticated
    USING (
        (public.is_app_admin() = true) OR
        (moderation_status = 'approved'::public.moderation_status AND is_flagged = false) OR
        (user_id = nullif(public.request_user_id(), '')::uuid)
    );

-- INSERT: Allow authenticated users to write reviews linked to their user_id
CREATE POLICY insert_fitness_outdoor_reviews ON public.fitness_outdoor_reviews
    FOR INSERT
    TO authenticated
    WITH CHECK (
        (public.is_app_admin() = true) OR
        (user_id = nullif(public.request_user_id(), '')::uuid)
    );

-- UPDATE: Allow admins or review authors to update review contents
CREATE POLICY update_fitness_outdoor_reviews ON public.fitness_outdoor_reviews
    FOR UPDATE
    TO authenticated
    USING (
        (public.is_app_admin() = true) OR
        (user_id = nullif(public.request_user_id(), '')::uuid)
    )
    WITH CHECK (
        (public.is_app_admin() = true) OR
        (user_id = nullif(public.request_user_id(), '')::uuid)
    );

-- DELETE: Allow admins or review authors to delete reviews
CREATE POLICY delete_fitness_outdoor_reviews ON public.fitness_outdoor_reviews
    FOR DELETE
    TO authenticated
    USING (
        (public.is_app_admin() = true) OR
        (user_id = nullif(public.request_user_id(), '')::uuid)
    );
