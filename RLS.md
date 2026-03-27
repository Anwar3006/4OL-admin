- By passing RLS with our current BetterAuth-Supabase setup
- This only works if the Supabase request carries the JWT minted by app/api/supabase-token/route.ts (line 50). Without that, every policy using auth.uid() or JWT claims will fail.
```sql
-- 1. Standardize "who is calling?"
create or replace function public.request_user_id()
returns text
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::text
$$;

-- 2. Centralize role checks
create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles up
    where up.user_id = public.request_user_id()
      and up.role in ('admin', 'super_admin')
  );
$$;

grant execute on function public.request_user_id() to anon, authenticated;
grant execute on function public.is_app_admin() to anon, authenticated;

-- 3. Table policy template
alter table public.marketing_discounts enable row level security;

create policy "marketing_discounts_select"
on public.marketing_discounts
for select
to authenticated
using (
  is_active = true
  or created_by = public.request_user_id()
  or public.is_app_admin()
);

create policy "marketing_discounts_insert"
on public.marketing_discounts
for insert
to authenticated
with check (
  public.is_app_admin()
  and created_by = public.request_user_id()
);

create policy "marketing_discounts_update"
on public.marketing_discounts
for update
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());

create policy "marketing_discounts_delete"
on public.marketing_discounts
for delete
to authenticated
using (public.is_app_admin());


create or replace function public.set_marketing_discount_created_by()
returns trigger
language plpgsql
as $$
begin
  if new.created_by is null then
    new.created_by := public.request_user_id();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_marketing_discount_created_by on public.marketing_discounts;

create trigger trg_set_marketing_discount_created_by
before insert on public.marketing_discounts
for each row
execute function public.set_marketing_discount_created_by();

```



PROMPT
This is the subscriptions, we need to update the add-subscriptions form and zodschema to reflect these:
CREATE TYPE public.subscription_privilege AS ENUM (
    'business_analytics',
    'performance_analytics',
    'popup_notification',
    'top_rated_placement',
    'featured_placement',
    'ad_discount_10',
    'ad_discount_25',
    'ad_discount_30',
    'ad_discount_40',
    'ad_discount_50',
    'ad_flyer_discount_10',
    'advanced_analytics',
    'priority_support'
);

CREATE TABLE IF NOT EXISTS public.marketing_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    tier_type TEXT NOT NULL, -- Renamed from 'type' to avoid reserved keyword confusion
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    
    -- Using the constraints you defined
    period TEXT DEFAULT 'free' 
        CHECK (period IN ('free', '3days', '7days', '0.5month', '1month', '3months', '6months', '12months', 'Lifetime')),
    
    billing_cycle TEXT DEFAULT 'one-time' 
        CHECK (billing_cycle IN ('monthly', 'yearly', 'one-time')),
    
    -- The New Enum Array column
    privileges public.subscription_privilege[] DEFAULT '{}'::public.subscription_privilege[],
    
    tier_limit INTEGER DEFAULT 0, -- Added from your screenshot (Tier Limit)
    is_active BOOLEAN DEFAULT TRUE,
    created_by TEXT REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
along with the hook that inserts, updates, deletes, then the datatable.

For the add-workout dialog, make these adjustments:
increase the dropdown trigger width for Primary and Secondary and Equipment 
put Intensity and Equipment in the same row.
upload video should also allow video uploads not just an input to paste a link, so we might need components and libraries for video uploads and they should follow a similar approach as the image upload, both should go to the same file path in supabase storage.
How to input, should be a richText