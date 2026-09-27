create or replace function public.search_directory(
  p_category text,
  p_type text default null,
  p_query text default null,
  p_consult_mode text default null,
  p_accepts_nhis boolean default null,
  p_lat float8 default null,
  p_lng float8 default null,
  p_radius_km numeric default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table(
  id uuid, name text, kind public.provider_kind, provider_type text,
  type_label text, type_icon text, listing_entity text, headline text,
  featured_image_url text, area text, region text, rating_average numeric,
  rating_count integer, distance_km numeric, is_online_only boolean,
  accepts_nhis boolean, consult_modes text[], is_verified boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_category not in ('health_facilities','health_professionals','fitness_wellness','pharmacies_shops','health_schools','ambulance') then
    raise exception 'Invalid directory category' using errcode = '22023';
  end if;
  if p_consult_mode is not null and p_consult_mode not in ('clinic','video','home') then
    raise exception 'Invalid consultation mode' using errcode = '22023';
  end if;
  if p_limit not between 1 and 50 or p_offset < 0 then
    raise exception 'Invalid pagination' using errcode = '22023';
  end if;
  if (p_lat is null) <> (p_lng is null) or p_radius_km is not null and (p_radius_km <= 0 or p_radius_km > 500) then
    raise exception 'Invalid location filter' using errcode = '22023';
  end if;

  return query
  with directory as (
    select
      p.id, p.name, p.kind, p.provider_type, pt.label, pt.icon, pt.listing_entity,
      coalesce(
        case when p.kind = 'practitioner' then nullif(d.specialty, '') end,
        case when p.provider_type = 'personal_trainer' then nullif(ft.specialties[1], '') end,
        pt.label
      ) as headline,
      p.featured_image_url, p.area, p.region::text, p.rating_average, p.rating_count,
      p.is_online_only, p.accepts_nhis, coalesce(d.consult_modes, '{}') as modes,
      p.verification_status = 'verified' as verified,
      case when p_lat is null or p_lng is null then null
        else round((6371 * 2 * asin(sqrt(
          power(sin(radians((p.latitude - p_lat) / 2)), 2) +
          cos(radians(p_lat)) * cos(radians(p.latitude)) *
          power(sin(radians((p.longitude - p_lng) / 2)), 2)
        )))::numeric, 1) end as km
    from public.providers p
    join public.provider_types pt on pt.key = p.provider_type
    left join public.provider_practitioner_details d on d.provider_id = p.id
    left join public.fitness_trainers ft on ft.provider_id = p.id
    where p.status = 'active' and pt.is_active and pt.is_listed
      and pt.directory_category = p_category
      and (p_type is null or p.provider_type = p_type)
      and (p_query is null or char_length(trim(p_query)) < 2
           or p.name ilike '%' || trim(p_query) || '%'
           or coalesce(d.specialty, '') ilike '%' || trim(p_query) || '%')
      and (p_accepts_nhis is null or p.accepts_nhis = p_accepts_nhis)
  )
  select dir.id, dir.name, dir.kind, dir.provider_type, dir.label, dir.icon, dir.listing_entity, dir.headline,
    dir.featured_image_url, dir.area, dir.region, dir.rating_average, dir.rating_count, dir.km,
    dir.is_online_only, dir.accepts_nhis, dir.modes, dir.verified
  from directory dir
  where (p_consult_mode is null
       or (p_consult_mode = 'video' and (dir.is_online_only or p_consult_mode = any(dir.modes)))
       or (p_consult_mode <> 'video' and p_consult_mode = any(dir.modes)))
    and (p_radius_km is null or dir.is_online_only or dir.km <= p_radius_km)
  order by dir.km nulls last, dir.rating_average desc, dir.rating_count desc, dir.name
  limit p_limit offset p_offset;
end;
$$;

revoke all on function public.search_directory(text, text, text, text, boolean, float8, float8, numeric, integer, integer) from public, anon;
grant execute on function public.search_directory(text, text, text, text, boolean, float8, float8, numeric, integer, integer) to authenticated, service_role;
notify pgrst, 'reload schema';
