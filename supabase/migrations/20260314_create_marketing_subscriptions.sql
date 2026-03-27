-- Marketing Subscriptions Table
CREATE TYPE public.subscription_privilege AS ENUM (
    'business_analytics',
    'performance_analytics',
    'popup_notification',
    'top_rated_placement',
    'featured_placement',
    'ad_discount_10',
    'ad_discount_25',
    'ad_discount_30',
    'ad_discount_40',
    'ad_discount_50',
    'ad_flyer_discount_10',
    'advanced_analytics',
    'priority_support'
);

CREATE TABLE IF NOT EXISTS public.marketing_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    tier_type TEXT NOT NULL, -- Renamed from 'type' to avoid reserved keyword confusion
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    
    -- Using the constraints you defined
    period TEXT DEFAULT 'free' 
        CHECK (period IN ('free', '3days', '7days', '0.5month', '1month', '3months', '6months', '12months', 'Lifetime')),
    
    billing_cycle TEXT DEFAULT 'one-time' 
        CHECK (billing_cycle IN ('monthly', 'yearly', 'one-time')),
    
    -- The New Enum Array column
    privileges public.subscription_privilege[] DEFAULT '{}'::public.subscription_privilege[],
    
    tier_limit INTEGER DEFAULT 0, -- Added from your screenshot (Tier Limit)
    is_active BOOLEAN DEFAULT TRUE,
    created_by TEXT REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.marketing_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create Policies
-- Admins can manage subscriptions
CREATE POLICY "Admins can manage subscriptions" ON public.marketing_subscriptions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admin_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- All authenticated users can view active subscriptions
CREATE POLICY "Users can view active subscriptions" ON public.marketing_subscriptions
    FOR SELECT USING (is_active = TRUE OR auth.uid() = created_by);

-- Create indexes for better query performance
CREATE INDEX idx_marketing_subscriptions_is_active ON public.marketing_subscriptions(is_active);
CREATE INDEX idx_marketing_subscriptions_created_at ON public.marketing_subscriptions(created_at DESC);
CREATE INDEX idx_marketing_subscriptions_created_by ON public.marketing_subscriptions(created_by);
CREATE INDEX idx_marketing_subscriptions_billing_cycle ON public.marketing_subscriptions(billing_cycle);

-- Grant access
GRANT ALL ON public.marketing_subscriptions TO postgres;
GRANT ALL ON public.marketing_subscriptions TO anon;
GRANT ALL ON public.marketing_subscriptions TO authenticated;
GRANT ALL ON public.marketing_subscriptions TO service_role;
