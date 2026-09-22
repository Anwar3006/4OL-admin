-- Rollback for 20260921110000_provider_rpcs_create_and_update.sql
drop function if exists public.create_provider(uuid, uuid, public.provider_kind, text, text, text, text, jsonb);
drop function if exists public.update_my_provider(uuid, jsonb);
