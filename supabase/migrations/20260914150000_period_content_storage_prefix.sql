-- =============================================================================
-- Add "period/" to the authenticated-upload allowlist on storage.objects.
--
-- Period Tracker's Library content (features/period/ui/LibraryOperations.tsx,
-- ContentReviewModal.tsx) now uploads cover images via the same ImageDropZone
-- component every other feature uses (components/ImageDropZone.tsx), writing
-- into bucket4ol under a "period/" prefix. Uploads actually go through the
-- admin API's service-role client (getPresignedUploadUrl -> getAdminClient()),
-- which bypasses RLS, so this isn't required for the feature to work today --
-- it's defense-in-depth: keeping the sanctioned client-upload prefix list in
-- sync with what the app actually writes, in case that ever changes.
-- =============================================================================

drop policy if exists "authenticated uploads to public content folders" on storage.objects;

create policy "authenticated uploads to public content folders"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'bucket4ol'
    and (
      name like 'conditions/%'
      or name like 'workouts/%'
      or name like 'healthy_living/%'
      or name like 'richTextImages/%'
      or name like 'fitness/%'
      or name like 'facilities/%'
      or name like 'marketing/%'
      or name like 'challenges/%'
      or name like 'symptoms/%'
      or name like 'avatars/%'
      or name like 'period/%'
    )
  );
