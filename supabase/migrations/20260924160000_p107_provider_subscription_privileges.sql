-- P1-07 · Provider Premium catalogue privileges.
--
-- Keep enum additions in their own migration. PostgreSQL will not allow a new
-- enum value to be used until the transaction that added it has committed.
-- `paid_chat` was added separately by P2-03.

alter type public.subscription_privilege add value if not exists 'priority_enquiry_alerts';
alter type public.subscription_privilege add value if not exists 'demand_insight';
alter type public.subscription_privilege add value if not exists 'consumer_full_access_bundle';
