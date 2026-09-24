-- Rollback for 20260924002000_p101_drugs_rx_only_backfill.sql
--
-- ⚠ READ THIS FIRST. The backfill wrote a judgement into 1,328 rows, and this
-- file cannot tell those apart from rows a pharmacist has reviewed SINCE, because
-- the column records only the answer, not who gave it. Nulling by category will
-- therefore also discard any human review of those same categories.
--
-- If anyone has reviewed drugs since the backfill ran, export before rolling back:
--
--     select id, name, category, is_prescription_only
--     from public.drugs
--     where is_prescription_only is not null;
--
-- Rolling back the flag is almost never what you want: the column is nullable,
-- so leaving the values in place is harmless, and the only consumer treats NULL
-- as "not confirmed OTC" anyway. Prefer correcting individual rows.

update public.drugs set is_prescription_only = null
where category in ('Antibiotics', 'Antihypertensives & Cardiovascular',
                   'Antidiabetics', 'Antiretrovirals', 'Vitamins & Supplements');

-- search_drug_names(): drop the key again.
do $patch$
declare
  src text; newsrc text; n int;
  anchor text := ',' || chr(10) || '          ''is_prescription_only'', d.is_prescription_only';
begin
  select prosrc into src from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
  where ns.nspname = 'public' and p.proname = 'search_drug_names';
  if src is null then raise exception 'search_drug_names() not found'; end if;
  n := (length(src) - length(replace(src, anchor, ''))) / length(anchor);
  if n <> 1 then
    raise exception 'search_drug_names: rollback anchor found % times, expected 1', n;
  end if;
  newsrc := replace(src, anchor, '');
  execute format(
    'create or replace function public.search_drug_names(p_q text) returns jsonb '
    || 'language plpgsql stable security definer set search_path to ''public'' as %L',
    newsrc);
end $patch$;
