-- P1-03 · A private home for proof-of-delivery photos (Sheet 05, screen 4)
--
-- `vendor_mark_delivered` already takes a `p_proof_url`, but there was
-- nowhere to put the file. None of the existing buckets fits:
--
--   * `bucket4ol` is PUBLIC, and its authenticated-insert policy is limited
--     to a fixed list of content prefixes. A photo of a named customer's
--     doorway is personal data and must not land in a public bucket.
--   * `provider-credentials` is private but is written through a signed URL
--     minted by the admin console (`/api/providers/credentials/upload`),
--     because `authenticated` has no insert policy on it at all.
--
-- A rider handing over a bag has no admin console in the loop, so this bucket
-- takes direct owner-scoped writes instead: the first path segment must be a
-- provider the caller owns, which is the same ownership test every vendor RPC
-- in P1-03 applies.
--
-- Path convention: `<provider_id>/<enquiry_id>-<timestamp>.jpg`

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'delivery-proofs',
  'delivery-proofs',
  false,
  10485760, -- 10 MB; a phone camera JPEG is well under this
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

/**
 * Does the caller own the provider whose folder this object sits in?
 *
 * `storage.foldername(name)` gives the path segments; `[1]` is the provider
 * id. A path that is not a uuid must not raise inside an RLS predicate — that
 * would surface as a 500 rather than a clean refusal — hence the guarded cast.
 */
create or replace function public.owns_delivery_proof_folder(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path to ''
as $$
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
$$;

revoke execute on function public.owns_delivery_proof_folder(text) from public;
grant execute on function public.owns_delivery_proof_folder(text) to authenticated;

drop policy if exists "vendor uploads own delivery proofs" on storage.objects;
create policy "vendor uploads own delivery proofs"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'delivery-proofs'
    and public.owns_delivery_proof_folder(name)
  );

drop policy if exists "vendor reads own delivery proofs" on storage.objects;
create policy "vendor reads own delivery proofs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'delivery-proofs'
    and public.owns_delivery_proof_folder(name)
  );

-- No UPDATE and no DELETE policy, deliberately: a proof of delivery is
-- evidence. Once written it is not the vendor's to change or remove, which
-- mirrors `provider_inbox` having no INSERT policy for the same reason.
