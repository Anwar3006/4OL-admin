-- Rollback for 20260923092000_p103_vendor_fulfilment.sql and
-- 20260923093000_p103_harden_owner_guards.sql.
--
-- All five functions are new in that pair, so dropping them restores the prior
-- state exactly. No table, policy, grant or enum was altered by either.
--
-- NOTE: the hardening migration also replaced get_vendor_enquiry_inbox. If you
-- roll this back but keep P1-01, re-run 20260923090000 afterwards to restore
-- that function's original body.
drop function if exists public.vendor_mark_delivered(uuid, uuid, text, text);
drop function if exists public.vendor_verify_pickup_code(uuid, uuid, text);
drop function if exists public.vendor_mark_order_ready(uuid, uuid);
drop function if exists public.get_vendor_orders(uuid);
drop function if exists public._vendor_order_guard(uuid, uuid);
