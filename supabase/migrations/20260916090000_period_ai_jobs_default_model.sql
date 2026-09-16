-- period_ai_jobs.model_key defaulted to 'gemini-2.0-flash', a model this
-- codebase has not called since the switch to OpenAI Structured Outputs.
-- Every row inserted so far carries 'gpt-4o' because the API always wrote
-- the column explicitly, so the default was never reached -- it would only
-- ever have applied to a row inserted by hand or by a future code path,
-- and would have named a provider we no longer have a client for.
--
-- The API now passes an admin-selected model validated against
-- features/ai/schema/models.ts. This aligns the column default with that
-- registry's default so the two cannot disagree.

alter table public.period_ai_jobs
  alter column model_key set default 'gpt-4o-mini';

comment on column public.period_ai_jobs.model_key is
  'Generation model actually used for this job. Admin-selected per job from the curated registry in features/ai/schema/models.ts; recorded here so an old job stays explainable after the default moves on.';
