BEGIN;

-- ── 1. Drop the old hierarchical view (it depends on parent_id & content_sections) ──
DROP VIEW IF EXISTS public.healthy_living_info_view;

-- ── 2. Add the new flat content column ──
ALTER TABLE public.healthy_living_info
  ADD COLUMN IF NOT EXISTS content jsonb DEFAULT '{}'::jsonb;

-- ── 3. Migrate nested content_sections → flat content ──
--    Assumes content_sections is an array of objects with a "content" key.
--    If your shape is different, adjust the JSON path before running.
UPDATE public.healthy_living_info
SET content = COALESCE(content_sections -> 0 -> 'content', '{}'::jsonb)
WHERE content_sections IS NOT NULL
  AND jsonb_array_length(content_sections) > 0
  AND (content IS NULL OR content = '{}'::jsonb);

-- ── 4. Remove category hub rows (no longer meaningful in a flat list) ──
DELETE FROM public.healthy_living_info WHERE content_type = 'category';

-- ── 5. Drop self-referencing hierarchy ──
ALTER TABLE public.healthy_living_info
  DROP CONSTRAINT IF EXISTS healthy_living_info_parent_id_fkey;
ALTER TABLE public.healthy_living_info
  DROP COLUMN IF EXISTS parent_id;

-- ── 6. Drop unused columns & constraints ──
ALTER TABLE public.healthy_living_info
  DROP CONSTRAINT IF EXISTS healthy_living_info_author_id_fkey;

ALTER TABLE public.healthy_living_info
  DROP COLUMN IF EXISTS content_sections,
  DROP COLUMN IF EXISTS display_order,
  DROP COLUMN IF EXISTS content_type,
  DROP COLUMN IF EXISTS tags,
  DROP COLUMN IF EXISTS reading_time_minutes,
  DROP COLUMN IF EXISTS author_id,
  DROP COLUMN IF EXISTS is_featured;

-- ── 7. Backfill NULLs before tightening NOT NULL (so the ALTER doesn't fail) ──
UPDATE public.healthy_living_info SET name        = COALESCE(name, '')        WHERE name IS NULL;
UPDATE public.healthy_living_info SET slug        = COALESCE(slug, '')        WHERE slug IS NULL;
UPDATE public.healthy_living_info SET status      = COALESCE(status, 'draft') WHERE status IS NULL;
UPDATE public.healthy_living_info SET view_count   = COALESCE(view_count, 0)   WHERE view_count IS NULL;
UPDATE public.healthy_living_info SET content     = COALESCE(content, '{}')   WHERE content IS NULL;
UPDATE public.healthy_living_info SET attribution = COALESCE(attribution, '{}') WHERE attribution IS NULL;

-- ── 8. Tighten remaining columns ──
ALTER TABLE public.healthy_living_info
  ALTER COLUMN name        SET NOT NULL,
  ALTER COLUMN slug        SET NOT NULL,
  ALTER COLUMN status      SET NOT NULL,
  ALTER COLUMN view_count  SET NOT NULL,
  ALTER COLUMN content     SET NOT NULL,
  ALTER COLUMN attribution SET NOT NULL;

-- ── 9. Simplify status check (remove pending_review) ──
ALTER TABLE public.healthy_living_info
  DROP CONSTRAINT IF EXISTS chk_hli_status;
ALTER TABLE public.healthy_living_info
  ADD CONSTRAINT chk_hli_status
  CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]));

-- ── 10. Add updated_at trigger ──
ALTER TABLE public.healthy_living_info
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.fn_healthy_living_info_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_healthy_living_info_updated_at ON public.healthy_living_info;
CREATE TRIGGER trg_healthy_living_info_updated_at
BEFORE UPDATE ON public.healthy_living_info
FOR EACH ROW
EXECUTE FUNCTION public.fn_healthy_living_info_updated_at();

-- ── 11. Add metadata column ──
ALTER TABLE public.healthy_living_info
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ── 12. Indexes for the flat list view ──
CREATE INDEX IF NOT EXISTS idx_healthy_living_info_status
  ON public.healthy_living_info (status);
CREATE INDEX IF NOT EXISTS idx_healthy_living_info_view_count
  ON public.healthy_living_info (view_count DESC);
CREATE INDEX IF NOT EXISTS idx_healthy_living_info_metadata
  ON public.healthy_living_info USING gin (metadata);

-- ── 13. Recreate a flat view (no recursion needed) ──
CREATE OR REPLACE VIEW public.healthy_living_info_view AS
SELECT
  id,
  created_at,
  updated_at,
  name,
  slug,
  description,
  image_url,
  attribution,
  status,
  view_count,
  content,
  metadata
FROM public.healthy_living_info;

COMMIT;

-- Final resulting shape:
--   id uuid PK
--   created_at timestamptz
--   updated_at timestamptz
--   name text NOT NULL
--   slug text NOT NULL UNIQUE
--   description text            -- short description, list view
--   content jsonb NOT NULL      -- Lexical doc, detail view
--   image_url text              -- detail view
--   attribution jsonb NOT NULL  -- Lexical doc, detail view
--   status text NOT NULL        -- draft | published | archived
--   view_count integer NOT NULL -- list view
