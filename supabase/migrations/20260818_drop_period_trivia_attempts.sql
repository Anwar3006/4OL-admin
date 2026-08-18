-- period_trivia_attempts was dead code from the start: no mobile client ever
-- wrote to it (the real trivia submission path is period_trivia_submissions,
-- written via the separate /api/period/trivia route) and no admin UI reads
-- it. `cascade` also drops its RLS policies and covering index.
drop table if exists public.period_trivia_attempts cascade;
