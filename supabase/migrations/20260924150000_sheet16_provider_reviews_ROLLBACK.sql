revoke all on function public.get_provider_reviews(uuid) from public, anon, authenticated, service_role;
drop function if exists public.get_provider_reviews(uuid);
