-- ============================================================================
-- Facility Subscription Enrollment Migration
-- ============================================================================
--
-- This step builds ONLY the subscription-enrollment state to correctly gate
-- privileges like `top_rated_placement`. It does NOT include payment gateway
-- integration, invoicing, proration, or renewal notifications.
--
-- Investigation findings:
-- - `facility_offerings` is for patient-facing services (a facility's own offerings)
--   with `offering_type` enum (subscription/walk-in/package/onetime_fee)
-- - `marketing_subscriptions` is the tier catalog with `privileges` array
-- - `marketing_subscriptions.period` values: 'free', '3days', '7days', '0.5month',
--   '1month', '3months', '6months', '12months', 'Lifetime'
-- - `marketing_subscriptions.billing_cycle` values: 'monthly', 'yearly', 'one-time'
-- ============================================================================

-- Create facility_subscriptions table
CREATE TABLE public.facility_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- The facility being enrolled
    facility_id UUID NOT NULL REFERENCES public.facility_profile(id),
    
    -- The subscription tier
    subscription_id UUID NOT NULL REFERENCES public.marketing_subscriptions(id),
    
    -- Enrollment status
    status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'cancelled', 'pending_payment'))
        DEFAULT 'pending_payment',
    
    -- Period tracking
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ, -- nullable for indefinite/Lifetime tiers
    
    -- Snapshot of billing cycle at enrollment time
    billing_cycle TEXT NOT NULL,
    
    -- Auto-renewal flag
    auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Cancellation tracking
    cancelled_at TIMESTAMPTZ,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial unique index: a facility can only have one active subscription at a time
CREATE UNIQUE INDEX facility_subscriptions_active_unique 
    ON public.facility_subscriptions (facility_id) 
    WHERE status = 'active';

-- Index for looking up subscriptions by facility
CREATE INDEX facility_subscriptions_facility_idx 
    ON public.facility_subscriptions (facility_id);

-- Index for expiring subscriptions (used by cron job)
CREATE INDEX facility_subscriptions_expiry_idx 
    ON public.facility_subscriptions (current_period_end) 
    WHERE status = 'active' AND auto_renew = FALSE;

-- Enable RLS
ALTER TABLE public.facility_subscriptions ENABLE ROW LEVEL SECURITY;

-- SELECT for authenticated users (to check their own subscription status)
CREATE POLICY "facility_subscriptions_select"
    ON public.facility_subscriptions
    FOR SELECT
    TO authenticated
    USING (
        facility_id IN (
            SELECT fp.id FROM public.facility_profile fp 
            WHERE fp.owner_id = public.request_user_id()
        )
        OR public.is_app_admin()
    );

-- Admin-only writes
CREATE POLICY "facility_subscriptions_insert"
    ON public.facility_subscriptions
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_app_admin());

CREATE POLICY "facility_subscriptions_update"
    ON public.facility_subscriptions
    FOR UPDATE
    TO authenticated
    USING (public.is_app_admin())
    WITH CHECK (public.is_app_admin());

-- SQL helper function: check if a facility has a specific privilege
-- This is generic - not top_rated-specific - for future privilege checks
CREATE OR REPLACE FUNCTION public.facility_has_privilege(
    p_facility_id UUID,
    p_privilege TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.facility_subscriptions fs
        JOIN public.marketing_subscriptions ms ON fs.subscription_id = ms.id
        WHERE fs.facility_id = p_facility_id
          AND fs.status = 'active'
          AND (fs.current_period_end IS NULL OR fs.current_period_end > NOW())
          AND p_privilege = ANY (ms.privileges)
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.facility_has_privilege(UUID, TEXT) TO anon, authenticated;

-- pg_cron job to expire subscriptions (runs daily at midnight UTC)
-- Note: This only expires non-auto-renew subscriptions. Auto-renew rows are left
-- as 'active' for now - actual renewal requires payment flow (out of scope).
-- When a subscription expires, the top_rated_items logic re-checks privileges
-- on next read, it does not cache them indefinitely.
SELECT cron.schedule(
    'expire-facility-subscriptions',
    '0 0 * * *',
    $$
    UPDATE public.facility_subscriptions
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'active'
      AND auto_renew = FALSE
      AND current_period_end < NOW()
    $$
);

-- Trigger for updated_at
CREATE TRIGGER trg_facility_subscriptions_updated_at
    BEFORE UPDATE ON public.facility_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();