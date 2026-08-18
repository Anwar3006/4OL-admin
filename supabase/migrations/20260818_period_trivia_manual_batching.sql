-- AI-generated questions already share a natural batch key (ai_job_id --
-- one job inserts all 10 rows together). Manually-created questions have
-- no equivalent, so the admin Trivia tab can't group them into one
-- reviewable unit. This column gives manual questions the same grouping:
-- the server reuses the most recent open batch for the same admin if it
-- was started within the last hour, otherwise starts a new one.
alter table public.period_trivia_questions
  add column if not exists manual_batch_id uuid;

create index if not exists idx_period_trivia_questions_manual_batch
  on public.period_trivia_questions(manual_batch_id)
  where manual_batch_id is not null;
