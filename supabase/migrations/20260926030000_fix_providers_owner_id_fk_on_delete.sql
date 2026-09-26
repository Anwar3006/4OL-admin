-- ============================================================================
-- Fix the providers.owner_id foreign-key ON DELETE contradiction
--         (HANDOVER-2026-09-25 §8, item 1)
-- ============================================================================
--
-- providers.owner_id is NOT NULL, but its foreign key to the user table was
-- created ON DELETE SET NULL. The two contradict: when an owner's user row is
-- deleted the FK tries to write NULL into a NOT NULL column, so the delete
-- fails with 23502 (not-null violation) instead of a clear FK error. The
-- intended "orphan the provider" behaviour of SET NULL is therefore
-- unreachable -- the FK action is dead code that only ever produces a
-- confusing error. HANDOVER §8 hit this while clearing accounts before launch:
-- "Test Home" had to be reassigned to another owner before its old owner could
-- be deleted.
--
-- This migration makes the constraint honest by switching it to
-- ON DELETE RESTRICT: a provider's owner cannot be deleted while the provider
-- still points at them. That is already the de-facto behaviour (the delete
-- fails today); RESTRICT makes it intentional and returns 23503 with a clear
-- message. owner_id stays NOT NULL and providers are never orphaned. The
-- provider must be reassigned or deleted first -- exactly the workflow §8 used.
--
-- DECISION: the alternative -- making owner_id nullable so a provider can be
-- orphaned -- is a larger data-model change (every owner_id reader, including
-- is_provider_member() and ~19 RLS policies, would need null handling) and was
-- NOT taken here. If the product wants orphanable providers, that is a
-- separate, deliberate migration.
--
-- The constraint is resolved DYNAMICALLY from pg_constraint because the
-- original facility_profile DDL predates the tracked migration tree, so its
-- name is not known statically here. The name survives the rename to
-- `providers` (Postgres does not rename constraints on table rename); the
-- referenced table/column are read from the catalog and preserved verbatim.
--
-- Idempotent: no-op if the FK is absent, if owner_id is nullable, or if the
-- action is already anything other than SET NULL.
--
-- *** MUST be dry-run on prod inside a rolled-back transaction before
-- applying, per the repo convention (HANDOVER-2026-09-25 §0). Watch the
-- RAISE NOTICE lines to confirm which constraint was found and changed. ***
-- ============================================================================

do $$
declare
  v_conname  text;
  v_reftbl   text;
  v_refcol   text;
  v_delttype text;
  v_notnull  boolean;
begin
  -- Precondition: owner_id must be NOT NULL, otherwise SET NULL is valid and
  -- there is no contradiction to fix.
  select a.attnotnull into v_notnull
  from pg_attribute a
  where a.attrelid = 'public.providers'::regclass
    and a.attname  = 'owner_id'
    and a.attnum   > 0;

  -- Find the single-column FK whose constrained column is owner_id, reading
  -- the referenced schema.table and column from the catalog.
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
    raise notice 'providers.owner_id: no single-column FK found -- nothing to do';
    return;
  end if;

  if v_delttype <> 'n' then
    raise notice 'providers.owner_id FK "%" is already ON DELETE % (not SET NULL) -- nothing to do',
      v_conname,
      case v_delttype
        when 'r' then 'RESTRICT' when 'c' then 'CASCADE'
        when 'a' then 'NO ACTION' when 'd' then 'SET DEFAULT'
        else v_delttype
      end;
    return;
  end if;

  if coalesce(v_notnull, false) = false then
    raise notice 'providers.owner_id is nullable -- ON DELETE SET NULL is valid; leaving FK "%" unchanged', v_conname;
    return;
  end if;

  -- SET NULL against a NOT NULL column: replace with RESTRICT, preserving the
  -- constraint name and the referenced table/column exactly.
  execute format('alter table public.providers drop constraint %I', v_conname);
  execute format(
    'alter table public.providers add constraint %I foreign key (owner_id) references %s(%I) on delete restrict',
    v_conname, v_reftbl, v_refcol);

  raise notice 'providers.owner_id FK "%" changed from ON DELETE SET NULL to ON DELETE RESTRICT (references %s(%s))',
    v_conname, v_reftbl, v_refcol;
end $$;
