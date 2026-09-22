-- Rollback for 20260921090000_provider_lookup_tables.sql
drop table if exists public.provider_type_requirements;
drop table if exists public.credential_types;
drop table if exists public.capabilities;
drop table if exists public.provider_types;
drop type if exists public.provider_kind;
