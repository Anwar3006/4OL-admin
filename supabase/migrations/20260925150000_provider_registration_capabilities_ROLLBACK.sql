drop function if exists public.get_my_provider_declared_capabilities(uuid);
drop function if exists public.set_my_provider_declared_capabilities(uuid, text[]);
drop function if exists public.capture_provider_registration_capabilities(uuid, text[], uuid, text);
drop table if exists public.provider_registration_capabilities;
notify pgrst, 'reload schema';
