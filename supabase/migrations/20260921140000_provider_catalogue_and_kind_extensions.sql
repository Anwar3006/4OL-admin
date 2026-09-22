-- =============================================================================
-- P0-12: provider_catalogue_items (+ upsert_catalogue_item + publish guard),
-- provider_vendor_details, provider_practitioner_details,
-- fitness_trainers.provider_id, ambulances.operator_id, provider_activity_log.
--
-- Does NOT retire ibp / ibp_products / ibp_activity_log /
-- enquiry_responses.ibp_id / facility_offerings yet. PLAN.md's own accept
-- check for that step is "pnpm knip shows no references to the dropped
-- tables" — features/ibp/* and offerings-section.tsx in the admin repo still
-- import them, so dropping the tables now would be deleting on reading, not
-- evidence, which is the one thing this repo's rules rule out. Left for
-- whoever retires those features in application code; the tables are still
-- 0 rows, so nothing is lost by waiting.
-- =============================================================================

create table public.provider_catalogue_items (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  item_type text not null check (item_type in ('product','service','package','session','programme')),
  name text not null,
  description text,
  category text,
  capability_required text references public.capabilities(key),
  drug_id uuid references public.drugs(id),
  regulatory_number text,
  price numeric(12,2),
  currency text not null default 'GHS',
  unit text,
  duration_minutes int,
  stock_status text not null default 'in_stock'
    check (stock_status in ('in_stock','low','out_of_stock','made_to_order')),
  images jsonb not null default '[]',
  status text not null default 'draft'
    check (status in ('draft','pending_review','published','rejected','archived')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index provider_catalogue_items_provider_id_idx on public.provider_catalogue_items(provider_id);
create index provider_catalogue_items_status_idx on public.provider_catalogue_items(status);
create index provider_catalogue_items_capability_idx on public.provider_catalogue_items(capability_required);

alter table public.provider_catalogue_items enable row level security;

create policy "catalogue_items public read" on public.provider_catalogue_items
  for select to anon, authenticated using (
    status = 'published'
    and exists (select 1 from public.providers p where p.id = provider_catalogue_items.provider_id and p.status = 'active')
    and (
      capability_required is null
      or exists (
        select 1 from public.provider_capabilities pc
        where pc.provider_id = provider_catalogue_items.provider_id
          and pc.capability = provider_catalogue_items.capability_required
      )
    )
  );

create policy "catalogue_items owner and admin read" on public.provider_catalogue_items
  for select to authenticated using (
    (select public.is_app_admin())
    or exists (select 1 from public.providers p where p.id = provider_catalogue_items.provider_id and p.owner_id = (select auth.uid()))
  );

create policy "catalogue_items admin write" on public.provider_catalogue_items
  for all to authenticated using ((select public.is_app_admin())) with check ((select public.is_app_admin()));

revoke all on public.provider_catalogue_items from anon;
grant select on public.provider_catalogue_items to anon;
grant select on public.provider_catalogue_items to authenticated;
grant all on public.provider_catalogue_items to service_role;

-- -----------------------------------------------------------------------------
-- Trigger: can't publish without the required capability
-- -----------------------------------------------------------------------------
create or replace function public.fn_catalogue_item_publish_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.status = 'published' and new.capability_required is not null then
    if not exists (
      select 1 from public.provider_capabilities pc
      where pc.provider_id = new.provider_id and pc.capability = new.capability_required
    ) then
      raise exception 'Provider % does not hold capability % required to publish this item', new.provider_id, new.capability_required;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_catalogue_item_publish_guard
  before insert or update of status, capability_required on public.provider_catalogue_items
  for each row execute function public.fn_catalogue_item_publish_guard();

-- -----------------------------------------------------------------------------
-- upsert_catalogue_item (owner) — forces pending_review when the capability
-- requires it, regardless of what status the caller asked for.
-- -----------------------------------------------------------------------------
create or replace function public.upsert_catalogue_item(p_id uuid, p_provider_id uuid, p_patch jsonb)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
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
$$;

revoke all on function public.upsert_catalogue_item(uuid, uuid, jsonb) from public, anon;
grant execute on function public.upsert_catalogue_item(uuid, uuid, jsonb) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Kind extensions
-- -----------------------------------------------------------------------------
create table public.provider_vendor_details (
  provider_id uuid primary key references public.providers(id) on delete cascade,
  fulfilment_modes text[] not null default '{pickup}',
  delivery_radius_km numeric,
  min_order_amount numeric(12,2)
);

create table public.provider_practitioner_details (
  provider_id uuid primary key references public.providers(id) on delete cascade,
  hcp_verification_id uuid unique references public.hcp_verifications(id),
  consult_modes text[] not null default '{clinic}',
  home_visit_radius_km numeric,
  languages text[] not null default '{en}'
);

alter table public.provider_vendor_details enable row level security;
create policy "vendor_details owner and admin read" on public.provider_vendor_details
  for select to authenticated using (
    (select public.is_app_admin())
    or exists (select 1 from public.providers p where p.id = provider_vendor_details.provider_id and p.owner_id = (select auth.uid()))
  );
create policy "vendor_details owner insert" on public.provider_vendor_details
  for insert to authenticated with check (
    exists (select 1 from public.providers p where p.id = provider_vendor_details.provider_id and p.owner_id = (select auth.uid()))
  );
create policy "vendor_details owner update" on public.provider_vendor_details
  for update to authenticated using (
    exists (select 1 from public.providers p where p.id = provider_vendor_details.provider_id and p.owner_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.providers p where p.id = provider_vendor_details.provider_id and p.owner_id = (select auth.uid()))
  );
create policy "vendor_details admin all" on public.provider_vendor_details
  for all to authenticated using ((select public.is_app_admin())) with check ((select public.is_app_admin()));
revoke all on public.provider_vendor_details from anon;
grant select, insert, update on public.provider_vendor_details to authenticated;
grant all on public.provider_vendor_details to service_role;

alter table public.provider_practitioner_details enable row level security;
create policy "practitioner_details owner and admin read" on public.provider_practitioner_details
  for select to authenticated using (
    (select public.is_app_admin())
    or exists (select 1 from public.providers p where p.id = provider_practitioner_details.provider_id and p.owner_id = (select auth.uid()))
  );
create policy "practitioner_details owner insert" on public.provider_practitioner_details
  for insert to authenticated with check (
    exists (select 1 from public.providers p where p.id = provider_practitioner_details.provider_id and p.owner_id = (select auth.uid()))
  );
create policy "practitioner_details owner update" on public.provider_practitioner_details
  for update to authenticated using (
    exists (select 1 from public.providers p where p.id = provider_practitioner_details.provider_id and p.owner_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.providers p where p.id = provider_practitioner_details.provider_id and p.owner_id = (select auth.uid()))
  );
create policy "practitioner_details admin all" on public.provider_practitioner_details
  for all to authenticated using ((select public.is_app_admin())) with check ((select public.is_app_admin()));
revoke all on public.provider_practitioner_details from anon;
grant select, insert, update on public.provider_practitioner_details to authenticated;
grant all on public.provider_practitioner_details to service_role;

alter table public.fitness_trainers add column provider_id uuid unique references public.providers(id) on delete cascade;
alter table public.ambulances add column operator_id uuid references public.providers(id);

-- -----------------------------------------------------------------------------
-- provider_activity_log
-- -----------------------------------------------------------------------------
create table public.provider_activity_log (
  id bigint generated always as identity primary key,
  provider_id uuid not null references public.providers(id) on delete cascade,
  actor_id uuid,
  actor_kind text not null check (actor_kind in ('owner','admin','system')),
  device_id text,
  action text not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index provider_activity_log_provider_id_idx on public.provider_activity_log(provider_id, created_at desc);

alter table public.provider_activity_log enable row level security;
create policy "provider_activity_log owner and admin read" on public.provider_activity_log
  for select to authenticated using (
    (select public.is_app_admin())
    or exists (select 1 from public.providers p where p.id = provider_activity_log.provider_id and p.owner_id = (select auth.uid()))
  );
revoke all on public.provider_activity_log from anon, authenticated;
grant select on public.provider_activity_log to authenticated;
grant all on public.provider_activity_log to service_role;

create or replace function public.fn_log_provider_activity()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_provider_id uuid;
  v_device_id text;
  v_actor uuid := (select auth.uid());
  v_actor_kind text;
begin
  if tg_table_name = 'providers' then
    v_provider_id := coalesce(new.id, old.id);
  else
    v_provider_id := coalesce(new.provider_id, old.provider_id);
  end if;

  begin
    v_device_id := nullif(current_setting('request.headers', true), '')::json ->> 'x-device-id';
  exception when others then
    v_device_id := null;
  end;

  v_actor_kind := case
    when v_actor is null then 'system'
    when (select public.is_app_admin()) then 'admin'
    else 'owner'
  end;

  insert into public.provider_activity_log (provider_id, actor_id, actor_kind, device_id, action, before, after)
  values (
    v_provider_id, v_actor, v_actor_kind, v_device_id,
    tg_table_name || '_' || lower(tg_op),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );

  return coalesce(new, old);
end;
$$;

create trigger trg_log_provider_activity_providers
  after insert or update or delete on public.providers
  for each row execute function public.fn_log_provider_activity();

create trigger trg_log_provider_activity_credentials
  after insert or update or delete on public.provider_credentials
  for each row execute function public.fn_log_provider_activity();

create trigger trg_log_provider_activity_capabilities
  after insert or update or delete on public.provider_capabilities
  for each row execute function public.fn_log_provider_activity();

create trigger trg_log_provider_activity_catalogue
  after insert or update or delete on public.provider_catalogue_items
  for each row execute function public.fn_log_provider_activity();
