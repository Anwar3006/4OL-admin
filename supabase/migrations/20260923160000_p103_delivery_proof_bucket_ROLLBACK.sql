-- ROLLBACK for 20260923160000_p103_delivery_proof_bucket.sql
--
-- The bucket itself is left in place on purpose. Dropping it would destroy
-- proof-of-delivery photos, which are the evidence that an order was handed
-- over; a rollback of the access rules should not also throw those away.
-- With the policies gone the bucket is private and unreachable by
-- `authenticated`, which is the pre-migration state for every caller.
--
-- To remove it completely once you are sure nothing is stored:
--   delete from storage.objects where bucket_id = 'delivery-proofs';
--   delete from storage.buckets where id = 'delivery-proofs';

drop policy if exists "vendor uploads own delivery proofs" on storage.objects;
drop policy if exists "vendor reads own delivery proofs" on storage.objects;
drop function if exists public.owns_delivery_proof_folder(text);
