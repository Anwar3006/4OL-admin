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

# Gap Analysis Parts A–Z — Implementation Map (verified 2026-08-21)

> Source: `GAP_ANALYSIS_MOCKUP_VS_4OURLIFE_ADMIN.md` (26 parts). All 26
> parts are implemented in this repo and pushed on branch
> `feat/gap-analysis-parts-lmn-security` (claim from commit `529366a`
> corrected 2026-08-21: Parts H/J/K were discussion-only and were
> implemented for real on 2026-08-21; Part I the same day). Evidence is
> the migration + route/UI surface per part.

| Part | Scope | Status | Evidence |
|---|---|---|---|
| A | Human Anatomy | ✅ Implemented | `20260820_anatomy_extension.sql`, `app/api/anatomy/**`, anatomy page + body map |
| B | Medication Reminder | ✅ Implemented | `20260820_medication_drug_catalog.sql`, drug import/verify dialogs, 5-tab page |
| C | Users + IBP Businesses | ✅ Implemented | `20260820_users_ibp_extension.sql`, Active/Premium tabs, bulk actions, invite |
| D | Dashboard + Task Manager | ✅ Implemented | `20260813_epic22…` + `20260820_admin_tasks_extension.sql`, Kanban + KPI dashboard |
| E | Chats (Groups/Support/Flagged) | ✅ Implemented | `20260820_chats_group_enrichment.sql`, rebuilt tabs + ticket dialogs |
| F | Map & Footprint + Outdoor pins | ✅ Implemented | `20260820_map_footprint_extension.sql`, 4 map tabs, outdoor route add/verify |
| G | Upstream sync + RBAC retrofit | ✅ Implemented | `requireAdminApiUser` on 100% of admin routes, `rbac_catalog_extension` 1–3 |
| H | Facilities (All/Pending/Top Rated/Featured) | ✅ Implemented 2026-08-21 | `20260821_facilities_management_extension.sql`, 6 RBAC-guarded `/api/facilities` routes, `useFacilitiesApi.ts`, registry + Top Rated (10-slot cap) + Featured tabs, Review Facility dialog; H-D6 anonymous composer deferred |
| I | Diseases & Conditions | ✅ Implemented 2026-08-21 | `20260821_conditions_management_extension.sql`, 7 RBAC-guarded `/api/diseases` routes, `useDiseasesApi.ts`, all 4 tabs live (Carousel/Engagement/Linkages); I-Phase 5 interconnections still open |
| J | Healthcare Professionals | ✅ Implemented 2026-08-21 | `20260821_hcp_management_extension.sql`, 5 RBAC-guarded `/api/hcp` routes, `useHcpApi.ts`, 7-tab registry + onboarding dialog (manual licence check per J-D2/J-D7); J-D4 med-enquiry counters "—" |
| K | Jobs | ✅ Implemented 2026-08-21 | `20260821_jobs_management_extension.sql`, 9 RBAC-guarded `/api/jobs` routes, `useJobsApi.ts`, 6-tab page (listings/post+approval queue/applicants/CVs/premium/strategy); K-D3 vault metadata-only, K-D4 geo radius stored |
| L | BedTracker | ✅ Implemented 2026-08-21 | Epic 23 notes below; `20260821_bedtracker_extension.sql` |
| M | Marketing | ✅ Implemented 2026-08-21 | `20260821_marketing_extension.sql`, server-backed `/api/marketing/**` |
| N | FacilityScout | ✅ Implemented 2026-08-21 | Epic 24 notes below; `20260821_facilityscout_extension.sql` |
| O | AI Hub | ✅ Implemented | `20260820_ai_hub_extension.sql`, `/ai` 3-tab live module |
| P | Settings | ✅ Implemented | `20260820_settings_security_extension.sql`, settings components |
| Q | Design System tokens | ✅ Implemented | `--ek-*` tokens in `globals.css`, consumed by rebuilt modules |
| R | Notifications | ✅ Implemented | `20260820_notifications_delivery_extension.sql`, notifications components |
| S | KPI & Card alignment | ✅ Implemented | `KpiCard`/`KpiGrid` kit adopted across modules |
| T | WhatsApp Community | ✅ Implemented | `20260820_whatsapp_community.sql`, fitness `WhatsAppTab` |
| U | DevOps menu | ✅ Implemented | devops page behind `devops.view` (super_admin) |
| V | Fitness | ✅ Implemented 2026-08-21 | `20260821_fitness_extension.sql`, 12 tabs |
| W | Admin Profile Modal | ✅ Implemented 2026-08-21 | `20260821_admin_profile_extension.sql`, ProfileModal |
| X | Compact (Density) Mode | ✅ Implemented 2026-08-21 | `use-density.ts` + CSS density tokens |
| Y | Platform Schematic | ✅ Implemented 2026-08-21 | `/api/admin/schematic` auto-updating page |
| Z | Delete Account Requests | ✅ Implemented 2026-08-21 | `20260821_deletion_policy_extension.sql`, rebuilt page |
| AA | Transactions menu depth | ✅ Implemented 2026-08-22 | `20260822_transactions_ledger.sql`, 10 RBAC-guarded `/api/transactions*` routes, `useTransactions.ts`, all 7 tabs live |
| AB | Medication Enquiry (admin depth + mobile rollout design) | ✅ Admin depth implemented 2026-08-22 | `20260822_med_enquiry_depth.sql`, 8 RBAC-guarded `/api/medenquiry*` routes, `useMedEnquiry.ts`, all 6 tabs live; Facilities ↔ MedEnquiry cross-links; mobile screens deferred (M-D9) |
| AC | App Reviews & periodic rating popup (Reviews menu "App" target) | ✅ Implemented 2026-08-22 | `20260822_app_reviews.sql` (table + 5 RPCs + RLS + monthly throttle), 📱 App Reviews tab on `/reviews` with live moderation, `useAppReviews.tsx`; mobile: `RateAppModal` + `RateAppPromptController` + `lib/store-links.ts` (4OL Mobile Plasence) |
| AD | Global Search (S-D) | ✅ Implemented 2026-08-22 | `20260822_global_search_v2.sql` (hybrid RPC + analytics + ghost RPC capture), `/api/search/dynamic` → 410 Gone; mobile: `use-global-search.ts` + Home wiring, dead search hooks deleted (4OL Mobile Plasence) |
| AE | Top Rated placement windows (T-D) | ✅ Implemented 2026-08-22 | `20260822_top_rated_placement_windows.sql` (windows + snapshot trigger + anon revoke); `/top-rated` page completed (CSV export, search, totals, AlertDialog, deep links, window inputs); mobile window filters + sort tiebreaker (4OL Mobile Plasence) |
| AF | Encyclopedia library uncapping (L-D) | ✅ Implemented 2026-08-22 | Mobile only (4OL Mobile Plasence): letter/category uncapped (`MAX_LIBRARY_ROWS=500`), column projections, cumulative search pagination across Diseases/Symptoms/Healthy Living hooks |
| AG | Map hardening + outdoor route pins (M-D) | ✅ Implemented 2026-08-22 | `20260822_map_hardening.sql` (RPC lockdown + 40/min throttle + facility_profile RLS); mobile: no client status param, fail-fast throttle handling, outdoor route pin layer → route-detail deep link (4OL Mobile Plasence) |
| AH | Chat connectivity & safety (CH-D) | ✅ Implemented 2026-08-22 | `20260822_chat_schema_capture.sql` (ghost schema + `report_chat_content`); admin: discover gating, group field enrichment, 30/min send throttle, ticket transition notifications; mobile: Report message sheet, ticket parity (5 statuses + TKT ids + rating UI), group category chips, legacy `chatsupport` chain deleted (4OL Mobile Plasence) |

**Open follow-ups across parts (not blocking):** apply `20260820_*` /
`20260821_*` / `20260822_*` migrations to the live Supabase DB (credentials
with the owner); mobile-side stories 23.5/23.6/24.5; Meta WhatsApp creds; MNO
payout API for scout rewards; Supabase Realtime channel for BedTracker
(currently polling); server-side failed-login telemetry (28.2 note).

---

# Fitness Mockup Parity — Monetization, FitCoins & Mobile Connectivity (implemented 2026-08)

> Source: `FITNESS_MOCKUP_GAP_ANALYSIS.md` (decisions D1–D10, locked by the
> user). Implemented on branch `feat/gap-analysis-parts-lmn-security` —
> commits `5400f08` (15 files, +2360) and `0a6b990` (comma-separated
> notification type filter + doc sync), both pushed. Mobile counterpart
> lives on `4OurLife-MobileApp` branch `feat/fitness-mockup-parity`
> (commit `837fa13`); its task log is `NAVIGATION_RULES.md` + the Fitness
> section of that repo's tracking docs.

| Item | Scope | Status | Evidence |
|---|---|---|---|
| Subscriptions & entitlement (D6) | `subscription_tiers`, `user_subscriptions`, `get_my_entitlement()`, `get_subscription_tiers()` | ✅ Implemented | `supabase/migrations/20260822_fitness_monetization_fitcoins.sql`; `/api/user/entitlement` (JWT-scoped, server resolves `auth.uid()` — no caller-supplied user id); `/api/subscriptions/admin` (super-admin-only grant/revoke, incl. lifetime premium); `SubscriptionsTab.tsx` |
| Paystack | Payment rail deliberately deferred — schema is data-only so manual Paystack wiring later plugs into `user_subscriptions` | ⏸ Deferred by user decision | Paywall note in mobile `premium.tsx` + info note in `SubscriptionsTab` |
| FitCoins admin (D8) | `fitcoin_activity_tiers` (reward tiers per activity), rebuilt `handle_exercise_session_completed` trigger, coins purpose/usage management | ✅ Implemented | same migration; `/api/fitness/fitcoins` (RBAC `fitcoins.view`/`fitcoins.manage`); `FitCoinsTab.tsx` |
| Server-driven fitness notifications (D5) | `notify_fitness(p_user_id, p_type, p_title, p_body, p_metadata)` RPC + `fn_fitness_*` pg_cron functions for challenge/streak/billing alerts (guarded block) | ✅ Implemented | same migration; `/api/fitness/notifications` (`fitness_notifications.send`); notification composer in `SubscriptionsTab` |
| Coach attribution (D7) | `fitness_plans.coach_display_name` — admin-entered display name, never the admin's real name | ✅ Implemented | same migration; coach-name input in plan create/edit dialogs; mobile shows it on dashboard + `generated-for-you` |
| Social proof aggregate (D4) | `get_fitness_social_proof()` — real `joined_last_7_days` / `total_members` from `fitness_users` (IDOR-guarded) | ✅ Implemented | same migration; consumed by mobile `SocialProofBanner` (renders nothing when zero) |
| IDOR hardening | `get_fitness_week`, `get_fitness_activity_history`, `get_fitness_social_proof`, rebuilt `get_fitness_dashboard` all enforce `p_user_id = auth.uid()` | ✅ Implemented | same migration (closes the Part-I IDOR finding on `get_fitness_dashboard`) |
| Notifications type filter | `/api/user/notifications` GET accepts comma-separated `type` list, member-by-member validated → `.eq()`/`.in()` | ✅ Implemented | `0a6b990` |
| RBAC | `subscriptions.view`/`subscriptions.manage`, `fitcoins.view`/`fitcoins.manage`, `fitness_notifications.send` added to `lib/permissions.ts` | ✅ Implemented | `5400f08` |

