# Provider Portal — Build Plan

> **What this is:** the start-to-finish task list for the 4 Our Life Facilities / IBP provider portal. It covers the database, the admin console (this repo) and the mobile monorepo (`../4-Our-Life-App`), which holds **two store apps**: the patient app *4 Our Life* and the new provider app *4 Our Life Business* (D14).
> **Companion brief (rationale, diagrams):** https://claude.ai/artifact/ThojkmCeBPRLkpoLLGp27T — Claude sessions read it with the Artifact tool (`action: "read"`). **This file is the source of truth for tasks.** If the two disagree, this file wins; then update the brief.
> **Written:** 19 Sept 2026, from audits of both repos and the production database (`rhbbxttxnvcziyqzptqs`).
> **Owner:** Anwar Sadat

---

## 0. Before you touch anything

- Read `CLAUDE.md`, `docs/ARCHITECTURE_BLUEPRINT.md` and `docs/cleanup-handoff.md`. The four rules there still apply:
  1. Pick the database client by where the code runs.
  2. Mobile contract changes must be **additive only**.
  3. Delete things only on evidence, never on reading.
  4. Each feature lives in one directory under `features/<name>/`.
- Check every column against `lib/db/database.types.ts` before querying it. Run `pnpm gen:types` after each migration.
- New RLS policies use `(select auth.uid())`, never a bare `auth.uid()`.
- Regenerate the mobile contract before any release that touches contracted tables, routes or RPCs: `bash scripts/cleanup/regenerate-mobile-contract.sh ../4-Our-Life-App`
- Every migration ships with a `*_ROLLBACK.sql`, following the existing pattern in `supabase/migrations/`.
- **Mobile paths:** once P0-17 lands, every mobile-app path in this file (for example `app/(app)/_layout.tsx`, `hooks/use-facilities.ts`) lives under `4-Our-Life-App/apps/consumer/`. New provider screens go in `apps/business/`, and shared code in `packages/shared/`.
- Tick a box only when the acceptance check passes. Add the PR or migration name next to the box.

---

## 1. Decisions log (final unless marked)

