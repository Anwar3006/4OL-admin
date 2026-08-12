# TASKS.md — 4 Our Life: Unified Backlog (Admin Panel + Mobile App)

> **This file merges two previously-separate backlogs into one source of
> truth**, done as part of Epic 8.13 below:
> - **Part I (Epics 0-8)** — a full-codebase reliability/security/tech-debt
>   audit of the admin panel (formerly `TASKS2.md`), plus a comparison
>   against the `build-ready` branch to recover any genuine feature work
>   buried in it. Mostly *fix broken things* / *finish half-built things*.
> - **Part II (Epics 9-30)** — the product/feature roadmap for finishing
>   both the admin panel and the mobile app (formerly this file's original
>   content, itself generated from a live audit of both repos). Mostly
>   *build new things* / *replace fake data with real data*.
>
> **Where the two parts intersect, Part II epics carry an explicit
> cross-reference back to the Part I finding that discovered the gap** —
> several Part II stories (Transactions, BedTracker, HCP, Jobs,
> FacilityScout, Security, AI Hub, Notifications) turned out to already
> have concrete, file-level evidence sitting in Part I from the
> `build-ready` comparison, rather than being purely aspirational.
>
> **How to use this file:**
> 1. Work Part I first — it's smaller in scope, mostly blocking/security
>    severity, and several Part II epics can't be sanity-checked without
>    it (e.g. don't build Epic 28's Security Center on top of Epic 1's
>    still-open RLS gaps).
> 2. Within Part II, work top-to-bottom per the **Suggested Phasing**
>    table near the end — some epics depend on earlier ones.
> 3. Every story that touches data should end with: real Supabase
>    query/RPC wired, loading/empty/error states handled, no hardcoded
>    numbers left behind.
> 4. Check stories off with `[x]` as they land; add a PR link inline,
>    e.g. `- [x] Story name (#123)`.
> 5. New tasks discovered mid-build go into the relevant epic as a new
>    story — don't let a third backlog form elsewhere.

---

# PART I — Reliability, Security & Tech-Debt Audit

*Generated from a full-codebase scrutiny pass (TypeScript compiler, and
four targeted audits: security/auth, data-layer reliability, UI
consistency, performance/bundle), plus a prior dead-code reachability
audit, plus a comparison against the `build-ready` branch. Work epics top
to bottom — ordered by severity/blast-radius. A story is done when its
acceptance point is true. An epic is done only when every story under it
is checked.*

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
>   **Update (Epic 4.7):** resolved as a side effect of an unrelated
>   `pnpm install` — `@types/leaflet` is now correctly installed.

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
  **Note (added during the `build-ready` comparison, Epic 8):** none of
  the ~30 route files this story lists exist on `clearing` at all — they
  were only ever a `build-ready`-only problem, created by the same
  `def4b246` commit that introduced Epic 1.3's bug (see Epic 8's intro).
  If any of them get built for real per Epic 8.1-8.6/8.10, apply this
  exact same fix pattern to their fresh implementations, don't copy
  `build-ready`'s broken versions forward.

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

- [x] **1.2 Audit and enable RLS on the other ~48 unprotected tables.**
  Go table-by-table (`SUPABASE_SCHEMA.md` has the list) and decide the
  correct policy per table — many are read via the anon key from
  `hooks/supabase-calls/*.ts` (facilities, tracker logs, medication
  reminders, notifications, messages/conversations, delete-account
  requests, etc.) with **no database-level check**, only the admin UI
  choosing not to show a button. Treat this as a proper policy-design pass,
  not a bulk toggle — some tables may be intentionally public-read.

