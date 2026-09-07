-- Medication enquiry response RLS policies.
--
-- `enquiry_responses` already had RLS enabled, but no table policies. These
-- policies keep customer access scoped to their own enquiries, let facility or
-- IBP owners manage only their own pending offers, and preserve admin access
-- for review/support workflows.

drop policy if exists enquiry_responses_select_scoped
  on public.enquiry_responses;
drop policy if exists enquiry_responses_provider_insert
  on public.enquiry_responses;
drop policy if exists enquiry_responses_provider_update
  on public.enquiry_responses;
drop policy if exists enquiry_responses_provider_delete
  on public.enquiry_responses;

create policy enquiry_responses_select_scoped
  on public.enquiry_responses
  for select
  to authenticated
  using (
    is_admin()
    or exists (
      select 1
      from public.medication_enquiries me
      where me.id = enquiry_responses.enquiry_id
        and me.user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.facility_profile fp
      where fp.id = enquiry_responses.facility_id
        and fp.owner_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.ibp b
      where b.id = enquiry_responses.ibp_id
        and b.user_id = (select auth.uid())::text
    )
  );

create policy enquiry_responses_provider_insert
  on public.enquiry_responses
  for insert
  to authenticated
  with check (
    status = 'offered'
    and exists (
      select 1
      from public.medication_enquiries me
      where me.id = enquiry_responses.enquiry_id
        and me.status = 'pending_match'
    )
    and (
      is_admin()
      or exists (
        select 1
        from public.facility_profile fp
        where fp.id = enquiry_responses.facility_id
          and fp.owner_id = (select auth.uid())
      )
      or exists (
        select 1
        from public.ibp b
        where b.id = enquiry_responses.ibp_id
          and b.user_id = (select auth.uid())::text
      )
    )
  );

create policy enquiry_responses_provider_update
  on public.enquiry_responses
  for update
  to authenticated
  using (
    is_admin()
    or (
      status = 'offered'
      and (
        exists (
          select 1
          from public.facility_profile fp
          where fp.id = enquiry_responses.facility_id
            and fp.owner_id = (select auth.uid())
        )
        or exists (
          select 1
          from public.ibp b
          where b.id = enquiry_responses.ibp_id
            and b.user_id = (select auth.uid())::text
        )
      )
    )
  )
  with check (
    is_admin()
    or (
      status in ('offered', 'declined')
      and (
        exists (
          select 1
          from public.facility_profile fp
          where fp.id = enquiry_responses.facility_id
            and fp.owner_id = (select auth.uid())
        )
        or exists (
          select 1
          from public.ibp b
          where b.id = enquiry_responses.ibp_id
            and b.user_id = (select auth.uid())::text
        )
      )
    )
  );

create policy enquiry_responses_provider_delete
  on public.enquiry_responses
  for delete
  to authenticated
  using (
    is_admin()
    or (
      status = 'offered'
      and (
        exists (
          select 1
          from public.facility_profile fp
          where fp.id = enquiry_responses.facility_id
            and fp.owner_id = (select auth.uid())
        )
        or exists (
          select 1
          from public.ibp b
          where b.id = enquiry_responses.ibp_id
            and b.user_id = (select auth.uid())::text
        )
      )
    )
  );
