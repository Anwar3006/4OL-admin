-- Marketing Subscriptions Table
CREATE TABLE IF NOT EXISTS public.marketing_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly', 'one-time')),
    features JSONB DEFAULT '[]'::jsonb,
    max_users INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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
