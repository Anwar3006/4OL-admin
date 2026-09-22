-- Rollback for 20260921160000_p013_repoint_read_only_functions.sql
--
-- Written after the fact from bodies fetched directly off prod via
-- pg_get_functiondef() BEFORE that migration ran (cached during the P0-13
-- session, not reconstructed from migration history — several of these
-- functions predate any tracked migration in prod, so history alone
-- couldn't rebuild them faithfully). Restores every function to its exact
-- pre-P0-13 body, reading facility_profile again.
--
-- Apply this before rolling back 20260921100000_rename_providers_and_compat_
-- layer.sql (which still needs to exist for facility_profile to resolve).
-- If p013_search_top_rated_items_admin_only.sql was also applied, roll that
-- back FIRST — this file restores search_top_rated_items to the version
-- that already existed before P0-13 (no admin gate; that gate was added in
-- a separate, later migration, not this one).
--
-- Drops _map_legacy_facility_type_filter, which this migration created new.

drop function if exists public._map_legacy_facility_type_filter(text);

-- Rollback body for: admin_global_search
CREATE OR REPLACE FUNCTION public.admin_global_search(search_term text, result_limit integer DEFAULT 6)
 RETURNS TABLE(entity_type text, entity_id text, title text, subtitle text, href text, rank real)
 LANGUAGE sql
 STABLE
AS $function$
  with q as (
    select
      websearch_to_tsquery('english', search_term) as tsq,
      '%' || search_term || '%' as like_term,
      search_term as raw
  )
  (
    select 'condition', c.id::text, c.name,
           coalesce(c.specialist, 'Condition'),
           '/diseases?highlight=' || c.id::text,
           ts_rank(c.search_vector, q.tsq)::real
    from public.conditions c, q
    where c.status = 'published'
      and (c.search_vector @@ q.tsq or c.name ilike q.like_term)
    order by ts_rank(c.search_vector, q.tsq) desc
    limit result_limit
  )
  union all
  (
    select 'symptom', s.id::text, s.name,
           coalesce(s.specialist, 'Symptom'),
           '/symptoms?highlight=' || s.id::text,
           ts_rank(s.search_vector, q.tsq)::real
    from public.symptoms s, q
    where s.status = 'published'
      and (s.search_vector @@ q.tsq or s.name ilike q.like_term)
    order by ts_rank(s.search_vector, q.tsq) desc
    limit result_limit
  )
  union all
  (
    select 'facility', f.id::text, f.facility_name,
           coalesce(f.district, '') || ', ' || coalesce(f.region::text, ''),
           '/facilities?highlight=' || f.id::text,
           similarity(f.facility_name, q.raw)
    from public.facility_profile f, q
    where f.facility_name ilike q.like_term
    order by similarity(f.facility_name, q.raw) desc
    limit result_limit
  )
  union all
  (
    select 'user', up.user_id::text,
           trim(coalesce(up.first_name, '') || ' ' || coalesce(up.last_name, '')),
           coalesce(up.phone_number, ''),
           '/users?highlight=' || up.user_id::text,
           similarity(coalesce(up.first_name, '') || ' ' || coalesce(up.last_name, ''), q.raw)
    from public.user_profiles up, q
    where (up.first_name || ' ' || up.last_name) ilike q.like_term
       or up.phone_number ilike q.like_term
    order by similarity(coalesce(up.first_name, '') || ' ' || coalesce(up.last_name, ''), q.raw) desc
    limit result_limit
  )
  union all
  (
    select 'job', j.id::text, j.title,
           coalesce(j.location, ''),
           '/jobs?highlight=' || j.id::text,
           similarity(j.title, q.raw)
    from public.job_postings j, q
    where j.title ilike q.like_term
    order by similarity(j.title, q.raw) desc
    limit result_limit
  )
  union all
  (
    select 'faq', fq.id::text, fq.question,
           'FAQ',
           '/faq?highlight=' || fq.id::text,
           similarity(fq.question, q.raw)
    from public.faqs fq, q
    where fq.question ilike q.like_term
    order by similarity(fq.question, q.raw) desc
    limit result_limit
  )
  union all
  (
    select 'healthy_living', hl.id::text, hl.name,
           'Healthy Living',
           '/healthy_living?highlight=' || hl.id::text,
           similarity(hl.name, q.raw)
    from public.healthy_living_info hl, q
    where hl.status = 'published' and hl.name ilike q.like_term
    order by similarity(hl.name, q.raw) desc
    limit result_limit
  )
  union all
  (
    select 'exercise', fe.id::text, fe.exercise_name,
           coalesce(fe.category, 'Fitness'),
           '/fitness?highlight=' || fe.id::text,
           similarity(fe.exercise_name, q.raw)
    from public.fitness_exercises fe, q
    where fe.status = 'published' and fe.exercise_name ilike q.like_term
    order by similarity(fe.exercise_name, q.raw) desc
    limit result_limit
  );
$function$
;

-- Rollback body for: capture_daily_metrics
CREATE OR REPLACE FUNCTION public.capture_daily_metrics()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO platform_metrics_history (
    date,
    total_users,
    new_signups_today,
    daily_active_users,
    monthly_active_users,
    -- sticky_users_count, --- need to write the sql below
    male_count,
    female_count,
    total_facilities,
    facility_types
    -- active_medication_remainders,  ---table not created yet
    -- vitals_logged_count --- table not created yet
  )
VALUES (
  CURRENT_DATE,
  (SELECT count(*) FROM users),
  (SELECT count(*) FROM users WHERE created_at >= CURRENT_DATE), -- New Signups
  (SELECT count(*) FROM users WHERE last_active >= now() - interval '24 hours'),
  (SELECT count(*) FROM users WHERE last_active >= now() - interval '30 days'),
  (SELECT count(*) FROM users WHERE gender = 'male'),
  (SELECT count(*) FROM users WHERE gender = 'female'),
  (SELECT count(*) FROM facility_profile WHERE status = 'active'),
  (SELECT jsonb_object_agg(facility_type, count)
   FROM (SELECT facility_type, count(*) FROM facility_profile GROUP BY facility_type) AS t)
--   (SELECT count(*) FROM medication_reminders WHERE is_active = true),
--   (SELECT count(*) FROM health_logs WHERE created_at >= CURRENT_DATE) -- Engagement
)
  ON CONFLICT (date) DO UPDATE SET
    total_users = EXCLUDED.total_users,
    daily_active_users = EXCLUDED.daily_active_users,
    total_facilities = EXCLUDED.total_facilities,
    monthly_active_users = EXCLUDED.monthly_active_users,
    new_signups_today = EXCLUDED.new_signups_today,
    male_count = EXCLUDED.male_count,
    female_count = EXCLUDED.female_count,
    facility_types = EXCLUDED.facility_types;
END;
$function$
;

-- Rollback body for: get_admin_dashboard_stats
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    live_stats json;
    dau_trends json;
    mau_trends json;
    download_trends json;
    recent_activity json;
BEGIN
    -- 1. Live Stats (Current Platform Snapshot)
    -- Pulling current counts from primary tables and latest metrics history
    SELECT json_build_object(
        'total_facilities', (SELECT count(*) FROM public.facility_profile),
        'pending_facilities', (SELECT count(*) FROM public.facility_profile WHERE status = 'pending'),
        'total_users', (SELECT count(*) FROM public.user_profiles WHERE role != 'Super Admin'),
        'males_count', (SELECT count(*) FROM public.user_profiles WHERE sex = 'Male' AND role != 'super_admin'),
        'females_count', (SELECT count(*) FROM public.user_profiles WHERE sex = 'Female' AND role != 'super_admin'),
        'total_specialists', (SELECT count(DISTINCT specialist) FROM public.conditions WHERE specialist IS NOT NULL),
        'total_downloads', (SELECT COALESCE(SUM(app_store_count + play_store_count), 0) FROM public.download_stats),
        'total_online_users', (SELECT count(*) FROM public.user_profiles WHERE last_active >= (now() - interval '24 hours')),
        'total_medication_reminder_users', (SELECT count(DISTINCT user_id) FROM public.medication_reminders),
        'total_period_tracker_users', (SELECT count(*) FROM public.tracker_logs)
    ) INTO live_stats;

    -- 2. DAU Trends (Last 30 days) 
    -- Sourced from platform_metrics_history
    SELECT json_agg(t) INTO dau_trends
    FROM (
        SELECT 
            date, 
            daily_active_users as total,
            male_count as male,
            female_count as female
        FROM public.platform_metrics_history
        WHERE date >= (now() - interval '30 days')::date
        ORDER BY date ASC
    ) t;

    -- 3. MAU Trends (Last 12 months)
    -- Aggregated from platform_metrics_history by month
    SELECT json_agg(t) INTO mau_trends
    FROM (
        SELECT 
            to_char(date, 'YYYY-MM') as month, 
            MAX(monthly_active_users) as total,
            MAX(male_count) as male,
            MAX(female_count) as female
        FROM public.platform_metrics_history
        WHERE date >= (now() - interval '12 months')::date
        GROUP BY 1
        ORDER BY 1 ASC
    ) t;

    -- 4. Download Trends (Last 12 months)
    -- Sourced from download_stats
    SELECT json_agg(t) INTO download_trends
    FROM (
        SELECT 
            to_char(created_at, 'YYYY-MM') as month,
            SUM(COALESCE(play_store_count, 0)) as android,
            SUM(COALESCE(app_store_count, 0)) as ios
        FROM public.download_stats
        WHERE created_at >= (now() - interval '12 months')
        GROUP BY 1
        ORDER BY 1 ASC
    ) t;

    -- 5. Recent Activity
    -- Aligned with your activity_logs schema columns
    SELECT json_agg(a) INTO recent_activity
    FROM (
        SELECT 
            actor_name, 
            action_type, 
            target_table, 
            created_at 
        FROM public.activity_logs 
        ORDER BY created_at DESC 
        LIMIT 10
    ) a;

    RETURN json_build_object(
        'live', live_stats,
        'dau_trends', COALESCE(dau_trends, '[]'::json),
        'mau_trends', COALESCE(mau_trends, '[]'::json),
        'download_trends', COALESCE(download_trends, '[]'::json),
        'activity', COALESCE(recent_activity, '[]'::json)
    );
END;
$function$
;

-- Rollback body for: get_bedtracker_route_suggestions
CREATE OR REPLACE FUNCTION public.get_bedtracker_route_suggestions(p_pickup_gps text, p_ward_type text, p_limit integer DEFAULT 3)
 RETURNS TABLE(facility_id uuid, bed_tracker_facility_id uuid, facility_name text, region text, gps_coordinates text, available_beds integer, distance_km numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_pickup_lat double precision;
  v_pickup_lng double precision;
begin
  begin
    v_pickup_lat := split_part(p_pickup_gps, ',', 1)::double precision;
    v_pickup_lng := split_part(p_pickup_gps, ',', 2)::double precision;
  exception when others then
    raise exception 'Invalid pickup GPS — expected "lat,lng"';
  end;
  return query
  select
    f.id as facility_id,
    bf.id as bed_tracker_facility_id,
    f.facility_name,
    f.region,
    bf.gps_coordinates,
    w.available_beds,
    round(cast(
      6371 * 2 * asin(sqrt(
        power(sin(radians((split_part(bf.gps_coordinates, ',', 1)::double precision - v_pickup_lat) / 2)), 2) +
        cos(radians(v_pickup_lat)) *
        cos(radians(split_part(bf.gps_coordinates, ',', 1)::double precision)) *
        power(sin(radians((split_part(bf.gps_coordinates, ',', 2)::double precision - v_pickup_lng) / 2)), 2)
      )) as numeric), 1) as distance_km
  from public.bed_tracker_wards w
  join public.bed_tracker_facilities bf on bf.id = w.bed_tracker_facility_id
  join public.facility_profile f on f.id = bf.facility_id
  where w.ward_type = p_ward_type
    and w.available_beds > 0
    and bf.is_tracking_enabled
    and bf.gps_coordinates is not null
    and bf.gps_coordinates like '%,%'
  order by distance_km asc
  limit greatest(p_limit, 1);
end;
$function$
;

-- Rollback body for: get_dashboard_metrics
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
    live_stats json;
    historical_trends json;
    recent_activity json;
BEGIN
    -- 1. Grab Live Snapshot (Current state of the platform)
    SELECT json_build_object(
        'total_facilities', (SELECT count(*) FROM public.facility_profile),
        'pending_facilities', (SELECT count(*) FROM public.facility_profile WHERE status = 'pending'),
        'total_users', (SELECT count(*) FROM public.user_profiles),
        'active_users_24h', (SELECT count(*) FROM public.user_profiles WHERE last_active >= now() - interval '24 hours'),
        'active_reminders', (SELECT count(*) FROM public.medication_reminders WHERE is_enabled = true)
    ) INTO live_stats;

    -- 2. Grab Historical Trends (Last 30 Days from your history table)
    SELECT json_agg(t) INTO historical_trends
    FROM (
        SELECT 
            date, 
            total_users, 
            daily_active_users, 
            total_facilities,
            vitals_logged_count,
            symptoms_reported_count
        FROM public.platform_metrics_history
        ORDER BY date ASC
        LIMIT 30
    ) t;

    -- 3. Grab Recent Admin Activity (Last 10 entries)
    SELECT json_agg(a) INTO recent_activity
    FROM (
        SELECT 
            actor_name, 
            action_type, 
            target_table, 
            created_at 
        FROM public.activity_logs 
        ORDER BY created_at DESC 
        LIMIT 10
    ) a;

    -- 4. Return unified JSON object
    RETURN json_build_object(
        'live', live_stats,
        'trends', COALESCE(historical_trends, '[]'::json),
        'activity', COALESCE(recent_activity, '[]'::json)
    );
END;
$function$
;

-- Rollback body for: get_facilities_map
CREATE OR REPLACE FUNCTION public.get_facilities_map(minlng double precision, minlat double precision, maxlng double precision, maxlat double precision, zoom_level integer, p_facility_name text DEFAULT NULL::text, p_region text DEFAULT NULL::text, p_district text DEFAULT NULL::text, p_facility_type text DEFAULT NULL::text, p_status text DEFAULT 'active'::text, p_is_top_rated boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
    map_data    jsonb;
    fetch_limit int;
    v_uid       uuid := nullif(public.request_user_id(), '')::uuid;
    v_is_admin  boolean := auth.role() = 'service_role' or public.is_app_admin();
    v_status    text;
    v_name      text;
    v_area      float;
    v_row       public.map_rpc_throttle%rowtype;
begin
    if v_uid is null and auth.role() <> 'service_role' then
      raise exception 'Not authenticated';
    end if;
    if not v_is_admin and v_uid is not null then
      insert into public.map_rpc_throttle (user_id, window_start, request_count)
      values (v_uid, now(), 1)
      on conflict (user_id) do update
        set window_start = case
              when public.map_rpc_throttle.window_start <= now() - interval '60 seconds'
              then now() else public.map_rpc_throttle.window_start end,
            request_count = case
              when public.map_rpc_throttle.window_start <= now() - interval '60 seconds'
              then 1 else public.map_rpc_throttle.request_count + 1 end;
      select * into v_row from public.map_rpc_throttle where user_id = v_uid;
      if v_row.request_count > 40 then
        raise exception 'Map request rate limit exceeded — try again shortly';
      end if;
    end if;
    v_area := greatest(maxlng - minlng, 0) * greatest(maxlat - minlat, 0);
    if v_area > 100 then
      raise exception 'Requested map envelope too large';
    end if;
    if zoom_level < 10 then
        fetch_limit := 1000;
    else
        fetch_limit := 5000;
    end if;
    v_status := case when v_is_admin then coalesce(p_status, 'active') else 'active' end;
    v_name := case
      when p_facility_name is null then null
      else replace(replace(replace(trim(p_facility_name), '\', '\\'), '%', '\%'), '_', '\_')
    end;
    select jsonb_build_object(
        'type', 'FeatureCollection',
        'features', coalesce(jsonb_agg(features.feature), '[]'::jsonb)
    ) into map_data
    from (
        select jsonb_build_object(
            'type', 'Feature',
            'geometry', st_asgeojson(location)::jsonb,
            'properties', jsonb_build_object(
                'id',           id,
                'name',         facility_name,
                'type',         facility_type,
                'avgRating',    avg_rating,
                'status',       status,
                'region',       region,
                'district',     district
            )
        ) as feature
        from facility_profile
        where location && st_makeenvelope(minlng, minlat, maxlng, maxlat, 4326)
          and (v_name is null or facility_name ilike '%' || v_name || '%')
          and (p_region is null or region::text = p_region)
          and (p_district is null or district = p_district)
          and (p_facility_type is null or facility_type::text = p_facility_type)
          and status::text = v_status
          and (p_is_top_rated is null or is_top_rated = p_is_top_rated)
        limit fetch_limit
    ) features;
    return map_data;
end;
$function$
;

-- Rollback body for: get_facility_dashboard_metrics
CREATE OR REPLACE FUNCTION public.get_facility_dashboard_metrics(time_filter text DEFAULT '30'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  start_at timestamptz;
  review_total int;
  approved_review_total int;
  avg_rating numeric;
  top_rated_count int;
BEGIN
  start_at := CASE time_filter
    WHEN '7' THEN now() - interval '7 days'
    WHEN '30' THEN now() - interval '30 days'
    WHEN '90' THEN now() - interval '90 days'
    WHEN 'year' THEN date_trunc('year', now())
    ELSE now() - interval '30 days'
  END;

  SELECT
    count(*)::int,
    count(*) FILTER (WHERE status::text = 'approved')::int,
    round(avg(rating)::numeric, 1)
  INTO review_total, approved_review_total, avg_rating
  FROM public.facility_reviews
  WHERE created_at >= start_at;

  SELECT count(*)::int
  INTO top_rated_count
  FROM (
    SELECT facility_id
    FROM public.facility_reviews
    WHERE status::text = 'approved'
    GROUP BY facility_id
    HAVING avg(rating) >= 4
  ) rated_facilities;

  RETURN jsonb_build_object(
    'facilities', (
      SELECT jsonb_build_object(
        'total', count(*)::int,
        'active', count(*) FILTER (WHERE status::text = 'active')::int,
        'pending', count(*) FILTER (WHERE status::text = 'pending')::int,
        'rejected', count(*) FILTER (WHERE status::text = 'rejected')::int
      )
      FROM public.facility_profile
    ),
    'by_type', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('type', facility_type, 'count', count) ORDER BY count DESC, facility_type)
      FROM (
        SELECT facility_type, count(*)::int
        FROM public.facility_profile
        GROUP BY facility_type
      ) type_counts
    ), '[]'::jsonb),
    'by_region', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('region', region::text, 'count', count) ORDER BY count DESC, region::text)
      FROM (
        SELECT region, count(*)::int
        FROM public.facility_profile
        GROUP BY region
      ) region_counts
    ), '[]'::jsonb),
    'reviews', jsonb_build_object(
      'total', COALESCE(review_total, 0),
      'approved', COALESCE(approved_review_total, 0),
      'average_rating', COALESCE(avg_rating, 0),
      'top_rated_count', COALESCE(top_rated_count, 0),
      'has_review_data', COALESCE(review_total, 0) > 0
    ),
    'favorites_total', (SELECT count(*)::int FROM public.facility_favorites),
    'active_offerings_total', (
      SELECT count(*)::int
      FROM public.facility_offerings
      WHERE is_active IS TRUE
    ),
    'deltas', jsonb_build_object(
      'facilities', public.count_created_at_delta('public.facility_profile', 'created_at', start_at, now()),
      'reviews', public.count_created_at_delta('public.facility_reviews', 'created_at', start_at, now())
    )
  );
END;
$function$
;

-- Rollback body for: get_job_details
CREATE OR REPLACE FUNCTION public.get_job_details(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_out jsonb;
  v_status text;
begin
  update public.job_postings
     set view_count = coalesce(view_count, 0) + 1
   where id = p_id;
  select app.status into v_status
    from public.job_applications app
   where app.job_id = p_id and app.applicant_id = auth.uid()
   limit 1;
  select jsonb_build_object(
    'id', jp.id,
    'title', jp.title,
    'description', jp.description,
    'requirements', coalesce(jp.requirements, '{}'),
    'job_type', jp.job_type,
    'specialty', jp.specialty,
    'experience_level', jp.experience_level,
    'minimum_qualification', jp.minimum_qualification,
    'min_experience_years', jp.min_experience_years,
    'required_licence', jp.required_licence,
    'salary_min', jp.salary_min,
    'salary_max', jp.salary_max,
    'salary_currency', jp.salary_currency,
    'location', jp.location,
    'region', jp.region,
    'status', jp.status,
    'published_at', jp.published_at,
    'expires_at', jp.expires_at,
    'view_count', jp.view_count,
    'application_count', jp.application_count,
    'is_featured', jp.is_featured,
    'facility_name', fp.facility_name,
    'facility_type', fp.facility_type,
    'facility_region', fp.region,
    'facility_id', jp.facility_id,
    'my_application_status', v_status,
    'accepting', jp.status = 'published'
      and (jp.expires_at is null or jp.expires_at > now())
  ) into v_out
    from public.job_postings jp
    left join public.facility_profile fp on fp.id = jp.facility_id
   where jp.id = p_id;
  return coalesce(v_out, '{}'::jsonb);
exception when others then
  return '{}'::jsonb;
end;
$function$
;

-- Rollback body for: get_job_listings
CREATE OR REPLACE FUNCTION public.get_job_listings(p_search text DEFAULT NULL::text, p_type text DEFAULT NULL::text, p_region text DEFAULT NULL::text, p_specialty text DEFAULT NULL::text, p_limit integer DEFAULT 25, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 25), 50));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
  v_total integer;
  v_rows jsonb;
