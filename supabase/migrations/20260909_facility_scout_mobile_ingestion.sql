-- Facility Scout mobile ingestion — RLS for the two tables the Expo app now
-- needs, plus a private storage bucket for scout photos.
--
-- facility_scout_submissions and facility_scout_config both had RLS enabled
-- and zero policies (confirmed via pg_policies before this migration) — RLS
-- on + no policy = deny all, per this repo's CLAUDE.md rule 1. Nothing could
-- read or write these from the mobile client until now. facility_scout_
-- referrals already had the correct shape; this mirrors it.

-- facility_scout_submissions: a scout can create and read their own rows;
-- admin can read all. No UPDATE/DELETE policy for authenticated — status,
-- match_status, reviewed_*, assigned_collector_id etc. stay admin-only.
create policy "create own scout submission" on public.facility_scout_submissions
  for insert to authenticated
  with check (auth.uid() = submitted_by);

create policy "own scout submission or admin" on public.facility_scout_submissions
  for select to authenticated
  using (auth.uid() = submitted_by OR is_admin());

-- facility_scout_config: reward-tier numbers only, not sensitive — mobile
-- needs it for the reward preview and max_pending_per_user check before
-- submitting.
create policy "read scout config" on public.facility_scout_config
  for select to authenticated
  using (true);

-- Private storage bucket for scout photos, same shape as chat-attachments,
-- prescriptions, hcp-verification. No storage.objects policy — access is
-- exclusively via signed URLs minted by a service-role API route
-- (features/facility-scout/api/upload-url.ts), validated by their own
-- signing token, not by the caller's RLS session. chat-attachments (the
-- pattern this mirrors) has zero storage.objects policies for the same
-- reason.
insert into storage.buckets (id, name, public)
values ('facility-scout-photos', 'facility-scout-photos', false)
on conflict (id) do nothing;
