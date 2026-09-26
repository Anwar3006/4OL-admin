-- ============================================================================
-- ROLLBACK · fix_providers_owner_id_fk_on_delete
--         (reverses 20260926030000_fix_providers_owner_id_fk_on_delete.sql)
-- ============================================================================
--
-- Restores the providers.owner_id foreign key to ON DELETE SET NULL -- its
-- exact action before the forward migration. The constraint is re-resolved
-- dynamically and the change is applied ONLY if the action is currently
-- ON DELETE RESTRICT, so this is idempotent and cannot clobber an unrelated
-- action someone may have set afterwards.
--
-- This deliberately reinstates the NOT NULL / SET NULL contradiction described
-- in HANDOVER-2026-09-25 §8, because a rollback must return the schema to its
-- prior state, not to a different "improved" one.
-- ============================================================================

do $$
declare
  v_conname  text;
  v_reftbl   text;
  v_refcol   text;
  v_delttype text;
begin
  select c.conname,
         refn.nspname || '.' || refc.relname,
         ra.attname,
         c.confdeltype::text
    into v_conname, v_reftbl, v_refcol, v_delttype
  from pg_constraint c
  join pg_class      refc on refc.oid = c.confrelid
  join pg_namespace  refn on refn.oid = refc.relnamespace
  join pg_attribute  la   on la.attrelid = c.conrelid  and la.attnum = c.conkey[1]
  join pg_attribute  ra   on ra.attrelid = c.confrelid and ra.attnum = c.confkey[1]
  where c.conrelid = 'public.providers'::regclass
    and c.contype  = 'f'
    and array_length(c.conkey, 1) = 1
    and la.attname = 'owner_id';

  if v_conname is null then
    raise notice 'providers.owner_id: no single-column FK found -- nothing to roll back';
    return;
  end if;

  if v_delttype <> 'r' then
    raise notice 'providers.owner_id FK "%" is ON DELETE %, not RESTRICT -- leaving unchanged',
      v_conname,
      case v_delttype
        when 'n' then 'SET NULL' when 'c' then 'CASCADE'
        when 'a' then 'NO ACTION' when 'd' then 'SET DEFAULT'
        else v_delttype
      end;
    return;
  end if;

  execute format('alter table public.providers drop constraint %I', v_conname);
  execute format(
    'alter table public.providers add constraint %I foreign key (owner_id) references %s(%I) on delete set null',
    v_conname, v_reftbl, v_refcol);

  raise notice 'providers.owner_id FK "%" restored to ON DELETE SET NULL (references %s(%s))',
    v_conname, v_reftbl, v_refcol;
end $$;
