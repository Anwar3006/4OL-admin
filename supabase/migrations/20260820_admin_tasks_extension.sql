-- Gap Analysis Part D — Task Manager addendum.
--
-- Epic 22 created admin_tasks. The mockup additionally needs:
--   1. progress_percent — progress bar on in-progress cards (decision D-D5)
--   2. task_seq — human-readable T-XXX identifiers (decision D-D6)
--
-- All changes are additive; safe to re-run.

alter table public.admin_tasks
  add column if not exists progress_percent int not null default 0
    check (progress_percent between 0 and 100);

create sequence if not exists public.admin_task_seq;

alter table public.admin_tasks
  add column if not exists task_seq int;

-- Backfill existing rows deterministically (oldest first).
with ordered as (
  select id, row_number() over (order by created_at, id) as rn
  from public.admin_tasks
  where task_seq is null
)
update public.admin_tasks t
set task_seq = ordered.rn
from ordered
where t.id = ordered.id and t.task_seq is null;

-- Now that every row has a value, add the uniqueness + default.
alter table public.admin_tasks
  add constraint admin_tasks_task_seq_key unique (task_seq);

alter table public.admin_tasks
  alter column task_seq set default nextval('public.admin_task_seq');

select setval(
  'public.admin_task_seq',
  coalesce((select max(task_seq) from public.admin_tasks), 0) + 1,
  false
);

comment on column public.admin_tasks.task_seq is
  'Human-readable task number, displayed as T-<lpad(task_seq,3,0)>.';
comment on column public.admin_tasks.progress_percent is
  'Manual progress indicator (0-100) shown on in_progress cards.';