begin
  select count(*) into v_total
  from public.job_postings jp
  where jp.status = 'published'
    and (jp.expires_at is null or jp.expires_at > now())
    and (p_type is null or jp.job_type = p_type)
    and (p_region is null or jp.region = p_region)
    and (p_specialty is null or jp.specialty = p_specialty)
    and (
      p_search is null
      or jp.title ilike '%' || p_search || '%'
      or jp.description ilike '%' || p_search || '%'
      or jp.specialty ilike '%' || p_search || '%'
    );

  select coalesce(jsonb_agg(row_data), '[]'::jsonb) into v_rows
  from (
    select
      jsonb_build_object(
        'id', jp.id,
        'title', jp.title,
        'job_type', jp.job_type,
        'specialty', jp.specialty,
        'region', jp.region,
        'location', jp.location,
        'salary_min', jp.salary_min,
        'salary_max', jp.salary_max,
        'salary_currency', jp.salary_currency,
        'minimum_qualification', jp.minimum_qualification,
        'required_licence', jp.required_licence,
        'published_at', jp.published_at,
        'expires_at', jp.expires_at,
        'view_count', jp.view_count,
        'application_count', jp.application_count,
        'is_featured', jp.is_featured,
        'facility_name', fp.facility_name,
        'facility_type', fp.facility_type
      ) as row_data
    from public.job_postings jp
    left join public.facility_profile fp on fp.id = jp.facility_id
    where jp.status = 'published'
      and (jp.expires_at is null or jp.expires_at > now())
      and (p_type is null or jp.job_type = p_type)
      and (p_region is null or jp.region = p_region)
      and (p_specialty is null or jp.specialty = p_specialty)
      and (
        p_search is null
        or jp.title ilike '%' || p_search || '%'
        or jp.description ilike '%' || p_search || '%'
        or jp.specialty ilike '%' || p_search || '%'
      )
    order by jp.is_featured desc, jp.published_at desc nulls last
    limit v_limit offset v_offset
  ) s;

  return jsonb_build_object('total', v_total, 'postings', v_rows);
