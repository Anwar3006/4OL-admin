-- Reconcile public.analytics_events between the mobile and admin contracts.
--
-- The table already existed with the mobile shape (event_name, module,
-- source) and the mobile app writes it directly from
-- components/rate-app/*.tsx. The admin migrations (20260822_global_search_v2,
-- 20260822_marketing_unification) insert (event_type, campaign_id, user_id,
-- metadata) instead. Rather than pick a winner and break one side, both
-- shapes are valid on the same table:
--
--   * event_type / campaign_id added, nullable, so mobile rows omit them
--   * event_name relaxed and module defaulted, so admin rows omit them
--   * a BEFORE INSERT trigger mirrors event_type <-> event_name so every row
--     is queryable by either column
--
-- The admin CHECK on event_type is NULL-passing, so mobile rows satisfy it.

alter table public.analytics_events
  add column if not exists event_type text,
  add column if not exists campaign_id uuid;

alter table public.analytics_events
  alter column event_name drop not null;

alter table public.analytics_events
  alter column module set default 'general';

alter table public.analytics_events
  drop constraint if exists analytics_events_event_type_check;
alter table public.analytics_events
  add constraint analytics_events_event_type_check
  check (event_type is null or event_type in (
    'impression', 'click', 'install', 'signup', 'upgrade',
    'search_executed', 'search_zero_results'
  ));

create or replace function public.sync_analytics_event_names()
returns trigger
language plpgsql
as $$
begin
  if new.event_name is null and new.event_type is not null then
    new.event_name := new.event_type;
  elsif new.event_type is null and new.event_name is not null
        and new.event_name in (
          'impression', 'click', 'install', 'signup', 'upgrade',
          'search_executed', 'search_zero_results') then
    new.event_type := new.event_name;
  end if;
  if new.module is null then
    new.module := 'general';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_analytics_event_names on public.analytics_events;
create trigger trg_sync_analytics_event_names
  before insert on public.analytics_events
  for each row execute function public.sync_analytics_event_names();

create index if not exists idx_analytics_events_created
  on public.analytics_events (created_at);
create index if not exists idx_analytics_events_event_type
  on public.analytics_events (event_type) where event_type is not null;

alter table public.analytics_events enable row level security;
