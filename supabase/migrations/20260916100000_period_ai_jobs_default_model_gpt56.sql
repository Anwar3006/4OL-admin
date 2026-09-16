-- Follow-up to 20260916090000_period_ai_jobs_default_model.sql: the curated
-- registry moved to the current OpenAI lineup (GPT-6 Astra, GPT-5.6
-- Sol/Terra/Luna), so the column default follows DEFAULT_AI_MODEL in
-- features/ai/schema/models.ts to keep the two from disagreeing.
--
-- Terra rather than Luna: Period content is clinically reviewed health
-- education, so the balanced tier is the right floor for a default. An
-- admin can still pick Luna explicitly for a bulk suggestion run.

alter table public.period_ai_jobs
  alter column model_key set default 'gpt-5.6-terra';
