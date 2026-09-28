-- ROLLBACK for 20260927000300_af05_governance_tables.sql
-- Drops the governance tables (indexes + RLS policies cascade with the table).

drop table if exists public.conversation_join_requests;
drop table if exists public.conversation_invitations;

notify pgrst, 'reload schema';
