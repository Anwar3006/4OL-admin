-- Rollback for 20260924000500_p101_enquiry_categories_revoke_public.sql
--
-- Re-grants EXECUTE to PUBLIC. Only do this if something turns out to have been
-- calling the function as a role other than authenticated/service_role — which
-- would itself be worth understanding first, since the function refuses anyone
-- who is not a provider member.

grant execute on function public.get_vendor_enquiry_inbox(uuid) to public;
