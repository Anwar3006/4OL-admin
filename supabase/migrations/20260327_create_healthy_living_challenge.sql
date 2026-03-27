CREATE TABLE IF NOT EXISTS public.healthy_living_challenge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    period TEXT NOT NULL,
    type TEXT NOT NULL,
    status BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT,
    image_url TEXT,
    member_count INTEGER NOT NULL DEFAULT 0,
    members JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.update_healthy_living_challenge_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_healthy_living_challenge_updated_at
ON public.healthy_living_challenge;

CREATE TRIGGER trg_healthy_living_challenge_updated_at
BEFORE UPDATE ON public.healthy_living_challenge
FOR EACH ROW
EXECUTE FUNCTION public.update_healthy_living_challenge_updated_at();

CREATE INDEX IF NOT EXISTS idx_healthy_living_challenge_created_at
ON public.healthy_living_challenge(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_healthy_living_challenge_status
ON public.healthy_living_challenge(status);

CREATE INDEX IF NOT EXISTS idx_healthy_living_challenge_type
ON public.healthy_living_challenge(type);

GRANT ALL ON public.healthy_living_challenge TO postgres;
GRANT ALL ON public.healthy_living_challenge TO anon;
GRANT ALL ON public.healthy_living_challenge TO authenticated;
GRANT ALL ON public.healthy_living_challenge TO service_role;