end;
$function$
;

-- Rollback body for: get_med_enquiry_overview
CREATE OR REPLACE FUNCTION public.get_med_enquiry_overview()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'kpis', jsonb_build_object(
      'total_enquiries_30d', (
        select count(*) from public.medication_enquiries
        where created_at >= now() - interval '30 days'),
      'new_this_week', (
        select count(*) from public.medication_enquiries
        where created_at >= now() - interval '7 days'),
      'pending_unmatched', (
        select count(*) from public.medication_enquiries
        where status = 'pending_match'),
      'escrow_active_count', (
        select count(*) from public.escrow_transactions
        where status = 'held'),
      'escrow_amount_held', (
        select coalesce(sum(amount), 0) from public.escrow_transactions
        where status = 'held'),
      'delivery_in_progress', (
        select count(*) from public.medication_enquiries
        where status = 'delivery_in_progress'),
      'open_disputes', (
        select count(*) from public.escrow_transactions
        where status = 'disputed'),
      'match_rate_pct', (
        select case when count(*) = 0 then 0
          else round(100.0 * count(*) filter (
                 where status in ('matched','in_escrow','pickup_ready',
                                  'delivery_in_progress','completed'))
               / count(*), 1)
        end
        from public.medication_enquiries
        where created_at >= now() - interval '30 days')
    ),
    'pharmacy_performance', (
      select coalesce(jsonb_agg(t.row_json), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'responder_kind', er.responder_kind,
          'pharmacy_id', er.facility_id,
          'pharmacy_name', coalesce(fp.facility_name, ib.business_name, 'Unknown'),
          'location', coalesce(nullif(fp.area || ' — ' || fp.region::text, ' — '), ib.city),
          'total_responses', count(er.id),
          'avg_response_minutes',
            coalesce(round(avg(extract(epoch from (er.responded_at - me.created_at)) / 60.0)), 0),
          'availability_rate',
            case when count(er.id) = 0 then 0
              else round(100.0 * count(er.id) filter (where er.available) / count(er.id), 1)
            end,
          'orders_fulfilled',
            count(er.id) filter (where er.status = 'accepted'),
          'rating', coalesce(fp.rating_average, 0),
          'active', coalesce(
            (select true from public.medication_enquiries me2
              where me2.pharmacy_id = er.facility_id limit 1), true)
        ) as row_json
        from public.enquiry_responses er
        join public.medication_enquiries me on me.id = er.enquiry_id
        left join public.facility_profile fp on fp.id = er.facility_id
        left join public.ibp ib on ib.id = er.ibp_id
        group by er.responder_kind, er.facility_id, er.ibp_id,
                 fp.facility_name, fp.area, fp.region, fp.rating_average,
                 ib.business_name, ib.city
        order by count(er.id) desc
        limit 50
      ) t
    )
  ) into result;
  return result;
