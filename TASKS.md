# TASKS.md — 4 Our Life: Admin Panel + Mobile App Completion

> Generated from a live audit of both repos:
> - Admin panel: `/Users/anwarsadat/Desktop/WORK/4-Our-Life` (Next.js 15/16, Supabase, TanStack Query v5)
> - Mobile app: `/Users/anwarsadat/Desktop/WORK/4-Our-Life-App` (Expo SDK 56, React Native 0.85, Supabase, TanStack Query v5)
>
> This document is the single backlog for finishing both apps. It uses **Epics → Stories**.
> - **Epic** = a key deliverable (a module or capability that ships as a whole).
> - **Story** = one unit of work inside an Epic, small enough to be picked up and finished on its own. Each story is tagged with where the work lives: `[Admin]`, `[Mobile]`, `[Backend/Supabase]`, or a combination.
>
> Checkboxes are for tracking progress — check them off in PRs as work lands. Anything marked **⚠️ ASSUMPTION** was not specified and was decided using best available context/standards; revisit before building if it matters.

---

## How To Use This File

1. Work top-to-bottom within a phase (see **Suggested Phasing** at the bottom) — some epics depend on earlier ones (e.g. Subscriptions depends on Transactions' payment plumbing).
2. Every story that touches data should end with: real Supabase query wired, loading/empty/error states handled, and no hardcoded numbers left behind.
3. When a story is genuinely done, check it off and add the PR link inline, e.g. `- [x] Story name (#123)`.
4. New tasks discovered mid-build go into the relevant Epic as a new Story — don't let a second backlog form elsewhere.

---

## Charting & Data-Viz Standard (shadcn)

The admin panel currently mixes chart libraries across modules (`apexcharts`, `chart.js`/`react-chartjs-2`, `recharts` are all in `package.json`, plus several fully static/hardcoded "charts" that are really just styled divs). Since shadcn is installed, **standardize all new and refactored charts/graphs on shadcn's chart components** (which wrap `recharts` with shadcn's theme tokens, `ChartContainer`, `ChartTooltip`, and `ChartLegend`) instead of reaching for a fourth library or hand-rolled SVG.

- [ ] **0.1** `[Admin]` Add/confirm the shadcn `chart` component is installed (`components/ui/chart.tsx` + associated `chart-*` primitives) and pull in a `ChartConfig` convention (color tokens per series, consistent with the existing Tailwind theme).
- [ ] **0.2** `[Admin]` Build a small shared set of chart wrappers on top of shadcn's primitives for the recurring shapes this backlog needs: a trend/line chart (revenue, DAU/MAU, growth), a bar/grouped-bar chart (by-status, by-region, by-plan breakdowns), a donut/pie chart (payment-method split, plan distribution), and a stat-with-sparkline card (dashboard KPI tiles).
- [ ] **0.3** `[Admin]` Migrate existing chart usages module-by-module as each module's epic is worked (don't do a big-bang rewrite) — replace ApexCharts/Chart.js instances with the shadcn wrappers as their data source is wired to real Supabase queries, so the visual upgrade and the "remove fake data" work land in the same PR.
- [ ] **0.4** `[Admin]` Once most modules are migrated, drop the now-unused chart libraries from `package.json` (candidates: `apexcharts`, `react-apexcharts`, `chart.js`, `react-chartjs-2` — confirm nothing else depends on them first, e.g. `@fullcalendar/*` is unrelated and stays).

Any epic below that involves a chart/graph (Epic 1's dashboard trend charts, Epic 6's revenue analytics, Epic 9's fitness dashboard, etc.) should build against this shared shadcn chart layer rather than a one-off implementation — see the Definition of Done at the bottom of this file.

---

## ⚠️ Assumptions Made (flagged, confirm when convenient)

| # | Assumption | Why |
|---|---|---|
| 1 | **Payment providers**: Paystack (cards + bank) and MTN MoMo (mobile money) are the two rails implemented for Ghana. | Not specified by product owner yet. These are the two dominant, developer-friendly rails for Ghanaian consumer fintech; both have first-class Node/React Native SDKs. Swap freely — the epic is written so the webhook/ledger layer is provider-agnostic. |
| 2 | **Period tracker data model**: `tracker_logs` currently holds **0 rows**, so it's being retired rather than extended. **Decision**: audit the `cycles` / `symptoms` / `cycle_statistics` / `prediction_results` / `period_tracker_profiles` schema proposed in `4-Our-Life-App/Period-tracker/PERIODS_TRACKER_IMPLEMENTATION.md` against a production checklist (normalization, data types, indexes, constraints, RLS). If it passes, adopt it as-is. If it doesn't, keep its intent but optimize/normalize it before building on it. Either way, `tracker_logs` is dropped, not kept in parallel — see Epic 8a for the concrete review + migration steps. | With zero live rows there's no migration cost and no reason to keep a table's shape just for continuity — free to build whichever schema is actually right for production. |
| 3 | **Admin task manager** gets a real `admin_tasks` table (not a generic project-management integration like Jira/Asana). | Roadmap doc flags this as needed; no external PM tool was named, so the simplest self-hosted option is assumed. |
| 4 | **New analytics/event tables** (`analytics_events`, `ai_usage_logs`, `payment_webhook_events`, `fitness_coin_ledger`, `compliance_settings`, `system_health_snapshots`) are added incrementally, only immediately before the epic that needs them — not all up front. | Avoids speculative schema that might not match real usage patterns once features ship. |
| 5 | **Time zone**: all cron/reminder logic (medication, period tracker) assumes Africa/Accra (GMT, no DST) unless a per-user timezone field says otherwise. | Matches existing `*_utc` columns already present in `tracker_logs` and `medications`. |
| 6 | Mobile app screens are added under Expo Router's existing `app/(app)/(auth)/(tabs)` structure, following the pattern already used by Fitness/Reminders/SavedItems. | Matches current mobile app architecture; no new navigation shell needed. |

---

## EPIC 1 — Analytics & Metrics Foundation
*Stop every dashboard from lying. This unblocks every other epic's "done" definition (a module isn't done until its numbers are real).*

