-- ROLLBACK for 20260920140000_account_types_step2_finalize
-- Turns user_type back into an ordinary column (values preserved) and restores
-- the step-1 two-way sync. The dropped legacy columns come back EMPTY
-- (admin_role held one value, 'super_admin', already reflected in role).
begin;

alter table public.user_profiles add column user_type_tmp text;
update public.user_profiles set user_type_tmp = user_type;
alter table public.user_profiles drop column user_type;
alter table public.user_profiles rename column user_type_tmp to user_type;
alter table public.user_profiles alter column user_type set default 'customer';

do $$ begin
  create type public.admin_role as enum ('super_admin','admin','moderator','support','viewer');
exception when duplicate_object then null; end $$;
alter table public.user_profiles
  add column if not exists admin_role public.admin_role,
  add column if not exists is_admin boolean default false,
  add column if not exists admin_permissions jsonb default '[]'::jsonb;

commit;
-- Then re-run the "4. Two-way sync" and "5. Guard" sections of
-- 20260920130000_account_types_step1.sql to restore the step-1 functions.
