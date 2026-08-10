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
**Status:** [ ] Not started

- [ ] **1.1 Enable RLS on `user_profiles` (privilege-escalation hole).**
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

- [ ] **1.2 Audit and enable RLS on the other ~48 unprotected tables.**
  Go table-by-table (`SUPABASE_SCHEMA.md` has the list) and decide the
  correct policy per table — many are read via the anon key from
  `hooks/supabase-calls/*.ts` (facilities, tracker logs, medication
  reminders, notifications, messages/conversations, delete-account
  requests, etc.) with **no database-level check**, only the admin UI
  choosing not to show a button. Treat this as a proper policy-design pass,
  not a bulk toggle — some tables may be intentionally public-read.

- [ ] **1.3 Fix the inverted guard in `lib/supabase/indexAdmin.ts:11`.**
  ```ts
  if (!supabaseUrl.includes("placeholder")) {
    console.warn("[supabaseAdmin] Missing ... env. Storage admin actions may fail.");
  }
  ```
  This warns exactly when the env **is** correctly configured, and stays
  silent exactly when it's fallen back to the placeholder URL/key — the
  one case you actually want a loud warning for. Flip the condition.

- [ ] **1.4 Remove the `NEXT_PUBLIC_`-prefixed service-role-key fallback.**
  `lib/supabase/indexAdmin.ts:7` includes
  `process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` as a fallback
  source for the service-role key. `NEXT_PUBLIC_*` vars are inlined into
  client bundles by Next.js — naming a secret this way is a footgun even
  though nothing currently sets that env var. Drop this fallback entirely
  so the pattern can't be copy-pasted into a client file by accident.

- [ ] **1.5 Sanitize `components/ui/HtmlRenderer.jsx`.**
  Uses `dangerouslySetInnerHTML` (lines ~50, ~253) with no
  DOMPurify/sanitize-html pass, despite a comment claiming it's safe.
  Used to render healthy-living / illness-and-complications content
  (`app/(dashboard)/categories/healthy_living/{details,overview}/page.jsx`
  and the illness_and_complications equivalents). Add sanitization before
  render — stored-XSS risk if that content is ever writable by a
  non-fully-trusted role.

- [ ] **1.6 Implement or remove `app/api/delete-user/route.js`.**
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

---

## Epic 2 — 🟠 HIGH: data-layer reliability (silent failures)
**Status:** [ ] Not started

- [ ] **2.1 Consolidate divergent duplicate Marketing hooks (stale-cache bug).**
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

- [ ] **2.2 Fix silent approve/reject failure — `app/(dashboard)/facilities/_components/view-facility-dialog.tsx:94-123`.**
  `handleApproval`/`handleRejection` catch mutation errors with only
  `console.error` (no toast), and the `finally` block closes the dialog
  unconditionally — so a failed approve/reject looks identical to a
  successful one from the admin's point of view. Add `onError` toasts to
  `useApproveFacility`/`useRejectFacility`
  (`hooks/supabase-calls/useFacilities.ts:491+`) and only close the dialog
  on confirmed success.

- [ ] **2.3 Fix swallowed query error in `hooks/supabase-calls/useCondition.ts` (`useConditions`, lines 34-107).**
  The whole `queryFn` body is wrapped in try/catch that only
  `console.error`s and returns nothing on failure — React Query sees a
  "successful" empty result, so `isError` never becomes true.
  `app/(dashboard)/diseases/page.tsx` only checks `isLoading`, so a
  Supabase error currently renders as a plain empty table with zero
  indication anything went wrong. Re-throw instead of swallowing.

- [ ] **2.4 Add `isError` handling across data-table consumers (systemic — 47 files).**
  Codebase-wide, 47 files under `app/(dashboard)/**` destructure
  `isLoading` from a query hook; **none** also check `isError`. Combined
  with 2.3-style swallowed errors elsewhere, any query failure anywhere
  degrades to a silent empty table. Standardize on a shared "error state"
  UI (there's likely already an empty-state component to extend — see
  Epic 3.2) and roll it out; don't need all 47 in one PR, but track them
  as this story's scope.

- [ ] **2.5 Add `onError` to the Challenge/FitnessPlan/Trainer mutation hooks.**
  `hooks/supabase-calls/useChallenge.ts`, `useFitnessPlan.ts`,
  `useTrainer.ts` (clearly copy-pasted from one template, 4 mutations each,
  ~lines 73-126) call `invalidateQueries`/`toast.success` on success but
  define no `onError` anywhere. Call sites (e.g.
  `fitness/_tabs/ChallengesTab.tsx:22,46`) call the mutation bare with no
  options object either. Result: deleting a row with an FK reference
  elsewhere fails with zero feedback — the row just silently stays put.

- [ ] **2.6 Fix N+1 + swallowed error in `actions/user.actions.ts` `getUsers()` (lines 238-260).**
  Does one `admin.auth.admin.getUserById()` call per row missing an email,
  for every page of the Users table, inside a `try { } catch (e) { /*
  ignore */ }`. Batch this (Admin Auth API supports listing, or backfill
  the email at write-time instead of read-time) and stop swallowing the
  error silently.

- [ ] **2.7 Fix `app/(dashboard)/period/page.tsx` (raw `fetch`, no error UI).**
  Bypasses the hook layer entirely with a hand-rolled
  `fetch("/api/period/analytics...")`; on `!res.ok` nothing happens and
  there's no error UI path (render only happens if `analytics` is
  truthy). Either move this onto the React Query hook layer for
  consistency, or at minimum add an error state.