- [ ] **1.1** `[Backend]` Build a metric registry (a markdown or JSON table mapping every KPI card/chart across the admin panel to: source table, query/RPC, owning epic, status). Use `ADMIN_DASHBOARD_SUPABASE_ANALYTICS_ROADMAP.md` as the seed data.
- [ ] **1.2** `[Backend]` Implement `get_platform_overview_metrics(time_filter)` RPC returning totals/deltas/queues per the contract already drafted in the roadmap doc.
- [ ] **1.3** `[Admin]` Standardize `KpiCard` component with loading / empty / error states (no more silently showing `0` or a fake number when a query fails).
- [ ] **1.4** `[Admin]` Wire `app/(dashboard)/dashboard/page.tsx` and its `_components/*` (CriticalAlerts, RevenueTrendChart, RevenueStreams, UsersByPlan, FeatureUsage, ActivityFeed, AIHubOverview, RegionalCoverage, HealthFeaturesStatus, PendingTasks, ComplianceGRA, SystemHealth) to real data or an explicit "awaiting instrumentation" empty state — remove every hardcoded number listed in the roadmap doc's "Main Platform Dashboard" section.
- [ ] **1.5** `[Backend]` Replace fake activity feed with a live `activity_logs` query (1,731 rows already exist).
- [ ] **1.6** `[Admin]` Add a shared time-filter control that all dashboard cards respect consistently (react to the same date range).
- [ ] **1.7** `[Backend]` Delta calculation utility: compare `created_at` counts in selected window vs. previous equal-length window, shared across all `get_*_dashboard_metrics` RPCs so every module computes "+X% this period" the same way.
- [ ] **1.8** `[Admin]` Rebuild the dashboard's trend/breakdown charts (`RevenueTrendChart.tsx`, `UsersByPlan.tsx`, `FeatureUsage.tsx`, `RegionalCoverage.tsx`) on the shared shadcn chart layer from the Charting & Data-Viz Standard section above, at the same time their data is wired to real queries.

---

## EPIC 2 — Admin & Access Management
- [ ] **2.1** `[Backend]` `get_admin_dashboard_metrics(time_filter)` RPC: total/active/pending admins, role breakdown, recent admin activity — sourced from `user_profiles` (`is_admin`, `admin_role`, `admin_permissions`, `status`, `last_active`) + `activity_logs`.
- [ ] **2.2** `[Admin]` Wire `admins/_components/AdminStats.tsx` to the RPC above; remove hardcoded Total/Active/Pending/Inactive counts.
- [ ] **2.3** `[Backend]` Persist admin sessions: populate `admin_sessions` on login/logout (session start, IP, device, last-seen heartbeat).
- [ ] **2.4** `[Backend]` Persist MFA enrollment state on `user_profiles` (or a dedicated column/table) so "MFA Not Set" and "Online Now" can be computed instead of hidden.
- [ ] **2.5** `[Admin]` Once 2.3/2.4 land, unhide MFA-gap and Online-Now metrics in `AdminStats.tsx`.
- [ ] **2.6** `[Admin]` Wire `admins/_components/ReportsTab.tsx` charts to `admin_activity_logs`/`activity_logs` instead of static arrays.
- [ ] **2.7** `[Admin]` Wire `admins/_components/RolesPermissionsTab.tsx` matrix to the real `admin_permissions` structure on `user_profiles` (make it editable, not just a static display).
- [ ] **2.8** `[Admin]` Wire `admins/_components/AdminTable.tsx` session/last-active column to `admin_sessions`.

---

