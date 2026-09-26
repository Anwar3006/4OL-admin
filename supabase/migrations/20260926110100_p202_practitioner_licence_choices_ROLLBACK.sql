revoke all on function public.get_my_practitioner_licence_choices(uuid) from authenticated, service_role;
drop function if exists public.get_my_practitioner_licence_choices(uuid);
notify pgrst, 'reload schema';
