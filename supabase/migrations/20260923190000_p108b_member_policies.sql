-- P1-08b (1 of 2) · Swap the RLS policies from owner-only to membership
--
-- Every policy below currently says, in one shape or another:
--
--   exists (select 1 from providers p
--            where p.id = <table>.provider_id and p.owner_id = auth.uid())
--
-- and becomes `public.is_provider_member(<provider_id>, '<permission>')`.
--
-- **This is behaviour-identical today.** `is_provider_member` checks
-- `providers.owner_id = auth.uid()` first and independently, so with no staff
-- invited every one of these evaluates exactly as it does now. That is the
-- point of doing it before the first staff account exists rather than
-- alongside it: the regression surface is the whole provider app, and here it
-- can be checked against a known-good baseline.
--
-- ── Permission mapping, and why it is not uniform ─────────────────────────
--
-- A bare `is_provider_member(id)` means "anyone on staff here". That is right
-- for the day's work — the inbox, the catalogue, what we're licensed to sell.
-- It is wrong for three things, which are tightened deliberately:
--
--   provider_private        OWNER PII AND TAX IDs. It holds owner_email,
--                           owner_phone, business_registration_number,
--                           tin_number and admin_notes. Handing that to every
--                           counter staffer because they can see the orders
--                           board would be a real leak, and is exactly the
--                           kind of thing a mechanical swap gets wrong.
--                           Gated on `settings.manage` (owner + admin).
--   facility_subscriptions  Billing. `settings.manage`.
--   provider_credentials    Licence documents and their numbers.
--                           `profile.edit` (owner + admin).
--   provider_activity_log   The audit trail — oversight, not day work.
--                           `staff.manage` (owner, admin, dept manager).
--
-- Each of those is a WIDENING of nothing today (only owners exist) and a
-- restriction later. None of them narrows what an owner can do.
--
-- The non-provider branches of these policies — `ibp`, the patient's own
-- enquiry, `is_admin()` vs `is_app_admin()`, `request_user_id()` — are
-- preserved exactly. Note that `enquiry_responses` uses `is_admin()` while
-- the `provider_*` tables use `is_app_admin()`; that difference is
-- pre-existing and is left alone here.

-- ── provider_capabilities ────────────────────────────────────────────────
drop policy if exists "provider_capabilities owner and admin read" on public.provider_capabilities;
create policy "provider_capabilities owner and admin read"
  on public.provider_capabilities for select to authenticated
  using (
    (select public.is_app_admin())
    or public.is_provider_member(provider_id)
  );

-- ── provider_catalogue_items ─────────────────────────────────────────────
drop policy if exists "catalogue_items owner and admin read" on public.provider_catalogue_items;
create policy "catalogue_items owner and admin read"
  on public.provider_catalogue_items for select to authenticated
  using (
    (select public.is_app_admin())
    or public.is_provider_member(provider_id)
  );

-- ── provider_credentials — licence documents ─────────────────────────────
drop policy if exists "provider_credentials owner and admin read" on public.provider_credentials;
create policy "provider_credentials owner and admin read"
  on public.provider_credentials for select to authenticated
  using (
    (select public.is_app_admin())
    or public.is_provider_member(provider_id, 'profile.edit')
  );

-- ── provider_inbox — the alerts feed, any member ─────────────────────────
drop policy if exists "provider_inbox owner and admin read" on public.provider_inbox;
create policy "provider_inbox owner and admin read"
  on public.provider_inbox for select to authenticated
  using (
    (select public.is_app_admin())
    or public.is_provider_member(provider_id)
  );

drop policy if exists "provider_inbox owner and admin mark read" on public.provider_inbox;
create policy "provider_inbox owner and admin mark read"
  on public.provider_inbox for update to authenticated
  using (
    (select public.is_app_admin())
    or public.is_provider_member(provider_id)
  )
  with check (
    (select public.is_app_admin())
    or public.is_provider_member(provider_id)
  );

-- ── provider_practitioner_details ────────────────────────────────────────
drop policy if exists "practitioner_details owner and admin read" on public.provider_practitioner_details;
create policy "practitioner_details owner and admin read"
  on public.provider_practitioner_details for select to authenticated
  using (
    (select public.is_app_admin())
    or public.is_provider_member(provider_id)
  );

drop policy if exists "practitioner_details owner insert" on public.provider_practitioner_details;
create policy "practitioner_details owner insert"
  on public.provider_practitioner_details for insert to authenticated
  with check (public.is_provider_member(provider_id, 'profile.edit'));

drop policy if exists "practitioner_details owner update" on public.provider_practitioner_details;
create policy "practitioner_details owner update"
  on public.provider_practitioner_details for update to authenticated
  using (public.is_provider_member(provider_id, 'profile.edit'))
  with check (public.is_provider_member(provider_id, 'profile.edit'));

