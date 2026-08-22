-- =============================================================================
-- Gap Analysis Part AE — Top Rated placement windows + snapshot refresh
-- =============================================================================
-- Decision points T-D2/T-D3/T-D5:
--   * T-D2  publish_from / expire_at placement windows. Mobile applies lazy
--           expiry at read time (.or('expire_at.is.null,expire_at.gte.now')),
--           no cron job needed. Admin shows Active/Scheduled/Expired chips.
--   * T-D3  Trigger-based denormalized snapshot refresh: edits in any of the
--           six source tables refresh the matching top_rated_items row
--           (title/subtitle/image_url/rating + module_data) automatically.
--   * T-D5  Revoke anon from search_top_rated_items (admin dialog only).
--
-- Timer verdict (user question): NO live countdown UI, YES placement windows,
-- NO server-side slot rotation.
--
-- Additive and re-runnable. The upsert RPC signatures change (two new
-- trailing parameters with defaults) so the old arities are dropped first —
-- PostgREST resolves RPCs by exact parameter set, and every existing caller
-- passes named arguments, which keep working with the defaults.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Placement window columns
-- -----------------------------------------------------------------------------
alter table public.top_rated_items
  add column if not exists publish_from timestamptz,
  add column if not exists expire_at timestamptz;

comment on column public.top_rated_items.publish_from is
  'Optional placement start (Gap Analysis T-D2). NULL = immediately active.';
comment on column public.top_rated_items.expire_at is
  'Optional placement end (Gap Analysis T-D2). NULL = never expires. Mobile filters lazily.';

create index if not exists idx_top_rated_items_expire_at
  on public.top_rated_items (expire_at)
  where expire_at is not null;

-- -----------------------------------------------------------------------------
-- 2. Upsert RPCs with window parameters (T-D2)
-- -----------------------------------------------------------------------------
drop function if exists public.admin_upsert_top_rated_item(text, uuid, text, text, text, numeric, int, text, int, uuid);
drop function if exists public.admin_upsert_top_rated(text, uuid, text, text, text, numeric, int, text, int, uuid);

