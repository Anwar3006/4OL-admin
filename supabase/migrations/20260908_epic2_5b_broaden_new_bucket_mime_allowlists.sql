-- The job-documents and chat-attachments routes support open-ended
-- "other"/"file" categories (features/jobs/api/attachment.ts kind=other,
-- features/chat/api/attachment.ts kind=file) that were never restricted by
-- MIME type in the old public bucket4ol. The MIME allowlists set when these
-- buckets were created (epic2_5_storage_hardening) only covered the
-- obvious cases and would have silently broken real uploads in those two
-- categories. Broaden to cover realistic HR-document and general
-- file-share formats before any route starts writing to these buckets.

update storage.buckets
set allowed_mime_types = array[
  'application/pdf','image/jpeg','image/png','image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain'
]
where id = 'job-documents';

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg','image/png','image/webp',
  'video/mp4','video/quicktime',
  'audio/mpeg','audio/mp4','audio/wav',
  'application/pdf','application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip','text/plain'
]
where id = 'chat-attachments';