**Open follow-ups (not blocking):** apply
`20260822_fitness_monetization_fitcoins.sql` to the live Supabase DB
(user-manual, per the deployment-skip mandate); wire Paystack into
`user_subscriptions` when the user schedules it; leaderboard user-name
join (18.3 note) still open.

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

- [x] **6.1 Stand up a test framework.** Zero `*.test.ts(x)`/`*.spec.ts(x)`
  files and no Jest/Vitest config exist anywhere in the repo. Start with
  Vitest + React Testing Library (fastest to wire into a Next.js/Turbopack
  setup); prioritize coverage of Epic 1/2's fixes first (auth gating,
  the hook layer) since those are the highest-risk areas to regress
  silently.
  **Done (2026-08-17):** Vitest 3 wired up (`vitest.config.ts`,
  `pnpm test` / `pnpm test:watch` scripts). The orphan
  `lib/period-calculator.test.ts` (previously node:test, no runner) was
  converted to Vitest; new suites added for the RBAC core —
  `lib/admin-roles.test.ts` (role vocabulary) and
  `lib/permissions.test.ts` (catalog integrity, role defaults,
  grant/revoke resolution semantics mirroring `has_4ol_permission`).
  26 tests, all passing.

- [x] **6.2 Add a CI pipeline.** No `.github/workflows` (or equivalent)
  exists. At minimum: `tsc --noEmit`, `next lint`, and `next build` on
  every PR, so Epic 0-class breakage (dead imports, conflicting
  middleware/proxy) is caught before merge instead of discovered by
  running the app.
  **Done (2026-08-17):** `.github/workflows/ci.yml` — pnpm + Node 22,
  `type-check`, `lint`, and `test` on push/PR. `next build` is
  deliberately NOT in CI (it requires runtime env vars the repo
  doesn't commit); run it locally before releases.

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
| 2 | **Period tracker data model — SUPERSEDED, see Epic 17a.** Originally: `tracker_logs` (0 rows) retired in favor of the `cycles`/`symptoms`/`cycle_statistics`/`prediction_results`/`period_tracker_profiles` schema proposed in `4-Our-Life-App/Period-tracker/PERIODS_TRACKER_IMPLEMENTATION.md`. **What actually shipped instead (2026-08-14):** a much larger `period_*`-prefixed schema (34 tables — cycles, daily logs, forecasts, safety flags, consent, notes review queue, notification prefs, Library publishing, Friday Trivia, AI content jobs, source-document indexing) branded "Plasence," built to support a full admin CMS (Period/Library/AI-Hub) rather than a standalone tracker. Confirmed as the intended direction, not a mistake — TASKS.md just hadn't caught up. `tracker_logs` is **not yet dropped**: the legacy mobile screens (`SelectDateOfPeriod`, `YourPeriodFlow`, `TrackPeriod`, etc.) still read/write it and were deliberately left untouched by the Plasence mobile branch (additive-only, see 17c). Retiring `tracker_logs` and the legacy screens is a separate, not-yet-scheduled decision. | Decision made and implemented across two sessions before TASKS.md was updated to match; documented here after the fact so the task list stops contradicting the live schema. |
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
- [x] **11.1** `[Backend]` `get_admin_dashboard_metrics(time_filter)` RPC: total/active/pending admins, role breakdown, recent admin activity — sourced from `user_profiles` (`is_admin`, `admin_role`, `admin_permissions`, `status`, `last_active`) + `activity_logs`.
  **Done:** `supabase/migrations/20260812_epic11_admin_access_management.sql`. Real
  finding: `admin_role`/`admin_permissions` columns are completely unused
  anywhere in the app (no `CREATE TYPE` for `admin_role` even exists) — the
  actual permission model is the flat `role` enum (`registrar`/`admin`/
  `super_admin`). "Pending" admins comes from `user_invites` (unexpired,
  unused, admin-role invites), not `user_profiles.status` — invited admins
  have no profile row until they accept, and `'pending'` was never a valid
  `status` value in the first place (real vocabulary is
  `active/inactive/suspended/banned/pending_verification`; the old
  `getUsers()` analytics reducer silently dropped `banned` and always
  showed 0 pending because of this same mismatch — see Epic 12.1 for the
  matching fix there).
- [x] **11.2** `[Admin]` Wire `admins/_components/AdminStats.tsx` to the RPC above; remove hardcoded Total/Active/Pending/Inactive counts. **Done.**
- [x] **11.3** `[Backend]` Persist admin sessions: populate `admin_sessions` on login/logout (session start, IP, device, last-seen heartbeat).
  **Done:** `start_admin_session`/`admin_session_heartbeat`/`end_admin_session`
  RPCs + `app/api/admin/session/route.ts`, wired into
  `DashboardWrapper.tsx` (start on auth, 5-min heartbeat while the
  dashboard is open, end via `sendBeacon` on sign-out). `admin_sessions`
  had zero writers anywhere before this.
- [x] **11.4** `[Backend]` Persist MFA enrollment state on `user_profiles` (or a dedicated column/table) so "MFA Not Set" and "Online Now" can be computed instead of hidden.
  **Scoped finding:** `mfa_enabled` already exists and is now read/displayed
  honestly, but **no MFA enrollment flow exists anywhere in this app**
  (no `supabase.auth.mfa.enroll()` call, no TOTP UI) — so it will
  realistically read 100% "not set" until a real enrollment feature is
  built. That's new-feature-scope work (Supabase MFA API + UI), not a
  wire-to-real-data fix; not built in this pass, flagged as real follow-up.
- [x] **11.5** `[Admin]` Once 11.3/11.4 land, unhide MFA-gap and Online-Now metrics in `AdminStats.tsx`. **Done** — both now real (`online_now` = distinct admins with an `admin_sessions` row active + heartbeated in the last 15 minutes).
- [x] **11.6** `[Admin]` Wire `admins/_components/ReportsTab.tsx` charts to `admin_activity_logs`/`activity_logs` instead of static arrays.
  **Done, using `activity_logs`, not `admin_activity_logs`** — the latter
  has an enum-typed `action_type` with no `CREATE TYPE` in any schema dump
  in this repo (can't confirm valid labels without live DB access) and
  zero writers anywhere; `activity_logs` already has 1,731+ real rows from
  existing facility/user admin RPCs. Extended it with
  `severity`/`ip_address`/`user_agent`/`session_id` columns instead of
  resurrecting the riskier table. Added `log_admin_activity()` as the
  shared logging primitive. The fabricated "AI Audit Summary" card
  (Model Retrains, False Positives Fixed, 94.2% confidence — no such
  concepts exist anywhere in the codebase) now calls the real
  `get_ai_analytics` RPC from Epic 29 instead; the two metrics with no
  real source were removed rather than faked.
- [x] **11.7** `[Admin]` Wire `admins/_components/RolesPermissionsTab.tsx` matrix to the real `admin_permissions` structure on `user_profiles` (make it editable, not just a static display).
  **Scoped down, not built as originally worded:** `admin_permissions`
  (jsonb) is unused everywhere in the app — there is no per-module
  permission enforcement to make "editable" (every real check in the
  codebase is a flat role comparison). Replaced the fabricated 9-role/
  9-module matrix (roles like "Content Manager"/"Finance"/"AI Mgr" that
  don't correspond to any real `role` value) with real per-role admin
  counts and an honest 2-tier capability table (Registrar vs Admin/Super
  Admin) derived directly from the actual `allowedRoles` checks found
  across `actions/user.actions.ts`, `actions/authenticate.actions.ts`,
  `lib/admin-api-auth.ts`. Building real granular per-module permissions
  is new-feature-scope work, not in this pass.
- [x] **11.8** `[Admin]` Wire `admins/_components/AdminTable.tsx` session/last-active column to `admin_sessions`.
  **`AdminTable.tsx` was dead code** — zero importers anywhere; the real
  admins table is `AllAdminsTab.tsx` + `adminColumns.tsx`, already wired
  to real data via `useUsers({admin:true})`. Deleted `AdminTable.tsx`.
  Found and fixed a real bug in the actual live column instead:
  `adminColumns.tsx`'s Activity column read `row.original.last_activity`,
  a field that has never existed on `user_profiles` (real column is
  `last_active`) — this column always rendered "Never" regardless of
  actual activity. Fixed the field name; it now shows real data once
  11.3's session heartbeat starts updating `last_active`.
  **Also fixed alongside this epic (not separately listed):**
  `SecurityCenterTab.tsx` had the same fabricated-security-score pattern
  Epic 28.3 explicitly forbids (a fake "82/100" score) plus hardcoded
  fake admin names/IPs/sessions — replaced with real `mfa_enabled`/
  `whitelisted_ips` per admin and real `admin_sessions` rows via new
  `app/api/admin/security-overview/route.ts`, no score. `AdminCommandBar.tsx`
  (Lock Panel / Suspend Admin / Force MFA Reset / etc.) has zero working
  buttons (no onClick handlers at all) but isn't covered by any of the 8
  stories above — left as-is, flagged here as real remaining fake UI.

---

## Epic 12 — User Management *(was: Epic 3)*
- [x] **12.1** `[Backend]` `get_user_dashboard_metrics(time_filter)` RPC: total/active/new/deleted users, by role/type/status/sex, users with push token, fitness-onboarding completion rate.
  **Done:** `supabase/migrations/20260813_epic12_user_management.sql`.
  Real bug fixed at the same root cause as Epic 11.1: `actions/user.actions.ts`'s
  `getUsers()` analytics reducer bucketed by `status === 'pending'`, a
  value that has never existed in `user_profiles.status`'s real CHECK
  vocabulary (`active/inactive/suspended/banned/pending_verification`) —
  Pending always read 0 and `banned` rows were silently dropped from every
  bucket entirely. Fixed the reducer directly (affects `UserSection.jsx`'s
  stat cards too, see 12.2).
- [x] **12.2** `[Admin]` Replace `users/_components/UsersStats.tsx` hardcoded values with the same live-query pattern `UserSection.jsx` already uses (don't maintain two different data-fetch approaches on one page).
  **`UserSection.jsx` was itself dead code** — zero importers anywhere;
  `users/page.tsx` renders `AllUsersTab.tsx` instead. Deleted
  `UserSection.jsx`. Wired `UsersStats.tsx` to the new dedicated RPC
  instead (cleaner than replicating `UserSection`'s two-query-per-render
  pattern for a component that was never live).
- [x] **12.3** `[Admin]` Define "Active" as `last_active` within the selected time window (not just `status = 'active'`). **Done** — `get_user_dashboard_metrics` computes `active` as `last_active >= since`.
- [x] **12.4** `[Admin]` Remove "Flagged" stat unless/until a moderation-flag table exists (see Epic 29 AI/Moderation); don't ship a metric with no source.
  **A real source exists and is now wired, not removed:**
  `content_moderation_flags.content_type` already includes `'profile'` in
  its CHECK constraint (added in the Epic 29 migration lineage) but
  nothing had ever written it. Also found: `flag-user-dialog.tsx` was a
  pure UI mock (`TODO` comment, fake `setTimeout`, no backend call), AND
  the dialog was never even mounted anywhere in the tree (`<FlagUserDialog />`
  had zero renders — clicking "Flag" in `view-user-dialog.tsx` opened
  dialog state with no visible modal). Built `create_profile_flag` RPC +
  `app/api/admin/users/flag` (GET list / POST create), wired the dialog to
  it for real, and mounted `<FlagUserDialog />` in `users/page.tsx`.
  `FlaggedUsersTab.tsx`'s hardcoded fake users replaced with the real list
  plus working Dismiss/Warn/Suspend/Ban actions via the existing
  `/api/ai/moderation-queue` → `moderate_content` path from Epic 29.5.
  Extended `moderate_content()` so `content_type = 'profile'` + `'ban'`
  actually bans the user (`user.banned` + `user_profiles.status`, same
  pattern as `useDeleteAccountRequests.ts`) — the first content_type where
  Epic 29.5's "ban doesn't resolve an author yet" gap is closed, since for
  a profile flag `content_id` already **is** the user_id.
- [x] **12.5** `[Admin]` "Premium" stat sources from `user_subscriptions` only (empty/zero state until Epic 16 subscriptions ship real rows). **Done** — real (currently empty) query, matches `UsersByPlan.tsx`'s existing empty-state convention from Epic 10.
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

## Epic 17 — Period Tracker / Plasence (Schema + Admin + Mobile) *(was: Epic 8)*
*`tracker_logs` holds 0 rows in the legacy mobile flow. As of 2026-08-14 this epic's scope expanded beyond the original standalone-tracker proposal (Assumption #2) into "Plasence": a full period-tracking + content Library + AI-generated Trivia/content + campaigns + consent/privacy-compliance platform, built and shipped across two sessions before this section was updated to match. This section now documents what's actually live, not the original 5-table plan.*

> **Cross-reference:** Part I Epic 2.7 confirmed `app/(dashboard)/period/
> page.tsx` was a bare `PagePlaceholder` before this epic's admin page
> was built. Part I Epic 8.7 flagged a real, old-schema implementation
> on `build-ready` as **not recommended for porting** until a schema
> decision landed — the schema that actually landed is a superset of
> that `build-ready` implementation, reconciled against main's real
> auth/schema rather than ported as-is (see `supabase/migrations/
> 20260814_period_tracker_full_schema.sql` and
> `20260814_period_tracker_rls_hardening.sql`).

### 17a. Schema Decision & Migration (Backend)
- [x] **17.1**/**17.2**/**17.3** `[Backend]` Schema decided and built: 34 `period_*` tables (`period_cycles`, `period_daily_logs`, `period_forecasts`, `period_safety_flags`, `period_consent_events`, `period_notes`, `period_notification_preferences`, `period_content`/`period_content_publications`/`period_content_collections`, `period_trivia_events`/`period_trivia_questions`/`period_trivia_submissions`/`period_trivia_leads`, `period_campaigns`, `period_ai_jobs`, `period_source_documents`/`period_source_chunks`, `period_privacy_requests`, `period_feature_flags`, etc.) — `supabase/migrations/20260814_period_tracker_full_schema.sql`. RLS completed and hardened across every table (7 tables that shipped with RLS fully disabled, 10 with RLS-enabled-but-no-policy, 13 policies re-evaluating `auth.uid()` per row, and 12 tables with overlapping permissive policies were all found live via Supabase's own advisors and fixed) plus 50 missing FK-covering indexes — `20260814_period_tracker_rls_hardening.sql`. Verified: security advisor findings 18 → 0, performance findings 116 → 0 actionable.
- [x] **17.4** (partial) `[Backend]` `tracker_logs` is **not** dropped — see the coexistence note under 17c below. Nothing new was built against it.
- [x] **17.5**/**17.6** `[Admin]` Period Tracker admin page rebuilt from scratch: 12-tab `/period` page (`app/(dashboard)/period/page.tsx`) — Overview, Users & Cycles, Daily Logs, Corrections, Safety Review, Calendar Notes, Consent & Privacy, Content, Engagement, Trivia, Forecasts, App Quality — backed by `/api/period/data`, plus an AI generation workspace at `/ai-hub/period` and `/ai-hub/period/content` backed by `/api/ai-hub/period` (OpenAI, not the Gemini SDK the source material assumed — this codebase already standardized on OpenAI via `lib/fitness/generate-plan.ts`).

### 17b. Prediction Calculator (shared logic, correct this time)
**Status: not built — this is real remaining work, not just a stale checklist.** A `confirm_period_start` action (`/api/period/me`, commit `7cfd3b44`) writes one `period_cycles` row and a *simple* traceable forecast (`next_period_start = start + typical_cycle_length`, `ovulation = that − 14 days`) so onboarding has somewhere to land — that is explicitly not the calculator below.
- [ ] **17.7** `[Backend]`/`[Mobile]` Implement `PeriodCalculator` (cycle-length averaging, ovulation = cycle length − 14, fertile window = ovulation −7 to +2, confidence scoring), using the corrected formula from `ToChange.md`: **Next Period Start = Most Recent Period Start + Average Cycle Length** (period length only affects bleed duration, not the next start date).
- [ ] **17.8** `[Backend]`/`[Mobile]` `DEFAULT_CYCLE_LENGTH = 28` cold-start fallback for fewer than 2 recorded cycles.
- [ ] **17.9** `[Backend]`/`[Mobile]` Return a predicted **date range**, not a single date: `start = last_cycle_start + avg_cycle_length`, `end = start + avg_period_length − 1`.
- [ ] **17.10** `[Backend]`/`[Mobile]` Sliding-window average (last 3 cycles), refreshed whenever a new cycle is logged (`period_ai_model_metrics`/forecast-quality tracking already exists in the admin Forecasts tab; the calculator feeding it does not).
- [x] **17.11** `[Admin]` Admin Forecasts tab renders whatever's in `period_forecasts`/`period_ai_model_metrics` (mean error, confidence coverage, drift) — will show real numbers automatically once 17.7–17.10 actually generate forecasts.
- [ ] **17.12** `[Backend]`/`[Mobile]` Unit tests for the calculator (cycle averaging, cold-start fallback, range calculation, irregular-cycle conservative estimate), mirrored on admin and mobile.

### 17c. Mobile: Core Tracking (MVP)
**Status: built as a separate, additive "Plasence" module** (`4-Our-Life-App` branch `codex/plasence-period-tracker`, merged to `main` at commit `70dd6c6`), not as new screens bolted onto the existing category/home navigation as originally scoped. `src/features/plasence/` — see its own `Task.md` for full detail (PLM-001 through PLM-009).
- [ ] **17.13** `[Mobile]` Still open: Plasence has **no Home/menu entry point** anywhere in the app yet — reachable only by direct route (`/plasence`). Wiring it into navigation is explicitly deferred pending product-owner sign-off on placement (Plasence `Task.md`'s Definition of Done).
- [x] **17.14** `[Mobile]` `LogScreen` — flow, moods, symptoms, temperature, exercise, medication, encrypted note; writes to `period_daily_logs` via `save_daily_log`, not a `cycles` table.
- [x] **17.15** `[Mobile]` `usePlasence.ts` — React Query + encrypted offline cache + optimistic writes, equivalent role to the originally-scoped `usePeriodTracker` hook.
- [x] **17.16** `[Mobile]` `TodayScreen` — current cycle day, estimated phase, streak, next-period estimate.
- [x] **17.17** `[Mobile]` `CalendarScreen` — six-week grid, logged-day/flow indicators, local-date-safe (no UTC drift).
- [x] **17.18** `[Mobile]` `OnboardingScreen` — goal, typical cycle/period length, timezone, reminder opt-in; writes to `period_user_settings` (not `period_tracker_profiles`, which doesn't exist in the shipped schema).
- [ ] **17.19** `[Backend]` Reminder notifications not wired yet. Still blocked on Part I Epic 8.9's Firebase key rotation as originally noted.

**Backend contract gaps found and fixed while wiring this up** (commit `7cfd3b44`, admin repo): the admin Period routes (`/api/period/me`, `/library`, `/trivia`) authenticated via cookies only and would have 401'd every native mobile request; the Library API used a signed-in user's symptoms/cycle phase for content ranking with no consent check; and nothing created a `period_cycles` row from onboarding's start-date input. All three fixed — see that commit for detail.

### 17d. Mobile: V1 Enhancements
- [x] **17.20** `[Mobile]` Symptom logging is part of `LogScreen` (17.14), not a separate screen — multi-select symptoms/moods writing to `period_daily_logs`.
- [ ] **17.21** `[Mobile]` Irregular-cycle detection (coefficient-of-variation check) — depends on 17b's calculator, not built.
- [ ] **17.22** `[Mobile]`/`[Backend]` Prediction-accuracy feedback loop against `period_forecasts` — depends on 17b, not built.
- [x] **17.23** `[Mobile]` Medical/fertility-estimate disclaimers present at onboarding and in `PrivacyScreen`/`InsightsScreen` (Plasence `Task.md` PLM-001, PLM-007).

### 17e. Mobile: V2 (Later)
- [ ] **17.24** `[Mobile]` Pregnancy mode (gestation-week tracking) — not built.
- [ ] **17.25** `[Mobile]` Partner sync (read-only cycle-status sharing) — not built.
- [ ] **17.26** `[Mobile]` Health-app export (Apple Health / Google Fit) — not built.
- [x] **17.27** `[Mobile]` Retired (2026-08-14). Turned out the legacy `src/screens/periodsTrackerScreens/*` implementation was already unregistered dead code — no navigator anywhere referenced it, so it wasn't actually reachable by users. Deleted the 11 screens, `src/services/tracker_logs/`, `OvulationStatusModal.tsx` (only ever imported by the deleted `DashboardPeriods.tsx`), the `periodTracker` Redux slice, and the now-unused `PeriodTrackerData`/`TrackerLog`/`FlowType` interfaces. Dropped `tracker_logs` (0 rows, `supabase/migrations/20260814_drop_legacy_tracker_logs.sql`) and removed the dead `/api/cron/tracker`/`/api/cron/ovulation` entries from `vercel.json` (neither route file existed). Plasence is now the only period-tracking implementation.

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
  **Bug found and fixed later:** `fitness_generated_workouts` turned out to be a legacy Gemini-era table (`lib/fitness/generate-plan.ts` never wrote to it — confirmed by reading the file directly; its 7 existing rows are all tagged `gemini-1.5-flash-sdk`/`gemini-3-flash-preview` in their metadata, predating the OpenAI swap in Epic "AI Hub"). The live generator writes exclusively to `fitness_plans`. Fixed `refresh_fitness_dashboard()`'s `ai_generated_plans` metric to count `fitness_plans WHERE author_type = 'ai'` instead — see `supabase/migrations/20260812_fix_ai_generated_plans_kpi.sql`.
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
  **Also found and fixed while applying:** two conflicting overloads of this RPC existed live simultaneously — the fixed `(time_filter text)` version above, and an orphaned zero-argument overload still carrying the original `'pending'` bug. Since PostgREST resolves RPC calls by exact parameter-name match, any future caller invoking this with no arguments would silently hit the buggy version. Dropped the orphaned overload; confirmed only one signature remains live.
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
**Status:** [x] Complete. `DeleteRequestStats.tsx`'s hardcoded mockup already
implied the exact 5-status lifecycle (Pending Review / In Verification / In
Grace Period / Completed / Cancelled) the epic asks 21.2 to formalize —
nothing in the schema or code enforced it, and the code that existed used a
different, simpler `pending`/`approved`/`rejected` vocabulary instead. Built
the full lifecycle end to end this pass: schema constraint, real stats,
grace-period ban/anonymize flow, and expiry cron.

- [x] **21.1** `[Admin]` Wire `DeleteRequestStats.tsx` counts by `status`. **Done** — `supabase/migrations/20260812_epic21_delete_account_status_vocabulary.sql` adds `get_delete_account_request_stats()` (one query, all 5 counts + total); `DeleteRequestStats.tsx` rewritten to call it via `useQuery`, with real loading/error states (was 5 fully hardcoded `KpiCard` values).
- [x] **21.2** `[Backend]` Formalize the status vocabulary as an enum/check constraint. **Done** — same migration adds a `CHECK` constraint enforcing exactly `pending_review | in_verification | grace_period | completed | cancelled` on `delete_account_requests.status` (previously unconstrained), with a defensive (0-row-in-practice) data migration mapping any pre-existing `pending`/`approved`/`rejected` values forward.
  **Also found and fixed while implementing:** `hooks/supabase-calls/useDeleteAccountRequests.ts`'s `useUpdateDeleteRequestStatus` — the only code that ever wrote a decision status — had two real bugs, both invisible only because the mutation had zero live callers anywhere (no approve/reject button existed in the UI): (1) it updated `user_profiles.is_deleted`, a column that **does not exist** on that table (the real column is `deleted_at`); (2) its ban/anonymize logic was tied to the old `"approved"` status, which the new constraint would now reject outright. Rewrote it: banning login access (`public.user.banned` + `user_profiles.status = 'banned'`) now happens on transition **into `grace_period`** (matching the mobile app's own copy — "Upon approval, your login access will be immediately revoked"), and full data anonymization is deferred to the grace-period expiry job (21.4) rather than happening immediately, since `grace_period` is meant to be a reversible window. Updated the status-badge rendering in `deleteAccountColumns.tsx` and `AllRequestsTab.tsx` to match the new 5-value vocabulary (both previously only handled the old 2-3 values and would have shown every real row in the fallback/wrong color).
- [x] **21.3** `[Mobile]` Confirm the in-app delete-account flow writes a `delete_account_requests` row with the correct initial status — **done as part of 21.5**, updated this pass to insert `'pending_review'` (was `'pending'`) to match 21.2's new constraint; see below.
- [x] **21.4** `[Backend]` Grace-period expiry job (cron): auto-transition `grace_period` → `completed` after the configured window, executing the actual deletion/anonymization. **Done** — `expire_delete_account_grace_periods()` (same migration) finds requests where `grace_period_started_at` is more than 30 days old, anonymizes the app's own `user_profiles` fields (name/phone/avatar/dob/sex/notes/push-token, `deleted_at = now()`), and flips the request to `completed`. Scheduled daily via `supabase/migrations/20260812_schedule_delete_account_grace_expiry.sql` — no Edge Function or service-role key needed, pg_cron calls the SQL function directly.
  **⚠️ Scope boundary, read before relying on this**: this only anonymizes `user_profiles` — it deliberately does **not** touch `auth.users` or `public.user.email`. Scrubbing the actual login email is a separate, higher-stakes policy decision (affects whether the same email can ever re-register) that shouldn't be decided unilaterally in a migration; flagged in the migration's own comments as real follow-up work if full "right to be forgotten" email erasure is a genuine compliance requirement.
- [x] **21.5** `[Mobile]` Replace the current Delete Account web redirect with an authenticated mobile request that creates a `delete_account_requests` row.
  **Done, plus a real security bug fixed along the way:** `app/(app)/(auth)/(tabs)/My Account/DeleteAccount.tsx` no longer opens `office.4ourlife.com/delete-account` — it now `POST`s to `/api/user/delete-account-request` with the user's Supabase session token, then signs out. That route (`app/api/user/delete-account-request/route.js`) previously had **zero authentication** — it trusted a client-supplied `userId`/`email` in the request body with no verification at all, meaning anyone could POST an arbitrary `userId` and create a fake deletion request against someone else's account. Confirmed it had zero live callers anywhere (admin or mobile) before this fix, so nothing depended on the old insecure contract. Rewrote it to validate the caller via Supabase Auth JWT (matching the pattern already established by `/api/user/push-token` and `/api/chat/messages`), derive `user_id`/`email` server-side instead of trusting the body, use the service-role client, and no-op (rather than duplicate) if the user already has an in-flight request in any non-terminal status. Status now defaults to `'pending_review'` per 21.2's constraint.

---

## Epic 22 — Internal Admin Task Manager *(was: Epic 13)*
**⚠️ See Assumption #3.**
- [x] **22.1** `[Backend]` Create `admin_tasks` table (title, description, status, assignee, priority, due_date, created_by, board/column position).
  **Done:** `supabase/migrations/20260813_epic22_admin_task_manager.sql`
  (applied live) — table + `get_admin_task_stats()` + `update_admin_task_status()`
  RPCs, RLS scoped to admin roles. Smoke-tested live (insert → move →
  verified `activity_logs` entry → cleanup).
- [x] **22.2** `[Admin]` Wire `tasks/_components/TaskStats.tsx` to real counts (New/In Progress/Under Review/Completed) instead of hardcoded 4/6/3/12. **Done.**
- [x] **22.3** `[Admin]` Wire `tasks/_components/KanbanBoard.tsx` drag-and-drop to persist column/status changes to `admin_tasks`.
  **Done** — real tasks fetched from `admin_tasks`, native HTML5
  drag-and-drop (no new dependency; `react-beautiful-dnd` was already an
  installed but zero-usage dependency and is unmaintained/has known React
  18 issues, so left unused rather than adopted here) persists moves via
  `update_admin_task_status`, with optimistic UI update + rollback on
  failure. Added a working "+ New Task" create flow per column
  (title/description/priority/category/assignee/due date) — the
  page-level "+ New Task" / column "+" buttons were previously
  non-functional.
- [x] **22.4** `[Admin]` Task assignment + activity log entry on create/update/complete (feeds `activity_logs`).
  **Done** — task creation and every status move call `log_admin_activity`/
  `update_admin_task_status` respectively, landing in the same
  `activity_logs` table Epic 11.6 wired the Admins page's Activity Logs
  tab to, so task moves now show up there too.

**Found while verifying the applied migrations (not scoped to this epic, but corrected since it directly affects code this pass touched):**
`moderate_content()` (Epic 29) has always assigned bare text `'dismissed'`/
`'actioned'` to `content_moderation_flags.status`, but that column is a
`moderation_status` enum whose real labels are
`pending_review/approved/rejected/flagged/escalated/auto_moderated` —
neither literal was ever valid, so every dismiss/warn/remove/ban action
had been silently failing for every content type since Epic 29 shipped,
not just the new `'profile'` branch added in Epic 12. Also found:
`content_moderation_flags` and `admin_sessions` each had an
`updated_at`-touching trigger with no `updated_at` column, meaning UPDATE
had been silently failing on both (this also explains why the enum bug
went unnoticed sooner). All three fixed live and reconciled into
`supabase/migrations/20260813_reconcile_live_db_fixes.sql`; also fixed an
orphaned pre-Epic-29 3-argument `moderate_content` overload left live
alongside the corrected one. Fixed `ai/page.tsx`'s Moderation tab, which
rendered a resolved flag's label as `item.status === "dismissed" ?
"Dismissed" : "Actioned"` — always wrong now that real statuses are
`approved`/`rejected` — to read `action_taken` instead.

**Bigger, explicitly out-of-scope finding, flagged for a future dedicated pass:**
the same trigger-without-column defect exists on 9 more `public` tables —
`admin_activity_logs` (harmless, zero writers anywhere per Epic 11.6),
`bed_tracker_facilities`, `bed_tracker_alerts`, `collector_submissions`,
`notification_automation_rules`, `platform_metrics_snapshots`,
`facility_scout_referrals`, `transaction_records`, `job_applications` —
all owned by deferred new-feature epics (23, 24, 27, 30, 15, 26). UPDATE
has likely always silently failed on all of them; worth fixing before any
of those epics starts writing to them, not fixed here since it's outside
Epic 12/22's scope.

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

- [x] **23.1** `[Backend]` Define facility-side update contract: how does a facility report bed availability (API endpoint, or a facility-portal mobile/web screen)? **Admin-side contract implemented 2026-08-21** — `POST /api/bedtracker/facilities` (register facility + wards), `PATCH /api/bedtracker/facilities/[id]`, `PATCH /api/bedtracker/wards/[id]` (bed counts, raises alert on critical drop) behind `requireAdminApiUser("bedtracker.*")`, schema in `supabase/migrations/20260821_bedtracker_extension.sql`. Facility-staff-facing portal/mobile entry point remains open (see 23.5).
- [x] **23.2** `[Backend]` `get_bedtracker_analytics(time_filter)` RPC: occupancy rate, alerts, ambulance dispatch status, coverage — from `bed_tracker_facilities`, `bed_tracker_alerts`, `ambulance_dispatches`. **Implemented 2026-08-21** — extension migration adds the module RPCs (incl. `get_bedtracker_route_suggestions` haversine routing); `GET /api/bedtracker` aggregates occupancy/alerts/fleet/dispatch metrics in one overview payload consumed by the analytics tab.
- [x] **23.3** `[Backend]` Alert-threshold automation (e.g. auto-flag when a facility's available beds drop below N). **Implemented 2026-08-21** — ward bed-count updates auto-raise `bed_tracker_alerts` when availability goes critical (`alertRaised` surfaced in the PATCH response); Live Overview tab lists alerts with Resolve action.
- [x] **23.4** `[Admin]` Wire `bedtracker/page.tsx`'s tabs (currently all `TabPlaceholder`) to live data + real-time updates (Supabase Realtime channel). **Implemented 2026-08-21** — dedicated page shell with 6 working tabs (Live Overview, Bed Registry, Facilities, Ambulance Dispatch, Analytics, Design Strategy) fed by `useBedTrackerOverview` + `useRouteSuggestions`, register-facility and emergency-dispatch dialogs. Supabase Realtime channel not wired (polling via TanStack Query invalidation instead) — flagged as remaining.
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

- [x] **24.1** `[Backend]` Submission review workflow (collector submits → admin approves/rejects → status change). **Implemented 2026-08-21** — `app/api/facilityscout/**`: assign (single + bulk, SLA priorities), reject (bulk-capable, duplicate flag), register; submitter names masked for non-super_admins; audited via `log_admin_activity`.
- [x] **24.2** `[Backend]` Reward ledger/payment-status tracking for collectors (`collector_submissions` → payout via Epic 15's payment rails once monetary). **Implemented 2026-08-21** — rewards queue with data-bundle tiers (MB) and disbursement endpoint recording paid status; actual MNO payout integration deferred (disbursement marks sent only).
- [x] **24.3** `[Backend]` `get_facilityscout_analytics(time_filter)` RPC: collector activity, submissions by status, rewards owed/paid, approval rate, leaderboard. **Implemented 2026-08-21** — `get_facility_scout_leaderboard` RPC + overview aggregation (submissions/duplicates/facilities added/data rewarded) in `supabase/migrations/20260821_facilityscout_extension.sql`.
- [x] **24.4** `[Admin]` Wire `facilityscout/page.tsx`'s tabs (currently all `TabPlaceholder`) to live data. **Implemented 2026-08-21** — 5 working tabs (All Submissions, Pending Review with bulk assign/reject, Rewards Queue, Leaderboard, Settings tier/rules editor) fed by `useFacilityScoutOverview`; `_deprecated/` sub-pages deleted.
- [ ] **24.5** `[Mobile]` Collector-facing submission flow (if collectors use the mobile app) — capture facility details/photos, submit for review.
- [x] **24.6** `[Backend]` Basic anti-fraud scoring before rewards become real money (duplicate-submission detection at minimum). **Implemented 2026-08-21** — submissions carry `match_status` (new/duplicate) computed against existing facilities; admins can flag duplicates on reject (optionally linking the matched facility). Deeper scoring remains open.

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

- [x] **27.1** `[Backend]` `get_notification_analytics(time_filter)` RPC: campaigns sent, delivery/read/failure counts, template usage, automation-rule executions, broadcast performance.
  **Done** — applied live via `20260813143810_epic27_notifications_campaigns`
  (built and applied directly against the live project through the Supabase
  MCP connector, not from a checked-in migration file authored in this
  pass — reconciled into `supabase/migrations/` after the fact so the
  directory matches live state). Real correctness bug found and fixed
  while wiring `app/api/notifications/route.ts` to it: the route was
  deriving KPI counts (`campaigns`, `activeTemplates`, etc.) from the same
  75-row-capped array used to populate the tables below it — the exact
  undercounting bug already fixed once in Epic 29's `get_ai_analytics`.
- [x] **27.2** `[Backend]` Push-provider delivery callbacks (or scheduled reconciliation against FCM) to populate delivery/read/failure counts — currently no feedback loop exists.
  **Real correction to this story's own framing:** the live push pipeline
  is Expo, not Firebase — `dispatch_notification()` (built earlier this
  session for chat/reminders) posts to `https://exp.host/--/api/v2/push/send`
  via `pg_net`; the leaked Firebase key (Part I 8.9) was tied to the
  already-dead `route.txt`, a separate code path. **Done:**
  `dispatch_notification` now tags sends with `campaign_id`, captures
  per-recipient Expo tickets into a new `notification_delivery_receipts`
  table, and a `reconcile_notification_receipts()` cron job (every 10 min)
  polls Expo's `getReceipts` endpoint and updates receipt status —
  including nulling out dead `expo_push_token`s on `DeviceNotRegistered`.
  **Verified a real pg_net landmine while checking this**: this project's
  `net.http_collect_response()` (the public, documented wrapper) is
  broken — its body does a bare `SELECT net._http_collect_response(...)`
  with no `INTO`/`PERFORM`, which raises `42601: query has no destination
  for result data` on every call. `reconcile_notification_receipts` and
  `dispatch_notification` both correctly call the internal
  `net._http_collect_response()` directly instead, confirmed working.
- [x] **27.3** `[Admin]` Upgrade `notifications/page.tsx` beyond the Part I 8.5 safe admin surface: campaign builder with target segment, template selection, scheduling, preview, approval state, and delivery orchestration wired to `notification_campaigns`/`notification_templates`.
  **Done** — segment builder (all-users vs. targeted by user_type/role/sex/status)
  with a live reach preview (`get_notification_segment_count`, debounced),
  template picker, scheduling, and the full approval workflow
  (draft → pending_approval → approved/rejected, `send_notification_campaign`)
  wired via new `app/api/notifications/campaigns/[id]` route. Campaign rows
  now link to the rebuilt `view-notification` detail page (27.5) where the
  workflow actions live, rather than crowding the list view.
- [x] **27.4** `[Admin]` Automation rules UI (`notification_automation_rules`) — trigger conditions + actions.
  **Scoped honestly:** built create/toggle UI for rule *definitions*
  (trigger event, source module, channel, target audience, template) via
  new `app/api/notifications/rules` routes — but no event-driven engine
  exists anywhere to actually evaluate `trigger_event` against real app
  events and fire a rule automatically; `fire_count`/`last_fired_at` will
  stay at 0 until that's built. Building a real trigger-evaluation engine
  is new-feature-scale work, not wiring — the UI says this explicitly
  rather than implying rules are live.
- [x] **27.5** `[Admin]` `view-notification/page` — single notification detail/delivery-status view.
  **Rebuilt from scratch** — the existing page was fully dead: zero
  internal links to it anywhere in the app, queried a `notification_list`
  table that doesn't exist, with columns (`region`, `age_range`) that
  don't exist on any real table either. New version shows a campaign's
  full detail — approval state, segment reach, send/receipt status
  breakdown from `notification_delivery_receipts` — plus the approval
  workflow action buttons.

**🔴 Critical security gap found and fixed while verifying the applied
migration, unrelated to any of the 5 stories above but too severe to
leave unmentioned:** none of the new Epic 27 `SECURITY DEFINER` functions
(`dispatch_notification`, `send_notification_campaign`,
`send_due_notification_campaigns`, `reconcile_notification_receipts`,
`resolve_notification_segment`, `get_notification_segment_count`,
`get_notification_analytics`) had their default `PUBLIC`/`anon` execute
grant revoked — every established RPC pattern this session (and
apparently missed only here) always does this. Concretely, this meant an
**unauthenticated** request to `/rest/v1/rpc/send_notification_campaign`
could force-send any campaign, or `/rest/v1/rpc/dispatch_notification`
directly could push arbitrary notification content to arbitrary users,
with zero auth. Fixed live immediately
(`lock_down_epic27_notification_function_grants`): the four action/write
RPCs are now `service_role`-only (never callable by any client JWT, only
from admin API routes and cron); the three read/preview RPCs are
`authenticated, service_role`, matching this session's existing
convention for analytics-style reads.

**Flagged, not fixed — a broader, separate scope decision:** that
convention itself (`GRANT ... TO authenticated, service_role` on RPCs
with no internal role check) is also what several of *this session's own*
earlier migrations use for write/action RPCs (`moderate_content`,
`update_admin_task_status`, `create_profile_flag`, `start_admin_session`,
`log_admin_activity`) — meaning any authenticated *non-admin* mobile app
user could technically call these directly today. Lower severity than the
anon case just fixed (requires a real account, not zero-auth), but a real
finding worth a dedicated pass — this is exactly Epic 30.2's scope
("RLS/service-role audit... especially anything touching money or PII"),
not something to silently rewrite mid-Epic-27.
- [x] **27.6** `[Mobile]` Confirm push-token registration (`expo_push_token`/`fcm_token` on `user_profiles`) is reliably captured and refreshed on login/reinstall — **already done**, confirmed directly: `context/NotificationContext.tsx` registers for push on mount and re-saves the token whenever it or the session changes.
- [x] **27.7** `[Mobile]` Persist the Expo push token after login/reinstall — **already done, this story's premise was stale.** `context/NotificationContext.tsx` PATCHes `/api/user/push-token` (which writes `user_profiles.expo_push_token`) whenever `expoPushToken`/`session.access_token` change — this audit finding predates that flow existing (or predates it being noticed). The duplicate `src/lib/registerForPushNotificationAsync.ts` this story flagged as a second token source was confirmed to have zero importers and was deleted in the mobile notification-system consolidation work.
- [x] **27.8** `[Mobile]` Reconcile notification read-state columns (`is_seen` vs `is_read`/`read_at`) — **moot.** The only code touching `is_seen` is `src/services/notificationService.ts`'s `handleNotificationSeen`, whose only caller (`src/screens/Notifications-1.tsx`) has zero importers anywhere in the app — confirmed fully dead/unreachable legacy code, not the live notification center (`app/(app)/(auth)/(modal)/Notifications.tsx`, which already correctly uses `is_read`/`read_at` via the admin API).
- [x] **27.9** `[Mobile]`/`[Backend]` *(new, not originally in this epic)* Per-user notification preferences — the product owner asked for a unified page to toggle workout/medication/chat push notifications plus a master switch, since users previously had no way to revoke consent given during fitness onboarding. Added `push_notifications_enabled`/`push_workouts_enabled`/`push_medication_enabled`/`push_chats_enabled` on `user_profiles` (`supabase/migrations/20260812020000_notification_preferences.sql`), enforced them in both due-reminder RPCs (`supabase/migrations/20260812030000_filter_reminders_by_preference.sql`) and in the chat-message notify path (`app/api/chat/messages/route.ts`), and built `My Account > Notification Preferences` on mobile (reuses the existing generic `/api/user/profile` PATCH route — no new endpoint needed). The fitness-onboarding permissions step was also rewritten to request the real OS notification permission and seed these columns from the actual result, instead of a 4-item checklist (health/notifications/location/camera) that never called any permission API and was never persisted.

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

- [x] **28.1** `[Backend]` Server-side admin session telemetry writing to `admin_sessions`/`admin_activity_logs` (shared foundation with Epic 11.3). **Already done in Epic 11.3** — `admin_sessions` telemetry + `log_admin_activity()` writing to `activity_logs` (not `admin_activity_logs`, which is dead/superseded — see Epic 11.6's note).
- [x] **28.2** `[Backend]` Threat-event ingestion into `security_threats` (failed-login spikes, suspicious IP, permission-escalation attempts).
  **Scoped honestly:** `supabase/migrations/20260813_epic28_security_compliance.sql`
  adds a shared `report_security_threat()` ingestion primitive plus one
  real, verifiable detector — `detect_admin_multi_ip_sessions()` (cron,
  every 15 min), flagging an admin authenticating from 3+ distinct IPs
  within an hour, computed from real `admin_sessions` rows. "Failed-login
  spikes" was **not** built: admin login calls
  `supabase.auth.signInWithPassword()` directly from the browser, so
  nothing server-side has ever recorded a failed attempt
  (`user_profiles.login_attempts`/`locked_until` exist but are never
  incremented — confirmed in Epic 11's audit); `auth.audit_log_entries`
  exists but is completely empty in this project, so its payload shape
  for a failed login couldn't be verified against real data. Building this
  properly needs login moved to a server route that can track attempts —
  flagged as real follow-up, not guessed at.
  **Also found and fixed while building this:** `/api/security/threats`
  POST handler wrote `status = 'false_positive'` — not a valid
  `threat_status` enum label (real values:
  `open/mitigated/monitoring/review/resolved/auto_resolved`) — every
  "Mark false positive" click on `/security` had always thrown an invalid
  enum error. Same for the frontend's assumed `'investigating'` status.
  Both fixed.
- [x] **28.3** `[Backend]` Define a transparent security-score algorithm (documented inputs/weights) or remove the "Security Score" metric entirely — never ship an opaque fabricated score. **Already done** — the one fabricated score (admins' `SecurityCenterTab.tsx`, "82/100") was removed in Epic 11; `SystemHealth.tsx`'s "Security Score" row already correctly reads "Awaiting instrumentation".
- [x] **28.4** `[Admin]` `security/page.tsx` + `security-center/page.tsx`: consolidate into one live module (currently two separate placeholder routes — decide whether both are needed or merge them; see cross-reference above). **Already done** — `security/page.tsx` is a real, live 3-tab module (Threats/Audit Logs/Settings) reading `security_threats`/`activity_logs`, and `security-center/page.tsx` is already a redirect to `/security`, not a second placeholder.
- [x] **28.5** `[Backend]` Create `compliance_settings` table (VAT rate, GRA ID, filing due dates) — required before `ComplianceGRA.tsx` can show anything real; remove the hardcoded GRA ID/VAT filing/scan date/encryption claims until then.
  **Done** — table + RLS (registrar read-only, admin/super_admin write,
  matching the real permission model documented in Epic 11.7) +
  `app/api/compliance/settings` GET/PATCH, wired into `ComplianceGRA.tsx`
  with a real "Configure" dialog. It already showed honest "awaiting"
  states before this (no fabrication to remove) — now shows real
  configured values once an admin sets them.
- [x] **28.6** `[Backend]` (Optional, only if a reliable monitoring source is wired) `system_health_snapshots` table feeding `SystemHealth.tsx` — otherwise remove API/DB latency and uptime claims rather than fabricate them. **Not built (optional, no monitoring source exists)** — `SystemHealth.tsx` already avoided fabricating uptime/latency; fixed one stale claim while here ("Firebase FCM: Not wired here" → correctly references Expo push, per Epic 27.2's finding that Firebase was never the live pipeline).

> **2026-08-21 security follow-ups landed:** (a) response security headers
> in `next.config.ts` (X-Frame-Options, X-Content-Type-Options,
> Referrer-Policy, X-XSS-Protection, Permissions-Policy; CSP intentionally
> omitted — Next.js inline scripts + Supabase assets would break); (b)
> progressive login lockout — `lib/auth-guard.ts`, 5 failures → 30s lock,
> doubling to 10-min cap, wired into `LoginForm`; (c) bot honeypots on
> `LoginForm`/`RegisterForm` (filled trap aborts before any auth call);
> (d) dependency scanning — `npm run security:audit`,
> `.github/workflows/dependency-audit.yml` + Dependabot config. Server-side
> failed-login telemetry (28.2's note) is still open: login remains a direct
> browser call to Supabase Auth.

---

## Epic 29 — AI Hub / AI Observability & Content Moderation *(was: Epic 20)*

> **Cross-reference:** Part I Epic 8.1 confirmed `app/(dashboard)/ai/
> page.tsx` is currently a 4-line placeholder, and found a real 78-line
> `build-ready` implementation backed by 4 routes (`ai/{analytics,
> metrics,moderation-queue,recommendations}`) that may be a useful
> reference once restyled + auth-fixed (Part I Epic 0.2 pattern) — see
> 8.1 for details before starting 29.3.

- [x] **29.1** `[Backend]` Standardize AI-call logging to `fitness_ai_calls` — **done as part of the AI provider swap** (`lib/fitness/generate-plan.ts` logs model/tokens/latency/cost/status/user on every call, success or failure). The `ai_usage_logs` cross-module table is **deliberately not built** — confirmed `generate-plan.ts` is still the only AI call site in either repo (no chat assistant or other AI feature exists yet), so a second logging table with nothing to log into it would be speculative. Revisit when a second AI feature actually ships.
- [x] **29.2** `[Backend]` `get_ai_analytics(time_filter)` RPC. **Done** — `supabase/migrations/20260812_epic29_ai_analytics_and_moderation.sql`. Also fixes a real correctness bug found while building it: `/api/ai/metrics` and `/api/ai/analytics` each independently fetched a raw `.limit(1000)` rows from `fitness_ai_calls`/`content_moderation_flags` and aggregated in JS — once call volume in a given window passed 1000, totals/averages/success-rate would silently undercount rather than reflect the full window. The new RPC aggregates in SQL over the entire matching window with no cap, and both routes now call it instead of duplicating the aggregation logic.
- [x] **29.3** `[Admin]` Wire `ai/page.tsx` + `AIHubOverview.tsx` — **`ai/page.tsx` was not actually the placeholder this story's cross-reference describes** (that describes a different, older state — the real page is a fully-built 492-line dashboard already reading live data via 4 API routes, with no fabricated accuracy/anomaly numbers anywhere). `AIHubOverview.tsx` was already wired to `get_platform_overview_metrics`'s real `ai` block. Both now sit on top of 29.2's RPC instead of the capped raw-row aggregation. (Note: `app/(dashboard)/ai-hub/*` — five separate routes, unlinked from nav — really are placeholder scaffolds; don't confuse them with the real `/ai` page.)
- [x] **29.4** `[Backend]` Create `content_moderation_flags` table — **table already existed**, and is **partially already hooked into a real content surface**: `app/api/chat/moderation/route.ts` lets a user report a `message`/`conversation`, writes a real flag row, and a DB trigger (`20260710_message_moderation_sync.sql`) denormalizes `is_flagged` back onto the source row. **Gap found, not fixed this pass**: the mobile app has zero callers of that endpoint (no "report message" button exists anywhere in the UI), and reviews/facility submissions have no reporting endpoint at all — building those is real, UI-design-heavy feature work (who can report what, with which reasons) rather than a backend wiring task, out of scope for this pass. Flagging as the concrete remaining work rather than closing this story as fully done.
- [x] **29.5** `[Admin]` Moderation queue UI: review flagged content, approve/remove, log the admin action. **Done** — `ai/page.tsx`'s Moderation tab was previously read-only display despite a working backend (`POST /api/ai/moderation-queue` → `moderate_content` RPC already existed); added Dismiss/Warn/Remove/Ban action buttons wired to it, with a real bug fixed in the process: `moderate_content()` recorded `reviewed_by = COALESCE(auth.uid(), reviewed_by)`, but its only caller uses a service-role client with no JWT/auth context — `auth.uid()` always evaluated to `NULL`, so every moderation action would have silently recorded no reviewer at all. Not previously visible since nothing called this RPC from any UI button until now. Fixed by having the route pass the acting admin's id explicitly (`p_admin_id`) instead of relying on session-derived `auth.uid()`. The "ban" action currently only updates the flag's own status — it does not yet ban the flagged content's author (that needs the author's `user_id` resolved per `content_type` first); flagged in the migration's comments as real follow-up, not guessed at.

---

## Epic 30 — Cross-Cutting Engineering *(was: Epic 21)*
> **Cross-reference:** overlaps significantly with Part I Epics 5-7
> (dead-code cleanup, testing/CI, build hygiene). 30.5's RLS audit in
> particular is largely already covered by Part I Epic 1.1/1.2 (RLS
> enabled on `user_profiles` + the other 48 previously-unprotected
> tables) — treat 30.2 as "keep this discipline going for every *new*
> table," not a fresh audit of what Part I already covered.

- [x] **30.1** `[Backend]` Create `analytics_events` generic event-capture table (feature usage, views, searches, clicks, exports, broadcasts, admin actions not already logged) — shared infrastructure several epics above depend on (18.6, 19.2, 20.2). **Already done** — created in Epic 10.10 (`20260811_mobile_parity_events_reviews.sql`); confirmed still live.
- [x] **30.2** `[Backend]` RLS/service-role audit: every new table/RPC added by this backlog gets an explicit RLS policy review before shipping (per `RLS.md`), especially anything touching money (Epic 15) or PII.
  **This became the single most important finding of the entire multi-epic
  pass — not a routine check.** A full sweep of every `SECURITY DEFINER`
  function in the public schema (not just ones added this session) found
  the vast majority had never had their default `PUBLIC`/`anon` EXECUTE
  grant revoked, and several had **zero internal authorization check at
  all** beyond a caller-supplied `p_admin_id` that was only ever used to
  stamp an audit-log session variable. Concretely, before this fix, any
  authenticated (and in most cases fully unauthenticated) request could:
  delete any facility outright (`admin_delete_facility`); overwrite any
  user's medication reminder with arbitrary drug/dosage data
  (`admin_upsert_medication_reminder` — the most severe single finding,
  since it's health data); hijack any chat conversation as "group leader"
  and overwrite the target user's global `user_profiles.role`
  (`fn_make_group_leader`); self-promote to conversation admin in any chat
  (`fn_assign_admin_with_rules`); mint/drain arbitrary FitCoin balances or
  redeem rewards against another user's balance; and change any facility's
  approval status or manipulate reviews/ratings.
  **Fixed in `supabase/migrations/20260813_epic30_rpc_authorization_audit.sql`**,
  applied live and verified (a test call from a non-admin authenticated
  role now correctly raises `Not authorized`). Every affected function was
  checked against its real call sites in both repos first (not guessed) to
  decide the correct fix: functions called only via service-role Next.js
  server actions were locked to `service_role`-only; functions with real
  client-side callers (e.g. the admin panel's "Make Group Leader" dialog,
  the mobile app's own medication-reminder screen) kept `authenticated`
  access but gained a real `is_app_admin()` / `auth.uid() = <owner>` check.
  A blanket sweep also revoked `anon` from every other `SECURITY DEFINER`
  function except the 3 confirmed RLS-policy-embedded helpers
  (`is_admin`/`is_app_admin`/`get_user_app_role` — verified via
  `pg_policies` that no other function name is referenced in any policy's
  `USING`/`WITH CHECK`, so nothing else can legitimately need it), and
  locked down trigger functions and 3 confirmed-orphaned helper functions
  to `service_role`.
  **Flagged, not fixed:** the remaining read-only admin-analytics RPCs
  (`get_admin_dashboard_metrics`, `get_platform_overview_metrics`, etc.)
  are still callable by any `authenticated` user, not just admins — lower
  severity (aggregate business metrics, not PII/action) but still real
  information disclosure to any logged-in mobile customer; a follow-up
  pass should add the same `is_app_admin()` check to these.
- [ ] **30.3** `[Admin]`/`[Backend]` Materialized daily snapshots for the more expensive aggregate RPCs (transaction analytics, AI analytics) so dashboard load doesn't run heavy queries on every page view. **Deliberately not built** — every table these RPCs aggregate over is still near-empty (pre-launch data volumes); materializing snapshots now would be premature optimization with nothing real to cache. Revisit once real traffic/data volume justifies it.
- [x] **30.4** `[Admin]` Export endpoints (CSV/PDF) for modules where admins will need to hand data to non-technical stakeholders (transactions, VAT report, user list).
  **Partial, scoped to what has real data:** built `app/api/admin/users/export`
  (CSV) and wired the Users page's previously non-functional "Export User
  Data" button to it. Transactions and VAT report exports not built —
  both source from `transaction_records`/Epic 15's payment rails, which
  don't exist yet (Epic 15 is deferred, new-feature scope) — exporting an
  always-empty CSV isn't a real deliverable.
- [ ] **30.5** `[Both]` Update `Refactor_Docs.md`'s hook-migration table as new `useX` hooks are added, so the service→hook migration record stays current. **Not done this pass** — this session added many new `useX` hooks (`useAdminDashboard`, `useAdminTasks`, etc.); updating the tracking doc is real bookkeeping debt, deferred in favor of the security-audit work this pass prioritized.
- [x] **30.6** `[Admin]` Security patch pass on `react-calendar` and any other dependency flagged with known CVEs in `ToChange.md` — schedule as its own PR since it may introduce breaking changes to calendar-dependent screens (Period Tracker, BedTracker scheduling).
  **`react-calendar` itself was already clean** (4.8.0 resolved, no
  advisory hit) — this story's own named concern was stale. Ran a full
  `pnpm audit`: found **3 critical + 63 high** severity vulnerabilities
  platform-wide, well beyond just `react-calendar`. Fixed:
  - Updated `next` (16.1.7→16.3.0), `better-auth` (1.5.5→1.6.27), `axios`
    (1.13.6→1.19.0) within their existing semver ranges — patches, no
    breaking API changes expected or observed.
  - **Removed `firebase-admin` entirely** — confirmed zero imports
    anywhere in the codebase (the Firebase push pipeline has been fully
    dead since before this session; real delivery is Expo via
    `dispatch_notification`, per Epic 27.2). This single dead dependency
    was the transitive source of both remaining CRITICAL vulnerabilities
    (`protobufjs` arbitrary code execution, `websocket-driver` message
    corruption) plus several HIGHs (`@grpc/grpc-js`, `node-forge`,
    `fast-xml-builder`) — removed 111 packages.
  - **Removed `nodemailer`** — confirmed its only import site
    (`app/api/support/route.js`) was commented out; fully dead, was a
    direct HIGH-severity finding.
  - Net result: **0 critical, 15 high** (down from 3 critical / 63 high),
    verified via `npx tsc --noEmit` and `npm run build` passing clean
    after every change.
  - Remaining high-severity items are all either transitive through
    `@supabase/realtime-js` (`ws` — can't fix without an upstream Supabase
    release) or devDependencies only (`postcss`/`nanoid` via Tailwind/
    Sass, `brace-expansion`/`picomatch` via ESLint) — build-time only, not
    shipped to production runtime, lower real-world risk. `lodash`/
    `lodash-es`/`defu` remain on their latest currently-published versions
    with no newer patched release available yet upstream.
- [ ] **30.7** `[Admin]`/`[Mobile]` Keep a source-of-truth table map for every metric-producing mobile flow: mobile file(s), Supabase table(s), admin surface, and owning epic. Seed it from `docs/METRIC_REGISTRY.md` and this audit so future admin metric work always checks the mobile producer before marking a story complete. **Not done this pass** — `docs/METRIC_REGISTRY.md` (Epic 10.1) still exists as the seed; extending it into the fuller cross-repo table map described here is deferred, same reasoning as 30.5.

---

## Epic 31 — RBAC & Role Vocabulary (implemented 2026-08-17)

> Implemented per the RBAC design proposal: one primary platform role per
> admin on `user_profiles.role`, a `resource.action` permission catalog,
> role defaults + per-user overrides (revokes win), super_admin bypass,
> deny-by-default. Financial pipeline work (Epic 15/16 territory) was
> explicitly out of scope for this pass.

- [x] **31.1** `[Backend]` Permission catalog migration:
  `supabase/migrations/20260817_rbac_permission_catalog.sql` —
  `admin_platform_roles` (9 roles), `admin_permissions` (~80 keys),
  `admin_role_permissions` defaults, `admin_user_overrides`
  (grant/revoke), and the enforcement RPCs `is_platform_admin`,
  `has_4ol_permission` (super_admin short-circuit; grants require an
  active platform admin role — closes a privilege-escalation path),
  `get_effective_admin_permissions`. All four tables are
  service-role-only (RLS on, everything revoked from anon/authenticated).
  Application mirror: `lib/permissions.ts` (used as graceful fallback
  when the migration hasn't been applied yet).
- [x] **31.2** `[Backend]` Canonical role vocabulary: `lib/admin-roles.ts`
  (9 roles incl. `registrar`; `group_leader` is chat-scoped only).
  `proxy.ts`, `lib/admin-api-auth.ts` and the security route now import
  from it instead of keeping private copies.
- [x] **31.3** `[Backend]` Server enforcement: `lib/admin-api-auth.ts`
  rewritten around `requireAdminApiUser(permission?)` +
  `adminAuthErrorResponse` (401/403 with denial audit logging to
  `activity_logs`). All 17 admin/notification API routes retrofitted
  with fine-grained permission keys; new management endpoints
  `app/api/admin/me`, `app/api/admin/rbac` (GET/PUT),
  `app/api/admin/rbac/overrides` (POST/DELETE).
- [x] **31.4** `[Admin]` UI enforcement: `PermissionsProvider` resolves
  effective permissions server-side; `NewAdminDashboardShell` filters
  navigation by permission; `/admins?tab=roles` hosts a live Roles &
  Permissions matrix editor (`RolesPermissionsTab`) wired to the RBAC
  endpoints, read-only without `roles.edit`.
- [x] **31.5** `[Backend]` Role vocabulary leak fixes:
  `supabase/migrations/20260817_role_vocabulary_fix.sql` —
  `handle_new_user()` now ALWAYS creates `role = 'user'` (previously
  accepted `admin`/`super_admin` straight from signup metadata =
  privilege escalation); `fn_make_group_leader()` no longer stamps the
  global `user_profiles.role` (chat-scoped role stays in
  `conversation_members`). Supersedes
  `supabase/migrations/fix_handle_new_user_trigger.sql`'s allowlist
  approach.
- [x] **31.6** `[Backend]` Epic 27 migration reconciliation:
  `supabase/migrations/20260813000000_epic27_notifications_campaigns.sql`
  was a 44-byte placeholder ("will overwrite via copy step"); it is now
  the full reconciled schema (tables + 7 RPCs + grant lockdown) matching
  what was applied live on 2026-08-13.
- [x] **31.7** `[Both]` Tests for the RBAC core: `lib/admin-roles.test.ts`,
  `lib/permissions.test.ts` (see Epic 6.1) + GitHub Actions CI
  (see Epic 6.2).
- [x] **31.8** `[Ops]` Applied `20260817_rbac_permission_catalog.sql` and
  `20260817_role_vocabulary_fix.sql` to the live Supabase project
  (`rhbbxttxnvcziyqzptqs`, 2026-08-19) — this closed a live privilege-
  escalation hole: `handle_new_user()` had still been accepting `role`
  straight from signup metadata since the migration had never been run.
  Applying it surfaced two more gaps, fixed and applied alongside it:
  `is_platform_admin`/`has_4ol_permission`/`get_effective_admin_permissions`
  were callable by the unauthenticated `anon` role (this project grants
  `anon` direct EXECUTE on new functions, so `revoke ... from public`
  alone didn't cover it — see `20260819_rbac_revoke_anon_execute.sql`),
  and a ported `is_app_admin()` had a `uuid = text` cast bug caught by
  Postgres at `CREATE FUNCTION` time before it could apply (see
  `20260819_backfill_untracked_top_rated_objects.sql`). Legacy
  `user_profiles.role = 'group_leader'` rows were not present to review.

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

---

# Symptoms + Healthy Living Analytics & Carousels Build (implemented 2026-08-22)

> Extends Part I (Diseases & Conditions) parity to Symptoms and Healthy
> Living: analytics tabs, a Symptoms Categories tab, bidirectional
> cross-links, and home-carousel feature management. Branch
> `feat/gap-analysis-parts-lmn-security`. Mobile counterparts (status
> filter fix + home carousel consumer) land on
> `feat/fitness-mockup-parity` in the mobile repo.

- [x] Migration `20260822_content_analytics_carousel_extension.sql`
      — persists live-only drift (`symptom_views`, `healthy_living_views`,
      both increment RPCs, `get_healthy_living_kpi_stats`,
      `symptoms.severity`), adds `'healthy_living'` to `category_type`,
      featured-slot columns on `symptoms` + `healthy_living_info`,
      `healthy_living_categories` junction w/ RLS, analytics RPCs
      `get_symptom_analytics()` + `get_healthy_living_analytics()`,
      `get_home_carousel()`, and RBAC seeds for `symptoms.feature` /
      `healthyliving.feature` (admin + content_manager).
- [x] RBAC-guarded routes: `/api/symptoms/analytics`,
      `/api/healthy-living/analytics`, `/api/symptoms/[id]/feature`,
      `/api/healthy-living/[id]/feature` (cap = 12, 409 when full).
- [x] Analytics tabs replace both Coming Soon placeholders
      (engagement-tab layout clone): 30-day view trend, category/body-part
      bars, top viewed/liked/saved leaderboards, content-health KPIs;
      degrade gracefully (error state) until migration is applied.
- [x] Symptoms Categories tab: coverage KPIs, category table with
      `?category=` highlight, uncategorised queue; `useCategoriesForSymptoms`
      now filters `type = 'symptom'`.
- [x] Bidirectional cross-links via query params: Symptoms ⇄ Anatomy ⇄
      Categories (`?tab=`, `?id=`, `?category=` deep links; `?id=` opens
      the symptom view dialog).
- [x] Carousel tabs on both pages via shared `CarouselManager`
      (`components/redesign/carousel-manager.tsx`) + shared
      `lib/carousel-slots.ts` slot assignment.
- [x] Mobile (branch `feat/fitness-mockup-parity`): symptom lists/search
      now filter `status = 'published'` (category branch via
      `symptoms!inner` join); `use-home-carousel.ts` consumes
      `get_home_carousel()` and `ContentSlideBox` merges featured content
      into the Home carousel after marketing campaigns.
- [ ] Apply migration `20260822_content_analytics_carousel_extension.sql`
      to the live Supabase DB (user-manual, deployment-skip mandate).

## Marketing mockup-parity depth build (Part M addendum, 2026-08-22)

> Closes the remaining depth gap between `admin-panel.html` Marketing pages
> and the admin Marketing tabs, and ships the mobile delivery/telemetry/
> redemption rails. Admin work on `feat/gap-analysis-parts-lmn-security`;
> mobile counterparts on `feat/fitness-mockup-parity`. Everything degrades
> gracefully until the migration is applied.

- [x] Migration `20260822_marketing_unification.sql` — resolves the
      triple-definition collision on `user_subscriptions` (fitness/entitlement
      shape = source of truth), widens + seeds `subscription_tiers`
      (Starter/Pro/Elite), re-points `get_marketing_overview()`, adds
      `analytics_events` + `log_marketing_event` / `get_campaign_event_stats`
      RPCs, `discount_redemptions`, and `push_promotions_enabled` on
      `user_profiles`. Additive + re-runnable.
- [x] Admin Phase 1: plans/subscribers/remind/overview routes rebased on
      tiers; `SubscriptionsTab` (KPIs, plan cards, All/At-Risk/Billing
      sub-tabs, export, remind-all); `DiscountsTab` (KPIs, filters, create/
      edit dialog parity with `m-create-discount`, clone/bulk); campaigns
      telemetry columns (Impressions/Clicks/CTR), date + channel filters,
      CSV export, dialog fields (type/budget/channels/target segment).
- [x] Mobile Phase 2: `in_app_banner` channel filter on the home carousel;
      Promotions opt-in toggle (`push_promotions_enabled`); marketing
      notification routing (reminders/premium → paywall, else inbox).
- [x] Phase 3 telemetry loop: mobile `lib/marketing-telemetry.ts` emits
      clicks (CampaignBox) + impressions (active carousel slide, per-session
      dedupe) via `log_marketing_event`; admin routes merge event stats.
- [x] Phase 4 promo redemption: `POST /api/user/redeem-promo` (JWT identity,
      service-role writes, per-user/eligible-user/eligible-plan validation,
      free_trial/partner only) + paywall plan selection and promo-code field
      in `premium.tsx`.
- [x] Phase 5 deep-link CTAs: `upgrade_now` / `refer_friend` added to
      `MARKETING_CTA_OPTIONS` + `CTA_CONFIG`; mobile `cta-actions.ts` upgrade
      (in-app paywall) and referral (link, else share sheet) handlers.
- [ ] Apply migration `20260822_marketing_unification.sql` to the live
      Supabase DB (user-manual, deployment-skip mandate).

## Transactions menu depth build (Part AA, 2026-08-22)

- [x] Migration `20260822_transactions_ledger.sql`: unified `transactions`
      ledger (payer_class user/business, entity_kind consumer/ibp/facility),
      `refunds`, `service_charge_rates`, `tax_filings` + `finance_config`,
      `operational_expenses`, `finance_visibility_config`,
      `get_transactions_overview()` RPC, SA-only catalog keys
      (`transactions.expenses/rates`), backfill from `user_subscriptions` +
      `escrow_transactions`.
- [x] 10 RBAC-guarded API routes: ledger list with Business-vs-User segment /
      category / status / high-value / date filters, overview with SA metric
      masking, retry/dispute/cancel actions, refund request + approval queue
      (SA-only approve), rates editor (SA-only PUT), tax summary + filings,
      expenses (hard SA), visibility config (SA).
- [x] Hook layer `useTransactions.ts` (typed queries + mutations).
- [x] All 7 tabs re-based onto real data: KPIs/charts from the overview RPC
      with `🔒 Hidden by Super Admin` states; Recent table depth (segmented
      Business/User control, filters, search, pagination, CSV export, row
      actions); Service Charge rates editor; consumer Subscriptions KPIs;
      Failed banner + Retry/Notify; Refunds workflow + New Refund dialog;
      Tax & VAT computed liability + filings + GRA report CSV; Expenses
      SA-only with P&L and the Metric Visibility governance dialog.
- [x] Docs: GAP_ANALYSIS Part AA addendum.
- [ ] Apply migration `20260822_transactions_ledger.sql` to the live
      Supabase DB (user-manual).

## Medication Enquiry depth + mobile rollout design (Part AB, analysis 2026-08-22)

- [x] Admin mockup analysis: 6 tabs (All/Pending/Escrow/Delivery/Pharmacy
      Responses/Disputes), KPIs, business-logic banner, connected-menus bar,
      sidebar children + pending badge (mockup L7012–7210).
- [x] Codebase audit: `/medenquiry` is a 4-tab placeholder shell, no API
      routes/hooks, duplicate `/medication-enquiry` stubs; base tables
      `medication_enquiries` + `escrow_transactions` already exist (Escrow /
      Disputes data coverage is largely wiring).
- [x] Mobile mockup analysis (`medication-enquiry-mockup.html`): Find
      Medication form fields mapped to schema additions (unit, radius,
      search-area mode, notify-on-availability); connectivity via shared
      `${API_URL}/api/...` surface + Supabase Storage + expo-notifications.
- [x] Mobile menu positioning: hidden `(tabs)/FindMedication` group
      (fitness pattern) + Home quick-action tile + Reminders refill CTA +
      IBP enquiry inbox; flagged mockup's IBP bottom-nav discrepancy.
- [x] Docs: GAP_ANALYSIS Part AB section (decisions M-D1–M-D9).
- [x] Confirm decisions M-D1–M-D9 (user, 2026-08-22 — "proceed with
      recommendations and implement all"; IBP bottom-nav in the mobile
      mockup confirmed as a mockup mistake).
- [x] Admin build: migration `20260822_med_enquiry_depth.sql`
      (`enquiry_responses`, column adds, status extension, overview RPC,
      `medenquiry.view/manage` catalog keys).
- [x] Admin build: `/api/medenquiry*` routes + `useMedEnquiry.ts` + 6-tab
      page depth + sidebar children + duplicate-route cleanup (redirects).
- [ ] Apply `20260822_med_enquiry_depth.sql` to the live Supabase DB
      (user-manual; UI degrades gracefully until applied).
- [ ] Mobile rollout (future update, `feat/fitness-mockup-parity`):
      FindMedication screens (form/results/detail/history) consuming the
      same API surface.

## My Account platform build (Part AI, 2026-08-22)

- [x] Confirm decisions MA-D1–MA-D8 (user, 2026-08-22 — "I approve the
      suggested decision set, proceed with full implementation").
- [x] Migration `20260823_my_account_platform.sql`: ghost `faq_categories` +
      `faqs` capture (RLS: published-only public read), public SECURITY
      DEFINER RPCs `get_public_faqs()` + `get_public_app_config()`,
      `platform_settings.support_whatsapp` / `share_url` + seeded global row,
      `user_profiles.marketing_consent` / `research_consent`.
- [x] Admin: `/faq` CMS wiring (live search/filter/export/edit/delete +
      status), Settings support-contacts fields + `/api/settings` schema,
      public `GET /api/user/app-config`, delete-account-request `GET` +
      `PATCH cancel` (pending_review / in_verification only).
- [x] Mobile (4OurLife-MobileApp): `hooks/use-my-account.ts`; grouped My
      Account hub + version footer (MA-D1); DeleteAccount reason + status
      banner + cancel + stay-signed-in (MA-D3); Security Center (MA-D4),
      Privacy & Data consent hub (MA-D6), About (MA-D7), Subscription (MA-D8);
      Help Center fetched FAQs/contacts (MA-D2/D5); Favorites Liked segment;
      Settings share/contact via app-config (MA-D5).
- [x] Docs: GAP_ANALYSIS Part AI section.
- [ ] Apply `20260823_my_account_platform.sql` to the live Supabase DB
      (user-manual; all mobile features degrade gracefully until applied).

## Screen sizing & rendering pass (Part AJ, 2026-08-22)

- [x] Confirm decisions AJ-D1…AJ-D8 (user, 2026-08-22 — "Proceed and
      implement").
- [x] Mobile (4OurLife-MobileApp): new `responsive/breakpoints.ts`
      (`TABLET_BREAKPOINT 600`, `MAX_CONTENT_WIDTH 680`,
      `MAX_TEXT_MEASURE 720`, `useIsTablet`, `useContentPadding`).
- [x] Tablet containment: Home hub (capped column + carousel height tracking
      CampaignBox scale), Chats list + chat thread, Fitness hub,
      generated-for-you, active-exercise (live window height),
      FitnessOnboarding (welcome/plan/questionnaire), IBP dashboard
      (extra-gutter cap), My Account hub + Security Center + Privacy & Data +
      About + Subscription.
- [x] Static `Dimensions.get` captures converted to `useWindowDimensions`
      (generated-for-you, active-exercise); dead `SCREEN_WIDTH` removed from
      the Fitness hub.
- [x] Small-screen guardrails: FitnessTransitionModal loader ring
      `min(320, width − 96)`; FitnessOnboarding CTA `min-h-[56px]`.
- [x] NativeWind interpolated arbitrary-value fix: My Account hub background
      moved to the `style` prop.
- [x] Tablet modals: Disease/Symptom/HealthyLiving detail cards capped at
      720dp centered (image headers stay full-width).
- [x] Docs: GAP_ANALYSIS Part AJ section.
- [ ] Device-matrix visual pass (AJ-D8): 320×568, 360×800, 390×844, 430×932,
      673 Fold inner, 834, 1024 — default and large font scale (user-manual
      on physical devices/emulators).

## Anti screen-reading & anti-AI-scraping protocol (Part AK, 2026-08-22)

- [x] Confirm decisions AK-D1…AK-D10 (user, 2026-08-22 — "Proceed and
      implement").
- [x] Mobile (4OurLife-MobileApp) AK-D1: `plugins/withFlagSecure.js`
      (Android FLAG_SECURE) registered in app.config.ts;
      `components/security/PrivacyBlur.tsx` (iOS app-switcher snapshot
      cover); `hooks/use-screenshot-detection.ts` telemetry hook; mounted in
      `app/_layout.tsx`.
- [x] Mobile AK-D2: `context/DeviceTrustContext.tsx` — per-session device
      profile + emulator detection + screen-reader state, reported via
      `report_device_signal` (telemetry-only; accessibility never gated).
- [x] Mobile AK-D3: `services/deviceAttestation.ts` — fail-open Play
      Integrity / App Attest plumbing + `log_device_attestation` telemetry.
- [x] Mobile AK-D4: `components/security/MaskedValue.tsx` — mask-by-default
      email/phone on the My Account hub, biometric step-up reveal, 12s
      auto-mask, reveal telemetry.
- [x] Backend: `supabase/migrations/20260822_anti_screen_reading_ak.sql` —
      security_device_signals, device_attestation_log, bot_signals,
      admin_read_audit, security_canaries + RPCs (report_device_signal,
      log_device_attestation, report_bot_signal, log_admin_read with
      200/hr anomaly trip, issue_canary, report_canary_hit,
      enforce_read_quota).
- [x] Admin AK-D6/D7: `components/security/ForensicWatermark.tsx` +
      `SecurityCanary.tsx`; `lib/security-audit.ts` canary issuance;
      `_c` canary field in `/api/admin/users` payloads.
- [x] Admin AK-D8/D9/D10: `BotSignalCollector.tsx` +
      `/api/admin/security/signals`; `IdleSessionGuard.tsx` (30-min idle);
      `auditAdminRead()` on `/api/admin/users` + `/api/admin/users/export`;
      `AdminSecurityLayer.tsx` mounted via new `app/(dashboard)/layout.tsx`;
      CSP `frame-ancestors 'none'` header.
- [x] Docs: GAP_ANALYSIS Part AK section.
- [ ] Apply `20260822_anti_screen_reading_ak.sql` to the live Supabase DB
      (user-manual; all AK features degrade gracefully until applied).
- [ ] AK-D1.3: iOS screenshot-detection native emitter (EAS config plugin
      follow-up — hook is already listening, inert until linked).
- [ ] AK-D3.2: native Play Integrity / App Attest module in the EAS build;
      flip device_attestation_log from telemetry to enforcement.
- [ ] AK-D5.2: add `enforce_read_quota` guard calls inside the sensitive
      mobile RPCs (chats, profile reads) once the migration is applied.
- [ ] AK-D8.2: Cloudflare Turnstile on /login + OTP step-up challenge for
      sessions that trip headless indicators (reuses device-sign-in OTP).
- [ ] Verify watermark visibility + idle sign-out on a staging admin session
      (user-manual).
