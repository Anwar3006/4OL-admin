-- Daily retention cleanup:
--   1. activity_logs older than 7 days are deleted.
--   2. Orphaned images (storage objects no database row points at) are queued
--      in storage_cleanup_queue and the storage-cleanup Edge Function is
--      kicked to remove them through the Storage API (direct DELETE on
--      storage.objects is blocked by Supabase and would leave the files).
--
-- How "orphaned" is decided (find_orphaned_storage_images):
--   * Candidates: image/* objects in the public media buckets, inside a folder
--     (root files like logo.png are email/app assets, never touched), older
--     than p_min_age so an upload whose row hasn't been saved yet survives.
--   * An object is referenced if its file name (the last path segment, which
--     carries a random 4-char upload prefix) appears, raw or URL-encoded, in
--     ANY text/varchar/json/jsonb/text[] column of any public table, or in
--     auth.users.raw_user_meta_data. This matches paths, full public URLs and
--     images embedded in rich-text JSON alike. Log/queue tables are skipped:
--     a mention in an audit copy of a deleted row is not a live link.
--   * False "referenced" only keeps a file; false "orphaned" deletes one, so
--     every heuristic here errs toward keeping.
--
-- Safety valve: if more than half of the candidates come back orphaned the
-- run refuses to queue anything (something is wrong with the scan, e.g. a new
-- reference format), and says so in its result.
--
-- Measured on prod before applying (25 Sept 2026): 451 candidate images,
-- 103 orphaned (replaced condition images, deleted exercises' thumbnails,
-- old campaign art, test uploads); 12,851 of 13,760 activity_logs rows are
-- older than 7 days.
--
-- Rollback: 20260925160000_retention_cleanup_cron_ROLLBACK.sql

create or replace function public.find_orphaned_storage_images(
  p_buckets text[] default array['bucket4ol', 'provider-media', 'catalogue-images'],
  p_min_age interval default interval '7 days'
)
returns table (bucket_id text, name text, candidate_count bigint)
language plpgsql
set search_path = ''
as $$
declare
  c record;
begin
  create temp table if not exists _orphan_candidates (
    bucket_id  text,
    name       text,
    base       text,
    base_enc   text,
    referenced boolean not null default false
  ) on commit drop;
  truncate _orphan_candidates;

  insert into _orphan_candidates (bucket_id, name, base, base_enc)
  select o.bucket_id,
         o.name,
         regexp_replace(o.name, '^.*/', ''),
         replace(replace(replace(regexp_replace(o.name, '^.*/', ''),
           ' ', '%20'), '(', '%28'), ')', '%29')
  from storage.objects o
  where o.bucket_id = any (p_buckets)
    and o.name like '%/%'
    and o.name not like '%/.emptyFolderPlaceholder'
    and coalesce(o.metadata->>'mimetype', '') like 'image/%'
    and o.created_at < now() - p_min_age;

  for c in
    select n.nspname, cl.relname, a.attname
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class cl on cl.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = cl.relnamespace
    where n.nspname = 'public'
      and cl.relkind in ('r', 'p')
      and a.attnum > 0
      and not a.attisdropped
      and a.atttypid in ('text'::regtype, 'varchar'::regtype, 'json'::regtype,
                         'jsonb'::regtype, 'text[]'::regtype, 'varchar[]'::regtype)
      and cl.relname not in ('activity_logs', 'admin_activity_logs', 'admin_read_audit',
                             'provider_activity_log', 'ibp_activity_log',
                             'storage_cleanup_queue')
    union all
    select 'auth', 'users', 'raw_user_meta_data'
  loop
    exit when not exists (select 1 from _orphan_candidates oc where not oc.referenced);
    execute format(
      $q$update _orphan_candidates oc
           set referenced = true
          from (select distinct %1$I::text as v
                  from %2$I.%3$I
                 where %1$I is not null
                   and %1$I::text ~* '\.(png|jpe?g|webp|gif|heic|heif|svg|avif)') t
         where not oc.referenced
           and (strpos(t.v, oc.base) > 0 or strpos(t.v, oc.base_enc) > 0)$q$,
      c.attname, c.nspname, c.relname);
  end loop;

  return query
    select oc.bucket_id, oc.name, (select count(*) from _orphan_candidates)
    from _orphan_candidates oc
    where not oc.referenced;
