-- P1-08b (2 of 2) · Swap the RPC guards from owner-only to membership
--
-- Eight functions carried `owner_id = auth.uid()` as their authorisation
-- check. Each becomes an `is_provider_member(...)` call with the permission
-- the action actually needs.
--
-- (The survey originally said nine. `issue_canary` was miscounted: it reads
-- `security_canaries.owner_id`, which is a USER's own canary token and has
-- nothing to do with providers. It is untouched.)
--
-- As with the policies, this is behaviour-identical while only owners exist —
-- the helper checks `providers.owner_id` first and independently.
--
-- Permission per function:
--   update_my_provider          settings.manage   (it writes delivery_settings,
--                                                  which sets what customers
--                                                  are charged, alongside the
--                                                  profile fields)
--   upsert_catalogue_item       catalogue.manage
--   submit_credential           profile.edit
--   get_vendor_orders           orders.view
--   get_vendor_enquiry_inbox    requests.quote
--   _vendor_order_guard         orders.fulfil
--   owns_delivery_proof_folder  orders.fulfil
--   get_my_provider_context     (none — it IS the membership list)

-- ─────────────────────────────────────────────────────────────────────────
-- Keep membership in step with ownership
--
-- P1-08a backfilled today's owners. Without this, a provider registered
-- tomorrow by the admin console's `registerProviderAccount()` would have an
-- owner and NO member row — which works (the helper's `owner_id` branch
-- covers it) but leaves the Staff screen showing an empty list and the
-- activity log with nobody to attribute the owner's own actions to.
--
-- Also fires on an ownership transfer, so the new owner becomes a member.
-- The OLD owner is deliberately left in place as a member rather than
-- removed: dropping them silently would destroy the audit trail of
-- everything they did, and whether they should keep access is a decision for
-- whoever transferred the business, not for a trigger.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.fn_sync_provider_owner_membership()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.owner_id is null then
    return new;
  end if;

  insert into public.provider_members
    (provider_id, user_id, role, status, accepted_at)
  values
    (new.id, new.owner_id, 'owner', 'active', now())
  on conflict (provider_id, user_id) do update
    set role = 'owner',
        status = 'active',
        accepted_at = coalesce(public.provider_members.accepted_at, now());

  return new;
end;
$function$;

revoke execute on function public.fn_sync_provider_owner_membership() from public, anon, authenticated;

drop trigger if exists trg_provider_owner_membership on public.providers;
create trigger trg_provider_owner_membership
  after insert or update of owner_id on public.providers
  for each row
  execute function public.fn_sync_provider_owner_membership();

-- ─────────────────────────────────────────────────────────────────────────
-- get_my_provider_context — now the membership list
--
-- DROP first: the return type gains three columns, and `CREATE OR REPLACE`
-- cannot change a function's result type.
--
-- The three new columns are what the Business app needs to render itself
-- correctly for a member: which role they hold here, which department they
-- are scoped to (null = whole business), and the permission keys that decide
-- which tabs and actions appear. Existing callers that select by name are
-- unaffected — this is additive.
--
-- `role` coalesces to 'owner' for the legal owner even if no member row
-- exists, so the `owner_id` branch of the helper and this function agree.
-- ─────────────────────────────────────────────────────────────────────────

drop function if exists public.get_my_provider_context();

create or replace function public.get_my_provider_context()
returns table(
  provider_id uuid,
  kind provider_kind,
  provider_type text,
  name text,
  capabilities text[],
  status facility_status_enum,
  verification_status text,
  tier text,
  has_beds boolean,
  role text,
  department_id uuid,
  department_name text,
  permissions text[]
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with mine as (
    select
      p.id,
      -- The legal owner always outranks a membership row.
      case when p.owner_id = (select auth.uid()) then 'owner'
           else m.role end as role,
      case when p.owner_id = (select auth.uid()) then null
           else m.department_id end as department_id
    from public.providers p
    left join public.provider_members m
      on m.provider_id = p.id
     and m.user_id = (select auth.uid())
     and m.status = 'active'
    where p.owner_id = (select auth.uid())
       or m.id is not null
  )
  select
    p.id,
    p.kind,
    p.provider_type,
    p.name,
    coalesce(array_agg(distinct pc.capability)
             filter (where pc.capability is not null), '{}'),
    p.status,
    p.verification_status,
    p.subscription_tier,
    exists (select 1 from public.bed_tracker_facilities btf where btf.facility_id = p.id),
    mine.role,
    mine.department_id,
    d.name,
    coalesce(
      (select array_agg(rp.permission_key order by rp.permission_key)
       from public.provider_role_permissions rp
       where rp.role = mine.role),
      '{}'
    )
  from mine
  join public.providers p on p.id = mine.id
  left join public.provider_capabilities pc on pc.provider_id = p.id
  left join public.provider_departments d on d.id = mine.department_id
  group by p.id, mine.role, mine.department_id, d.name;
$function$;

revoke execute on function public.get_my_provider_context() from public, anon;
grant execute on function public.get_my_provider_context() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- The seven guard swaps. Each is a one-line change; the bodies are otherwise
-- reproduced exactly as they were live.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.update_my_provider(p_id uuid, p_patch jsonb)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_provider_member(p_id, 'settings.manage') then
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
  if not public.is_provider_member(p_provider_id, 'profile.edit') then
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
  return public.is_provider_member(v_id, 'orders.fulfil');
end;
$function$;

revoke execute on function public.owns_delivery_proof_folder(text) from public;
grant execute on function public.owns_delivery_proof_folder(text) to authenticated;

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
  if not public.is_provider_member(p_provider_id, 'catalogue.manage') then
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

-- The three vendor functions keep their `raise ... 42501` shape. Note the
-- guard moves from "are you the owner" to "may you do this here", but the
-- error stays 'Not authorized' so the app's existing handling is unchanged.
create or replace function public._vendor_order_guard(p_enquiry_id uuid, p_provider_id uuid)
returns medication_enquiries
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_enq public.medication_enquiries%rowtype;
begin
  if not public.is_provider_member(p_provider_id, 'orders.fulfil') then
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
  v_lat double precision;
  v_lng double precision;
begin
  if not public.is_provider_member(p_provider_id, 'orders.view') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select p.latitude, p.longitude into v_lat, v_lng
  from public.providers p where p.id = p_provider_id;

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
  v_lat double precision;
  v_lng double precision;
  v_kind public.provider_kind;
begin
  if not public.is_provider_member(p_provider_id, 'requests.quote') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select p.latitude, p.longitude, p.kind into v_lat, v_lng, v_kind
  from public.providers p where p.id = p_provider_id;

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
