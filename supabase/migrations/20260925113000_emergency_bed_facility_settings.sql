-- Facility-side control surface for emergency bed alerts.

create or replace function public.get_my_emergency_bed_settings()
returns table(provider_id uuid, enabled boolean, sound_enabled boolean)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select p.id, p.emergency_bed_alerts_enabled, p.emergency_alert_sound_enabled
  from public.providers p
  where p.kind = 'care_facility'
    and public.is_provider_member(p.id, 'emergency.respond')
  order by p.created_at;
$function$;

create or replace function public.set_emergency_bed_alert_settings(
  p_provider_id uuid,
  p_enabled boolean,
  p_sound_enabled boolean
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_provider_member(p_provider_id, 'settings.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  update public.providers
     set emergency_bed_alerts_enabled = p_enabled,
         emergency_alert_sound_enabled = p_sound_enabled,
         updated_at = now()
   where id = p_provider_id
     and kind = 'care_facility';

  if not found then
    raise exception 'Care facility not found' using errcode = '22023';
  end if;
end;
$function$;

revoke all on function public.get_my_emergency_bed_settings() from public, anon;
revoke all on function public.set_emergency_bed_alert_settings(uuid, boolean, boolean) from public, anon;
grant execute on function public.get_my_emergency_bed_settings() to authenticated;
grant execute on function public.set_emergency_bed_alert_settings(uuid, boolean, boolean) to authenticated;

notify pgrst, 'reload schema';
