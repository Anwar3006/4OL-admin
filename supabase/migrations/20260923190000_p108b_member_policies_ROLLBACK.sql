-- ROLLBACK for 20260923190000_p108b_member_policies.sql
--
-- Restores the owner-only expressions that were live on prod immediately
-- before that migration, read out of `pg_policy` in the same session.
--
-- Run this BEFORE P1-08a's rollback: these policies call
-- `is_provider_member`, and dropping that function first would leave every
-- one of them referencing a function that no longer exists.
--
-- Note the two identity helpers are NOT interchangeable and are restored as
-- found: `enquiry_responses` used `is_admin()`, the `provider_*` tables used
-- `is_app_admin()`, and `facility_subscriptions` used `request_user_id()::uuid`
-- rather than `auth.uid()`.
--
-- Rolling back does NOT remove staff access on its own if staff already
-- exist — it removes the only thing that grants it, so those people lose
-- access entirely. That is the intended effect of undoing this phase.

drop policy if exists "provider_capabilities owner and admin read" on public.provider_capabilities;
create policy "provider_capabilities owner and admin read"
  on public.provider_capabilities for select to authenticated
  using (
    (select is_app_admin())
    or exists (select 1 from providers p
               where p.id = provider_capabilities.provider_id
                 and p.owner_id = (select auth.uid()))
  );

drop policy if exists "catalogue_items owner and admin read" on public.provider_catalogue_items;
create policy "catalogue_items owner and admin read"
  on public.provider_catalogue_items for select to authenticated
  using (
    (select is_app_admin())
    or exists (select 1 from providers p
               where p.id = provider_catalogue_items.provider_id
                 and p.owner_id = (select auth.uid()))
  );

drop policy if exists "provider_credentials owner and admin read" on public.provider_credentials;
create policy "provider_credentials owner and admin read"
  on public.provider_credentials for select to authenticated
  using (
    (select is_app_admin())
    or exists (select 1 from providers p
               where p.id = provider_credentials.provider_id
                 and p.owner_id = (select auth.uid()))
  );

drop policy if exists "provider_inbox owner and admin read" on public.provider_inbox;
create policy "provider_inbox owner and admin read"
  on public.provider_inbox for select to authenticated
  using (
    (select is_app_admin())
    or exists (select 1 from providers p
               where p.id = provider_inbox.provider_id
                 and p.owner_id = (select auth.uid()))
  );

drop policy if exists "provider_inbox owner and admin mark read" on public.provider_inbox;
create policy "provider_inbox owner and admin mark read"
  on public.provider_inbox for update to authenticated
  using (
    (select is_app_admin())
    or exists (select 1 from providers p
               where p.id = provider_inbox.provider_id
                 and p.owner_id = (select auth.uid()))
  )
  with check (
    (select is_app_admin())
    or exists (select 1 from providers p
               where p.id = provider_inbox.provider_id
                 and p.owner_id = (select auth.uid()))
  );

drop policy if exists "practitioner_details owner and admin read" on public.provider_practitioner_details;
create policy "practitioner_details owner and admin read"
  on public.provider_practitioner_details for select to authenticated
  using (
    (select is_app_admin())
    or exists (select 1 from providers p
               where p.id = provider_practitioner_details.provider_id
                 and p.owner_id = (select auth.uid()))
  );

drop policy if exists "practitioner_details owner insert" on public.provider_practitioner_details;
create policy "practitioner_details owner insert"
  on public.provider_practitioner_details for insert to authenticated
  with check (
    exists (select 1 from providers p
            where p.id = provider_practitioner_details.provider_id
              and p.owner_id = (select auth.uid()))
  );

drop policy if exists "practitioner_details owner update" on public.provider_practitioner_details;
create policy "practitioner_details owner update"
  on public.provider_practitioner_details for update to authenticated
  using (
    exists (select 1 from providers p
            where p.id = provider_practitioner_details.provider_id
              and p.owner_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from providers p
            where p.id = provider_practitioner_details.provider_id
              and p.owner_id = (select auth.uid()))
  );

drop policy if exists "provider_private owner and admin read" on public.provider_private;
create policy "provider_private owner and admin read"
  on public.provider_private for select to authenticated
  using (
    (select is_app_admin())
    or exists (select 1 from providers p
               where p.id = provider_private.provider_id
                 and p.owner_id = (select auth.uid()))
  );

