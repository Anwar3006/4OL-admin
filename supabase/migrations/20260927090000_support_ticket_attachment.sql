-- AF-05 Part 4 (S5): support ticket attachments.
--
-- Mobile support submissions can now carry an optional screenshot/file. The
-- file itself is uploaded to the shared public storage bucket (same pattern as
-- group avatars) and only its public URL + original name are persisted here, so
-- the admin SupportTab and the mobile "My Tickets" card can link to it without
-- a signed-URL round-trip.
--
-- Additive + nullable: existing rows and the pre-migration insert path (which
-- omits attachment_url entirely) are unaffected.
--
-- Owner-only step: apply with `supabase db push` (or the SQL editor) alongside
-- the rest of the AF-05 governance migrations, then run `pnpm gen:types`.

ALTER TABLE public.chat_support
  ADD COLUMN IF NOT EXISTS attachment_url  text,
  ADD COLUMN IF NOT EXISTS attachment_name text;

COMMENT ON COLUMN public.chat_support.attachment_url IS
  'AF-05 S5: optional public URL of a user-attached screenshot/file.';
COMMENT ON COLUMN public.chat_support.attachment_name IS
  'AF-05 S5: original display name of the attached file.';

NOTIFY pgrst, 'reload schema';
