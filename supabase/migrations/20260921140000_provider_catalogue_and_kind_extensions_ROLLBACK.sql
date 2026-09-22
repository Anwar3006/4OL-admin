-- Rollback for 20260921140000_provider_catalogue_and_kind_extensions.sql
begin;

drop trigger if exists trg_log_provider_activity_catalogue on public.provider_catalogue_items;
drop trigger if exists trg_log_provider_activity_capabilities on public.provider_capabilities;
drop trigger if exists trg_log_provider_activity_credentials on public.provider_credentials;
drop trigger if exists trg_log_provider_activity_providers on public.providers;
drop function if exists public.fn_log_provider_activity();
drop table if exists public.provider_activity_log;

alter table public.ambulances drop column if exists operator_id;
alter table public.fitness_trainers drop column if exists provider_id;

drop table if exists public.provider_practitioner_details;
drop table if exists public.provider_vendor_details;

drop function if exists public.upsert_catalogue_item(uuid, uuid, jsonb);
drop trigger if exists trg_catalogue_item_publish_guard on public.provider_catalogue_items;
drop function if exists public.fn_catalogue_item_publish_guard();
drop table if exists public.provider_catalogue_items;

commit;
