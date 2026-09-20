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
- [x] **PostHog sync, both directions:**
  - Push: `app/api/settings/feature-flags` `PUT` (the existing Settings → Feature Flags toggle) now also best-effort pushes the change to PostHog via `lib/posthog-admin.ts` (new — a thin `fetch` wrapper around PostHog's Feature Flags REST API; needs `POSTHOG_PERSONAL_API_KEY`/`POSTHOG_PROJECT_ID`/`POSTHOG_HOST`, none of which exist anywhere yet — code path is built and unit-tested, but **blocked on you creating a PostHog personal API key and adding it to env**, same shape as P0-06's Twilio WhatsApp template). Never blocks the local save if PostHog fails.
  - Pull: new `app/api/settings/feature-flags/sync` (`GET`, mirrors `features/reports/api/cron.ts`'s `CRON_SECRET` bearer pattern) reads every flag's state from PostHog and reconciles our table — PostHog has no outbound webhook for flag edits, so this is the only way to catch a change made directly in its dashboard. Runs on a `vercel.json` cron (every 30 min) and via a "Sync now" button in Settings → Feature Flags.
  - Closed a pre-existing gap while in that route: the `PUT` handler never called `logSettingsChange()` even though `feature_flags` was already a valid audit area — now it does.
- [ ] `provider_portal` gates **public self-onboarding** ("Request access") in the Business app — mobile work, blocked on P0-17/P0-16 same as the rest of the Business app.
- [ ] Patient app: leave `BUSINESS_PROVIDER_ENABLED = false` (`app/(app)/_layout.tsx:37`) as it is — untouched, unchanged. Removed along with the old business code in P0-18.

---

## Phase 0b — Provider data model (D1–D4, D7)

### P0-10 · Rename to `providers` and add the lookup tables
- [ ] **Lookup tables.** `create type provider_kind`, plus `provider_types`, `capabilities`, `credential_types` and `provider_type_requirements`. Full DDL is in the brief (Data model → Schema draft).
- [ ] **Seed `provider_types`:**
  - `hospital_clinic`, `dental_clinic`, `eye_clinic`, `physio_centre`, `osteopathy_centre`, `prosthetics_centre`, `psychiatric_centre`, `care_home`, `maternity_home`, `diagnostic_lab`, `imaging_centre`, `health_school`, `herbal_centre`
  - `pharmacy`, `otc_medicine_seller`, `supplement_shop`, `healthy_food_shop`, `herbal_product_seller`, `wholesaler`, `medical_supplier`
  - `doctor`, `nurse_midwife`, `physiotherapist`, `dietitian`, `optometrist`, `counsellor`
  - `personal_trainer`, `gym`, `event_organiser`
  - `ambulance_service`
- [ ] **Seed `capabilities`:**
  - Vendor: `rx_medicines`, `otc_medicines`, `supplements`, `herbal_products`, `healthy_foods`, `medical_devices`, `wholesale`
  - Care facility: `bed_tracking`, `lab_tests`, `imaging`, `maternity`, `nhis_accredited`
  - Practitioner: `prescribe`, `video_consult`, `home_visits`, `answer_enquiries`
  - Trainer: `group_classes`, `outdoor_events`, `sell_programmes`
  - Ambulance: `basic_life_support`, `advanced_life_support`
- [ ] **Seed `credential_types`** (regulator in brackets), each with its `grants`:
  - `hefra_facility_licence` (HeFRA)
  - `pcg_premises_licence`, `pcg_epharmacy_reg`, `pcg_chemical_seller_licence`, `pcg_wholesale_licence` (PCG)
  - `fda_product_reg`, `fda_device_reg` (FDA)
  - `mdc_reg` (MDC), `nmc_reg` (NMC), `ahpc_reg` (AHPC), `gpc_reg` (GPC), `tmpc_licence` (TMPC), `nhia_accreditation` (NHIA)
  - `business_reg` (ORC), `trainer_cert` (admin-checked)
- [ ] `alter table facility_profile rename to providers`. The 21 foreign keys follow automatically.
- [ ] Add `kind`, `provider_type` (FK), `verification_status`, `description` and `is_online_only`; add `suspended` and `draft` to `facility_status_enum`. `ALTER TYPE … ADD VALUE` goes in its own migration, outside any transaction that uses the new value.
- [ ] Rename `facility_name` → `name`.
- [ ] Backfill the 3 rows: `dental_clinic` → `dental_clinic`/`care_facility`, `home` → `care_home`/`care_facility`, `pharmacy` → `pharmacy`/`vendor`. Then set `kind` and `provider_type` NOT NULL, drop `facility_type`, and drop the unused `facility_type_enum`.
- [ ] `provider_private`: copy `first_name, last_name, owner_email, person_contact_number, position, admin_notes, rejection_reason, status_reason` into it (plus `business_registration_number` and `tin_number` for vendors), then drop those columns from `providers`.
- [ ] **Compatibility view `facility_profile`:**
  - `security_barrier`; public columns only.
  - Aliases `name AS facility_name` and `provider_type AS facility_type`.
  - Shows rows where `status='active' and kind in ('care_facility','vendor')`, or the reader is the owner, or `is_app_admin()`.
  - Revoke insert/update/delete on it.
  - Old mobile builds use `.from('facility_profile').select('*')` in `hooks/use-facilities.ts:89,153,374`, so the view must keep every public column those screens read. Check `app/(app)/(auth)/Facility/[id].tsx` and `(ibpTabs)/facilities/*`.
- [ ] **RLS on `providers`:** the public reads active rows; owners read their own; **owners have no direct INSERT or UPDATE**; admins have everything.
- [ ] **RPCs:**
  - `update_my_provider(p_id, p_patch jsonb)`: allow-list is name, description, business_hours, contact_number, whatsapp_number, email, media_urls, featured_image_url, amenities, keywords.
  - `create_provider(...)` (admin/registrar); it replaces `register_facility_with_profile`.
  - `get_my_provider_context()`: returns a list of `{provider_id, kind, provider_type, name, capabilities[], status, verification_status, tier, has_beds}`, one entry per branch.
- **Accept:** the 3 facilities still show in the admin console and in the mobile directory; an anon request cannot see `owner_email`; `get_my_provider_context()` returns the pharmacy owner's row with `kind = vendor`.

### P0-11 · Credentials and capabilities
- [ ] Tables `provider_credentials` (unique on `(credential_type, number)`) and `provider_capabilities`. DDL is in the brief.
- [ ] Private storage bucket `provider-credentials`: signed URLs only; the owner uploads to their own folder; admins read.
- [ ] Migrate `providers.hefra_registration_number` and `verification_documents` into `provider_credentials` with `status='pending'`, then drop those columns.
- [ ] **Trigger: credential verified** → insert the capabilities listed in `credential_types.grants`, copying `expires_at`. Then recompute `providers.verification_status`: `verified` once every `required_for_activation` credential is verified.
- [ ] **Trigger: credential expired or revoked** → its capabilities are removed (FK cascade on `credential_id`), then `verification_status` is recomputed.
- [ ] Admin override: a capability with `source='admin_override'` requires `override_reason` and is written to the activity log.
- [ ] RPC `submit_credential(p_provider_id, p_type, p_number, p_document_path, p_issued, p_expires)` (owner).
- [ ] **pg_cron, daily:**
  - Send reminders 30, 7 and 1 days before expiry (`dispatch_notification` + email).
  - On the expiry day, set the credential's `status='expired'`.
  - Never suspend a provider automatically.
- **Accept:** approving a PCG premises licence grants `otc_medicines`; setting it expired removes the capability and hides dependent catalogue items from public reads.

### P0-12 · Catalogue, kind extensions and audit log
- [ ] `provider_catalogue_items`:
  - `drug_id` → `drugs`, `capability_required` → `capabilities`, `regulatory_number` for FDA items.
  - Status runs `draft → pending_review → published / rejected / archived`.
  - Trigger: an item can't be published unless the provider holds `capability_required`.
  - `upsert_catalogue_item()` sets `pending_review` when `capabilities.requires_item_review` is true.
  - The public reads only published items of active providers that still hold the capability.
- [ ] `provider_vendor_details` (fulfilment_modes, delivery_radius_km, min_order_amount).
- [ ] `provider_practitioner_details` (hcp_verification_id, consult_modes, home_visit_radius_km, languages).
- [ ] `fitness_trainers.provider_id` (unique FK) and `ambulances.operator_id` (FK).
- [ ] `provider_activity_log`, with `device_id` taken from the `x-device-id` request header, written by triggers on providers, credentials, capabilities and catalogue.
- [ ] Retire the empty tables once admin code no longer references them: `ibp`, `ibp_products`, `ibp_activity_log`, `enquiry_responses.ibp_id`, `facility_offerings`. Also retire `features/ibp/*` and `offerings-section.tsx`.
- **Accept:** `pnpm knip` shows no references to the dropped tables; the contract suite passes.

### P0-13 · Update functions that reference `facility_profile`
These still work through the view, but writes and new logic must go through `providers`.
- [ ] Update the functions that write: `admin_update_facility_profile`, `admin_change_facility_status`, `admin_delete_facility`, `registrar_update_own_facility`, `register_facility_with_profile` (replaced by `create_provider`), `sync_top_rated_facility_flag`.
- [ ] Update the read-only functions (they use the view until changed): `get_facilities_map` (filter `kind in ('care_facility','vendor')` and `provider_types.is_listed`), `global_search`, `global_search_v2`, `admin_global_search`, `submit_medication_enquiry`, `get_my_medication_enquiries`, `get_medication_enquiry_detail`, `get_med_enquiry_overview`, `get_job_listings`, `get_job_details`, `get_my_applications`, `get_saved_jobs`, `notify_job_alert_matches`, `get_facility_dashboard_metrics`, `get_platform_overview_metrics`, `get_admin_dashboard_stats`, `get_dashboard_metrics`, `capture_daily_metrics`, `get_bedtracker_route_suggestions`, `admin_perform_facility_review_action`, `build_top_rated_module_data`, `search_top_rated_items`, `get_registrar_trails`.
- [ ] Add `search_providers(p_kind, p_type, p_capability, p_lat, p_lng, p_radius_km, p_query, p_limit, p_offset)` for the new mobile directory.

### P0-14 · Admin console: Providers module
- [ ] `features/providers/` replaces `features/facilities` and `features/ibp`. Keep the old URLs re-exporting until the sidebar moves.
- [ ] List view filtered by kind, type, status, verification, tier and region.
- [ ] Detail tabs: **Profile · Credentials · Capabilities · Catalogue · Reviews · Subscription · Payouts (read-only until D12) · Deliveries · Activity**.
- [ ] Admin home queues: credentials to review, catalogue to review, expiring within 30 days, onboarding requests.
- [ ] Settings: editors for provider types, credential types and capabilities.
- [ ] Permission keys added to `admin_permissions` / `admin_role_permissions`: `providers.view`, `providers.create`, `providers.edit`, `providers.verify`, `providers.suspend`, `catalogue.review`, `provider_types.manage`.
- [ ] Suspend flow: a reason is required; the provider is hidden from the directory and from enquiry matching; open orders continue.

### P0-15 · Provider inbox and alerts
- [ ] `provider_inbox` table: provider_id, item_type (`enquiry | booking | review | chat | job_application | credential | system`), ref_id, status, created_at, read_at.
- [ ] `dispatch_provider_alert(p_provider_id, …)`: writes an inbox row and calls `dispatch_notification` for the owner's push tokens.
- [ ] **Push tokens per app:**
  - Add `user_push_tokens.app text not null default 'consumer' check (app in ('consumer','business'))`.
  - Add a new parameter to `register_push_token`: `p_app text default 'consumer'`. This is additive, so old builds keep working. The Business app sends `'business'`.
  - `dispatch_provider_alert` sends only to `app = 'business'` tokens. Patient notifications (`dispatch_notification`) send only to `app = 'consumer'` tokens.
  - A `{member,provider}` user on one phone must not get provider alerts in the 4 Our Life app.
- [ ] Business app: an Android notification channel "New requests" (high importance, custom loud sound) and iOS time-sensitive notifications for requests and ambulance alerts.
- [ ] Business app: the inbox badge on the tabs, and push deep links into the right screen.

### P0-16 · Business app shell (`apps/business`)
- UI mockups for every provider screen: generate from `../4-Our-Life-App/provider-portal-ui-mockup-prompt.md` (Sheets 00–20) and build to match them.
- [ ] Tab layout (`apps/business/app/(tabs)/_layout.tsx`) uses **NativeTabs** (`expo-router/unstable-native-tabs`, SDK 56: Liquid Glass on iOS 26, Material 3 on Android).
  - NativeTabs must be static, so use **one tab-layout group per kind**: `(vendor)`, `(facility)`, `(practitioner)`, `(trainer)`, `(ambulance)`.
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

### P1-03 · Orders tab (fulfilment, not money)
- [ ] Vendor RPCs `mark_order_ready`, `mark_order_dispatched`, `mark_order_delivered(proof_url)`; pickup-code check.
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
