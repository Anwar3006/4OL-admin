-- Keep the long-lived facility_profile contract intact, but decide public
-- visibility from provider_types.listing_entity rather than legacy kind.

create or replace view public.facility_profile as
select
  p.id,
  p.owner_id,
  p.provider_type as facility_type,
  p.name as facility_name,
  p.contact_number,
  p.whatsapp_number,
  p.email,
  p.media_urls,
  p.featured_image_url,
  p.gps_address,
  p.street,
  p.post_code,
  p.area,
  p.district,
  p.region,
  p.country,
  p.latitude,
  p.longitude,
  p.location,
  p.ownership,
  p.accepts_nhis,
  p.services,
  p.amenities,
  p.status,
  p.business_hours,
  p.keywords,
  p.avg_rating,
  p.created_at,
  p.approved_at,
  p.updated_at,
  p.is_top_rated,
  p.is_featured,
  p.submitted_by,
  p.approved_by,
  p.featured_order,
  p.view_count,
  p.rating_average,
  p.rating_count,
  p.subscription_tier,
  p.subscription_expires_at,
  p.top_rated_rank,
  p.top_rated_set_by,
  p.top_rated_set_at,
  p.feature_type,
  p.feature_start,
  p.feature_end,
  p.is_featured_paused,
  p.status_changed_at,
  p.kind,
  p.provider_type,
  p.verification_status,
  p.description,
  p.is_online_only
from public.providers p
where (
  p.status = 'active'
  and exists (
    select 1
    from public.provider_types pt
    where pt.key = p.provider_type
      and pt.listing_entity = 'business'
  )
)
or p.owner_id = (select auth.uid())
or (select public.is_app_admin());

notify pgrst, 'reload schema';
