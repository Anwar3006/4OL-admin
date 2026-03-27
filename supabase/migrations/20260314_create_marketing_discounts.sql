-- Marketing Discounts Table
CREATE TABLE IF NOT EXISTS public.marketing_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    discount_value DECIMAL(10, 2) NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'bogo')),
    code TEXT NOT NULL UNIQUE,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    applies_to TEXT DEFAULT 'all' CHECK (applies_to IN ('all', 'subscriptions', 'specific')),
    applicable_items JSONB DEFAULT '[]'::jsonb,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.marketing_discounts ENABLE ROW LEVEL SECURITY;

-- Create Policies
-- Admins can manage discounts
CREATE POLICY "Admins can manage discounts" ON public.marketing_discounts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

-- All authenticated users can view active discounts
CREATE POLICY "Users can view active discounts" ON public.marketing_discounts
    FOR SELECT USING (is_active = TRUE OR auth.uid() = created_by);

-- Create indexes for better query performance
CREATE INDEX idx_marketing_discounts_code ON public.marketing_discounts(code);
CREATE INDEX idx_marketing_discounts_is_active ON public.marketing_discounts(is_active);
CREATE INDEX idx_marketing_discounts_valid_from ON public.marketing_discounts(valid_from);
CREATE INDEX idx_marketing_discounts_valid_until ON public.marketing_discounts(valid_until);
CREATE INDEX idx_marketing_discounts_created_at ON public.marketing_discounts(created_at DESC);
CREATE INDEX idx_marketing_discounts_created_by ON public.marketing_discounts(created_by);
CREATE INDEX idx_marketing_discounts_discount_type ON public.marketing_discounts(discount_type);

-- Grant access
GRANT ALL ON public.marketing_discounts TO postgres;
GRANT ALL ON public.marketing_discounts TO anon;
GRANT ALL ON public.marketing_discounts TO authenticated;
GRANT ALL ON public.marketing_discounts TO service_role;
