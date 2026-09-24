-- P1-02 · Persist the catalogue item behind a quote and expose vendor-only
-- quote history for the Won/Lost request segments. Never expose patient PII.

alter table public.enquiry_responses
  add column if not exists catalogue_item_id uuid
  references public.provider_catalogue_items(id) on delete set null;

create index if not exists enquiry_responses_facility_status_idx
  on public.enquiry_responses(facility_id, status, responded_at desc);

create or replace function public.fn_enquiry_response_catalogue_guard()
returns trigger language plpgsql security definer set search_path to 'public'
as $function$
begin
  if new.catalogue_item_id is not null and not exists (
    select 1 from public.provider_catalogue_items ci
    where ci.id = new.catalogue_item_id and ci.provider_id = new.facility_id
  ) then
    raise exception 'Catalogue item does not belong to this provider' using errcode = '23503';
  end if;
  return new;
end;
$function$;
revoke execute on function public.fn_enquiry_response_catalogue_guard() from public, anon, authenticated;
drop trigger if exists trg_enquiry_response_catalogue_guard on public.enquiry_responses;
create trigger trg_enquiry_response_catalogue_guard before insert or update of catalogue_item_id, facility_id
on public.enquiry_responses for each row execute function public.fn_enquiry_response_catalogue_guard();

create or replace function public.get_vendor_enquiry_quote_history(p_provider_id uuid)
returns table(
  response_id uuid, enquiry_id uuid, medication_name text, quantity integer,
  unit text, enquiry_category text, fulfilment_mode text, price numeric,
  currency text, response_status text, responded_at timestamptz,
  catalogue_item_id uuid, catalogue_item_name text
)
language plpgsql security definer set search_path to 'public'
as $function$
begin
  if not public.is_provider_member(p_provider_id, 'requests.quote') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return query
  select er.id, me.id, me.medication_name, me.quantity, me.unit,
         me.enquiry_category, me.fulfilment_mode, er.price, er.currency,
         er.status, er.responded_at, er.catalogue_item_id, ci.name
  from public.enquiry_responses er
  join public.medication_enquiries me on me.id = er.enquiry_id
  left join public.provider_catalogue_items ci on ci.id = er.catalogue_item_id
  where er.facility_id = p_provider_id
    and er.status in ('offered', 'accepted', 'declined', 'expired')
  order by er.responded_at desc;
end;
$function$;

revoke execute on function public.get_vendor_enquiry_quote_history(uuid) from public, anon;
grant execute on function public.get_vendor_enquiry_quote_history(uuid) to authenticated;
notify pgrst, 'reload schema';
