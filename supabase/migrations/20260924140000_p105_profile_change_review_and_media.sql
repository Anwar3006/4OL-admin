-- P1-05 · Provider profile review queue and owner-scoped public profile media.
-- Name changes are held for an administrator; type/kind remain admin-only and
-- therefore cannot be changed by this RPC. Other public profile fields apply
-- immediately. Profile images live separately from catalogue-images because
-- a catalogue manager must not automatically gain permission to alter the
-- business identity.

create table if not exists public.provider_profile_change_requests (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete restrict,
  requested_patch jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reviewer_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_profile_change_requests_name_only check (
    jsonb_typeof(requested_patch) = 'object'
    and requested_patch ? 'name'
    and jsonb_typeof(requested_patch -> 'name') = 'string'
    and requested_patch - 'name' = '{}'::jsonb
  )
);

create unique index if not exists provider_profile_change_one_pending
  on public.provider_profile_change_requests(provider_id)
  where status = 'pending';

alter table public.provider_profile_change_requests enable row level security;
revoke all on table public.provider_profile_change_requests from public, anon, authenticated;
grant select on table public.provider_profile_change_requests to authenticated, service_role;

create policy "provider members read their profile change requests"
  on public.provider_profile_change_requests for select to authenticated
  using (
    public.is_provider_member(provider_id, 'settings.manage')
    or (select public.is_app_admin())
  );

create or replace function public.update_my_provider(p_id uuid, p_patch jsonb)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_requested_name text;
  v_current_name text;
begin
  if not public.is_provider_member(p_id, 'settings.manage') then
    raise exception 'Not your provider' using errcode = '42501';
  end if;

  select name into v_current_name from public.providers where id = p_id;
  if v_current_name is null then
    raise exception 'Provider not found' using errcode = 'P0002';
  end if;

  if p_patch ? 'name' then
    v_requested_name := nullif(trim(p_patch ->> 'name'), '');
    if v_requested_name is null then
      raise exception 'Business name cannot be empty' using errcode = '22023';
    end if;
    if v_requested_name is distinct from v_current_name then
      insert into public.provider_profile_change_requests (provider_id, requested_by, requested_patch)
      values (p_id, (select auth.uid()), jsonb_build_object('name', v_requested_name))
      on conflict (provider_id) where status = 'pending'
      do update set requested_by = excluded.requested_by,
                    requested_patch = excluded.requested_patch,
                    updated_at = now();
    end if;
  end if;

  update public.providers
  set
    description = coalesce(p_patch->>'description', description),
    business_hours = coalesce(p_patch->'business_hours', business_hours),
    delivery_settings = coalesce(p_patch->'delivery_settings', delivery_settings),
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

create or replace function public.review_provider_profile_change(
  p_request_id uuid, p_decision text, p_note text default null)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_request public.provider_profile_change_requests%rowtype;
begin
  if not (select public.is_app_admin()) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected' using errcode = '22023';
  end if;
  select * into v_request from public.provider_profile_change_requests where id = p_request_id for update;
  if not found or v_request.status <> 'pending' then
    raise exception 'Profile change request is no longer pending' using errcode = 'P0002';
  end if;
  if p_decision = 'approved' then
    update public.providers set name = v_request.requested_patch ->> 'name', updated_at = now()
    where id = v_request.provider_id;
  end if;
  update public.provider_profile_change_requests
  set status = p_decision, reviewer_note = nullif(trim(p_note), ''),
      reviewed_by = (select auth.uid()), reviewed_at = now(), updated_at = now()
  where id = p_request_id;
end;
$function$;

revoke all on function public.update_my_provider(uuid, jsonb) from public, anon;
grant execute on function public.update_my_provider(uuid, jsonb) to authenticated, service_role;
revoke all on function public.review_provider_profile_change(uuid, text, text) from public, anon;
grant execute on function public.review_provider_profile_change(uuid, text, text) to authenticated, service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('provider-media', 'provider-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.owns_provider_media_folder(p_name text)
returns boolean language plpgsql stable security definer set search_path to '' as $function$
declare v_provider_id uuid;
begin
  if p_name !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[1-6]\.(jpg|png|webp)$' then return false; end if;
  v_provider_id := split_part(p_name, '/', 1)::uuid;
  return public.is_provider_member(v_provider_id, 'profile.edit');
exception when others then return false;
end;
$function$;

revoke all on function public.owns_provider_media_folder(text) from public;
grant execute on function public.owns_provider_media_folder(text) to authenticated;

create policy "provider manages own public media insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'provider-media' and public.owns_provider_media_folder(name));
create policy "provider manages own public media select" on storage.objects for select to authenticated
  using (bucket_id = 'provider-media' and public.owns_provider_media_folder(name));
create policy "provider manages own public media update" on storage.objects for update to authenticated
  using (bucket_id = 'provider-media' and public.owns_provider_media_folder(name))
  with check (bucket_id = 'provider-media' and public.owns_provider_media_folder(name));
create policy "provider manages own public media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'provider-media' and public.owns_provider_media_folder(name));

-- P1-04 uploads use upsert, which needs SELECT as well as INSERT and UPDATE.
create policy "vendor reads own catalogue images for replacement" on storage.objects for select to authenticated
  using (bucket_id = 'catalogue-images' and public.owns_catalogue_image_folder(name));
