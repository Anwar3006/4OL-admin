-- =============================================================================
-- ROLLBACK for 20260924120000_p104_catalogue_bulk_pricing_and_images.sql
--
-- Restores `upsert_catalogue_item` to the body it had immediately before this
-- migration (20260923200000_p108b_member_functions.sql), drops the folder
-- helper and the bucket's two policies, removes the bucket and drops the
-- column.
--
-- WARNING — data loss: dropping `bulk_pricing` destroys every wholesale tier
-- entered while this migration was live, and nothing restores them.
--
-- WARNING — the bucket row cannot be dropped while it still holds objects
-- (storage.objects has an FK to storage.buckets). That failure is the safe
-- direction, not a bug: delete the files deliberately through the storage API
-- first if a real teardown is intended.
-- =============================================================================

drop policy if exists "vendor uploads own catalogue images" on storage.objects;
drop policy if exists "vendor replaces own catalogue images" on storage.objects;

drop function if exists public.owns_catalogue_image_folder(text);

delete from storage.buckets where id = 'catalogue-images';

alter table public.provider_catalogue_items
  drop constraint if exists provider_catalogue_items_bulk_pricing_shape;

drop function if exists public.is_valid_catalogue_bulk_pricing(jsonb);

alter table public.provider_catalogue_items
  drop column if exists bulk_pricing;

-- Back to the pre-P1-04 definition, verbatim.
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

revoke all on function public.upsert_catalogue_item(uuid, uuid, jsonb) from public, anon;
grant execute on function public.upsert_catalogue_item(uuid, uuid, jsonb) to authenticated, service_role;
