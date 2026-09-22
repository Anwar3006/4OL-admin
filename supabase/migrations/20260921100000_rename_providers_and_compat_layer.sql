-- =============================================================================
-- P0-10 step 2 (the big one): facility_profile -> providers, plus every write
-- path that touches it, done as ONE migration so there is no window where a
-- read or write against "facility_profile" fails because the rename half-
-- landed. Bundles what the brief's "migration order" lists as steps 2-4 (core
-- rename, provider_private split, compatibility view + RLS) because splitting
-- them across separate apply_migration calls would leave `facility_profile`
-- resolving to neither a table nor a view for the gap between commits, and
-- 22 live functions (get_facilities_map, global_search[_v2], submit_medica-
-- tion_enquiry, get_job_listings, capture_daily_metrics's pg_cron job, etc.)
-- SELECT from it.
--
-- Also repoints every function that WRITES to facility_profile — discovered
-- by grepping pg_proc.prosrc for facility_profile and checking each hit for
-- UPDATE/INSERT/DELETE, not by trusting PLAN.md's function list, which turned
-- out to under-count by one (admin_perform_facility_review_action also
-- writes, despite being filed under "read-only" there — flagged for a
-- PLAN.md correction in the same breath as this migration):
--   register_facility_with_profile   (INSERT)   -> rewritten for providers/provider_private
--   registrar_update_own_facility    (UPDATE)   -> rewritten for providers/provider_private
--   admin_change_facility_status     (UPDATE)   -> table name only, body unchanged
--   admin_delete_facility            (DELETE)   -> table name only, body unchanged
--   admin_perform_facility_review_action (UPDATE) -> table name only, body unchanged
--   sync_top_rated_facility_flag     (UPDATE, trigger on top_rated_items) -> table name only
--   refresh_top_rated_snapshot       (trigger on providers) -> new.facility_name -> new.name
--   build_top_rated_module_data      (SELECT, but rewritten to hit providers
--                                      directly rather than lean on the view,
--                                      since it's internal plumbing, not a
--                                      mobile-contract consumer)
-- admin_update_facility_profile is left untouched: it already references
-- columns (name, address, phone_number) that never existed on facility_profile
-- and has thrown "column does not exist" on every call before this migration
-- too (actions/facility-admin.actions.ts:16-24 is its only caller). Same
-- failure mode after, not a regression — flagged for whoever rebuilds the
-- provider edit form in P0-14.
--
-- Legacy facility_type values (types/formInput.ts FACILITY_TYPE_ENUM) are
-- still what the live "Add Facility" dialog and register-account.ts send —
-- that dialog isn't being touched here (no application code). So
-- register_facility_with_profile and registrar_update_own_facility now run
-- their incoming facility_type through _resolve_legacy_provider_type(), a
-- small shim that maps the 14 old free-text values to (kind, provider_type)
-- and passes through anything that's already a valid provider_types.key. It
-- raises on anything it can't map (e.g. the retired 'ibp' value) rather than
-- guessing — once the Add Facility dialog is rebuilt in P0-14 to select
-- kind+provider_type directly, this function becomes dead and can be dropped.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Rename + new columns
-- -----------------------------------------------------------------------------
alter table public.facility_profile rename to providers;

alter table public.providers
  add column kind public.provider_kind,
  add column provider_type text references public.provider_types(key),
  add column verification_status text not null default 'unverified'
    check (verification_status in ('unverified','pending','verified','expired')),
  add column description text,
  add column is_online_only boolean not null default false;

alter table public.providers rename column facility_name to name;

-- -----------------------------------------------------------------------------
-- 2. Fix the trigger chain BEFORE any UPDATE touches providers in this
--    migration (sync_top_rated_facility_flag and refresh_top_rated_snapshot
--    fire unconditionally on UPDATE and would otherwise break the backfill
--    two steps down).
-- -----------------------------------------------------------------------------
create or replace function public.sync_top_rated_facility_flag()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if (tg_op = 'INSERT' or tg_op = 'UPDATE') then
    if new.module = 'facility' then
      update public.providers
      set is_top_rated = true,
          updated_at = now()
      where id = new.item_id
        and is_top_rated is distinct from true;
    end if;
    return new;
  elsif (tg_op = 'DELETE') then
    if old.module = 'facility' then
      update public.providers
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

create or replace function public.refresh_top_rated_snapshot()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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
      v_title := new.name; v_subtitle := new.area;
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
$function$;

create or replace function public.build_top_rated_module_data(p_module text, p_item_id uuid)
 returns jsonb
 language plpgsql
 stable
as $function$
declare
  result jsonb;
begin
  case p_module
    when 'facility' then
      select jsonb_build_object(
        'facility_type', provider_type,
        'accepts_nhis', accepts_nhis,
        'ownership', ownership
      ) into result
      from public.providers where id = p_item_id;
    when 'fitness_plan' then
      select jsonb_build_object(
        'duration_weeks', duration_weeks,
        'workouts_per_week', workouts_per_week,
        'difficulty_level', difficulty_level,
        'is_premium', is_premium
      ) into result
      from public.fitness_plans where id = p_item_id;
    when 'outdoor_route' then
      select jsonb_build_object(
        'distance_km', distance_km,
        'estimated_duration_mins', estimated_duration_mins,
        'difficulty', difficulty,
        'category', category,
        'surface_type', surface_type,
        'verification_status', verification_status
      ) into result
      from public.fitness_outdoor_routes where id = p_item_id;
    when 'outdoor_event' then
      select jsonb_build_object(
        'start_at', start_at,
        'max_participants', max_participants,
        'current_participants', current_participants,
        'route_id', route_id,
        'category', category
      ) into result
      from public.fitness_outdoor_events where id = p_item_id;
    when 'challenge' then
      select jsonb_build_object(
        'challenge_type', challenge_type,
        'status', status,
        'goal_metric', goal_metric,
        'goal_value', goal_value,
        'current_participants', current_participants,
        'end_date', end_date
      ) into result
      from public.fitness_challenges where id = p_item_id;
    when 'exercise' then
      select jsonb_build_object(
        'category', category,
        'primary_muscle_group', primary_muscle_group,
        'difficulty_level', difficulty_level,
        'tier', tier
      ) into result
      from public.fitness_exercises where id = p_item_id;
    else
      result := '{}'::jsonb;
  end case;
  return coalesce(result, '{}'::jsonb);
end;
$function$;

-- -----------------------------------------------------------------------------
-- 3. Legacy facility_type shim, then backfill kind/provider_type for the 3
--    live rows and lock the columns down.
-- -----------------------------------------------------------------------------
create or replace function public._resolve_legacy_provider_type(p_facility_type text, out provider_type text, out kind public.provider_kind)
 language plpgsql
 stable
as $$
begin
  case p_facility_type
    when 'hospital_/_clinic' then provider_type := 'hospital_clinic'; kind := 'care_facility';
    when 'herbal_center' then provider_type := 'herbal_centre'; kind := 'care_facility';
    when 'diagnostic_lab' then provider_type := 'diagnostic_lab'; kind := 'care_facility';
    when 'pharmacy' then provider_type := 'pharmacy'; kind := 'vendor';
    when 'dental_clinic' then provider_type := 'dental_clinic'; kind := 'care_facility';
    when 'home' then provider_type := 'care_home'; kind := 'care_facility';
    when 'eye_clinic' then provider_type := 'eye_clinic'; kind := 'care_facility';
    when 'osteopathy_center' then provider_type := 'osteopathy_centre'; kind := 'care_facility';
    when 'physiotherapy_center' then provider_type := 'physio_centre'; kind := 'care_facility';
    when 'prosthetics_center' then provider_type := 'prosthetics_centre'; kind := 'care_facility';
    when 'psychiatric_center' then provider_type := 'psychiatric_centre'; kind := 'care_facility';
    when 'health_school' then provider_type := 'health_school'; kind := 'care_facility';
    when 'wellness_center' then provider_type := 'gym'; kind := 'trainer';
    when 'personal_trainer' then provider_type := 'personal_trainer'; kind := 'trainer';
    else
      if exists (select 1 from public.provider_types pt where pt.key = p_facility_type) then
        provider_type := p_facility_type;
        select pt.kind into kind from public.provider_types pt where pt.key = p_facility_type;
      else
        raise exception 'Unknown facility_type/provider_type: %. Add it to provider_types or extend _resolve_legacy_provider_type().', p_facility_type;
      end if;
  end case;
end;
$$;

update public.providers set kind = 'vendor', provider_type = 'pharmacy' where facility_type = 'pharmacy';
update public.providers set kind = 'care_facility', provider_type = 'care_home' where facility_type = 'home';
update public.providers set kind = 'care_facility', provider_type = 'dental_clinic' where facility_type = 'dental_clinic';

alter table public.providers
  alter column kind set not null,
  alter column provider_type set not null;

alter table public.providers drop column facility_type;
drop type public.facility_type_enum;

-- -----------------------------------------------------------------------------
-- 4. provider_private: split off owner PII + admin-only fields
-- -----------------------------------------------------------------------------
create table public.provider_private (
  provider_id uuid primary key references public.providers(id) on delete cascade,
  owner_first_name text,
  owner_last_name text,
  owner_email text,
  owner_phone text,
  owner_position text,
  business_registration_number text,
  tin_number text,
  admin_notes text,
  rejection_reason text,
  status_reason text,
  updated_at timestamptz not null default now()
);

insert into public.provider_private (provider_id, owner_first_name, owner_last_name, owner_email, owner_phone, owner_position, admin_notes, rejection_reason, status_reason)
select id, first_name, last_name, owner_email, person_contact_number, "position", admin_notes, rejection_reason, status_reason
from public.providers;

alter table public.providers
  drop column first_name,
  drop column last_name,
  drop column owner_email,
  drop column person_contact_number,
  drop column "position",
  drop column admin_notes,
  drop column rejection_reason,
  drop column status_reason;

alter table public.provider_private enable row level security;
create policy "provider_private owner and admin read" on public.provider_private
  for select to authenticated using (
    (select public.is_app_admin())
    or exists (select 1 from public.providers p where p.id = provider_private.provider_id and p.owner_id = (select auth.uid()))
  );
create policy "provider_private admin write" on public.provider_private
  for all to authenticated using ((select public.is_app_admin())) with check ((select public.is_app_admin()));

revoke all on public.provider_private from anon;
grant select on public.provider_private to authenticated;
grant all on public.provider_private to service_role;

-- -----------------------------------------------------------------------------
-- 5. RLS on providers: rename the P0-02 policies onto the new table name,
--    same logic (owners already have no direct INSERT/UPDATE since P0-02;
--    that part of the brief's "new" RLS design was already shipped). Drop
--    the redundant super_admin_all permissive policy — is_app_admin()
--    already covers super_admin.
-- -----------------------------------------------------------------------------
drop policy if exists "facility_profile_delete_admin" on public.providers;
drop policy if exists "facility_profile_insert_admin" on public.providers;
drop policy if exists "facility_profile_select_active_or_admin" on public.providers;
drop policy if exists "facility_profile_select_public_active" on public.providers;
drop policy if exists "facility_profile_super_admin_all" on public.providers;
drop policy if exists "facility_profile_update_admin" on public.providers;

create policy "providers_select_public_active" on public.providers
  for select to anon using (status = 'active'::facility_status_enum);

create policy "providers_select_authenticated" on public.providers
  for select to authenticated using (
    (lower(status::text) = any (array['active','approved']))
    or owner_id = (select auth.uid())
    or submitted_by = (select auth.uid())
    or (select public.is_app_admin())
    or (select public.has_4ol_permission((select auth.uid()), 'facilities.view'))
  );

create policy "providers_insert_admin" on public.providers
  for insert to authenticated with check ((select public.is_app_admin()));

create policy "providers_update_admin" on public.providers
  for update to authenticated using ((select public.is_app_admin())) with check ((select public.is_app_admin()));

create policy "providers_delete_admin" on public.providers
  for delete to authenticated using ((select public.is_app_admin()));

-- -----------------------------------------------------------------------------
-- 6. Compatibility view facility_profile — public columns only. Deliberately
--    leaves out hefra_registration_number and verification_documents too,
--    even though those two don't move to provider_credentials until P0-11:
--    this is the P0-02 PII fix ("Still open until P0-10") landing now rather
--    than waiting for the credentials migration to physically relocate them.
-- -----------------------------------------------------------------------------
create view public.facility_profile
  with (security_barrier = true)
  as
  select
    p.id, p.owner_id,
    p.provider_type as facility_type,
    p.name as facility_name,
    p.contact_number, p.whatsapp_number, p.email, p.media_urls, p.featured_image_url,
    p.gps_address, p.street, p.post_code, p.area, p.district, p.region, p.country,
    p.latitude, p.longitude, p.location,
    p.ownership, p.accepts_nhis, p.services, p.amenities,
    p.status, p.business_hours, p.keywords,
    p.avg_rating, p.created_at, p.approved_at, p.updated_at,
    p.is_top_rated, p.is_featured, p.submitted_by, p.approved_by,
    p.featured_order, p.view_count, p.rating_average, p.rating_count,
    p.subscription_tier, p.subscription_expires_at,
    p.top_rated_rank, p.top_rated_set_by, p.top_rated_set_at,
    p.feature_type, p.feature_start, p.feature_end, p.is_featured_paused,
    p.status_changed_at,
    p.kind, p.provider_type, p.verification_status, p.description, p.is_online_only
  from public.providers p
  where (p.status = 'active' and p.kind in ('care_facility','vendor'))
     or p.owner_id = (select auth.uid())
     or (select public.is_app_admin());

revoke insert, update, delete on public.facility_profile from anon, authenticated;
grant select on public.facility_profile to anon, authenticated;
grant select, insert, update, delete on public.facility_profile to service_role;

-- -----------------------------------------------------------------------------
-- 7. Write functions that must target providers/provider_private now
-- -----------------------------------------------------------------------------
create or replace function public.register_facility_with_profile(p_admin_id uuid, p_owner_id uuid, p_first_name text, p_last_name text, p_phone_number text, p_facility_data jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_provider_id uuid;
  v_kind public.provider_kind;
  v_provider_type text;
begin
  if auth.role() <> 'service_role' and not public.is_app_admin()
     and public.get_user_app_role() <> 'registrar' then
    raise exception 'Not authorized';
  end if;

  select r.provider_type, r.kind into v_provider_type, v_kind
  from public._resolve_legacy_provider_type(p_facility_data->>'facility_type') r;

  insert into public.providers (
    owner_id, name, kind, provider_type, contact_number, whatsapp_number,
    email, gps_address, street, post_code, area, district, region, country,
    featured_image_url, media_urls, services, amenities, business_hours,
    keywords, ownership, accepts_nhis, latitude, longitude, status, submitted_by
  )
  values (
    p_owner_id, (p_facility_data->>'facility_name'), v_kind, v_provider_type,
    (p_facility_data->>'contact_number'), (p_facility_data->>'whatsapp_number'),
    (p_facility_data->>'email'), (p_facility_data->>'gps_address'), (p_facility_data->>'street'),
    (p_facility_data->>'post_code'), (p_facility_data->>'area'), (p_facility_data->>'district'),
    (p_facility_data->>'region')::public.region_enum, coalesce(p_facility_data->>'country', 'Ghana'),
    (p_facility_data->>'featured_image_url'),
    coalesce(p_facility_data->'media_urls', '[]'::jsonb),
    coalesce(p_facility_data->'services', '[]'::jsonb),
    coalesce(p_facility_data->'amenities', '[]'::jsonb),
    coalesce(p_facility_data->'business_hours', '[]'::jsonb),
    case
      when jsonb_typeof(p_facility_data->'keywords') = 'array' then p_facility_data->'keywords'
      else (select jsonb_agg(trim(kw)) from unnest(string_to_array(coalesce(p_facility_data->>'keywords', ''), ',')) as kw where trim(kw) <> '')
    end,
    (p_facility_data->>'ownership'), coalesce((p_facility_data->>'accepts_nhis')::boolean, false),
    (p_facility_data->>'latitude')::double precision, (p_facility_data->>'longitude')::double precision,
    'pending', p_admin_id
  )
  returning id into v_provider_id;

  insert into public.provider_private (provider_id, owner_first_name, owner_last_name, owner_email, owner_phone, owner_position)
  values (v_provider_id, p_first_name, p_last_name, (p_facility_data->>'owner_email'), p_phone_number, (p_facility_data->>'position'));

  insert into public.activity_logs (actor_id, action_type, target_table, record_id, new_data)
  values (p_admin_id::text, 'create_facility', 'providers', v_provider_id::text,
    jsonb_build_object('facility_name', p_facility_data->>'facility_name', 'owner_id', p_owner_id));

  return jsonb_build_object('id', v_provider_id, 'status', 'success');
end;
$function$;

create or replace function public.admin_change_facility_status(p_admin_id text, payload jsonb)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if auth.role() <> 'service_role' and not public.is_app_admin() then
    raise exception 'Not authorized';
  end if;

  execute format('SET LOCAL app.current_user_id = %L', p_admin_id);

  update public.providers
  set
    status = (payload->>'p_new_status')::public.facility_status_enum,
    featured_image_url = (payload->>'featured_image_url'),
    media_urls = (payload->'p_media_urls')::jsonb,
    approved_at = case when payload->>'p_new_status' = 'active' then now() else approved_at end,
    updated_at = now()
  where id = (payload->>'p_facility_id')::UUID;
end;
$function$;

create or replace function public.admin_delete_facility(p_admin_id text, p_facility_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if auth.role() <> 'service_role' and not public.is_app_admin() then
    raise exception 'Not authorized';
  end if;

  execute format('SET LOCAL app.current_user_id = %L', p_admin_id);
  delete from public.providers where id = p_facility_id;
end;
$function$;

create or replace function public.admin_perform_facility_review_action(p_admin_id text, p_facility_id uuid, p_is_top_rated boolean, p_comment_text text DEFAULT NULL::text, p_rating integer DEFAULT NULL::integer, p_parent_id uuid DEFAULT NULL::uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
DECLARE
  v_new_avg_rating numeric;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  EXECUTE format('SET LOCAL app.current_user_id = %L', p_admin_id);

  IF (p_comment_text IS NOT NULL AND p_comment_text != '') OR p_rating IS NOT NULL THEN
    INSERT INTO public.facility_reviews (facility_id, user_id, parent_id, comment_text, rating)
    VALUES (p_facility_id, p_admin_id, p_parent_id, p_comment_text, p_rating);
  END IF;

  SELECT COALESCE(AVG(rating), 0) INTO v_new_avg_rating
  FROM public.facility_reviews WHERE facility_id = p_facility_id AND rating IS NOT NULL;

  UPDATE public.providers
  SET is_top_rated = p_is_top_rated, avg_rating = v_new_avg_rating, updated_at = now()
  WHERE id = p_facility_id;
END;
$function$;

create or replace function public.registrar_update_own_facility(p_user_id uuid, p_facility_id uuid, p_payload jsonb)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_current_status facility_status_enum;
  v_submitted_by uuid;
  v_is_admin boolean := public.is_app_admin();
  v_new_kind public.provider_kind;
  v_new_provider_type text;
begin
  if not (v_is_admin or public.get_user_app_role() = 'registrar') then
    raise exception 'Not authorized';
  end if;

  select status, submitted_by into v_current_status, v_submitted_by
  from public.providers
  where id = p_facility_id;

  if v_submitted_by is null then
    raise exception 'Facility not found';
  end if;

  if v_submitted_by <> p_user_id and not v_is_admin then
    raise exception 'Not your facility';
  end if;

  if v_current_status not in ('pending', 'rejected') and not v_is_admin then
    raise exception 'This facility is locked -- it can only be edited while pending or rejected';
  end if;

  if p_payload ? 'facility_type' then
    select r.provider_type, r.kind into v_new_provider_type, v_new_kind
    from public._resolve_legacy_provider_type(p_payload->>'facility_type') r;
  end if;

  update public.providers
  set
    name = coalesce(p_payload->>'facility_name', name),
    kind = coalesce(v_new_kind, kind),
    provider_type = coalesce(v_new_provider_type, provider_type),
    contact_number = coalesce(p_payload->>'contact_number', contact_number),
    whatsapp_number = coalesce(p_payload->>'whatsapp_number', whatsapp_number),
    email = coalesce(p_payload->>'email', email),
    gps_address = coalesce(p_payload->>'gps_address', gps_address),
    street = coalesce(p_payload->>'street', street),
    post_code = coalesce(p_payload->>'post_code', post_code),
    area = coalesce(p_payload->>'area', area),
    district = coalesce(p_payload->>'district', district),
    region = coalesce((p_payload->>'region')::public.region_enum, region),
    media_urls = coalesce(p_payload->'media_urls', media_urls),
    services = coalesce(p_payload->'services', services),
    amenities = coalesce(p_payload->'amenities', amenities),
    business_hours = coalesce(p_payload->'business_hours', business_hours),
    accepts_nhis = coalesce((p_payload->>'accepts_nhis')::boolean, accepts_nhis),
    latitude = coalesce((p_payload->>'latitude')::double precision, latitude),
    longitude = coalesce((p_payload->>'longitude')::double precision, longitude),
    status = case when v_current_status = 'rejected' then 'pending'::facility_status_enum else status end,
    updated_at = now()
  where id = p_facility_id;

  insert into public.provider_private (provider_id, owner_first_name, owner_last_name, owner_email, owner_phone, owner_position, status_reason)
  values (
    p_facility_id,
    p_payload->>'first_name', p_payload->>'last_name', p_payload->>'owner_email',
    p_payload->>'person_contact_number', p_payload->>'position',
    null
  )
  on conflict (provider_id) do update set
    owner_first_name = coalesce(excluded.owner_first_name, public.provider_private.owner_first_name),
    owner_last_name = coalesce(excluded.owner_last_name, public.provider_private.owner_last_name),
    owner_email = coalesce(excluded.owner_email, public.provider_private.owner_email),
    owner_phone = coalesce(excluded.owner_phone, public.provider_private.owner_phone),
    owner_position = coalesce(excluded.owner_position, public.provider_private.owner_position),
    status_reason = case when v_current_status = 'rejected' then null else public.provider_private.status_reason end,
    updated_at = now();
end;
$function$;
