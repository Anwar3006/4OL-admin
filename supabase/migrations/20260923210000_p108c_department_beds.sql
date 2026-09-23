-- P1-08c · Beds belong to a department, and roll up to the hospital
--
-- What exists: `bed_tracker_facilities` (one row per provider, with a fixed
-- set of per-type counters) → `bed_tracker_wards` (ward_type, total_beds,
-- occupied_beds, available_beds) → `bed_tracker_ward_updates` (an audit row
-- with an `actor`).
--
-- What is missing, and why this is free right now: **both tables are empty**
-- (0 facilities, 0 wards on prod), so re-keying wards to departments costs no
-- data migration. It will not stay free.
--
-- Three problems:
--
-- 1. A ward has no department. "Maternity has 5 free beds" and "the hospital
--    has 14 free" are the same question at two levels, and only the second
--    could be answered.
-- 2. Nothing rolls wards up. `bed_tracker_facilities.total_beds` and friends
--    were writable numbers nobody derived from anything.
-- 3. **There is no provider-side write path at all.** Both tables are
--    world-readable with admin-only writes, so no hospital could ever have
--    updated its own bed counts from the app. That is the actual blocker for
--    P0-16's Beds tab, and no amount of UI would have fixed it.
--
-- On the per-type columns (`icu_beds`, `maternity_beds`, `pediatric_beds`,
-- `general_ward_beds`, …): they are a FIXED taxonomy and cannot express
-- arbitrary departments. They are not extended. Wards become the source of
-- truth and those columns are maintained as a derived cache for their two
-- existing readers (`get_bedtracker_route_suggestions`,
-- `get_platform_overview_metrics`), which both already read them.

alter table public.bed_tracker_wards
  add column if not exists department_id uuid
    references public.provider_departments(id) on delete set null;

create index if not exists bed_tracker_wards_department_idx
  on public.bed_tracker_wards (department_id);

comment on column public.bed_tracker_wards.department_id is
  'The department this ward belongs to. NULL means the ward is not yet assigned to one; it still counts toward the hospital total.';

