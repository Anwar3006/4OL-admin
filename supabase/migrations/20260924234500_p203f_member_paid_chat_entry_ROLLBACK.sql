-- Rollback for 20260924234500_p203f_member_paid_chat_entry.sql.
drop function if exists public.fn_start_paid_chat_from_offer(uuid);
notify pgrst, 'reload schema';