## EPIC 3 — User Management
- [ ] **3.1** `[Backend]` `get_user_dashboard_metrics(time_filter)` RPC: total/active/new/deleted users, by role/type/status/sex, users with push token, fitness-onboarding completion rate.
- [ ] **3.2** `[Admin]` Replace `users/_components/UsersStats.tsx` hardcoded values with the same live-query pattern `UserSection.jsx` already uses (don't maintain two different data-fetch approaches on one page).
- [ ] **3.3** `[Admin]` Define "Active" as `last_active` within the selected time window (not just `status = 'active'`).
- [ ] **3.4** `[Admin]` Remove "Flagged" stat unless/until a moderation-flag table exists (see Epic 20 AI/Moderation); don't ship a metric with no source.
- [ ] **3.5** `[Admin]` "Premium" stat sources from `user_subscriptions` only (empty/zero state until Epic 7 subscriptions ship real rows).
- [ ] **3.6** `[Admin]`/`[Mobile]` Confirm delete-account request flow end-to-end: mobile submits → `delete_account_requests` row → admin `delete-account-request` module reflects it in real time (see Epic 12).

---

## EPIC 4 — Facilities & Reviews
- [ ] **4.1** `[Backend]` `get_facility_dashboard_metrics(time_filter)` RPC: total/active/pending/rejected, by type, by region, top-rated count, reviews total/average — from `facility_profile`, `facility_reviews`, `facility_favorites`, `facility_offerings`.
- [ ] **4.2** `[Admin]` Facilities page: keep existing live counts; gate "Top Rated" and "Reviews" behind real data from `facility_reviews` (currently 0 rows) instead of showing fabricated totals.
- [ ] **4.3** `[Backend]` Add a `moderation_status` (or similar) column to `facility_reviews` so Reviews module can report Flagged/Pending Approval honestly.
- [ ] **4.4** `[Admin]` Wire `reviews/_components/ReviewStats.tsx` to real aggregates (`avg(rating)`, `count(*)`) and remove the hardcoded 4.4 / 28,420 / 12 / 3.
- [ ] **4.5** `[Backend]` Regional coverage: compute from `facility_profile.region` grouped counts (needed by dashboard's `RegionalCoverage.tsx`, Epic 1.4).
- [ ] **4.6** `[Backend]`/`[Admin]` PostGIS RPC for map clustering / nearest-facility / bounding-box queries if map analytics need more than the existing `get_facilities_map` RPC provides.
- [ ] **4.7** `[Mobile]` Confirm the facility review-submission flow in the mobile app actually writes to `facility_reviews` with rating + comment + `is_verified_visit` — this table is the blocker for 4.2–4.4, so verify it's wired before building admin visuals around it.

---

## EPIC 5 — Chats & Support
- [ ] **5.1** `[Backend]` `get_support_analytics(time_filter)` RPC: tickets by status/priority/category, unread/unassigned counts, SLA breach count, avg first-response/resolution time — from `chat_support`.
- [ ] **5.2** `[Admin]` Wire `chats/_components/ChatStats.tsx`: group count from `conversations.is_group = true`, support counts from `chat_support`. Remove hardcoded 48 groups / 12,840 members / 94% satisfaction.
- [ ] **5.3** `[Backend]` Add first-response-timestamp capture and a CSAT/rating field to `chat_support` (or a new `support_ticket_events` table) — required before satisfaction/response-time can be real.
- [ ] **5.4** `[Admin]` Wire `chats/_components/SupportTab.tsx` and `GroupsTab.tsx` to live data once 5.1/5.3 land.
- [ ] **5.5** `[Admin]`/`[Backend]` Enable Supabase Realtime on `messages` and `conversation_members` for live unread counts in the admin panel (per `UI_REBUILD_HANDOFF.md` design rule).
- [ ] **5.6** `[Mobile]` Confirm mobile chat writes `response_time_minutes`, `category`, `tags` on `chat_support` tickets raised from in-app support so 5.1's aggregates have real inputs.

---

## EPIC 6 — Transactions, Payments & Revenue
*Currently 100% fabricated on the admin side and entirely absent on mobile — no payment library in either `package.json`. This is the largest greenfield epic.* **⚠️ See Assumption #1 (Paystack + MTN MoMo).**

### 6a. Payment Rails & Ledger (Backend)
- [ ] **6.1** `[Backend]` Choose and provision payment provider account(s): Paystack (cards, bank transfer) + MTN MoMo (mobile money collections). Store keys in env (`PAYSTACK_SECRET_KEY`, `MOMO_*`), never client-side.
- [ ] **6.2** `[Backend]` Create `payment_webhook_events` table (immutable log of every provider webhook payload, signature-verified, with `processed_at`).
- [ ] **6.3** `[Backend]` Build webhook endpoint(s) (Next.js route handler) that verify signatures, write to `payment_webhook_events`, then upsert into `transaction_records` (status: pending/success/failed/refunded).
- [ ] **6.4** `[Backend]` Define `transaction_records` columns needed beyond what exists today: `provider`, `provider_reference`, `amount`, `currency`, `fee`, `net_amount`, `payer_user_id`, `payee_facility_id` (nullable), `purpose` (subscription/service/facility-booking/etc.), `status`, `created_at`.
- [ ] **6.5** `[Backend]` Reconciliation job (cron): compare provider transaction list vs. local `transaction_records` daily, flag mismatches.
- [ ] **6.6** `[Backend]` `get_transaction_analytics(time_filter)` RPC/API: revenue, transaction count, payment-method split, failed/refund counts, fees, VAT, subscriptions, churn — server-only, service-role, admin-permission gated.

### 6b. Mobile Payment Flows
- [ ] **6.7** `[Mobile]` Integrate Paystack React Native SDK (or WebView checkout) for card/bank payments at the relevant purchase points (subscriptions, paid facility services).
- [ ] **6.8** `[Mobile]` Integrate MTN MoMo collection flow (phone-number prompt + provider USSD/API confirmation).
- [ ] **6.9** `[Mobile]` Payment status screens: pending / success / failed, with retry.
- [ ] **6.10** `[Mobile]` Transaction history screen for the user (their own `transaction_records`, read-only).
- [ ] **6.11** `[Mobile]` Receipt/confirmation (in-app + optional email via existing Resend integration).

### 6c. Admin Transactions Module
- [ ] **6.12** `[Admin]` `transactions/_components/TransactionStats.tsx`: replace all hardcoded KPIs (Total Transactions, Total Revenue, Total Customers, Gross Profit) with 6.6's live data; show an honest "awaiting transaction pipeline" empty state until 6.1–6.6 ship.
- [ ] **6.13** `[Admin]` `RecentTransactionsTab.tsx` — live table from `transaction_records`, paginated, filterable by status/provider/date.
- [ ] **6.14** `[Admin]` `FailedTransactionsTab.tsx` — filter `status = 'failed'`, show provider error reason from `payment_webhook_events`.
- [ ] **6.15** `[Admin]` `RefundsTab.tsx` — refund initiation (calls provider refund API) + refund status tracking.
- [ ] **6.16** `[Admin]` `PaymentMethods.tsx` — real payment-method split (Paystack card vs. bank vs. MoMo) from `transaction_records.provider`.
- [ ] **6.17** `[Admin]` `RevenueAnalytics.tsx` / `RevenueBreakdownTab.tsx` — real revenue trend chart + breakdown by source (subscriptions vs. one-off vs. facility fees).
- [ ] **6.18** `[Admin]` `ServiceChargeTab.tsx` — real service-fee configuration (rate stored in a settings table, not hardcoded) and computed fee revenue.
- [ ] **6.19** `[Admin]` `TaxVATTab.tsx` — VAT/GRA report generated from immutable `transaction_records`; keep disabled/hidden until transaction data is validated as accurate (don't ship a compliance report off fake or unvalidated data).
- [ ] **6.20** `[Admin]` `PayoutsTab.tsx` / `ExpensesTab.tsx` — payout tracking to facilities (if facilities receive payouts) and platform expense entries.
- [ ] **6.21** `[Admin]` Finance-only permission check (role/permission gate) on every transaction API route and RPC — this is money data, restrict beyond generic admin auth.

---

## EPIC 7 — Subscriptions & Premium Plans
*Depends on Epic 6's payment plumbing.*
- [ ] **7.1** `[Backend]` Populate `subscription_plans` (tiers, price, billing cycle, feature flags) — currently 0 rows.
- [ ] **7.2** `[Mobile]` Subscription plan selection + upgrade/downgrade screen, charging via Epic 6's payment flows.
- [ ] **7.3** `[Backend]` Recurring billing: webhook-driven renewal, handling failed renewal (grace period → downgrade).
- [ ] **7.4** `[Admin]` `SubscriptionsTab.tsx` (transactions module) — live subscriber list, plan distribution, churn/renewal from `user_subscriptions`.
- [ ] **7.5** `[Admin]` Dashboard's `UsersByPlan.tsx` wired to `user_subscriptions` once real rows exist (unblocks Epic 1.4 and Epic 3.5).

---

## EPIC 8 — Period Tracker (Schema Migration + Mobile Build)
*`tracker_logs` holds 0 rows and is being retired (Assumption #2). This epic starts with a schema review/migration, then builds mobile from scratch against the new tables, then ports the admin CRUD/calendar screens over.*

### 8a. Schema Decision & Migration (Backend)
- [ ] **8.1** `[Backend]` Review the schema proposed in `Period-tracker/PERIODS_TRACKER_IMPLEMENTATION.md` (`cycles`, `symptoms`, `cycle_statistics`, `prediction_results`, `period_tracker_profiles`) against a production checklist: normalization (it's already an improvement on `tracker_logs`'s denormalized `flow_types`/`fertile_window_dates` JSON-array-per-row design — one row per cycle, one row per symptom-per-day), correct/consistent data types (`DATE` vs `TIMESTAMP`), indexes on `user_id` + date columns, sensible `UNIQUE` constraints (e.g. `(user_id, start_date)` on `cycles`, `(user_id, date, symptom_type)` on `symptoms`), foreign keys with `ON DELETE CASCADE`, and per-table RLS.
- [ ] **8.2** `[Backend]` Fix/optimize anything that doesn't pass 8.1 — e.g. confirm `symptoms` should stay one-row-per-symptom-per-day (recommended: normalized and easy to aggregate per symptom type) rather than a single `jsonb` blob per day; add any missing `updated_at` triggers and `CHECK` constraints (`flow_intensity IN ('light','normal','heavy','spotting')`, `intensity BETWEEN 1 AND 10`); decide if a `deleted_at` soft-delete column is needed for recoverable history.
- [ ] **8.3** `[Backend]` Create the finalized tables with RLS enabled (`auth.uid() = user_id` policies per the implementation doc, adjusted for anything changed in 8.2).
- [ ] **8.4** `[Backend]` Drop `tracker_logs` (0 rows — no backfill needed) and remove/retire `app/services/period_tracker_service.js`'s references to it.
- [ ] **8.5** `[Admin]` Rebuild the period-tracker data-access layer (service or hook, per `Refactor_Docs.md`'s migration pattern) against the new tables.
- [ ] **8.6** `[Admin]` Update the Period Tracker overview/details/create pages' columns to the new schema (e.g. `cycles.start_date`/`end_date`/`flow_intensity` instead of `tracker_logs.period_start_date`/`flow_types`; symptom summaries pulled from `symptoms` instead of an embedded JSON array).

### 8b. Prediction Calculator (shared logic, correct this time)
- [ ] **8.7** `[Backend]`/`[Mobile]` Implement `PeriodCalculator` (cycle-length averaging, ovulation = cycle length − 14, fertile window = ovulation −7 to +2, confidence scoring) against the new `cycles`/`cycle_statistics` tables, using the corrected formula from `ToChange.md`: **Next Period Start = Most Recent Period Start + Average Cycle Length** (period length only affects bleed duration, not the next start date — the old `tracker_logs`-era draft had this backwards, plus a syntax error in `moment.(period_start_date)`).
- [ ] **8.8** `[Backend]`/`[Mobile]` `DEFAULT_CYCLE_LENGTH = 28` cold-start fallback for fewer than 2 recorded cycles; drop once `cycle_statistics.cycle_count` is sufficient.
- [ ] **8.9** `[Backend]`/`[Mobile]` Return a predicted **date range**, not a single date: `start = last_cycle_start + avg_cycle_length`, `end = start + avg_period_length − 1`.
- [ ] **8.10** `[Backend]`/`[Mobile]` Sliding-window average (last 3 cycles), refreshed into `cycle_statistics` whenever a new cycle is logged.
- [ ] **8.11** `[Admin]` Wire the admin calendar view's tile helpers to the new calculator/tables so fertile-window / flow / ovulation / next-period indicators render off real, correctly-computed dates.
- [ ] **8.12** `[Backend]`/`[Mobile]` Unit tests for the calculator (cycle averaging, cold-start fallback, range calculation, irregular-cycle conservative estimate) — mirror the same test cases on both admin and mobile since the two implementations must agree.

### 8c. Mobile: Core Tracking (MVP)
- [ ] **8.13** `[Mobile]` Add "Period Tracker" entry point to the app's category/home navigation (matches existing pattern for Fitness/Reminders).
- [ ] **8.14** `[Mobile]` Period logging screen: start date, end date (optional), flow intensity — writes to `cycles`.
- [ ] **8.15** `[Mobile]` `usePeriodTracker` React Query hook: fetch user's `cycles`, derive statistics/prediction/current-cycle-status via 8.7's calculator.
- [ ] **8.16** `[Mobile]` Dashboard/home card: current cycle day, phase (menstrual/follicular/ovulation/luteal), days until next period, confidence %.
- [ ] **8.17** `[Mobile]` Calendar view (react-native-calendars, already a dependency) color-coded by phase.
- [ ] **8.18** `[Mobile]` Onboarding/settings screen: typical cycle length, typical period length, tracking goal, reminder opt-in — writes to `period_tracker_profiles`.
- [ ] **8.19** `[Backend]` Reminder notifications: reuse the existing `/app/api/cron/tracker/route.js` + FCM pattern, updated to query `cycles`/`period_tracker_profiles` instead of `tracker_logs`.

### 8d. Mobile: V1 Enhancements
- [ ] **8.20** `[Mobile]` Symptom logging (cramps, headache, acne, bloating, mood, cervical mucus) — writes to `symptoms`.
- [ ] **8.21** `[Mobile]` Irregular-cycle detection: coefficient-of-variation check per `PERIODS_TRACKER_ARCHITECTURE.md` §4; show a conservative estimate + "track 3+ more cycles for better accuracy" instead of false confidence.
- [ ] **8.22** `[Mobile]`/`[Backend]` Prediction-accuracy feedback loop: when actual period arrives, compare to prediction, write to `prediction_results`, feed the error back into the confidence score.
- [ ] **8.23** `[Mobile]` FDA-style disclaimer ("not a form of contraception") at onboarding and in settings.

### 8e. Mobile: V2 (Later)
- [ ] **8.24** `[Mobile]` Pregnancy mode (gestation-week tracking).
- [ ] **8.25** `[Mobile]` Partner sync (read-only cycle-status sharing).
- [ ] **8.26** `[Mobile]` Health-app export (Apple Health / Google Fit) if/when prioritized.

---

## EPIC 9 — Fitness Module Completion
- [ ] **9.1** `[Backend]` `get_fitness_dashboard_metrics(time_filter)` RPC: exercises/plans/challenges/participants/generated workouts/onboarding completions/outdoor entities/trainers.
- [ ] **9.2** `[Admin]` Wire `fitness/page.tsx` KPI row to live counts (255 exercises, 1 plan, 1 challenge, etc. already real); remove FitCoins Issued, AI-Generated Plans placeholder, until Epic 9.4/9.5.
- [ ] **9.3** `[Admin]` `DashboardTab.tsx`: hide Active Today / Avg Streak / Avg Completion / Top Challenges / Leaderboard until workout-session event logging exists (9.6).
- [ ] **9.4** `[Backend]` Create `fitness_coin_ledger` (earned/spent/adjusted) before showing any FitCoins number anywhere.
- [ ] **9.5** `[Admin]` Replace "AI-Generated Plans" hardcoded number with `count(fitness_generated_workouts)`.
- [ ] **9.6** `[Mobile]` Confirm/build workout-session and exercise-completion event logging (needed for streaks, completion rate, top-exercises-by-usage — currently no such table exists).
- [ ] **9.7** `[Admin]` `ScheduleTab.tsx`: wire to `fitness_content_schedule` (0 rows today — ship a correct empty state, not fake 12/4/84 pipeline numbers).

---

## EPIC 10 — Medical Content (Diseases, Symptoms, Healthy Living, FAQ)
- [ ] **10.1** `[Backend]` `get_content_dashboard_metrics(time_filter)` RPC covering conditions/symptoms/healthy_living/faqs published/draft/pending counts and view totals.
- [ ] **10.2** `[Admin]` Diseases/Symptoms pages: remove hardcoded likes (124K), engagement (4.7), verification rate (94%) — no source table exists for these; either build an engagement-events table or drop the metric.
- [ ] **10.3** `[Admin]` Healthy Living: compute Total Views as `sum(view_count)` (column exists); rename "Categories" to "Content Types" unless a real category taxonomy is modeled, and drop the hardcoded 4.8 average rating.
- [ ] **10.4** `[Admin]` Healthy Living view dialog: add a **Parent** column showing the node's ancestry as `GrandParent -> Parent` (or `Null` for root nodes), and change the data fetch to pull **all** nodes rather than only parent nodes (per `ToChange.md`).
- [ ] **10.5** `[Admin]` FAQ: wire active-FAQ count, category count, view/helpfulness totals from `faqs`/`faq_categories`; remove the fabricated "AI Deflection Rate" until support tickets can be tagged as FAQ/AI-deflected (depends on Epic 5.3).
- [ ] **10.6** `[Backend]` `useGetFacilitiesMapData` RPC: move filtering logic to the database level (apply filters server-side) instead of client-side post-filtering, for a more modular/performant approach (per `ToChange.md`).

---

## EPIC 11 — Medication Reminders
- [ ] **11.1** `[Admin]` Keep existing live Total/Active reminder counts (already wired).
- [ ] **11.2** `[Backend]` Add a reminder-delivery/acknowledgement event table (was the medication taken, skipped, snoozed) — required before Adherence Rate can be real.
- [ ] **11.3** `[Admin]` Wire Adherence Rate once 11.2 exists; remove the hardcoded 82% until then.
- [ ] **11.4** `[Mobile]` Confirm push-notification delivery + in-app acknowledgement flow writes to 11.2's event table.

---

## EPIC 12 — Delete Account Requests
- [ ] **12.1** `[Admin]` Wire `delete-account-request/_components/DeleteRequestStats.tsx` counts by `status` from `delete_account_requests` (currently 0 rows — ship correct empty state).
- [ ] **12.2** `[Backend]` Formalize the status vocabulary (e.g. `pending_review`, `in_verification`, `grace_period`, `completed`, `cancelled`) as an enum/check constraint so "In Verification"/"Grace Period" metrics are backed by enforced states, not assumed ones.
- [ ] **12.3** `[Mobile]` Confirm the in-app delete-account flow writes a `delete_account_requests` row with the correct initial status.
- [ ] **12.4** `[Backend]` Grace-period expiry job (cron): auto-transition `grace_period` → `completed` after the configured window, executing the actual deletion/anonymization.

---

## EPIC 13 — Internal Admin Task Manager
**⚠️ See Assumption #3.**
- [ ] **13.1** `[Backend]` Create `admin_tasks` table (title, description, status, assignee, priority, due_date, created_by, board/column position).
- [ ] **13.2** `[Admin]` Wire `tasks/_components/TaskStats.tsx` to real counts (New/In Progress/Under Review/Completed) instead of hardcoded 4/6/3/12.
- [ ] **13.3** `[Admin]` Wire `tasks/_components/KanbanBoard.tsx` drag-and-drop to persist column/status changes to `admin_tasks`.
- [ ] **13.4** `[Admin]` Task assignment + activity log entry on create/update/complete (feeds `activity_logs`).

---

## EPIC 14 — BedTracker
- [ ] **14.1** `[Backend]` Define facility-side update contract: how does a facility report bed availability (API endpoint, or a facility-portal mobile/web screen)?
- [ ] **14.2** `[Backend]` `get_bedtracker_analytics(time_filter)` RPC: occupancy rate, alerts, ambulance dispatch status, coverage — from `bed_tracker_facilities`, `bed_tracker_alerts`, `ambulance_dispatches`.
- [ ] **14.3** `[Backend]` Alert-threshold automation (e.g. auto-flag when a facility's available beds drop below N).
- [ ] **14.4** `[Admin]` Wire `bedtracker/page.tsx` off the `_deprecated` static version to live data + real-time updates (Supabase Realtime channel).
- [ ] **14.5** `[Mobile]` Facility-side bed-count update UI (if facility staff use the consumer app rather than a separate portal — confirm which).
- [ ] **14.6** `[Mobile]` Consumer-side bed-availability display on facility profile / map.

---

## EPIC 15 — FacilityScout
- [ ] **15.1** `[Backend]` Submission review workflow (collector submits → admin approves/rejects → status change).
- [ ] **15.2** `[Backend]` Reward ledger/payment-status tracking for collectors (`collector_submissions` → payout via Epic 6's payment rails once monetary).
- [ ] **15.3** `[Backend]` `get_facilityscout_analytics(time_filter)` RPC: collector activity, submissions by status, rewards owed/paid, approval rate, leaderboard.
- [ ] **15.4** `[Admin]` Wire `facilityscout/page.tsx` to live data.
- [ ] **15.5** `[Mobile]` Collector-facing submission flow (if collectors use the mobile app) — capture facility details/photos, submit for review.
- [ ] **15.6** `[Backend]` Basic anti-fraud scoring before rewards become real money (duplicate-submission detection at minimum).

---

## EPIC 16 — HCP (Healthcare Provider) Verification
- [ ] **16.1** `[Backend]` Define verification workflow states (submitted → under review → verified/rejected) on `hcp_verifications`.
- [ ] **16.2** `[Mobile]` HCP onboarding/document-submission flow (license upload, credentials).
- [ ] **16.3** `[Admin]` `hcp/page.tsx` review queue: approve/reject with reason, document viewer.
- [ ] **16.4** `[Backend]` Notify HCP of verification decision (push/email).

---

## EPIC 17 — Jobs Board
- [ ] **17.1** `[Backend]` Confirm `job_postings`/`job_applications` schema covers required fields (facility, role, requirements, salary range, status).
- [ ] **17.2** `[Admin]` `jobs/page.tsx` — posting moderation/approval, applicant overview, live counts instead of placeholder.
- [ ] **17.3** `[Mobile]` Job listing browse + apply flow for job-seeking users.
- [ ] **17.4** `[Mobile]` Facility-side job-posting flow (if facilities post via the app rather than the admin panel).

---

## EPIC 18 — Notifications & Campaigns
- [ ] **18.1** `[Backend]` `get_notification_analytics(time_filter)` RPC: campaigns sent, delivery/read/failure counts, template usage, automation-rule executions, broadcast performance.
- [ ] **18.2** `[Backend]` Push-provider delivery callbacks (or scheduled reconciliation against FCM) to populate delivery/read/failure counts — currently no feedback loop exists.
- [ ] **18.3** `[Admin]` `notifications/page.tsx`: campaign builder (target segment, template, schedule) wired to `notification_campaigns`/`notification_templates`.
- [ ] **18.4** `[Admin]` Automation rules UI (`notification_automation_rules`) — trigger conditions + actions.
- [ ] **18.5** `[Admin]` `view-notification/page` — single notification detail/delivery-status view.
- [ ] **18.6** `[Mobile]` Confirm push-token registration (`expo_push_token`/`fcm_token` on `user_profiles`) is reliably captured and refreshed on login/reinstall.

---

## EPIC 19 — Security & Compliance
- [ ] **19.1** `[Backend]` Server-side admin session telemetry writing to `admin_sessions`/`admin_activity_logs` (shared foundation with Epic 2.3).
- [ ] **19.2** `[Backend]` Threat-event ingestion into `security_threats` (failed-login spikes, suspicious IP, permission-escalation attempts).
- [ ] **19.3** `[Backend]` Define a transparent security-score algorithm (documented inputs/weights) or remove the "Security Score" metric entirely — never ship an opaque fabricated score.
- [ ] **19.4** `[Admin]` `security/page.tsx` + `security-center/page.tsx`: consolidate into one live module (currently two separate placeholder routes — decide whether both are needed or merge them).
- [ ] **19.5** `[Backend]` Create `compliance_settings` table (VAT rate, GRA ID, filing due dates) — required before `ComplianceGRA.tsx` can show anything real; remove the hardcoded GRA ID/VAT filing/scan date/encryption claims until then.
- [ ] **19.6** `[Backend]` (Optional, only if a reliable monitoring source is wired) `system_health_snapshots` table feeding `SystemHealth.tsx` — otherwise remove API/DB latency and uptime claims rather than fabricate them.

---

## EPIC 20 — AI Hub / AI Observability & Content Moderation
- [ ] **20.1** `[Backend]` Standardize AI-call logging: every AI route (fitness plan generation, chat assistant, etc.) logs model name, prompt category, response time, tokens, status, cost, and user/admin/module context to `fitness_ai_calls` (fitness) and a new cross-module `ai_usage_logs` table for everything else.
- [ ] **20.2** `[Backend]` `get_ai_analytics(time_filter)` RPC: calls by module/model/status, token usage, cost estimate, latency, failed calls, moderation flags.
- [ ] **20.3** `[Admin]` Wire `ai-hub/*` and dashboard's `AIHubOverview.tsx` to 20.2; remove fabricated model-accuracy/anomaly-alert numbers.
- [ ] **20.4** `[Backend]` Create `content_moderation_flags` table; hook it into user-generated content surfaces (reviews, chat, facility submissions) so "Flagged" metrics across Users/Reviews (Epics 3.4, 4.4) have a real source instead of being removed indefinitely.
- [ ] **20.5** `[Admin]` Moderation queue UI: review flagged content, approve/remove, log the admin action.

---

## EPIC 21 — Cross-Cutting Engineering
- [ ] **21.1** `[Backend]` Create `analytics_events` generic event-capture table (feature usage, views, searches, clicks, exports, broadcasts, admin actions not already logged) — shared infrastructure several epics above depend on (9.6, 10.2, 11.2).
- [ ] **21.2** `[Backend]` RLS/service-role audit: every new table/RPC added by this backlog gets an explicit RLS policy review before shipping (per `RLS.md`), especially anything touching money (Epic 6) or PII.
- [ ] **21.3** `[Admin]`/`[Backend]` Materialized daily snapshots for the more expensive aggregate RPCs (transaction analytics, AI analytics) so dashboard load doesn't run heavy queries on every page view.
- [ ] **21.4** `[Admin]` Export endpoints (CSV/PDF) for modules where admins will need to hand data to non-technical stakeholders (transactions, VAT report, user list).
- [ ] **21.5** `[Both]` Update `Refactor_Docs.md`'s hook-migration table as new `useX` hooks are added, so the service→hook migration record stays current.
- [ ] **21.6** `[Admin]` Security patch pass on `react-calendar` and any other dependency flagged with known CVEs in `ToChange.md` — schedule as its own PR since it may introduce breaking changes to calendar-dependent screens (Period Tracker, BedTracker scheduling).

---

## Suggested Phasing

This roughly follows the existing 8-week roadmap in `ADMIN_DASHBOARD_SUPABASE_ANALYTICS_ROADMAP.md`, extended to cover the epics that document didn't include (Period Tracker mobile build, Payments, Subscriptions, and the smaller placeholder modules).

| Phase | Epics | Why this order |
|---|---|---|
| 1 | Epic 1 (Analytics Foundation), Epic 21.1–21.2 | Everything else needs the metric registry and shared event/RLS conventions in place first. |
| 2 | Epic 2 (Admin), Epic 3 (Users), Epic 4 (Facilities/Reviews) | Highest-traffic modules, mostly straightforward Supabase wiring. |
| 3 | Epic 8 (Period Tracker) | Fix the known bug immediately (8a is cheap); mobile MVP (8b) is self-contained and doesn't block on payments. |
| 4 | Epic 5 (Chats/Support), Epic 10 (Content), Epic 11 (Medication), Epic 12 (Delete Requests) | Content/support modules with clear data sources already mostly live. |
| 5 | Epic 6 (Transactions/Payments) | Largest epic — needs a dedicated stretch; everything downstream (Epic 7) depends on it. |
| 6 | Epic 7 (Subscriptions), Epic 9 (Fitness completion) | Builds on payment rails from Phase 5. |
| 7 | Epic 13 (Task Manager), Epic 14 (BedTracker), Epic 15 (FacilityScout), Epic 16 (HCP), Epic 17 (Jobs) | Enterprise/operational modules — lower current usage (0 rows), can trail. |
| 8 | Epic 18 (Notifications), Epic 19 (Security/Compliance), Epic 20 (AI Hub/Moderation) | Needs the most new infrastructure (delivery callbacks, session telemetry, AI logging) — hardest to rush, do last with real data from earlier phases available to test against. |

---

## Definition of Done (applies to every story above)

- [ ] Real Supabase query/RPC replaces any hardcoded value — no mock numbers, even "realistic-looking" ones, ship silently.
- [ ] Loading, empty, and error states are explicit and intentional (not a blank flash or a fake zero).
- [ ] RLS/permission-appropriate — service-role only where the data is sensitive (money, PII, security).
- [ ] Mobile↔Admin parity checked: if a mobile action should show up in the admin panel (or vice versa), verify it actually does, end-to-end, with a real test account.
- [ ] Metric registry (Epic 1.1) updated if a new KPI/chart was added or an existing one's source changed.
- [ ] Any chart/graph in the story uses the shared shadcn chart components (see **Charting & Data-Viz Standard**) rather than a one-off ApexCharts/Chart.js instance or a hand-built static visual.