exception
  when others then
    return jsonb_build_object('error', sqlerrm);
end;
$function$
;

-- Rollback body for: get_medication_enquiry_detail
CREATE OR REPLACE FUNCTION public.get_medication_enquiry_detail(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_enq public.medication_enquiries%rowtype;
  v_is_premium boolean;
  v_offer_limit int;
  v_total_offers int;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'auth');
  end if;
  select * into v_enq from public.medication_enquiries where id = p_id;
  if v_enq.id is null or v_enq.user_id <> v_uid then
    return jsonb_build_object('error', 'not_found');
  end if;
  select coalesce((public.get_my_entitlement() ->> 'is_premium')::boolean, false)
    into v_is_premium;
  v_offer_limit := case when v_is_premium then 25 else 3 end;
  select count(*) into v_total_offers
  from public.enquiry_responses er
  where er.enquiry_id = p_id
    and er.status in ('offered', 'accepted');
  return jsonb_build_object(
    'id', v_enq.id,
    'medication_name', v_enq.medication_name,
    'dosage', v_enq.dosage,
    'quantity', v_enq.quantity,
    'unit', v_enq.unit,
    'urgency', v_enq.urgency,
    'status', v_enq.status,
    'enquiry_type', v_enq.enquiry_type,
    'fulfilment_mode', v_enq.fulfilment_mode,
    'delivery_address', v_enq.delivery_address,
    'delivery_status', v_enq.delivery_status,
    'courier_name', v_enq.courier_name,
    'tracking_number', v_enq.tracking_number,
    'payment_amount', v_enq.payment_amount,
    'prescription_url', v_enq.prescription_url,
    'pickup_confirmation_code', v_enq.pickup_confirmation_code,
    'search_radius_km', v_enq.search_radius_km,
    'is_priority', v_enq.is_priority,
    'created_at', v_enq.created_at,
    'pharmacy_name', (
      select fp.facility_name from public.facility_profile fp
      where fp.id = v_enq.pharmacy_id),
    -- Source wrote "select er.available desc as sort_key", which is not
    -- valid SQL. Replaced with an explicit rank so the outer aggregate keeps
    -- the intended available-first / cheapest-first order.
    'offers', coalesce((
      select jsonb_agg(o.row_json order by o.rn)
      from (
        select row_number() over (
                 order by er.available desc, er.price asc nulls last, er.responded_at asc
               ) as rn,
          jsonb_build_object(
            'id', er.id,
            'price', er.price,
            'currency', er.currency,
            'available', er.available,
            'notes', er.notes,
            'status', er.status,
            'responder_kind', er.responder_kind,
            'responded_at', er.responded_at,
            'facility_name', coalesce(fp.facility_name, ib.business_name, 'Pharmacy'),
            'area', coalesce(fp.area, ib.city)
          ) as row_json
        from public.enquiry_responses er
        left join public.facility_profile fp on fp.id = er.facility_id
        left join public.ibp ib on ib.id = er.ibp_id
        where er.enquiry_id = p_id
          and er.status in ('offered', 'accepted')
        order by er.available desc, er.price asc nulls last, er.responded_at asc
        limit v_offer_limit
      ) o
    ), '[]'::jsonb),
    'total_offers', v_total_offers,
    'offers_hidden', greatest(v_total_offers - v_offer_limit, 0),
    'escrow', (
      select jsonb_build_object(
        'id', et.id,
        'amount', et.amount,
        'currency', et.currency,
        'status', et.status,
        'dispute_reason', et.dispute_reason,
        'dispute_raised_at', et.dispute_raised_at,
        'dispute_resolution', et.dispute_resolution)
      from public.escrow_transactions et
      where et.enquiry_id = p_id
      order by et.created_at desc limit 1),
    'price_history', case when v_is_premium then coalesce((
      select jsonb_agg(ph.row_json order by ph.day desc)
      from (
        select date_trunc('day', er.responded_at) as day,
          jsonb_build_object(
            'day', date_trunc('day', er.responded_at),
            'best_price', min(er.price)) as row_json
        from public.enquiry_responses er
        join public.medication_enquiries me2 on me2.id = er.enquiry_id
        where lower(me2.medication_name) = lower(v_enq.medication_name)
          and er.available and er.price is not null
        group by 1
        order by 1 desc
        limit 30
      ) ph
    ), '[]'::jsonb) else '[]'::jsonb end
  );
