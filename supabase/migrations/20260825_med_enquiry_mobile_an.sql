-- =============================================================================
-- Gap Analysis Part AN — Medication Enquiry mobile rollout ("Find Medication")
-- =============================================================================
-- Builds the authenticated-user RPC layer on top of the EXISTING Part AB
-- schema (medication_enquiries + enquiry_responses + escrow_transactions)
-- so the consumer mobile app can submit enquiries, compare pharmacy offers,
-- accept an offer, cancel before escrow and raise escrow disputes.
--
-- Conventions (mirrors 20260824_jobs_mobile_am.sql, AM-D5):
--   * SECURITY DEFINER RPCs, identity from auth.uid() only — no user-id
--     parameters anywhere on this path.
--   * All mobile reads fail open: pre-migration the screens show empty
--     states instead of crashing.
--   * Free-tier limits (AN-D9): 3 active enquiries, radius <= 10 km,
--     top-3 offers visible, pickup only. Premium via get_my_entitlement().
--   * PM1 priority broadcast reuses pharmacy_campaigns exactly like the
--     admin /api/medenquiry/[id]/broadcast route.
--
-- Additive and re-runnable.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Priority flag (PM1)
-- -----------------------------------------------------------------------------
alter table public.medication_enquiries
  add column if not exists is_priority boolean not null default false;

comment on column public.medication_enquiries.is_priority is
  'Part AN PM1: premium enquiry auto-broadcast to region pharmacies on submit.';

-- -----------------------------------------------------------------------------
-- 1. Drug name autocomplete (AN-D3) — drugs catalog + aliases, active only
-- -----------------------------------------------------------------------------
create or replace function public.search_drug_names(p_q text)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_q text := lower(trim(coalesce(p_q, '')));
begin
  if length(v_q) < 2 then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(t.row_json order by t.name)
    from (
      select distinct on (d.id)
        lower(d.name) as name,
        jsonb_build_object(
          'id', d.id,
          'name', d.name,
          'generic_name', d.generic_name,
          'dosage_form', d.dosage_form,
          'strength', d.strength,
          'strength_unit', d.strength_unit,
          'availability', d.availability
        ) as row_json
      from public.drugs d
      left join public.drug_aliases a on a.drug_id = d.id
      where d.status = 'active'
        and (
          lower(d.name) like '%' || v_q || '%'
          or lower(coalesce(d.generic_name, '')) like '%' || v_q || '%'
          or lower(coalesce(a.alias, '')) like '%' || v_q || '%'
        )
      limit 10
    ) t
  ), '[]'::jsonb);
exception
  when others then
    return '[]'::jsonb;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Submit enquiry (mockup form F1-F8 -> medication_enquiries)
