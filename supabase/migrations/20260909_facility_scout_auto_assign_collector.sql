-- Round-robin auto-assignment for new scout submissions, gated by the
-- existing facility_scout_config.collector_auto_assign toggle (already
-- exposed in the admin Settings tab, previously had no backend behavior).
--
-- Picks an active data_collector, preferring one whose region array
-- contains the submission's region, falling back to any active collector.
-- Among candidates, picks the one with the fewest currently-open
-- assignments (status = 'field_review'), tie-broken by oldest
-- last_active_at. Mirrors the effect of a manual normal-priority assign
-- (features/facility-scout/api/submissions-assign.ts): sets
-- assigned_collector_id, status, priority and a 5-day SLA.
create or replace function public.assign_scout_submission_collector()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_auto_assign boolean;
  v_collector_id uuid;
begin
  select collector_auto_assign into v_auto_assign
  from public.facility_scout_config
  where id = 1;

  if not coalesce(v_auto_assign, false) then
    return new;
  end if;

  -- Prefer a regional match.
  select dc.id into v_collector_id
  from public.data_collectors dc
  where dc.is_active = true
    and new.region is not null
    and new.region = any (dc.region)
  order by (
    select count(*) from public.facility_scout_submissions s
    where s.assigned_collector_id = dc.id and s.status = 'field_review'
  ) asc, dc.last_active_at asc nulls first
  limit 1;

  -- Fall back to any active collector.
  if v_collector_id is null then
    select dc.id into v_collector_id
    from public.data_collectors dc
    where dc.is_active = true
    order by (
      select count(*) from public.facility_scout_submissions s
      where s.assigned_collector_id = dc.id and s.status = 'field_review'
    ) asc, dc.last_active_at asc nulls first
    limit 1;
  end if;

  -- No active collector at all — leave pending for the manual queue.
  if v_collector_id is null then
    return new;
  end if;

  new.assigned_collector_id := v_collector_id;
  new.status := 'field_review';
  new.priority := 'normal';
  new.sla_due_at := now() + interval '5 days';

  return new;
end;
$$;

create trigger trg_scout_submissions_auto_assign
  before insert on public.facility_scout_submissions
  for each row
  execute function public.assign_scout_submission_collector();
