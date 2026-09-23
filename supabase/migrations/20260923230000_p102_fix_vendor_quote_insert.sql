-- P1-02 · Fix: a vendor could never actually insert a quote
--
-- `enquiry_responses_provider_insert` required, among other things:
--
--   exists (select 1 from medication_enquiries me
--            where me.id = enquiry_responses.enquiry_id
--              and me.status = 'pending_match')
--
-- A policy's subquery runs as the INVOKING user, and `medication_enquiries`'s
-- only SELECT policy is "own enquiry or admin". So for a vendor that `exists`
-- is evaluated against a row they cannot see, returns false, and the insert
-- is refused with 42501 every single time.
--
-- The Business app's `sendQuote` does exactly this insert, and the mobile
-- contract records the POLICY (not an RPC) as the contracted mechanism. So
-- quoting — the central vendor action in P1-02, and the thing the whole
-- enquiry loop exists to produce — has never worked and could not have.
--
-- Found by running the loop end to end on prod: submit → match → alert →
-- quote → accept → fulfil. Everything either side of the quote was fine.
--
-- THE FIX, and what it deliberately is not. A SECURITY DEFINER helper that
-- answers one boolean: "is this enquiry still open for quotes?" The
-- alternative — giving vendors a SELECT policy over `medication_enquiries` —
-- would expose every patient's enquiry row (including `delivery_address`,
-- `delivery_gps` and `prescription_url`) to every vendor, to fix an
-- authorisation check. `get_vendor_enquiry_inbox` already decides, carefully,
-- which enquiries a vendor may know about and returns no patient identity;
-- this must not become a second, wider route to the same table. It takes an
-- id the caller already has and returns true or false.

create or replace function public.enquiry_open_for_quotes(p_enquiry_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1 from public.medication_enquiries me
    where me.id = p_enquiry_id
      and me.status = 'pending_match'
  );
$function$;

revoke execute on function public.enquiry_open_for_quotes(uuid) from public, anon;
grant execute on function public.enquiry_open_for_quotes(uuid) to authenticated;

-- Same policy, with the unevaluatable subquery replaced. Every other clause
-- — status='offered', the admin branch, the ibp branch, the membership check
-- from P1-08b — is unchanged.
drop policy if exists "enquiry_responses_provider_insert" on public.enquiry_responses;
create policy "enquiry_responses_provider_insert"
  on public.enquiry_responses for insert to authenticated
  with check (
    status = 'offered'
    and public.enquiry_open_for_quotes(enquiry_responses.enquiry_id)
    and (
      (select public.is_admin())
      or public.is_provider_member(enquiry_responses.facility_id, 'requests.quote')
      or exists (
        select 1 from public.ibp b
        where b.id = enquiry_responses.ibp_id
          and b.user_id = ((select auth.uid()))::text
      )
    )
  );
