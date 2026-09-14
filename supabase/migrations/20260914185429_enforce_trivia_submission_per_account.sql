-- A signed-in account may submit only once per Trivia event, regardless of
-- which phone or tablet it uses. The API performs an early eligibility check;
-- this unique index is the race-safe source of truth for simultaneous devices.
create unique index if not exists uq_period_trivia_submission_event_user
  on public.period_trivia_submissions(event_id, user_id)
  where user_id is not null;

comment on index public.uq_period_trivia_submission_event_user is
  'Enforces one Trivia submission per signed-in account for each event across all devices.';
