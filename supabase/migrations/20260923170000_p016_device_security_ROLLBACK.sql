-- ROLLBACK for 20260923170000_p016_device_security.sql
--
-- `list_my_devices` is restored to the exact 0-arg body that was live on prod
-- before that migration, fetched with `pg_get_functiondef()` in the same
-- session — including its hard-coded `false AS is_current` and its lack of
-- any `app` filter.
--
-- Order matters: the 2-arg overload must be dropped BEFORE the 0-arg one is
-- recreated, or a no-argument `list_my_devices()` call becomes ambiguous
-- between the two (the 2-arg version is callable with no arguments through
-- its defaults) and every caller fails with 42725.

drop function if exists public.list_my_devices(text, text);
drop function if exists public.revoke_my_other_devices(text, text);

create or replace function public.list_my_devices()
returns table(
  id uuid,
  device_name text,
  platform text,
  os_version text,
  app_version text,
  last_seen_at timestamp with time zone,
  created_at timestamp with time zone,
  is_current boolean
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  SELECT t.id, t.device_name, t.platform, t.os_version, t.app_version,
         t.last_seen_at, t.created_at,
         false AS is_current
    FROM public.user_push_tokens t
   WHERE t.user_id = auth.uid()
   ORDER BY t.last_seen_at DESC;
$function$;

revoke execute on function public.list_my_devices() from public;
grant execute on function public.list_my_devices() to authenticated;

-- Restores the PUBLIC execute grant on register_push_token. Only do this if
-- something genuinely depended on it; no anon caller was ever evidenced.
grant execute on function public.register_push_token(text, text, text, text, text, text) to public;
