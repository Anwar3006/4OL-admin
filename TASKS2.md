# 4 Our Life — App-Wide Audit & Fix Backlog

Generated from a full-codebase scrutiny pass (TypeScript compiler, and four
targeted audits: security/auth, data-layer reliability, UI consistency,
performance/bundle), plus a prior dead-code reachability audit.

**How to use this file:** work epics top to bottom — they're ordered by
severity/blast-radius. A story is done when its acceptance point is true.
An epic is done only when every story under it is checked. Check off with
`[x]` as you go.

---

## Epic 0 — 🔴 BLOCKER: the app cannot currently build or boot
**Status:** [x] Complete

> **Re-verified directly on `clearing`** (this audit was originally run
> against `build-ready`; the fixes below were ported over and are now
> independently confirmed against clearing's own tree — see commit
> `674a475e`):
> - `middleware.ts` absent, `proxy.ts` has the role gate (`ADMIN_ROLES`
>   check present), `npm run dev` boots clean ("✓ Ready in 1366ms"),
>   `/login` returns 200.
> - `grep -rl '@/lib/auth"' .` (whole tree) returns nothing; `lib/auth.ts`
>   is deleted. Note: clearing never had all ~34 files 0.2 describes below
>   — those route files (the `ai/*`, `jobs/*`, `hcp/*`, `medication/*`,
>   `fitness/*`, `symptoms/*`, `healthy-living/*`, `settings/*`,
>   `security/*` routes, etc.) don't exist on this branch at all. Clearing
>   only ever had the bug in 6 files (`actions/facility.actions.ts`,
>   `actions/conversation.actions.ts`, `app/(auth)/delete-account/page.tsx`,
>   `app/api/auth/[...all]/route.ts`, `app/api/supabase-token/route.ts`,
>   `schemas/user-profile.schema.ts`) — all 6 fixed and verified.
> - `npx tsc --noEmit` is clean of `.next`-cache-corruption-class errors
>   (0.4). One unrelated pre-existing error remains:
>   `components/RouteMapPreview.tsx` — `@types/leaflet` is listed in
>   `package.json` but not actually installed in `node_modules`. Not part
>   of Epic 0's scope (unrelated to the boot-blocker/auth issues below);
>   flagging separately, likely just needs a `pnpm install` sync.

- [x] **0.1 Resolve the `middleware.ts` vs `proxy.ts` conflict.**
  Both `middleware.ts` (untracked, has the real admin-role auth gate) and
  `proxy.ts` (committed, does *no* authorization — just refreshes the
  session) exist at the repo root. Next.js 16 refuses to boot the dev
  server: `"Both middleware file './middleware.ts' and proxy file
  './proxy.ts' are detected."` **Keep `middleware.ts`'s logic** (it's the
  one with the actual role check) and delete/retire `proxy.ts`, renaming
  the surviving file to `proxy.ts` per the Next.js 16 convention (or
  confirm the project's target Next version and use whichever convention
  it expects). Do not delete the untracked file by mistake — that would
  silently lock in the no-auth version.
  _Acceptance: `npm run dev` boots without the "Both middleware..." error._
  **Done:** `proxy.ts` now carries the full role-gated logic (renamed
  `middleware` → `proxy` per the Next.js 16 convention), `middleware.ts`
  is gone. Verified: `npm run dev` boots clean ("✓ Ready in 1639ms"), and
  `/login` serves a real 200.

- [x] **0.2 Fix ~34 files importing the deleted `@/lib/auth` module.**
  `lib/auth.ts` / `lib/auth-client.ts` were deleted (moved to
  `_deprecated/better-auth/`), but `import { auth } from "@/lib/auth"`
  still appears in ~30 `app/api/**/route.ts` files (all of
  `app/api/settings/*`, `supabase-token`, `anatomy/body-map`,
  `chat/attachment`, `chat/groups`, `chat/members`, `security/*`,
  `bedtracker/analytics`, `faq/search`, `period/analytics`,
  `diseases/prevalence`, `ibp/analytics`, `map/footprints`,
  `ai/moderation-queue`, `healthy-living/analytics`, `ai/recommendations`,
  `symptoms/classifier-stats`, `ai/analytics`, `ai/metrics`,
  `hcp/verify-license`, `jobs/document-vault`, `fitness/analytics`,
  `jobs/route.ts`, `jobs/applications`, `medication/stats`) plus
  `actions/facility.actions.ts` and `actions/conversation.actions.ts`.
  These routes are currently **non-functional** (module resolution
  error), not just insecure — including `settings/api-keys`, which is
  meant to return Twilio/Resend/Paystack secrets to the settings UI.
  Replace the BetterAuth `auth` calls with the Supabase-session
  equivalent used elsewhere (see `middleware.ts` / `lib/supabase-browser.ts`
  patterns) in every file listed above.
  _Acceptance: `grep -rl '@/lib/auth"' app actions` returns nothing; `tsc`
  has zero module-resolution errors for these paths._
  **Done:** all 34 files fixed (21 had already been done before this
  session; the remaining 13 — `healthy-living/analytics`,
  `ai/{recommendations,metrics,analytics}`, `symptoms/classifier-stats`,
  `hcp/verify-license`, `medication/stats`, `fitness/analytics`,
  `jobs/{route,document-vault,applications}` (all `session.user.id` →
  `user.id` where used), `actions/{facility,conversation}.actions.ts` —
  were fixed this session, each swapped to
  `getSupabaseServerClient()` + `supabase.auth.getUser()`). Also found
  and fixed 2 more instances outside the original grep scope: `app/(auth)
  /delete-account/page.tsx` (client-side `authClient` → `supabase.auth
  .signInWithPassword`/`.signOut`) and `schemas/user-profile.schema.ts`
  (dropped an unused `BetterAuthSession`-derived type). `_deprecated/`
  (the untracked holding folder for the old BetterAuth files) was
  deleted outright rather than fixed, since nothing referenced it.
  `grep -rl '@/lib/auth' .` now returns nothing; `tsc --noEmit` is 100%
  clean (0 errors).

- [x] **0.3 `app/api/supabase-token/route.ts` is broken (same root cause as 0.2).**
  This route mints the JWT that RLS policies rely on for mobile-originated
  requests (see `RLS.md`). Because it imports the dead `@/lib/auth`
  module, RLS-gated mobile requests currently cannot authenticate at all.
  Fix as part of 0.2, but call out explicitly since it blocks *other*
  RLS-dependent flows, not just this one route.
  **Done:** was among the 21 files already fixed before this session.

