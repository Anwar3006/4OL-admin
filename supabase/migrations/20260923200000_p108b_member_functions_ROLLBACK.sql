-- ROLLBACK for 20260923200000_p108b_member_functions.sql
--
-- Restores the `owner_id = auth.uid()` guards, read off prod with
-- `pg_get_functiondef()` before that migration ran.
--
-- ORDER. Run this BEFORE the policy rollback and before P1-08a's, since all
-- three drop things this file still needs. The full order to undo the phase:
--   1. this file
--   2. 20260923190000_p108b_member_policies_ROLLBACK.sql
--   3. 20260923180000_p108a_provider_members_and_departments_ROLLBACK.sql
--
-- `get_my_provider_context` must be DROPped before being recreated: this
-- restores the 9-column return type over the 13-column one, and CREATE OR
-- REPLACE cannot change a result type.
--
-- The Business app reads `role`, `department_id`, `department_name` and
-- `permissions` from that function once P1-08d ships. Rolling back removes
-- them, so roll the app back too or those fields read as undefined.

drop trigger if exists trg_provider_owner_membership on public.providers;
drop function if exists public.fn_sync_provider_owner_membership();

drop function if exists public.get_my_provider_context();

create or replace function public.get_my_provider_context()
returns table(provider_id uuid, kind provider_kind, provider_type text, name text,
  capabilities text[], status facility_status_enum, verification_status text,
  tier text, has_beds boolean)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    p.id,
    p.kind,
    p.provider_type,
    p.name,
    coalesce(array_agg(pc.capability) filter (where pc.capability is not null), '{}'),
    p.status,
    p.verification_status,
    p.subscription_tier,
    exists (select 1 from public.bed_tracker_facilities btf where btf.facility_id = p.id)
  from public.providers p
  left join public.provider_capabilities pc on pc.provider_id = p.id
  where p.owner_id = (select auth.uid())
  group by p.id;
$function$;

create or replace function public.update_my_provider(p_id uuid, p_patch jsonb)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not exists (
    select 1 from public.providers where id = p_id and owner_id = (select auth.uid())
  ) then
    raise exception 'Not your provider';
  end if;

  update public.providers
  set
    name = coalesce(p_patch->>'name', name),
    description = coalesce(p_patch->>'description', description),
    business_hours = coalesce(p_patch->'business_hours', business_hours),
    delivery_settings = coalesce(p_patch->'delivery_settings', delivery_settings),
    contact_number = coalesce(p_patch->>'contact_number', contact_number),
    whatsapp_number = coalesce(p_patch->>'whatsapp_number', whatsapp_number),
    email = coalesce(p_patch->>'email', email),
    media_urls = coalesce(p_patch->'media_urls', media_urls),
    featured_image_url = coalesce(p_patch->>'featured_image_url', featured_image_url),
    amenities = coalesce(p_patch->'amenities', amenities),
    keywords = coalesce(p_patch->'keywords', keywords),
    updated_at = now()
  where id = p_id;
end;
$function$;

create or replace function public.submit_credential(
  p_provider_id uuid, p_type text, p_number text, p_document_path text,
  p_issued date default null::date, p_expires date default null::date)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid;
begin
  if not exists (select 1 from public.providers where id = p_provider_id and owner_id = (select auth.uid())) then
    raise exception 'Not your provider';
  end if;
  if not exists (select 1 from public.credential_types where key = p_type) then
    raise exception 'Unknown credential type: %', p_type;
  end if;

  insert into public.provider_credentials (provider_id, credential_type, number, document_path, issued_at, expires_at, status)
  values (p_provider_id, p_type, p_number, p_document_path, p_issued, p_expires, 'pending')
  returning id into v_id;

  return v_id;
end;
$function$;