--    Urgency mapping (AN-D2): Low->normal, Medium->urgent, High->emergency
-- -----------------------------------------------------------------------------
create or replace function public.submit_medication_enquiry(p jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_premium boolean;
  v_active int;
  v_name text := nullif(trim(coalesce(p ->> 'medication_name', '')), '');
  v_urgency text := coalesce(nullif(trim(p ->> 'urgency'), ''), 'normal');
  v_type text := coalesce(nullif(trim(p ->> 'enquiry_type'), ''), 'otc');
  v_mode text := coalesce(nullif(trim(p ->> 'fulfilment_mode'), ''), 'pickup');
  v_area_mode text := coalesce(nullif(trim(p ->> 'search_area_mode'), ''), 'current');
  v_radius numeric := nullif(trim(coalesce(p ->> 'search_radius_km', '')), '')::numeric;
  v_qty int := coalesce(nullif(trim(coalesce(p ->> 'quantity', '')), '')::int, 1);
  v_notify boolean := coalesce((p ->> 'notify_on_availability')::boolean, true);
  v_region text;
  v_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'auth');
  end if;
  if v_name is null or length(v_name) < 2 then
    return jsonb_build_object('ok', false, 'error', 'name_required');
  end if;
  if v_urgency not in ('normal', 'urgent', 'emergency') then v_urgency := 'normal'; end if;
  if v_type not in ('with_rx', 'otc') then v_type := 'otc'; end if;
  if v_mode not in ('pickup', 'delivery') then v_mode := 'pickup'; end if;
  if v_area_mode not in ('current', 'custom') then v_area_mode := 'current'; end if;

  select coalesce((public.get_my_entitlement() ->> 'is_premium')::boolean, false)
    into v_is_premium;

  -- AN-D9: free tier keeps at most 3 concurrent active enquiries.
  select count(*) into v_active
  from public.medication_enquiries
  where user_id = v_uid
    and status in ('pending_match', 'matched', 'in_escrow',
                   'pickup_ready', 'delivery_in_progress');
  if not v_is_premium and v_active >= 3 then
    return jsonb_build_object('ok', false, 'error', 'limit');
  end if;

  -- Radius clamp (AN-D9/PM2): 1-20 km overall, free capped at 10 km.
  if v_radius is null or v_radius < 1 then v_radius := 5; end if;
  if v_radius > 20 then v_radius := 20; end if;
  if not v_is_premium and v_radius > 10 then v_radius := 10; end if;

  -- AN-D12: delivery fulfilment is premium-only in Part AN.
  if v_mode = 'delivery' and not v_is_premium then
    v_mode := 'pickup';
  end if;

  insert into public.medication_enquiries (
    user_id, medication_name, dosage, quantity, unit, urgency, status,
    enquiry_type, fulfilment_mode, delivery_address, prescription_url,
    drug_id, search_radius_km, search_area_mode, custom_area,
    notify_on_availability, is_priority
  ) values (
    v_uid, v_name,
    nullif(trim(coalesce(p ->> 'dosage', '')), ''),
    v_qty,
    nullif(trim(coalesce(p ->> 'unit', '')), ''),
    v_urgency, 'pending_match',
    v_type, v_mode,
    nullif(trim(coalesce(p ->> 'delivery_address', '')), ''),
    nullif(trim(coalesce(p ->> 'prescription_url', '')), ''),
    nullif(p ->> 'drug_id', '')::uuid,
    v_radius, v_area_mode,
    nullif(trim(coalesce(p ->> 'custom_area', '')), ''),
    v_notify,
    v_is_premium and coalesce((p ->> 'is_priority')::boolean, true)
  )
  returning id into v_id;

  -- PM1: premium enquiries broadcast to region pharmacies immediately,
  -- mirroring the admin /api/medenquiry/[id]/broadcast route.
  if v_is_premium and coalesce((p ->> 'is_priority')::boolean, true) then
    begin
      select region into v_region from public.user_profiles where id = v_uid;
      if v_area_mode = 'custom' then
        v_region := nullif(trim(coalesce(p ->> 'custom_area', '')), '');
      end if;

      insert into public.pharmacy_campaigns
        (pharmacy_id, title, description, campaign_type,
         target_regions, target_medications)
      select fp.id,
             'Availability request: ' || v_name,
             'A premium user is looking for ' || v_name ||
               coalesce(' ' || nullif(trim(coalesce(p ->> 'dosage', '')), ''), '') ||
               ' (qty ' || v_qty || '). Respond with price & availability in Medication Enquiry.',
             'med_enquiry_broadcast',
             case when v_region is not null then array[v_region] else '{}'::text[] end,
             array[v_name]
      from public.facility_profile fp
      where fp.facility_type ilike '%pharmacy%'
        and (v_region is null
             or fp.region = v_region
             or fp.area ilike '%' || v_region || '%')
      limit 25;
    exception when others then null; -- fail-open: broadcast is best-effort
    end;
  end if;

  return jsonb_build_object('ok', true, 'id', v_id);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. My enquiries list