-- ─────────────────────────────────────────────────────────────────────────
-- The rollup
--
-- Recomputes a facility's totals from its wards. `available` is deliberately
-- NOT summed from `bed_tracker_wards.available_beds` — that column is itself
-- maintained by `trg_bt_wards_sync`, and summing a derived column means a
-- single stale row silently corrupts the hospital's headline number. It is
-- recomputed as total - occupied, the same definition, from the two columns
-- a human actually types.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.fn_rollup_bed_tracker_facility(p_facility_row_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_total int;
  v_occupied int;
begin
  select coalesce(sum(w.total_beds), 0), coalesce(sum(w.occupied_beds), 0)
    into v_total, v_occupied
  from public.bed_tracker_wards w
  where w.bed_tracker_facility_id = p_facility_row_id;

  update public.bed_tracker_facilities f
  set total_beds     = v_total,
      occupied_beds  = v_occupied,
      available_beds = greatest(v_total - v_occupied, 0),
      -- The fixed per-type columns, kept as a cache. `ward_type` is free
      -- text, so anything that is not one of these four simply does not
      -- appear in them — it still counts in the totals above, which is why
      -- the totals and not these are the source of truth.
      icu_beds               = coalesce((select sum(w.total_beds) from public.bed_tracker_wards w
                                          where w.bed_tracker_facility_id = p_facility_row_id
                                            and lower(w.ward_type) = 'icu'), 0),
      icu_available          = coalesce((select greatest(sum(w.total_beds) - sum(w.occupied_beds), 0)
                                          from public.bed_tracker_wards w
                                          where w.bed_tracker_facility_id = p_facility_row_id
                                            and lower(w.ward_type) = 'icu'), 0),
      maternity_beds         = coalesce((select sum(w.total_beds) from public.bed_tracker_wards w
                                          where w.bed_tracker_facility_id = p_facility_row_id
                                            and lower(w.ward_type) = 'maternity'), 0),
      maternity_available    = coalesce((select greatest(sum(w.total_beds) - sum(w.occupied_beds), 0)
                                          from public.bed_tracker_wards w
                                          where w.bed_tracker_facility_id = p_facility_row_id
                                            and lower(w.ward_type) = 'maternity'), 0),
      pediatric_beds         = coalesce((select sum(w.total_beds) from public.bed_tracker_wards w
                                          where w.bed_tracker_facility_id = p_facility_row_id
                                            and lower(w.ward_type) in ('pediatric','paediatric')), 0),
      pediatric_available    = coalesce((select greatest(sum(w.total_beds) - sum(w.occupied_beds), 0)
                                          from public.bed_tracker_wards w
                                          where w.bed_tracker_facility_id = p_facility_row_id
                                            and lower(w.ward_type) in ('pediatric','paediatric')), 0),
      general_ward_beds      = coalesce((select sum(w.total_beds) from public.bed_tracker_wards w
                                          where w.bed_tracker_facility_id = p_facility_row_id
                                            and lower(w.ward_type) in ('general','general_ward')), 0),
      general_ward_available = coalesce((select greatest(sum(w.total_beds) - sum(w.occupied_beds), 0)
                                          from public.bed_tracker_wards w
                                          where w.bed_tracker_facility_id = p_facility_row_id
                                            and lower(w.ward_type) in ('general','general_ward')), 0),
      last_updated_at = now()
  where f.id = p_facility_row_id;
end;
$function$;

revoke execute on function public.fn_rollup_bed_tracker_facility(uuid) from public, anon, authenticated;

create or replace function public.fn_bed_tracker_ward_rollup()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if tg_op = 'DELETE' then
    perform public.fn_rollup_bed_tracker_facility(old.bed_tracker_facility_id);
    return old;
  end if;

  perform public.fn_rollup_bed_tracker_facility(new.bed_tracker_facility_id);
  -- A ward moved between facilities has to correct both sides.
  if tg_op = 'UPDATE' and old.bed_tracker_facility_id is distinct from new.bed_tracker_facility_id then
    perform public.fn_rollup_bed_tracker_facility(old.bed_tracker_facility_id);
  end if;
  return new;
end;
$function$;

revoke execute on function public.fn_bed_tracker_ward_rollup() from public, anon, authenticated;

-- AFTER, not BEFORE: the rollup reads the ward rows, so the row being
-- changed must already be visible. It also runs after `trg_bt_wards_sync`,
-- which is a BEFORE trigger maintaining `available_beds` on the row itself.
drop trigger if exists trg_bed_tracker_ward_rollup on public.bed_tracker_wards;
create trigger trg_bed_tracker_ward_rollup
  after insert or update or delete on public.bed_tracker_wards
  for each row
  execute function public.fn_bed_tracker_ward_rollup();

-- ─────────────────────────────────────────────────────────────────────────
-- The provider-side write path
-- ─────────────────────────────────────────────────────────────────────────

/**
 * Update one ward's bed counts.
 *
 * Note the department argument passed to `is_provider_member`: it is what
 * stops a maternity nurse updating ICU. Omitting it would ask "may this
 * person update beds anywhere in the business", which a department-scoped
 * member answers yes to — the trap documented on the helper in P1-08a.
 *
 * `occupied > total` is rejected rather than clamped: it means whoever is
 * typing has the two numbers the wrong way round, and silently correcting it
 * would publish a bed count that nobody intended to a public directory.
 */
create or replace function public.update_ward_beds(
  p_ward_id uuid,
  p_total integer,
  p_occupied integer
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_provider_id uuid;
  v_department_id uuid;
begin
  select f.facility_id, w.department_id
    into v_provider_id, v_department_id
  from public.bed_tracker_wards w
  join public.bed_tracker_facilities f on f.id = w.bed_tracker_facility_id
  where w.id = p_ward_id;

  if v_provider_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if not public.is_provider_member(v_provider_id, 'beds.update', v_department_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_total is null or p_occupied is null or p_total < 0 or p_occupied < 0 then
    return jsonb_build_object('ok', false, 'error', 'negative');
  end if;
  if p_occupied > p_total then
    return jsonb_build_object('ok', false, 'error', 'occupied_exceeds_total');
  end if;

  -- The audit row first, so a failure to write history cannot be masked by a
  -- successful count update.
  insert into public.bed_tracker_ward_updates
    (ward_id, previous_total, previous_occupied, new_total, new_occupied, actor, source)
  select p_ward_id, w.total_beds, w.occupied_beds, p_total, p_occupied,
         (select auth.uid()), 'app'
  from public.bed_tracker_wards w where w.id = p_ward_id;

  update public.bed_tracker_wards
     set total_beds = p_total,
         occupied_beds = p_occupied,
         last_updated_at = now(),
         updated_by = (select auth.uid()),
         update_source = 'app'
   where id = p_ward_id;

  return jsonb_build_object('ok', true, 'available', greatest(p_total - p_occupied, 0));
end;
$function$;

revoke execute on function public.update_ward_beds(uuid, integer, integer) from public, anon;
grant execute on function public.update_ward_beds(uuid, integer, integer) to authenticated;

/**
 * The Beds tab's read: every ward this provider has, grouped by department,
 * with the hospital total.
 *
 * Returns ALL the provider's wards regardless of the caller's department
 * scope — seeing that ICU is full is not the same as being able to change it,
 * and a nurse who cannot see the rest of the hospital cannot do her job.
 * `can_update` tells the UI which rows to make editable.
 */
create or replace function public.get_provider_beds(p_provider_id uuid)
returns table(
  ward_id uuid,
  ward_type text,
  department_id uuid,
  department_name text,
  total_beds integer,
  occupied_beds integer,
  available_beds integer,
  last_updated_at timestamptz,
  can_update boolean
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_provider_member(p_provider_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
  select
    w.id,
    w.ward_type,
    w.department_id,
    d.name,
    w.total_beds,
    w.occupied_beds,
    greatest(coalesce(w.total_beds, 0) - coalesce(w.occupied_beds, 0), 0),
    w.last_updated_at,
    public.is_provider_member(p_provider_id, 'beds.update', w.department_id)
  from public.bed_tracker_wards w
  join public.bed_tracker_facilities f on f.id = w.bed_tracker_facility_id
  left join public.provider_departments d on d.id = w.department_id
  where f.facility_id = p_provider_id
  order by coalesce(d.name, 'zzz'), w.ward_type;
end;
$function$;

revoke execute on function public.get_provider_beds(uuid) from public, anon;
grant execute on function public.get_provider_beds(uuid) to authenticated;
