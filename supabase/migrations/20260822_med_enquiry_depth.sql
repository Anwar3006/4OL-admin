-- =============================================================================
-- Gap Analysis Part AB — Medication Enquiry menu depth
-- =============================================================================
-- Extends the EXISTING medication_enquiries + escrow_transactions tables so
-- the admin Medication Enquiry menu (mockup L7012-7210) and the future
-- mobile "Find Medication" rollout share one schema:
--
--   1. medication_enquiries column adds (enquiry type, HCP prescriber,
--      prescription artifact, fulfilment mode, mobile submission fields).
--   2. Status vocabulary migration to the mockup's 7 states.
--   3. enquiry_responses — pharmacy/IBP price & availability bids powering
--      Best Price, Match Rate and the Pharmacy Responses performance tab.
--   4. RBAC catalog keys medenquiry.view / medenquiry.manage.
--   5. get_med_enquiry_overview() SECURITY DEFINER RPC (service-role only)
--      with the Part AA graceful {error} degradation contract.
--
-- Additive and re-runnable. Everything degrades gracefully before this is
-- applied (routes return empty states; base list still reads the old table).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Column extensions on medication_enquiries
-- -----------------------------------------------------------------------------
alter table public.medication_enquiries
  add column if not exists enquiry_type text default 'otc'
    check (enquiry_type in ('with_rx','otc','hcp_request')),
  add column if not exists hcp_prescriber_id uuid
    references public.hcp_verifications(id),
  add column if not exists prescription_url text,
  add column if not exists fulfilment_mode text default 'pickup'
    check (fulfilment_mode in ('pickup','delivery')),
  add column if not exists pickup_confirmation_code text,
  add column if not exists unit text,
  add column if not exists search_radius_km numeric,
  add column if not exists search_area_mode text
    check (search_area_mode in ('current','custom')),
  add column if not exists custom_area text,
  add column if not exists notify_on_availability boolean not null default true,
  add column if not exists delivery_distance_km numeric;

comment on column public.medication_enquiries.enquiry_type is
  'Part AB: with_rx | otc | hcp_request (HCP prescription integration).';
comment on column public.medication_enquiries.hcp_prescriber_id is
  'Part AB: HCP that raised a prescription request (Part J can_respond_enquiries).';
comment on column public.medication_enquiries.pickup_confirmation_code is
  'Part AB: code shown to the user at pharmacy pickup.';
comment on column public.medication_enquiries.search_radius_km is
  'Part AB: mobile submission — search radius 1-20 km.';
comment on column public.medication_enquiries.notify_on_availability is
  'Part AB: mobile submission — opt-in availability push.';

-- Backfill derivable fields from existing data.
do $$
begin
  update public.medication_enquiries
     set enquiry_type = case
           when enquiry_type is distinct from 'otc' then enquiry_type
           when prescription_id is not null then 'with_rx'
           else 'otc'
         end,
         fulfilment_mode = case
           when fulfilment_mode is distinct from 'pickup' then fulfilment_mode
           when delivery_address is not null then 'delivery'
           else 'pickup'
         end;
exception when others then null;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Status vocabulary → mockup set
--    pending_match | matched | in_escrow | pickup_ready |
--    delivery_in_progress | completed | cancelled
-- -----------------------------------------------------------------------------
do $$
begin
  update public.medication_enquiries set status = 'pending_match'        where status = 'pending';
  update public.medication_enquiries set status = 'matched'              where status = 'confirmed';
  update public.medication_enquiries set status = 'in_escrow'            where status = 'processing';
  update public.medication_enquiries set status = 'delivery_in_progress' where status = 'shipped';
  update public.medication_enquiries set status = 'completed'            where status = 'delivered';
  update public.medication_enquiries set status = 'cancelled'            where status = 'rejected';
exception when others then null;
end;
$$;

do $$
begin
  alter table public.medication_enquiries
    drop constraint if exists medication_enquiries_status_check;
  alter table public.medication_enquiries
    add constraint medication_enquiries_status_check check (status in (
      'pending_match','matched','in_escrow','pickup_ready',
      'delivery_in_progress','completed','cancelled'));
exception when others then null;
end;
$$;

create index if not exists idx_med_enquiries_status_created
  on public.medication_enquiries (status, created_at desc);
create index if not exists idx_med_enquiries_type
  on public.medication_enquiries (enquiry_type);