-- -----------------------------------------------------------------------------
create or replace function public.get_my_medication_enquiries()
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(t.row_json order by t.created_at desc)
    from (
      select me.created_at,
        jsonb_build_object(
          'id', me.id,
          'medication_name', me.medication_name,
          'dosage', me.dosage,
          'quantity', me.quantity,
          'unit', me.unit,
          'urgency', me.urgency,
          'status', me.status,
          'enquiry_type', me.enquiry_type,
          'fulfilment_mode', me.fulfilment_mode,
          'is_priority', me.is_priority,
          'created_at', me.created_at,
          'response_count', coalesce(rc.cnt, 0),
          'best_price', rc.best_price,
          'pharmacy_name', fp.facility_name
        ) as row_json
      from public.medication_enquiries me
      left join lateral (
        select count(*) as cnt,
               min(er.price) filter (where er.available) as best_price
        from public.enquiry_responses er
        where er.enquiry_id = me.id
      ) rc on true
      left join public.facility_profile fp on fp.id = me.pharmacy_id
      where me.user_id = v_uid
      order by me.created_at desc
      limit 50
    ) t
  ), '[]'::jsonb);
exception
  when others then
    return '[]'::jsonb;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Enquiry detail + pharmacy offers (AN-D9: free sees top-3 offers;
--    PM3: premium sees all offers + best-price history for the medication)
-- -----------------------------------------------------------------------------
create or replace function public.get_medication_enquiry_detail(p_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_enq public.medication_enquiries%rowtype;
  v_is_premium boolean;
  v_offer_limit int;
  v_total_offers int;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'auth');
  end if;

  select * into v_enq from public.medication_enquiries where id = p_id;
  if v_enq.id is null or v_enq.user_id <> v_uid then
    return jsonb_build_object('error', 'not_found');
  end if;

  select coalesce((public.get_my_entitlement() ->> 'is_premium')::boolean, false)
    into v_is_premium;
  v_offer_limit := case when v_is_premium then 25 else 3 end;

  select count(*) into v_total_offers
  from public.enquiry_responses er
  where er.enquiry_id = p_id
    and er.status in ('offered', 'accepted');

  return jsonb_build_object(
    'id', v_enq.id,
    'medication_name', v_enq.medication_name,
    'dosage', v_enq.dosage,
    'quantity', v_enq.quantity,
    'unit', v_enq.unit,
    'urgency', v_enq.urgency,
    'status', v_enq.status,
    'enquiry_type', v_enq.enquiry_type,
    'fulfilment_mode', v_enq.fulfilment_mode,
    'delivery_address', v_enq.delivery_address,
    'delivery_status', v_enq.delivery_status,
    'courier_name', v_enq.courier_name,
    'tracking_number', v_enq.tracking_number,
    'payment_amount', v_enq.payment_amount,
    'prescription_url', v_enq.prescription_url,
    'pickup_confirmation_code', v_enq.pickup_confirmation_code,
    'search_radius_km', v_enq.search_radius_km,
    'is_priority', v_enq.is_priority,
    'created_at', v_enq.created_at,
    'pharmacy_name', (
      select fp.facility_name from public.facility_profile fp
      where fp.id = v_enq.pharmacy_id),
    'offers', coalesce((
      select jsonb_agg(o.row_json order by o.sort_key)
      from (
        select er.available desc as sort_key,
          jsonb_build_object(
            'id', er.id,
            'price', er.price,
            'currency', er.currency,
            'available', er.available,
            'notes', er.notes,
            'status', er.status,
            'responder_kind', er.responder_kind,
            'responded_at', er.responded_at,
            'facility_name', coalesce(fp.facility_name, ib.business_name, 'Pharmacy'),
            'area', coalesce(fp.area, ib.city)
          ) as row_json
        from public.enquiry_responses er
        left join public.facility_profile fp on fp.id = er.facility_id
        left join public.ibp ib on ib.id = er.ibp_id
        where er.enquiry_id = p_id
          and er.status in ('offered', 'accepted')
        order by er.available desc, er.price asc nulls last, er.responded_at asc
        limit v_offer_limit
      ) o
    ), '[]'::jsonb),
    'total_offers', v_total_offers,
    'offers_hidden', greatest(v_total_offers - v_offer_limit, 0),
    'escrow', (
      select jsonb_build_object(
        'id', et.id,
        'amount', et.amount,
        'currency', et.currency,
        'status', et.status,
        'dispute_reason', et.dispute_reason,
        'dispute_raised_at', et.dispute_raised_at,
        'dispute_resolution', et.dispute_resolution)
      from public.escrow_transactions et
      where et.enquiry_id = p_id
      order by et.created_at desc limit 1),
    'price_history', case when v_is_premium then coalesce((
      select jsonb_agg(ph.row_json order by ph.day desc)
      from (
        select date_trunc('day', er.responded_at) as day,
          jsonb_build_object(
            'day', date_trunc('day', er.responded_at),
            'best_price', min(er.price)) as row_json
        from public.enquiry_responses er
        join public.medication_enquiries me2 on me2.id = er.enquiry_id
        where lower(me2.medication_name) = lower(v_enq.medication_name)
          and er.available and er.price is not null
        group by 1
        order by 1 desc
        limit 30
      ) ph
    ), '[]'::jsonb) else '[]'::jsonb end
  );
