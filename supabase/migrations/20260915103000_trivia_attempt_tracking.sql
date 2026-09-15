-- Server-side attempt/duration tracking. period_trivia_attempts existed once
-- (20260818_drop_period_trivia_attempts.sql removed it as dead code because
-- nothing ever wrote to it) — this time start_period_trivia_attempt and the
-- rewritten submit_period_trivia (see the next migration) actually use it, so
-- duration_seconds — the field that breaks ranking ties for real money — is
-- computed from a server timestamp instead of trusted from the client.
create table public.period_trivia_attempts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.period_trivia_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_hash text not null,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  unique (event_id, user_id)
);

create index period_trivia_attempts_event_idx
  on public.period_trivia_attempts (event_id);

alter table public.period_trivia_attempts enable row level security;
revoke all on table public.period_trivia_attempts from anon, authenticated;
grant all on table public.period_trivia_attempts to service_role;

comment on table public.period_trivia_attempts is
  'One row per user per event from "start quiz" to submission. started_at is the server clock submit_period_trivia measures duration against; unique(event_id,user_id) also caps starting to once per event, so a user cannot keep resetting the clock.';

alter table public.period_trivia_submissions
  add column attempt_id uuid unique references public.period_trivia_attempts(id) on delete set null;

alter table public.period_trivia_events
  add column closed_at timestamptz;

comment on column public.period_trivia_events.closed_at is
  'Set once by close_period_trivia_event — the idempotency flag that stops winners being assigned/paid twice.';
