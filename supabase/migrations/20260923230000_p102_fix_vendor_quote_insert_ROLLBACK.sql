-- ROLLBACK for p102_fix_vendor_quote_insert
--
-- WARNING: restoring the original policy re-breaks vendor quoting entirely.
-- The `exists (select ... from medication_enquiries ...)` subquery is
-- evaluated as the invoking user, and that table's only SELECT policy is
-- "own enquiry or admin", so for a vendor it is always false and every quote
-- insert is refused with 42501. Only run this if quoting is being replaced by
-- something else.

drop policy if exists "enquiry_responses_provider_insert" on public.enquiry_responses;
create policy "enquiry_responses_provider_insert"
  on public.enquiry_responses for insert to authenticated
  with check (
    status = 'offered'
    and exists (select 1 from public.medication_enquiries me
                where me.id = enquiry_responses.enquiry_id
                  and me.status = 'pending_match')
    and (
      (select public.is_admin())
      or public.is_provider_member(enquiry_responses.facility_id, 'requests.quote')
      or exists (select 1 from public.ibp b
                 where b.id = enquiry_responses.ibp_id
                   and b.user_id = ((select auth.uid()))::text)
    )
  );

drop function if exists public.enquiry_open_for_quotes(uuid);
