-- Restore P1-05's original null-coalescing cover behaviour.
create or replace function public.update_my_provider(p_id uuid, p_patch jsonb)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_requested_name text; v_current_name text;
begin
  if not public.is_provider_member(p_id, 'settings.manage') then raise exception 'Not your provider' using errcode = '42501'; end if;
  select name into v_current_name from public.providers where id = p_id;
  if v_current_name is null then raise exception 'Provider not found' using errcode = 'P0002'; end if;
  if p_patch ? 'name' then
    v_requested_name := nullif(trim(p_patch ->> 'name'), '');
    if v_requested_name is null then raise exception 'Business name cannot be empty' using errcode = '22023'; end if;
    if v_requested_name is distinct from v_current_name then
      insert into public.provider_profile_change_requests (provider_id, requested_by, requested_patch)
      values (p_id, (select auth.uid()), jsonb_build_object('name', v_requested_name))
      on conflict (provider_id) where status = 'pending'
      do update set requested_by = excluded.requested_by, requested_patch = excluded.requested_patch, updated_at = now();
    end if;
  end if;
  update public.providers set
    description = coalesce(p_patch->>'description', description), business_hours = coalesce(p_patch->'business_hours', business_hours),
    delivery_settings = coalesce(p_patch->'delivery_settings', delivery_settings), contact_number = coalesce(p_patch->>'contact_number', contact_number),
    whatsapp_number = coalesce(p_patch->>'whatsapp_number', whatsapp_number), email = coalesce(p_patch->>'email', email),
    media_urls = coalesce(p_patch->'media_urls', media_urls), featured_image_url = coalesce(p_patch->>'featured_image_url', featured_image_url),
    amenities = coalesce(p_patch->'amenities', amenities), keywords = coalesce(p_patch->'keywords', keywords), updated_at = now()
  where id = p_id;
end;
$function$;
revoke all on function public.update_my_provider(uuid, jsonb) from public, anon;
grant execute on function public.update_my_provider(uuid, jsonb) to authenticated, service_role;
