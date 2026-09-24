-- P1-07 follow-up · organisation plans for staffed providers and hospitals.
--
-- Privileges remain provider-scoped: every active provider_member benefits
-- from the organisation's active plan through facility_has_privilege(). The
-- personal consumer bundle remains exclusive to beneficiary_user_id.

alter table public.marketing_subscriptions
  add column if not exists department_limit integer not null default 1
    check (department_limit >= 0);

update public.marketing_subscriptions
set tier_limit = 5,
    department_limit = 1,
    updated_at = now()
where name in ('Provider Premium', 'Provider Premium Plus');

insert into public.marketing_subscriptions (
  name, description, tier_type, price, period, billing_cycle, privileges,
  tier_limit, department_limit, is_active
)
values
  (
    'Provider Enterprise',
    'Provider Premium for a staffed organisation: up to 25 staff seats and 10 departments.',
    'enterprise', 299.00, '1month', 'monthly',
    array[
      'paid_chat'::public.subscription_privilege,
      'priority_enquiry_alerts'::public.subscription_privilege,
      'advanced_analytics'::public.subscription_privilege,
      'demand_insight'::public.subscription_privilege
    ],
    25, 10, true
  ),
  (
    'Provider Enterprise Plus',
    'Provider Enterprise for hospitals and larger organisations: up to 100 staff seats and 25 departments, plus full personal Our Life Premium for the subscribing member-provider administrator.',
    'enterprise', 499.00, '1month', 'monthly',
    array[
      'paid_chat'::public.subscription_privilege,
      'priority_enquiry_alerts'::public.subscription_privilege,
      'advanced_analytics'::public.subscription_privilege,
      'demand_insight'::public.subscription_privilege,
      'consumer_full_access_bundle'::public.subscription_privilege
    ],
    100, 25, true
  )
on conflict (name) do update set
  description = excluded.description,
  tier_type = excluded.tier_type,
  price = excluded.price,
  period = excluded.period,
  billing_cycle = excluded.billing_cycle,
  privileges = excluded.privileges,
  tier_limit = excluded.tier_limit,
  department_limit = excluded.department_limit,
  is_active = excluded.is_active,
  updated_at = now();

-- This RPC is an authenticated endpoint. A legacy direct anon grant survived
-- its older migration despite revoking PUBLIC; remove it explicitly.
revoke execute on function public.get_my_entitlement() from public, anon;
grant execute on function public.get_my_entitlement() to authenticated, service_role;
