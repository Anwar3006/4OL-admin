create or replace function public.get_public_professional_profile(p_provider_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return (
    with professional as (
      select
        p.*, pt.label as type_label,
        d.specialty as practitioner_specialty,
        d.years_experience as practitioner_years_experience,
        d.conditions_treated,
        d.consult_modes,
        d.home_visit_radius_km,
        d.languages,
        ft.bio as trainer_bio,
        ft.specialties as trainer_specialties,
        ft.certifications as trainer_certifications,
        ft.years_experience as trainer_years_experience,
        ft.profile_video_url,
        ft.social_links,
        hv.year_licensed,
        hv.verification_status as hcp_verification_status
      from public.providers p
      join public.provider_types pt
        on pt.key = p.provider_type and pt.listing_entity = 'person'
      left join public.provider_practitioner_details d on d.provider_id = p.id
      left join public.fitness_trainers ft on ft.provider_id = p.id
      left join public.hcp_verifications hv
        on hv.id = d.hcp_verification_id and hv.user_id = p.owner_id
      where p.id = p_provider_id and p.status = 'active'
    ),
    booking_stats as (
      select count(distinct b.patient_id)::integer as people_count
      from public.provider_bookings b
      join professional p on p.id = b.provider_id
      where b.status = 'completed'
    )
    select jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'kind', p.kind,
      'provider_type', p.provider_type,
      'type_label', p.type_label,
      'headline', coalesce(
        nullif(p.practitioner_specialty, ''),
        nullif(p.trainer_specialties[1], ''),
        p.type_label
      ),
      'photo', p.featured_image_url,
      'media', coalesce(p.media_urls, '[]'::jsonb),
      'about', coalesce(nullif(p.trainer_bio, ''), p.description),
      'business_hours', coalesce(p.business_hours, '[]'::jsonb),
      'is_online_only', p.is_online_only,
      'stats', jsonb_build_object(
        'people_count_bucket', case
          when bs.people_count >= 1000 then '1k+'
          when bs.people_count >= 500 then '500+'
          when bs.people_count >= 100 then '100+'
          when bs.people_count >= 50 then '50+'
          when bs.people_count >= 10 then '10+'
          else null
        end,
        'years_experience', coalesce(
          case when p.hcp_verification_status = 'verified'
            then greatest(0, extract(year from current_date)::integer - p.year_licensed + 1)
          end,
          p.practitioner_years_experience,
          p.trainer_years_experience
        ),
        'years_verified', p.hcp_verification_status = 'verified',
        'rating_average', p.rating_average,
        'rating_count', p.rating_count
      ),
      'conditions_treated', coalesce((
        select jsonb_agg(
          jsonb_build_object('id', c.id, 'name', c.name)
          order by array_position(p.conditions_treated, c.id)
        )
        from public.conditions c
        where c.id = any(coalesce(p.conditions_treated, '{}'::uuid[]))
      ), '[]'::jsonb),
      'specialties', coalesce(to_jsonb(p.trainer_specialties), '[]'::jsonb),
      'certifications', coalesce(to_jsonb(p.trainer_certifications), '[]'::jsonb),
      'languages', coalesce(to_jsonb(p.languages), '[]'::jsonb),
      'consult_modes', coalesce(to_jsonb(p.consult_modes), '[]'::jsonb),
      'home_visit_radius_km', p.home_visit_radius_km,
      'location', jsonb_build_object(
        'gps_address', p.gps_address,
        'street', p.street,
        'area', p.area,
        'district', p.district,
        'region', p.region,
        'latitude', p.latitude,
        'longitude', p.longitude
      ),
      'contact', jsonb_build_object(
        'phone', p.contact_number,
        'whatsapp', p.whatsapp_number
      ),
      'profile_video_url', p.profile_video_url,
      'social_links', coalesce(p.social_links, '{}'::jsonb),
      'programmes', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', fp.id,
          'title', fp.title,
          'difficulty_level', fp.difficulty_level,
          'duration_weeks', fp.duration_weeks,
          'is_premium', fp.is_premium
        ) order by fp.created_at desc)
        from public.fitness_plans fp
        where fp.author_id = p.owner_id
          and fp.author_type = 'trainer'
          and fp.status = 'published'
      ), '[]'::jsonb),
      'affiliations', coalesce((
        select jsonb_agg(jsonb_build_object(
          'provider_id', facility.id,
          'name', facility.name,
          'type_label', facility_type.label,
          'job_title', member.job_title
        ) order by facility.name)
        from public.provider_members member
        join public.providers facility
          on facility.id = member.provider_id and facility.status = 'active'
        join public.provider_types facility_type
          on facility_type.key = facility.provider_type
             and facility_type.listing_entity = 'business'
        where member.user_id = p.owner_id
          and member.status = 'active'
          and member.show_affiliation
      ), '[]'::jsonb)
    )
    from professional p
    cross join booking_stats bs
  );