exception
  when others then
    return jsonb_build_object('error', sqlerrm);
end;
$function$
;

-- Rollback body for: get_my_applications
CREATE OR REPLACE FUNCTION public.get_my_applications()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(jsonb_agg(row_to_json(t) order by t.created_at desc), '[]'::jsonb)
  from (
    select a.id, a.job_id, a.status, a.created_at, a.is_boosted,
           jp.title as job_title, jp.job_type,
           coalesce(jp.region, fp.region::text) as region,
           fp.facility_name as facility_name,
           jp.expires_at
    from public.job_applications a
    join public.job_postings jp on jp.id = a.job_id
    left join public.facility_profile fp on fp.id = jp.facility_id
    where a.applicant_id = auth.uid()
  ) t;
$function$
;

-- Rollback body for: get_my_medication_enquiries
CREATE OR REPLACE FUNCTION public.get_my_medication_enquiries()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return '[]'::jsonb;
  end if;
  return coalesce((
    select jsonb_agg(t.row_json order by t.created_at desc)
    from (
      select me.created_at,
        jsonb_build_object(
          'id', me.id,
          'medication_name', me.medication_name,
          'dosage', me.dosage,
          'quantity', me.quantity,
          'unit', me.unit,
          'urgency', me.urgency,
          'status', me.status,
          'enquiry_type', me.enquiry_type,
          'fulfilment_mode', me.fulfilment_mode,
          'is_priority', me.is_priority,
          'created_at', me.created_at,
          'response_count', coalesce(rc.cnt, 0),
          'best_price', rc.best_price,
          'pharmacy_name', fp.facility_name
        ) as row_json
      from public.medication_enquiries me
      left join lateral (
        select count(*) as cnt,
               min(er.price) filter (where er.available) as best_price
        from public.enquiry_responses er
        where er.enquiry_id = me.id
      ) rc on true
      left join public.facility_profile fp on fp.id = me.pharmacy_id
      where me.user_id = v_uid
      order by me.created_at desc
      limit 50
    ) t
  ), '[]'::jsonb);
exception
  when others then
    return '[]'::jsonb;
end;
$function$
;

-- Rollback body for: get_platform_overview_metrics
CREATE OR REPLACE FUNCTION public.get_platform_overview_metrics(time_filter text DEFAULT '30'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  now_at timestamptz := now();
  start_at timestamptz;
  previous_start_at timestamptz;
  window_length interval;
begin
  if lower(coalesce(time_filter, '30')) in ('7', '7d', 'last_7_days') then
    start_at := now_at - interval '7 days';
  elsif lower(coalesce(time_filter, '30')) in ('90', '90d', 'last_90_days') then
    start_at := now_at - interval '90 days';
  elsif lower(coalesce(time_filter, '30')) in ('year', 'ytd', 'this_year') then
    start_at := date_trunc('year', now_at);
  else
    start_at := now_at - interval '30 days';
  end if;

  window_length := now_at - start_at;
  previous_start_at := start_at - window_length;

  return (
    with
      user_counts as (
        select
          count(*)::int as total,
          count(*) filter (where deleted_at is null)::int as active_records,
          count(*) filter (where status = 'active')::int as active,
          count(*) filter (where status = 'pending_verification')::int as pending_verification,
          count(*) filter (where created_at >= start_at)::int as current_period,
          count(*) filter (where created_at >= previous_start_at and created_at < start_at)::int as previous_period
        from user_profiles
      ),
      facility_counts as (
        select
          count(*)::int as total,
          count(*) filter (where status::text in ('approved', 'active'))::int as active,
          count(*) filter (where status::text = 'pending')::int as pending,
          count(*) filter (where status::text = 'rejected')::int as rejected,
          count(*) filter (where created_at >= start_at)::int as current_period,
          count(*) filter (where created_at >= previous_start_at and created_at < start_at)::int as previous_period
        from facility_profile
      ),
      content_counts as (
        select
          (select count(*)::int from conditions) as conditions,
          (select count(*)::int from symptoms) as symptoms,
          (select count(*)::int from categories) as categories,
          (select count(*)::int from healthy_living_info) as healthy_living,
          (select count(*)::int from faqs where status = 'published') as active_faqs
      ),
      fitness_counts as (
        select
          (select count(*)::int from public.fitness_member_ids()) as fitness_users,
          (select count(*)::int from fitness_user_assignments where status = 'active') as active_plans,
          (select count(*)::int from fitness_challenges where status::text in ('active', 'published', 'ongoing')) as live_challenges,
          (select count(*)::int from fitness_exercises where status = 'published') as exercise_library,
          (select count(*)::int from fitness_generated_workouts) as ai_generated_workouts
      ),
      queue_counts as (
        select
          (select count(*)::int from facility_profile where status::text = 'pending') as pending_facilities,
          (select count(*)::int from delete_account_requests where status = 'pending') as pending_delete_requests,
          (select count(*)::int from hcp_verifications where verification_status in ('pending', 'under_review')) as pending_hcp_verifications,
          (select count(*)::int from collector_submissions where status in ('pending', 'needs_review')) as pending_facility_scout_submissions,
          (select count(*)::int from bed_tracker_alerts where is_resolved = false) as active_bed_alerts,
          (select count(*)::int from security_threats where status::text in ('open', 'investigating')) as open_security_threats,
          (select count(*)::int from content_moderation_flags where status::text in ('pending', 'under_review', 'pending_review')) as pending_moderation_flags
      ),
      operational_counts as (
        select
          (select count(*)::int from notification_campaigns) as notification_campaigns,
          (select count(*)::int from notifications) as notifications,
          (select count(*)::int from hcp_verifications) as hcp_verifications,
          (select count(*)::int from hcp_verifications where verification_status = 'verified') as verified_hcps,
          (select count(*)::int from job_postings) as job_postings,
          (select count(*)::int from job_applications) as job_applications,
          (select count(*)::int from bed_tracker_facilities) as bedtracker_facilities,
          (select coalesce(sum(available_beds), 0)::int from bed_tracker_facilities) as available_beds,
          (select count(*)::int from collector_submissions) as facility_scout_submissions
      ),
      finance_counts as (
        select
          count(*)::int as transactions,
          coalesce(sum(amount) filter (where status = 'completed'), 0)::numeric as revenue,
          count(*) filter (where created_at >= start_at)::int as current_period,
          count(*) filter (where created_at >= previous_start_at and created_at < start_at)::int as previous_period
        from transaction_records
      ),
      subscription_counts as (
        select
          count(*)::int as subscriptions,
          count(*) filter (where status = 'active')::int as active_subscriptions,
          count(*) filter (where created_at >= start_at)::int as current_period,
          count(*) filter (where created_at >= previous_start_at and created_at < start_at)::int as previous_period
        from user_subscriptions
      ),
      ai_counts as (
        select
          count(*)::int as calls,
          count(*) filter (where created_at >= now_at - interval '1 day')::int as calls_last_24h,
          coalesce(sum(estimated_cost), 0)::numeric as estimated_cost,
          count(*) filter (where created_at >= start_at)::int as current_period,
          count(*) filter (where created_at >= previous_start_at and created_at < start_at)::int as previous_period
        from fitness_ai_calls
      ),
      regional_facilities as (
        select coalesce(
          jsonb_object_agg(region::text, total order by region::text),
          '{}'::jsonb
        ) as by_region
        from (
          select region, count(*)::int as total
          from facility_profile
          group by region
        ) grouped
      ),
      recent_activity as (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'id', id,
              'actor_name', actor_name,
              'action_type', action_type,
              'target_table', target_table,
              'record_id', record_id,
              'created_at', created_at
            )
            order by created_at desc
          ),
          '[]'::jsonb
        ) as rows
        from (
          select id, actor_name, action_type, target_table, record_id, created_at
          from activity_logs
          order by created_at desc
          limit 10
        ) activity
      )
    select jsonb_build_object(
      'time_filter', coalesce(time_filter, '30'),
      'window', jsonb_build_object(
        'start_at', start_at,
        'end_at', now_at,
        'previous_start_at', previous_start_at
      ),
      'kpis', jsonb_build_object(
        'total_users', user_counts.total,
        'facilities', facility_counts.total,
        'revenue_mtd', case when finance_counts.transactions = 0 then null else finance_counts.revenue end,
        'transactions', finance_counts.transactions,
        'ai_queries_last_24h', ai_counts.calls_last_24h,
        'premium_subscriptions', subscription_counts.active_subscriptions,
        'hcps', operational_counts.hcp_verifications,
        'security_score', null
      ),
      'deltas', jsonb_build_object(
        'users', jsonb_build_object(
          'current', user_counts.current_period,
          'previous', user_counts.previous_period,
          'percent', case when user_counts.previous_period = 0 then null else round(((user_counts.current_period - user_counts.previous_period)::numeric / user_counts.previous_period) * 100, 1) end
        ),
        'facilities', jsonb_build_object(
          'current', facility_counts.current_period,
          'previous', facility_counts.previous_period,
          'percent', case when facility_counts.previous_period = 0 then null else round(((facility_counts.current_period - facility_counts.previous_period)::numeric / facility_counts.previous_period) * 100, 1) end
        ),
        'transactions', jsonb_build_object(
          'current', finance_counts.current_period,
          'previous', finance_counts.previous_period,
          'percent', case when finance_counts.previous_period = 0 then null else round(((finance_counts.current_period - finance_counts.previous_period)::numeric / finance_counts.previous_period) * 100, 1) end
        ),
        'subscriptions', jsonb_build_object(
          'current', subscription_counts.current_period,
          'previous', subscription_counts.previous_period,
          'percent', case when subscription_counts.previous_period = 0 then null else round(((subscription_counts.current_period - subscription_counts.previous_period)::numeric / subscription_counts.previous_period) * 100, 1) end
        ),
        'ai_calls', jsonb_build_object(
          'current', ai_counts.current_period,
          'previous', ai_counts.previous_period,
          'percent', case when ai_counts.previous_period = 0 then null else round(((ai_counts.current_period - ai_counts.previous_period)::numeric / ai_counts.previous_period) * 100, 1) end
        )
      ),
      'users', to_jsonb(user_counts),
      'facilities', jsonb_build_object(
        'total', facility_counts.total,
        'active', facility_counts.active,
        'pending', facility_counts.pending,
        'rejected', facility_counts.rejected,
        'by_region', regional_facilities.by_region
      ),
      'content', to_jsonb(content_counts),
      'fitness', to_jsonb(fitness_counts),
      'queues', to_jsonb(queue_counts),
      'operations', to_jsonb(operational_counts),
      'finance', jsonb_build_object(
        'transactions', finance_counts.transactions,
        'revenue', case when finance_counts.transactions = 0 then null else finance_counts.revenue end,
        'revenue_status', case when finance_counts.transactions = 0 then 'awaiting_transaction_pipeline' else 'live' end
      ),
      'subscriptions', to_jsonb(subscription_counts),
      'ai', to_jsonb(ai_counts),
      'activity', recent_activity.rows,
      'unsupported', jsonb_build_object(
        'feature_usage', null,
        'security_score', null,
        'compliance_gra', null,
        'vat_filing_status', null,
        'push_delivery_rate', null,
        'user_region_distribution', null
      )
    )
    from user_counts, facility_counts, content_counts, fitness_counts,
      queue_counts, operational_counts, finance_counts, subscription_counts,
      ai_counts, regional_facilities, recent_activity
  );
