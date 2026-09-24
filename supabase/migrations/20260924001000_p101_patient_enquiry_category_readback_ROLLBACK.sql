-- Rollback for 20260924001000_p101_patient_enquiry_category_readback.sql
--
-- Removes the 'enquiry_category' key from both patient-facing jsonb payloads,
-- by the same read-patch-recreate route and with the same loud failure if the
-- anchor is not found exactly once. Safe to run before the main P1-01 rollback;
-- it must run BEFORE that one if you are rolling both back, because this leaves
-- the functions no longer referencing the column that one drops.

do $patch$
declare
  src text; newsrc text; n int; anchor text;
begin
  -- get_my_medication_enquiries()
  anchor := chr(10) || '          ''enquiry_category'', me.enquiry_category,';
  select prosrc into src from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
  where ns.nspname = 'public' and p.proname = 'get_my_medication_enquiries';
  if src is null then raise exception 'get_my_medication_enquiries() not found'; end if;
  n := (length(src) - length(replace(src, anchor, ''))) / length(anchor);
  if n <> 1 then
    raise exception 'get_my_medication_enquiries: rollback anchor found % times, expected 1', n;
  end if;
  newsrc := replace(src, anchor, '');
  execute format(
    'create or replace function public.get_my_medication_enquiries() returns jsonb '
    || 'language plpgsql stable security definer set search_path to ''public'' as %L',
    newsrc);

  -- get_medication_enquiry_detail(uuid)
  anchor := chr(10) || '    ''enquiry_category'', v_enq.enquiry_category,';
  select prosrc into src from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
  where ns.nspname = 'public' and p.proname = 'get_medication_enquiry_detail';
  if src is null then raise exception 'get_medication_enquiry_detail() not found'; end if;
  n := (length(src) - length(replace(src, anchor, ''))) / length(anchor);
  if n <> 1 then
    raise exception 'get_medication_enquiry_detail: rollback anchor found % times, expected 1', n;
  end if;
  newsrc := replace(src, anchor, '');
  execute format(
    'create or replace function public.get_medication_enquiry_detail(p_id uuid) returns jsonb '
    || 'language plpgsql stable security definer set search_path to ''public'' as %L',
    newsrc);
end $patch$;
