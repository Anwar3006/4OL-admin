-- P1-08c follow-up · `app` is a real bed-update source
--
-- `bed_tracker_wards.update_source` and `bed_tracker_ward_updates.source`
-- allowed only 'tablet', 'admin' and 'api'. The bed tracker was designed
-- around a wall-mounted tablet in the ward with an admin console behind it;
-- a nurse updating her own ward from the Business app on a phone did not
-- exist as a concept when those constraints were written.
--
-- Adding 'app' rather than reusing 'api': provenance is the point of the
-- column, and now that P1-08 gives every update a named person (`actor`),
-- "a staff member tapped this in the Business app" and "something called the
-- REST API" are worth telling apart — not least when a bed count is disputed.
--
-- Additive: the three existing values are unchanged.

alter table public.bed_tracker_wards
  drop constraint if exists bed_tracker_wards_update_source_check;
alter table public.bed_tracker_wards
  add constraint bed_tracker_wards_update_source_check
  check (update_source = any (array['tablet'::text, 'admin'::text, 'api'::text, 'app'::text]));

alter table public.bed_tracker_ward_updates
  drop constraint if exists bed_tracker_ward_updates_source_check;
alter table public.bed_tracker_ward_updates
  add constraint bed_tracker_ward_updates_source_check
  check (source = any (array['tablet'::text, 'admin'::text, 'api'::text, 'app'::text]));

-- Note for whoever builds the Beds tab: `ward_type` is itself constrained to
-- eight values ('general', 'icu', 'surgical', 'medical', 'maternity',
-- 'pediatric', 'psychiatric', 'geriatric'). A DEPARTMENT can be named
-- anything (`provider_departments.name` is free text), but the WARD inside it
-- must still carry one of those eight. `fn_rollup_bed_tracker_facility` maps
-- 'general'/'general_ward' and 'pediatric'/'paediatric' defensively; only the
-- first of each pair can occur while this constraint stands.
