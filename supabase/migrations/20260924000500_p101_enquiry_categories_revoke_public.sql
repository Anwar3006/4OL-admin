-- Follow-up to p101_enquiry_categories (applied separately on 23 Sept).
--
-- DROP + CREATE on get_vendor_enquiry_inbox lost the original ACL, and CREATE
-- FUNCTION grants EXECUTE to PUBLIC by default, so anon briefly gained the
-- right to call it. Not exploitable — it is SECURITY DEFINER and its first
-- statement is an is_provider_member() check that anon fails with 42501 — but
-- it is a wider grant than the function had before, and "not exploitable today"
-- is not a reason to leave it. Restores the exact pre-migration ACL:
-- postgres, authenticated, service_role.
--
-- The same revoke is now inlined at the end of the main migration, so a replay
-- from scratch never opens the gap in the first place. This file exists because
-- prod took the two steps separately.

revoke execute on function public.get_vendor_enquiry_inbox(uuid) from public;