end;
$$;

create or replace function public.run_retention_cleanup(p_dry_run boolean default false)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_log_cutoff   timestamptz := now() - interval '7 days';
  v_logs         bigint;
  v_candidates   bigint := 0;
  v_orphans      bigint := 0;
  v_queued       bigint := 0;
  v_skipped      text;
  v_request_id   bigint;
begin
  -- 1. Activity logs
  if p_dry_run then
    select count(*) into v_logs from public.activity_logs where created_at < v_log_cutoff;
  else
    delete from public.activity_logs where created_at < v_log_cutoff;
    get diagnostics v_logs = row_count;
  end if;

  -- 2. Orphaned images
  drop table if exists _orphans;
  create temp table _orphans on commit drop as
    select * from public.find_orphaned_storage_images();
  select count(*), coalesce(max(candidate_count), 0)
    into v_orphans, v_candidates
    from _orphans;

  if v_orphans > 0 and v_orphans * 2 > v_candidates then
    v_skipped := format('refused: %s of %s candidates orphaned (>50%%), scan needs review',
                        v_orphans, v_candidates);
  elsif v_orphans > 0 and not p_dry_run then
    -- 500 paths per queue row (Storage remove() accepts up to 1000); paths
    -- already waiting in the queue from a failed earlier run aren't re-added.
    with fresh as (
      select o.bucket_id, o.name,
             (row_number() over (partition by o.bucket_id order by o.name) - 1) / 500 as chunk
      from _orphans o
      where not exists (
        select 1 from public.storage_cleanup_queue q
        where q.bucket_name = o.bucket_id and q.file_paths ? o.name)
    ), ins as (
      insert into public.storage_cleanup_queue (bucket_name, file_paths)
      select bucket_id, jsonb_agg(name order by name)
      from fresh
      group by bucket_id, chunk
      returning jsonb_array_length(file_paths) as n
    )
    select coalesce(sum(n), 0) into v_queued from ins;
  end if;

  -- pg_net only sends after this transaction commits, so the function sees
  -- the rows queued above. Never wait on the response here (same-tx trap).
  if not p_dry_run and exists (select 1 from public.storage_cleanup_queue) then
    select net.http_post(
      url     := 'https://rhbbxttxnvcziyqzptqs.supabase.co/functions/v1/storage-cleanup',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets
                           where name = 'cron_function_shared_secret')),
      body    := '{}'::jsonb
    ) into v_request_id;
  end if;

  return jsonb_build_object(
    'dry_run', p_dry_run,
    'activity_logs_deleted', v_logs,
    'image_candidates', v_candidates,
    'images_orphaned', v_orphans,
    'images_queued', v_queued,
    'orphan_scan_skipped', v_skipped,
    'storage_cleanup_request_id', v_request_id
  );
end;
$$;

-- Both delete data; only the cron (postgres) and service role may run them.
revoke all on function public.find_orphaned_storage_images(text[], interval) from public, anon, authenticated;
revoke all on function public.run_retention_cleanup(boolean) from public, anon, authenticated;
grant execute on function public.find_orphaned_storage_images(text[], interval) to service_role;
grant execute on function public.run_retention_cleanup(boolean) to service_role;

-- 02:30 UTC daily, clear of the 00:00 / 03:00 jobs.
select cron.unschedule('retention-cleanup-daily')
where exists (select 1 from cron.job where jobname = 'retention-cleanup-daily');
select cron.schedule('retention-cleanup-daily', '30 2 * * *',
                     'select public.run_retention_cleanup()');
