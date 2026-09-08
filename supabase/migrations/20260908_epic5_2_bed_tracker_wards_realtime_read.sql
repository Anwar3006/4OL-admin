-- Epic 5.2: bed_tracker_wards has RLS enabled but zero policies and zero
-- authenticated grants, unlike its siblings bed_tracker_facilities and
-- bed_tracker_alerts (both carry a "readable" SELECT-true policy for
-- authenticated). Supabase Realtime enforces RLS on the subscribing
-- client's JWT, so a browser-side Realtime subscription on wards would
-- silently receive nothing without this — the admin Live Overview needs
-- it to pick up other admins' bed-count changes without a manual refresh.
--
-- SELECT only (not the ALL/is_admin() write policy the siblings also
-- have): all ward writes already go through the admin API's
-- getAdminClient(), and should stay that way.

grant select on public.bed_tracker_wards to authenticated;

create policy "bed wards readable"
  on public.bed_tracker_wards
  for select
  to authenticated
  using (true);