drop policy if exists "vendor_details owner and admin read" on public.provider_vendor_details;
create policy "vendor_details owner and admin read"
  on public.provider_vendor_details for select to authenticated
  using (
    (select is_app_admin())
    or exists (select 1 from providers p
               where p.id = provider_vendor_details.provider_id
                 and p.owner_id = (select auth.uid()))
  );

drop policy if exists "vendor_details owner insert" on public.provider_vendor_details;
create policy "vendor_details owner insert"
  on public.provider_vendor_details for insert to authenticated
  with check (
    exists (select 1 from providers p
            where p.id = provider_vendor_details.provider_id
              and p.owner_id = (select auth.uid()))
  );

drop policy if exists "vendor_details owner update" on public.provider_vendor_details;
create policy "vendor_details owner update"
  on public.provider_vendor_details for update to authenticated
  using (
    exists (select 1 from providers p
            where p.id = provider_vendor_details.provider_id
              and p.owner_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from providers p
            where p.id = provider_vendor_details.provider_id
              and p.owner_id = (select auth.uid()))
  );

drop policy if exists "provider_activity_log owner and admin read" on public.provider_activity_log;
create policy "provider_activity_log owner and admin read"
  on public.provider_activity_log for select to authenticated
  using (
    (select is_app_admin())
    or exists (select 1 from providers p
               where p.id = provider_activity_log.provider_id
                 and p.owner_id = (select auth.uid()))
  );

drop policy if exists "enquiry_responses_select_scoped" on public.enquiry_responses;
create policy "enquiry_responses_select_scoped"
  on public.enquiry_responses for select to authenticated
  using (
    (select is_admin())
    or exists (select 1 from medication_enquiries me
               where me.id = enquiry_responses.enquiry_id
                 and me.user_id = (select auth.uid()))
    or exists (select 1 from providers fp
               where fp.id = enquiry_responses.facility_id
                 and fp.owner_id = (select auth.uid()))
    or exists (select 1 from ibp b
               where b.id = enquiry_responses.ibp_id
                 and b.user_id = ((select auth.uid()))::text)
  );

drop policy if exists "enquiry_responses_provider_insert" on public.enquiry_responses;
create policy "enquiry_responses_provider_insert"
  on public.enquiry_responses for insert to authenticated
  with check (
    status = 'offered'
    and exists (select 1 from medication_enquiries me
                where me.id = enquiry_responses.enquiry_id
                  and me.status = 'pending_match')
    and (
      (select is_admin())
      or exists (select 1 from providers fp
                 where fp.id = enquiry_responses.facility_id
                   and fp.owner_id = (select auth.uid()))
      or exists (select 1 from ibp b
                 where b.id = enquiry_responses.ibp_id
                   and b.user_id = ((select auth.uid()))::text)
    )
  );

drop policy if exists "enquiry_responses_provider_update" on public.enquiry_responses;
create policy "enquiry_responses_provider_update"
  on public.enquiry_responses for update to authenticated
  using (
    (select is_admin())
    or (status = 'offered'
        and (exists (select 1 from providers fp
                     where fp.id = enquiry_responses.facility_id
                       and fp.owner_id = (select auth.uid()))
             or exists (select 1 from ibp b
                        where b.id = enquiry_responses.ibp_id
                          and b.user_id = ((select auth.uid()))::text)))
  )
  with check (
    (select is_admin())
    or (status = any (array['offered', 'declined'])
        and (exists (select 1 from providers fp
                     where fp.id = enquiry_responses.facility_id
                       and fp.owner_id = (select auth.uid()))
             or exists (select 1 from ibp b
                        where b.id = enquiry_responses.ibp_id
                          and b.user_id = ((select auth.uid()))::text)))
  );

drop policy if exists "enquiry_responses_provider_delete" on public.enquiry_responses;
create policy "enquiry_responses_provider_delete"
  on public.enquiry_responses for delete to authenticated
  using (
    (select is_admin())
    or (status = 'offered'
        and (exists (select 1 from providers fp
                     where fp.id = enquiry_responses.facility_id
                       and fp.owner_id = (select auth.uid()))
             or exists (select 1 from ibp b
                        where b.id = enquiry_responses.ibp_id
                          and b.user_id = ((select auth.uid()))::text)))
  );

drop policy if exists "facility_subscriptions_select" on public.facility_subscriptions;
create policy "facility_subscriptions_select"
  on public.facility_subscriptions for select to authenticated
  using (
    facility_id in (select fp.id from providers fp
                    where fp.owner_id = ((select request_user_id()))::uuid)
    or (select is_app_admin())
  );