- [x] **1.3 Fix the inverted guard in `lib/supabase/indexAdmin.ts:11`.**
  ```ts
  if (!supabaseUrl.includes("placeholder")) {
    console.warn("[supabaseAdmin] Missing ... env. Storage admin actions may fail.");
  }
  ```
  This warns exactly when the env **is** correctly configured, and stays
  silent exactly when it's fallen back to the placeholder URL/key — the
  one case you actually want a loud warning for. Flip the condition.
  **Root cause identified during Epic 8's `build-ready` comparison:**
  this exact bug was introduced by `build-ready` commit `def4b246`
  ("build: apply all build fixes..." — the commit your boss's "LLM fixed
  it" claim refers to). Concrete evidence that pass introduced at least
  one real bug while claiming to fix things — treat any other
  `build-ready`-only code with the same skepticism (see Epic 8).

- [x] **1.4 Remove the `NEXT_PUBLIC_`-prefixed service-role-key fallback.**
  `lib/supabase/indexAdmin.ts:7` includes
  `process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` as a fallback
  source for the service-role key. `NEXT_PUBLIC_*` vars are inlined into
  client bundles by Next.js — naming a secret this way is a footgun even
  though nothing currently sets that env var. Drop this fallback entirely
  so the pattern can't be copy-pasted into a client file by accident.

- [x] **1.5 Sanitize `components/ui/HtmlRenderer.jsx`.**
  Uses `dangerouslySetInnerHTML` (lines ~50, ~253) with no
  DOMPurify/sanitize-html pass, despite a comment claiming it's safe.
  Used to render healthy-living / illness-and-complications content
  (`app/(dashboard)/categories/healthy_living/{details,overview}/page.jsx`
  and the illness_and_complications equivalents). Add sanitization before
  render — stored-XSS risk if that content is ever writable by a
  non-fully-trusted role.

- [x] **1.6 Implement or remove `app/api/delete-user/route.js`.**
  Entirely commented out — no exported handler exists, but the dead code
  references a real Supabase project ref/edge function. Account deletion
  currently has no working server-side implementation. Either wire it up
  for real or replace with an explicit "not implemented" response and a
  tracked follow-up, so it doesn't silently 404/fail for a legitimate
  compliance flow (GDPR-style deletion requests).

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
  **Update:** now being addressed in Epic 8.14 below, using a
  Supabase-backed counter (no Redis/Upstash account exists yet, and
  provisioning a new third-party service isn't something to decide
  unilaterally) — see that story for the concrete implementation.

---

## Epic 2 — 🟠 HIGH: data-layer reliability (silent failures)
**Status:** [x] Complete — 7/8 fixed, 1 moot (2.7 — bug's precondition no
longer exists since the page was gutted to a placeholder pending a full
rebuild; nothing actionable remains within this epic's scope). Re-verified
directly against `clearing`, `tsc --noEmit` clean.

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
  **Done:** `components/Data-Table/data-table.tsx` accepts `isError`/
  `error` props and renders a real error-state UI (both the card/mobile
  view and the table view). All 24 consumers of this component now pass
  `isError`/`error` through from their query hook — 23 wired directly;
  the 24th (`transactions/_components/RecentTransactionsTab.tsx`) has no
  real query hook at all, it renders hardcoded `mockTransactions` (a
  "fake data" problem, not an error-handling one — see Epic 15's
  cross-reference). `components/redesign/DataTable.tsx` (the other table
  primitive this story originally worried about) no longer exists — see
  Epic 3.7, it was reduced to an unused shim and deleted. `tsc --noEmit`
  clean across all 24 edits.

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

- [~] **2.7 Fix `app/(dashboard)/period/page.tsx` (raw `fetch`, no error UI).** MOOT, not actively fixed
  Bypasses the hook layer entirely with a hand-rolled
  `fetch("/api/period/analytics...")`; on `!res.ok` nothing happens and
  there's no error UI path (render only happens if `analytics` is
  truthy). Either move this onto the React Query hook layer for
  consistency, or at minimum add an error state.
  **Status:** the page was replaced entirely with a `PagePlaceholder`
  stub (no fetch, no analytics logic left at all) — unrelated to this
  audit, looks like it's pending the larger period-tracker rebuild noted
  in this file's own Epic 17. The specific bug described no longer
  exists, but that's because the feature was pulled, not fixed. Re-flag
  this story once the real period-analytics page gets rebuilt (Epic 17).

- [x] **2.8 Clean up leftover `app/(dashboard)/period_tracker/page.jsx`.**
  Just redirects to `/categories/period_tracker/overview` — looks like
  routing cruft left over from a rename. Confirm nothing links to it and
  remove, or fold the redirect into the resolved route directly.
  **Done:** file deleted, target route still exists, zero remaining
  references to the old path anywhere in the tree.

---

## Epic 3 — 🟠 HIGH: UI consistency & polish
**Status:** [x] Complete — 7/7 done. Re-verified against `clearing`'s
actual tree (not just the original build-ready-era file lists, several of
which were slightly stale — see per-story notes), `tsc --noEmit` clean,
dev server boots and all spot-checked routes respond correctly.

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
  to wire (a "fake data" problem, tracked separately — see Epic 15 — not
  this story's concern).

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
**Status:** [x] Complete

_From a full import-reachability crawl (every `.ts/.tsx/.js/.jsx` from all
`app/` routes, `scripts/`, `middleware`), hand-verified against real
case-sensitive import paths to rule out false positives. Do this epic
**after** Epic 3.1 (legacy-kit page migration) and Epic 3.7 (DataTable
consolidation), since some of these files are still in active use until
those land._

- [x] **5.1 Delete confirmed exact-duplicate files** (keep the sibling
  noted): `hooks/use-mobile.tsx` (byte-identical dup of `.ts`, keep `.ts`);
  `hooks/useGhanaPostGPS.js` (superseded by `.ts`, keep `.ts`).
  **Done:** both duplicate files were already absent in the current tree;
  the kept siblings `hooks/use-mobile.ts` and `hooks/useGhanaPostGPS.ts`
  remain.

- [x] **5.2 Delete the unused generic admin Data-Table config cluster (23 files, self-referential, never imported by any real page):**
  `components/Data-Table/table-dialog.tsx`; all of
  `components/Data-Table/columns/*.tsx` (challenge, chat, condition,
  conversation, faq, fitnessPlan, fitnessUser, healthyLiving,
  periodTracker, symptoms, trainer); all of
  `components/Data-Table/mobile-table-configs/*.tsx` (chat, condition,
  conversation, faq, healthyLiving, marketing, medication, periodTracker,
  review); `schemas/facility-reviews.schema.ts`. _Re-verify reachability
  right before deleting — Epic 3's DataTable consolidation may change
  what's live here._
  **Done:** re-verified no live imports, then deleted the remaining stale
  column configs (`challenge`, `chat`, `condition`, `conversation`, `faq`,
  `fitnessPlan`, `fitnessUser`, `healthyLiving`, `periodTracker`,
  `symptoms`, `trainer`) and unused mobile card configs (`chat`,
  `condition`, `conversation`, `faq`, `healthyLiving`, `marketing`,
  `medication`, `periodTracker`). Kept live mobile configs
  `facilityCardConfig` and `userCardConfig`; kept active column files such
  as `userColumns`, `facilityColumns`, `reviewColumns`, etc. Missing
  listed files (`table-dialog.tsx`, `schemas/facility-reviews.schema.ts`,
  review mobile config) were already gone.

- [x] **5.3 Delete the unused half of the old UI kit** (only after Epic
  3.1 finishes migrating pages off it — **Epic 3.1 is now done, this is
  unblocked**): `components/ui/{Accordion,
  ActivityIndicator,Alert,Badge,Carousel,Checkbox,CustomDropdown,Dropdown,
  Fileinput,FormGroup,Image,InputGroup,PaginationNew,Radio,RichTextEditor,
  Split-Dropdown2,Split-dropdown,Switch,Textarea,TextareaNew,
  TextinputNew,Tooltip,VideoPlayer}.jsx`, plus `input-group.tsx`,
  `progress.tsx`. **Do not delete `Button.jsx`, `Card.jsx`, `Select.jsx`,
  or `ProgressBar/*`** unless a fresh grep re-confirms zero remaining
  importers post-Epic-3.1.
  **Done:** the only listed files still present were `Badge.jsx`,
  `input-group.tsx`, and `progress.tsx`; all had zero live importers and
  were deleted. The rest of the listed legacy UI files were already gone.
  Preserved `Button.jsx`, `Card.jsx`, `Select.jsx`, and `ProgressBar/*`.

- [x] **5.4 Delete leftover Lexical editor template files (10 files, never wired in):**
  `components/editor/shared/{caret-from-point,environment,
  normalize-class-names,react-patches,react-test-utils,
  simple-diff-with-cursor,use-layout-effect,warn-only-once}.ts`,
  `components/editor/utils/{guard,is-mobile-width}.ts`.
  **Done:** re-verified zero live imports and deleted all 10 listed
  leftover Lexical template files.

- [x] **5.5 Delete standalone dead files (29 files, confirmed zero references):**
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
  ⚠️ **Re-verify each against the current tree before deleting** — Epic
  8's `build-ready` comparison found that "unused on one branch" doesn't
  always mean "unused on the other," and file reachability shifts as
  other epics land. Don't delete on the strength of this list alone.
  **Done:** re-verified the current tree and deleted the remaining
  existing standalone dead files from this story:
  `actions/top-rated.actions.ts`, `constant/{appex-chart,district_data,
  ghana_regions_districts_coordinates,healthcare-centers,
  healthcare-profile-list,specialist-list,table-data}.js`, and
  `trying.js`. All other listed standalone files were already absent.

- [x] **5.6 Decide the fate of `supabase/migrations/user-migration.mjs`.**
  A one-off migration script — flag for a human decision rather than
  auto-deleting; sometimes these are intentionally kept as historical
  record even after running once.
  **Done:** decision made to keep the one-off migration script as
  historical migration record. It was not deleted.

---

## Epic 6 — 🟢 testing & CI foundations
**Status:** [ ] In progress

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

- [x] **6.3 Add route-level `error.tsx` / `loading.tsx` / `not-found.tsx`.**
  Zero exist anywhere under `app/`. A thrown error in any server
  component currently falls through to Next's generic unstyled error
  page; a 404 shows the default Next.js page; there's no
  automatic Suspense loading UI at the routing level. Add at least a root
  `app/error.tsx`, `app/not-found.tsx`, and `app/(dashboard)/loading.tsx`
  to start.
  **Done:** root `app/not-found.js` and `app/loading.js` already existed;
  added root `app/error.tsx` plus dashboard-scoped
  `app/(dashboard)/loading.tsx` so server errors and dashboard route
  transitions now have app-owned route UI.

---

## Epic 7 — 🟢 build hygiene / housekeeping
**Status:** [x] Complete

- [x] **7.1 Investigate the `next lint` setup.** No ESLint config file
  exists at the repo root despite `"lint": "next lint"` in `package.json`
  — confirm whether Next's zero-config default is intentionally relied on,
  or whether a config got lost; add one if the latter.
  **Done:** `next lint` is not usable in this Next setup (it treated
  `lint` as a project directory). Replaced the script with `eslint .`,
  added `eslint.config.mjs`, and replaced the unrelated
  `eslint-config-next@0.2.4` package with the official
  `eslint-config-next@16.1.6` plus the TypeScript ESLint stack. The first
  real lint pass also exposed and fixed a malformed import in
  `app/(dashboard)/categories/period_tracker/overview/page.jsx`; existing
  legacy React/Next rule violations are reported as warnings for now so
  the command is CI-usable while preserving the cleanup signal.

- [x] **7.2 Investigate the one-off `tsconfig.json` include entry.**
  `tsconfig.json`'s `include` array has a single hardcoded file path
  alongside the glob patterns: `"app/(dashboard)/users/_components/
  view-user-dialog.jsx"`. Figure out why this one `.jsx` file needed to be
  special-cased into an otherwise `.ts`/`.tsx`-only include list (likely a
  workaround from the `def4b246` "build fixes" commit — see Epic 8) and
  either fix the underlying reason or document why it's needed.
  **Done:** the live import in `app/(dashboard)/users/page.tsx` resolves
  to `view-user-dialog.tsx`; the `.jsx` file is a stale sibling, not a
  required compiler input. Removed the one-off include entry and verified
  type-checking.

- [x] **7.3 Document the `.next` corruption workaround.** Note in the
  README/CONTRIBUTING (or wherever's appropriate) that if `npm run
  type-check` ever throws a wall of `.next/dev/types/routes.d.ts` syntax
  errors, the fix is `rm -rf .next` + restart the dev server — this can
  recur any time the server crashes mid-type-generation (as it currently
  does from Epic 0.1).
  **Done:** added a README troubleshooting note with the exact cache
  reset and recheck commands.

---

## Epic 8 — 🔵 `build-ready` audit: real gaps vs. redundant vs. dead scaffolding
**Status:** [ ] In progress

> **Context:** `build-ready` was pushed to GitHub (`prod/build-ready`,
> commit `ab33c512`) with a claim that an LLM pass "addressed many fixes."
> Investigated by diffing `prod/build-ready`'s 2 real unique commits
> (`def4b246` "build: apply all build fixes...", `ab33c512` "add missing
> sidebar children..." — everything else in that branch's log is old
> shared history, not new work) against `clearing`'s current tree,
> file-by-file, using a throwaway `git worktree` (not just reading diffs).
> **Verdict: mixed.** Some of it is real, structurally sound feature work
> `clearing` genuinely lacks. Some of it duplicates work `clearing`
> already did better (proper React Query/Supabase hooks vs. raw `fetch`
> calls). Some of it is dead — nav links to pages that were never built,
> not even on `build-ready` itself. And one part of it is a live
> credential leak that needs handling **now**, independent of this epic's
> sequencing (see 8.9).
>
> The concrete bug this pass introduced (Epic 1.3's inverted guard in
> `lib/supabase/indexAdmin.ts`) traces directly to `def4b246` — evidence
> that "LLM fixed it" claims from this pass need verification, not trust,
> which is exactly why every story below was independently confirmed
> against the current tree rather than taken from the commit message.
> That same discipline caught a mistake **in this epic's own first
> draft**: 8.10 originally claimed BedTracker/HCP/Jobs/FacilityScout were
> "already covered" on `clearing` based on their page shells looking
> properly built — checking one level deeper (each tab's actual content)
> found every tab across all four is a bare placeholder. Corrected before
> this ever left draft form; left the correction visible in 8.10 rather
> than silently editing it, since it's a useful reminder of exactly the
> failure mode this whole epic exists to catch.
>
> **Net count: 11 modules are genuine gaps** (7 fully placeholder pages
> in 8.1-8.7 + BedTracker/HCP/Jobs/FacilityScout in 8.10, all placeholder
> at the tab level), **6 are confirmed already real** (8.11), **1 was
> already broken on both branches** (IBP, 8.8), and **1 has zero coverage
> anywhere** (map footprints, noted in 8.11).
>
> **Cross-reference to Part II:** every genuine gap found here has a
> corresponding Part II epic with a much more detailed spec (real table
> schemas, RPC contracts, phasing). Treat Part II as the actual build spec
> and this epic as "here's the current-state evidence" — see each Part II
> epic's own cross-reference note back to here.

- [x] **8.1 Build out the AI Intelligence Hub (`app/(dashboard)/ai/page.tsx`).**
  Currently a 4-line `PagePlaceholder` stub on `clearing`. `build-ready`
  has a real 78-line implementation (tabs, fetch-backed, real state/error
  handling) backed by 4 new API routes: `app/api/ai/{analytics,metrics,
  moderation-queue,recommendations}/route.ts` (none exist on `clearing`).
  To port: rebuild the page against `clearing`'s current design system
  (`PageHeader`/`KpiCard`/shadcn `Tabs`, not `build-ready`'s legacy
  `"page"/"card"/"tab"` CSS classes), and when porting the 4 routes, apply
  the same `getSupabaseServerClient()` + `supabase.auth.getUser()` fix
  from Epic 0.2 (they currently use the dead BetterAuth `auth.api
  .getSession()` pattern) plus real `onError`/error-surfacing per Epic 2's
  standard, not the silent `console.error` catches `build-ready` shipped.
  **→ See Epic 29 (AI Hub / AI Observability) for the full build spec.**
  **Done:** rebuilt `app/(dashboard)/ai/page.tsx` against the current
  `PageHeader`/`KpiCard`/shadcn tab/table/card kit with Models,
  Moderation, Recommendations, and Analytics tabs. Added admin-role-gated
  API routes at `app/api/ai/{metrics,analytics,moderation-queue,
  recommendations}/route.ts` using the shared Supabase session-cookie
  admin guard. Metrics/analytics read real `fitness_ai_calls` data;
  moderation reads the existing `content_moderation_flags` source of
  truth and uses the existing `moderate_content` RPC for actions.
  Recommendations intentionally return an explicit `not_configured`
  empty state until Epic 29's cross-module recommendation pipeline/table
  exists, instead of inventing fake recommendations. Verified with
  `npm run type-check` and `npm run lint -- --quiet`.

- [x] **8.2 Build out Human Anatomy (`app/(dashboard)/anatomy/page.tsx`).**
  Same situation: 4-line placeholder on `clearing`, real 82-line
  implementation on `build-ready` backed by `app/api/anatomy/body-map/
  route.ts` (missing on `clearing`). Same porting approach as 8.1 (restyle
  to current kit, fix the auth pattern in the route).
  **Done:** rebuilt `app/(dashboard)/anatomy/page.tsx` against the
  current `PageHeader`/`KpiCard`/shadcn tab/table/card kit. Added
  `app/api/anatomy/body-map/route.ts` with the shared admin-role guard,
  backed by the existing `body_parts`, `symptom_body_parts`, and
  `condition_body_parts` tables rather than inventing a parallel
  `anatomy_body_map` table. The page now shows body-part taxonomy,
  inferred system groupings, mesh IDs, symptom-link counts, and
  condition-link counts. The older `/human-anatomy` placeholder now
  redirects to `/anatomy`. Verified with `npm run type-check` and
  `npm run lint -- --quiet`.

- [x] **8.3 Build out Security Center — and resolve the duplicate-route problem first.**
  `clearing` actually has **two** separate placeholder routes for this:
  `app/(dashboard)/security/page.tsx` (4-line `PagePlaceholder`) *and*
  `app/(dashboard)/security-center/page.tsx` (a different placeholder
  component, `PlaceholderPage`). Epic 28.4 already flagged this exact
  duplication and calls for consolidating into one route before building
  — do that first, don't build the real implementation twice.
  `build-ready` has a real 155-line tabbed implementation
  (Threats / Audit Logs / Security Settings) at the `security` path,
  backed by `app/api/security/{audit-logs,settings,threats}/route.ts`
  (none exist on `clearing`). This is the most substantive of the
  missing pages — read through it during this audit and confirmed it's
  genuinely working code (real fetch/state/tables), not hallucinated
  filler. Same porting approach as 8.1, decide which route path
  (`/security` or `/security-center`) survives and redirect/remove the
  other.
  **→ See Epic 28 (Security & Compliance) for the full build spec.**
  **Done:** consolidated on `/security`; `/security-center` now redirects
  there instead of carrying a second placeholder. Rebuilt
  `app/(dashboard)/security/page.tsx` against the current
  `PageHeader`/`KpiCard`/shadcn tabs/table/card kit with threats, audit
  logs, settings, KPI summary, loading/empty/error states, and threat
  resolution actions. Added authenticated, admin-role-gated API routes at
  `app/api/security/{threats,audit-logs,settings}/route.ts`, using
  Supabase session-cookie auth plus service-role reads after the role
  check. Verified with `npm run type-check` and `npm run lint -- --quiet`.

- [x] **8.4 Build out Platform Settings (`app/(dashboard)/settings/page.tsx`).**
  4-line placeholder on `clearing` vs. a real 253-line implementation on
  `build-ready` (the largest of the seven) — global config, API keys,
  feature flags, integrations, maintenance mode, plans — backed by 6 new
  routes: `app/api/settings/{route,api-keys,feature-flags,integrations,
  maintenance,plans}.ts` (none exist on `clearing`). `settings/api-keys`
  in particular returns third-party secrets (Twilio/Resend/Paystack) to
  the UI — when porting, re-verify who's allowed to call it now that RLS
  gaps from Epic 1 are closed, don't just carry the old assumption over.
  Same porting approach as 8.1.
  **Done:** rebuilt `app/(dashboard)/settings/page.tsx` against the
  current `PageHeader`/`KpiCard`/shadcn tab/table/card kit with tabs for
  General, Plans, Feature Flags, API Keys, Integrations, and Maintenance.
  Added admin-role-gated API routes at
  `app/api/settings/{route,plans,feature-flags,api-keys,integrations,
  maintenance}.ts`, using the shared Supabase session-cookie admin guard.
  API-key handling was tightened from the `build-ready` approach: the
  browser receives provider/configuration metadata and masked env hints
  only, never raw secret values. Added
  `supabase/migrations/20260811_platform_settings.sql` for
  `platform_settings`, `feature_flags`, `platform_api_keys`, and
  `platform_integrations` with RLS enabled. Verified with
  `npm run type-check` and `npm run lint -- --quiet`.
  **Migration applied:** user confirmed
  `supabase/migrations/20260811_platform_settings.sql` has been applied
  to Supabase.

- [x] **8.5 Build out Notifications (`app/(dashboard)/notifications/page.tsx`) — safe admin surface only; push delivery stays in Epic 27.**
  4-line placeholder on `clearing` vs. a real 89-line implementation on
  `build-ready`, calling `/api/notifications` (a POST-only broadcast/push
  endpoint). **Do not port `app/api/notifications/route.js` as-is** — see
  8.9, it's the route entangled with the leaked Firebase credential.
  Rebuild this route's Firebase Admin init from an environment variable
  instead of a committed JSON key file before wiring this page up.
  **→ See Epic 27 (Notifications & Campaigns) for the full build spec.**
  **Done on `clearing`:** deleted the disabled legacy cron/push files
  (`app/api/notifications/route.txt`, `app/api/cron/ovulation/route.txt`,
  `app/api/cron/tracker/route.txt`) plus the now-orphaned in-process cron
  helpers (`app/api/notifications-stop/route.js`,
  `app/api/all-jobs/route.js`). Added a new admin-role-gated
  `app/api/notifications/route.ts` that lists notification logs,
  campaigns, templates, and automation rules and creates database-backed
  campaign drafts in `notification_campaigns` without sending Firebase
  pushes. Replaced the placeholder notifications page with a real admin
  dashboard for campaign drafts, logs, templates, and automation rules.
  Verified with `npm run type-check` and `npm run lint -- --quiet`.

- [x] **8.6 Platform Schematic (`app/(dashboard)/schematic/page.tsx`) — low priority.**
  4-line placeholder on `clearing` vs. an 84-line implementation on
  `build-ready` that's mostly static architecture-diagram content; its
  only live data call is `/api/health` (a generic health-check endpoint,
  also missing on `clearing`). Lower priority than 8.1-8.4 since the
  payoff is smaller — mostly documentation-style content, not a
  data-driven admin surface.
  **Done:** rebuilt `app/(dashboard)/schematic/page.tsx` with current
  `PageHeader`/`KpiCard`/shadcn card styling, an architecture map, and
  service-health/configuration status. Added `app/api/health/route.ts`,
  which performs a real Supabase ping and reports server-side provider
  configuration state without claiming external services are healthy just
  because they exist in a list. The older `/platform-schematic`
  placeholder now redirects to `/schematic`. Verified with
  `npm run type-check` and `npm run lint -- --quiet`.

- [x] **8.7 Period Tracker — do NOT port `build-ready`'s implementation.**
  `build-ready` has a 59-line real implementation backed by `app/api/
  period/analytics/route.ts` (missing on `clearing`). **Deliberately not
  recommending a straight port** — Epic 17 (Period Tracker, below)
  already flags that `tracker_logs` holds zero rows and the whole
  period-tracker data model is slated for a proper rebuild
  (`cycles`/`symptoms`/`cycle_statistics`/`prediction_results`/
  `period_tracker_profiles`), not an extension of the old schema this
  route queries. Porting the old implementation now would be throwaway
  work. Revisit only after Epic 17's schema decision (8a) lands.
  **Done:** disposition confirmed. No code was ported from
  `build-ready`; the old `tracker_logs`-based route remains intentionally
  skipped so Epic 17 can rebuild against the new period-tracker schema.

- [x] **8.8 IBP Businesses (`app/(dashboard)/ibp/page.jsx`) — gap found during this audit, not from `build-ready`.**
  Discovered while checking `build-ready`'s `ibp/analytics` route (which
  turned out to be orphaned, see 8.11): `clearing`'s own `ibp/page.jsx` is
  a near-empty 13-line stub with its real content (`IBPListing`)
  commented out. `build-ready` doesn't have a working IBP implementation
  either — this is a gap on both branches, tracked here since it surfaced
  during this audit. No dedicated Part II epic exists for IBP yet —
  scope it before starting (what does "Individual Business Provider"
  need beyond a listing view?).
  **Done:** restored a scoped first real IBP admin surface rather than
  porting from `build-ready` (there was nothing useful to port). Replaced
  the empty `page.jsx` with `app/(dashboard)/ibp/page.tsx`, backed by a
  new admin-role-gated `app/api/ibp/route.ts` that reads the existing
  `ibp` table. The page now shows IBP counts, approved/featured/spend
  KPIs, search, status/category/location/contact fields, and campaign
  spend. Deeper IBP workflows still need a dedicated product epic if the
  module must go beyond listing/status management. Verified with
  `npm run type-check` and `npm run lint -- --quiet`.

- [ ] **8.9 🔴 CRITICAL, handle independent of this epic's sequencing: rotate and remove the leaked Firebase service-account key.**
  `app/api/notifications/serviceAccountKey.json` is a **real, live-looking
  Firebase Admin SDK private key** (`project_id: healthcare-54909`,
  `client_email: firebase-adminsdk-qitdd@healthcare-54909.iam
  .gserviceaccount.com`), currently checked in (not just old history) on
  `build-ready`, `prod/build-ready`, and `prod/refactor`. Confirmed absent
  from `main`, `clearing`, and `prod/main`/`prod/prod` — so `clearing` is
  clean today, but the key is still live wherever those other branches
  are reachable (GitHub, any CI, any clone). The `.gitignore` entry for
  it (`# serviceAccountKey.json`) is commented out, so it isn't even
  protected from being re-added by accident. `clearing` previously had
  its own disabled `app/api/notifications/route.txt` (note the `.txt`,
  not `.js`) that had been entangled with this exact file before local
  cleanup removed the legacy route entirely — a stopgap, not an accident.
  Action needed, in order: (1) rotate/revoke this service account key in
  the Firebase console immediately — treat it as
  compromised regardless of repo visibility; (2) once rotated, decide
  whether to scrub it from git history on the affected branches (a
  separate, higher-risk operation needing team coordination — do not do
  this unilaterally); (3) rebuild the notifications-push feature (8.5) to
  load Firebase Admin credentials from an environment variable, never a
  committed file, before re-enabling the route.
  **Local mitigation done, external rotation still required:** confirmed
  the key file is absent on `clearing`; uncommented/strengthened
  `.gitignore` protection for `serviceAccountKey.json`, removed direct
  `serviceAccountKey.json` imports from the disabled `.txt` notification
  cron routes, then deleted those legacy `.txt` routes entirely once
  confirmed unused. This story remains open until the Firebase key is
  actually rotated/revoked in the Firebase console and the team decides
  whether to scrub affected branch history.

- [x] **8.10 Build out BedTracker, HCP, Jobs, FacilityScout — correction to an earlier pass of this same audit.**
  ⚠️ An earlier draft of this story claimed these four were "already
  covered" on `clearing` because their page shells use a proper tabbed,
  hook-ready architecture. **That was wrong and has been corrected before
  landing** — checked one level deeper (each tab's actual content, not
  just the page shell) and every single tab across all four modules
  renders `TabPlaceholder`/`PlaceholderPage` with zero real data:
  - **BedTracker** — all 6 tabs (`LiveOverviewTab`, `BedRegistryTab`,
    `BedTrackerFacilitiesTab`, `AmbulanceDispatchTab`,
    `BedTrackerAnalyticsTab`, `DesignStrategyTab`) are placeholders.
    `build-ready`'s `bedtracker/analytics/route.ts` may be a useful
    reference for `BedTrackerAnalyticsTab` specifically once rebuilt
    against `clearing`'s kit + fixed auth pattern.
    **→ See Epic 23 (BedTracker) for the full build spec** — that epic
    already correctly assumed this needed real backend work; this story
    is just the "here's the current state" confirmation.
  - **HCP** — all 3 tabs (`AllHCPTab`, `GroupChatsHCPTab`,
    `PendingHCPTab`) are placeholders.
    **→ See Epic 25 (HCP Verification).**
  - **Jobs** — all 5 tabs (`PostJobTab`, `PremiumServicesTab`,
    `ApplicantsTab`, `DigitalCVsTab`, `AllListingsTab`) are placeholders.
    **→ See Epic 26 (Jobs Board).**
  - **FacilityScout** — all 5 tabs (`LeaderboardTab`, `RewardsQueueTab`,
    `FacilityScoutSettingsTab`, `AllSubmissionsTab`, `PendingReviewTab`)
    are placeholders.
    **→ See Epic 24 (FacilityScout).**
  For all four: don't naively port `build-ready`'s single-file
  implementations wholesale — `clearing`'s tab-based structure is the
  better shape to build into, `build-ready`'s flatter versions are at
  best a reference for what queries/fields each screen needs.
  **Done on `clearing`:** replaced the placeholder-only dashboard shells
  with a shared `OperationsModuleDashboard` used by BedTracker, HCP,
  Jobs, and FacilityScout, preserving their existing tab URLs while
  rendering live admin data, KPIs, queues, registries, analytics, and
  empty states. Added admin-role-gated API routes at
  `/api/bedtracker`, `/api/hcp`, `/api/jobs`, and
  `/api/facilityscout`, backed by the existing tables already present
  in `full-tables.sql`/`scripts/schema.sql`:
  `bed_tracker_facilities`, `bed_tracker_alerts`,
  `ambulance_dispatches`, `hcp_verifications`, `conversations`,
  `job_postings`, `job_applications`, `subscription_plans`,
  `collector_submissions`, `data_collectors`, and
  `facility_scout_referrals`. No new migration was required for 8.10.
  Verified with `npm run type-check` and `npm run lint -- --quiet`.

- [x] **8.11 Confirmed genuinely already covered on `clearing` — do not port `build-ready`'s versions.**
  Unlike 8.10, these were verified with real Supabase calls found
  in the actual hook/component code, not just architecture shape:
  - **Fitness analytics** — `hooks/supabase-calls/
    useFitnessDashboard.ts` calls `supabase.rpc("get_fitness_dashboard_kpis")`.
  - **Medication stats** — `MedicationStats.tsx` calls
    `supabase.rpc("get_medication_kpi_stats")`.
  - **Diseases** — `hooks/supabase-calls/useCondition.ts` and
    `diseases/page.tsx` query `.from("conditions")`/`.from("categories")`
    directly.
  - **Symptoms** — `symptoms/page.tsx` queries `.from("symptoms")`/
    `.from("body_parts")`/`.from("categories")` directly.
  - **Healthy Living** — `hooks/supabase-calls/useHealthyLiving.ts`
    queries `.from("healthy_living_info")`/`.from("healthy_living_categories")`
    directly.
  - **FAQ** — `hooks/supabase-calls/useFAQ.ts` queries `.from("faqs")`/
    `.from("faq_categories")` directly.
  `build-ready`'s corresponding routes (`diseases/prevalence`,
  `healthy-living/analytics`, `symptoms/classifier-stats`, `ibp/analytics`,
  `faq/search`) are not needed — real coverage already exists.
  **Exception: IBP** — see 8.8, that one genuinely is still a stub on
  `clearing` despite living in this "already has hooks" neighborhood.
  **Exception: Map footprints** — grepped for any `footprint`-related
  code on `clearing` and found nothing at all (not even a placeholder).
  Genuinely unimplemented; low priority until it's clear what "footprint"
  data even means for this product (mobile location history? facility
  visit tracking?) — clarify the requirement before building.
  **Done:** disposition confirmed. No `build-ready` ports needed for the
  already-live modules listed above; IBP remains tracked separately in
  8.8, and map footprints remain a clarified-requirements follow-up, not
  a port target.

- [x] **8.12 Nav wiring — cheap, safe, do this one first.**
  `ab33c512` added sidebar nav children pointing at `?tab=` query params
  on pages whose tab components **already exist on `clearing`** (built
  during our own Epic 3/4 work): `RolesPermissionsTab.tsx`,
  `ActivityLogsTab.tsx` (under Admins), `DrugDatabaseTab.tsx`,
  `LoggedRemindersTab.tsx`, `InteractionsTab.tsx` (under Medication
  Reminder). Wiring these into `app/(dashboard)/_components/admin-shell/
  navigation.ts` is close to free — everything the links need already
  exists, just isn't exposed in the sidebar. **Do not port** the
  "Developer Tools" → "Infrastructure" nav section from the same commit
  (`Cloud Infra`, `CI/CD Pipeline`, `App Security`, `Rate Limiting`,
  `Caching & CDN`, `Load Balancing`, `Error Tracking`, `DR & Uptime`) —
  it links to `/infrastructure?tab=...`, and no `/infrastructure` route
  exists on `build-ready` either. Confirmed dead scaffolding, not
  deferred work — the destination was never built anywhere.
  **Done:** wired real sidebar children for Admins
  (`/admins?tab=roles`, `/admins?tab=logs`) and Medication Reminder
  (`/medication-reminder?tab=database`, `?tab=logged`,
  `?tab=interactions`) in
  `app/(dashboard)/_components/admin-shell/navigation.ts`. Confirmed and
  preserved the decision not to add the dead `/infrastructure` nav
  section.

- [x] **8.13 Merge `TASKS.md` (product roadmap) and `TASKS2.md` (this audit) into one unified `TASKS.md`.**
  Two backlogs coexisted with unclear precedence. Read both in full,
  identified overlapping stories, reconciled numbering, produced this
  file as the single source of truth. Cross-references added in both
  directions: Part I epics that a `build-ready` gap traces to (0.2, 1.3,
  7.2) now point forward to their Part II build spec; Part II epics that
  correspond to a Part I finding (15, 23-29) now point back to the
  concrete evidence. `TASKS2.md` can be retired once this file is
  reviewed — not deleted automatically, since it's still useful as the
  raw unmerged history if anything here needs double-checking.

- [x] **8.14 Rate limiting: `fitness/generate` has none — add a Supabase-backed limiter.**
  Confirmed via direct inspection (not just Epic 1.7's note) that
  `app/api/fitness/generate/route.ts` has zero rate limiting today —
  `send-otp`/`verify-otp` are fine (Twilio's Verify API rate-limits on
  its own side), but AI-generation endpoints are exactly the kind of
  cost/abuse-sensitive route that needs one. No Redis/Upstash account
  exists anywhere in this project (checked `package.json`, env files,
  and for any existing usage) — provisioning a new third-party service
  wasn't something to decide unilaterally, so this uses a
  Supabase-backed counter instead (durable, shared across instances,
  no new infrastructure/credentials needed).
  **Done:** added `supabase/migrations/20260811_rate_limit_counters.sql`
  — a generic `rate_limit_counters(user_id, route_key, window_start,
  request_count)` table (RLS enabled, no policies — only ever touched
  via the RPC below using the service-role key) plus a
  `check_and_increment_rate_limit(p_user_id, p_route_key,
  p_window_seconds, p_max_requests)` `SECURITY DEFINER` RPC that
  atomically bumps a fixed-window counter and reports
  allowed/count/retry-after. Wrapped in `lib/rate-limit.ts`
  (`checkRateLimit(admin, userId, routeKey, {windowSeconds,
  maxRequests})` — fails open on a DB error so a rate-limit outage
  doesn't take the underlying feature down with it) and wired into
  `app/api/fitness/generate/route.ts` right after the auth check: 5
  requests/hour per user, returns `429` + `Retry-After` header when
  exceeded. Generic by design — any other route needing this (e.g. a
  future AI Hub endpoint from Epic 29) can call the same helper with
  its own `routeKey`/limits, no new table needed.
  **Migration applied:** user confirmed
  `supabase/migrations/20260811_rate_limit_counters.sql` has been applied
  to Supabase.

---

# PART II — Product & Feature Roadmap

*Generated from a live audit of both repos:*
- *Admin panel: `/Users/anwarsadat/Desktop/WORK/4-Our-Life` (Next.js 15/16, Supabase, TanStack Query v5)*
- *Mobile app: `/Users/anwarsadat/Desktop/WORK/4-Our-Life-App` (Expo SDK 56, React Native 0.85, Supabase, TanStack Query v5)*

*Uses **Epics → Stories**. Epic = a key deliverable (a module or
capability that ships as a whole). Story = one unit of work inside an
Epic, small enough to be picked up and finished on its own. Each story is
tagged with where the work lives: `[Admin]`, `[Mobile]`, `[Backend/Supabase]`,
or a combination. Anything marked **⚠️ ASSUMPTION** was not specified and
was decided using best available context/standards; revisit before
building if it matters. Epic numbers below continue from Part I (Part I
ends at Epic 8) — the original standalone numbering (Epic 1-21) is noted
in parentheses in each heading for cross-referencing old links/PRs.*

---

## Epic 9 — Charting & Data-Viz Standard (shadcn) *(was: unnumbered intro section)*

The admin panel currently mixes chart libraries across modules
(`apexcharts`, `chart.js`/`react-chartjs-2`, `recharts` were all in
`package.json` — **update: Epic 4.7 already dropped `apexcharts`,
`react-apexcharts`, `chart.js`, `react-chartjs-2` as unused dependencies,
so `recharts` is now the only chart library in the project, which
happens to satisfy this epic's direction already** — verify no new
one-off charting code has crept back in before closing this epic), plus
several fully static/hardcoded "charts" that are really just styled
divs. Since shadcn is installed, **standardize all new and refactored
charts/graphs on shadcn's chart components** (which wrap `recharts` with
shadcn's theme tokens, `ChartContainer`, `ChartTooltip`, and
`ChartLegend`) instead of reaching for a fourth library or hand-rolled
SVG.

- [x] **9.1** `[Admin]` Add/confirm the shadcn `chart` component is installed (`components/ui/chart.tsx` + associated `chart-*` primitives) and pull in a `ChartConfig` convention (color tokens per series, consistent with the existing Tailwind theme).
  **Done:** `components/ui/chart.tsx` (`ChartContainer`/`ChartTooltip`/`ChartTooltipContent`/`ChartLegend`/`ChartLegendContent`) was already installed. Added the missing piece — a project-wide `ChartConfig` color convention: `--color-chart-1..6` tokens defined once in `app/globals.css`'s `@theme` block, drawn from the existing brand palette (green/blue/amber/purple/teal/pink) rather than a new one, plus a `chartSeriesColor(i)` helper (`components/charts/palette.ts`) so no wrapper hardcodes a hex value per series.
- [x] **9.2** `[Admin]` Build a small shared set of chart wrappers on top of shadcn's primitives for the recurring shapes this backlog needs: a trend/line chart (revenue, DAU/MAU, growth), a bar/grouped-bar chart (by-status, by-region, by-plan breakdowns), a donut/pie chart (payment-method split, plan distribution), and a stat-with-sparkline card (dashboard KPI tiles).
  **Done:** built against shadcn's own registry block patterns (pulled via `npx shadcn view chart-line-interactive`/`chart-bar-multiple`/`chart-pie-donut-text` as reference, then genericized off real props instead of demo data) — `components/charts/{TrendChart,BreakdownBarChart,DistributionDonutChart,StatSparklineCard}.tsx`. All four are data-driven (rows + series keys as props, zero hardcoded values), share the Epic 9.1 palette, and are ready for Epic 10+ modules to consume. `tsc --noEmit` clean; smoke-tested via a temporary route (compiled and rendered 200 with no server error) — full authenticated visual check not done in this session, no admin login available here.
- [ ] **9.3** `[Admin]` Migrate existing chart usages module-by-module as each module's epic is worked (don't do a big-bang rewrite) — replace any remaining one-off chart instances with the shadcn wrappers as their data source is wired to real Supabase queries, so the visual upgrade and the "remove fake data" work land in the same PR.
  **Not started — deliberately left for the epics that touch each chart** (e.g. `RevenueTrendChart.tsx` gets migrated as part of Epic 10.8, not here) per this story's own "don't do a big-bang rewrite" instruction.
- [x] **9.4** `[Admin]` ~~Once most modules are migrated, drop the now-unused chart libraries from `package.json`~~ — **done early, via Epic 4.7**: `apexcharts`, `react-apexcharts`, `chart.js`, `react-chartjs-2` all confirmed unused and removed.

Any epic below that involves a chart/graph (Epic 10's dashboard trend
charts, Epic 15's revenue analytics, Epic 18's fitness dashboard, etc.)
should build against this shared shadcn chart layer rather than a
one-off implementation — see the Definition of Done at the bottom of
this file.

---

## ⚠️ Assumptions Made (flagged, confirm when convenient)

| # | Assumption | Why |
|---|---|---|
| 1 | **Payment providers**: Paystack (cards + bank) and MTN MoMo (mobile money) are the two rails implemented for Ghana. | Not specified by product owner yet. These are the two dominant, developer-friendly rails for Ghanaian consumer fintech; both have first-class Node/React Native SDKs. Swap freely — the epic is written so the webhook/ledger layer is provider-agnostic. |
| 2 | **Period tracker data model**: `tracker_logs` currently holds **0 rows**, so it's being retired rather than extended. **Decision**: audit the `cycles` / `symptoms` / `cycle_statistics` / `prediction_results` / `period_tracker_profiles` schema proposed in `4-Our-Life-App/Period-tracker/PERIODS_TRACKER_IMPLEMENTATION.md` against a production checklist (normalization, data types, indexes, constraints, RLS). If it passes, adopt it as-is. If it doesn't, keep its intent but optimize/normalize it before building on it. Either way, `tracker_logs` is dropped, not kept in parallel — see Epic 17a for the concrete review + migration steps. | With zero live rows there's no migration cost and no reason to keep a table's shape just for continuity — free to build whichever schema is actually right for production. |
| 3 | **Admin task manager** gets a real `admin_tasks` table (not a generic project-management integration like Jira/Asana). | Roadmap doc flags this as needed; no external PM tool was named, so the simplest self-hosted option is assumed. |
| 4 | **New analytics/event tables** (`analytics_events`, `ai_usage_logs`, `payment_webhook_events`, `fitness_coin_ledger`, `compliance_settings`, `system_health_snapshots`) are added incrementally, only immediately before the epic that needs them — not all up front. | Avoids speculative schema that might not match real usage patterns once features ship. |
| 5 | **Time zone**: all cron/reminder logic (medication, period tracker) assumes Africa/Accra (GMT, no DST) unless a per-user timezone field says otherwise. | Matches existing `*_utc` columns already present in `tracker_logs` and `medications`. |
| 6 | Mobile app screens are added under Expo Router's existing `app/(app)/(auth)/(tabs)` structure, following the pattern already used by Fitness/Reminders/SavedItems. | Matches current mobile app architecture; no new navigation shell needed. |

---

## Epic 10 — Analytics & Metrics Foundation *(was: Epic 1)*
*Stop every dashboard from lying. This unblocks every other epic's "done" definition (a module isn't done until its numbers are real).*

> **Cross-reference:** Part I's `build-ready` comparison (Epic 8)
> independently confirmed this epic's premise for several modules —
> `RecentTransactionsTab.tsx`, `FailedTransactionsTab.tsx`,
> `RefundsTab.tsx`, `ServiceChargeTab.tsx`, `AdminTable.tsx` are all
> confirmed rendering hardcoded mock arrays (Epic 2.4/3.3's "Done"
> notes) — these are exactly the files 10.4 and Epic 15/11 need to fix.

- [x] **10.1** `[Backend]` Build a metric registry (a markdown or JSON table mapping every KPI card/chart across the admin panel to: source table, query/RPC, owning epic, status). Use `ADMIN_DASHBOARD_SUPABASE_ANALYTICS_ROADMAP.md` as the seed data.
  **Done:** added `docs/METRIC_REGISTRY.md`, seeded from
  `ADMIN_DASHBOARD_SUPABASE_ANALYTICS_ROADMAP.md` and cross-checked
  against the current dashboard/module files. It maps visible KPIs,
  charts, queues, logs, and unsupported metrics to source tables,
  query/RPC ownership, owning epic, and status (`live`, `rpc-needed`,
  `empty-state`, `instrumentation-needed`, `unsupported`). It also
  codifies the rule that unsupported metrics return `null`/empty states
  rather than fake zeros or fake growth.
- [x] **10.2** `[Backend]` Implement `get_platform_overview_metrics(time_filter)` RPC returning totals/deltas/queues per the contract already drafted in the roadmap doc.
  **Done:** added and applied
  `supabase/migrations/20260811_platform_overview_metrics.sql`. It
  creates `public.get_platform_overview_metrics(time_filter text)`,
  returning exact counts, queue totals, status breakdowns, recent
  `activity_logs`, regional facility coverage, and current-vs-previous
  window deltas. Metrics that still lack instrumentation, such as
  security score, compliance/GRA, feature usage, and push delivery rate,
  return `null` instead of fake numbers. The live Supabase project
  already had an older broken function with the same name, so the
  migration now drops/replaces that signature, revokes default PUBLIC
  execute, and grants execute only to `authenticated` and `service_role`.
  Verified through the Supabase plugin: the function returns `jsonb`,
  exposes `kpis`, `queues`, and `activity`, and reports
  `finance.revenue_status = "awaiting_transaction_pipeline"` when no
  transaction rows exist.
- [x] **10.3** `[Admin]` Standardize `KpiCard` component with loading / empty / error states (no more silently showing `0` or a fake number when a query fails).
  **Done:** extended `components/redesign/KpiCard.tsx` with
  backwards-compatible `isLoading`, `isError`, `isEmpty`, `errorLabel`,
  and `emptyLabel` props. Loading renders a skeleton, error renders an
  explicit unavailable state, and empty renders a muted no-data state
  without changing existing callers. Verified with `npm run type-check`
  and `npm run lint -- --quiet`.
- [x] **10.4** `[Admin]` Wire `app/(dashboard)/dashboard/page.tsx` and its `_components/*` (CriticalAlerts, RevenueTrendChart, RevenueStreams, UsersByPlan, FeatureUsage, ActivityFeed, AIHubOverview, RegionalCoverage, HealthFeaturesStatus, PendingTasks, ComplianceGRA, SystemHealth) to real data or an explicit "awaiting instrumentation" empty state — remove every hardcoded number listed in the roadmap doc's "Main Platform Dashboard" section.
  **Done:** added admin-gated `app/api/dashboard/overview/route.ts`
  backed by `get_platform_overview_metrics`, converted
  `dashboard/page.tsx` to fetch one shared RPC payload, and rewired all
  dashboard components to either render live data from that payload or an
  explicit awaiting-instrumentation/awaiting-pipeline empty state.
  Removed the roadmap's fake dashboard numbers and claims for revenue,
  feature usage, security score, compliance/GRA, model accuracy, Firebase
  connectivity, static regional coverage, and fake pending queues.
  Verified with `npm run type-check` and `npm run lint -- --quiet`.
- [x] **10.5** `[Backend]` Replace fake activity feed with a live `activity_logs` query (1,731 rows already exist).
  **Done:** the platform overview RPC returns the latest 10
  `activity_logs` rows, and `ActivityFeed.tsx` now renders those rows
  with empty/loading states instead of static alert events.
- [x] **10.6** `[Admin]` Add a shared time-filter control that all dashboard cards respect consistently (react to the same date range).
  **Done:** `dashboard/page.tsx` owns a single `timeFilter`
  (`7`/`30`/`90`/`year`) and passes it to `/api/dashboard/overview`, so
  KPI deltas and dashboard sections use the same selected window.
- [x] **10.7** `[Backend]` Delta calculation utility: compare `created_at` counts in selected window vs. previous equal-length window, shared across all `get_*_dashboard_metrics` RPCs so every module computes "+X% this period" the same way.
  **Done:** added and applied
  `supabase/migrations/20260811_metric_delta_utility.sql`, creating
  `public.count_created_at_delta(regclass, text, timestamptz,
  timestamptz)`. It returns the shared
  `{current, previous, percent}` JSON contract and revokes default
  PUBLIC/anon execute access. Verified through the Supabase plugin
  against `user_profiles.created_at`.
- [x] **10.8** `[Admin]` Rebuild the dashboard's trend/breakdown charts (`RevenueTrendChart.tsx`, `UsersByPlan.tsx`, `FeatureUsage.tsx`, `RegionalCoverage.tsx`) on the shared shadcn chart layer from Epic 9, at the same time their data is wired to real queries.
  **Done:** removed direct `recharts` usage from the dashboard folder.
  `RegionalCoverage.tsx` now uses the shared Epic 9
  `BreakdownBarChart` wrapper with real `facility_profile.region`
  aggregates from the RPC. `RevenueTrendChart.tsx` and `UsersByPlan.tsx`
  use the shared chart wrappers when source data exists and render
  explicit empty states while `transaction_records` /
  `user_subscriptions` are empty. `FeatureUsage.tsx` now shows an
  instrumentation-needed state until Epic 30 defines the event taxonomy
  and dashboard aggregation over `analytics_events`.
- [x] **10.9** `[Mobile]` Audit the mobile app against the admin dashboard source tables/RPCs after Epics 10, 13, and 14. **Done:** checked `/Users/anwarsadat/Desktop/WORK/4-Our-Life-App` for producers/readers of `facility_reviews`, `facility_ratings`, `chat_support`, `delete_account_requests`, `tracker_logs`, `medication_reminders`, `medication_adherence`, `notifications`, `user_profiles.expo_push_token`, `transaction_records`, `user_subscriptions`, `fitness_onboarding_selections`, `fitness_generated_workouts`, `exercise_sessions`, and `activity_logs`. Findings were added as mobile parity stories under the owning epics below rather than treated as generic tech debt.
- [x] **10.10** `[Mobile]`/`[Backend]` Add a small mobile analytics/event instrumentation contract (likely `analytics_events` with `user_id`, `event_name`, `module`, `metadata`, `created_at`) and a mobile helper for logging key feature usage. **Done:** added/applied `analytics_events` via `20260811_mobile_parity_events_reviews.sql`, created the mobile `logAnalyticsEvent` helper, and wired initial mobile events for facility review submission plus support ticket create/rate flows. Dashboard `FeatureUsage.tsx` can now move from a hard empty state to this table once Epic 30 selects the final chart/event taxonomy.

---

## Epic 11 — Admin & Access Management *(was: Epic 2)*
- [ ] **11.1** `[Backend]` `get_admin_dashboard_metrics(time_filter)` RPC: total/active/pending admins, role breakdown, recent admin activity — sourced from `user_profiles` (`is_admin`, `admin_role`, `admin_permissions`, `status`, `last_active`) + `activity_logs`.
- [ ] **11.2** `[Admin]` Wire `admins/_components/AdminStats.tsx` to the RPC above; remove hardcoded Total/Active/Pending/Inactive counts.
- [ ] **11.3** `[Backend]` Persist admin sessions: populate `admin_sessions` on login/logout (session start, IP, device, last-seen heartbeat).
- [ ] **11.4** `[Backend]` Persist MFA enrollment state on `user_profiles` (or a dedicated column/table) so "MFA Not Set" and "Online Now" can be computed instead of hidden.
- [ ] **11.5** `[Admin]` Once 11.3/11.4 land, unhide MFA-gap and Online-Now metrics in `AdminStats.tsx`.
- [ ] **11.6** `[Admin]` Wire `admins/_components/ReportsTab.tsx` charts to `admin_activity_logs`/`activity_logs` instead of static arrays.
- [ ] **11.7** `[Admin]` Wire `admins/_components/RolesPermissionsTab.tsx` matrix to the real `admin_permissions` structure on `user_profiles` (make it editable, not just a static display).
- [ ] **11.8** `[Admin]` Wire `admins/_components/AdminTable.tsx` session/last-active column to `admin_sessions`.

---

## Epic 12 — User Management *(was: Epic 3)*
- [ ] **12.1** `[Backend]` `get_user_dashboard_metrics(time_filter)` RPC: total/active/new/deleted users, by role/type/status/sex, users with push token, fitness-onboarding completion rate.
- [ ] **12.2** `[Admin]` Replace `users/_components/UsersStats.tsx` hardcoded values with the same live-query pattern `UserSection.jsx` already uses (don't maintain two different data-fetch approaches on one page).
- [ ] **12.3** `[Admin]` Define "Active" as `last_active` within the selected time window (not just `status = 'active'`).
- [ ] **12.4** `[Admin]` Remove "Flagged" stat unless/until a moderation-flag table exists (see Epic 29 AI/Moderation); don't ship a metric with no source.
- [ ] **12.5** `[Admin]` "Premium" stat sources from `user_subscriptions` only (empty/zero state until Epic 16 subscriptions ship real rows).
- [x] **12.6** `[Admin]`/`[Mobile]` Confirm delete-account request flow end-to-end: mobile submits → `delete_account_requests` row → admin `delete-account-request` module reflects it in real time — **mobile→DB leg fixed via Epic 21.5** (mobile previously never wrote this row at all). Admin's own read side (`useDeleteAccountRequests.ts`) already queries the table directly with standard React Query, so a new row shows up on the module's normal refetch/poll — no realtime subscription exists or was requested here.

---

## Epic 13 — Facilities & Reviews *(was: Epic 4)*
- [x] **13.1** `[Backend]` `get_facility_dashboard_metrics(time_filter)` RPC: total/active/pending/rejected, by type, by region, top-rated count, reviews total/average — from `facility_profile`, `facility_reviews`, `facility_favorites`, `facility_offerings`.
- [x] **13.2** `[Admin]` Facilities page: keep existing live counts; gate "Top Rated" and "Reviews" behind real data from `facility_reviews` (currently 0 rows) instead of showing fabricated totals.
- [x] **13.3** `[Backend]` Add a `moderation_status` (or similar) column to `facility_reviews` so Reviews module can report Flagged/Pending Approval honestly.
- [x] **13.4** `[Admin]` Wire `reviews/_components/ReviewStats.tsx` to real aggregates (`avg(rating)`, `count(*)`) and remove the hardcoded 4.4 / 28,420 / 12 / 3.
- [x] **13.5** `[Backend]` Regional coverage: compute from `facility_profile.region` grouped counts (needed by dashboard's `RegionalCoverage.tsx`, Epic 10.4).
- [x] **13.6** `[Backend]`/`[Admin]` PostGIS RPC for map clustering / nearest-facility / bounding-box queries if map analytics need more than the existing `get_facilities_map` RPC provides.
- [x] **13.7** `[Mobile]` Confirm the facility review-submission flow in the mobile app actually writes to `facility_reviews` with rating + comment + `is_verified_visit` — this table is the blocker for 13.2-13.4, so verify it's wired before building admin visuals around it.
- [x] **13.8** `[Mobile]` Replace the remaining mobile reads of legacy `facility_ratings` with the canonical `facility_reviews` path now used by the admin dashboard. **Done:** updated `favoriteFacilites.ts`, `facility.ts`, `helpers.ts`, and locator rating parsing to use review-backed API/table data and normalize `comment_text` ↔ `comment`; verified no `facility_ratings` references remain under the mobile `app`/`src` trees.
- [x] **13.9** `[Backend]` Add a database-level uniqueness guard for one top-level review per `(user_id, facility_id)` where `parent_id IS NULL` (or formalize multi-review behavior) so the mobile `/api/user/ratings` update path cannot create duplicates under race conditions. **Done:** added/applied the partial unique index `facility_reviews_one_top_level_per_user_facility_idx` in `20260811_mobile_parity_events_reviews.sql`.

---

## Epic 14 — Chats & Support *(was: Epic 5)*
- [x] **14.1** `[Backend]` `get_support_analytics(time_filter)` RPC: tickets by status/priority/category, unread/unassigned counts, SLA breach count, avg first-response/resolution time — from `chat_support`.
- [x] **14.2** `[Admin]` Wire `chats/_components/ChatStats.tsx`: group count from `conversations.is_group = true`, support counts from `chat_support`. Remove hardcoded 48 groups / 12,840 members / 94% satisfaction.
- [x] **14.3** `[Backend]` Add first-response-timestamp capture and a CSAT/rating field to `chat_support` (or a new `support_ticket_events` table) — required before satisfaction/response-time can be real.
- [x] **14.4** `[Admin]` Wire `chats/_components/SupportTab.tsx` and `GroupsTab.tsx` to live data once 14.1/14.3 land.
- [x] **14.5** `[Admin]`/`[Backend]` Enable Supabase Realtime on `messages` and `conversation_members` for live unread counts in the admin panel (per `UI_REBUILD_HANDOFF.md` design rule).
- [x] **14.6** `[Mobile]` Confirm mobile chat writes `response_time_minutes`, `category`, `tags` on `chat_support` tickets raised from in-app support so 14.1's aggregates have real inputs.
- [x] **14.7** `[Mobile]` Move support ticket submission off direct Supabase insert (`src/services/chatsupport.ts` → `.from('chat_support').insert`) and onto authenticated `POST /api/chat/support`, so `requested_by`/`user_name` are derived server-side and the mobile app cannot drift from the admin schema again. **Done:** mobile support submission now calls the authenticated admin API route, preserving selected `category` + `tags` while the server derives `requested_by`/`user_name`.
- [x] **14.8** `[Mobile]` Add a support-ticket CSAT flow after a ticket is closed/resolved, writing `chat_support.satisfaction_rating` so Epic 14's satisfaction analytics become real instead of permanently null. **Done:** added authenticated `PATCH /api/chat/support`, mobile ticket fetch/rating helpers, and an in-app feedback prompt for closed unrated tickets.

---

## Epic 15 — Transactions, Payments & Revenue *(was: Epic 6)*
*Currently 100% fabricated on the admin side and entirely absent on mobile — no payment library in either `package.json`. This is the largest greenfield epic.* **⚠️ See Assumption #1 (Paystack + MTN MoMo).**

> **Cross-reference:** Part I's Epic 2.4/3.3 already confirmed
> `RecentTransactionsTab.tsx`, `FailedTransactionsTab.tsx`,
> `RefundsTab.tsx`, `ServiceChargeTab.tsx` render hardcoded mock arrays
> (`mockTransactions`, etc.) with no real query hook at all — that's
> the concrete, file-level version of what 15.13-15.18 below describe in
> spec form. `AdminTable.tsx` (Epic 11) has the same issue.

### 15a. Payment Rails & Ledger (Backend)
- [ ] **15.1** `[Backend]` Choose and provision payment provider account(s): Paystack (cards, bank transfer) + MTN MoMo (mobile money collections). Store keys in env (`PAYSTACK_SECRET_KEY`, `MOMO_*`), never client-side.
- [ ] **15.2** `[Backend]` Create `payment_webhook_events` table (immutable log of every provider webhook payload, signature-verified, with `processed_at`).
- [ ] **15.3** `[Backend]` Build webhook endpoint(s) (Next.js route handler) that verify signatures, write to `payment_webhook_events`, then upsert into `transaction_records` (status: pending/success/failed/refunded).
- [ ] **15.4** `[Backend]` Define `transaction_records` columns needed beyond what exists today: `provider`, `provider_reference`, `amount`, `currency`, `fee`, `net_amount`, `payer_user_id`, `payee_facility_id` (nullable), `purpose` (subscription/service/facility-booking/etc.), `status`, `created_at`.
- [ ] **15.5** `[Backend]` Reconciliation job (cron): compare provider transaction list vs. local `transaction_records` daily, flag mismatches.
- [ ] **15.6** `[Backend]` `get_transaction_analytics(time_filter)` RPC/API: revenue, transaction count, payment-method split, failed/refund counts, fees, VAT, subscriptions, churn — server-only, service-role, admin-permission gated.

### 15b. Mobile Payment Flows
- [ ] **15.7** `[Mobile]` Integrate Paystack React Native SDK (or WebView checkout) for card/bank payments at the relevant purchase points (subscriptions, paid facility services).
- [ ] **15.8** `[Mobile]` Integrate MTN MoMo collection flow (phone-number prompt + provider USSD/API confirmation).
- [ ] **15.9** `[Mobile]` Payment status screens: pending / success / failed, with retry.
- [ ] **15.10** `[Mobile]` Transaction history screen for the user (their own `transaction_records`, read-only).
- [ ] **15.11** `[Mobile]` Receipt/confirmation (in-app + optional email via existing Resend integration).

### 15c. Admin Transactions Module
- [ ] **15.12** `[Admin]` `transactions/_components/TransactionStats.tsx`: replace all hardcoded KPIs (Total Transactions, Total Revenue, Total Customers, Gross Profit) with 15.6's live data; show an honest "awaiting transaction pipeline" empty state until 15.1-15.6 ship.
- [ ] **15.13** `[Admin]` `RecentTransactionsTab.tsx` — live table from `transaction_records`, paginated, filterable by status/provider/date. **Currently renders hardcoded `mockTransactions` — see Part I Epic 2.4/3.3.**
- [ ] **15.14** `[Admin]` `FailedTransactionsTab.tsx` — filter `status = 'failed'`, show provider error reason from `payment_webhook_events`. **Currently hardcoded — see Part I Epic 3.3.**
- [ ] **15.15** `[Admin]` `RefundsTab.tsx` — refund initiation (calls provider refund API) + refund status tracking. **Currently hardcoded — see Part I Epic 3.3.**
- [ ] **15.16** `[Admin]` `PaymentMethods.tsx` — real payment-method split (Paystack card vs. bank vs. MoMo) from `transaction_records.provider`.
- [ ] **15.17** `[Admin]` `RevenueAnalytics.tsx` / `RevenueBreakdownTab.tsx` — real revenue trend chart + breakdown by source (subscriptions vs. one-off vs. facility fees).
- [ ] **15.18** `[Admin]` `ServiceChargeTab.tsx` — real service-fee configuration (rate stored in a settings table, not hardcoded) and computed fee revenue. **Currently hardcoded — see Part I Epic 3.3.**
- [ ] **15.19** `[Admin]` `TaxVATTab.tsx` — VAT/GRA report generated from immutable `transaction_records`; keep disabled/hidden until transaction data is validated as accurate (don't ship a compliance report off fake or unvalidated data).
- [ ] **15.20** `[Admin]` `PayoutsTab.tsx` / `ExpensesTab.tsx` — payout tracking to facilities (if facilities receive payouts) and platform expense entries.
- [ ] **15.21** `[Admin]` Finance-only permission check (role/permission gate) on every transaction API route and RPC — this is money data, restrict beyond generic admin auth.

---

## Epic 16 — Subscriptions & Premium Plans *(was: Epic 7)*
*Depends on Epic 15's payment plumbing.*
- [ ] **16.1** `[Backend]` Populate `subscription_plans` (tiers, price, billing cycle, feature flags) — currently 0 rows.
- [ ] **16.2** `[Mobile]` Subscription plan selection + upgrade/downgrade screen, charging via Epic 15's payment flows.
- [ ] **16.3** `[Backend]` Recurring billing: webhook-driven renewal, handling failed renewal (grace period → downgrade).
- [ ] **16.4** `[Admin]` `SubscriptionsTab.tsx` (transactions module) — live subscriber list, plan distribution, churn/renewal from `user_subscriptions`.
- [ ] **16.5** `[Admin]` Dashboard's `UsersByPlan.tsx` wired to `user_subscriptions` once real rows exist (unblocks Epic 10.4 and Epic 12.5).

---

## Epic 17 — Period Tracker (Schema Migration + Mobile Build) *(was: Epic 8)*
*`tracker_logs` holds 0 rows and is being retired (Assumption #2). This epic starts with a schema review/migration, then builds mobile from scratch against the new tables, then ports the admin CRUD/calendar screens over.*

> **Cross-reference:** Part I Epic 2.7 confirmed `app/(dashboard)/period/
> page.tsx` is currently a bare `PagePlaceholder` (the old raw-`fetch`
> analytics implementation was pulled entirely, not fixed) — consistent
> with this epic's premise that the whole module needs a from-scratch
> rebuild against the new schema, not a patch of the old one. Part I
> Epic 8.7 also found a real, if old-schema, implementation on
> `build-ready` — explicitly **not** recommended for porting until 17a's
> schema decision lands, to avoid throwaway work.

### 17a. Schema Decision & Migration (Backend)
- [ ] **17.1** `[Backend]` Review the schema proposed in `Period-tracker/PERIODS_TRACKER_IMPLEMENTATION.md` (`cycles`, `symptoms`, `cycle_statistics`, `prediction_results`, `period_tracker_profiles`) against a production checklist: normalization (it's already an improvement on `tracker_logs`'s denormalized `flow_types`/`fertile_window_dates` JSON-array-per-row design — one row per cycle, one row per symptom-per-day), correct/consistent data types (`DATE` vs `TIMESTAMP`), indexes on `user_id` + date columns, sensible `UNIQUE` constraints (e.g. `(user_id, start_date)` on `cycles`, `(user_id, date, symptom_type)` on `symptoms`), foreign keys with `ON DELETE CASCADE`, and per-table RLS.
- [ ] **17.2** `[Backend]` Fix/optimize anything that doesn't pass 17.1 — e.g. confirm `symptoms` should stay one-row-per-symptom-per-day (recommended: normalized and easy to aggregate per symptom type) rather than a single `jsonb` blob per day; add any missing `updated_at` triggers and `CHECK` constraints (`flow_intensity IN ('light','normal','heavy','spotting')`, `intensity BETWEEN 1 AND 10`); decide if a `deleted_at` soft-delete column is needed for recoverable history.
- [ ] **17.3** `[Backend]` Create the finalized tables with RLS enabled (`auth.uid() = user_id` policies per the implementation doc, adjusted for anything changed in 17.2).
- [ ] **17.4** `[Backend]` Drop `tracker_logs` (0 rows — no backfill needed) and remove/retire `app/services/period_tracker_service.js`'s references to it.
- [ ] **17.5** `[Admin]` Rebuild the period-tracker data-access layer (service or hook, per `Refactor_Docs.md`'s migration pattern) against the new tables.
- [ ] **17.6** `[Admin]` Update the Period Tracker overview/details/create pages' columns to the new schema (e.g. `cycles.start_date`/`end_date`/`flow_intensity` instead of `tracker_logs.period_start_date`/`flow_types`; symptom summaries pulled from `symptoms` instead of an embedded JSON array).

### 17b. Prediction Calculator (shared logic, correct this time)
- [ ] **17.7** `[Backend]`/`[Mobile]` Implement `PeriodCalculator` (cycle-length averaging, ovulation = cycle length − 14, fertile window = ovulation −7 to +2, confidence scoring) against the new `cycles`/`cycle_statistics` tables, using the corrected formula from `ToChange.md`: **Next Period Start = Most Recent Period Start + Average Cycle Length** (period length only affects bleed duration, not the next start date — the old `tracker_logs`-era draft had this backwards, plus a syntax error in `moment.(period_start_date)`).
- [ ] **17.8** `[Backend]`/`[Mobile]` `DEFAULT_CYCLE_LENGTH = 28` cold-start fallback for fewer than 2 recorded cycles; drop once `cycle_statistics.cycle_count` is sufficient.
- [ ] **17.9** `[Backend]`/`[Mobile]` Return a predicted **date range**, not a single date: `start = last_cycle_start + avg_cycle_length`, `end = start + avg_period_length − 1`.
- [ ] **17.10** `[Backend]`/`[Mobile]` Sliding-window average (last 3 cycles), refreshed into `cycle_statistics` whenever a new cycle is logged.
- [ ] **17.11** `[Admin]` Wire the admin calendar view's tile helpers to the new calculator/tables so fertile-window / flow / ovulation / next-period indicators render off real, correctly-computed dates.
- [ ] **17.12** `[Backend]`/`[Mobile]` Unit tests for the calculator (cycle averaging, cold-start fallback, range calculation, irregular-cycle conservative estimate) — mirror the same test cases on both admin and mobile since the two implementations must agree. **Ties to Part I Epic 6.1 (no test framework exists yet — this may be the first real test suite in the repo).**

### 17c. Mobile: Core Tracking (MVP)
- [ ] **17.13** `[Mobile]` Add "Period Tracker" entry point to the app's category/home navigation (matches existing pattern for Fitness/Reminders).
- [ ] **17.14** `[Mobile]` Period logging screen: start date, end date (optional), flow intensity — writes to `cycles`.
- [ ] **17.15** `[Mobile]` `usePeriodTracker` React Query hook: fetch user's `cycles`, derive statistics/prediction/current-cycle-status via 17.7's calculator.
- [ ] **17.16** `[Mobile]` Dashboard/home card: current cycle day, phase (menstrual/follicular/ovulation/luteal), days until next period, confidence %.
- [ ] **17.17** `[Mobile]` Calendar view (react-native-calendars, already a dependency) color-coded by phase.
- [ ] **17.18** `[Mobile]` Onboarding/settings screen: typical cycle length, typical period length, tracking goal, reminder opt-in — writes to `period_tracker_profiles`.
- [ ] **17.19** `[Backend]` Reminder notifications: reuse the existing `/app/api/cron/tracker/route.js` + FCM pattern, updated to query `cycles`/`period_tracker_profiles` instead of `tracker_logs`. **⚠️ Do this only after Part I Epic 8.9's Firebase key rotation — don't wire new FCM sends through credentials that need rotating.**

### 17d. Mobile: V1 Enhancements
- [ ] **17.20** `[Mobile]` Symptom logging (cramps, headache, acne, bloating, mood, cervical mucus) — writes to `symptoms`.
- [ ] **17.21** `[Mobile]` Irregular-cycle detection: coefficient-of-variation check per `PERIODS_TRACKER_ARCHITECTURE.md` §4; show a conservative estimate + "track 3+ more cycles for better accuracy" instead of false confidence.
- [ ] **17.22** `[Mobile]`/`[Backend]` Prediction-accuracy feedback loop: when actual period arrives, compare to prediction, write to `prediction_results`, feed the error back into the confidence score.
- [ ] **17.23** `[Mobile]` FDA-style disclaimer ("not a form of contraception") at onboarding and in settings.

### 17e. Mobile: V2 (Later)
- [ ] **17.24** `[Mobile]` Pregnancy mode (gestation-week tracking).
- [ ] **17.25** `[Mobile]` Partner sync (read-only cycle-status sharing).
- [ ] **17.26** `[Mobile]` Health-app export (Apple Health / Google Fit) if/when prioritized.
- [ ] **17.27** `[Mobile]` Retire the old mobile `tracker_logs` implementation before wiring new admin metrics. Audit findings: `src/services/tracker_logs/index.ts`, `DashboardPeriods.tsx`, `DashboardCalenderView.tsx`, and `TrackPeriod.tsx` still read/write `tracker_logs`, and multiple screens calculate future cycles with `cycle_length + period_length`; replace these with the finalized `cycles` / `symptoms` / `cycle_statistics` / `prediction_results` / `period_tracker_profiles` model from 17a and the corrected calculator from 17b.

---

## Epic 18 — Fitness Module Completion *(was: Epic 9)*
**Status:** [x] Complete — 6/7 already done by prior work (`4e31483e`/`60555112`/
`20260719_fix_fitness_kpis.sql`), this pass fixed the one real remaining gap
(18.7) plus a cross-dashboard definition mismatch found while verifying.
This epic's own text was stale relative to the code — re-verified against
`KPIs.sql`, `full-tables.sql`, and the live hooks before touching anything.

- [x] **18.1** `[Backend]` ~~`get_fitness_dashboard_metrics(time_filter)` RPC~~ — **superseded, not built as literally specified.** The fitness dashboard instead uses a single-row JSONB cache (`fitness_dashboard_cache`) refreshed every 10 min by `pg_cron` plus change-triggers on `fitness_user_assignments`/`fitness_exercises`/`fitness_challenges`/`fitness_users` (`get_fitness_dashboard_kpis()`, see `KPIs.sql`/`20260719_fix_fitness_kpis.sql`) — always-fresh-enough without a `time_filter` param, covering exercises/plans/challenges/generated-workouts/participants already. Not rebuilt as a parameterized RPC since the existing architecture already satisfies the intent; revisit only if a genuine time-windowed trend view is needed later.
- [x] **18.2** `[Admin]` Wire `fitness/page.tsx` KPI row to live counts — **already done.** `page.tsx`'s 6 KPI cards all read from `useFitnessDashboardKpis()` (`total_fitness_users`, `active_plans`, `live_challenges`, `exercise_library_count`, `fitcoins_issued`, `ai_generated_plans`) — no hardcoded numbers remain (the `255`/`1 plan`/`1 challenge` figures only ever existed in `ADMIN_DASHBOARD_SUPABASE_ANALYTICS_ROADMAP.md` as a historical snapshot predating this RPC).
- [x] **18.3** `[Admin]` Hide Active Today/Avg Streak/Avg Completion/Top Challenges/Leaderboard until logging exists — **moot, logging already exists** (see 18.6), so nothing needs hiding: `DashboardTab.tsx`'s mini-KPIs and the Top Challenges/Most Used Plans/FitCoins Leaderboard/Top Exercises cards all read real RPC fields with correct empty states ("No active challenges yet.", etc.) rather than fake data. One known low-fidelity spot: the leaderboard has no user-name join, so it renders `User {id.slice(0,8)}` — real data, just not pretty; not in this pass's scope.
- [x] **18.4** `[Backend]` Create `fitness_coin_ledger` — **already satisfied by the more general `app_ledger` table** (`category='fitness'`, `full-tables.sql`), which already powers `fitcoins_issued`. No new table needed.
- [x] **18.5** `[Admin]` Replace "AI-Generated Plans" hardcoded number — **already done**, sourced from `count(fitness_generated_workouts)` via the same RPC.
- [x] **18.6** `[Mobile]` Confirm/build workout-session and exercise-completion event logging — **confirmed already built and wired**, mobile-side: `hooks/use-active-workout.ts` (`useStartWorkoutSession`, `useBulkLogExerciseSets`, `useFinishWorkoutSession`, `useAbandonWorkoutSession`) writes to `exercise_sessions`/`exercise_logs`; `hooks/use-fitness-dashboard.ts` adds outdoor/plan-day session starts. Streak tracking (`fitness_user_streaks`, `record_workout_completion()`, trigger on session completion) and a full FitCoins ledger/tier/reward system (`award_fitcoins()`, `redeem_fitcoin_reward()` RPC) are also already live (`supabase/migrations/20260714*.sql` in the mobile repo) — this module is materially more complete than this epic's original framing assumed.
- [x] **18.7** `[Admin]` `ScheduleTab.tsx`: wire to `fitness_content_schedule`.
  **Done:** the "Pipeline" 12/4/84 card was already commented out by a prior pass; the remaining gap — the Content Calendar table rendering a hardcoded 3-row array with no query at all — is fixed. Added `hooks/supabase-calls/useFitnessContentSchedule.ts` (real `.from("fitness_content_schedule")` query) and rewired `ScheduleTab.tsx` with proper loading (skeleton rows), error, and empty (`"📂 Nothing scheduled yet."`) states. Note: the table has no `title` column — `reference_id` points at a different table depending on `content_type` (workout/challenge/broadcast/article), so the label falls back to `metadata.title` when present, else a generic `"{Type} #{id prefix}"` rather than guessing which table to join.
  **Also found and fixed while verifying (not originally listed):** `get_platform_overview_metrics` (Epic 10.2's RPC) and `get_fitness_dashboard_kpis` computed "fitness users"/"active plans" from two different tables with two different definitions (`fitness_onboarding_selections`/`fitness_plans.status='published'` vs. `fitness_users`/`fitness_user_assignments.status='active'`) — the platform-overview dashboard and the Fitness module dashboard could show disagreeing numbers for the same-named metric. Fixed via `supabase/migrations/20260811_fix_platform_overview_fitness_definitions.sql`, adopting the Fitness module's own definitions (the number admins already see day-to-day on that page). **This migration file is written but not yet applied to the live project** — no `supabase` CLI is available in this environment to push it; run it against the live DB (SQL editor or `supabase db push`) before relying on the fix.

---

## Epic 19 — Medical Content (Diseases, Symptoms, Healthy Living, FAQ) *(was: Epic 10)*

> **Cross-reference:** Part I Epic 8.11 confirmed Diseases, Symptoms,
> Healthy Living, and FAQ all already have real Supabase-backed hooks
> (`.from("conditions")`, `.from("symptoms")`, `.from("healthy_living_info")`,
> `.from("faqs")` respectively) — the data-fetching layer this epic
> needs already exists; 19.1-19.6 below are about the specific
> KPI/metric numbers shown in the UI, not the underlying module.

**Status:** [x] Complete — this epic's text was almost entirely stale (19.2/19.5
and most of 19.3 were already fixed by prior work); real remaining work turned
out to be 3 live bugs found while verifying, not the stories as originally
worded. See per-story notes.

- [x] **19.1** `[Backend]` `get_content_dashboard_metrics(time_filter)` RPC — **already existed live, confirmed directly against the DB, just never committed to a migration.** Captured it in `supabase/migrations/20260812_epic19_content_metrics_and_fixes.sql`, fixing one real bug in the process: the live body filtered conditions/symptoms on `status = 'pending'`, but neither table's `CHECK` constraint allows that value (only `draft`/`published`/`archived`/`pending_review` do) — so the "pending" breakdown has always silently evaluated to zero. Corrected to `'pending_review'`. Returns lifetime totals, not time-windowed (matches what's live today); revisit only if a consuming page needs period-over-period deltas.
- [x] **19.2** `[Admin]` Diseases/Symptoms hardcoded likes/engagement/verification — **already done** by prior work. `useConditionStats`/`useSymptomStats` compute real `total_views` (`sum(view_count)`) and a real `reviewRate`/`verificationRate` from `reviewed_at IS NOT NULL` — no likes/engagement columns exist so those metrics were dropped entirely rather than faked, exactly per this story's instruction. Verified zero hardcoded `124K`/`4.7`/`94%` anywhere in the tree.
- [x] **19.3** `[Admin]` Healthy Living Total Views / Categories rename / rating — **mostly already done**, one real bug fixed. Total Views was already real (`sum(view_count)`). No "Categories" → "Content Types" rename needed — Healthy Living has a genuine many-to-many category taxonomy (`healthy_living_categories`), so the label is accurate as-is. No hardcoded 4.8 rating found anywhere.
  **Bug found and fixed:** `get_healthy_living_kpi_stats()` (added Jul 2) referenced `healthy_living_info.is_featured`, which `20260712_healthy_living_simplify.sql` dropped 10 days later when it flattened the old parent-tree schema. If that migration is live, this RPC has been throwing "column does not exist" for about a month — and `HealthyLivingStats.tsx` had no error state (only checked `isLoading || !stats`), so the KPI row was stuck in an infinite loading skeleton rather than showing an error. Fixed the RPC (dropped the featured-count field, same "drop rather than fake" precedent as 19.2/19.5) and added a real error state to the component; KPI grid is now 3 cards instead of 4.
- [x] **19.4** `[Admin]` Healthy Living view dialog Parent/ancestry column — **moot, by decision.** The `parent_id` hierarchy this asked for was intentionally removed by `20260712_healthy_living_simplify.sql` — `healthy_living_info` is now a flat table, and content organization is modeled as a many-to-many category taxonomy (`healthy_living_categories`) instead of a tree. `view-healthyLiving-dialog.tsx` already shows real category names; there is no ancestry concept left to display. Confirmed with the product owner not to reintroduce the tree — closing as moot rather than building against a schema decision that was deliberately reversed.
- [x] **19.5** `[Admin]` FAQ active count/category count/AI Deflection Rate — **already done** by prior work. `useFAQStats` computes real `activeFaqs`, `totalViews`, and a `helpfulRate` from `helpful_count`/`not_helpful_count` (returns `null` — "No feedback yet" — rather than a fake 0% when there's no feedback). No "AI Deflection Rate" string exists anywhere in the codebase; it was already dropped rather than faked, exactly per this story's instruction (deflection genuinely can't be computed without chatbot-side event logging that doesn't exist yet).
- [x] **19.6** `[Backend]` `useGetFacilitiesMapData` server-side filtering — **already done**, the described problem (client-side post-filtering) doesn't match current code: `get_facilities_map` already applies region/district/facility_type/status filters in its `WHERE` clause, and the hook passes them as RPC params with zero client-side re-filtering.
  **Bug found and fixed:** the hook *always* also sends a `p_facility_name` param, but the only committed definition of `get_facilities_map` never declared that parameter — PostgREST resolves RPC calls by exact parameter-name matching, so every single map load (not just ones using a name filter) would fail unless an undocumented newer version already existed live. Added `p_facility_name` (ILIKE match) to the RPC in the same migration as 19.1/19.3's fixes — a no-op if a matching version was already live, a real fix if it wasn't.

---

## Epic 20 — Medication Reminders *(was: Epic 11)*
**Status:** [x] Complete for the scope actually taken on this pass — 20.1-20.3
were already done (this epic's text was stale). 20.4/20.5 done to a
deliberately **minimal, scoped** fix — see the real architectural problem
flagged below before treating mobile medication reminders as fully sorted.

- [x] **20.1** `[Admin]` Keep existing live Total/Active reminder counts — confirmed already wired via `MedicationStats.tsx` → `get_medication_kpi_stats()` RPC.
- [x] **20.2** `[Backend]` Add a reminder-delivery/acknowledgement event table — **already exists**: `medication_adherence` (`reminder_id`, `user_id`, `status: taken|skipped|missed`, `scheduled_time`, `action_time`, `UNIQUE(reminder_id, scheduled_time)` — see `KPIs.sql`), already fully consumed by `AdherenceTab.tsx`/`useMedicationAdherence()`.
- [x] **20.3** `[Admin]` Wire Adherence Rate — **already done**, `MedicationStats.tsx` renders a real `adherence_rate` from `get_medication_kpi_stats()`; no hardcoded 82% found anywhere in the tree.
- [x] **20.4**/**20.5** `[Mobile]` Write to `medication_adherence` instead of only mutating `medication_reminders.status`.
  **Done, minimal scope (by explicit choice — see note below):** `src/services/notificationButtonPress.ts`'s `markasComplete`/`markasSkip` now upsert a `medication_adherence` row (`status: taken/skipped`, `action_time: now()`) in addition to their existing `medication_reminders.status` mutation (left in place, unproven to be dead, additive-only change). The upsert needs the exact scheduled dose time (the table's unique constraint is per `reminder_id` + `scheduled_time`), which the notification payload didn't previously carry — added `scheduledTime: date.toISOString()` to `scheduleNotifications.ts`'s local-notification `data` payload, and threaded it through `notificationActions.ts` → `markasComplete`/`markasSkip` (falls back to `now()` for notifications already scheduled on-device before this shipped). `markasSnooze` intentionally does **not** write an adherence row — the dose isn't resolved yet, just deferred. Also deleted ~75 lines of dead, fully-commented-out earlier `markasSnooze` logic sitting directly above the live version in the same file. Verified via `tsc --noEmit` diff against baseline: identical error count before/after, isolated to the 3 touched files — no regressions introduced.
  **⚠️ Deliberately NOT fixed — flagged as a real, separate architectural problem, not part of this pass's scope (by explicit decision, given the risk of touching live medication-reminder delivery for real users):**
  - **Two independent, disagreeing reminder-scheduling systems are live simultaneously.** On-device local notifications are driven by the `reminder_timestamps` array column (`scheduleNotifications.ts`). Server-side push (`supabase/functions/send-reminders` + `get_due_medication_reminders(p_current_time)` RPC) instead *computes* dose times mathematically from `interval`/`start_date`/`number_of_intakes`/`notification_schedule`/`week_days`/`gap_days` — it never reads `reminder_timestamps` at all. These can disagree on exact dose times for "the same" reminder and may be delivering duplicate reminders to users today. Reconciling this is a real design decision (which system is canonical) requiring its own review, not a drive-by fix.
  - **Server-push button presses are silently broken today, unrelated to this fix:** `send-reminders/index.ts` puts the reminder id under `data.reminderId`, while every client-side handler (`notificationActions.ts`) reads `data.medicationId` — so acting on a server-pushed notification throws `"Missing medicationId in notification data"` (caught and logged, not surfaced to the user). Not touched this pass since it's tangled up with the scheduling-system question above.
  - **No "missed" dose ever gets recorded.** `medication_adherence` rows are only ever created reactively (on a button press, after this fix). A user who ignores a reminder entirely never gets a row at all, so `get_medication_kpi_stats()`'s adherence-rate denominator silently excludes truly-ignored doses rather than counting them as missed — inflating the rate. Fixing this properly means something needs to proactively insert a `missed`-default row per due dose (the natural place is `send-reminders`, using the RPC's already-computed `expected_time`), which is entangled with the two points above.
  - **Two legacy scheduling code paths also coexist client-side** (`scheduleNotifications.ts` vs `medicationReminderService.ts`, keyed off different data shapes — `reminder_timestamps` vs `intake_times[].utc_schedule_times`) and `setupNotificationCategories` is duplicated verbatim in two files (`notificationActions.ts` and `scheduleNotifications.ts`). Worth a cleanup pass but not touched here.

---

## Epic 21 — Delete Account Requests *(was: Epic 12)*
- [ ] **21.1** `[Admin]` Wire `delete-account-request/_components/DeleteRequestStats.tsx` counts by `status` from `delete_account_requests` (currently 0 rows — ship correct empty state).
- [ ] **21.2** `[Backend]` Formalize the status vocabulary (e.g. `pending_review`, `in_verification`, `grace_period`, `completed`, `cancelled`) as an enum/check constraint so "In Verification"/"Grace Period" metrics are backed by enforced states, not assumed ones.
- [x] **21.3** `[Mobile]` Confirm the in-app delete-account flow writes a `delete_account_requests` row with the correct initial status — **done as part of 21.5**, see below.
- [ ] **21.4** `[Backend]` Grace-period expiry job (cron): auto-transition `grace_period` → `completed` after the configured window, executing the actual deletion/anonymization.
- [x] **21.5** `[Mobile]` Replace the current Delete Account web redirect with an authenticated mobile request that creates a `delete_account_requests` row.
  **Done, plus a real security bug fixed along the way:** `app/(app)/(auth)/(tabs)/My Account/DeleteAccount.tsx` no longer opens `office.4ourlife.com/delete-account` — it now `POST`s to `/api/user/delete-account-request` with the user's Supabase session token, then signs out. That route (`app/api/user/delete-account-request/route.js`) previously had **zero authentication** — it trusted a client-supplied `userId`/`email` in the request body with no verification at all, meaning anyone could POST an arbitrary `userId` and create a fake deletion request against someone else's account. Confirmed it had zero live callers anywhere (admin or mobile) before this fix, so nothing depended on the old insecure contract. Rewrote it to validate the caller via Supabase Auth JWT (matching the pattern already established by `/api/user/push-token` and `/api/chat/messages`), derive `user_id`/`email` server-side instead of trusting the body, use the service-role client, and no-op (rather than duplicate) if the user already has a pending request. Status defaults to `'pending'`, matching what `hooks/supabase-calls/useDeleteAccountRequests.ts` already expects.

---

## Epic 22 — Internal Admin Task Manager *(was: Epic 13)*
**⚠️ See Assumption #3.**
- [ ] **22.1** `[Backend]` Create `admin_tasks` table (title, description, status, assignee, priority, due_date, created_by, board/column position).
- [ ] **22.2** `[Admin]` Wire `tasks/_components/TaskStats.tsx` to real counts (New/In Progress/Under Review/Completed) instead of hardcoded 4/6/3/12.
- [ ] **22.3** `[Admin]` Wire `tasks/_components/KanbanBoard.tsx` drag-and-drop to persist column/status changes to `admin_tasks`.
- [ ] **22.4** `[Admin]` Task assignment + activity log entry on create/update/complete (feeds `activity_logs`).

---

## Epic 23 — BedTracker *(was: Epic 14)*

> **Cross-reference:** Part I Epic 8.10 confirmed all 6 tabs
> (`LiveOverviewTab`, `BedRegistryTab`, `BedTrackerFacilitiesTab`,
> `AmbulanceDispatchTab`, `BedTrackerAnalyticsTab`, `DesignStrategyTab`)
> currently render `TabPlaceholder` — the page shell/navigation is
> already well-built on `clearing`, only the tab *content* below needs
> this epic's backend work. `build-ready`'s `app/api/bedtracker/
> analytics/route.ts` may be a useful field-list reference for 23.4's
> `BedTrackerAnalyticsTab` specifically (after fixing its auth pattern
> per Part I Epic 0.2's fix, and restyling to `clearing`'s kit).

- [ ] **23.1** `[Backend]` Define facility-side update contract: how does a facility report bed availability (API endpoint, or a facility-portal mobile/web screen)?
- [ ] **23.2** `[Backend]` `get_bedtracker_analytics(time_filter)` RPC: occupancy rate, alerts, ambulance dispatch status, coverage — from `bed_tracker_facilities`, `bed_tracker_alerts`, `ambulance_dispatches`.
- [ ] **23.3** `[Backend]` Alert-threshold automation (e.g. auto-flag when a facility's available beds drop below N).
- [ ] **23.4** `[Admin]` Wire `bedtracker/page.tsx`'s tabs (currently all `TabPlaceholder`) to live data + real-time updates (Supabase Realtime channel).
- [ ] **23.5** `[Mobile]` Facility-side bed-count update UI (if facility staff use the consumer app rather than a separate portal — confirm which).
- [ ] **23.6** `[Mobile]` Consumer-side bed-availability display on facility profile / map.

---

## Epic 24 — FacilityScout *(was: Epic 15)*

> **Cross-reference:** Part I Epic 8.10 confirmed all 5 tabs
> (`LeaderboardTab`, `RewardsQueueTab`, `FacilityScoutSettingsTab`,
> `AllSubmissionsTab`, `PendingReviewTab`) currently render
> `TabPlaceholder`. No corresponding `build-ready` implementation was
> found for this module (unlike BedTracker/HCP/Jobs) — build from this
> epic's spec directly.

- [ ] **24.1** `[Backend]` Submission review workflow (collector submits → admin approves/rejects → status change).
- [ ] **24.2** `[Backend]` Reward ledger/payment-status tracking for collectors (`collector_submissions` → payout via Epic 15's payment rails once monetary).
- [ ] **24.3** `[Backend]` `get_facilityscout_analytics(time_filter)` RPC: collector activity, submissions by status, rewards owed/paid, approval rate, leaderboard.
- [ ] **24.4** `[Admin]` Wire `facilityscout/page.tsx`'s tabs (currently all `TabPlaceholder`) to live data.
- [ ] **24.5** `[Mobile]` Collector-facing submission flow (if collectors use the mobile app) — capture facility details/photos, submit for review.
- [ ] **24.6** `[Backend]` Basic anti-fraud scoring before rewards become real money (duplicate-submission detection at minimum).

---

## Epic 25 — HCP (Healthcare Provider) Verification *(was: Epic 16)*

> **Cross-reference:** Part I Epic 8.10 confirmed all 3 tabs
> (`AllHCPTab`, `GroupChatsHCPTab`, `PendingHCPTab`) currently render
> `TabPlaceholder`. `build-ready`'s `app/api/hcp/verify-license/route.ts`
> may be a useful reference for 25.3's review-queue logic once rebuilt
> against `clearing`'s kit + fixed auth pattern (Part I Epic 0.2).

- [ ] **25.1** `[Backend]` Define verification workflow states (submitted → under review → verified/rejected) on `hcp_verifications`.
- [ ] **25.2** `[Mobile]` HCP onboarding/document-submission flow (license upload, credentials).
- [ ] **25.3** `[Admin]` `hcp/page.tsx` review queue (currently all tabs `TabPlaceholder`): approve/reject with reason, document viewer.
- [ ] **25.4** `[Backend]` Notify HCP of verification decision (push/email).

---

## Epic 26 — Jobs Board *(was: Epic 17)*

> **Cross-reference:** Part I Epic 8.10 confirmed all 5 tabs
> (`PostJobTab`, `PremiumServicesTab`, `ApplicantsTab`, `DigitalCVsTab`,
> `AllListingsTab`) currently render `TabPlaceholder`. `build-ready` has
> 3 corresponding routes (`app/api/jobs/{route,applications,
> document-vault}.ts`) that may be useful field-list references once
> rebuilt against `clearing`'s kit + fixed auth pattern.

- [ ] **26.1** `[Backend]` Confirm `job_postings`/`job_applications` schema covers required fields (facility, role, requirements, salary range, status).
- [ ] **26.2** `[Admin]` `jobs/page.tsx` (currently all tabs `TabPlaceholder`) — posting moderation/approval, applicant overview, live counts instead of placeholder.
- [ ] **26.3** `[Mobile]` Job listing browse + apply flow for job-seeking users.
- [ ] **26.4** `[Mobile]` Facility-side job-posting flow (if facilities post via the app rather than the admin panel).

---

## Epic 27 — Notifications & Campaigns *(was: Epic 18)*

> **🔴 Cross-reference — read before starting:** Part I Epic 8.9 found a
> **live, leaked Firebase Admin SDK service-account key**
> (`app/api/notifications/serviceAccountKey.json`, currently checked in
> on `build-ready`/`prod/build-ready`/`prod/refactor`, confirmed absent
> from `clearing`) that this exact feature area depends on. That key
> must be rotated in the Firebase console (and the credential-loading
> approach rebuilt to use an environment variable, never a committed
> file) **before** any of the stories below go anywhere near real push
> delivery — don't accidentally re-introduce the leaked file while
> building this out. `clearing`'s own legacy
> `app/api/notifications/route.txt` route was entangled with this and has
> now been deleted in Part I 8.5 after confirming it was unused; see Part
> I 8.9/8.5 before adding any new push sender.

- [ ] **27.1** `[Backend]` `get_notification_analytics(time_filter)` RPC: campaigns sent, delivery/read/failure counts, template usage, automation-rule executions, broadcast performance.
- [ ] **27.2** `[Backend]` Push-provider delivery callbacks (or scheduled reconciliation against FCM) to populate delivery/read/failure counts — currently no feedback loop exists.
- [ ] **27.3** `[Admin]` Upgrade `notifications/page.tsx` beyond the Part I 8.5 safe admin surface: campaign builder with target segment, template selection, scheduling, preview, approval state, and delivery orchestration wired to `notification_campaigns`/`notification_templates`.
- [ ] **27.4** `[Admin]` Automation rules UI (`notification_automation_rules`) — trigger conditions + actions.
- [ ] **27.5** `[Admin]` `view-notification/page` — single notification detail/delivery-status view.
- [x] **27.6** `[Mobile]` Confirm push-token registration (`expo_push_token`/`fcm_token` on `user_profiles`) is reliably captured and refreshed on login/reinstall — **already done**, confirmed directly: `context/NotificationContext.tsx` registers for push on mount and re-saves the token whenever it or the session changes.
- [x] **27.7** `[Mobile]` Persist the Expo push token after login/reinstall — **already done, this story's premise was stale.** `context/NotificationContext.tsx` PATCHes `/api/user/push-token` (which writes `user_profiles.expo_push_token`) whenever `expoPushToken`/`session.access_token` change — this audit finding predates that flow existing (or predates it being noticed). The duplicate `src/lib/registerForPushNotificationAsync.ts` this story flagged as a second token source was confirmed to have zero importers and was deleted in the mobile notification-system consolidation work.
- [x] **27.8** `[Mobile]` Reconcile notification read-state columns (`is_seen` vs `is_read`/`read_at`) — **moot.** The only code touching `is_seen` is `src/services/notificationService.ts`'s `handleNotificationSeen`, whose only caller (`src/screens/Notifications-1.tsx`) has zero importers anywhere in the app — confirmed fully dead/unreachable legacy code, not the live notification center (`app/(app)/(auth)/(modal)/Notifications.tsx`, which already correctly uses `is_read`/`read_at` via the admin API).

---

## Epic 28 — Security & Compliance *(was: Epic 19)*

> **Cross-reference:** Part I Epic 8.3, working independently from the
> `build-ready` comparison, found the exact same duplicate-route problem
> story 28.4 below already called out (`security/page.tsx` and
> `security-center/page.tsx` are two separate placeholders) — good
> convergent confirmation from two different audit angles. `build-ready`
> has a real 155-line tabbed implementation (Threats / Audit Logs /
> Security Settings) at the `security` path worth using as a reference
> once restyled + auth-fixed (Part I Epic 0.2 pattern) — see 8.3 for
> details before starting 28.4/28.2.

- [ ] **28.1** `[Backend]` Server-side admin session telemetry writing to `admin_sessions`/`admin_activity_logs` (shared foundation with Epic 11.3).
- [ ] **28.2** `[Backend]` Threat-event ingestion into `security_threats` (failed-login spikes, suspicious IP, permission-escalation attempts).
- [ ] **28.3** `[Backend]` Define a transparent security-score algorithm (documented inputs/weights) or remove the "Security Score" metric entirely — never ship an opaque fabricated score.
- [ ] **28.4** `[Admin]` `security/page.tsx` + `security-center/page.tsx`: consolidate into one live module (currently two separate placeholder routes — decide whether both are needed or merge them; see cross-reference above).
- [ ] **28.5** `[Backend]` Create `compliance_settings` table (VAT rate, GRA ID, filing due dates) — required before `ComplianceGRA.tsx` can show anything real; remove the hardcoded GRA ID/VAT filing/scan date/encryption claims until then.
- [ ] **28.6** `[Backend]` (Optional, only if a reliable monitoring source is wired) `system_health_snapshots` table feeding `SystemHealth.tsx` — otherwise remove API/DB latency and uptime claims rather than fabricate them.

---

## Epic 29 — AI Hub / AI Observability & Content Moderation *(was: Epic 20)*

> **Cross-reference:** Part I Epic 8.1 confirmed `app/(dashboard)/ai/
> page.tsx` is currently a 4-line placeholder, and found a real 78-line
> `build-ready` implementation backed by 4 routes (`ai/{analytics,
> metrics,moderation-queue,recommendations}`) that may be a useful
> reference once restyled + auth-fixed (Part I Epic 0.2 pattern) — see
> 8.1 for details before starting 29.3.

- [ ] **29.1** `[Backend]` Standardize AI-call logging: every AI route (fitness plan generation, chat assistant, etc.) logs model name, prompt category, response time, tokens, status, cost, and user/admin/module context to `fitness_ai_calls` (fitness) and a new cross-module `ai_usage_logs` table for everything else.
- [ ] **29.2** `[Backend]` `get_ai_analytics(time_filter)` RPC: calls by module/model/status, token usage, cost estimate, latency, failed calls, moderation flags.
- [ ] **29.3** `[Admin]` Wire `ai/page.tsx` (currently a placeholder) and dashboard's `AIHubOverview.tsx` to 29.2; remove fabricated model-accuracy/anomaly-alert numbers.
- [ ] **29.4** `[Backend]` Create `content_moderation_flags` table; hook it into user-generated content surfaces (reviews, chat, facility submissions) so "Flagged" metrics across Users/Reviews (Epics 12.4, 13.4) have a real source instead of being removed indefinitely.
- [ ] **29.5** `[Admin]` Moderation queue UI: review flagged content, approve/remove, log the admin action.

---

## Epic 30 — Cross-Cutting Engineering *(was: Epic 21)*
> **Cross-reference:** overlaps significantly with Part I Epics 5-7
> (dead-code cleanup, testing/CI, build hygiene). 30.5's RLS audit in
> particular is largely already covered by Part I Epic 1.1/1.2 (RLS
> enabled on `user_profiles` + the other 48 previously-unprotected
> tables) — treat 30.2 as "keep this discipline going for every *new*
> table," not a fresh audit of what Part I already covered.

- [ ] **30.1** `[Backend]` Create `analytics_events` generic event-capture table (feature usage, views, searches, clicks, exports, broadcasts, admin actions not already logged) — shared infrastructure several epics above depend on (18.6, 19.2, 20.2).
- [ ] **30.2** `[Backend]` RLS/service-role audit: every new table/RPC added by this backlog gets an explicit RLS policy review before shipping (per `RLS.md`), especially anything touching money (Epic 15) or PII. **Baseline already established by Part I Epic 1.**
- [ ] **30.3** `[Admin]`/`[Backend]` Materialized daily snapshots for the more expensive aggregate RPCs (transaction analytics, AI analytics) so dashboard load doesn't run heavy queries on every page view.
- [ ] **30.4** `[Admin]` Export endpoints (CSV/PDF) for modules where admins will need to hand data to non-technical stakeholders (transactions, VAT report, user list).
- [ ] **30.5** `[Both]` Update `Refactor_Docs.md`'s hook-migration table as new `useX` hooks are added, so the service→hook migration record stays current.
- [ ] **30.6** `[Admin]` Security patch pass on `react-calendar` and any other dependency flagged with known CVEs in `ToChange.md` — schedule as its own PR since it may introduce breaking changes to calendar-dependent screens (Period Tracker, BedTracker scheduling).
- [ ] **30.7** `[Admin]`/`[Mobile]` Keep a source-of-truth table map for every metric-producing mobile flow: mobile file(s), Supabase table(s), admin surface, and owning epic. Seed it from `docs/METRIC_REGISTRY.md` and this audit so future admin metric work always checks the mobile producer before marking a story complete.

---

## Suggested Phasing (Part II)

This roughly follows the existing 8-week roadmap in `ADMIN_DASHBOARD_SUPABASE_ANALYTICS_ROADMAP.md`, extended to cover the epics that document didn't include (Period Tracker mobile build, Payments, Subscriptions, and the smaller placeholder modules). Part I (Epics 0-8) should be worked before or alongside Phase 1 below — several Part II epics assume Part I's security/reliability fixes are already in place.

| Phase | Epics | Why this order |
|---|---|---|
| 1 | Epic 10 (Analytics Foundation), Epic 30.1–30.2 | Everything else needs the metric registry and shared event/RLS conventions in place first. |
| 2 | Epic 11 (Admin), Epic 12 (Users), Epic 13 (Facilities/Reviews) | Highest-traffic modules, mostly straightforward Supabase wiring. |
| 3 | Epic 17 (Period Tracker) | Fix the known bug immediately (17a is cheap); mobile MVP (17c) is self-contained and doesn't block on payments. |
| 4 | Epic 14 (Chats/Support), Epic 19 (Content), Epic 20 (Medication), Epic 21 (Delete Requests) | Content/support modules with clear data sources already mostly live. |
| 5 | Epic 15 (Transactions/Payments) | Largest epic — needs a dedicated stretch; everything downstream (Epic 16) depends on it. |
| 6 | Epic 16 (Subscriptions), Epic 18 (Fitness completion) | Builds on payment rails from Phase 5. |
| 7 | Epic 22 (Task Manager), Epic 23 (BedTracker), Epic 24 (FacilityScout), Epic 25 (HCP), Epic 26 (Jobs) | Enterprise/operational modules — all confirmed placeholder-tab-level today (Part I Epic 8.10), can trail. |
| 8 | Epic 27 (Notifications — blocked on Part I 8.9's key rotation), Epic 28 (Security/Compliance), Epic 29 (AI Hub/Moderation) | Needs the most new infrastructure (delivery callbacks, session telemetry, AI logging) — hardest to rush, do last with real data from earlier phases available to test against. |

---

## Definition of Done (applies to every Part II story above)

- [ ] Real Supabase query/RPC replaces any hardcoded value — no mock numbers, even "realistic-looking" ones, ship silently.
- [ ] Loading, empty, and error states are explicit and intentional (not a blank flash or a fake zero) — follow the pattern established in Part I Epic 2.4/3.3.
- [ ] RLS/permission-appropriate — service-role only where the data is sensitive (money, PII, security). Baseline from Part I Epic 1.
- [ ] Mobile↔Admin parity checked: if a mobile action should show up in the admin panel (or vice versa), verify it actually does, end-to-end, with a real test account.
- [ ] Metric registry (Epic 10.1) updated if a new KPI/chart was added or an existing one's source changed.
- [ ] Any chart/graph in the story uses the shared shadcn chart components (see **Epic 9**) rather than a one-off library instance or a hand-built static visual.
- [ ] If the story touches a route/hook Part I's `build-ready` comparison (Epic 8) flagged as having a reference implementation on that branch, apply Part I Epic 0.2's auth-pattern fix and Part I Epic 2's error-handling standard — don't carry `build-ready`'s bugs forward.