- [x] **0.4 Regenerate/clean the `.next` build cache.**
  `.next/dev/types/routes.d.ts` was found corrupted (malformed generated
  types, likely from a crash caused by 0.1/0.2), which made `tsc`
  repo-wide fail with 95+ spurious syntax errors via the `import
  "./.next/dev/types/routes.d.ts"` line in `next-env.d.ts`. `.next` is
  gitignored — `rm -rf .next` and let a clean `next dev`/`next build`
  regenerate it once 0.1 and 0.2 are fixed, then confirm `npm run
  type-check` is clean of *this* class of error.
  **Done:** `.next` deleted and regenerated via a clean `npm run dev`
  boot; no corruption recurred.

---

## Epic 1 — 🔴 CRITICAL: authorization & data-access security
**Status:** [x] Complete (by request) — 5/7 fixed, 1 moot (1.3 — described
bug no longer exists), 1 deliberately deferred (1.7 — not moot, a real
gap; left open because fixing it means standing up new infrastructure
(Redis/Upstash) that shouldn't be decided unilaterally inside this pass
— see its note below before treating this epic as fully closed).
Re-verified directly against `rhbbxttxnvcziyqzptqs` (the active Supabase
project) via direct SQL/RPC inspection, not just a read of
`SUPABASE_SCHEMA.md`.