create or replace function public.owns_delivery_proof_folder(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_folder text;
  v_id uuid;
begin
  v_folder := (storage.foldername(p_name))[1];
  if v_folder is null then
    return false;
  end if;
  begin
    v_id := v_folder::uuid;
  exception when others then
    return false;
  end;
  return exists (
    select 1 from public.providers p
    where p.id = v_id and p.owner_id = (select auth.uid())
  );
end;
$function$;

create or replace function public._vendor_order_guard(p_enquiry_id uuid, p_provider_id uuid)
returns medication_enquiries
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_owner uuid;
  v_enq public.medication_enquiries%rowtype;
begin
  if v_uid is null then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select p.owner_id into v_owner
  from public.providers p where p.id = p_provider_id;

  if v_owner is null or v_owner <> v_uid then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select * into v_enq from public.medication_enquiries
  where id = p_enquiry_id and pharmacy_id = p_provider_id
  for update;

  if v_enq.id is null then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  return v_enq;
end;
$function$;

-- `upsert_catalogue_item`, `get_vendor_orders` and `get_vendor_enquiry_inbox`
-- differ from their originals ONLY in the guard, so each is restored by
-- putting the ownership check back. Their bodies are otherwise byte-identical
-- to what P1-08b shipped; re-paste from that migration if either is edited.
create or replace function public.get_vendor_orders(p_provider_id uuid)
returns table(enquiry_id uuid, medication_name text, dosage text, quantity integer,
  unit text, status text, fulfilment_mode text, delivery_status delivery_status,
  amount numeric, currency text, customer_name text, customer_phone text,
  delivery_address text, distance_km numeric, has_pickup_code boolean,
  created_at timestamp with time zone, updated_at timestamp with time zone)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_owner uuid;
  v_lat double precision;
  v_lng double precision;
begin
  if v_uid is null then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select p.owner_id, p.latitude, p.longitude
    into v_owner, v_lat, v_lng
  from public.providers p where p.id = p_provider_id;

  if v_owner is null or v_owner <> v_uid then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
  select
    me.id, me.medication_name, me.dosage, me.quantity, me.unit,
    me.status, me.fulfilment_mode, me.delivery_status,
    me.payment_amount, 'GHS'::text,
    nullif(trim(coalesce(up.first_name, '') || ' ' || coalesce(up.last_name, '')), ''),
    up.phone_number,
    me.delivery_address,
    case
      when v_lat is null or v_lng is null or me.delivery_gps is null then null
      else round(
        (6371 * acos(greatest(-1, least(1,
          cos(radians(v_lat))
          * cos(radians(split_part(me.delivery_gps, ',', 1)::double precision))
          * cos(radians(split_part(me.delivery_gps, ',', 2)::double precision) - radians(v_lng))
          + sin(radians(v_lat))
          * sin(radians(split_part(me.delivery_gps, ',', 1)::double precision))
        ))))::numeric, 1)
    end,
    (me.pickup_confirmation_code is not null),
    me.created_at, me.updated_at
  from public.medication_enquiries me
  left join public.user_profiles up on up.user_id = me.user_id
  where me.pharmacy_id = p_provider_id
    and me.status in ('matched','in_escrow','pickup_ready','delivery_in_progress','completed')
  order by
    case me.status
      when 'matched' then 0 when 'in_escrow' then 1
      when 'pickup_ready' then 2 when 'delivery_in_progress' then 3
      else 4 end,
    me.updated_at desc;
end;
$function$;

create or replace function public.get_vendor_enquiry_inbox(p_provider_id uuid)
returns table(enquiry_id uuid, medication_name text, dosage text, quantity integer,
  unit text, enquiry_type text, urgency text, fulfilment_mode text,
  distance_km numeric, created_at timestamp with time zone,
  expires_at timestamp with time zone, already_quoted boolean,
  my_response_id uuid, my_response_status text)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_owner uuid;
  v_lat double precision;
  v_lng double precision;
  v_kind public.provider_kind;
begin
  if v_uid is null then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select p.owner_id, p.latitude, p.longitude, p.kind
    into v_owner, v_lat, v_lng, v_kind
  from public.providers p where p.id = p_provider_id;

  if v_owner is null or v_owner <> v_uid then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if v_kind <> 'vendor' then
    return;
  end if;

  return query
  select
    me.id, me.medication_name, me.dosage, me.quantity, me.unit,
    me.enquiry_type, me.urgency, me.fulfilment_mode,
    case
      when v_lat is null or v_lng is null or me.delivery_gps is null then null
      else round(
        (6371 * acos(greatest(-1, least(1,
          cos(radians(v_lat))
          * cos(radians(split_part(me.delivery_gps, ',', 1)::double precision))
          * cos(radians(split_part(me.delivery_gps, ',', 2)::double precision) - radians(v_lng))
          + sin(radians(v_lat))
          * sin(radians(split_part(me.delivery_gps, ',', 1)::double precision))
        ))))::numeric, 1)
    end,
    me.created_at,
    me.created_at + interval '2 hours',
    (er.id is not null),
    er.id,
    er.status
  from public.medication_enquiries me
  left join public.enquiry_responses er
    on er.enquiry_id = me.id and er.facility_id = p_provider_id
  where me.status = 'pending_match'
    and (
      (me.enquiry_type = 'otc' and exists (
        select 1 from public.provider_capabilities pc
        where pc.provider_id = p_provider_id and pc.capability = 'otc_medicines'))
      or
      (me.enquiry_type = 'with_rx' and exists (
        select 1 from public.provider_capabilities pc
        where pc.provider_id = p_provider_id and pc.capability = 'rx_medicines'))
    )
  order by me.is_priority desc nulls last, me.created_at asc;
end;
$function$;

-- upsert_catalogue_item: guard restored, body unchanged from P1-08b.
create or replace function public.upsert_catalogue_item(p_id uuid, p_provider_id uuid, p_patch jsonb)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid;
  v_requires_review boolean := false;
  v_requested_status text;
  v_final_status text;
  v_capability text;
begin
  if not exists (select 1 from public.providers where id = p_provider_id and owner_id = (select auth.uid())) then
    raise exception 'Not your provider';
  end if;

  v_capability := coalesce(
    p_patch->>'capability_required',
    case when p_id is not null then (select capability_required from public.provider_catalogue_items where id = p_id and provider_id = p_provider_id) end
  );

  if v_capability is not null then
    select requires_item_review into v_requires_review from public.capabilities where key = v_capability;
  end if;

  v_requested_status := coalesce(p_patch->>'status', case when p_id is null then 'draft' else null end);
  v_final_status := case
    when v_requested_status = 'published' and coalesce(v_requires_review, false) then 'pending_review'
    else v_requested_status
  end;

  if p_id is null then
    insert into public.provider_catalogue_items (
      provider_id, item_type, name, description, category, capability_required,
      drug_id, regulatory_number, price, currency, unit, duration_minutes,
      stock_status, images, status
    ) values (
      p_provider_id, p_patch->>'item_type', p_patch->>'name', p_patch->>'description', p_patch->>'category',
      p_patch->>'capability_required', (p_patch->>'drug_id')::uuid, p_patch->>'regulatory_number',
      (p_patch->>'price')::numeric, coalesce(p_patch->>'currency', 'GHS'), p_patch->>'unit',
      (p_patch->>'duration_minutes')::int, coalesce(p_patch->>'stock_status', 'in_stock'),
      coalesce(p_patch->'images', '[]'::jsonb), coalesce(v_final_status, 'draft')
    )
    returning id into v_id;
  else
    update public.provider_catalogue_items
    set
      item_type = coalesce(p_patch->>'item_type', item_type),
      name = coalesce(p_patch->>'name', name),
      description = coalesce(p_patch->>'description', description),
      category = coalesce(p_patch->>'category', category),
      capability_required = coalesce(p_patch->>'capability_required', capability_required),
      drug_id = coalesce((p_patch->>'drug_id')::uuid, drug_id),
      regulatory_number = coalesce(p_patch->>'regulatory_number', regulatory_number),
      price = coalesce((p_patch->>'price')::numeric, price),
      currency = coalesce(p_patch->>'currency', currency),
      unit = coalesce(p_patch->>'unit', unit),
      duration_minutes = coalesce((p_patch->>'duration_minutes')::int, duration_minutes),
      stock_status = coalesce(p_patch->>'stock_status', stock_status),
      images = coalesce(p_patch->'images', images),
      status = coalesce(v_final_status, status),
      updated_at = now()
    where id = p_id and provider_id = p_provider_id
    returning id into v_id;

    if v_id is null then
      raise exception 'Catalogue item not found for this provider';
    end if;
  end if;

  return v_id;
end;
$function$;