end;
$function$
;

-- Rollback body for: get_registrar_trails
CREATE OR REPLACE FUNCTION public.get_registrar_trails(days_back integer DEFAULT 1)
 RETURNS TABLE(registrar_id uuid, trail jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.role() <> 'service_role'
     and not public.has_4ol_permission(auth.uid(), 'users.view') then
    raise exception 'Not authorized';
  end if;
  return query
  with footprint_points as (
    select
      cf.collector_id as user_id,
      jsonb_agg(
        jsonb_build_array(cf.longitude, cf.latitude) order by cf.created_at
      ) as coords
    from public.collector_footprints cf
    where cf.created_at >= now() - (coalesce(days_back, 1) || ' days')::interval
    group by cf.collector_id
    having count(*) >= 2
  ),
  facility_points as (
    select
      fp.submitted_by as user_id,
      jsonb_agg(
        jsonb_build_array(fp.longitude, fp.latitude) order by fp.created_at
      ) as coords
    from public.facility_profile fp
    where fp.submitted_by is not null
      and fp.created_at >= now() - (coalesce(days_back, 1) || ' days')::interval
    group by fp.submitted_by
    having count(*) >= 2
  )
  select
    u.user_id,
    jsonb_build_object('type', 'LineString', 'coordinates', u.coords)
  from (
    select user_id, coords from footprint_points
    union all
    select f.user_id, f.coords
    from facility_points f
    where not exists (select 1 from footprint_points fp where fp.user_id = f.user_id)
  ) u;
end;
$function$
;

-- Rollback body for: get_saved_jobs
CREATE OR REPLACE FUNCTION public.get_saved_jobs()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  return coalesce((
    select jsonb_agg(row_data order by saved desc)
    from (
      select
        js.created_at as saved,
        jsonb_build_object(
          'job_id', js.job_id,
          'saved_at', js.created_at,
          'title', jp.title,
          'job_type', jp.job_type,
          'region', jp.region,
          'facility_name', fp.facility_name,
          'still_open', jp.status = 'published'
            and (jp.expires_at is null or jp.expires_at > now())
        ) as row_data
      from public.job_saved js
      join public.job_postings jp on jp.id = js.job_id
      left join public.facility_profile fp on fp.id = jp.facility_id
      where js.user_id = auth.uid()
    ) rows
  ), '[]'::jsonb);
exception when others then
  return '[]'::jsonb;
end;
$function$
;

-- Rollback body for: global_search
CREATE OR REPLACE FUNCTION public.global_search(search_term text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$DECLARE
    results JSONB := '[]'::JSONB;
    keyword TEXT := '%' || search_term || '%';
BEGIN
    -- 1. Search conditions
    -- Note: 'about' and 'symptoms' are JSONB, so we cast to TEXT for ILIKE
    WITH condition_results AS (
        SELECT 
            id, 
            name, 
            'conditions' as table_name
        FROM conditions
        WHERE name ILIKE keyword
        LIMIT 5
    )
    SELECT results || jsonb_build_object(
        'table', 'conditions',
        'results', COALESCE(jsonb_agg(condition_results), '[]'::JSONB)
    ) INTO results
    FROM condition_results
    WHERE EXISTS (SELECT 1 FROM condition_results);

    -- 2. Search symptoms
    -- Note: 'about' is JSONB
    WITH symptom_results AS (
        SELECT 
            id, 
            name, 
            'symptoms' as table_name
        FROM symptoms
        WHERE name ILIKE keyword 
        LIMIT 5
    )
    SELECT results || jsonb_build_object(
        'table', 'symptoms',
        'results', COALESCE(jsonb_agg(symptom_results), '[]'::JSONB)
    ) INTO results
    FROM symptom_results
    WHERE EXISTS (SELECT 1 FROM symptom_results);

    -- 3. Search healthy_living_info
    -- Note: Schema uses 'description' (TEXT) and 'content_sections' (JSONB)
    WITH healthy_results AS (
        SELECT 
            id, 
            name, 
            'healthy_living' as table_name
        FROM healthy_living_info
        WHERE name ILIKE keyword 
        LIMIT 5
    )
    SELECT results || jsonb_build_object(
        'table', 'healthy_living',
        'results', COALESCE(jsonb_agg(healthy_results), '[]'::JSONB)
    ) INTO results
    FROM healthy_results
    WHERE EXISTS (SELECT 1 FROM healthy_results);

    -- 4. Search facility_profile
    -- Note: 'region' is an enum and 'keywords' is JSONB
    WITH facility_results AS (
        SELECT 
            id, 
            facility_name as name, 
            'facility_profile' as table_name,
            facility_type,
            area,
            region::TEXT as region
        FROM facility_profile
        WHERE facility_name ILIKE keyword 
           OR facility_type ILIKE keyword
           OR keywords::TEXT ILIKE keyword
        LIMIT 5
    )
    SELECT results || jsonb_build_object(
        'table', 'facility_profile',
        'results', COALESCE(jsonb_agg(facility_results), '[]'::JSONB)
    ) INTO results
    FROM facility_results
    WHERE EXISTS (SELECT 1 FROM facility_results);

    RETURN results;
END;$function$
;

-- Rollback body for: global_search_v2
CREATE OR REPLACE FUNCTION public.global_search_v2(p_search_term text, p_result_limit integer DEFAULT 12)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_term text := trim(coalesce(p_search_term, ''));
  v_escaped text;
  v_limit int := least(greatest(coalesce(p_result_limit, 12), 1), 30);
  v_per_entity int := 5;
  v_results jsonb;
  v_total int;
  v_uid uuid := nullif(public.request_user_id(), '')::uuid;
begin
  if char_length(v_term) < 2 then
    return jsonb_build_object('results', '[]'::jsonb, 'total', 0);
  end if;
  v_escaped := replace(replace(replace(v_term, '\', '\\'), '%', '\%'), '_', '\_');
  with ranked as (
    select 'conditions'::text as entity_type, c.id::text as id,
           c.name as title, c.slug as subtitle, c.image_url as image_url,
           greatest(
             ts_rank(to_tsvector('simple', coalesce(c.name, '')), plainto_tsquery('simple', v_term)),
             similarity(c.name, v_term)
           ) as rank
    from public.conditions c
    where c.name ilike '%' || v_escaped || '%'
       or similarity(c.name, v_term) > 0.2
    union all
    select 'symptoms', s.id::text, s.name, s.slug, s.image_url,
           greatest(
             ts_rank(to_tsvector('simple', coalesce(s.name, '')), plainto_tsquery('simple', v_term)),
             similarity(s.name, v_term)
           )
    from public.symptoms s
    where s.name ilike '%' || v_escaped || '%'
       or similarity(s.name, v_term) > 0.2
    union all
    select 'healthy_living', h.id::text, h.name, h.slug, h.image_url,
           greatest(
             ts_rank(to_tsvector('simple', coalesce(h.name, '')), plainto_tsquery('simple', v_term)),
             similarity(h.name, v_term)
           )
    from public.healthy_living_info h
    where (h.status is null or h.status = 'published')
      and (h.name ilike '%' || v_escaped || '%'
           or similarity(h.name, v_term) > 0.2)
    union all
    select 'facility_profile', f.id::text, f.facility_name, f.area, f.featured_image_url,
           greatest(
             ts_rank(to_tsvector('simple', coalesce(f.facility_name, '') || ' ' || coalesce(f.area, '')),
                     plainto_tsquery('simple', v_term)),
             similarity(f.facility_name, v_term)
           )
    from public.facility_profile f
    where lower(f.status::text) = 'active'
      and (f.facility_name ilike '%' || v_escaped || '%'
           or f.area ilike '%' || v_escaped || '%'
           or similarity(f.facility_name, v_term) > 0.2)
    union all
    select 'drugs', d.id::text, d.name, d.generic_name, null::text,
           greatest(
             ts_rank(to_tsvector('simple', coalesce(d.name, '') || ' ' || coalesce(d.generic_name, '')),
                     plainto_tsquery('simple', v_term)),
             similarity(d.name, v_term)
           )
    from public.drugs d
    where d.name ilike '%' || v_escaped || '%'
       or coalesce(d.generic_name, '') ilike '%' || v_escaped || '%'
       or similarity(d.name, v_term) > 0.2
  ),
  capped as (
    select r.*, row_number() over (partition by entity_type order by rank desc) as rn
    from ranked r
  ),
  final as (
    select * from capped
    where rn <= v_per_entity
    order by rank desc
    limit v_limit
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'entity_type', entity_type, 'id', id, 'title', title,
           'subtitle', subtitle, 'image_url', image_url, 'rank', rank
         ) order by rank desc), '[]'::jsonb),
         count(*)
  into v_results, v_total
  from final;
  begin
    insert into public.analytics_events (event_type, user_id, metadata)
    values (
      case when v_total = 0 then 'search_zero_results' else 'search_executed' end,
      v_uid,
      jsonb_build_object('term', left(v_term, 120), 'result_count', v_total, 'source', 'global_search_v2')
    );
  exception when others then
    null;
  end;
  return jsonb_build_object('results', coalesce(v_results, '[]'::jsonb), 'total', coalesce(v_total, 0));
end;
$function$
;

-- Rollback body for: notify_job_alert_matches
CREATE OR REPLACE FUNCTION public.notify_job_alert_matches()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_facility_lat double precision;
  v_facility_lng double precision;
  v_recipients jsonb;
begin
  select latitude, longitude into v_facility_lat, v_facility_lng
    from public.facility_profile
   where id = new.facility_id;

  with matches as (
    select ja.user_id
      from public.job_alerts ja
     where ja.is_active
       and (ja.regions = '{}' or new.region = any(ja.regions))
       and (ja.specialties = '{}' or new.specialty = any(ja.specialties))
       and (ja.job_types = '{}' or new.job_type = any(ja.job_types))
       and (
         ja.radius_km is null
         or ja.latitude is null or ja.longitude is null
         or v_facility_lat is null or v_facility_lng is null
         or (
           2 * 6371 * asin(sqrt(
             sin(radians(v_facility_lat - ja.latitude) / 2) ^ 2
             + cos(radians(ja.latitude)) * cos(radians(v_facility_lat))
               * sin(radians(v_facility_lng - ja.longitude) / 2) ^ 2
           ))
         ) <= ja.radius_km
       )
  ),
  newly_notified as (
    insert into public.job_alert_notifications (job_id, user_id)
    select new.id, m.user_id from matches m
    on conflict (job_id, user_id) do nothing
    returning user_id
  )
  select jsonb_agg(
    jsonb_build_object(
      'user_id', user_id,
      'title', 'New job matching your alert',
      'body', new.title,
      'type', 'job_alert_match',
      'metadata', jsonb_build_object('job_id', new.id),
      'channel_id', 'jobs-alerts'
    )
  )
  into v_recipients
  from newly_notified;

  if v_recipients is not null then
    perform public.dispatch_notification(v_recipients, null::uuid);
  end if;

  return new;
end;
$function$
;

-- Rollback body for: search_top_rated_items
CREATE OR REPLACE FUNCTION public.search_top_rated_items(p_table_name text, p_search_term text DEFAULT NULL::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 10)
 RETURNS TABLE(id uuid, title text, subtitle text, image_url text, rating_average numeric, rating_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_table_name = 'facility' then
    return query
      select
        fp.id,
        fp.facility_name as title,
        fp.area as subtitle,
        fp.featured_image_url as image_url,
        coalesce(fp.avg_rating, 0)::numeric as rating_average,
        0::int as rating_count
      from facility_profile fp
      where (fp.status is null or lower(fp.status::text) in ('active', 'approved', 'pending'))
        and (p_search_term is null or p_search_term = '' or
             fp.facility_name ilike '%' || p_search_term || '%' or
             fp.area ilike '%' || p_search_term || '%')
      order by fp.created_at desc
      limit p_limit offset (p_page - 1) * p_limit;

  elsif p_table_name = 'fitness_plan' then
    return query
      select
        fp.id,
        fp.title,
        fp.description as subtitle,
        null::text as image_url,
        coalesce(fp.average_rating, 0)::numeric as rating_average,
        coalesce(fp.rating_count, 0)::int as rating_count
      from fitness_plans fp
      where (p_search_term is null or p_search_term = '' or
             fp.title ilike '%' || p_search_term || '%' or
             fp.description ilike '%' || p_search_term || '%')
      order by fp.created_at desc
      limit p_limit offset (p_page - 1) * p_limit;

  elsif p_table_name = 'outdoor_route' then
    return query
      select
        fp.id,
        fp.name as title,
        fp.area as subtitle,
        (case when array_length(fp.image_urls, 1) > 0 then fp.image_urls[1] else null end) as image_url,
        null::numeric as rating_average,
        null::int as rating_count
      from fitness_outdoor_routes fp
      where (fp.is_active = true or fp.is_active is null)
        and (p_search_term is null or p_search_term = '' or
             fp.name ilike '%' || p_search_term || '%' or
             fp.area ilike '%' || p_search_term || '%' or
             fp.category ilike '%' || p_search_term || '%')
      order by fp.created_at desc
      limit p_limit offset (p_page - 1) * p_limit;

  elsif p_table_name = 'outdoor_event' then
    return query
      select
        fp.id,
        fp.title,
        fp.area as subtitle,
        null::text as image_url,
        null::numeric as rating_average,
        null::int as rating_count
      from fitness_outdoor_events fp
      where (p_search_term is null or p_search_term = '' or
             fp.title ilike '%' || p_search_term || '%' or
             fp.area ilike '%' || p_search_term || '%' or
             fp.description ilike '%' || p_search_term || '%')
      order by fp.created_at desc
      limit p_limit offset (p_page - 1) * p_limit;

  elsif p_table_name = 'challenge' then
    return query
      select
        fp.id,
        fp.title,
        fp.description as subtitle,
        fp.featured_image_url as image_url,
        null::numeric as rating_average,
        null::int as rating_count
      from fitness_challenges fp
      where (p_search_term is null or p_search_term = '' or
             fp.title ilike '%' || p_search_term || '%' or
             fp.description ilike '%' || p_search_term || '%')
      order by fp.created_at desc
      limit p_limit offset (p_page - 1) * p_limit;

  elsif p_table_name = 'exercise' then
    return query
      select
        fp.id,
        fp.exercise_name as title,
        fp.primary_muscle_group as subtitle,
        fp.thumbnail_url as image_url,
        null::numeric as rating_average,
        null::int as rating_count
      from fitness_exercises fp
      where fp.is_active = true
        and fp.status in ('published', 'draft')
        and (p_search_term is null or p_search_term = '' or
             fp.exercise_name ilike '%' || p_search_term || '%' or
             fp.primary_muscle_group ilike '%' || p_search_term || '%')
      order by fp.created_at desc
      limit p_limit offset (p_page - 1) * p_limit;

  else
    return;
  end if;
end;
$function$
;

-- Rollback body for: submit_medication_enquiry
CREATE OR REPLACE FUNCTION public.submit_medication_enquiry(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_is_premium boolean;
  v_active int;
  v_name text := nullif(trim(coalesce(p ->> 'medication_name', '')), '');
  v_urgency text := coalesce(nullif(trim(p ->> 'urgency'), ''), 'normal');
  v_type text := coalesce(nullif(trim(p ->> 'enquiry_type'), ''), 'otc');
  v_mode text := coalesce(nullif(trim(p ->> 'fulfilment_mode'), ''), 'pickup');
  v_area_mode text := coalesce(nullif(trim(p ->> 'search_area_mode'), ''), 'current');
  v_radius numeric := nullif(trim(coalesce(p ->> 'search_radius_km', '')), '')::numeric;
  v_qty int := coalesce(nullif(trim(coalesce(p ->> 'quantity', '')), '')::int, 1);
  v_notify boolean := coalesce((p ->> 'notify_on_availability')::boolean, true);
  v_region text;
  v_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'auth');
  end if;
  if v_name is null or length(v_name) < 2 then
    return jsonb_build_object('ok', false, 'error', 'name_required');
  end if;
  if v_urgency not in ('normal', 'urgent', 'emergency') then v_urgency := 'normal'; end if;
  if v_type not in ('with_rx', 'otc') then v_type := 'otc'; end if;
  if v_mode not in ('pickup', 'delivery') then v_mode := 'pickup'; end if;
  if v_area_mode not in ('current', 'custom') then v_area_mode := 'current'; end if;
  select coalesce((public.get_my_entitlement() ->> 'is_premium')::boolean, false)
    into v_is_premium;
  select count(*) into v_active
  from public.medication_enquiries
  where user_id = v_uid
    and status in ('pending_match', 'matched', 'in_escrow',
                   'pickup_ready', 'delivery_in_progress');
  if not v_is_premium and v_active >= 3 then
    return jsonb_build_object('ok', false, 'error', 'limit');
  end if;
  if v_radius is null or v_radius < 1 then v_radius := 5; end if;
  if v_radius > 20 then v_radius := 20; end if;
  if not v_is_premium and v_radius > 10 then v_radius := 10; end if;
  if v_mode = 'delivery' and not v_is_premium then
    v_mode := 'pickup';
  end if;
  insert into public.medication_enquiries (
    user_id, medication_name, dosage, quantity, unit, urgency, status,
    enquiry_type, fulfilment_mode, delivery_address, prescription_url,
    drug_id, search_radius_km, search_area_mode, custom_area,
    notify_on_availability, is_priority
  ) values (
    v_uid, v_name,
    nullif(trim(coalesce(p ->> 'dosage', '')), ''),
    v_qty,
    nullif(trim(coalesce(p ->> 'unit', '')), ''),
    v_urgency, 'pending_match',
    v_type, v_mode,
    nullif(trim(coalesce(p ->> 'delivery_address', '')), ''),
    nullif(trim(coalesce(p ->> 'prescription_url', '')), ''),
    nullif(p ->> 'drug_id', '')::uuid,
    v_radius, v_area_mode,
    nullif(trim(coalesce(p ->> 'custom_area', '')), ''),
    v_notify,
    v_is_premium and coalesce((p ->> 'is_priority')::boolean, true)
  )
  returning id into v_id;
  if v_is_premium and coalesce((p ->> 'is_priority')::boolean, true) then
    begin
      -- Source read user_profiles.id; the key on this database is user_id.
      -- The block is exception-guarded, so the original silently skipped the
      -- premium broadcast entirely.
      select region into v_region from public.user_profiles where user_id = v_uid;
      if v_area_mode = 'custom' then
        v_region := nullif(trim(coalesce(p ->> 'custom_area', '')), '');
      end if;
      insert into public.pharmacy_campaigns
        (pharmacy_id, title, description, campaign_type,
         target_regions, target_medications)
      select fp.id,
             'Availability request: ' || v_name,
             'A premium user is looking for ' || v_name ||
               coalesce(' ' || nullif(trim(coalesce(p ->> 'dosage', '')), ''), '') ||
               ' (qty ' || v_qty || '). Respond with price & availability in Medication Enquiry.',
             'med_enquiry_broadcast',
             case when v_region is not null then array[v_region] else '{}'::text[] end,
             array[v_name]
      from public.facility_profile fp
      where fp.facility_type::text ilike '%pharmacy%'
        and (v_region is null
             or fp.region::text = v_region
             or fp.area ilike '%' || v_region || '%')
      limit 25;
    exception when others then null;
    end;
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$function$
;