end;
$$;

create or replace function public.get_provider_public_professionals(p_provider_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'listing_id', person.id,
      'name', person.name,
      'headline', coalesce(
        nullif(details.specialty, ''),
        nullif(trainer.specialties[1], ''),
        person_type.label
      ),
      'photo', person.featured_image_url,
      'rating_average', person.rating_average,
      'job_title', member.job_title
    )
    order by person.name
  ), '[]'::jsonb)
  from public.providers business
  join public.provider_types business_type
    on business_type.key = business.provider_type
       and business_type.listing_entity = 'business'
  join public.provider_members member
    on member.provider_id = business.id
       and member.status = 'active'
       and member.show_affiliation
  join public.providers person
    on person.owner_id = member.user_id and person.status = 'active'
  join public.provider_types person_type
    on person_type.key = person.provider_type
       and person_type.listing_entity = 'person'
  left join public.provider_practitioner_details details on details.provider_id = person.id
  left join public.fitness_trainers trainer on trainer.provider_id = person.id
  where business.id = p_provider_id and business.status = 'active';
$$;

create or replace function public.get_public_provider_reviews(
  p_provider_id uuid,
  p_limit integer default 20,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_limit not between 1 and 50 or p_offset < 0 then
    raise exception 'Invalid pagination' using errcode = '22023';
  end if;

  return (
    select jsonb_build_object(
      'summary', case when p_offset = 0 then jsonb_build_object(
        'average', provider.rating_average,
        'count', provider.rating_count,
        'distribution', jsonb_build_object(
          '1', count(*) filter (where review.rating = 1),
          '2', count(*) filter (where review.rating = 2),
          '3', count(*) filter (where review.rating = 3),
          '4', count(*) filter (where review.rating = 4),
          '5', count(*) filter (where review.rating = 5)
        )
      ) else null end,
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', page.id,
          'rating', page.rating,
          'comment_text', page.comment_text,
          'created_at', page.created_at,
          'is_verified_visit', page.is_verified_visit,
          'is_mine', page.user_id = (select auth.uid()),
          'reviewer', jsonb_build_object(
            'display_name', case
              when page.is_anonymous then 'Anonymous'
              when nullif(trim(coalesce(profile.first_name, '')), '') is null then 'Member'
              else trim(profile.first_name) ||
                case when nullif(trim(coalesce(profile.last_name, '')), '') is null
                  then ''
                  else ' ' || left(trim(profile.last_name), 1) || '.'
                end
            end,
            'avatar_url', case when page.is_anonymous then null else profile.avatar_url end
          ),
          'replies', coalesce((
            select jsonb_agg(jsonb_build_object(
              'id', reply.id,
              'comment_text', reply.comment_text,
              'created_at', reply.created_at
            ) order by reply.created_at)
            from public.facility_reviews reply
            where reply.parent_id = page.id
              and reply.is_provider_reply
              and reply.status = 'approved'
          ), '[]'::jsonb)
        ) order by page.created_at desc)
        from (
          select r.*
          from public.facility_reviews r
          where r.facility_id = provider.id
            and r.parent_id is null
            and r.status = 'approved'
          order by r.created_at desc
          limit p_limit offset p_offset
        ) page
        left join public.user_profiles profile on profile.user_id = page.user_id
      ), '[]'::jsonb)
    )
    from public.providers provider
    left join public.facility_reviews review
      on review.facility_id = provider.id
         and review.parent_id is null
         and review.status = 'approved'
    where provider.id = p_provider_id and provider.status = 'active'
    group by provider.id, provider.rating_average, provider.rating_count
  );
end;
$$;

revoke all on function public.get_public_professional_profile(uuid) from public, anon;
revoke all on function public.get_provider_public_professionals(uuid) from public, anon;
revoke all on function public.get_public_provider_reviews(uuid, integer, integer) from public, anon;
grant execute on function public.get_public_professional_profile(uuid) to authenticated, service_role;
grant execute on function public.get_provider_public_professionals(uuid) to authenticated, service_role;
grant execute on function public.get_public_provider_reviews(uuid, integer, integer) to authenticated, service_role;
notify pgrst, 'reload schema';
