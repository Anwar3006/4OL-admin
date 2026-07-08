-- Migration: Symptoms slug unique constraint
-- Description: scripts/symptom_seeder.ts upserts into public.symptoms with
-- `.upsert(payload, { onConflict: "slug" })`, but the symptoms table has no
-- unique constraint on `slug` (only the `id` primary key). Postgres requires
-- a matching unique constraint/index for ON CONFLICT to plan at all, so every
-- batch insert failed with 42P10 "there is no unique or exclusion constraint
-- matching the ON CONFLICT specification".

-- Guard against any pre-existing duplicate slugs before applying the
-- constraint below (Postgres treats multiple NULLs as distinct, so NULL
-- slugs are not an issue here):
-- SELECT slug, count(*) FROM public.symptoms WHERE slug IS NOT NULL GROUP BY slug HAVING count(*) > 1;

ALTER TABLE public.symptoms
  ADD CONSTRAINT symptoms_slug_key UNIQUE (slug);
