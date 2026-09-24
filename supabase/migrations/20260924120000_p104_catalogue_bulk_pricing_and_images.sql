-- =============================================================================
-- P1-04 · Catalogue: wholesale tiers + a public home for product photos
--
-- Two things P1-04's acceptance check needs that the database did not have.
--
-- 1. `bulk_pricing`. PLAN.md:664 — "CRUD through `upsert_catalogue_item`;
--    categories limited to the vendor's capabilities; stock toggle; bulk
--    pricing for `wholesale`". The column does not exist anywhere, and
--    `upsert_catalogue_item` reads a FIXED key list out of `p_patch` — an
--    unknown key is IGNORED, not an error. So without this migration the
--    app's wholesale editor would report success, the tiers would vanish on
--    reload, and the one bug class this repo's rules care most about would be
--    live again: a check that cannot fail reports the same thing as a check
--    that passes.
--
-- 2. A bucket the vendor can write a product photo to. `bucket4ol` is the
--    only public bucket and its `authenticated` INSERT policy is a fixed
--    content-prefix allowlist (20260908_epic2_5_storage_hardening.sql,
--    extended by 20260914150000) with no catalogue prefix;
--    `provider-credentials` is private and only ever written through an
--    admin-minted signed URL; `delivery-proofs` is private on purpose. A
--    product photo ends up as a PUBLIC url in
--    `provider_catalogue_items.images` — the patient app renders it — so it
--    needs a public bucket with owner-scoped writes, which is what
--    `catalogue-images` is.
--
-- Shape of `bulk_pricing` (settled 24 Sept; no design exists for it — Sheet 06
-- screen 2 shows photos, name, category, price, unit, FDA no., stock and
-- Publish, and nothing about wholesale):
--
--     [{"min_qty": 12, "price": 22.50}, {"min_qty": 48, "price": 19.00}]
--
-- `min_qty` is the smallest quantity the tier applies from, ascending, and
-- `price` is the price PER UNIT inside that tier. `[]` means "single units
-- only"; it is also how a wholesale seller CLEARS their tiers, because jsonb
-- '[]' is not null and so survives the update branch's `coalesce`. Sellers
-- without the `wholesale` capability never send the key at all and keep the
-- default.
--
-- Both halves are additive and safe to apply while old builds are live: a
-- build that never sends `bulk_pricing` is unaffected (NOT NULL DEFAULT '[]'),
-- and nothing existing writes to the new bucket.
--
-- House rules applied: ships with a *_ROLLBACK.sql; new RLS uses
-- `(select auth.uid())`; authorisation goes through
-- `is_provider_member(p_provider_id, p_permission)` (P1-08b), never
-- `providers.owner_id`.
--
-- Dry run, then apply (HANDOVER-2026-09-25.md §0):
--
--   cd ../4-Our-Life && set -a; . .env.production; set +a
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction \
--     -f <(printf 'begin;\n'; cat supabase/migrations/20260924120000_p104_catalogue_bulk_pricing_and_images.sql; printf '\nrollback;\n')
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction \
--     -f supabase/migrations/20260924120000_p104_catalogue_bulk_pricing_and_images.sql
--   psql "$DATABASE_URL" -c "notify pgrst, 'reload schema'"
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. bulk_pricing — the wholesale tiers
--
-- jsonb, not a child table: the tiers are only ever read and written whole,
-- they are never queried across items, and every list of them is at most
-- five rows. `images` on this table set the precedent.
-- -----------------------------------------------------------------------------
alter table public.provider_catalogue_items
  add column if not exists bulk_pricing jsonb not null default '[]'::jsonb;

