-- Epic 2.5 (TASKS.md), achievable slice: bucket4ol is the only bucket --
-- public=true, no size limit, no MIME allowlist. Live contents are
-- overwhelmingly legitimate public content (conditions/workouts/
-- healthy_living/etc. images+video), but three admin API routes
-- (features/medenquiry/api/attachment.ts, features/jobs/api/attachment.ts,
-- features/chat/api/attachment.ts) also write prescriptions/, jobs/
-- (CVs) and chat/ into this SAME public bucket via signed upload URLs, and
-- persist the resulting *permanent, unauthenticated* public URL into
-- medication_enquiries.prescription_url / job_applications.resume_url /
-- chat message rows.
--
-- storage.objects has no SELECT policy for anon/authenticated on this
-- bucket, so folder enumeration is already blocked -- the exposure is
-- "anyone who ever obtains one specific URL can read that one file
-- forever," not open browsing. Still worth closing, but moving those three
-- routes off the public bucket changes what mobile persists long-term
-- (the Jobs "save CV for reuse" flow in particular stores publicUrl
-- indefinitely for reuse across future applications) -- that needs a
-- coordinated mobile release, tracked as a separate follow-up, not forced
-- through here.
--
-- What's safe and additive right now:

-- 1. Cap bucket4ol's size and content type (current max object is 10.58MB
--    video/mp4; 50MB leaves headroom). Existing objects are unaffected --
--    limits only gate new uploads.
update storage.buckets
set file_size_limit = 52428800, -- 50MB
    allowed_mime_types = array[
      'image/jpeg','image/png','image/webp',
      'video/mp4','video/quicktime',
      'application/pdf'
    ]
where id = 'bucket4ol';

-- 2. bucket4ol had two duplicate, path-unscoped INSERT policies letting any
--    authenticated user write to ANY path in the bucket directly (not just
--    through the admin API's signed-upload flow, which uses service_role
--    and is unaffected by this). Replace both with one policy scoped to
--    the actual public-content folders; the sensitive prefixes
--    (prescriptions/, jobs/, chat/) are intentionally excluded so only the
--    service-role-mediated API routes can write there.
drop policy if exists "Allow Authenticated Uploads" on storage.objects;
drop policy if exists "Allow authenticated uploads to bucket4ol" on storage.objects;

create policy "authenticated uploads to public content folders"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'bucket4ol'
  and (
    name like 'conditions/%' or name like 'workouts/%' or
    name like 'healthy_living/%' or name like 'richTextImages/%' or
    name like 'fitness/%' or name like 'facilities/%' or
    name like 'marketing/%' or name like 'challenges/%' or
    name like 'symptoms/%' or name like 'avatars/%'
  )
);

-- 3. Forward-looking private buckets for the mobile-release-gated
--    follow-up: move prescriptions/CVs/chat attachments/HCP verification
--    evidence off the public bucket. Created now, not yet wired to any
--    route -- fully service-role-mediated (no anon/authenticated grants,
--    no client policies), so they're safe to create ahead of the code
--    change that will populate them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('prescriptions', 'prescriptions', false, 5242880,
   array['image/jpeg','image/png','image/webp','application/pdf']),
  ('job-documents', 'job-documents', false, 10485760,
   array['application/pdf','image/jpeg','image/png',
         'application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('chat-attachments', 'chat-attachments', false, 26214400,
   array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime',
         'audio/mpeg','audio/mp4','audio/wav','application/pdf']),
  ('hcp-verification', 'hcp-verification', false, 10485760,
   array['application/pdf','image/jpeg','image/png'])
on conflict (id) do nothing;
