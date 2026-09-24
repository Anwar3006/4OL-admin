-- P1-01 follow-up: the patient's own screens need to read the category back.
--
-- Without this, the enquiry list and detail screens keep showing "Searching
-- pharmacies" for an enquiry about tiger nuts — the exact bug this task exists
-- to fix, just on the other side of the round trip.
--
-- Both functions RETURN jsonb, so adding a key is purely additive: no signature
-- change, no PostgREST reload, and older clients ignore the extra key.
--
-- Why this is written as a programmatic patch rather than two full CREATE OR
-- REPLACE statements: neither function's text exists anywhere in migrations/
-- (this database has drifted from the folder), so re-typing ~120 lines of body
-- from pg_proc to change one line each would risk transcribing a bug into two
-- working functions. Instead the live body is read, one anchor is replaced, and
-- the result is re-created. The anchor count is asserted first, so if either
-- body has changed shape this migration FAILS LOUDLY instead of silently
-- creating an unchanged function.
--
-- Dry-run on prod in a rolled-back transaction, 23 Sept: both RPCs returned
-- enquiry_category = 'medicines' for the existing row.

do $patch$
declare
  src text; newsrc text; n int;
begin
  -- get_my_medication_enquiries()
  select prosrc into src from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
  where ns.nspname = 'public' and p.proname = 'get_my_medication_enquiries';
  if src is null then raise exception 'get_my_medication_enquiries() not found'; end if;
  n := (length(src) - length(replace(src, '''enquiry_type'', me.enquiry_type,', '')))
       / length('''enquiry_type'', me.enquiry_type,');
  if n <> 1 then
    raise exception 'get_my_medication_enquiries: anchor found % times, expected 1', n;
  end if;
  newsrc := replace(src, '''enquiry_type'', me.enquiry_type,',
    '''enquiry_type'', me.enquiry_type,' || chr(10)
    || '          ''enquiry_category'', me.enquiry_category,');
  execute format(
    'create or replace function public.get_my_medication_enquiries() returns jsonb '
    || 'language plpgsql stable security definer set search_path to ''public'' as %L',
    newsrc);

  -- get_medication_enquiry_detail(uuid)
  select prosrc into src from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
  where ns.nspname = 'public' and p.proname = 'get_medication_enquiry_detail';
  if src is null then raise exception 'get_medication_enquiry_detail() not found'; end if;
  n := (length(src) - length(replace(src, '''enquiry_type'', v_enq.enquiry_type,', '')))
       / length('''enquiry_type'', v_enq.enquiry_type,');
  if n <> 1 then
    raise exception 'get_medication_enquiry_detail: anchor found % times, expected 1', n;
  end if;
  newsrc := replace(src, '''enquiry_type'', v_enq.enquiry_type,',
    '''enquiry_type'', v_enq.enquiry_type,' || chr(10)
    || '    ''enquiry_category'', v_enq.enquiry_category,');
  execute format(
    'create or replace function public.get_medication_enquiry_detail(p_id uuid) returns jsonb '
    || 'language plpgsql stable security definer set search_path to ''public'' as %L',
    newsrc);
end $patch$;
