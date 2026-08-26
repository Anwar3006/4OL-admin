-- Fix: "Mark Top Rated" fails with "stack depth limit reached", and the
-- facility Top-Rated toggle silently fails to curate the facility.
--
-- Two triggers write to each other's table with no guard:
--
--   top_rated_items  AFTER INSERT/UPDATE/DELETE -> sync_top_rated_facility_flag()
--                    which UPDATEs facility_profile.is_top_rated
--   facility_profile AFTER UPDATE               -> refresh_top_rated_snapshot('facility')
--                    which UPDATEs top_rated_items
--
-- Marking an item therefore ping-ponged: insert -> update facility -> update
-- item -> update facility -> ... until Postgres blew the stack.
--
-- The facility-side toggle only appeared to work because
-- refresh_top_rated_snapshot UPDATEs an existing row and never inserts one:
-- for a facility with no top_rated_items row the UPDATE matched zero rows, so
-- the cycle never started -- and the facility never actually entered the
-- curated list the mobile app reads. Once a row existed, that direction
-- looped too.
--
-- 1. Make the item -> facility direction idempotent. This alone terminates the
--    cycle: the second pass finds is_top_rated already at the target value and
--    writes nothing, so no further trigger fires.
create or replace function public.sync_top_rated_facility_flag()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if (tg_op = 'INSERT' or tg_op = 'UPDATE') then
    if new.module = 'facility' then
      update public.facility_profile
      set is_top_rated = true,
          updated_at = now()
      where id = new.item_id
        -- Recursion brake: without this the write always "changes" the row
        -- (updated_at = now()), re-firing the facility_profile trigger.
        and is_top_rated is distinct from true;
    end if;
    return new;
  elsif (tg_op = 'DELETE') then
    if old.module = 'facility' then
      update public.facility_profile
      set is_top_rated = false,
          updated_at = now()
      where id = old.item_id
        and is_top_rated is distinct from false
        and not exists (
          select 1 from public.top_rated_items
          where module = 'facility' and item_id = old.item_id
        );
    end if;
    return old;
  end if;
  return null;
end;
$function$;

-- 2. Make the facility -> item direction real, so the two controls are one
--    switch: flipping is_top_rated on creates the curated row, flipping it off
--    removes it. Mirrors admin_upsert_top_rated_item's column set.
--
--    publish_from / expire_at are deliberately NOT touched on conflict: they
--    are set from the Top Rated page's Add/Edit dialog, and a toggle from the
--    facility screen must not silently clear a scheduled window.
create or replace function public.sync_facility_flag_to_top_rated()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.is_top_rated then
    insert into public.top_rated_items (
      module, item_id, title, subtitle, image_url,
      rating, rating_count, source, rank, module_data
    )
    values (
      'facility', new.id, new.facility_name, new.area, new.featured_image_url,
      new.rating_average, new.rating_count, 'manual', new.top_rated_rank,
      public.build_top_rated_module_data('facility', new.id)
    )
    on conflict (module, item_id) do update
      set title       = excluded.title,
          subtitle    = excluded.subtitle,
          image_url   = excluded.image_url,
          rating      = excluded.rating,
          rating_count= excluded.rating_count,
          module_data = excluded.module_data,
          updated_at  = now();
  else
    delete from public.top_rated_items
    where module = 'facility' and item_id = new.id;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_facility_profile_sync_top_rated on public.facility_profile;
create trigger trg_facility_profile_sync_top_rated
after update of is_top_rated on public.facility_profile
for each row
when (new.is_top_rated is distinct from old.is_top_rated)
execute function public.sync_facility_flag_to_top_rated();