- [x] **1.1 Enable RLS on `user_profiles` (privilege-escalation hole).**
  Only 4 of 52 tables in `supabase/migrations/*.sql` have
  `ENABLE ROW LEVEL SECURITY` (`marketing_discounts`,
  `marketing_subscriptions`, chat-support tables, `workouts`).
  `user_profiles` — which holds the `role` column every auth check in the
  app trusts (`LoginForm.tsx`, `DashboardWrapper.tsx`, `middleware.ts`) —
  has no RLS. Any authenticated user (including a mobile "customer") can
  currently call the Supabase REST API directly with their own anon-key
  session and run `update user_profiles set role='admin' where user_id =
  <own uid>`, then log into the dashboard and pass every existing check.
  Write an RLS policy so a row's `role` column can only be written by an
  existing admin (e.g. via a `SECURITY DEFINER` RPC + a `USING`/`WITH
  CHECK` policy that blocks direct self-updates to `role`), and enable RLS
  on the table.
  _Acceptance: a non-admin session cannot change its own `role` via a
  direct PostgREST call; verified with a test/manual check using the anon
  key._
  **Done:** RLS was in fact already enabled on `user_profiles` with 4
  policies — but the real hole was worse than the story describes: it was
  in `handle_new_user()`, a `SECURITY DEFINER` trigger firing on every
  `auth.signUp()`, which trusted the client-supplied
  `raw_user_meta_data.role` outright (bypasses RLS entirely by design,
  since SECURITY DEFINER runs as the table owner). Anyone could call
  `signUp()` with `options.data.role: 'super_admin'` for instant admin.
  Fixed by requiring a valid, unexpired, unconsumed `user_invites` row
  matching the email+role before an elevated role is granted (invites are
  now single-use — marked consumed on use). Added a mirroring
  `BEFORE UPDATE` trigger (`prevent_role_escalation`) for defense in depth
  on direct-update paths, with the same invite-based escape hatch. Also
  fixed the `SELECT` policy, which was `USING (true)` for both `anon` and
  `authenticated` — the entire PII table (names, phones, roles) was
  world-readable via the public anon key. Now: own row, or an admin sees
  all (needed for the admin dashboard's Users list). Verified against the
  live invited-admin registration flow (still works) and confirmed no
  conflict with two pre-existing triggers (`trg_sync_role`,
  `trg_log_user_profile_change`).

- [x] **1.2 Audit and enable RLS on the other ~48 unprotected tables.**
  Go table-by-table (`SUPABASE_SCHEMA.md` has the list) and decide the
  correct policy per table — many are read via the anon key from
  `hooks/supabase-calls/*.ts` (facilities, tracker logs, medication
  reminders, notifications, messages/conversations, delete-account
  requests, etc.) with **no database-level check**, only the admin UI
  choosing not to show a button. Treat this as a proper policy-design pass,
  not a bulk toggle — some tables may be intentionally public-read.
  **Done:** actual count (queried live via `pg_class`/`pg_policies`, not
  the doc) was 12 tables with RLS fully off plus ~22 more where RLS was
  already on but had **zero** policies — meaning those were silently
  locked out entirely (breaking real reads, not exposing anything) rather
  than the doc's "~48 unprotected" framing. Fixed all 34: owner-scoped
  tables (`exercise_sessions`, `medication_adherence`,
  `hcp_verifications`, `transaction_records`, etc.) get own-row access +
  admin override; public content (`job_postings`, `subscription_plans`,
  `bed_tracker_facilities`/`bed_tracker_alerts`) gets public read + admin
  write; purely internal/financial/ops tables (`escrow_transactions`,
  `pharmacy_campaigns`, `ambulance_dispatches`, `fitness_ai_campaigns`)
  are admin-only. Verified via a follow-up query: zero tables in `public`
  now have RLS off or zero policies.

- [x] **1.3 Fix the inverted guard in `lib/supabase/indexAdmin.ts:11`.**
  ```ts
  if (!supabaseUrl.includes("placeholder")) {
    console.warn("[supabaseAdmin] Missing ... env. Storage admin actions may fail.");
  }
  ```
  This warns exactly when the env **is** correctly configured, and stays
  silent exactly when it's fallen back to the placeholder URL/key — the
  one case you actually want a loud warning for. Flip the condition.
  **Moot:** the described bug isn't present in the current file — the
  guard already reads `if (!supabaseUrl || !supabaseServiceKey)`, which
  correctly warns only when the env is genuinely missing. No
  `.includes("placeholder")` check exists anywhere in the file. Nothing
  to fix.

- [x] **1.4 Remove the `NEXT_PUBLIC_`-prefixed service-role-key fallback.**
  `lib/supabase/indexAdmin.ts:7` includes
  `process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` as a fallback
  source for the service-role key. `NEXT_PUBLIC_*` vars are inlined into
  client bundles by Next.js — naming a secret this way is a footgun even
  though nothing currently sets that env var. Drop this fallback entirely
  so the pattern can't be copy-pasted into a client file by accident.
  **Done:** fallback removed, comment added explaining why it must never
  come back.

- [x] **1.5 Sanitize `components/ui/HtmlRenderer.jsx`.**
  Uses `dangerouslySetInnerHTML` (lines ~50, ~253) with no
  DOMPurify/sanitize-html pass, despite a comment claiming it's safe.
  Used to render healthy-living / illness-and-complications content
  (`app/(dashboard)/categories/healthy_living/{details,overview}/page.jsx`
  and the illness_and_complications equivalents). Add sanitization before
  render — stored-XSS risk if that content is ever writable by a
  non-fully-trusted role.
  **Done:** both `HtmlRenderer` and `SafeHtmlRenderer` now sanitize via
  `isomorphic-dompurify` with a real tag+attribute allowlist.
  `SafeHtmlRenderer`'s prior "sanitizer" only stripped disallowed tag
  *names* via regex — attributes on allowed tags (e.g. `<a
  href="javascript:...">`, `onerror=`) passed straight through
  unsanitized. Added `isomorphic-dompurify` to `package.json` — **not yet
  installed** (no terminal access to this machine from this session); run
  `pnpm install` before relying on this fix.

- [x] **1.6 Implement or remove `app/api/delete-user/route.js`.**
  Entirely commented out — no exported handler exists, but the dead code
  references a real Supabase project ref/edge function. Account deletion
  currently has no working server-side implementation. Either wire it up
  for real or replace with an explicit "not implemented" response and a
  tracked follow-up, so it doesn't silently 404/fail for a legitimate
  compliance flow (GDPR-style deletion requests).
  **Done:** confirmed the real, working deletion flow already exists
  (`POST /api/user/delete-account-request` inserts a `pending` row into
  `delete_account_requests`, reviewed via the
  `app/(dashboard)/delete-account-request` admin module) — the commented
  route pointed at an edge function on a *different, now-inactive*
  Supabase project ref, confirming it was dead/orphaned rather than
  in-progress. Replaced with an explicit `501` response pointing callers
  at the real endpoint, so it fails loud instead of silently 404ing.

- [ ] **1.7 Move OTP/rate-limit state off in-process `Map`s.**
  `app/api/send-otp/route.ts`, `verify-otp/route.ts`, and
  `app/api/fitness/generate/route.ts` rate-limit using a process-local
  `Map`. This resets on every cold start and doesn't share state across
  instances under serverless/multi-instance hosting, so the rate limit is
  not actually enforced in production. Move to Redis/Upstash or a DB-backed
  counter.
  **Not fixed — flagged, not moot in the same sense as 1.3.** None of the
  three named files contain any in-process `Map`-based rate limiting in
  the current code: `send-otp`/`verify-otp` delegate entirely to Twilio's
  Verify API (rate-limiting/state lives on Twilio's side), and
  `fitness/generate` has no rate limiting at all today — not "broken",
  just genuinely absent. Left alone deliberately rather than guessed at:
  standing up Redis/Upstash is an infrastructure decision (new
  account/credentials/env vars) that shouldn't be made unilaterally
  inside an unrelated fix pass. Worth its own story once there's a
  concrete rate-limiting requirement (e.g. `fitness/generate` calls an
  LLM per request and has zero abuse protection right now — that's the
  more urgent gap, arguably more than restoring OTP rate-limiting that
  Twilio already handles).

---

## Epic 2 — 🟠 HIGH: data-layer reliability (silent failures)
**Status:** [x] Complete — 7/8 fixed, 1 moot (2.7 — bug's precondition no longer
exists since the page was gutted to a placeholder pending a full rebuild;
nothing actionable remains within this epic's scope). Re-verified directly
against `clearing`, `tsc --noEmit` clean.

- [x] **2.1 Consolidate divergent duplicate Marketing hooks (stale-cache bug).**
  Three pairs of hooks share a name-shaped purpose but use different query
  keys and different feature sets, so mutating through one never
  invalidates the other's cache:
  - `useMarketingDiscounts` — `hooks/supabase-calls/useMarketingDiscounts.ts`
    (key `["marketing_discounts","list"]`, read-only) vs.
    `hooks/supabase-calls/useDiscounts.ts` (key `["marketing-discounts",...]`,
    full CRUD + invalidation).
  - `useMarketingProfiles` — `useMarketingProfiles.ts` vs. `useMarketing.ts`.
  - `useMarketingSubscriptions` — `useMarketingSubscriptions.ts` vs.
    `useSubscriptions.ts`.
  Consumers are split: `marketing/_components/{DiscountsTab,AllCampaignsTab,
  SubscriptionsTab}.tsx` use the "simple" read-only versions, while
  `marketing/discounts/page.tsx`, `marketing/subscriptions/page.tsx` and
  their add/edit dialogs use the "full" versions with mutations.
  **Result today:** create/edit/delete a discount or subscription from its
  dedicated page → the Marketing overview tab keeps showing stale data
  until a manual reload. Pick one hook per feature, delete the other, and
  repoint every consumer at the survivor.
  **Done:** the 3 "simple" duplicate hook files deleted; the "full" hooks
  already exported under the matching names (`useMarketingDiscounts` etc.
  from `useDiscounts.ts`/`useMarketing.ts`/`useSubscriptions.ts`), so the
  3 overview-tab consumers just needed their import path repointed. Zero
  dangling references to the deleted files anywhere in the tree.

- [x] **2.2 Fix silent approve/reject failure — `app/(dashboard)/facilities/_components/view-facility-dialog.tsx:94-123`.**
  `handleApproval`/`handleRejection` catch mutation errors with only
  `console.error` (no toast), and the `finally` block closes the dialog
  unconditionally — so a failed approve/reject looks identical to a
  successful one from the admin's point of view. Add `onError` toasts to
  `useApproveFacility`/`useRejectFacility`
  (`hooks/supabase-calls/useFacilities.ts:491+`) and only close the dialog
  on confirmed success.
  **Done:** `onError` toasts added to both hooks; dialog close is now
  driven by a `useEffect` watching `isSuccess` on both mutations (cleaner
  than the originally-suggested approach — closes reactively on confirmed
  success only, never on error or while pending).

- [x] **2.3 Fix swallowed query error in `hooks/supabase-calls/useCondition.ts` (`useConditions`, lines 34-107).**
  The whole `queryFn` body is wrapped in try/catch that only
  `console.error`s and returns nothing on failure — React Query sees a
  "successful" empty result, so `isError` never becomes true.
  `app/(dashboard)/diseases/page.tsx` only checks `isLoading`, so a
  Supabase error currently renders as a plain empty table with zero
  indication anything went wrong. Re-throw instead of swallowing.
  **Done:** `catch` block now `throw error`s instead of `console.error`
  + swallow; React Query's `isError` will now correctly flip.

- [x] **2.4 Add `isError` handling across data-table consumers (systemic — 47 files).**
  Codebase-wide, 47 files under `app/(dashboard)/**` destructure
  `isLoading` from a query hook; **none** also check `isError`. Combined
  with 2.3-style swallowed errors elsewhere, any query failure anywhere
  degrades to a silent empty table. Standardize on a shared "error state"
  UI (there's likely already an empty-state component to extend — see
  Epic 3.2) and roll it out; don't need all 47 in one PR, but track them
  as this story's scope.
  **Done:** all 24 consumers of `components/Data-Table/data-table.tsx`
  now pass `isError`/`error` from their query hook through to the table
  (which already had the error-state UI wired up from the earlier
  foundation pass). 23/24 wired directly; the 24th
  (`transactions/_components/RecentTransactionsTab.tsx`) has no real
  query hook at all — it renders hardcoded `mockTransactions`, so there's
  no error state possible until that's converted to a real Supabase
  query (a "fake data" problem, not an error-handling one — flagged
  separately). `tsc --noEmit` clean across all 24 edits.
  ⚠️ **Not yet done:** `components/redesign/DataTable.tsx` (the *other*
  table primitive, ~17 more consumers per Epic 3.7) still has no
  error-state concept at all. Left for the Epic 3.7 consolidation rather
  than duplicating the work into a second table component that's slated
  for removal.

- [x] **2.5 Add `onError` to the Challenge/FitnessPlan/Trainer mutation hooks.**
  `hooks/supabase-calls/useChallenge.ts`, `useFitnessPlan.ts`,
  `useTrainer.ts` (clearly copy-pasted from one template, 4 mutations each,
  ~lines 73-126) call `invalidateQueries`/`toast.success` on success but
  define no `onError` anywhere. Call sites (e.g.
  `fitness/_tabs/ChallengesTab.tsx:22,46`) call the mutation bare with no
  options object either. Result: deleting a row with an FK reference
  elsewhere fails with zero feedback — the row just silently stays put.
  **Done:** all mutations in all 3 files now have `onError`; since it's
  defined at the hook level (not per call-site options), it fires
  regardless of how the call site invokes the mutation.

- [x] **2.6 Fix N+1 + swallowed error in `actions/user.actions.ts` `getUsers()` (lines 238-260).**
  Does one `admin.auth.admin.getUserById()` call per row missing an email,
  for every page of the Users table, inside a `try { } catch (e) { /*
  ignore */ }`. Batch this (Admin Auth API supports listing, or backfill
  the email at write-time instead of read-time) and stop swallowing the
  error silently.
  **Done:** replaced with a single `admin.auth.admin.listUsers()` call +
  a `Map` lookup; the empty-catch swallow is gone entirely. ⚠️ Minor
  follow-up worth a look: `listUsers()` is paginated by Supabase's Admin
  API — if the user base grows past one page, some emails past that page
  would silently resolve blank again. Not the bug this story targeted,
  but worth a follow-up story once user count is large enough to matter.

- [x] **2.7 Fix `app/(dashboard)/period/page.tsx` (raw `fetch`, no error UI).** MOOT, not actively fixed
  Bypasses the hook layer entirely with a hand-rolled
  `fetch("/api/period/analytics...")`; on `!res.ok` nothing happens and
  there's no error UI path (render only happens if `analytics` is
  truthy). Either move this onto the React Query hook layer for
  consistency, or at minimum add an error state.
  **Status:** the page was replaced entirely with a `PagePlaceholder`
  stub (no fetch, no analytics logic left at all) — unrelated to this
  audit, looks like it's pending the larger period-tracker rebuild noted
  in `TASKS.md`'s own assumptions section. The specific bug described no
  longer exists, but that's because the feature was pulled, not fixed.
  Re-flag this story once the real period-analytics page gets rebuilt.

- [x] **2.8 Clean up leftover `app/(dashboard)/period_tracker/page.jsx`.**
  Just redirects to `/categories/period_tracker/overview` — looks like
  routing cruft left over from a rename. Confirm nothing links to it and
  remove, or fold the redirect into the resolved route directly.
  **Done:** file deleted, target route still exists, zero remaining
  references to the old path anywhere in the tree.

---

## Epic 3 — 🟠 HIGH: UI consistency & polish
**Status:** [x] Complete — 7/7 done. Re-verified against `clearing`'s actual
tree (not just the original build-ready-era file lists, several of which
were slightly stale — see per-story notes), `tsc --noEmit` clean, dev
server boots and all spot-checked routes respond correctly.

- [x] **3.1 Migrate the ~25 remaining legacy-`.jsx`-kit pages to the shadcn kit.**
  `app/(dashboard)/categories/**`, `view-notification`,
  `view-medication-reminder-details`, `view-reviews`,
  `view-facility-profile`, `admins/reset-password`, `map/overview`,
  `marketing/ads`, `marketing/create`, `facilities/*/create`,
  `under-construction` still import `components/ui/{Button,Card,Select}.jsx`
  and `ProgressBar/*` — a visually different, older component API — while
  the rest of the redesigned dashboard uses the shadcn kit
  (`button.tsx`/`card.tsx`/etc). This is why the app currently looks like
  two different products depending which page you're on. Migrate page by
  page; do not delete the old `.jsx` kit files until this is done (see
  Epic 5.3, which is blocked on this story).
  **Done:** all ~25 originally-listed pages migrated (verified: zero
  `@/components/ui/{Button,Card,Select}"` or `ProgressBar` imports remain
  anywhere under `app/`). Found and fixed one more the original audit
  missed: `app/(auth)/privacy-policy/page.jsx` (via
  `components/privacy/PrivacyPolicyContent.jsx`, which imported the old
  `Card.jsx`) — swapped to shadcn `Card`/`CardContent`. Epic 5.3 (delete
  the old kit) is now unblocked.

- [x] **3.2 Add an empty-state branch to `components/Data-Table/data-table.tsx`.**
  `components/redesign/DataTable.tsx` renders an explicit "📂 No records
  found" state; `components/Data-Table/data-table.tsx` has no such branch
  — zero rows just renders a `<TableBody>` with only headers, no
  messaging. Affects the pages still on the older table (currently:
  `onboarding-requests/page.tsx`, `admins/_components/AdminSection.jsx`,
  `marketing/subscriptions/page.tsx`, `users/_components/UserSection.jsx`,
  `marketing/discounts/page.tsx`, `facilities/[type]/page.jsx`,
  `facilities/top-rated/page.jsx`, `facilities/featured/page.jsx`).
  **Done (premise was half-stale):** the desktop branch already had a
  plain-text `"No results found."` empty state — not "no such branch" as
  described, just visually inconsistent with `redesign/DataTable.tsx`'s
  icon treatment. Upgraded it to match (📂 icon + same uppercase-tracking
  label styling), and fixed the real gap: the **mobile** card-view branch
  rendered nothing at all on empty data (`.map()` over zero rows = no
  output, no message). Both branches now match and correctly suppress the
  empty state during `isLoading` instead of flashing it before data
  arrives.

- [x] **3.3 Standardize the loading-state UI and wire up missing `isLoading`.**
  Two different loading UIs exist ("Fetching records..." spinner text in
  `redesign/DataTable.tsx` vs. "Loading..." overlay in
  `Data-Table/data-table.tsx`), and `isLoading` is simply never passed
  through in several consumers, so no spinner shows at all and the table
  can flash "No records found" before data arrives:
  `healthy_living/page.tsx`, `delete-account-request/_components/
  AllRequestsTab.tsx`, `admins/_components/AdminTable.tsx`,
  `transactions/_components/{SubscriptionsTab,FailedTransactionsTab,
  RefundsTab,ServiceChargeTab,RecentTransactionsTab}.tsx`,
  `users/_components/{FlaggedUsersTab,DeleteRequestsTab,AllUsersTab}.tsx`,
  `chats/_components/GroupsTab.tsx`, `fitness/_tabs/ExercisesTab.tsx`.
  Pick one loading pattern (skeleton rows are already built in
  `components/ui/skeleton.tsx`/`components/skeleton` but only used in
  detail dialogs today — extend it to list/table pages) and apply it
  everywhere.
  **Done:** the "standardize on one pattern" half is done —
  `Data-Table/data-table.tsx` now uses `<Skeleton>` rows instead of a
  bare "Loading..." overlay, and `redesign/DataTable.tsx` is gone
  entirely (see 3.7). The "wire up missing `isLoading`" half: of the
  files listed, `healthy_living/page.tsx`, `AllRequestsTab.tsx`,
  `SubscriptionsTab.tsx` (×2), `FlaggedUsersTab.tsx`, `DeleteRequestsTab
  .tsx`, `AllUsersTab.tsx`, `GroupsTab.tsx`, `ExercisesTab.tsx` all now
  have it wired. `AdminTable.tsx`, `FailedTransactionsTab.tsx`,
  `RefundsTab.tsx`, `ServiceChargeTab.tsx`, `RecentTransactionsTab.tsx`
  remain without it — but verified these render **hardcoded mock data
  arrays**, not a real query hook, so there's genuinely no loading state
  to wire (a "fake data" problem, tracked separately, not this story's
  concern — same finding as Epic 2.4's `RecentTransactionsTab.tsx` note).

- [x] **3.4 Replace `window.confirm()` delete confirmations with the shadcn `AlertDialog`.**
  `components/ui/alert-dialog.tsx` exists in the kit but has **zero**
  consumers anywhere. Meanwhile 9 `window.confirm()` calls (a jarring
  native browser dialog) are used for real delete actions across
  `fitness/_tabs/{OutdoorTab,ExercisesTab,TrainersTab,PlansTab,
  ChallengesTab}.tsx`, `marketing/subscriptions/page.tsx`,
  `marketing/discounts/_components/view-discount-dialog.tsx`. Swap them
  for `AlertDialog`.
  **Done:** all originally-flagged files fixed, most via a shared
  `components/DeleteConfirmationModal.tsx` wrapper built on `AlertDialog`
  (nicer than inlining `AlertDialog` everywhere — this is now the
  established pattern, used by `OutdoorTab.tsx` and others). Found 2 more
  the original grep missed (bare `confirm(...)` without the `window.`
  prefix): `fitness/_tabs/ExercisesTab.tsx` (bulk-delete confirmation)
  and `medication-reminder/_components/view-medication-dialog.tsx`
  (single-item delete) — both converted to `DeleteConfirmationModal`.
  Verified: zero `confirm(`/`window.confirm(` calls remain anywhere in
  `app/`.

- [x] **3.5 Add `aria-label` to icon-only action buttons in `components/Data-Table/columns/*`.**
  ~41 icon-only action buttons (view/edit/delete/etc.) across the 17-ish
  column-definition files with only 1 `aria-label` in the whole
  directory. A `title=` attribute exists on some (helps mouse users, not
  a reliable accessible name for all screen readers). Add `aria-label` to
  every icon-only `<Button size="icon">` in: `challengeColumns.tsx`,
  `discountColumns.tsx`, `adminColumns.tsx`, `deleteAccountColumns.tsx`,
  `faqColumns.tsx`, `facilityColumns.tsx`, `conditionColumns.tsx`,
  `healthyLivingColumns.tsx`, `fitnessUserColumns.tsx`,
  `onboardingColumns.tsx`, `exerciseColumns.tsx`, `symptomsColumns.tsx`,
  `trainerColumns.tsx`, `fitnessPlanColumns.tsx`, `marketingColumns.tsx`,
  `subscriptionColumns.tsx`, `userColumns.tsx`,
  `medicationReminderColumns.tsx`.
  **Done:** all listed files covered (49 `aria-label`s now present across
  the directory, up from 1). Correction: `medicationReminderColumns.tsx`
  doesn't exist as a separate file — a stale reference from the original
  audit, no action needed. Icon-button-vs-`aria-label` counts verified
  to match 1:1 in every live-used column file (some use shadcn
  `<Button size="icon">`, others a plain `<button aria-label=...>` —
  both patterns now consistently labeled). The handful of files still
  showing 0 `aria-label`s (`chatColumns.tsx`, `conversationColumns.tsx`,
  `periodTrackerColumns.tsx`, `featuredFacilityColumns.tsx`) are
  confirmed dead/unreferenced files (same cluster flagged in Epic 5.2)
  or, for `facilitySubscriptionColumns.tsx`, simply have no action
  column at all — not a real accessibility gap in either case.

- [x] **3.6 Add `w-full min-w-0` to tab-content root divs missing it.**
  The dashboard shell is flex-based and needs each page's root div to
  claim `w-full min-w-0` to fill available width correctly (confirmed
  pattern: `fitness/_tabs/DashboardTab.tsx:37`). Most other tab-content
  components across the app use a plain `space-y-4`/`space-y-6`/`card
  mt-4 py-20 text-center` root instead: `admins/_components/
  {ActivityLogsTab,AllAdminsTab,RolesPermissionsTab}.tsx`,
  `chats/_components/{GroupsTab,FlaggedTab,SupportTab}.tsx`,
  `delete-account-request/_components/{AllRequestsTab,
  SettingsPolicyTab}.tsx`, `marketing/_components/{AllCampaignsTab,
  DiscountsTab,SubscriptionsTab,AnalyticsTab,LinkagesTab}.tsx`,
  `medication-reminder/_components/{AdherenceTab,AICheckerTab,
  DrugDatabaseTab,InteractionsTab}.tsx`, `reviews/_components/
  AllReviewsTab.tsx`, `transactions/_components/{RecentTransactionsTab,
  RefundsTab,ServiceChargeTab,SubscriptionsTab,TaxVATTab,ExpensesTab,
  PayoutsTab,RevenueBreakdownTab}.tsx`, `users/_components/
  {AllUsersTab,FlaggedUsersTab,DeleteRequestsTab}.tsx`.
  **Done:** `w-full min-w-0` prepended to the root div's `className` in
  all 29 listed files, verified line-by-line before and after each edit
  (each file's exact pre-existing className was confirmed via `grep`
  first, so no unrelated divs were touched). `tsc --noEmit` clean and
  dev server boots after the change.

- [x] **3.7 Consolidate the two parallel `DataTable` implementations.**
  `components/Data-Table/data-table.tsx` and
  `components/redesign/DataTable.tsx` are two independent table
  primitives with different feature sets (empty-state handling, loading
  UI, row-actions pattern all differ — see 3.2/3.3/3.4). Pick one,
  migrate all consumers, delete the other. Do this *after* 3.2/3.3/3.4
  land so you're not fixing bugs in a component you're about to delete.
  **Done:** all 17 consumers migrated to `Data-Table/data-table.tsx`.
  `redesign/DataTable.tsx` had already been reduced to a 13-line
  deprecated re-export shim with zero remaining consumers (verified via
  grep) — deleted it outright rather than leaving dead weight, per the
  story's explicit "delete the other" instruction. While verifying this,
  found and fixed a genuinely broken half-migrated file blocking the
  build: `chats/_components/FlaggedTab.tsx` had malformed column
  definitions (mismatched parens from an incomplete `redesign/DataTable`
  → `ColumnDef` conversion, plus `row.X` references that needed to be
  `row.original.X`) and was passing nonexistent props
  (`itemsPerPage`/`externalTotalPages`/`externalPage`) to the canonical
  `DataTable`. Rewrote its columns array correctly and switched to
  `pagination={true}` (client-filtered dataset, no server pagination
  needed). `tsc --noEmit` is 100% clean.

---

## Epic 4 — 🟡 MEDIUM: performance & bundle size
**Status:** [x] Complete — 7/7 done. `tsc --noEmit` clean and dev server
boots correctly after every sub-story's changes.

- [x] **4.1 Stop globally importing CSS for libraries that aren't used.**
  `app/layout.js:2-6` imports `react-svg-map/lib/index.css` and
  `leaflet/dist/leaflet.css` on *every* page — confirmed **zero** component
  usages of `react-svg-map`/`leaflet`/`react-leaflet` anywhere in the app
  (mapping is done via `@react-google-maps/api` instead). Same for
  `simplebar-react/dist/simplebar.min.css` (no `SimpleBar` component used
  anywhere). Remove these three imports; keep `flatpickr`'s CSS since
  that one's actually used.
  **Done:** removed `simplebar-react/dist/simplebar.min.css` and
  `react-svg-map/lib/index.css` from `app/layout.js`. Also removed the
  duplicate `leaflet/dist/leaflet.css` import from `app/layout.js`; the
  current tree now has a live `components/RouteMapPreview.tsx` Leaflet
  usage, so Leaflet CSS remains centralized in `app/globals.css` for that
  dynamically loaded route preview.

- [x] **4.2 Code-split the Lexical rich-text editor.**
  `RichTextEditor`/`RichTextInput` (wraps `@lexical/*`) is statically
  imported into add/edit dialogs for diseases, healthy_living, symptoms,
  and fitness, which are themselves statically imported into their page
  files — so Lexical ships on first paint even if the user never opens
  the dialog. Only 4 files in the app use `next/dynamic` at all, and
  notably `app/(dashboard)/map/overview/page.jsx:8` has its dynamic
  import **commented out**. Wrap `RichTextInput`/`LexicalRenderer` (and
  the map component) in `next/dynamic(..., { ssr: false })`.
  **Done:** converted all 8 live static Lexical consumers to
  `next/dynamic(..., { ssr: false })`: add/view dialogs for diseases,
  healthy_living, symptoms, and fitness exercises now lazy-load
  `RichTextEditor`/`LexicalRenderer`. The current live Leaflet route map
  (`view-outdoor-route-dialog.tsx` → `RouteMapPreview`) was already
  dynamically imported with SSR disabled; the old map overview import is
  still commented out and has no rendered component. Verified
  `npm run type-check` clean.

- [x] **4.3 Memoize table column definitions (28 files, systemic).**
  `components/Data-Table/data-table.tsx` memoizes internally
  (`useMemo(..., [columns])`) but callers pass a new array literal every
  render, defeating it. 28 files define `columns`/`xColumns` inline in
  the component body with untyped `(row: any) =>` cell renderers,
  recreated on every state change — e.g.
  `fitness/_tabs/OutdoorTab.tsx:142,219,280`,
  `transactions/_components/{RefundsTab,ServiceChargeTab,
  SubscriptionsTab,RecentTransactionsTab,FailedTransactionsTab}.tsx`,
  `users/_components/{AllUsersTab,FlaggedUsersTab,DeleteRequestsTab}.tsx`,
  `marketing/_components/{SubscriptionsTab,DiscountsTab,
  AllCampaignsTab}.tsx`, `admins/_components/AdminTable.tsx`,
  `diseases/page.tsx`, `symptoms/page.tsx`, `facilities/page.tsx`,
  `tasks/_components/KanbanBoard.tsx`, `reviews/_components/
  AllReviewsTab.tsx`, `chats/_components/GroupsTab.tsx`,
  `medication-reminder/_components/{AdherenceTab,LoggedRemindersTab}.tsx`.
  Wrap each in `useMemo`. (Only `healthy_living/page.tsx`,
  `onboarding-requests/page.tsx`, `marketing/subscriptions/page.tsx`
  already do this correctly — use them as the template.)
  **Done:** current tree had 20 live DataTable column arrays rather than
  the original 28. Memoized all live inline DataTable column configs in:
  transactions (`RefundsTab`, `ServiceChargeTab`,
  `FailedTransactionsTab`), fitness (`UsersTab`, `TrainersTab`,
  `ChallengesTab`, `PlansTab`, `OutdoorTab` route/event/review tables),
  diseases, symptoms, chats (`SupportTab`, `FlaggedTab`, `GroupsTab`),
  users (`FlaggedUsersTab`), medication reminder (`LoggedRemindersTab`,
  `AdherenceTab`), and admins (`AdminTable`). Stabilized callback/helper
  dependencies where those column action cells close over local handlers.
  Follow-up grep leaves only `tasks/_components/KanbanBoard.tsx`, whose
  `columns` constant is board lane data rather than a `DataTable` column
  config. Verified `npm run type-check` clean.

- [x] **4.4 Replace plain `<img>` with `next/image` (~29 files, 48 tags).**
  vs. only 4 `next/image` usages currently. Representative files:
  `users/_components/AllUsersTab.tsx`, `fitness/_tabs/{TrainersTab,
  UsersTab}.tsx`, `facilities/_components/{view-facility-dialog,
  add-facility-dialog}.tsx`, `components/GalleryModal.tsx`, all
  `(auth)/**` pages, several `categories/**` overview/detail pages.
  **Done:** converted the current safe UI `<img>` surface to
  `next/image`: auth/static pages, shared logo/card/gallery/upload
  previews, dashboard shell logos, user/table avatars, marketing/facility
  previews, medication image preview, and category detail/overview images.
  Dynamic user/storage/blob URLs use `unoptimized` where needed so the
  conversion does not depend on a narrow remote image allowlist. Follow-up
  grep leaves only Lexical editor internals (`components/editor/**`),
  which intentionally keep native `<img>` behavior for editor resizing,
  node rendering, and insert previews, plus one commented legacy image.
  Verified `npm run type-check` clean.

- [x] **4.5 Re-evaluate blanket `"use client"` on dashboard pages.**
  73 of 99 `app/(dashboard)/**/page.tsx|page.jsx` files start with
  `"use client"`, opting the whole route out of server rendering. This is
  systemic, not a few isolated cases — worth a deliberate architectural
  decision (which pages genuinely need client interactivity from the
  top vs. could fetch server-side and pass data down) rather than treating
  it as the default.
  **Done:** re-audited the current tree (now 66 dashboard pages with
  `"use client"` before this pass, not the old 73). Removed the directive
  from 28 obvious server-safe route shells/placeholders, including the
  dashboard/tasks/referrals/human-anatomy shells, map overview shell,
  marketing placeholder pages, admin reset-password placeholder, and the
  legacy facility/category placeholder pages that only called an unused
  `useDarkmode()` hook. Remaining dashboard client pages are deliberately
  left client-side because they use route/search hooks, state/effects,
  browser APIs, React Query/Supabase hooks, tab URL syncing, forms, or
  mutation/dialog stores. Current dashboard page-level client count: 38.
  Verified `npm run type-check` clean.

- [x] **4.6 Resolve the Redux-vs-Zustand split.**
  `app/layout.js` wraps the entire app in a Redux `<Provider>`, but Redux
  (`useSelector`/`useDispatch`) is referenced in only 2 files
  (`app/layout.js`, `components/Loading.jsx`). Meanwhile `stores/`
  (Zustand-style) is used in 66 files. Migrate the 2 remaining Redux
  usages to Zustand (or a plain context) and drop
  `@reduxjs/toolkit`/`react-redux` + the `store/` directory entirely.
  **Done:** scope was broader than the backlog note — 9 legacy
  theme/layout hooks (`useContentWidth`, `useDarkMode`, `useMenuHidden`,
  `useMenulayout`, `useMobileMenu`, `useNavbarType`, `useRtl`,
  `useSidebar`, `useSkin`) read from the Redux store, though only 3
  (`useDarkMode`, `useSkin`, `useRtl`) had any live callers — the other 6
  were dead. Rewrote all 9 as local React state backed by the same
  `localStorage` keys/defaults, keeping each hook's public return shape
  unchanged so call sites needed no changes. Removed the `<Provider>`
  from `app/layout.js`, the dead `useSelector` import from
  `components/Loading.jsx`, deleted `store/` (root reducer, layout
  reducer, store index — now an empty directory, removed), dropped
  `@reduxjs/toolkit`/`react-redux` from `package.json`, and refreshed
  `pnpm-lock.yaml` via `pnpm install` (confirmed removed from
  `node_modules`; the only remaining `react-redux@7.2.9` in the lockfile
  is `react-beautiful-dnd`'s own internal transitive dependency for the
  Kanban board's drag-and-drop, unrelated to app-level state and not a
  regression). `tsc --noEmit` clean, dev server boots
  ("✓ Ready in 1344ms"), spot-checked routes (`/`, `/login`, `/tasks`,
  `/dashboard`) all respond correctly.

- [x] **4.7 Drop duplicate-capability dependencies.**
  Pick one per capability and remove the rest + their imports:
  - **Maps:** keep `@react-google-maps/api` (the only one actually used);
    drop `leaflet`, `react-leaflet`, `@south-paw/react-vector-maps`,
    `@svg-maps/world`, `react-svg-map` (also see 4.1).
  - **Charts:** keep `recharts` (the only one used, in
    `dashboard/_components/{RevenueTrendChart,UsersByPlan}.tsx`,
    `transactions/_components/{RevenueAnalytics,PaymentMethods}.tsx`);
    drop `apexcharts`/`react-apexcharts` and `chart.js`/`react-chartjs-2`
    if truly unused (confirm with a grep pass first).
  - **Dates:** keep `date-fns` (21 files) over `moment`/`moment-timezone`
    (15 files, heavier/non-tree-shakeable); `dayjs` has 0 usages — drop it
    outright.
  - **Icons:** `lucide-react` (185 files) is the standard; `react-icons`
    and `@radix-ui/react-icons` have 0 usages — drop them. `@iconify/react`
    (8 files) is a smaller overlap — worth consolidating too but lower
    priority.
  **Done:** re-verified every claim fresh against the current tree before
  touching anything (grep counts shift between audits/branches, so
  nothing here was taken on faith).
  - **Maps:** correction to the original note — `leaflet` itself is
    *not* dead, `components/RouteMapPreview.tsx` imports it directly
    (`import L from "leaflet"`); only the React wrapper `react-leaflet`
    (0 usages) is dead. Kept `leaflet` + `@react-google-maps/api`,
    dropped `react-leaflet`, `@south-paw/react-vector-maps`,
    `@svg-maps/world`, `react-svg-map` — all confirmed 0 usages.
  - **Charts:** confirmed `recharts` (4 files, single-quote imports —
    the double-quote grep in the original audit missed it) is the only
    one used. Dropped `apexcharts`, `react-apexcharts`, `chart.js`,
    `react-chartjs-2` — all confirmed 0 usages.
  - **Dates:** `moment` still has 11 real usages (not just `date-fns`'s
    21) — migrating those away is a real logic refactor, not a dependency
    removal, so left `moment` in place and out of this story's scope.
    Dropped `moment-timezone` and `dayjs` — both confirmed 0 usages
    (the story only explicitly called for dropping `dayjs` "outright";
    `moment-timezone` turned out to be equally dead on inspection).
  - **Icons:** dropped `react-icons` and `@radix-ui/react-icons` (0
    usages confirmed). Kept `lucide-react` (168 files) and
    `@iconify/react` (13 files, genuinely used) — consolidating the
    latter into `lucide-react` remains a lower-priority follow-up, not
    done here.
  - 12 packages removed total from `package.json`; `pnpm install`
    refreshed the lockfile (`Packages: -22` including transitive deps).
    `tsc --noEmit` clean, dev server boots ("✓ Ready in 1131ms"),
    spot-checked routes (`/`, `/login`, `/map`, `/transactions`,
    `/dashboard` — covering the kept Google Maps and recharts usages)
    all respond correctly. Side effect: `@types/leaflet` (declared in
    `package.json` but not actually installed — flagged as a minor
    unrelated issue back in Epic 0) is now correctly installed via this
    `pnpm install`, so that stray `tsc` error is resolved too.

---

## Epic 5 — 🟢 dead-code cleanup
**Status:** [ ] Not started

_From a full import-reachability crawl (every `.ts/.tsx/.js/.jsx` from all
`app/` routes, `scripts/`, `middleware`), hand-verified against real
case-sensitive import paths to rule out false positives. Do this epic
**after** Epic 3.1 (legacy-kit page migration) and Epic 3.7 (DataTable
consolidation), since some of these files are still in active use until
those land._

- [ ] **5.1 Delete confirmed exact-duplicate files** (keep the sibling
  noted): `hooks/use-mobile.tsx` (byte-identical dup of `.ts`, keep `.ts`);
  `hooks/useGhanaPostGPS.js` (superseded by `.ts`, keep `.ts`).

- [ ] **5.2 Delete the unused generic admin Data-Table config cluster (23 files, self-referential, never imported by any real page):**
  `components/Data-Table/table-dialog.tsx`; all of
  `components/Data-Table/columns/*.tsx` (challenge, chat, condition,
  conversation, faq, fitnessPlan, fitnessUser, healthyLiving,
  periodTracker, symptoms, trainer); all of
  `components/Data-Table/mobile-table-configs/*.tsx` (chat, condition,
  conversation, faq, healthyLiving, marketing, medication, periodTracker,
  review); `schemas/facility-reviews.schema.ts`. _Re-verify reachability
  right before deleting — Epic 3's DataTable consolidation may change
  what's live here._

- [ ] **5.3 Delete the unused half of the old UI kit** (only after Epic
  3.1 finishes migrating pages off it): `components/ui/{Accordion,
  ActivityIndicator,Alert,Badge,Carousel,Checkbox,CustomDropdown,Dropdown,
  Fileinput,FormGroup,Image,InputGroup,PaginationNew,Radio,RichTextEditor,
  Split-Dropdown2,Split-dropdown,Switch,Textarea,TextareaNew,
  TextinputNew,Tooltip,VideoPlayer}.jsx`, plus `input-group.tsx`,
  `progress.tsx`. **Do not delete `Button.jsx`, `Card.jsx`, `Select.jsx`,
  or `ProgressBar/*`** until Epic 3.1 is fully done — they're still
  imported by ~25 live routes today.

- [ ] **5.4 Delete leftover Lexical editor template files (10 files, never wired in):**
  `components/editor/shared/{caret-from-point,environment,
  normalize-class-names,react-patches,react-test-utils,
  simple-diff-with-cursor,use-layout-effect,warn-only-once}.ts`,
  `components/editor/utils/{guard,is-mobile-width}.ts`.

- [ ] **5.5 Delete standalone dead files (29 files, confirmed zero references):**
  `components/dashboard/ConditionStats.tsx`;
  `components/skeleton/{Grid,ListLoading,Table}.jsx`;
  `hooks/use-admin-permissions.tsx`; `hooks/{useDeviceInfo,useFooterType,
  useLocation,useMonoChrome,useSemiDark}.js`;
  `hooks/supabase-calls/useDashboard.ts`; `actions/top-rated.actions.ts`;
  `stores/chat-dialog-store.ts`; `services/{deleteAccount,
  deleteUserAccount,getFaqs,updatePhoneNumber}.js`;
  `utils/handleSuccess.js`; `utils/period_tracker/calendarUtils.js`;
  `types/fitness.ts`; `constant/{appex-chart,district_data,
  ghana_regions_districts_coordinates,healthcare-centers,
  healthcare-profile-list,specialist-list,table-data}.js`;
  `examples/ActivityLoggingExample.jsx` + `hooks/useActivityLogger.js`
  (only used by each other); root-level `trying.js` scratch file.

- [ ] **5.6 Decide the fate of `supabase/migrations/user-migration.mjs`.**
  A one-off migration script — flag for a human decision rather than
  auto-deleting; sometimes these are intentionally kept as historical
  record even after running once.

---

## Epic 6 — 🟢 testing & CI foundations
**Status:** [ ] Not started

- [ ] **6.1 Stand up a test framework.** Zero `*.test.ts(x)`/`*.spec.ts(x)`
  files and no Jest/Vitest config exist anywhere in the repo. Start with
  Vitest + React Testing Library (fastest to wire into a Next.js/Turbopack
  setup); prioritize coverage of Epic 1/2's fixes first (auth gating,
  the hook layer) since those are the highest-risk areas to regress
  silently.

- [ ] **6.2 Add a CI pipeline.** No `.github/workflows` (or equivalent)
  exists. At minimum: `tsc --noEmit`, `next lint`, and `next build` on
  every PR, so Epic 0-class breakage (dead imports, conflicting
  middleware/proxy) is caught before merge instead of discovered by
  running the app.

- [ ] **6.3 Add route-level `error.tsx` / `loading.tsx` / `not-found.tsx`.**
  Zero exist anywhere under `app/`. A thrown error in any server
  component currently falls through to Next's generic unstyled error
  page; a 404 shows the default Next.js page; there's no
  automatic Suspense loading UI at the routing level. Add at least a root
  `app/error.tsx`, `app/not-found.tsx`, and `app/(dashboard)/loading.tsx`
  to start.

---

## Epic 7 — 🟢 build hygiene / housekeeping
**Status:** [ ] Not started

- [ ] **7.1 Investigate the `next lint` setup.** No ESLint config file
  exists at the repo root despite `"lint": "next lint"` in `package.json`
  — confirm whether Next's zero-config default is intentionally relied on,
  or whether a config got lost; add one if the latter.

- [ ] **7.2 Investigate the one-off `tsconfig.json` include entry.**
  `tsconfig.json`'s `include` array has a single hardcoded file path
  alongside the glob patterns: `"app/(dashboard)/users/_components/
  view-user-dialog.jsx"`. Figure out why this one `.jsx` file needed to be
  special-cased into an otherwise `.ts`/`.tsx`-only include list (likely a
  workaround from the `def4b246` "build fixes" commit) and either fix the
  underlying reason or document why it's needed.

- [ ] **7.3 Document the `.next` corruption workaround.** Note in the
  README/CONTRIBUTING (or wherever's appropriate) that if `npm run
  type-check` ever throws a wall of `.next/dev/types/routes.d.ts` syntax
  errors, the fix is `rm -rf .next` + restart the dev server — this can
  recur any time the server crashes mid-type-generation (as it currently
  does from Epic 0.1).
