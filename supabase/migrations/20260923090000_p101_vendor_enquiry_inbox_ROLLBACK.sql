-- Rollback for 20260923090000_p101_vendor_enquiry_inbox.sql
-- The function is new in that migration, so dropping it restores the prior
-- state exactly. No table, policy or grant was altered.
drop function if exists public.get_vendor_enquiry_inbox(uuid);