-- ── provider_private — owner PII and tax identifiers ─────────────────────
drop policy if exists "provider_private owner and admin read" on public.provider_private;
create policy "provider_private owner and admin read"
  on public.provider_private for select to authenticated
  using (
    (select public.is_app_admin())
    or public.is_provider_member(provider_id, 'settings.manage')
  );

-- ── provider_vendor_details ──────────────────────────────────────────────
drop policy if exists "vendor_details owner and admin read" on public.provider_vendor_details;
create policy "vendor_details owner and admin read"
  on public.provider_vendor_details for select to authenticated
  using (
    (select public.is_app_admin())
    or public.is_provider_member(provider_id)
  );

drop policy if exists "vendor_details owner insert" on public.provider_vendor_details;
create policy "vendor_details owner insert"
  on public.provider_vendor_details for insert to authenticated
  with check (public.is_provider_member(provider_id, 'profile.edit'));

drop policy if exists "vendor_details owner update" on public.provider_vendor_details;
create policy "vendor_details owner update"
  on public.provider_vendor_details for update to authenticated
  using (public.is_provider_member(provider_id, 'profile.edit'))
  with check (public.is_provider_member(provider_id, 'profile.edit'));

-- ── provider_activity_log — oversight ────────────────────────────────────
drop policy if exists "provider_activity_log owner and admin read" on public.provider_activity_log;
create policy "provider_activity_log owner and admin read"
  on public.provider_activity_log for select to authenticated
  using (
    (select public.is_app_admin())
    or public.is_provider_member(provider_id, 'staff.manage')
  );

-- ── enquiry_responses — the quote (P1-02) ────────────────────────────────
--
-- The `ibp` branch and the patient's own-enquiry branch are unchanged. Only
-- the `providers.owner_id` sub-clause moves to the helper. `facility_id` is
-- the provider id on this table, a legacy name kept by the P0-10 rename.
drop policy if exists "enquiry_responses_select_scoped" on public.enquiry_responses;
create policy "enquiry_responses_select_scoped"
  on public.enquiry_responses for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.medication_enquiries me
      where me.id = enquiry_responses.enquiry_id
        and me.user_id = (select auth.uid())
    )
    or public.is_provider_member(enquiry_responses.facility_id)
    or exists (
      select 1 from public.ibp b
      where b.id = enquiry_responses.ibp_id
        and b.user_id = ((select auth.uid()))::text
    )
  );

drop policy if exists "enquiry_responses_provider_insert" on public.enquiry_responses;
create policy "enquiry_responses_provider_insert"
  on public.enquiry_responses for insert to authenticated
  with check (
    status = 'offered'
    and exists (
      select 1 from public.medication_enquiries me
      where me.id = enquiry_responses.enquiry_id
        and me.status = 'pending_match'
    )
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

drop policy if exists "enquiry_responses_provider_update" on public.enquiry_responses;
create policy "enquiry_responses_provider_update"
  on public.enquiry_responses for update to authenticated
  using (
    (select public.is_admin())
    or (
      status = 'offered'
      and (
        public.is_provider_member(enquiry_responses.facility_id, 'requests.quote')
        or exists (
          select 1 from public.ibp b
          where b.id = enquiry_responses.ibp_id
            and b.user_id = ((select auth.uid()))::text
        )
      )
    )
  )
  with check (
    (select public.is_admin())
    or (
      status = any (array['offered', 'declined'])
      and (
        public.is_provider_member(enquiry_responses.facility_id, 'requests.quote')
        or exists (
          select 1 from public.ibp b
          where b.id = enquiry_responses.ibp_id
            and b.user_id = ((select auth.uid()))::text
        )
      )
    )
  );

drop policy if exists "enquiry_responses_provider_delete" on public.enquiry_responses;
create policy "enquiry_responses_provider_delete"
  on public.enquiry_responses for delete to authenticated
  using (
    (select public.is_admin())
    or (
      status = 'offered'
      and (
        public.is_provider_member(enquiry_responses.facility_id, 'requests.quote')
        or exists (
          select 1 from public.ibp b
          where b.id = enquiry_responses.ibp_id
            and b.user_id = ((select auth.uid()))::text
        )
      )
    )
  );

-- ── facility_subscriptions — billing ─────────────────────────────────────
--
-- The original used `request_user_id()::uuid` rather than `auth.uid()`;
-- `is_provider_member` uses `auth.uid()`. Both resolve to the signed-in user
-- — `is_app_admin()` in the very same policy already relies on
-- `request_user_id()` and the two agree — so this is not a behaviour change,
-- but it is the one place in this migration where the underlying identity
-- call differs from what was written before.
drop policy if exists "facility_subscriptions_select" on public.facility_subscriptions;
create policy "facility_subscriptions_select"
  on public.facility_subscriptions for select to authenticated
  using (
    (select public.is_app_admin())
    or public.is_provider_member(facility_id, 'settings.manage')
  );