| # | Decision | Status |
|---|---|---|
| D1 | Five provider kinds: `care_facility`, `vendor`, `practitioner`, `trainer`, `ambulance_operator`. Partners (corporate, insurers, NGOs) come later. | ✅ final |
| D2 | **Vendor** is one kind. It covers pharmacies, OTC medicine sellers, supplement / natural-food / seeds-and-nuts sellers, herbal-product sellers, wholesalers and medical suppliers. What each may sell is set by its **capabilities**. | ✅ final |
| D3 | Capabilities apply to **every** kind. They are granted by approved credentials (licences) and revoked when those expire. Admins never hand-edit them, except as a logged override. | ✅ final |
| D4 | **No staff accounts.** One login per business, shared by its staff. One owner account may own several businesses (branches), with a branch switcher in the app. | ✅ final |
| D5 | **`account_types text[]`** (values `member`, `provider`, `partner`) decides which apps an account may sign into: `{member}` → the 4 Our Life app; `{provider}` → the Business app only (shared business logins); `{member,provider}` → both apps (sole operators such as a practitioner or trainer on their own phone); `partner` is reserved for the Phase 4 portal. Words: **member**, not patient or customer, because most users are healthy (fitness, cycle tracking, content). **provider** matches `providers` / `provider_kind` / Provider Premium. New business accounts get `{provider}`. | ✅ final (20 Sept) |
| D6 | Identity is **one `role` + one `account_types`**. `role` covers platform staff permissions (`user` or an `admin_platform_roles` row). `account_types` covers which apps. Drop `admin_role`, `is_admin` and `admin_permissions`. `user_type` stays only as a **read-only generated column** for old app builds (`customer` / `business_provider` / `both`) and is dropped once those builds age out. | ✅ final (20 Sept) |
| D7 | Rename `facility_profile` → **`providers`**, and keep a compatibility view named `facility_profile` (option C). | ✅ approved 19 Sept |
| D8 | Credentials are delivered from the server: email + WhatsApp, with SMS as the fallback. The dev-tunnel trigger is dropped. | ✅ final |
| D9 | Onboarding uses a **one-time sign-in link**, not a temporary password. First login shows a set-password overlay that keeps nagging until done (see P0-06). | ✅ final |
| D10 | **Paid chat is a premium feature, not a per-chat payment.** Patients get it through app-wide premium (`subscription_tiers.product_scope = 'full_access'`). Providers get it through provider premium. | ✅ final |
| D11 | Two provider premium tiers: **Provider Premium** (business side only) and **Provider Premium Plus** (business side + full app-wide premium for the owner's personal side). | ✅ final |
| D12 | **Escrow / order payments are ON HOLD** until the boss approves. Do not build money movement for orders. The ledger schema stays as it is. Subscription checkout is **not** blocked. | ⏸ waiting on boss |
| D14 | **Two store apps from one codebase.** The provider side ships as its own app, **"4 Our Life Business"**, built in a pnpm/Expo monorepo inside `4-Our-Life-App` (`apps/consumer`, `apps/business`, `packages/shared`). It is not a separate repo, and not a mode switch inside the patient app. Reasons: staff share one login on counter phones, so personal health data must stay off those phones; a lighter install; loud request alerts; its own store listing; independent releases. | ✅ approved 19 Sept |
| D13 | Prescription-medicine e-pharmacy (competing with the Pharmacy Council's national e-pharmacy platform, NEPP) gets built but is **off by default**, behind the feature flag `rx_epharmacy`. The rx credentials are still collected. | ✅ final |

---

## Phase 0 — Make it safe to open the door

Nothing in later phases ships before Phase 0 is done.

### P0-01 · CRITICAL: close the self-promotion hole in `PATCH /api/user/profile` — ✅ code done 20 Sept (not yet deployed)
`app/api/user/profile/route.ts` passed the whole request body into `.update()` using the service-role client. `prevent_role_escalation()` lets every `service_role` write through, so `{"role":"super_admin"}` worked for any logged-in user, and so did `user_type`.
- [x] Allow-list in **`lib/user-profile-patch.ts`**:
  - **Editable:** names, sex, dob, timezone, region, NHIS number, onboarding and prompt stamps, push, consent and WhatsApp preferences, legacy `expo_push_token`.
  - **Ignored silently** (the shipped app sends them): `user_id`, `avatar_url`, `email`.
  - **Rejected with a 400 that names the field:** `role`, `user_type`, `account_types`, `status` and every admin, system, security, FitCoins and staff column. Any unknown key is also rejected.
  - Values are type-checked. The server now stamps `whatsapp_opt_in_at`.
- [x] `requires_password_change` accepts only `false`. `Business/Security.tsx` uses this to clear the flag after a password change.
- [x] `phone_number`: an unchanged value passes (the edit form always sends it back). A different value returns 400 "Change your phone number through phone verification" (`/api/update-phone`).
- [x] A body with only ignored keys returns the current row with 200 instead of the old 400, so callers that merge `data` keep working.
- [x] `tests/unit/user-profile-patch.test.ts`: 25 tests, all passing. They cover the allow-list, the exact payloads sent by EditUserInfoForm, FitnessOnboarding and NotificationPreferences, and the route. For the route: `role: "super_admin"` → 400 with no `update()` call, a missing token → 401, a normal edit writes only allowed keys, and a changed phone → 400.
- [ ] Deploy to Vercel, then run `pnpm test:contract`. The route stays in the contract and only accepts less.
- **Accept:** met in code; confirm after deploy with `curl -X PATCH …/api/user/profile -d '{"role":"super_admin"}'` → 400.

### P0-01b · CRITICAL: the same hole through direct PostgREST — ✅ applied to prod 20 Sept
RLS "Users can update own profile" let a signed-in user update **any** column of their own row directly, and the mobile app's `updateProfileDirectly` fallback does exactly that. Only `role` was guarded.
- [x] Applied `supabase/migrations/20260920090000_protect_user_profile_columns.sql` to prod (migration name `protect_user_profile_columns`). Its rollback file sits next to it.
  - The BEFORE UPDATE trigger `trg_protect_user_profile_columns` rejects changes to admin, system, security, FitCoins and staff columns when `current_user in ('authenticated','anon')` and the caller isn't `is_admin()`.
- [x] Checks were run on prod against a real customer row. Each one ran inside a subtransaction that was rolled back, so no data changed (verified afterwards):
  - T1 `first_name` → allowed.
  - T2 `user_type` → 42501.
  - T3 `fitcoins_balance` → 42501.
  - T4 `role` → blocked by `prevent_role_escalation`.
  - T5 `requires_password_change = true` → 42501.
  - T6 phone change → 42501.
  - T7 preference change plus unchanged phone → allowed.
  - T8 `award_fitcoins` as service_role → allowed; as `authenticated` it's already "permission denied" (no EXECUTE).
  - T9 service_role `user_type` update → allowed.
  - T10 super_admin via browser client → allowed.
- [x] The security advisor shows no warning for the new function.
- [x] `account_types` was added to this trigger in P0-05 step 1 (20 Sept).

### P0-02 · CRITICAL: `facility_profile` RLS stop-gap — ✅ applied to prod 20 Sept
Migration `supabase/migrations/20260920100000_facility_profile_rls_stopgap.sql` (prod name `facility_profile_rls_stopgap`), with a rollback file next to it.
- [x] Dropped "Anyone can read active facilities" (`USING (true)` for anon + authenticated).
  - **anon** now sees only `status = 'active'`.
  - **authenticated** sees a row if any of these is true:
    - it's active or approved;
    - they're the owner;
    - they registered it (`submitted_by`, which covers registrars);
    - they're an admin (`is_app_admin()`);
    - they're staff holding `facilities.view` (`has_4ol_permission`). The admin console reads through the browser client, so this keeps it working.
- [x] Dropped "Owners manage own facility". `facility_profile_update_admin_or_owner` was replaced by `facility_profile_update_admin` (`is_app_admin()` only).
- [x] Dropped "Owners insert facility". `facility_profile_insert_admin` is now admin-only.
- [x] Checked that nothing legitimate breaks. Admin writes go through `getAdminClient()` (service role) or SECURITY DEFINER RPCs, and the mobile app never writes `facility_profile`.
- [x] Checks were run on prod inside a rolled-back subtransaction; state was verified unchanged afterwards. One facility was temporarily set to `pending` for the test.
  - C1 anon sees 2 of 3; the pending facility is hidden.
  - C2 an ordinary member sees 2; the pending facility is hidden.
  - C3 a member updating someone else's facility → 0 rows.
  - C4 a member inserting a facility → 42501.
  - C5 an owner self-featuring their own facility → 0 rows.
  - C6 an owner sees their own pending facility.
  - C7 super_admin sees all 3.
  - C8 super_admin update → 1 row.
- [x] The security advisor shows the same findings before and after, with nothing new.
- [ ] Not tested: a non-admin staff role holding `facilities.view` (analyst). No such user exists yet. Test it when the first analyst account is created.
- Still open until P0-10: **active** rows still expose the owner PII columns (`owner_email`, `person_contact_number`, `admin_notes`, `verification_documents`) to anon. P0-10 moves them to `provider_private`.

### P0-03 · HIGH: remove the dev-tunnel trigger — ✅ applied to prod 20 Sept
- [x] Migration `supabase/migrations/20260920110000_drop_dev_tunnel_facility_trigger.sql` (prod name `drop_dev_tunnel_facility_trigger`) drops `on_facility_created` and `handle_new_facility()`.
  - Its rollback restores the definitions with the trigger **disabled**, so a rollback can't reopen the leak.
- [x] Checks on prod:
  - A test facility insert (rolled back) queued **0** `pg_net` requests.
  - No function contains `devtunnels` or the secret.
  - None of the 5 remaining `facility_profile` triggers calls `net.http_post`.
  - No cron job references it.
  - No `/api/notify` route exists in either repo.
  - `register_facility_with_profile`-style inserts still work.
- [x] Recorded in `docs/cleanup-handoff.md` → "Data exposure record — `on_facility_created`": what was sent, where, the 3 affected facilities, and that no passwords were included.
- [ ] **Human:** shut down the dev tunnel `bx9dscmp` (VS Code / Azure dev tunnels account), purge any payloads it stored, and treat `4OurLife-WhatsApp` as leaked.
- [ ] **Human:** decide whether to tell the 3 facility owners (Act 843), and record the decision in the handoff doc.

### P0-04 · HIGH: close off `fitness_trainers` self-insert — ✅ applied to prod 20 Sept
It was worse than first recorded. The policy was "Anyone can insert fitness_trainers" `TO public WITH CHECK (true)`, and `anon` held INSERT, UPDATE and DELETE grants. So people who weren't logged in could create trainer rows, with any `is_verified` or `status`.
- [x] Migration `supabase/migrations/20260920120000_fitness_trainers_close_public_insert.sql` (prod name `fitness_trainers_close_public_insert`), with a rollback next to it.
  - Drops that policy and revokes INSERT, UPDATE and DELETE from `anon`.
  - Only "Admins can manage fitness_trainers" (admin, super_admin) can write now. That's the path the admin console's `useCreateTrainer` uses.
  - Reads are unchanged.
- [x] Checks on prod, all rolled back:
  - C1 anon insert → 42501 permission denied.
  - C2 member self-insert with `is_verified = true` → 42501 RLS.
  - C3 a member can still read trainers.
  - C4 a super_admin insert (admin console path) → allowed.
  - Row count is unchanged (0).
- [ ] Later: trainers onboard as providers (P0-10/P0-12) through a server-side flow that sets `fitness_trainers.provider_id`.

### P0-05 · Identity cleanup: one `role`, one `account_types` (D5, D6) — ✅ done 20 Sept (both DB steps on prod; admin code deployed; mobile code ships with the next release)

**Progress 20 Sept 2026. The work was split into two DB steps, so nothing breaks in between.**

- [x] **Step 1 applied to prod** (`supabase/migrations/20260920130000_account_types_step1.sql`, rollback next to it):
  - Added `account_types text[] not null default '{member}'`, with a CHECK and a GIN index.
  - Backfilled all rows: 5 facility owners became `{provider}`, the other 32 `{member}`. `user_type` was normalised (`facility_owner` → `business_provider`).
  - `role` is now NOT NULL with default `'user'`. `admin_role` was folded in: the one row was already `super_admin`.
  - **Two-way sync trigger** `trg_sync_account_types`: old writers that set `user_type` keep working, and new writers set `account_types`.
  - **Insert guard:** a client can only create its own profile as `role 'user'` / `{member}`.
  - `protect_user_profile_columns()` now also blocks self-changes to `account_types`.
  - `prevent_role_escalation()` rejects roles that aren't `user` and aren't in `admin_platform_roles`.
  - **`handle_new_user()` fix:** it read the account type from `raw_user_meta_data`, which any client can set at sign-up, so **anyone could sign up as `business_provider`**. It now reads `raw_app_meta_data.account_types`, which only the service role can set, and public sign-ups are always `{member}`.
- [x] **Step 1 checks on prod** (rolled back; `auth.users` left clean):
  - V2 a member upgrading their own `account_types` → 42501.
  - V3 a client inserting its own profile as a provider → 42501.
  - V4 a legacy service write `user_type = 'facility_owner'` → `{provider}` / `business_provider`.
  - V5 `account_types = {member,provider}` → `user_type = both`.
  - V6 `role = 'group_leader'` → 22023.
  - V7 a public sign-up with `user_type: business_provider` metadata → `{member}` / `customer`.
  - V8 `createUser` with `app_metadata.account_types: [provider]` → `{provider}`.
  - V9 a member editing their own name → allowed.
- [x] **Admin code written to the repo (not deployed):**
  - `app/api/dashboard/overview/route.ts`: `is_admin` → `role in ADMIN_ROLES`.
  - `hooks/usePermissions.ts`: compares against `'super_admin'`.
  - `features/facilities/ui/view-facility-dialog.tsx`: approve is gated by `useHasPermission("facilities.approve")`. The old check compared the JWT role and was always false.
  - `features/reports/api/reports.ts`: the admin list comes from `user_profiles.role`.
  - `actions/user.actions.ts`: filters go through `account_types` (`applyAccountTypeFilter`, which accepts old and new values).
  - `features/users/data/useUser.ts`: no longer writes `role` / `user_type` from the browser. Both hooks turned out to be unused.
  - `actions/facility-owner.actions.ts`: `createUser` passes `app_metadata.account_types = ['provider']`, stops writing `user_type`, and adds `provider` to an existing member's account types.
  - `app/(auth)/_components/RegisterForm.tsx`: stops sending `user_type`.
  - `types/formInput.ts`: adds `ACCOUNT_TYPE_OPTIONS`.
  - `schemas/user-profile.schema.ts`: adds `account_types`.
- [x] **Mobile code written to the repo (ships with the next release):**
  - `types.ts`: adds `account_types`.
  - `SignUpForm.tsx`: no longer sends `role` / `user_type` metadata.
  - `_layout.tsx`: the group-leader promo reads `conversation_members.role` (the old value is now rejected in `user_profiles`), and PostHog gets `account_types`.
  - `ChatsScreenContent.tsx`: `canCreateGroup` also accepts `account_types` containing `provider`.
- [x] Admin code deployed (20 Sept, by Anwar).
- [x] **Step 2 applied to prod** (`20260920140000_account_types_step2_finalize.sql`, prod name `account_types_step2_finalize`):
  - `user_type` is now `GENERATED ALWAYS AS (user_type_for_account_types(account_types)) STORED`.
  - `admin_role`, `is_admin` and `admin_permissions` are dropped, along with the `admin_role` enum.
  - The sync trigger is reduced to an insert guard, and `protect_user_profile_columns` no longer references the dropped columns.
  - Pre-flight was re-run just before applying: no function writes `user_type`, no policy, view or index uses the dropped columns, and no other column uses the `admin_role` type.
- [x] **Step 2 checks on prod** (rolled back; `auth.users` left clean):
  - F1 any write to `user_type` → 428C9 "can only be updated to DEFAULT".
  - F2 the service sets `account_types = {member,provider}` → `user_type = both`.
  - F3 a member upgrading their own `account_types` → 42501.
  - F4 a member editing their own name and preferences → allowed, and `user_type` still reads `customer`.
  - F5 a public sign-up whose metadata claims `business_provider` + `super_admin` → `{member}` / `customer` / role `user`.
  - The functions that still read `user_type` run fine: `get_user_dashboard_metrics`, `get_admin_dashboard_metrics`, `resolve_notification_segment`, and `get_effective_admin_permissions` (112 keys for super_admin).
  - Final distribution: 32 `{member}` / `customer`, 5 `{provider}` / `business_provider`.
  - The security advisor shows no new findings.
- [x] **Run `pnpm gen:types` again now.** `database.types.ts` must drop `admin_role`, `is_admin` and `admin_permissions` and mark `user_type` as generated. Then run `pnpm test` and `pnpm test:contract`. (Regenerated 20 Sept via the Supabase MCP connector — the CLI failed locally for lack of `SUPABASE_ACCESS_TOKEN`, and its `>` redirect had zeroed the file before failing; both fixed, see below. `pnpm type-check` passes clean against the new types.)
- [ ] Mobile: ship the P0-05 mobile changes in the next 4 Our Life release. Old builds keep working because `user_type` is still readable.
- [ ] Not changed on purpose: `resolve_notification_segment` / the notifications page and `get_user_dashboard_metrics` still **read** `user_type`. After step 2 that is a generated mirror, so reads keep working. Move them to `account_types` when those screens are next touched.
- [ ] No admin screen edits account types yet. `registerProviderAccount()` (P0-06) sets it. Add an admin API route (`requireAdminApiUser('users.edit')`) when a screen needs it.

The original task list follows for reference.
Current state (prod, 37 rows):
- `role`: `user` 35, `super_admin` 2, `registrar` 1.
- `user_type`: `customer` 28, `facility_owner` 5, `staff` 1, `user` 1, plus the 2 admins. No CHECK constraint.
- `admin_role`: set on 1 row and read by nothing.
- `is_admin`: read once.
- `admin_permissions` (column): unused.

Target:
- `role`: `user`, or a row in `admin_platform_roles`.
- `account_types text[]`: a non-empty subset of `member`, `provider`, `partner`.
- `user_type`: a **generated, read-only** column derived from `account_types`, kept for old app builds. `user_profiles` is a contract table, and `ChatsScreenContent.tsx:134` and `_layout.tsx:226-230` read `user_type`.

**Code first (admin repo, one PR):**
- [ ] `app/api/dashboard/overview/route.ts:48`: replace `is_admin = true` with `role in ADMIN_ROLES` (from `lib/admin-roles.ts`).
- [ ] `actions/facility-owner.actions.ts:66`: stop writing `user_type`. The file is replaced entirely by P0-06, which writes `account_types = '{provider}'`.
- [ ] `features/users/data/useUser.ts:161-162,195-196`: move the `role` / account-type writes behind an admin API route (`requireAdminApiUser('users.edit')`). The route writes `account_types`, **never** `user_type`, which becomes read-only.
- [ ] `actions/user.actions.ts:332,361`: `user_type in (business_provider, both)` becomes `'provider' = any(account_types)`.
- [ ] `hooks/usePermissions.ts:93`: compare against `'super_admin'`, not the label `"Super Admin"`.
- [ ] `features/facilities/ui/view-facility-dialog.tsx:95`: `session.user.role` is always `'authenticated'`, so use the profile role.
- [ ] `features/reports/api/reports.ts:109`: read the role from `user_profiles`, not from auth metadata.
- [ ] `types/formInput.ts`, `schemas/user-profile.schema.ts`, `notifications/page.tsx:124`: replace the user_type options with account-type checkboxes labelled Member / Provider / Partner.
- [ ] DB functions that read `user_type` (`get_user_dashboard_metrics`, `resolve_notification_segment`) switch to `account_types`. `create_ibp_profile` is retired with `ibp` (P0-12).

**Migration (after the code is deployed):**
```sql
-- 1. new column + backfill
alter table public.user_profiles
  add column account_types text[] not null default '{member}'
  constraint user_profiles_account_types_chk
    check (cardinality(account_types) >= 1
           and account_types <@ array['member','provider','partner']::text[]);

update public.user_profiles set account_types = case
    when user_type in ('facility_owner','business_provider') then '{provider}'::text[]
    when user_type = 'both' then '{member,provider}'::text[]
    else '{member}'::text[] end;               -- customer / staff / user / null → member

update public.user_profiles set role = case admin_role::text
    when 'support' then 'support_agent' when 'viewer' then 'analyst' else admin_role::text end
  where role = 'user' and admin_role is not null;  -- 0 rows today

-- 2. user_type becomes a read-only mirror for old app builds
alter table public.user_profiles drop column user_type;   -- no views depend on it (checked 19 Sept)
alter table public.user_profiles add column user_type text generated always as (
  case when account_types @> array['member','provider']::text[] then 'both'
       when 'provider' = any(account_types) then 'business_provider'
       else 'customer' end) stored;

alter table public.user_profiles
  alter column role set default 'user', alter column role set not null;
create index user_profiles_account_types_gin on public.user_profiles using gin (account_types);
```
- [ ] Rewrite `handle_new_user()`:
  - Set `account_types` from `raw_user_meta_data->'account_types'` when it's a valid array, otherwise map the legacy `raw_user_meta_data->>'user_type'` (`business_provider` → `{provider}`, `both` → `{member,provider}`, anything else → `{member}`).
  - Never insert `user_type`.
  - Only a service-role caller may create a non-`{member}` account. Public sign-ups are always `{member}`.
- [ ] Extend `prevent_role_escalation()` (make it `BEFORE INSERT OR UPDATE`):
  - Raise unless `NEW.role = 'user' or NEW.role in (select role from admin_platform_roles)`.
  - Apply the same admin-only guard to changes to `NEW.account_types`, so nobody can add `provider` or `partner` to themselves.
  - Keep the `service_role` bypass. It is only safe once P0-01 is done.
- [ ] Drop the legacy columns (last step, once nothing reads them):
  - `alter table public.user_profiles drop column admin_role, drop column is_admin, drop column admin_permissions;`
  - `drop type if exists public.admin_role;`
- [ ] `pnpm gen:types`, then regenerate the mobile contract. `user_type` still exists, so the contract diff is additive: it gains `account_types`.
- **Accept:**
  - Every row satisfies the CHECK.
  - The 5 former `facility_owner` rows now have `{provider}` / `user_type = 'business_provider'`.
  - `update user_profiles set user_type = 'both'` fails with "cannot update a generated column".
  - Admin login, the RBAC pages and mobile login all work.
  - `grep -rn "admin_role\b\|is_admin\b" app features lib hooks` finds nothing except `is_admin()` / `is_app_admin()` SQL function calls.

**Mobile (next release of the 4 Our Life app, then the Business app from day one):**
- [ ] `app/(app)/_layout.tsx:237`: the `profile.role === 'group_leader'` check should read `conversation_members.role` instead. Old builds are harmless; they just won't show the promo modal.
- [ ] `types.ts:17-18`: add `account_types: ('member'|'provider'|'partner')[]`. New code reads `account_types`; `user_type` is read only by builds already in the stores.
- [ ] `components/auth/SignUpForm.tsx:208-209`: stop sending `role` / `user_type` metadata. `handle_new_user` defaults public sign-ups to `{member}`.

**Leave alone for now (delete-on-evidence rule):** the `trg_sync_role` trigger and the old Better Auth `"user"` table (2 rows). Also, `is_admin()` includes `registrar` while `is_app_admin()` does not; write that down in `lib/db/README.md` rather than renaming either.

- **Accept:** no row violates the CHECK; the admin login, RBAC pages and mobile login all work; `grep -rn "admin_role\b\|is_admin\b" app features lib hooks` finds nothing except `is_admin()` / `is_app_admin()` SQL function calls.

### P0-06 · Provider account creation and credential delivery (D8, D9) — 🟡 admin-repo half done 20 Sept; mobile half blocked on P0-17
Replaces `actions/facility-owner.actions.ts`, the manual copy step in `facility-credentials-modal.tsx`, and the dropped trigger.

**Server:**
- [x] `features/providers/api/register-account.ts` → `registerProviderAccount(input)`, guarded by `requireAdminApiUser('providers.create')`. `providers.create` was added to the RBAC catalog and granted to **admin and registrar** (migration below).
  1. `auth.admin.createUser({ email, email_confirm: true, user_metadata: {...}, app_metadata: { account_types: ['provider'] } })`, no password.
  2. Sets `user_profiles.requires_password_change = true`.
  3. Creates the facility row via `register_facility_with_profile` (unchanged — `create_provider` is P0-10).
  4. Calls `deliverProviderInvite()`.
  - Existing owner (same email) → adds `provider` to their `account_types`, no second account.
  - `listUsers({perPage:1000})` replaced with `get_user_id_by_email(p_email)` (new RPC, service_role only, mirrors `auth_user_exists_by_email`).
  - One route call now does what used to be three browser round trips (`createFacilityOwnerAccount` action + `useCreateFacilityProfile` mutation + `notifyFacilityRegistration` action) — fewer Ghana round trips.
- [x] `lib/provider-invite.ts` → `deliverProviderInvite({ userId, providerId, facilityName, email, phone, whatsapp, skipWhatsApp? })`. Re-entrant: also used by "Resend invite" and by the webhook's async SMS fallback (each call mints a fresh magic link — nothing is stored to resend).
  - Link built from `properties.hashed_token`, never `action_link`.
  - Email always (SendGrid, new `components/emails/provider-invite.tsx`).
  - WhatsApp only when `TWILIO_PROVIDER_INVITE_TEMPLATE_SID` is set (still unset — Meta approval pending) and `checkWhatsAppAvailability()` is true.
  - SMS fallback via `sendSMS()`, <160 chars.
  - `destination_masked` via `lib/masking.ts`; never logs/stores the link or token.
- [x] `app/api/webhooks/twilio-status/route.ts`: `twilio.validateRequestWithBody`, updates `credential_deliveries` by `provider_message_id`, triggers the SMS-only fallback on `failed`/`undelivered`.
- [x] Migration `20260920150000_provider_invite_foundation.sql` (rollback alongside), applied to prod 20 Sept:
  - `credential_deliveries` table, exactly as specified, RLS admins-only read.
  - `get_user_id_by_email(p_email)`.
  - `providers.create` permission + grants to admin/registrar.
  - Dropped `twilio_whatsapp_handshakes` (1 row on prod, confirmed dead — its only writer/caller are removed in this same PR).
  - Checked in a rolled-back subtransaction first (RLS as super_admin/registrar/member, the RPC denied to authenticated, permission grants) — all passed — then applied for real. `get_advisors` shows no new findings. `pnpm gen:types` re-run against the new schema.

**The `/auth/welcome` landing page (admin repo, public route):**
- [x] `app/auth/welcome/page.tsx` — does not verify the token on load; shows Continue.
- [x] Continue → `fourourlifebusiness://auth/confirm?token_hash=…&type=magiclink`, added to `proxy.ts`'s public paths.
- [x] ~2s no-op → store badges + "Set password on the web" fallback (`verifyOtp` → `updateUser` → `PATCH /api/user/profile`). **Store badges are placeholders** (no real App Store/Play Store links — Business app isn't published, P0-16/17 pending); wire real links once it ships.
- [ ] **Human:** set the Auth → email OTP expiry to 86400s in the Supabase dashboard (not a migration — GoTrue config). Until then the default expiry applies.

**Mobile (Business app, `apps/business`):** — ⏸ blocked. `apps/business` doesn't exist yet; P0-17 (the monorepo split) hasn't been started, so there is nowhere for the deep-link handler or the set-password overlay to live. Pick this up once P0-17 lands.
- [ ] Deep-link handler for `auth/confirm`.
- [ ] Set-password overlay (D9).
- [ ] Later (optional): universal links.

**Admin UI:**
- [x] `facility-credentials-modal.tsx` rewritten: no password, ✓/✗ per channel with masked destination, **Resend invite** button (`useResendProviderInvite`).
- [x] Onboarding Requests: **Approve** on a `facility_owner` request opens the Add Facility dialog pre-filled (name/email/phone/region/gps_address/area from the request), instead of blind-creating a row — `onboarding_requests` doesn't collect enough to satisfy `facility_profile`'s NOT NULL columns (street, district, lat/lng, facility_type, ownership, image...). The request flips to `approved` only once that dialog's submit actually registers the account. `ibp_invite` requests keep the old plain status-flip (IBP retires in P0-12).

**Config:**
- [ ] **Human:** get the WhatsApp template approved (still blocked, per Blocked/waiting below).
- [ ] **Human:** register a Ghana sender ID for `SMS_ORIGINATION_ID`.
- [ ] **Human:** authenticate the SendGrid domain.
- [x] Removed `initiateWhatsAppHandshake()` (`lib/twilio.ts`) and dropped `twilio_whatsapp_handshakes` — proven unused (grep: single caller, both deleted in this PR; live row count: 1, confirmed dead before dropping).

- **Accept:** registering a test provider gives an email + `credential_deliveries` row(s) — verified via `pnpm build`/manual review; WhatsApp/SMS need real Twilio/AWS credentials to exercise end-to-end, and the phone-side "tap the link" half of the accept check needs the Business app, which doesn't exist yet (P0-17). Re-check this line once P0-17 and P0-16 land.

### P0-07 · Feature flags for this project — 🟡 admin side done 20 Sept; mobile gating not started
Uses the `feature_flags` table (`name, enabled, rollout_percentage`). **PostHog is the actual evaluation engine** (already wired client-side in the mobile app — `posthog-react-native`, `useFeatureFlags`); this table is the super admin's mirror/visibility layer, kept in sync both ways, eventually consistent (not strict):
- [x] Seeded the flags, all off (migration `seed_provider_feature_flags`, applied to prod): `provider_portal`, `rx_epharmacy` (D13), `provider_bookings`, `provider_paid_chat`, `order_payments` (D12).
- [x] **Backfilled the 23 flags that already existed in PostHog** (project `579614`) before this table existed — the mobile app's `category-*` visibility flags (migration `seed_existing_posthog_flags`, applied to prod). `enabled` mirrors PostHog's `active` bit **literally**, not a computed "is anyone actually seeing this" value — confirmed with Anwar: `active: true` + `rollout_percentage: 0` is an intentional staged state ("turn on when I want them on"), not disabled. `lib/posthog-admin.ts`'s `effectiveFlagState()` keeps `active` and `rollout_percentage` as two independent fields for exactly this reason.
- [x] **PostHog sync, both directions:**
  - Push: `app/api/settings/feature-flags` `PUT` (the existing Settings → Feature Flags toggle) now also best-effort pushes the change to PostHog via `lib/posthog-admin.ts` (new — a thin `fetch` wrapper around PostHog's Feature Flags REST API). **Configured and working** — `POSTHOG_PERSONAL_API_KEY`/`POSTHOG_PROJECT_ID`/`POSTHOG_HOST` are set in `.env.local` (key scoped to Feature flags: read at minimum; verified live against prod PostHog on 20 Sept). Never blocks the local save if PostHog fails.
  - Pull: `app/api/settings/feature-flags/sync` (`GET`, mirrors `features/reports/api/cron.ts`'s `CRON_SECRET` bearer pattern) now does two things: reconciles flags we already track, and **discovers** PostHog flags we don't have a row for yet (which is how the 23 backfilled flags will stay current — any new PostHog flag created later shows up here automatically, not just at seed time). Runs on a `vercel.json` cron (every 30 min) and via a "Sync now" button in Settings → Feature Flags.
  - Closed a pre-existing gap while in that route: the `PUT` handler never called `logSettingsChange()` even though `feature_flags` was already a valid audit area — now it does.
- [ ] `provider_portal` gates **public self-onboarding** ("Request access") in the Business app — mobile work, blocked on P0-17/P0-16 same as the rest of the Business app.
- [ ] Patient app: leave `BUSINESS_PROVIDER_ENABLED = false` (`app/(app)/_layout.tsx:37`) as it is — untouched, unchanged. Removed along with the old business code in P0-18.

---

## Phase 0b — Provider data model (D1–D4, D7)

> **DB side done 21 Sept 2026** (all of P0-10, P0-11, P0-12). A database-access session applied every migration below directly to prod (`rhbbxttxnvcziyqzptqs`), verified each one in a rolled-back dry run first, checked `get_advisors` before and after, and regenerated `lib/db/database.types.ts`. **No application code was touched.** Read **"P0-10/11/12 → application code handoff"** right after P0-12 before writing any UI/route/action against these tables — it lists exactly which existing admin-console files now query columns that moved, several of which are broken *right now* until fixed.

### P0-10 · Rename to `providers` and add the lookup tables — ✅ DB done 21 Sept (migrations below)
- [x] **Lookup tables.** `provider_kind` enum, `provider_types`, `capabilities`, `credential_types`, `provider_type_requirements`. Migration `provider_lookup_tables`. All four are RLS-enabled: readable by anon+authenticated, writable by `is_app_admin()` only — the P0-14 Settings lookup editors can use this today, no new migration needed for that screen.
- [x] **Seeded `provider_types`** — all 30 keys from the list below, `directory_category`/`icon` left null (cosmetic, set later from the Settings editor).
  - `hospital_clinic`, `dental_clinic`, `eye_clinic`, `physio_centre`, `osteopathy_centre`, `prosthetics_centre`, `psychiatric_centre`, `care_home`, `maternity_home`, `diagnostic_lab`, `imaging_centre`, `health_school`, `herbal_centre`
  - `pharmacy`, `otc_medicine_seller`, `supplement_shop`, `healthy_food_shop`, `herbal_product_seller`, `wholesaler`, `medical_supplier`
  - `doctor`, `nurse_midwife`, `physiotherapist`, `dietitian`, `optometrist`, `counsellor`
  - `personal_trainer`, `gym`, `event_organiser`
  - `ambulance_service`
- [x] **Seeded `capabilities`** — all 21 keys, `applies_to` set per group below, `requires_item_review` left at its default `true` for all of them (also a P0-14 Settings-editor decision, not a migration).
  - Vendor: `rx_medicines`, `otc_medicines`, `supplements`, `herbal_products`, `healthy_foods`, `medical_devices`, `wholesale`
  - Care facility: `bed_tracking`, `lab_tests`, `imaging`, `maternity`, `nhis_accredited`
  - Practitioner: `prescribe`, `video_consult`, `home_visits`, `answer_enquiries`
  - Trainer: `group_classes`, `outdoor_events`, `sell_programmes`
  - Ambulance: `basic_life_support`, `advanced_life_support`
- [x] **Seeded `credential_types`** (regulator in brackets) with a first-pass `grants` and `provider_type_requirements` mapping (54 rows) — **admin-editable data, not verified against real regulator rules**; correct it from the Settings editor once P0-14 exists, no migration needed. `basic_life_support`/`advanced_life_support` have no credential granting them yet (no paramedic-cert type in this seed list, Phase 3 territory) — they're `admin_override`-only until one is added.
  - `hefra_facility_licence` (HeFRA)
  - `pcg_premises_licence`, `pcg_epharmacy_reg`, `pcg_chemical_seller_licence`, `pcg_wholesale_licence` (PCG)
  - `fda_product_reg`, `fda_device_reg` (FDA)
  - `mdc_reg` (MDC), `nmc_reg` (NMC), `ahpc_reg` (AHPC), `gpc_reg` (GPC), `tmpc_licence` (TMPC), `nhia_accreditation` (NHIA)
  - `business_reg` (ORC), `trainer_cert` (admin-checked)
- [x] `alter table facility_profile rename to providers`. All 20 foreign keys followed automatically (verified count was 20, not 21 — no functional difference). Migration `rename_providers_and_compat_layer`.
- [x] Added `kind`, `provider_type` (FK), `verification_status`, `description`, `is_online_only`. Added `suspended`/`draft` to `facility_status_enum` in its own prior migration (`facility_status_enum_add_values`), per the ADD VALUE rule.
- [x] Renamed `facility_name` → `name`.
- [x] Backfilled the 3 rows exactly as specified (pharmacy→vendor/pharmacy, home→care_facility/care_home, dental_clinic→care_facility/dental_clinic), set `kind`/`provider_type` NOT NULL, dropped `facility_type` and `facility_type_enum` (confirmed via `pg_attribute` that no other column anywhere used that type before dropping it).
- [x] `provider_private` created and backfilled from the 8 named columns (all 3 rows' worth); those columns dropped from `providers`. `status_reason` also moved, as PLAN.md's own bullet says, even though the compat-view bullet below doesn't call it out separately.
- [x] **Compatibility view `facility_profile`** — with one addition beyond the spec: **`security_invoker = true`** alongside `security_barrier`. Without it, `get_advisors` flagged the view as ERROR-level `security_definer_view` the instant it was created (a plain view runs as its owner, which owns `providers` and so bypasses its RLS — Supabase's linter treats that as equivalent to `SECURITY DEFINER`). Verified in a dry run, as literal `anon`/`authenticated` roles, that turning on `security_invoker` returns the identical 3 active rows — the view's own WHERE and `providers`' RLS are redundant-but-consistent for this table, so this closes the finding with no behaviour change. Fixed in a follow-up migration, `facility_profile_view_security_invoker`.
  - Public columns only — **also excludes `hefra_registration_number` and `verification_documents`**, ahead of P0-11 actually moving those columns off `providers`. This is the fix for P0-02's still-open item ("active rows still expose owner PII... P0-10 moves them to `provider_private`") landing a migration early, since both were flagged there by name.
  - Aliases `name AS facility_name` and `provider_type AS facility_type`, plus every other original public column, unchanged.
  - Shows rows where `status='active' and kind in ('care_facility','vendor')`, or the reader is the owner, or `is_app_admin()` — exactly as specified.
  - `revoke insert, update, delete ... from anon, authenticated`; **`service_role` keeps full DML** on the view (granted explicitly) because `information_schema.views` confirms it's a Postgres auto-updatable view for simple column UPDATEs — `actions/facility-admin.actions.ts`'s `adminToggleFacilityFeatured`/`adminToggleFacilityTopRated` (both call `.from("facility_profile").update(...)` via `getAdminClient()`) keep working with **no app-code change needed**.
  - Checked the mobile repo directly (`../4-Our-Life-App/hooks/use-facilities.ts:89,153,374`): all three queries use `.select('*')` and never name a removed column, so they're unaffected. One thing to know for later: `services/searchAllTables.ts` in that repo lists `first_name`, `last_name`, `person_contact_number` as searchable `facility_profile` columns for its generic cross-table search utility — those three are gone from the view now, so a search hitting the facility_profile branch of that utility will error for that table (not checked whether/where this utility is wired into a screen; flagged for whoever next touches mobile search).
- [x] **RLS on `providers`** — turned out to need **no behaviour change at all**: P0-02 (20 Sept) had already removed owner INSERT/UPDATE from `facility_profile`, so the existing 6 policies already implemented "public reads active; owners read their own; owners have no direct write; admins have everything." Renamed them from `facility_profile_*` to `providers_*` for clarity and dropped the one redundant permissive policy (`facility_profile_super_admin_all` — `is_app_admin()` already covers `super_admin`).
- [x] **RPCs:**
  - `update_my_provider(p_id, p_patch jsonb)` — exact allow-list from the spec (name, description, business_hours, contact_number, whatsapp_number, email, media_urls, featured_image_url, amenities, keywords). Unknown keys are silently ignored, not rejected, since the function only ever reads these keys by name.
  - `create_provider(p_admin_id, p_owner_id, p_kind, p_provider_type, p_first_name, p_last_name, p_phone_number, p_provider_data jsonb)` (admin/registrar) — the new, general, kind-first RPC. Validates `p_provider_type` against `provider_types` for the given `p_kind`. **Nothing calls it yet** — see the handoff section for what needs wiring.
  - `get_my_provider_context()` — built in the P0-11 migration batch instead (`provider_credentials_and_capabilities`), not here, because its `capabilities[]` column needs `provider_capabilities`, which doesn't exist until P0-11. Returns exactly the shape specified, scoped to `owner_id = auth.uid()`.
- **Accept:** met. The 3 rows show through `facility_profile` (verified: exactly 3 rows returned, correct `facility_type`/`facility_name` aliases). Anon cannot see `owner_email` — the column no longer exists anywhere the anon role can reach (moved to `provider_private`, RLS admin/owner-only). `get_my_provider_context()`'s query logic returns `kind = 'vendor'` for the pharmacy row by construction (verified the underlying data — `owner_id`/`kind` are correct on the `providers` row); not independently re-run as an authenticated pharmacy-owner session since no such session exists in this database-only pass.

### P0-11 · Credentials and capabilities — ✅ DB done 21 Sept (migrations below)
- [x] Tables `provider_credentials` (unique on `(credential_type, number)`, indexed on `provider_id`/`status`/`expires_at where status='verified'`) and `provider_capabilities` (PK `(provider_id, capability)`, plus a CHECK that `admin_override` rows always carry `override_reason` and no `credential_id`, and `credential` rows always carry a `credential_id`). RLS: owner+admin read, admin-only direct write (owners only ever reach these through `submit_credential`/the override RPCs below, which are `SECURITY DEFINER` and bypass RLS). Migration `provider_credentials_and_capabilities`.
- [x] Private storage bucket `provider-credentials` created (migration `provider_credentials_storage_bucket`) — **bucket only, no `storage.objects` RLS policy**, matching the existing `hcp-verification`/`job-documents`/`prescriptions` buckets exactly (none of them has one either). Access is signed-URL-only by convention here, issued server-side. **The signed-upload route (owner → own folder) and signed-read route (admin review) don't exist yet — that's the app-code half of "signed URLs only."**
- [x] Migrated `hefra_registration_number`/`verification_documents` into `provider_credentials` (a no-op on the 3 live rows — both columns were null/empty on all of them, checked before writing the migration), then dropped both columns from `providers`.
- [x] **Trigger `trg_provider_credential_status_change`** (`AFTER UPDATE OF status`): on `→ verified`, inserts every capability in `credential_types.grants` whose `capabilities.applies_to` includes the provider's `kind` (so a capability never gets granted to a kind it doesn't apply to, even if a `grants` array is miskeyed later), copies `expires_at`, then calls `recompute_provider_verification_status()`. Verified end-to-end in a dry run: verifying a `pcg_premises_licence` on the seeded pharmacy granted exactly `otc_medicines`.
- [x] Same trigger, on `→ expired`/`revoked`: `delete from provider_capabilities where credential_id = ...`, then recomputes verification_status. Also verified: expiring that same credential dropped the capability count back to 0.
  - `recompute_provider_verification_status(p_provider_id)`: `verified` once every `required_for_activation` row in `provider_type_requirements` for that provider's type has a matching verified credential; `expired` if it *was* `verified` and has since fallen below that; `pending` if it has some verified credentials but not all required ones; else `unverified`. This 4-state logic isn't explicitly specified in PLAN.md beyond the `verified` case — worth a product sanity check once real credentials start flowing.
- [x] `grant_provider_capability_override(p_provider_id, p_capability, p_reason)` (admin-only, raises if `p_reason` is blank) and a symmetrical `revoke_provider_capability(p_provider_id, p_capability)` (admin-only, not explicitly asked for in PLAN.md but added since there was otherwise no way to undo an override) — both write to `activity_logs`, both trigger `recompute_provider_verification_status` on revoke.
- [x] RPC `submit_credential(p_provider_id, p_type, p_number, p_document_path, p_issued, p_expires)` (owner-only, checked via `providers.owner_id = auth.uid()`).
- [x] **pg_cron `provider-credential-expiry-sweep`, daily at 07:00 UTC** (function `fn_provider_credential_expiry_sweep`, migration `provider_credential_expiry_cron`):
  - Push reminders at 30/7/1 days before `expires_at` via `dispatch_notification` — pure SQL, **works today**.
  - Email: also fires `net.http_post` at `https://rhbbxttxnvcziyqzptqs.supabase.co/functions/v1/send-provider-credential-reminders`, using the same `x-cron-secret`-from-vault pattern as `send-period-reminders`/`send-workout-reminders`. **That Edge Function doesn't exist yet** — `net.http_post` queues async and doesn't raise on a 404, so this is inert, not broken, until someone builds it (or repoints the job elsewhere). See the handoff section.
  - On the expiry day, sets `status='expired'` (which fires the trigger above — same code path as an admin manually expiring one). Never touches `providers.status` — no automatic suspension anywhere.
  - Zero verified credentials with an `expires_at` exist today, so this job is a no-op in production until real submissions exist.
- **Accept:** met and verified live in a dry run against the seeded pharmacy row — approving a `pcg_premises_licence` granted `otc_medicines`; setting that same credential `expired` removed it (capability count back to 0). "Hides dependent catalogue items from public reads" follows from the P0-12 catalogue RLS policy reading `provider_capabilities` at query time (built in the same session, see below) — not independently re-verified with a live catalogue row + anon session, but it's the same table the trigger just emptied, so it necessarily follows.

### P0-12 · Catalogue, kind extensions and audit log — 🟡 DB done 21 Sept; ibp/facility_offerings retirement still incomplete (see below)
- [x] `provider_catalogue_items` — `drug_id → drugs`, `capability_required → capabilities`, `regulatory_number`, full status CHECK (`draft/pending_review/published/rejected/archived`). Migration `provider_catalogue_and_kind_extensions`.
  - [x] Trigger `trg_catalogue_item_publish_guard`: raises if `status → published` while `capability_required` is set and the provider doesn't hold it. Verified in a dry run (tried to publish an `otc_medicines`-gated item on a provider with no capabilities yet → raised as expected).
  - [x] `upsert_catalogue_item(p_id, p_provider_id, p_patch jsonb)` (owner-only): forces `pending_review` instead of `published` when the resolved capability's `requires_item_review` is true, regardless of what status the caller asked for. `p_id = null` inserts; otherwise updates in place, scoped to `provider_id` so an owner can't edit another provider's item by guessing an id.
  - [x] Public (anon + authenticated) RLS: `status='published'` AND the owning provider is `active` AND (`capability_required is null` OR the provider still holds it) — this is the mechanism the P0-11 accept check leans on.
- [x] `provider_vendor_details` (fulfilment_modes, delivery_radius_km, min_order_amount) — unlike `providers` itself, owners get **direct** INSERT/UPDATE here via RLS (no RPC), since PLAN.md doesn't ask for the no-direct-write pattern on this table.
- [x] `provider_practitioner_details` (hcp_verification_id — unique FK to `hcp_verifications`, consult_modes, home_visit_radius_km, languages). Same direct-owner-write RLS shape.
- [x] `fitness_trainers.provider_id` (unique FK) and `ambulances.operator_id` (FK) — both added, both null on all existing rows (0 rows in either table today, so no backfill needed).
- [x] `provider_activity_log` (owner+admin read, no direct write — only the trigger writes) with `device_id` read from PostgREST's `request.headers` GUC (`current_setting('request.headers', true)::json ->> 'x-device-id'`, wrapped in an exception handler for contexts with no request, e.g. `pg_cron`). One shared trigger function, `fn_log_provider_activity`, attached to `providers`, `provider_credentials`, `provider_capabilities` and `provider_catalogue_items` — verified it fires and records `actor_kind` correctly in a dry run. **Heads up for later:** this logs *every* `providers` UPDATE, including the ones other triggers make internally (top-rated sync, rating recalculation, view-count bumps) — PLAN.md asks for exactly this ("every provider action... records the device"), but it means `provider_activity_log` will grow faster than the general `activity_logs` table once there's real traffic. Not fixed here since it's what was asked for; flagging in case it needs narrowing later.
- [x] `features/ibp/*` (the whole standalone IBP admin CRUD module, 15 files) and `app/api/ibp/*` (7 route files) deleted 21 Sept, along with `features/facilities/ui/offerings-section.tsx` and its call site in `add-facility-dialog.tsx`. Two dangling nav links to the deleted `/ibp` page (the sidebar's "IBP Businesses" item and Med Enquiry's "🏢 IBP Wholesalers" quick-link) were left behind and have since been removed.
- [ ] **`ibp`, `ibp_products`, `ibp_activity_log` are NOT safe to drop yet — do not drop them on the strength of the line above.** A correctness pass on the application-code follow-up found that deleting `features/ibp/*` did not actually retire the table: `features/map/api/stats.ts`, `features/map/data/useMap.ts` (the map's "IBP Businesses" layer) and `features/medication-reminder/ui/PharmacyCampaignModal.tsx` all still do `.from("ibp")` directly — three live, unrelated features that were never part of the deleted CRUD module and were never touched. `lib/permissions.ts` still defines `ibp.view/edit/delete`, and `lib/shared-constants.ts` still lists `ibp` as a valid entity type. **`enquiry_responses.ibp_id` and `facility_offerings` are in the same state**: `actions/facility-admin.actions.ts`'s `adminInsertFacilityOfferings`/`adminDeleteFacilityOfferings` are still defined and still called from `features/facilities/data/useFacilities.ts`'s update path (the add-flow call site is gone, but the edit-flow one isn't), and `features/facilities/schema/types.ts` still declares an `offerings` field. None of this is broken — it's evidence the retirement isn't finished, which is exactly why the delete-on-evidence rule exists. Before dropping anything: delete the three still-live `ibp` call sites' *use of the table* (not the features themselves — the map layer and campaign modal are real functionality; they'd need a replacement or a product decision to remove them), the two orphaned `*Offerings` functions, and the `offerings` schema field, then re-run `pnpm knip` and grep for `.from("ibp")` / `.from('ibp')` / `facility_offerings` before touching the database.
- **Accept:** the catalogue/capability/kind-extension/activity-log part is met and spot-checked (see the trigger tests above). The `ibp` retirement half of the accept line (`pnpm knip` shows no references; contract suite passes) is **further from being met than "app code retirement pending" implied** — see above.

### P0-10/11/12 → application code handoff (read this before touching the Providers UI)

Everything in P0-10/P0-11/P0-12 above is live on prod. `lib/db/database.types.ts` is regenerated and includes every new table. `pnpm type-check` was run and is clean — **that does not mean nothing broke**: the shared clients aren't typed with `<Database>` (CLAUDE.md's own rule), so a query naming a column that just moved compiles fine and fails at request time.

**Application-code follow-up landed 21 Sept, then a correctness pass on that follow-up found and fixed one more round of bugs the same day. Status below is post-fix.**

- [x] `features/facilities/api/list.ts` and `export.ts` — repointed from the `facility_profile` view to `providers` directly, with `provider_private (status_reason, rejection_reason)` and `provider_credentials (number, credential_type, status)` pulled in via PostgREST embeds and mapped back onto the original `FacilityRow` shape, so `features/facilities/data/useFacilitiesApi.ts`'s type and the downstream `facilityColumns.tsx`/`review-facility-dialog.tsx` display components needed **no changes** — the API boundary absorbed the schema change. Verified working (a `test_list_query.ts` debug script confirmed the embed query against the live schema, then was deleted).
- [x] `features/facilities/api/status-detail.ts` — approve/reject now does two writes: `providers` (status, `status_changed_at`, `approved_by`/`approved_at`) and an upsert into `provider_private` (`status_reason`, `rejection_reason`). Not wrapped in one transaction/RPC — a `provider_private` write failure is caught and logged but doesn't fail the request, so a rejection reason could in principle go unsaved silently on a partial failure. Left as-is (low likelihood, `getAdminClient()` bypasses the RLS that would be the only realistic cause); revisit if it's ever seen in the wild.
- [x] **Found and fixed in the correctness pass:** `list.ts`'s `type` filter was newly broken — it correctly switched to filtering on `provider_type`, but `FacilitiesPage.tsx`'s dropdown still sends the legacy `FACILITY_TYPE_ENUM` values (`home`, `osteopathy_center`, `wellness_center`, ...), none of which match the new `provider_type` keys (`care_home`, `osteopathy_centre`, `gym`, ...) — most filter options silently returned zero rows. Fixed with a `LEGACY_FACILITY_TYPE_TO_PROVIDER_TYPE` map in `list.ts` mirroring the DB's `_resolve_legacy_provider_type()` exactly. Also: the HEFRA-number lookup in both `list.ts` and `export.ts` picked the first matching `provider_credentials` row regardless of status (a rejected/expired number would display as current) — now prefers `status='verified'`.
- [x] **Found and fixed:** two dangling nav links to the now-deleted `/ibp` page — the sidebar's "IBP Businesses" item (`navigation.ts`) and Med Enquiry's "🏢 IBP Wholesalers" quick-link (`MedEnquiryPage.tsx`). Both removed.
- [x] Storage: `app/api/providers/credentials/upload/route.ts` (owner, bearer-token auth via `getRequestUser` — the mobile-contract pattern, since the Business app is this route's real future caller — scoped to `${providerId}/${nanoid}`, ownership checked against `providers.owner_id`) and `app/api/providers/credentials/[provider_id]/[file_name]/route.ts` (admin, `requireAdminApiUser("facilities.view")`, redirects to a 1-hour signed URL) both built. Not yet wired into `submit_credential`'s `p_document_path` from any UI — there's no Credentials tab to call it from yet (P0-14).
- [x] Credential-expiry email: built as `app/api/cron/provider-credential-reminders/route.ts` + a `vercel.json` cron entry (`0 7 * * *`, `CRON_SECRET` bearer, matching the existing `/api/settings/feature-flags/sync` pattern) instead of the Supabase Edge Function `fn_provider_credential_expiry_sweep`'s `net.http_post` call was written for. **Found and fixed in the correctness pass:** the route's first version queried `user_profiles!inner(email, ...)` — `user_profiles` has no `email` column (it lives only in `auth.users`), the exact bug `lib/db/README.md` names by title ("the Marketing Subscribers tab 500'd for months on a `user_profiles.email` that does not exist"). It would have 500'd on every run and sent zero emails, silently. Fixed to resolve email per owner via `admin.auth.admin.getUserById()`, cached per request. The DB function's now-pointless `net.http_post` call (nothing was ever going to listen on that URL once the Edge Function was skipped) was removed in migration `provider_credential_expiry_drop_dead_edge_call`.
- [ ] `features/providers/api/register-account.ts` still calls `register_facility_with_profile`, not the newer `create_provider`. Still fine (unchanged signature/behaviour) — switch once the Add Provider form can pick a kind+type (P0-14).
- [ ] `types/formInput.ts`'s `FACILITY_TYPE_ENUM` (14 legacy values) is still what `add-facility-dialog.tsx` sends, handled DB-side by `_resolve_legacy_provider_type()` and now also client-list-side by `list.ts`'s own copy of that map (see above) — two copies of the same mapping is acceptable short-term duplication, not a bug, but both become dead code together once P0-14 rebuilds the dialog to read `provider_types` directly.
- [ ] `activity_logs.target_table` says `'providers'` now, not `'facility_profile'`, for new rows — not checked whether any admin screen filters an audit view by the old literal string.
- [ ] New RBAC permission keys from P0-14 (`providers.view`, `providers.edit`, `providers.verify`, `providers.suspend`, `catalogue.review`, `provider_types.manage`) still don't exist — every new RPC/route gates on `is_app_admin()` or the existing `facilities.view`/`facilities.approve` instead.
- [ ] `ibp`/`ibp_products`/`ibp_activity_log`/`enquiry_responses.ibp_id`/`facility_offerings` retirement is **not** where "features/ibp/\* deleted" makes it look — see the corrected P0-12 note above. Do not drop these on the strength of that deletion alone.
- [ ] `providers` NOT NULL constraints (`contact_number`, `whatsapp_number`, `featured_image_url`, `gps_address`, `street`, `post_code`, `area`, `district`, `region`, `ownership`, `latitude`, `longitude`) are unchanged — a product call for P0-16, not made here.
- [ ] Mobile (`../4-Our-Life-App`): `hooks/use-facilities.ts` is unaffected (`select('*')`, no removed column named). `services/searchAllTables.ts` still lists `first_name`/`last_name`/`person_contact_number` as searchable `facility_profile` columns for its generic search utility — those three are gone from the view. Not fixed (mobile repo, out of scope here); not confirmed whether that code path is reachable from a live screen.

### P0-13 · Update functions that reference `facility_profile` — ✅ complete 22 Sept (repoint + `search_providers` + all remaining advisor/hygiene findings closed; one item — job-posting functions — is left open on purpose, see below, since it needs live data that doesn't exist yet to exercise)
These still work through the view, but writes and new logic must go through `providers`.
- [x] **The write-function half is done**, landed inside the P0-10 rename migration (`rename_providers_and_compat_layer`) rather than as a separate step — it had to happen atomically with the rename or these would have broken in the gap between "table renamed" and "this list gets updated": `admin_change_facility_status`, `admin_delete_facility`, `registrar_update_own_facility` (rewritten to also split PII writes into `provider_private`), `register_facility_with_profile` (rewritten to write `providers`+`provider_private`, still accepting the same free-text `facility_type` its two existing callers send — see the handoff notes below), `sync_top_rated_facility_flag`.
  - **Correction to this line's function list, found while doing the above:** `admin_perform_facility_review_action` also writes to `facility_profile` (`UPDATE ... SET is_top_rated, avg_rating`) despite being filed under "read-only functions" below — it's fixed too, table name only, body otherwise unchanged.
  - Two more trigger functions needed the same treatment, found by tracing what fires during an `UPDATE providers` (not obvious from a `facility_profile`-text grep alone, since they don't mention the table by name): `refresh_top_rated_snapshot` (read `new.facility_name`, which stopped existing the moment `facility_name` became `name`) and `build_top_rated_module_data` (read `facility_type` off `public.facility_profile` by table name — repointed to `public.providers` + `provider_type`).
  - **`admin_update_facility_profile` is explicitly NOT fixed.** Its body references `name`, `address`, `phone_number` — columns that never existed on `facility_profile` even before this migration (real columns were always `facility_name`/no address column/`contact_number`). It has thrown "column does not exist" on every call, before and after — `actions/facility-admin.actions.ts:16-24`'s `adminUpdateFacilityProfile` is its only caller. Not a regression, but still broken; whoever rebuilds the Edit Facility form (P0-14) should replace this RPC entirely rather than patch it.
- [x] **Done 21 Sept: prod `p013_repoint_read_only_functions` (local `20260921160000_p013_repoint_read_only_functions.sql`); see "P0-13 status" below.** Update the read-only functions (they use the view until changed, confirmed safe by construction — the view's own SELECT covers every column any of these touch): `get_facilities_map` (filter `kind in ('care_facility','vendor')` and `provider_types.is_listed`), `global_search`, `global_search_v2`, `admin_global_search`, `submit_medication_enquiry`, `get_my_medication_enquiries`, `get_medication_enquiry_detail`, `get_med_enquiry_overview`, `get_job_listings`, `get_job_details`, `get_my_applications`, `get_saved_jobs`, `notify_job_alert_matches`, `get_facility_dashboard_metrics`, `get_platform_overview_metrics`, `get_admin_dashboard_stats`, `get_dashboard_metrics`, `capture_daily_metrics`, `get_bedtracker_route_suggestions`, `build_top_rated_module_data` (done above, listed here again only because PLAN.md's original line had it), `search_top_rated_items`, `get_registrar_trails`. None of these are broken today — this is a cleanup/optimisation pass (e.g. filtering by `kind`), not a fix.
- [x] Added `search_providers(p_kind, p_type, p_capability, p_lat, p_lng, p_radius_km, p_query, p_limit, p_offset)` for the new mobile directory (prod `search_providers_rpc`, 21 Sept). Returns active rows whose `provider_types.is_listed` is true; online-only providers skip the radius filter; `p_limit` is capped at 50. **Grant narrowed the same day** (`p013_search_providers_grants_and_helper_search_path`): the original migration granted it to `anon` "matching global_search's reach", but `global_search` and `get_facilities_map` are not anon-executable, so it is now authenticated + service_role only. Re-grant to anon only if a public web directory is ever built.

**P0-13 status, 21 Sept 2026 (database-access session; no application code touched).** The read-only repoint and `search_providers` were already on prod from an earlier session, but this file hadn't been updated. Re-verified live on prod, then fixed what the verification found:

**Independently re-verified 22 Sept, in a fresh session, before marking this box done.** Re-ran the highest-stakes claim from scratch rather than trusting the write-up: in a rolled-back transaction, set the dental clinic to `pending` and flipped the pharmacy to `kind='practitioner'`, then queried `get_facilities_map`, `global_search` and `search_providers` as a real outside member (`set local role authenticated` + a genuine `request.jwt.claims`, not the superuser connection, which bypasses grants entirely and would have silently passed regardless). Results matched the write-up exactly: `get_facilities_map` and `global_search` returned only the untouched active care_home, `search_providers` correctly included the practitioner-flipped row (it isn't kind-restricted) while still excluding the pending one, and `search_top_rated_items` as the real super_admin still returned the pending row. All confirmed genuinely enforced by the functions, not by the calling connection's privileges. Also confirmed independently: `pharmacy_campaigns.start_date` is `NOT NULL` with no default and absent from `submit_medication_enquiry`'s INSERT column list, so that claimed pre-existing bug is real. Then closed the two remaining gaps: wrote `p013_repoint_read_only_functions_ROLLBACK.sql` from the 21 original bodies (still cached from before that migration ran — not reconstructed from history), and ran `pnpm test:contract` (67 passed, 2 skipped, see below).
- [x] **Smoke test on prod.** Every function on the list was called as the roles that really call it (super_admin, member, service_role, the enquiry's owner) inside rolled-back DO blocks, so nothing persisted. All ran clean except the items below. `get_med_enquiry_overview` and `get_bedtracker_route_suggestions` are service_role-only by design (no EXECUTE for `authenticated`); that is not a bug.
- [x] **Visibility check** (rolled back). With one care facility set to `pending` and the pharmacy turned into a `practitioner`, `get_facilities_map`, `global_search` and `global_search_v2` returned neither the pending row nor the practitioner, and `search_top_rated_items` ran clean; `search_providers` hid the pending row and included the practitioner. Provider rows were confirmed unchanged afterwards. So the SECURITY DEFINER repoints did not reopen the P0-02 hole.
- [x] **Fixed: `get_bedtracker_route_suggestions` raised 42804 on every call.** It declares `region text` but `providers.region` is `region_enum`, and RETURN QUERY needs an exact type match. Added `::text`. **Not a P0-13 regression:** the original definition against `facility_profile` fails identically (replayed on prod: "Returned type region_enum does not match expected type text"), so it has never worked. Nothing noticed because there are no bed-tracker rows yet (0 facilities, 0 wards). Prod `p013_fix_bedtracker_region_cast`; local `20260921170000_p013_fix_bedtracker_region_cast.sql` + `_ROLLBACK.sql`. Verified live as service_role: runs, returns 0 rows, bad GPS still raises, grants unchanged.
- [x] **Advisor:** `_map_legacy_facility_type_filter` (created by the P0-13 migration) had a mutable `search_path`; pinned to empty. Same migration as the grant change above (local `20260921173000_p013_search_providers_grants_and_helper_search_path.sql` + `_ROLLBACK.sql`).
- [x] Rollback file added for `search_providers_rpc` (`20260921163000_search_providers_rpc_ROLLBACK.sql`).
- [x] **Fixed: `search_top_rated_items` leaked pending providers to any signed-in user.** It is SECURITY DEFINER, executable by `authenticated`, and its `'facility'` branch includes `pending` (and null-status) providers' name / area / image. That pre-dates P0-13 (it behaved the same over the view) but it is the class of exposure P0-02 closed on the table. Its only caller is the admin console's Top Rated board (`features/top-rated/README.md`: admin-only, uncontracted), so it now carries the same guard as its siblings `admin_upsert_top_rated_item` / `admin_remove_top_rated_item` (`auth.role() <> 'service_role' and not is_app_admin()` → `Not authorized`). Body otherwise unchanged, so the admin picker still lists pending facilities. Dry run (rolled back): a member gets `Not authorized` on every table key; super_admin and service_role get the same rows as before, including the pending pharmacy. Prod `p013_search_top_rated_items_admin_only`; local `20260921180000_p013_search_top_rated_items_admin_only.sql` + `_ROLLBACK.sql`. **Still to eyeball:** the Top Rated board's "add item" search, signed in as an admin. `is_app_admin()` means admin + super_admin only, same as the add/remove RPCs, so any role that could search but not add would now be refused.
- [x] **`p013_repoint_read_only_functions_ROLLBACK.sql` written.** Not reconstructed from migration history (the concern above was real — `global_search`, `get_dashboard_metrics`, `get_admin_dashboard_stats` and `capture_daily_metrics` have no CREATE statement in prod's tracked migrations). Built instead from the 21 functions' exact bodies, fetched via `pg_get_functiondef()` straight off prod *before* `p013_repoint_read_only_functions` touched anything, and cached for the length of that session — the real pre-migration definitions, not a guess. Also drops `_map_legacy_facility_type_filter`, which that migration created new. Apply-order note is in the file's header: roll back `p013_search_top_rated_items_admin_only` first if it's also applied, and this one before `rename_providers_and_compat_layer` (facility_profile needs to exist for these bodies to compile back onto it).
- [x] **Pre-existing breakages found — fixed 22 Sept** (`p013_close_remaining_advisor_findings`, local `20260922100000_p013_close_remaining_advisor_findings.sql` + `_ROLLBACK.sql`, applied to prod via the Supabase MCP connector):
  - **`capture_daily_metrics()` repointed from `users` to `user_profiles`.** Deeper than this line originally said: `platform_metrics_history` has three more NOT NULL columns (`sticky_users_count`, `other_gender_count`, `active_medication_remainders`) the function never populated at all — masked until now because the `users` bug always failed first. `other_gender_count`/`active_medication_remainders` are real counts (`medication_reminders.is_active`); `sticky_users_count` has no prior definition anywhere in either repo, so it's defined as "active in the last 24h but not a brand-new signup today" — documented inline as a judgment call, not an invented metric. `sex` matching is case-insensitive (`lower(sex)`), unlike `get_admin_dashboard_stats`' exact-case match, because live data has both `'Female'` and `'female'`. Verified live: the cron now runs clean and wrote its first-ever row to `platform_metrics_history` (previously 0 rows after 14 straight failures).
  - **`get_admin_dashboard_stats()` still reads dropped `public.tracker_logs` and still fails — left unfixed on purpose.** Checked both repos for a caller: none (only `lib/db/database.types.ts`'s generated type stub references the name). Not worth inventing a tracker-logs replacement for a function nothing calls; search_path pinned since that's a mechanical, zero-behavior-change fix, logic left broken as found.
  - `submit_medication_enquiry`'s `pharmacy_campaigns.start_date` bug is unchanged — still correctly deferred to P1-01, which retires `pharmacy_campaigns` for enquiries anyway. Not touched.
  - **`admin_global_search` restricted: `REVOKE EXECUTE ... FROM anon, authenticated`.** Its only real caller (`app/api/admin/search/route.ts`) already uses `getAdminClient()` (service role) behind `requireAdminApiUser("dashboard.view")`, so the anon/authenticated grants were dead weight that let literally any caller — including unauthenticated `anon` — pull user names and phone numbers straight off `.rpc("admin_global_search", ...)`. Checked both repos: no other caller. Same exposure class P0-02 closed on the table and P0-13 already closed on `search_top_rated_items`.
- [x] **Advisor items from the earlier P0-10/11/12 migrations — fixed 22 Sept, same migration.** `_resolve_legacy_provider_type`, `build_top_rated_module_data` and `get_admin_dashboard_stats` pinned to `search_path = ''` (safe — already fully schema-qualified, verified by calling each after the change). `admin_global_search` pinned to `search_path = 'public', 'extensions'` instead — pinning it to empty broke it outright on first test (`42883: function similarity does not exist`; `pg_trgm`'s `similarity()` lives in `extensions`, not `public`, on this project) — matches the existing convention `20260908_epic2_7_move_pg_trgm_out_of_public.sql` already used for `global_search_v2`/`search_drugs`. The three trigger functions (`fn_catalogue_item_publish_guard`, `fn_log_provider_activity`, `fn_provider_credential_status_change`) had EXECUTE revoked from anon/authenticated after confirming via `pg_trigger.tgfoid` they're genuinely trigger-only and grepping both repos for a direct `.rpc()` caller (none) — same treatment as epic2_2b's 8 functions. Confirmed via `information_schema.routine_privileges` directly (not just the advisor, which lags — it still showed the pre-revoke grants on the first re-check after applying). `function_search_path_mutable` advisor count: 59 → 54, exactly the 5 fixed here.
- [ ] **Not exercised with real rows** (0 job postings on prod): `get_job_details`, `get_job_listings`, `get_my_applications`, `get_saved_jobs`, `notify_job_alert_matches`. Their SQL was read instead: every provider column they touch (`name`, `provider_type`, `region`, `latitude`, `longitude`) exists on `providers`. `get_job_details` and `get_saved_jobs` swallow all errors (`exception when others`), so a future column break would look like an empty result, not an error. Re-test when the first job is posted. They also `left join providers` inside SECURITY DEFINER functions with no status filter, so a published job from a suspended provider still shows the employer's name; decide in P0-14's suspend flow whether jobs should hide too. **Left open on purpose** — no live job-posting data exists to exercise this with, and there's nothing to fix mechanically without it.
- [x] `lib/db/database.types.ts` **fully regenerated 22 Sept** via the Supabase MCP connector's `generate_typescript_types` (the CLI's `SUPABASE_ACCESS_TOKEN` blocker from 21 Sept is still unresolved in this environment, but the MCP path doesn't need it). Diffed against the 21 Sept hand-patched stopgap: the only difference was formatting (the stopgap's `_map_legacy_facility_type_filter` entry was single-line; the real generator emits it multi-line) — no functional drift, confirming the hand-patch was accurate. `pnpm type-check` clean against the new file.
- [x] `pnpm test:contract` run 22 Sept: 67 passed, 2 skipped (the live RPC-signature check skips without `SUPABASE_SECRET_KEY` in this environment, per CLAUDE.md's documented "123 passed, 1 skipped" pattern). Not a gap here — the three contracted RPCs' actual live behaviour was independently re-verified straight against prod in this same pass (see the visibility re-check below), which covers more than the skipped test would have.

### P0-14 · Admin console: Providers module — 🟡 every bullet below is done except the `/facilities` cutover, done 22 Sept
- [ ] `features/providers/` replaces `features/facilities` and `features/ibp`. **Still not done, and deliberately not attempted today.** This module now covers everything P0-14 asked for, but `/facilities` (Registry/Top Rated/Featured tabs, add/edit/delete, CSV export, bulk actions) has real functionality this module never set out to rebuild — none of that was in P0-14's own bullet list, which is about browsing/verifying/managing providers, not the create/edit/CSV-export surface. Cutting `/facilities` over today would drop those for whoever uses them. `app/(dashboard)/facilities/page.tsx` becomes the re-export once that gap is closed (a separate, scoped task: port Add/Edit/Delete, CSV export and Top Rated/Featured into `features/providers/`) — see `features/providers/README.md`.
- [x] List view filtered by kind, type, status, verification, tier and region (`features/providers/ui/ProvidersPage.tsx`, `api/list.ts`, `api/options.ts`, `api/stats.ts`). `tier` reads `subscription_tier`; `tier=none` is a real filter value for "free listing", not "no filter". Wired into the sidebar as a new "Providers" nav entry (`🩺`, permission `providers.view`) alongside the existing "Facilities" entry.
- [x] Detail tabs: **Profile · Credentials · Capabilities · Catalogue · Reviews · Subscription · Payouts (read-only until D12) · Deliveries · Activity** — all nine built in `features/providers/ui/ProviderDetailPage.tsx` / `ui/tabs/*.tsx`, deep-linkable via `?tab=`.
  - **Credentials:** list + verify/reject (`api/credentials.ts`) — a plain `UPDATE ... SET status` via the admin client, not a wrapper RPC; `trg_provider_credential_status_change` (P0-11) already does the capability-grant/revoke work on any `UPDATE OF status` regardless of caller. Verified live: verifying a seeded `pcg_premises_licence` granted `otc_medicines` through this exact code path.
  - **Capabilities:** list + admin override grant/revoke, via the P0-11 RPCs `grant_provider_capability_override`/`revoke_provider_capability`. **Caught live, real bug:** both RPCs self-authorize with `is_app_admin()`, which reads `request.jwt.claims` — empty on a bare service-role call with no forwarded user JWT, so calling them via `getAdminClient()` always raised "Not authorized". Fixed by switching those two calls to `getServerClient()` (carries the signed-in admin's real cookie session), matching how `features/top-rated`'s sibling RPCs are called. Verified both grant and revoke live with a simulated real admin session.
  - **Catalogue:** list + admin publish/reject (`api/catalogue.ts`, plain `UPDATE`). Verified live: publishing an item that requires a capability the provider doesn't hold is correctly blocked by `trg_catalogue_item_publish_guard`; one with no requirement publishes cleanly.
  - **Reviews:** scoped read + moderate (approve/reject) on `facility_reviews`, gated on the existing `reviews.moderate` permission — shares that permission with the global Reviews module rather than inventing a parallel one.
  - **Subscription:** read-only display of `facility_subscriptions`; grants/checkout stay in the existing `/subscriptions` module (linked from the tab), per P1-07's plan.
  - **Payouts:** a static "on hold" panel, not a stub oversight — there is no payout data model to query until D12 unblocks it (ledger tables unchanged, no payment provider connected).
  - **Deliveries:** reads `credential_deliveries` (P0-06) scoped to the provider.
  - **Activity:** reads `provider_activity_log` (P0-12), capped at 200 rows.
- [x] Admin home queues: credentials to review, catalogue to review, expiring within 30 days, onboarding requests — `api/queues.ts` (one route, four parallel queries, capped at 20 rows each) rendered as an expandable panel (`ui/ProviderQueues.tsx`) above the Providers list, each item deep-linking to the right provider tab.
- [x] Settings: editors for provider types, credential types and capabilities — a new "Providers" tab in Settings (`app/(dashboard)/settings/_components/ProvidersTab.tsx`), three sub-tabs, each a table + add/edit dialog. Verified live: insert and update against all three lookup tables.
- [x] Permission keys added to `admin_permissions` / `admin_role_permissions`: `providers.view`, `providers.edit`, `providers.verify`, `providers.suspend`, `catalogue.review`, `provider_types.manage` (migration `p014_provider_admin_permissions`, **applied to prod 22 Sept** via the Supabase MCP connector; verified all six rows exist and are granted to `admin`). `providers.create` already existed (P0-06). All six also added to `lib/permissions.ts`'s `PERMISSION_CATALOG` and granted to the `admin` role default; `registrar` unchanged (still `providers.create` only, per its existing scoped-RPC rationale).
- [x] Suspend flow: a reason is required (`api/status.ts`'s zod refinement — stricter than the general `facilities.approve` status endpoint it was adapted from, which leaves reason optional even for `suspended`); the provider is hidden from the directory and from enquiry matching for free, since both already read the existing `status='active'`-only RLS from P0-02 — no new visibility code needed. Open orders: nothing to enforce yet, no order system is live (P1-03 not built; D12 on hold).
- **Accept:** `pnpm type-check`, `pnpm lint` (0 new errors) and `pnpm build` all pass with every new route (`/providers`, `/providers/[id]`, all `/api/providers/**`, the Settings `providers` tab) in the manifest. `pnpm test` unaffected (the one failure, `features/rewards` missing a README, predates this work). The RBAC migration is live on prod. Every write path (credential verify, capability grant/revoke, catalogue publish/reject) was exercised live against prod in a rolled-back transaction with a simulated real admin session, not just type-checked — that's how the capabilities.ts bug above was actually caught.
- **Known gaps, honestly not covered by P0-14's own bullets:** no way to create a provider from this module (unchanged — registration is P0-06's `registerProviderAccount()`, still reached through the Facilities "Register Facility" flow); no CSV export or bulk actions on the Providers list; Top Rated/Featured management stays in `features/top-rated`/`features/facilities`. None of these were asked for by name in P0-14 — they're what's still missing for the top-level "replaces facilities" box.

### P0-15 · Provider inbox and alerts — 🟡 DB done 22 Sept (migration `p015_provider_inbox_and_alerts`, applied to prod via the Supabase MCP connector); the two Business-app UI bullets are out of scope here — that app doesn't exist yet (P0-17 hasn't started)
- [x] `provider_inbox` table: `provider_id, item_type (enquiry | booking | review | chat | job_application | credential | system), ref_id, status, created_at, read_at`, plus `title`/`body` (needed to render an item and to feed `dispatch_notification` without a second round trip). RLS: owner-or-admin `SELECT` and `UPDATE` (to mark read/archived), mirroring `provider_activity_log`'s pattern; no `INSERT`/`DELETE` policy at all — every write goes through `dispatch_provider_alert`. **Caught live:** this project doesn't auto-grant table privileges to `authenticated` on a new table the way it apparently did for the earlier `provider_*` tables (those must have had an explicit `GRANT` in their own migrations) — a real authenticated session got a clean 42501 until `grant select, update ... to authenticated` was added, even with the correct RLS policy already in place. Verified with a real `authenticated` session (not the superuser connection): the owner sees their own inbox row and can mark it read; an unrelated member sees 0 rows; a direct `INSERT` as the owner is blocked (42501, no policy covers it).
- [x] `dispatch_provider_alert(p_provider_id, p_item_type, p_ref_id, p_title, p_body, p_metadata)`: writes the inbox row, then calls `dispatch_notification(..., p_app => 'business')`. Not wired to any real event trigger yet — nothing in Phase 0/0b fires it (enquiry matching is P1-01, bookings P2-01, chat P2-03), so it's built ahead of its callers, same as `grant_provider_capability_override` was in P0-11. `REVOKE ... FROM PUBLIC; GRANT ... TO service_role` — no evidenced caller yet, so no anon/authenticated grant left lying around for the next advisor sweep to find.
- [x] **Push tokens per app:**
  - `user_push_tokens.app text not null default 'consumer' check (app in ('consumer','business'))` — added.
  - `register_push_token` gained a trailing `p_app text default 'consumer'` param. Verified the exact old 5-arg call (no `p_app`) still works unchanged.
  - `dispatch_notification` also gained a trailing `p_app text default 'consumer'` param — needed so `dispatch_provider_alert` could "call `dispatch_notification`" as the plan specified, rather than duplicating its Expo-batching logic. Every existing caller (chat, jobs, cron reminders) omits it and keeps sending to `'consumer'` tokens only, unchanged. Also revoked its stray `PUBLIC` execute grant down to `service_role` only — it's SECURITY DEFINER with no internal `auth.uid()` check, so any authenticated caller having EXECUTE on it would have been able to push arbitrary notifications to arbitrary `user_id`s; checked both repos, it's only ever called from service-role contexts (Next.js API routes, Edge Functions), confirmed by that RPC's own original doc comment in the mobile repo's migration history.
  - `dispatch_provider_alert` sends only to `app = 'business'` tokens (via `dispatch_notification(..., p_app => 'business')`); `dispatch_notification`'s default keeps patient notifications on `app = 'consumer'` tokens only. Verified live: registering one `'business'` and one `'consumer'` token for the same user and dispatching each app value only ever selected its own token, never both.
  - **Found and fixed, not asked for by name but required to actually satisfy the next bullet:** `sync_legacy_push_token()` (writes the legacy single-slot `user_profiles.expo_push_token`, which `dispatch_notification`'s consumer-fallback path reads) picked whichever token was *most recently seen across all of a user's devices, any app*. For a `{member,provider}` user with both apps on one phone, opening the Business app last would silently overwrite the legacy slot with a business token, and a patient notification sent via the legacy fallback would then reach the business device. Restricted its `SELECT` to `app = 'consumer'` rows only. Verified live: after registering a business token then a consumer token for the same user, the legacy field held only the consumer token.
  - A `{member,provider}` user on one phone must not get provider alerts in the 4 Our Life app: holds, by construction — `dispatch_notification`'s consumer path (the only path the patient app's own notification code triggers) never reads `app='business'` rows, on either the token table or the legacy-fallback fix above.
  - **Mistake made and fixed in this same pass, worth flagging for whoever next touches either function:** `CREATE OR REPLACE FUNCTION` does **not** replace a function when the parameter list changes shape — a new trailing parameter (even with a default) makes it a distinct overload in Postgres. Both `register_push_token` and `dispatch_notification` briefly had two live overloads on prod (the old signature alongside the new one) until caught by a duplicate-row error on a follow-up diagnostic query, in the same session before anything had called either in that window. Fixed with an explicit `DROP FUNCTION` of the old signature before relying on the new one; the local migration file includes those drops so a fresh apply doesn't reintroduce the gap.
  - `pnpm gen:types` re-run (via the MCP connector) after all of the above; `provider_inbox`, the new `.app` column and both updated function signatures all present. `pnpm type-check`, `pnpm lint` (0 new errors) and `pnpm test` all clean (same one pre-existing, unrelated `features/rewards` README failure). Ran `scripts/cleanup/regenerate-mobile-contract.sh` — `register_push_token`/`unregister_push_token` still show as mobile-called, matching the existing manifest; `dispatch_notification`/`dispatch_provider_alert`/`provider_inbox` don't appear in the mobile scan at all (nothing there calls them yet), so no manifest update was needed — a signature gaining a defaulted trailing param isn't a tracked dimension of that file anyway (it tracks names, not shapes).
- [ ] **Out of scope in this repo:** Business app Android notification channel ("New requests", high importance, custom loud sound) and iOS time-sensitive notifications, plus the inbox badge and push deep links. `apps/business` doesn't exist yet — P0-17 (the monorepo split) hasn't started. Pick these up once P0-17/P0-16 land; `dispatch_provider_alert` and the inbox table are ready for them.
- [ ] Business app: the inbox badge on the tabs, and push deep links into the right screen.

### P0-16 · Business app shell (`apps/business`)
- UI mockups for every provider screen: generate from `../4-Our-Life-App/provider-portal-ui-mockup-prompt.md` (Sheets 00–20) and build to match them.
- [x] ~~Tab layout uses **NativeTabs** (`expo-router/unstable-native-tabs`)~~ — **superseded 23 Sept.** We draw the bar ourselves (`components/ui/floating-tab-bar.tsx`) over expo-router's JS `Tabs`. Reason: NativeTabs renders a UITabBar on iOS 26 and a Material 3 bar on Android. Those look nothing like each other and **neither matches Sheet 00's floating pill**, which is the signature of the whole design set; the native bar also animates its own tint on navigation, which showed up as a colour flicker. The custom bar gives one consistent, on-brand bar on both platforms: pill shape, ~21pt gap on three sides, Mint Wash capsule behind the selected icon, Brand Green label, red count badges. The trade-off accepted: we give up the platform's Liquid Glass tab bar. `expo-blur` was tried and dropped — it is a native module, and blurring on iOS while Android fell back to a flat fill would have defeated the point.
  - Tab **order** per kind is unchanged and is still the contract.
  - Still **one route group per kind**: `(vendor)`, `(facility)`, `(practitioner)`, `(trainer)`, `(ambulance)`. `(vendor)` is built; the other four are not.
  - The root `app/index.tsx` is a boot router that picks the group from `get_my_provider_context()` (and sends unverified/pending providers to `/pending` instead).
  - After sign-in, the root layout picks the group from `get_my_provider_context()`.
  - The branch switcher goes in the header.
- [ ] **Vendor:** Home · Requests · Orders · Catalogue · Business
- [ ] **Care facility:** Home · Bookings · Messages · Beds (only when `has_beds`; otherwise Reviews) · Facility
- [ ] **Practitioner:** Home · Schedule · Patients · Messages · Profile
- [ ] **Trainer:** Home · Schedule · Clients · Programmes · Profile
- [ ] Home screens read `get_provider_home(p_provider_id, p_timeframe)`. Don't port the hard-coded numbers from the old `(ibpTabs)/dashboard.tsx` (336 / 14 / 1,362 / 236) or the fixed `METRICS` / `DAYS` in `finance.tsx` and `analytics.tsx`. Rebuild those screens from the mockups.
- [ ] Payouts, Analytics and Promote live under Business/Facility/Profile and are opened from Home cards.
- [ ] Credentials checklist screen (from `provider_type_requirements`), with upload through `submit_credential`.
- [ ] Business → Security: signed-in devices (move `My Account/Devices.tsx` into `packages/shared`), **Sign out all devices**, change password, optional app lock (shared `BiometricContext`).
- [ ] Sign-in gate in the Business app: allowed only when `'provider' = any(account_types)` **and** at least one provider owned. Otherwise show "This account isn't a business yet", with a link to "Request access".
- [ ] Cross-app links for `{member,provider}` accounts: "Open personal app" in Business → Profile (`fourourlife://`), and "Open 4 Our Life Business" in the patient app's My Account. Each link falls back to the store listing.
- [ ] Port `BusinessAuth.tsx` (it becomes the Business app's welcome screen) and `RequestLink.tsx` (it becomes "Request access") into `apps/business`.
- **Accept:** logging in to the Business app as the seeded pharmacy owner shows the vendor tabs with real (empty) data, and no screen shows a hard-coded figure.

### P0-17 · Monorepo + Business app project (do this FIRST in the mobile repo, before P0-06 mobile work and P0-16)
Why a monorepo and not a variant flag: Expo Router's custom `root` option is officially discouraged ("We will not accept bug reports…"). One project with both route trees would also ship all the patient-app code and native modules inside the Business app, which defeats D14.

- [ ] **Branch and freeze.** Branch `chore/monorepo`, and don't merge other mobile work while it's open.
- [ ] **Move the patient app into `apps/consumer/`** with `git mv`, so history is kept: `app/`, `components/`, `context/`, `hooks/`, `services/`, `store/`, `lib/`, `theme/`, `assets/`, `android/`, `ios/`, `plugins/`, `patches/`, `app.config.ts`, `eas.json`, `babel.config.js`, `metro.config.js`, `tsconfig.json`, `google-services.json`, `GoogleService-Info.plist`, `.env*`, and every other file the app needs.
- [ ] **Workspace root `package.json`** (private) and `pnpm-workspace.yaml`:
  - `packages: ['apps/*', 'packages/*']`
  - Keep `nodeLinker: hoisted`, `publicHoistPattern`, `allowBuilds` and `patchedDependencies`, with the patch paths updated.
- [ ] **Metro:** Expo SDK 56 detects monorepos automatically. Remove any custom `watchFolders` / `nodeModulesPaths` unless a build proves they're needed.
- [ ] **Patient app unchanged:**
  - Bundle IDs stay `com.4thpayapps.4ourlife` / `com.fourourlifeapppay.fourourlifeapp` and the scheme stays `fourourlife`.
  - EAS project id unchanged. Set EAS `projectDir` / build working directory to `apps/consumer`.
  - Update the Crashlytics and Firebase paths.
- [ ] **Accept (consumer):** `eas build --profile preview` from `apps/consumer` produces a build identical in behaviour to the last release. All 32 contracted routes, 48 RPCs and 40 tables still work. Regenerate the contract with `regenerate-mobile-contract.sh ../4-Our-Life-App/apps/consumer` and update the script path.
- [ ] **`packages/shared`** (`@4ol/shared`, TypeScript source, no build step). Extract only what both apps need, one PR at a time, each followed by a consumer smoke test:
  1. `theme/` (palette, typography, colors, fonts)
  2. Supabase client + `withTimeout` + `mobile-auth` helpers
  3. API fetch helpers
  4. `BiometricContext`, and the devices / session list
  5. Chat (conversation list, thread, composer, `use-chat` hooks)
  6. Notification registration (with the `p_app` parameter)
  7. Crashlytics setup
  8. Shared UI primitives (buttons, chips, inputs, sheets)
- [ ] **`apps/business`: a new Expo app (SDK 56, `expo-router`)**
  - Name "4 Our Life Business", slug `fourourlife-business`.
  - iOS bundle `com.4thpayapps.4ourlife.business`, Android package `com.fourourlifeapppay.fourourlifeapp.business`, scheme `fourourlifebusiness`.
  - Its own icon and splash (the brand mark on Forest Green `#1F7A4B`).
  - Its own EAS project and build profiles, and its own Firebase apps (iOS + Android) for Crashlytics / FCM.
  - Only the native modules it needs: camera and document picker (credentials, proof of delivery), maps, notifications, secure store, local-authentication, image picker. **No** 3D anatomy, fitness health integrations, period tracker or `react-native-compressor` unless a screen needs it.
- [ ] **Business app mobile contract:** extend `tests/contract/mobile-contract.ts` with a `BUSINESS_APP` section (routes, RPCs, tables), generated from `apps/business` the same way. The additive-only rule applies to both apps.
- [ ] **Store setup:**
  - App Store Connect and Play Console listings for "4 Our Life Business", with screenshots from the mockup sheets.
  - Category Business (iOS) / Medical or Business (Android).
  - Privacy labels, a reviewer demo account (a seeded test pharmacy), and review notes explaining that accounts are issued to verified health businesses.
- [ ] **Accept (business):** a preview build installs next to the patient app on the same phone, signs in with the seeded pharmacy owner, receives a test provider push, and the patient app on the same phone does **not** receive it.

### P0-18 · Remove the business side from the patient app (after the Business app is live)
- [ ] Delete `app/(app)/(auth)/(ibpTabs)/**`, `(public)/BusinessAuth.tsx`, `(public)/RequestLink.tsx`, `store/useUserMode.ts`, the `UserModeSelectionModal`, `BUSINESS_PROVIDER_ENABLED` and the business branches in `app/(app)/_layout.tsx`. Prove each is unused first (delete on evidence).
- [ ] Sign-in to the 4 Our Life app with a provider-only account (`{provider}`, no `member`): show "This is a business account — open 4 Our Life Business", with a store link, instead of the patient tabs.
- [ ] Update the brief and the mockup prompt pack if anything moved.

---

## Phase 1 — Vendor enquiry loop and facility basics

### P1-01 · Vendors can read and receive enquiries
- [ ] `get_vendor_enquiry_inbox(p_provider_id)`: SECURITY DEFINER. Returns `pending_match` enquiries within range whose required capability the vendor holds. **The patient's identity stays hidden until they accept an offer.**
- [ ] AFTER INSERT on `medication_enquiries`: match vendors by distance, capability and status, then `dispatch_provider_alert`. Stop using `pharmacy_campaigns` for this.
- [ ] Extend `submit_medication_enquiry` for non-medicine categories (`supplements`, `healthy_foods`, `medical_devices`). This is an additive parameter with a default.
- [ ] When `rx_epharmacy` is off, patients can't create `with_rx` enquiries (keep the UI hidden and enforce it server-side). When it's on, those enquiries require a prescription upload and only reach `rx_medicines` vendors.
- [ ] Add a prescription-only/OTC flag to `drugs`, with a backfill script.

### P1-02 · Requests tab (quote)
- [ ] Segments New · Quoted · Won · Lost, with a response countdown.
- [ ] Quoting writes `enquiry_responses` (`facility_id` = provider id), with a catalogue item picker.
- [ ] Attach the one-to-one chat entry point (P2-03).

### P1-03 · Orders tab (fulfilment, not money) — 🟡 DB done 23 Sept; the Sheet 05 UI is unbuilt

> **Correction, 23 Sept.** There is **no separate orders table and none is needed.** An order *is* a `medication_enquiries` row past matching — its `status` already carries the whole lifecycle: `pending_match → matched → in_escrow → pickup_ready → delivery_in_progress → completed | cancelled`. The table also already has `fulfilment_mode`, `pickup_confirmation_code`, the delivery columns and `payment_amount`. `enquiry_responses` (`offered → accepted | declined | expired`) is the quote, and its vendor RLS — insert/update/delete your own offer while `offered` — has been complete all along. The only thing that was ever missing was the vendor's **read** path and the fulfilment **transitions**.

- [x] Vendor fulfilment RPCs, applied to prod 23 Sept (`p103_vendor_fulfilment`, hardened by `p103_harden_owner_guards`; local `20260923092000_*` / `20260923093000_*` with rollbacks):
  - `get_vendor_orders(p_provider_id)` — the board. Customer name and phone are included **only** because `pharmacy_id` being set means the patient already accepted.
  - `vendor_mark_order_ready(p_enquiry_id, p_provider_id)` — `matched`/`in_escrow` → `pickup_ready` or `delivery_in_progress`, chosen by `fulfilment_mode`. Generates the pickup code if absent.
  - `vendor_verify_pickup_code(p_enquiry_id, p_provider_id, p_code)` — `pickup_ready` → `completed`.
  - `vendor_mark_delivered(p_enquiry_id, p_provider_id, p_received_by, p_proof_url)` — `delivery_in_progress` → `completed`.
  - The pickup code belongs to the **patient** and is never returned to the vendor; the vendor asks for it and has it verified. `_vendor_order_guard` is internal, with EXECUTE revoked from `anon` and `authenticated`.
- [ ] **The Sheet 05 UI is not built** — board, order detail, pickup keypad, proof of delivery, delivery settings. The RPCs are listed in `BUSINESS_APP_RPCS_RESERVED` in the mobile contract until those screens ship.
- [ ] Money movement is **blocked by D12**. Until approved, orders run "pay at pickup / on delivery", and `payment_status` is recorded manually by the vendor.

### P1-04 · Catalogue tab
- [ ] CRUD through `upsert_catalogue_item`; categories limited to the vendor's capabilities; stock toggle; bulk pricing for `wholesale`.

### P1-05 · Profile, services and reviews
- [ ] Editing through `update_my_provider`; changes to name or type need admin review.
- [ ] Reviews: attach the orphaned triggers `fn_enforce_review_depth` and `fn_validate_review_requirements`. Owner replies go through `reply_to_review(p_review_id, p_text)`, which checks ownership and marks the reply as coming from the provider.

### P1-06 · Provider analytics
- [ ] Add `provider_id` (nullable) to `analytics_events` and record `profile_view`, `call_tap`, `directions_tap` and `whatsapp_tap` from the mobile provider detail screen.
- [ ] `get_provider_home` covers the funnel, enquiries won and revenue (manual until D12).

### P1-07 · Provider subscriptions (D10, D11)
- [ ] Seed `marketing_subscriptions` (the provider tier catalogue) with **Provider Premium** and **Provider Premium Plus**. Delete the test row "Tester Something".
- [ ] Add values to the `subscription_privilege` enum: `paid_chat`, `priority_enquiry_alerts`, `demand_insight`, `consumer_full_access_bundle`.
- [ ] Premium = paid_chat, priority alerts, advanced analytics, demand insight. Plus = Premium + `consumer_full_access_bundle`.
- [ ] **Entitlement:** extend the logic behind `/api/user/entitlement` so a user holding an active `facility_subscriptions` row on a Plus tier gets `full_access` premium on the personal side. **Compute it; don't copy rows** into `user_subscriptions`, so the two never drift apart.
- [ ] Only accounts that include `member` can use the personal side (D5), so offer Plus only to `{member,provider}` accounts.
- [ ] Subscription checkout (Paystack) is **not** blocked by D12. Build `/api/subscriptions/checkout` + webhook → `facility_subscriptions` / `user_subscriptions`. Premium activation stays on admin grants until Paystack keys exist.

---

## Phase 2 — Bookings, chat and growth features

- [ ] **P2-01 · Booking engine:** tables for slots and bookings, services linked to catalogue items (`item_type in service/session/package`), accept/decline, reminders, no-shows. Deposits wait for D12.
- [ ] **P2-02 · Practitioner and trainer onboarding:** `provider_practitioner_details` ↔ `hcp_verifications`; `fitness_trainers.provider_id`; Schedule / Patients / Clients / Programmes tabs.
- [ ] **P2-03 · One-to-one chat + premium paid chat (D10):**
  - Server-side `fn_get_or_create_direct_conversation`; it's documented but doesn't exist in the database.
  - Add `conversations.enquiry_id`.
  - Access check: the patient needs `full_access` premium and the provider needs the `paid_chat` privilege, both enforced in the chat RLS or `is_conversation_member`.
  - Behind the flag `provider_paid_chat`.
- [ ] **P2-04 · Paid provider groups:** `group_type = premium` groups led by providers, using `conversation_members.role = group_leader`.
- [ ] **P2-05 · Refill autopilot:** add pack size to `medication_reminders`; a running-low nudge; one-tap re-enquiry to the last vendor.
- [ ] **P2-06 · Symptom → care navigation:** link provider types to conditions and specialties; "Nearby providers who treat this" on condition, symptom and anatomy pages.
- [ ] **P2-07 · Healthy living → shop:** tag content with product categories; link to vendors whose catalogue matches.
- [ ] **P2-08 · Share clinician report:** time-limited sharing of `plasence/clinician-report` with a booked practitioner; consent logged in `period_consent_events`.

## Phase 3 — Specialised networks

- [ ] **P3-01 · Bed tracker for hospitals:** owner writes to `bed_tracker_wards` through an RPC; the Beds tab; the `bed_tracking` capability.
- [ ] **P3-02 · Ambulance operators:** `ambulances.operator_id`; Dispatch / Fleet tabs; route to the nearest free bed (`/api/bedtracker/route-suggestions`).
- [ ] **P3-03 · Labs:** test orders and secure delivery of results.
- [ ] **P3-04 · Jobs and locum shifts:** providers post to `job_postings` themselves; search verified CVs.
- [ ] **P3-05 · Demand insight:** anonymised, area-level totals of enquiries nobody could fill, plus symptom and condition views (Premium).
- [ ] **P3-06 · Promotions:** providers submit `marketing_profile` / discounts for admin review; featured and top-rated placement gated by privilege.

## Phase 4 — Partners

- [ ] Corporate wellness accounts (team challenges, premium seats, invoices).
- [ ] Insurer networks (NHIA-licensed private schemes).
- [ ] NGO and campaign sponsor reporting.

## Blocked / waiting

- [ ] ⏸ **D12 Escrow / order payments.** Needs the boss's approval, then a legal check on the Bank of Ghana payment-aggregation licence. The ledger tables (`escrow_transactions`, `transactions`, `refunds`, `service_charge_rates`) stay unchanged. Once approved, build Paystack checkout for orders, delayed settlement to provider sub-accounts, `provider_payout_accounts`, `provider_settlements`, automatic release when the patient confirms or after a timeout, and dispute resolution.
- [ ] ⏸ **WhatsApp template approval** (Meta, through Twilio). Blocks the WhatsApp channel of P0-06; email + SMS work meanwhile.
- [ ] ⏸ **Paystack live keys.** Block subscription checkout (P1-07).
- [ ] ⏸ **Apple / Google in-app purchase rules** (ask the boss together with D12).
  - Digital subscriptions sold *inside* an iOS app (patient Premium, Provider Premium / Plus) normally have to use Apple in-app purchase. The same applies to Google Play Billing on Android.
  - Paying by MoMo or Paystack inside the app risks rejection, in both apps.
  - Options: store billing (RevenueCat is a common wrapper), or selling the business plans on the web (office.4ourlife.com) with the app only unlocking what's already paid. Whether B2B plans count as an exception needs checking against the current guidelines.
  - Decide before building P1-07 checkout.

---

## Release checklist (every phase)

- [ ] Migrations applied to a Supabase branch first, then prod; rollback file present.
- [ ] `get_advisors` security and performance show no new warnings.
- [ ] `pnpm gen:types`, `pnpm knip`, unit tests, Playwright route sweep.
- [ ] Mobile contract regenerated, and the diff reviewed as additive.
- [ ] Mobile builds: **both apps** (`apps/consumer`, `apps/business`) built and smoke-tested. Each app's contract section regenerated. Builds released **before** any tightening that old builds depend on.
- [ ] Move this plan's boxes forward and note the migration or PR names.
