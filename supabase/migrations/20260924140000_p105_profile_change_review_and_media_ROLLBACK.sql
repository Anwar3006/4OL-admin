drop policy if exists "vendor reads own catalogue images for replacement" on storage.objects;
drop policy if exists "provider manages own public media delete" on storage.objects;
drop policy if exists "provider manages own public media update" on storage.objects;
drop policy if exists "provider manages own public media select" on storage.objects;
drop policy if exists "provider manages own public media insert" on storage.objects;
drop function if exists public.owns_provider_media_folder(text);
-- Storage deliberately blocks SQL bucket deletion because it can leave
-- orphaned objects. Disable public access instead; the forward migration
-- restores the declared bucket settings on conflict.
update storage.buckets set public = false where id = 'provider-media';
drop function if exists public.review_provider_profile_change(uuid, text, text);
drop policy if exists "provider members read their profile change requests" on public.provider_profile_change_requests;

create or replace function public.update_my_provider(p_id uuid, p_patch jsonb)
returns void language plpgsql security definer set search_path to 'public' as $function$
begin
  if not public.is_provider_member(p_id, 'settings.manage') then raise exception 'Not your provider'; end if;
  update public.providers set
    name = coalesce(p_patch->>'name', name), description = coalesce(p_patch->>'description', description),
    business_hours = coalesce(p_patch->'business_hours', business_hours), delivery_settings = coalesce(p_patch->'delivery_settings', delivery_settings),
    contact_number = coalesce(p_patch->>'contact_number', contact_number), whatsapp_number = coalesce(p_patch->>'whatsapp_number', whatsapp_number),
    email = coalesce(p_patch->>'email', email), media_urls = coalesce(p_patch->'media_urls', media_urls),
    featured_image_url = coalesce(p_patch->>'featured_image_url', featured_image_url), amenities = coalesce(p_patch->'amenities', amenities),
    keywords = coalesce(p_patch->'keywords', keywords), updated_at = now() where id = p_id;
end;
$function$;
revoke all on function public.update_my_provider(uuid, jsonb) from public, anon;
grant execute on function public.update_my_provider(uuid, jsonb) to authenticated, service_role;

-- Restore the older RPC before dropping the queue it references. This makes
-- the rollback safe even if PostgreSQL records the PL/pgSQL body dependency.
drop table if exists public.provider_profile_change_requests;
