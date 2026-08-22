-- ============================================================================
-- Gap Analysis Part AI (My Account) — MA-D2/D5/D6 platform layer
-- ============================================================================
-- 1. Captures the ghost `faqs` / `faq_categories` tables (referenced by the
--    admin FAQ CMS hooks and the platform-overview metrics RPCs but never
--    persisted by any migration) and exposes a public read RPC for the
--    mobile Help Center (MA-D2).
-- 2. Extends `platform_settings` with support_whatsapp + share_url and
--    exposes a public app-config RPC so the mobile app stops hardcoding
--    support contacts and share links (MA-D5).
-- 3. Adds marketing/research consent columns to user_profiles for the
--    Privacy & Data hub (MA-D6).
-- All mobile features degrade gracefully until this migration is applied.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. FAQ knowledge base (ghost-table capture)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.faq_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category_id uuid REFERENCES public.faq_categories(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'published',
  view_count integer NOT NULL DEFAULT 0,
  helpful_count integer NOT NULL DEFAULT 0,
  not_helpful_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Keep updated_at fresh on admin edits.
CREATE OR REPLACE FUNCTION public.set_faqs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS faqs_set_updated_at ON public.faqs;
CREATE TRIGGER faqs_set_updated_at
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW EXECUTE FUNCTION public.set_faqs_updated_at();

-- RLS: public read of PUBLISHED FAQs only. Admin CRUD goes through the
-- service-role key (bypasses RLS), matching the rest of the admin panel.
ALTER TABLE public.faq_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS faq_categories_public_read ON public.faq_categories;
CREATE POLICY faq_categories_public_read
  ON public.faq_categories FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS faqs_public_read_published ON public.faqs;
CREATE POLICY faqs_public_read_published
  ON public.faqs FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- Public read RPC (SECURITY DEFINER so it works even if policies tighten).
CREATE OR REPLACE FUNCTION public.get_public_faqs()
RETURNS TABLE (
  id uuid,
  question text,
  answer text,
  category_name text,
  view_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT f.id, f.question, f.answer, c.name AS category_name, f.view_count
  FROM public.faqs f
  LEFT JOIN public.faq_categories c ON c.id = f.category_id
  WHERE f.status = 'published'
  ORDER BY COALESCE(c.name, 'General') ASC, f.view_count DESC, f.created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_faqs() FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_faqs() TO anon, authenticated;

-- Starter categories (no-op when they already exist).
INSERT INTO public.faq_categories (name) VALUES
  ('Getting Started'),
  ('Account & Security'),
  ('Privacy & Data'),
  ('Subscriptions & Payments')
ON CONFLICT (name) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Platform settings — central support contacts + share link (MA-D5)
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS support_whatsapp text,
  ADD COLUMN IF NOT EXISTS share_url text;

INSERT INTO public.platform_settings (id, platform_name, support_email, support_phone, default_language, share_url)
VALUES ('global', '4 Our Life', 'disrupt@4th-pay.com', '', 'en', 'https://4ourlife.com')
ON CONFLICT (id) DO UPDATE SET
  share_url = COALESCE(public.platform_settings.share_url, EXCLUDED.share_url);

-- Public app-config RPC: safe, non-secret fields only.
CREATE OR REPLACE FUNCTION public.get_public_app_config()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'platform_name', COALESCE(ps.platform_name, '4 Our Life'),
    'support_email', ps.support_email,
    'support_phone', ps.support_phone,
    'support_whatsapp', ps.support_whatsapp,
    'share_url', ps.share_url,
    'default_language', COALESCE(ps.default_language, 'en')
  )
  INTO result
  FROM public.platform_settings ps
  WHERE ps.id = 'global';

  RETURN COALESCE(result, jsonb_build_object(
    'platform_name', '4 Our Life',
    'support_email', null,
    'support_phone', null,
    'support_whatsapp', null,
    'share_url', null,
    'default_language', 'en'
  ));
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_app_config() FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_app_config() TO anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Consent columns for the Privacy & Data hub (MA-D6)
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS marketing_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS research_consent boolean NOT NULL DEFAULT false;

-- ════════════════════════════════════════════════════════════════════════════
-- Manual step: apply this file to the target Supabase project. Until then:
--   • mobile Help Center falls back to its built-in FAQs,
--   • mobile contacts fall back to baked-in defaults,
--   • consent toggles render but persist only after the columns exist.
-- ════════════════════════════════════════════════════════════════════════════