-- -----------------------------------------------------------------------------
-- 3. enquiry_responses — pharmacy / IBP price & availability bids
-- -----------------------------------------------------------------------------
create table if not exists public.enquiry_responses (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null
    references public.medication_enquiries(id) on delete cascade,
  responder_kind text not null default 'pharmacy'
    check (responder_kind in ('pharmacy','wholesaler')),
  facility_id uuid references public.facility_profile(id),
  ibp_id uuid references public.ibp(id),
  price numeric,
  currency text not null default 'GHS',
  available boolean not null default true,
  notes text,
  status text not null default 'offered'
    check (status in ('offered','accepted','declined','expired')),
  responded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_enquiry_responses_enquiry
  on public.enquiry_responses (enquiry_id);
create index if not exists idx_enquiry_responses_facility
  on public.enquiry_responses (facility_id);

comment on table public.enquiry_responses is
  'Part AB: per-pharmacy/IBP bids on medication enquiries (price, availability). Powers Best Price, Match Rate and the Pharmacy Responses performance tab.';

-- -----------------------------------------------------------------------------
-- 4. RBAC catalog extension
-- -----------------------------------------------------------------------------
insert into public.admin_permissions (key, resource, action, description) values
  ('medenquiry.view',   'medenquiry', 'view',   'View medication enquiries, escrow and disputes'),
  ('medenquiry.manage', 'medenquiry', 'manage', 'Broadcast, notify users and manage enquiry fulfilment')
on conflict (key) do update set description = excluded.description;

insert into public.admin_role_permissions (role, permission_key) values
  ('admin',         'medenquiry.view'),
  ('admin',         'medenquiry.manage'),
  ('finance_admin', 'medenquiry.view'),
  ('support_agent', 'medenquiry.view')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- 5. Aggregation RPC consumed by /api/medenquiry/overview
-- -----------------------------------------------------------------------------
create or replace function public.get_med_enquiry_overview()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'kpis', jsonb_build_object(
      'total_enquiries_30d', (
        select count(*) from public.medication_enquiries
        where created_at >= now() - interval '30 days'),
      'new_this_week', (
        select count(*) from public.medication_enquiries
        where created_at >= now() - interval '7 days'),
      'pending_unmatched', (
        select count(*) from public.medication_enquiries
        where status = 'pending_match'),
      'escrow_active_count', (
        select count(*) from public.escrow_transactions
        where status = 'held'),
      'escrow_amount_held', (
        select coalesce(sum(amount), 0) from public.escrow_transactions
        where status = 'held'),
      'delivery_in_progress', (
        select count(*) from public.medication_enquiries
        where status = 'delivery_in_progress'),
      'open_disputes', (
        select count(*) from public.escrow_transactions
        where status = 'disputed'),
      'match_rate_pct', (
        select case when count(*) = 0 then 0
          else round(100.0 * count(*) filter (
                 where status in ('matched','in_escrow','pickup_ready',
                                  'delivery_in_progress','completed'))
               / count(*), 1)
        end
        from public.medication_enquiries
        where created_at >= now() - interval '30 days')
    ),
    'pharmacy_performance', (
      select coalesce(jsonb_agg(t.row_json), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'responder_kind', er.responder_kind,
          'pharmacy_name', coalesce(fp.facility_name, ib.business_name, 'Unknown'),
          'location', coalesce(nullif(fp.area || ' — ' || fp.region::text, ' — '), ib.city),
          'total_responses', count(er.id),
          'avg_response_minutes',
            coalesce(round(avg(extract(epoch from (er.responded_at - me.created_at)) / 60.0)), 0),
          'availability_rate',
            case when count(er.id) = 0 then 0
              else round(100.0 * count(er.id) filter (where er.available) / count(er.id), 1)
            end,
          'orders_fulfilled',
            count(er.id) filter (where er.status = 'accepted'),
          'rating', coalesce(fp.rating_average, 0),
          'active', coalesce(
            (select true from public.medication_enquiries me2
              where me2.pharmacy_id = er.facility_id limit 1), true)
        ) as row_json
        from public.enquiry_responses er
        join public.medication_enquiries me on me.id = er.enquiry_id
        left join public.facility_profile fp on fp.id = er.facility_id
        left join public.ibp ib on ib.id = er.ibp_id
        group by er.responder_kind, er.facility_id, er.ibp_id,
                 fp.facility_name, fp.area, fp.region, fp.rating_average,
                 ib.business_name, ib.city
        order by count(er.id) desc
        limit 50
      ) t
    )
  ) into result;

  return result;
exception
  when others then
    return jsonb_build_object('error', sqlerrm);
end;
$$;

revoke all on function public.get_med_enquiry_overview() from public;
revoke all on function public.get_med_enquiry_overview() from anon;
revoke all on function public.get_med_enquiry_overview() from authenticated;
grant execute on function public.get_med_enquiry_overview() to service_role;

-- -----------------------------------------------------------------------------
-- 6. RLS — admin reads/writes via service_role only (Part AA convention).
-- -----------------------------------------------------------------------------
alter table public.enquiry_responses enable row level security;