exception
  when others then
    return jsonb_build_object('error', sqlerrm);
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. Accept an offer (AN-D6): atomic — accepted one, others expired
-- -----------------------------------------------------------------------------
create or replace function public.accept_enquiry_offer(p_response_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_resp public.enquiry_responses%rowtype;
  v_enq public.medication_enquiries%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'auth');
  end if;

  select * into v_resp from public.enquiry_responses where id = p_response_id;
  if v_resp.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select * into v_enq from public.medication_enquiries
  where id = v_resp.enquiry_id and user_id = v_uid;
  if v_enq.id is null then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if v_enq.status not in ('pending_match', 'matched') then
    return jsonb_build_object('ok', false, 'error', 'status');
  end if;
  if v_resp.status <> 'offered' then
    return jsonb_build_object('ok', false, 'error', 'offer_unavailable');
  end if;

  update public.enquiry_responses set status = 'accepted' where id = p_response_id;
  update public.enquiry_responses
     set status = 'expired'
   where enquiry_id = v_enq.id and id <> p_response_id and status = 'offered';

  update public.medication_enquiries
     set status = 'matched',
         pharmacy_id = v_resp.facility_id,
         payment_amount = v_resp.price,
         updated_at = now()
   where id = v_enq.id;

  return jsonb_build_object('ok', true);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. Cancel enquiry (AN-D7): before escrow only; terminal
-- -----------------------------------------------------------------------------
create or replace function public.cancel_medication_enquiry(p_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_enq public.medication_enquiries%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'auth');
  end if;

  select * into v_enq from public.medication_enquiries
  where id = p_id and user_id = v_uid;
  if v_enq.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_enq.status not in ('pending_match', 'matched') then
    return jsonb_build_object('ok', false, 'error', 'status');
  end if;

  update public.medication_enquiries
     set status = 'cancelled', updated_at = now()
   where id = p_id;
  update public.enquiry_responses
     set status = 'declined'
   where enquiry_id = p_id and status = 'offered';

  return jsonb_build_object('ok', true);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$$;

-- -----------------------------------------------------------------------------
-- 7. Raise escrow dispute (AN-D11): only while escrow is held
-- -----------------------------------------------------------------------------
create or replace function public.raise_escrow_dispute(p_enquiry_id uuid, p_reason text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owned boolean;
  v_updated int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'auth');
  end if;

  select exists(
    select 1 from public.medication_enquiries
    where id = p_enquiry_id and user_id = v_uid
  ) into v_owned;
  if not v_owned then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  update public.escrow_transactions
     set status = 'disputed',
         dispute_reason = nullif(trim(coalesce(p_reason, '')), ''),
         dispute_raised_at = now()
   where enquiry_id = p_enquiry_id and status = 'held';

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    return jsonb_build_object('ok', false, 'error', 'no_held_escrow');
  end if;

  return jsonb_build_object('ok', true);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$$;

