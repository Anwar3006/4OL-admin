-- Rollback for 20260923091000_p016_get_provider_home.sql
-- The function is new in that migration, so dropping it restores the prior
-- state exactly. Nothing read it before this migration existed.
drop function if exists public.get_provider_home(uuid, text);
