-- Follow-up to 20260918_consolidate_registrar_collector_tables.sql: renaming
-- a table doesn't rename its constraint/index names, so they were still
-- prefixed data_collectors_* after the rename. Renaming for consistency --
-- functionally identical, and these two FK names are exactly what PostgREST
-- embed hints in features/facility-scout/api/*.ts reference explicitly
-- (registrars has two FKs to user_profiles, so an unqualified embed is
-- ambiguous and fails).
alter index data_collectors_pkey rename to registrars_pkey;
alter index data_collectors_user_id_key rename to registrars_user_id_key;
alter index data_collectors_employee_id_key rename to registrars_employee_id_key;
alter table public.registrars rename constraint data_collectors_user_id_fkey to registrars_user_id_fkey;
alter table public.registrars rename constraint data_collectors_supervisor_id_fkey to registrars_supervisor_id_fkey;