create or replace function public.admin_upsert_top_rated_item(
  p_module TEXT,
  p_item_id UUID,
  p_title TEXT,
  p_subtitle TEXT DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL,
  p_rating NUMERIC DEFAULT NULL,
  p_rating_count INT DEFAULT NULL,
  p_source TEXT DEFAULT 'manual',
  p_rank INT DEFAULT NULL,
  p_added_by UUID DEFAULT NULL,
  p_publish_from TIMESTAMPTZ DEFAULT NULL,
  p_expire_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  module TEXT,
  item_id UUID,
  title TEXT,
  subtitle TEXT,
  image_url TEXT,
  rating NUMERIC,
  rating_count INT,
  source TEXT,
  rank INT,
  added_by UUID,
  added_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_expire_at IS NOT NULL AND p_publish_from IS NOT NULL AND p_expire_at <= p_publish_from THEN
    RAISE EXCEPTION 'expire_at must be after publish_from';
  END IF;

  RETURN QUERY
    INSERT INTO public.top_rated_items (
      module, item_id, title, subtitle, image_url,
      rating, rating_count, source, rank, added_by, module_data,
      publish_from, expire_at
    )
    VALUES (
      p_module, p_item_id, p_title, p_subtitle, p_image_url,
      p_rating, p_rating_count, p_source, p_rank, p_added_by,
      public.build_top_rated_module_data(p_module, p_item_id),
      p_publish_from, p_expire_at
    )
    ON CONFLICT (module, item_id)
    DO UPDATE SET
      title = EXCLUDED.title,
      subtitle = EXCLUDED.subtitle,
      image_url = EXCLUDED.image_url,
      rating = EXCLUDED.rating,
      rating_count = EXCLUDED.rating_count,
      source = EXCLUDED.source,
      rank = EXCLUDED.rank,
      added_by = EXCLUDED.added_by,
      module_data = public.build_top_rated_module_data(EXCLUDED.module, EXCLUDED.item_id),
      publish_from = EXCLUDED.publish_from,
      expire_at = EXCLUDED.expire_at,
      updated_at = NOW()
    RETURNING
      top_rated_items.id,
      top_rated_items.module,
      top_rated_items.item_id,
      top_rated_items.title,
      top_rated_items.subtitle,
      top_rated_items.image_url,
      top_rated_items.rating,
      top_rated_items.rating_count,
      top_rated_items.source,
      top_rated_items.rank,
      top_rated_items.added_by,
      top_rated_items.added_at,
      top_rated_items.updated_at;
END;
$$;

create or replace function public.admin_upsert_top_rated(
  p_module TEXT,
  p_item_id UUID,
  p_title TEXT,
  p_subtitle TEXT DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL,
  p_rating NUMERIC DEFAULT NULL,
  p_rating_count INT DEFAULT NULL,
  p_source TEXT DEFAULT 'manual',
  p_rank INT DEFAULT NULL,
  p_added_by UUID DEFAULT NULL,
  p_publish_from TIMESTAMPTZ DEFAULT NULL,
  p_expire_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  module TEXT,
  item_id UUID,
  title TEXT,
  subtitle TEXT,
  image_url TEXT,
  rating NUMERIC,
  rating_count INT,
  source TEXT,
  rank INT,
  added_by UUID,
  added_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  RETURN QUERY SELECT * FROM public.admin_upsert_top_rated_item(
    p_module, p_item_id, p_title, p_subtitle, p_image_url,
    p_rating, p_rating_count, p_source, p_rank, p_added_by,
    p_publish_from, p_expire_at
  );
END;
$$;

revoke all on function public.admin_upsert_top_rated_item(text, uuid, text, text, text, numeric, int, text, int, uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_upsert_top_rated_item(text, uuid, text, text, text, numeric, int, text, int, uuid, timestamptz, timestamptz) to authenticated, service_role;

revoke all on function public.admin_upsert_top_rated(text, uuid, text, text, text, numeric, int, text, int, uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_upsert_top_rated(text, uuid, text, text, text, numeric, int, text, int, uuid, timestamptz, timestamptz) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3. Snapshot refresh trigger (T-D3). One shared function, attached to each
--    of the six source tables. SECURITY DEFINER so the refresh works even
--    when the source-table UPDATE runs under restrictive RLS.
-- -----------------------------------------------------------------------------
create or replace function public.refresh_top_rated_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_module text;
  v_title text;
  v_subtitle text;
  v_image text;
  v_rating numeric;
begin
  v_module := tg_argv[0];

  case v_module
    when 'facility' then
      v_title := new.facility_name; v_subtitle := new.area;
      v_image := new.featured_image_url; v_rating := new.avg_rating;
    when 'fitness_plan' then
      v_title := new.title; v_subtitle := new.description;
      v_image := null; v_rating := new.average_rating;
    when 'outdoor_route' then
      v_title := new.name; v_subtitle := new.area;
      v_image := case when array_length(new.image_urls, 1) > 0 then new.image_urls[1] else null end;
      v_rating := null;
    when 'outdoor_event' then
      v_title := new.title; v_subtitle := new.area;
      v_image := null; v_rating := null;
    when 'challenge' then
      v_title := new.title; v_subtitle := new.description;
      v_image := new.featured_image_url; v_rating := null;
    when 'exercise' then
      v_title := new.exercise_name; v_subtitle := new.primary_muscle_group;
      v_image := new.thumbnail_url; v_rating := null;
    else
      return new;
  end case;

  update public.top_rated_items
  set title = coalesce(v_title, title),
      subtitle = coalesce(v_subtitle, subtitle),
      image_url = coalesce(v_image, image_url),
      rating = coalesce(v_rating, rating),
      module_data = public.build_top_rated_module_data(v_module, new.id),
      updated_at = now()
  where module = v_module and item_id = new.id;

  return new;
end;
$$;

drop trigger if exists trg_facility_profile_top_rated_snapshot on public.facility_profile;
create trigger trg_facility_profile_top_rated_snapshot
  after update on public.facility_profile
  for each row execute function public.refresh_top_rated_snapshot('facility');

drop trigger if exists trg_fitness_plans_top_rated_snapshot on public.fitness_plans;
create trigger trg_fitness_plans_top_rated_snapshot
  after update on public.fitness_plans
  for each row execute function public.refresh_top_rated_snapshot('fitness_plan');

drop trigger if exists trg_fitness_outdoor_routes_top_rated_snapshot on public.fitness_outdoor_routes;
create trigger trg_fitness_outdoor_routes_top_rated_snapshot
  after update on public.fitness_outdoor_routes
  for each row execute function public.refresh_top_rated_snapshot('outdoor_route');

drop trigger if exists trg_fitness_outdoor_events_top_rated_snapshot on public.fitness_outdoor_events;
create trigger trg_fitness_outdoor_events_top_rated_snapshot
  after update on public.fitness_outdoor_events
  for each row execute function public.refresh_top_rated_snapshot('outdoor_event');

drop trigger if exists trg_fitness_challenges_top_rated_snapshot on public.fitness_challenges;
create trigger trg_fitness_challenges_top_rated_snapshot
  after update on public.fitness_challenges
  for each row execute function public.refresh_top_rated_snapshot('challenge');

drop trigger if exists trg_fitness_exercises_top_rated_snapshot on public.fitness_exercises;
create trigger trg_fitness_exercises_top_rated_snapshot
  after update on public.fitness_exercises
  for each row execute function public.refresh_top_rated_snapshot('exercise');

-- -----------------------------------------------------------------------------
-- 4. T-D5 — search_top_rated_items is admin-dialog-only; anon had no business
--    enumerating every ratable source table.
-- -----------------------------------------------------------------------------
revoke execute on function public.search_top_rated_items(text, text, int, int) from anon;
grant execute on function public.search_top_rated_items(text, text, int, int) to authenticated, service_role;