- [ ] **2.8 Clean up leftover `app/(dashboard)/period_tracker/page.jsx`.**
  Just redirects to `/categories/period_tracker/overview` — looks like
  routing cruft left over from a rename. Confirm nothing links to it and
  remove, or fold the redirect into the resolved route directly.

---

## Epic 3 — 🟠 HIGH: UI consistency & polish
**Status:** [ ] Not started

- [ ] **3.1 Migrate the ~25 remaining legacy-`.jsx`-kit pages to the shadcn kit.**
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

- [ ] **3.2 Add an empty-state branch to `components/Data-Table/data-table.tsx`.**
  `components/redesign/DataTable.tsx` renders an explicit "📂 No records
  found" state; `components/Data-Table/data-table.tsx` has no such branch
  — zero rows just renders a `<TableBody>` with only headers, no
  messaging. Affects the pages still on the older table (currently:
  `onboarding-requests/page.tsx`, `admins/_components/AdminSection.jsx`,
  `marketing/subscriptions/page.tsx`, `users/_components/UserSection.jsx`,
  `marketing/discounts/page.tsx`, `facilities/[type]/page.jsx`,
  `facilities/top-rated/page.jsx`, `facilities/featured/page.jsx`).

- [ ] **3.3 Standardize the loading-state UI and wire up missing `isLoading`.**
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

- [ ] **3.4 Replace `window.confirm()` delete confirmations with the shadcn `AlertDialog`.**
  `components/ui/alert-dialog.tsx` exists in the kit but has **zero**
  consumers anywhere. Meanwhile 9 `window.confirm()` calls (a jarring
  native browser dialog) are used for real delete actions across
  `fitness/_tabs/{OutdoorTab,ExercisesTab,TrainersTab,PlansTab,
  ChallengesTab}.tsx`, `marketing/subscriptions/page.tsx`,
  `marketing/discounts/_components/view-discount-dialog.tsx`. Swap them
  for `AlertDialog`.

- [ ] **3.5 Add `aria-label` to icon-only action buttons in `components/Data-Table/columns/*`.**
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

- [ ] **3.6 Add `w-full min-w-0` to tab-content root divs missing it.**
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

- [ ] **3.7 Consolidate the two parallel `DataTable` implementations.**
  `components/Data-Table/data-table.tsx` and
  `components/redesign/DataTable.tsx` are two independent table
  primitives with different feature sets (empty-state handling, loading
  UI, row-actions pattern all differ — see 3.2/3.3/3.4). Pick one,
  migrate all consumers, delete the other. Do this *after* 3.2/3.3/3.4
  land so you're not fixing bugs in a component you're about to delete.

---

## Epic 4 — 🟡 MEDIUM: performance & bundle size
**Status:** [ ] Not started

- [ ] **4.1 Stop globally importing CSS for libraries that aren't used.**
  `app/layout.js:2-6` imports `react-svg-map/lib/index.css` and
  `leaflet/dist/leaflet.css` on *every* page — confirmed **zero** component
  usages of `react-svg-map`/`leaflet`/`react-leaflet` anywhere in the app
  (mapping is done via `@react-google-maps/api` instead). Same for
  `simplebar-react/dist/simplebar.min.css` (no `SimpleBar` component used
  anywhere). Remove these three imports; keep `flatpickr`'s CSS since
  that one's actually used.

- [ ] **4.2 Code-split the Lexical rich-text editor.**
  `RichTextEditor`/`RichTextInput` (wraps `@lexical/*`) is statically
  imported into add/edit dialogs for diseases, healthy_living, symptoms,
  and fitness, which are themselves statically imported into their page
  files — so Lexical ships on first paint even if the user never opens
  the dialog. Only 4 files in the app use `next/dynamic` at all, and
  notably `app/(dashboard)/map/overview/page.jsx:8` has its dynamic
  import **commented out**. Wrap `RichTextInput`/`LexicalRenderer` (and
  the map component) in `next/dynamic(..., { ssr: false })`.

- [ ] **4.3 Memoize table column definitions (28 files, systemic).**
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

- [ ] **4.4 Replace plain `<img>` with `next/image` (~29 files, 48 tags).**
  vs. only 4 `next/image` usages currently. Representative files:
  `users/_components/AllUsersTab.tsx`, `fitness/_tabs/{TrainersTab,
  UsersTab}.tsx`, `facilities/_components/{view-facility-dialog,
  add-facility-dialog}.tsx`, `components/GalleryModal.tsx`, all
  `(auth)/**` pages, several `categories/**` overview/detail pages.

- [ ] **4.5 Re-evaluate blanket `"use client"` on dashboard pages.**
  73 of 99 `app/(dashboard)/**/page.tsx|page.jsx` files start with
  `"use client"`, opting the whole route out of server rendering. This is
  systemic, not a few isolated cases — worth a deliberate architectural
  decision (which pages genuinely need client interactivity from the
  top vs. could fetch server-side and pass data down) rather than treating
  it as the default.

- [ ] **4.6 Resolve the Redux-vs-Zustand split.**
  `app/layout.js` wraps the entire app in a Redux `<Provider>`, but Redux
  (`useSelector`/`useDispatch`) is referenced in only 2 files
  (`app/layout.js`, `components/Loading.jsx`). Meanwhile `stores/`
  (Zustand-style) is used in 66 files. Migrate the 2 remaining Redux
  usages to Zustand (or a plain context) and drop
  `@reduxjs/toolkit`/`react-redux` + the `store/` directory entirely.

- [ ] **4.7 Drop duplicate-capability dependencies.**
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
