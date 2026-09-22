-- =============================================================================
-- P0-10 finish: create_provider (admin/registrar) and update_my_provider
-- (owner) — the two RPCs PLAN.md lists that don't depend on provider_
-- capabilities. get_my_provider_context() is deferred to the P0-11 migration
-- batch because its capabilities[] column needs provider_capabilities, which
-- doesn't exist until then; writing it twice (once with a stub) isn't worth
-- it in the same session.
--
-- create_provider is the general, kind-first replacement PLAN.md says
-- register_facility_with_profile "replaces" — it takes kind/provider_type
-- directly (validated against provider_types) instead of the free-text
-- facility_type shim register_facility_with_profile still needs for its
-- existing callers. No app code calls create_provider yet: wiring
-- features/providers/api/register-account.ts to it (in place of
-- register_facility_with_profile) is application work, left for P0-14.
--
-- Address fields (street/post_code/area/district/gps_address/contact_number/
-- whatsapp_number) are still NOT NULL on providers, inherited unchanged from
-- facility_profile. is_online_only exists as a column but nothing relaxes
-- those constraints yet, so an online-only practitioner/trainer still needs
-- placeholder values for them today. Left alone deliberately: relaxing NOT
-- NULL on live columns is a product call (does a solo trainer really have no
-- address?) for whoever builds the P0-14 provider form, not a schema
-- decision to make silently in this migration.
-- =============================================================================

create or replace function public.create_provider(
  p_admin_id uuid,
  p_owner_id uuid,
  p_kind public.provider_kind,
  p_provider_type text,
  p_first_name text,
  p_last_name text,
  p_phone_number text,
  p_provider_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_provider_id uuid;
begin
  if auth.role() <> 'service_role' and not public.is_app_admin()
     and public.get_user_app_role() <> 'registrar' then
    raise exception 'Not authorized';
  end if;

  if not exists (select 1 from public.provider_types pt where pt.key = p_provider_type and pt.kind = p_kind) then
    raise exception 'provider_type % is not a % provider_types entry', p_provider_type, p_kind;
  end if;

  insert into public.providers (
    owner_id, name, kind, provider_type, contact_number, whatsapp_number,
    email, gps_address, street, post_code, area, district, region, country,
    featured_image_url, media_urls, services, amenities, business_hours,
    keywords, ownership, accepts_nhis, latitude, longitude, status, submitted_by,
    description, is_online_only
  )
  values (
    p_owner_id, (p_provider_data->>'name'), p_kind, p_provider_type,
    (p_provider_data->>'contact_number'), (p_provider_data->>'whatsapp_number'),
    (p_provider_data->>'email'), (p_provider_data->>'gps_address'), (p_provider_data->>'street'),
    (p_provider_data->>'post_code'), (p_provider_data->>'area'), (p_provider_data->>'district'),
    (p_provider_data->>'region')::public.region_enum, coalesce(p_provider_data->>'country', 'Ghana'),
    (p_provider_data->>'featured_image_url'),
    coalesce(p_provider_data->'media_urls', '[]'::jsonb),
    coalesce(p_provider_data->'services', '[]'::jsonb),
    coalesce(p_provider_data->'amenities', '[]'::jsonb),
    coalesce(p_provider_data->'business_hours', '[]'::jsonb),
    coalesce(p_provider_data->'keywords', '[]'::jsonb),
    (p_provider_data->>'ownership'), coalesce((p_provider_data->>'accepts_nhis')::boolean, false),
    (p_provider_data->>'latitude')::double precision, (p_provider_data->>'longitude')::double precision,
    'pending', p_admin_id,
    p_provider_data->>'description', coalesce((p_provider_data->>'is_online_only')::boolean, false)
  )
  returning id into v_provider_id;

  insert into public.provider_private (provider_id, owner_first_name, owner_last_name, owner_email, owner_phone, owner_position)
  values (v_provider_id, p_first_name, p_last_name, (p_provider_data->>'owner_email'), p_phone_number, (p_provider_data->>'owner_position'));

  insert into public.activity_logs (actor_id, action_type, target_table, record_id, new_data)
  values (p_admin_id::text, 'create_provider', 'providers', v_provider_id::text,
    jsonb_build_object('name', p_provider_data->>'name', 'kind', p_kind, 'provider_type', p_provider_type, 'owner_id', p_owner_id));

  return jsonb_build_object('id', v_provider_id, 'status', 'success');
end;
$function$;

revoke all on function public.create_provider(uuid, uuid, public.provider_kind, text, text, text, text, jsonb) from public, anon;
grant execute on function public.create_provider(uuid, uuid, public.provider_kind, text, text, text, text, jsonb) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- update_my_provider — the only write path owners get on their own row
-- (RLS on providers has no owner UPDATE policy). Allow-list per PLAN.md:
-- name, description, business_hours, contact_number, whatsapp_number, email,
-- media_urls, featured_image_url, amenities, keywords. Anything else in
-- p_patch is silently ignored (the function only ever reads these keys by
-- name) — status/kind/provider_type/featured/top-rated/tier/verification
-- stay admin-only by construction, not by a rejection check.
-- -----------------------------------------------------------------------------
create or replace function public.update_my_provider(p_id uuid, p_patch jsonb)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not exists (
    select 1 from public.providers where id = p_id and owner_id = (select auth.uid())
  ) then
    raise exception 'Not your provider';
  end if;

  update public.providers
  set
    name = coalesce(p_patch->>'name', name),
    description = coalesce(p_patch->>'description', description),
    business_hours = coalesce(p_patch->'business_hours', business_hours),
    contact_number = coalesce(p_patch->>'contact_number', contact_number),
    whatsapp_number = coalesce(p_patch->>'whatsapp_number', whatsapp_number),
    email = coalesce(p_patch->>'email', email),
    media_urls = coalesce(p_patch->'media_urls', media_urls),
    featured_image_url = coalesce(p_patch->>'featured_image_url', featured_image_url),
    amenities = coalesce(p_patch->'amenities', amenities),
    keywords = coalesce(p_patch->'keywords', keywords),
    updated_at = now()
  where id = p_id;
end;
$function$;

revoke all on function public.update_my_provider(uuid, jsonb) from public, anon;
grant execute on function public.update_my_provider(uuid, jsonb) to authenticated, service_role;
