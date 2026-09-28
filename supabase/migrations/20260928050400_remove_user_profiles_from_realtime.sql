-- Do not stream raw profile records to dashboard browsers. The admin list is
-- deliberately served through the PHI-masking API and refreshes every 15s.
do $block$
begin
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_profiles'
  ) then
    alter publication supabase_realtime drop table public.user_profiles;
  end if;
end;
$block$;
