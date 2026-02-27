-- Create chat_support table
CREATE TABLE IF NOT EXISTS public.chat_support (
    id BIGSERIAL PRIMARY KEY,
    requested_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT,
    subject TEXT,
    message TEXT,
    priority TEXT DEFAULT 'Low' CHECK (priority IN ('Low', 'Medium', 'High')),
    status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'Closed')),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.chat_support ENABLE ROW LEVEL SECURITY;

-- Create Policies
-- Users can view their own tickets
CREATE POLICY "Users can view own tickets" ON public.chat_support
    FOR SELECT USING (auth.uid() = requested_by);

-- Users can create tickets
CREATE POLICY "Users can create tickets" ON public.chat_support
    FOR INSERT WITH CHECK (auth.uid() = requested_by);

-- Admins can view all tickets (if you have an admin role or specific check)
-- CREATE POLICY "Admins can view all" ON public.chat_support
--     FOR ALL USING (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

-- Grant access to public users if using service_role or specific keys
GRANT ALL ON public.chat_support TO postgres;
GRANT ALL ON public.chat_support TO anon;
GRANT ALL ON public.chat_support TO authenticated;
GRANT ALL ON public.chat_support TO service_role;
