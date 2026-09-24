-- Rollback for 20260924160000_p107_provider_subscription_privileges.sql
--
-- PostgreSQL cannot remove individual enum labels. They grant nothing on their
-- own: capability access comes only from marketing_subscriptions. Leave these
-- inert labels in place and roll back the catalogue migration instead.

select 'No rollback: PostgreSQL enum labels cannot be dropped individually.' as note;
