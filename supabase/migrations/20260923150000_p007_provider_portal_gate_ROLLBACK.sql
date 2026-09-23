-- ROLLBACK for 20260923150000_p007_provider_portal_gate.sql
--
-- `update_my_provider` is restored to the body that was live on prod before
-- that migration ran, fetched with `pg_get_functiondef()` in the same session.
--
-- The `delivery_settings` column is dropped LAST, after the function that
-- references it has been replaced — dropping it first would leave
-- `update_my_provider` referencing a column that no longer exists.
--
-- Dropping the column destroys any settings vendors have saved. If that is
-- not wanted, comment out the `alter table` at the bottom: the column is
-- nullable and unreferenced once the function above is restored, so leaving
-- it in place costs nothing.

drop trigger if exists trg_guard_provider_portal_onboarding on public.onboarding_requests;
drop function if exists public.fn_guard_provider_portal_onboarding();
drop function if exists public.is_feature_enabled(text);

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

alter table public.providers drop column if exists delivery_settings;
