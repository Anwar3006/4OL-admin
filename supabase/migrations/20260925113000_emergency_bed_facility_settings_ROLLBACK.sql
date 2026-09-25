drop function if exists public.set_emergency_bed_alert_settings(uuid, boolean, boolean);
drop function if exists public.get_my_emergency_bed_settings();
notify pgrst, 'reload schema';
