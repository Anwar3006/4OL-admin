-- ROLLBACK for p108c_department_beds (and its p108c_bed_source_app follow-up)
--
-- `bed_tracker_wards.department_id` is dropped LAST, after the functions that
-- reference it are gone.
--
-- The 'app' value is removed from both source constraints. If any ward update
-- was made from the Business app, those rows violate the restored constraint,
-- so the deletes below clear them first — there is no way to relabel an
-- update that genuinely came from the app as 'tablet' or 'admin' without
-- lying about its provenance.

drop trigger if exists trg_bed_tracker_ward_rollup on public.bed_tracker_wards;
drop function if exists public.fn_bed_tracker_ward_rollup();
drop function if exists public.fn_rollup_bed_tracker_facility(uuid);
drop function if exists public.get_provider_beds(uuid);
drop function if exists public.update_ward_beds(uuid, integer, integer);

delete from public.bed_tracker_ward_updates where source = 'app';
update public.bed_tracker_wards set update_source = 'admin' where update_source = 'app';

alter table public.bed_tracker_wards drop constraint if exists bed_tracker_wards_update_source_check;
alter table public.bed_tracker_wards add constraint bed_tracker_wards_update_source_check
  check (update_source = any (array['tablet'::text, 'admin'::text, 'api'::text]));
alter table public.bed_tracker_ward_updates drop constraint if exists bed_tracker_ward_updates_source_check;
alter table public.bed_tracker_ward_updates add constraint bed_tracker_ward_updates_source_check
  check (source = any (array['tablet'::text, 'admin'::text, 'api'::text]));

alter table public.bed_tracker_wards drop column if exists department_id;
