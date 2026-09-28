-- ROLLBACK for 20260927090000_support_ticket_attachment.sql (AF-05 S5).

ALTER TABLE public.chat_support
  DROP COLUMN IF EXISTS attachment_name,
  DROP COLUMN IF EXISTS attachment_url;

NOTIFY pgrst, 'reload schema';
