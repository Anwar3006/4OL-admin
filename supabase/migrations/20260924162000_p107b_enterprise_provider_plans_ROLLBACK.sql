-- Rollback for 20260924162000_p107b_enterprise_provider_plans.sql
-- Refuse to delete catalogue rows once an organisation has subscribed.

do $$
begin
  if exists (
    select 1
    from public.facility_subscriptions fs
    join public.marketing_subscriptions ms on ms.id = fs.subscription_id
    where ms.name in ('Provider Enterprise', 'Provider Enterprise Plus')
  ) then
    raise exception 'Cannot roll back enterprise plans while subscriptions reference them';
  end if;
end;
$$;

delete from public.marketing_subscriptions
where name in ('Provider Enterprise', 'Provider Enterprise Plus');

update public.marketing_subscriptions
set tier_limit = 0,
    updated_at = now()
where name in ('Provider Premium', 'Provider Premium Plus');

alter table public.marketing_subscriptions
  drop column if exists department_limit;

-- Restore the grant surface from the P1-07 migration. `get_my_entitlement`
-- itself still enforces authentication before reading any entitlement.
revoke execute on function public.get_my_entitlement() from public, anon;
grant execute on function public.get_my_entitlement() to authenticated, service_role;
