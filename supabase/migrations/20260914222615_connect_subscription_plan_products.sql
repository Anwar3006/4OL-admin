-- One shared subscription plan catalogue, classified by the three products
-- the application actually sells. Marketing authors every plan; product
-- screens read their own subset from this same table.
alter table public.subscription_tiers
  add column if not exists product_scope text not null default 'full_access';

alter table public.subscription_tiers
  drop constraint if exists subscription_tiers_product_scope_check;

alter table public.subscription_tiers
  add constraint subscription_tiers_product_scope_check
  check (product_scope in ('full_access', 'plasence', 'fitness'));

update public.subscription_tiers
set product_scope = case
  when key like 'cycle_pro%' then 'plasence'
  when key in ('free', 'premium', 'lifetime') then 'fitness'
  else 'full_access'
end;

create index if not exists idx_subscription_tiers_product_scope
  on public.subscription_tiers(product_scope, display_order, price_ghs);

comment on column public.subscription_tiers.product_scope is
  'Commercial product owning this plan: full_access, plasence, or fitness. Marketing is the shared authoring surface.';