-- -----------------------------------------------------------------------------
-- 8. Notifications (AN-D8): offer received + status transitions, fail-open
-- -----------------------------------------------------------------------------
create or replace function public.handle_enquiry_response_notify()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_enq record;
begin
  select id, user_id, medication_name, notify_on_availability
    into v_enq
  from public.medication_enquiries
  where id = new.enquiry_id;

  if v_enq.id is not null
     and v_enq.user_id is not null
     and v_enq.notify_on_availability
     and new.available then
    begin
      insert into public.notifications (user_id, title, body, type, metadata)
      values (
        v_enq.user_id,
        'New pharmacy offer',
        'A pharmacy responded to your enquiry for ' || v_enq.medication_name ||
          '. Open it to compare prices.',
        'system',
        jsonb_build_object('module', 'med_enquiry', 'enquiry_id', new.enquiry_id)
      );
    exception when others then null;
    end;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enquiry_response_notify on public.enquiry_responses;
create trigger trg_enquiry_response_notify
  after insert on public.enquiry_responses
  for each row execute function public.handle_enquiry_response_notify();

create or replace function public.handle_med_enquiry_status_notify()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_title text;
  v_body text;
begin
  if new.status = old.status or new.user_id is null then
    return new;
  end if;

  case new.status
    when 'pickup_ready' then
      v_title := 'Your medication is ready for pickup';
      v_body := coalesce(new.medication_name, 'Your medication') ||
        ' is ready. Show your pickup code at the pharmacy.';
    when 'delivery_in_progress' then
      v_title := 'Your medication is on its way';
      v_body := coalesce(new.medication_name, 'Your medication') ||
        ' has been dispatched for delivery.';
    when 'completed' then
      v_title := 'Medication fulfilment complete';
      v_body := coalesce(new.medication_name, 'Your medication') ||
        ' was fulfilled. We hope you feel better soon!';
    else
      return new;
  end case;

  begin
    insert into public.notifications (user_id, title, body, type, metadata)
    values (
      new.user_id, v_title, v_body, 'system',
      jsonb_build_object('module', 'med_enquiry', 'enquiry_id', new.id,
                         'status', new.status)
    );
  exception when others then null;
  end;

  return new;
end;
$$;

drop trigger if exists trg_med_enquiry_status_notify on public.medication_enquiries;
create trigger trg_med_enquiry_status_notify
  after update on public.medication_enquiries
  for each row execute function public.handle_med_enquiry_status_notify();

-- -----------------------------------------------------------------------------
-- 9. Grants — authenticated only (Part AA/AM convention)
-- -----------------------------------------------------------------------------
revoke all on function public.search_drug_names(text) from public, anon;
revoke all on function public.submit_medication_enquiry(jsonb) from public, anon;
revoke all on function public.get_my_medication_enquiries() from public, anon;
revoke all on function public.get_medication_enquiry_detail(uuid) from public, anon;
revoke all on function public.accept_enquiry_offer(uuid) from public, anon;
revoke all on function public.cancel_medication_enquiry(uuid) from public, anon;
revoke all on function public.raise_escrow_dispute(uuid, text) from public, anon;

grant execute on function public.search_drug_names(text) to authenticated, service_role;
grant execute on function public.submit_medication_enquiry(jsonb) to authenticated, service_role;
grant execute on function public.get_my_medication_enquiries() to authenticated, service_role;
grant execute on function public.get_medication_enquiry_detail(uuid) to authenticated, service_role;
grant execute on function public.accept_enquiry_offer(uuid) to authenticated, service_role;
grant execute on function public.cancel_medication_enquiry(uuid) to authenticated, service_role;
grant execute on function public.raise_escrow_dispute(uuid, text) to authenticated, service_role;