-- The app gives field-level feedback while a seller is typing, but the RPC is
-- public to every authenticated business account. The database must still
-- reject malformed or unlicensed wholesale data — client-side validation is
-- never an authorisation or integrity boundary.
create or replace function public.is_valid_catalogue_bulk_pricing(p_value jsonb)
returns boolean
language sql
immutable
set search_path to ''
as $function$
  select case
    when jsonb_typeof(p_value) <> 'array' then false
    when jsonb_array_length(p_value) > 5 then false
    when exists (
      select 1
      from jsonb_array_elements(p_value) with ordinality as tier(value, ord)
      where not (
        jsonb_typeof(tier.value) = 'object'
        and jsonb_typeof(tier.value -> 'min_qty') = 'number'
        and coalesce(tier.value ->> 'min_qty', '') ~ '^[1-9][0-9]*$'
        and jsonb_typeof(tier.value -> 'price') = 'number'
        and case
          when coalesce(tier.value ->> 'price', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
            then (tier.value ->> 'price')::numeric >= 0
          else false
        end
      )
    ) then false
    when exists (
      select 1
      from (
        select
          (tier.value ->> 'min_qty')::numeric as min_qty,
          lag((tier.value ->> 'min_qty')::numeric) over (order by tier.ord) as previous_min_qty
        from jsonb_array_elements(p_value) with ordinality as tier(value, ord)
      ) ordered
      where ordered.previous_min_qty is not null
        and ordered.min_qty <= ordered.previous_min_qty
    ) then false
    else true
  end;
$function$;

alter table public.provider_catalogue_items
  drop constraint if exists provider_catalogue_items_bulk_pricing_shape;
alter table public.provider_catalogue_items
  add constraint provider_catalogue_items_bulk_pricing_shape
  check (public.is_valid_catalogue_bulk_pricing(bulk_pricing));

comment on column public.provider_catalogue_items.bulk_pricing is
  'Wholesale tiers for the `wholesale` capability: [{"min_qty": int>0, "price": numeric>=0}] ascending by min_qty; [] = single units only. Omitted entirely for sellers without the capability.';

-- -----------------------------------------------------------------------------
-- 2. upsert_catalogue_item — carry bulk_pricing through the patch
--
-- Body reproduced verbatim from 20260923200000_p108b_member_functions.sql
-- (the current definition, with the `is_provider_member` guard) plus ONE line
-- in each branch. No signature change: PostgREST resolves an RPC by argument
-- NAME, and `p_id uuid, p_provider_id uuid, p_patch jsonb` is unchanged, so
-- installed builds keep matching.
--
--   insert: coalesce(p_patch->'bulk_pricing', '[]'::jsonb)
--   update: coalesce(p_patch->'bulk_pricing', bulk_pricing)
--
-- The asymmetry is the point: an absent key leaves existing tiers alone (so a
-- stock-status toggle from the Catalogue list cannot wipe them), while an
-- explicit `[]` clears them (so removing every tier in the editor sticks).
--
-- ACLs are re-stated because CREATE OR REPLACE preserves them — this is a
-- no-op here, kept so the grants this function needs are visible in the file
-- that last touched it.
-- -----------------------------------------------------------------------------
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

  if p_patch ? 'bulk_pricing' then
    if not public.is_valid_catalogue_bulk_pricing(p_patch -> 'bulk_pricing') then
      raise exception 'Invalid wholesale pricing tiers'
        using errcode = '22023';
    end if;

    if jsonb_array_length(p_patch -> 'bulk_pricing') > 0
       and not exists (
         select 1 from public.provider_capabilities
         where provider_id = p_provider_id and capability = 'wholesale'
       ) then
      raise exception 'An approved wholesale licence is required for bulk pricing'
        using errcode = '42501';
    end if;
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
      stock_status, images, bulk_pricing, status
    ) values (
      p_provider_id, p_patch->>'item_type', p_patch->>'name', p_patch->>'description', p_patch->>'category',
      p_patch->>'capability_required', (p_patch->>'drug_id')::uuid, p_patch->>'regulatory_number',
      (p_patch->>'price')::numeric, coalesce(p_patch->>'currency', 'GHS'), p_patch->>'unit',
      (p_patch->>'duration_minutes')::int, coalesce(p_patch->>'stock_status', 'in_stock'),
      coalesce(p_patch->'images', '[]'::jsonb), coalesce(p_patch->'bulk_pricing', '[]'::jsonb),
      coalesce(v_final_status, 'draft')
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
      bulk_pricing = coalesce(p_patch->'bulk_pricing', bulk_pricing),
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

revoke all on function public.upsert_catalogue_item(uuid, uuid, jsonb) from public, anon;
grant execute on function public.upsert_catalogue_item(uuid, uuid, jsonb) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3. catalogue-images — a public bucket for product photos (Sheet 06, screen 2)
--
-- Public, because the URL this bucket hands back is exactly what the patient
-- app renders and what `provider_catalogue_items.images` is allowed to hold:
-- nothing else may be persisted there, least of all a local `file://` uri.
--
-- Why not `bucket4ol`: its `authenticated` INSERT policy is a fixed prefix
-- allowlist over admin-curated content. Adding a `catalogue/` prefix there
-- would drop vendor uploads into the same tree the admin console curates,
-- with no owner-scoped check at all — any authenticated user could then write
-- to `catalogue/<anyone>/…`.
--
-- Path convention: `<provider_id>/<item_id or draft uuid>/<slot>.<extension>`
--
-- The first segment is what the policy checks, exactly as `delivery-proofs`
-- does. `slot` is 1–3, so replacing the photo in a slot overwrites one object
-- instead of accumulating files.
--
-- Unlike `delivery-proofs`, this bucket DOES carry an UPDATE policy: a proof
-- of delivery is evidence and must not be revisable, while a product photo is
-- the vendor's own marketing and `upload(..., {upsert: true})` needs
-- permission to write over the existing object.
--
-- No SELECT policy: the bucket is public, so the URL the app renders bypasses
-- storage RLS altogether, and nothing in either mobile app lists this bucket.
-- (The admin console uses service_role if it ever needs to.)
--
-- No DELETE policy either: the app's only removal action drops the URL from
-- `images`, and the file is overwritten the next time that slot is uploaded.
-- A file left behind is a product photo, not personal data.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalogue-images',
  'catalogue-images',
  true,
  10485760, -- 10 MB; a phone camera JPEG is well under this
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

/**
 * May the caller manage the catalogue of the provider whose folder this
 * object sits in?
 *
 * Same shape as `owns_delivery_proof_folder`: `storage.foldername(name)`
 * gives the path segments and `[1]` is the provider id. It asks for
 * `catalogue.manage` — the very permission `upsert_catalogue_item` enforces —
 * so the bucket and the row it feeds cannot drift apart. A path that is not a
 * uuid must not raise inside an RLS predicate (that would surface as a 500
 * rather than a clean refusal), hence the guarded cast.
 */
create or replace function public.owns_catalogue_image_folder(p_name text)
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
  if v_folder is null
     or p_name !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[1-3]\.(jpg|png|webp)$' then
    return false;
  end if;
  begin
    v_id := v_folder::uuid;
  exception when others then
    return false;
  end;
  return public.is_provider_member(v_id, 'catalogue.manage');
end;
$function$;

revoke execute on function public.owns_catalogue_image_folder(text) from public;
grant execute on function public.owns_catalogue_image_folder(text) to authenticated;

drop policy if exists "vendor uploads own catalogue images" on storage.objects;
create policy "vendor uploads own catalogue images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'catalogue-images'
    and public.owns_catalogue_image_folder(name)
  );

drop policy if exists "vendor replaces own catalogue images" on storage.objects;
create policy "vendor replaces own catalogue images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'catalogue-images'
    and public.owns_catalogue_image_folder(name)
  )
  with check (
    bucket_id = 'catalogue-images'
    and public.owns_catalogue_image_folder(name)
  );
