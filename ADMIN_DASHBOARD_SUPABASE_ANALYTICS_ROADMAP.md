# 4 Our Life Admin Dashboard Supabase Analytics Roadmap

Date: June 27, 2026  
Project reviewed: `/Users/anwarsadat/Desktop/WORK/4-Our-Life`  
Supabase project: `https://rhbbxttxnvcziyqzptqs.supabase.co`

## Executive Summary

The admin panel already has a strong enterprise dashboard shell, but a large portion of the KPI and analytics surface is still hardcoded. The current Supabase project has enough live structure to power the first version of the dashboard, especially users, facilities, content, fitness library, activity logs, medication reminders, marketing records, and conversations. The larger enterprise areas such as transactions, revenue, BedTracker, FacilityScout, AI observability, security monitoring, HCP verification, notification campaigns, support satisfaction, and operational SLAs need custom aggregation APIs or should be hidden until instrumentation exists.

The safest build strategy is to ship the dashboard in layers:

1. Replace fake numbers with exact Supabase counts and simple grouped queries.
2. Add Postgres RPCs for cross-table aggregates, trends, and status breakdowns.
3. Add custom server APIs for analytics that Supabase SDK cannot express cleanly: revenue, retention, response times, cohort deltas, AI cost, security score, SLA windows, and regional coverage.
4. Remove or hide metrics that imply instrumentation not currently present.

## Supabase Context Checked

Supabase MCP was not exposed as a dedicated database tool in this Codex thread. I used the available Node MCP/runtime first, then an approved read-only network Supabase SDK/OpenAPI probe against the requested project. No secrets are included in this document.

Live table count highlights:

| Area | Table | Count |
| --- | --- | ---: |
| Auth/users | `user_profiles` | 8 |
| Auth/users | `user` | 2 |
| Auth/users | `account` | 2 |
| Admin/audit | `activity_logs` | 1,731 |
| Admin/audit | `admin_activity_logs` | 0 |
| Admin/audit | `admin_sessions` | 0 |
| Facilities | `facility_profile` | 3 |
| Facilities | `facility_reviews` | 0 |
| Facilities | `facility_favorites` | 2 |
| Content | `conditions` | 33 |
| Content | `symptoms` | 3 |
| Content | `categories` | 44 |
| Content | `body_parts` | 48 |
| Content | `healthy_living_info` | 3 |
| FAQ | `faqs` | 1 |
| FAQ | `faq_categories` | 2 |
| Fitness | `fitness_exercises` | 255 |
| Fitness | `fitness_plans` | 1 |
| Fitness | `fitness_challenges` | 1 |
| Fitness | `fitness_challenge_participants` | 1 |
| Fitness | `fitness_generated_workouts` | 6 |
| Fitness | `fitness_onboarding_selections` | 1 |
| Fitness | `fitness_outdoor_routes` | 1 |
| Fitness | `fitness_outdoor_events` | 1 |
| Fitness | `fitness_outdoor_reviews` | 1 |
| Medication | `medication_reminders` | 4 |
| Marketing | `marketing_profile` | 6 |
| Marketing | `marketing_subscriptions` | 1 |
| Marketing | `marketing_discounts` | 1 |
| Chats/support | `conversations` | 2 |
| Chats/support | `messages` | 0 |
| Chats/support | `chat_support` | 0 |
| Period tracker | `tracker_logs` | 0 |
| Transactions | `transaction_records` | 0 |
| Subscriptions | `subscription_plans` | 0 |
| Subscriptions | `user_subscriptions` | 0 |
| Notifications | `notifications` | 0 |
| Notifications | `notification_campaigns` | 0 |
| Security | `security_threats` | 0 |
| BedTracker | `bed_tracker_facilities` | 0 |
| BedTracker | `bed_tracker_alerts` | 0 |
| FacilityScout | `data_collectors`, `collector_submissions`, `facility_scout_referrals` | 0 |
| Jobs | `job_postings`, `job_applications` | 0 |
| HCP | `hcp_verifications` | 0 |
| AI analytics | `fitness_ai_calls`, `fitness_ai_campaigns` | 0 |

Useful existing database functions from local schema docs:

- `get_platform_overview_metrics(time_filter text)`: intended platform overview RPC.
- `get_dashboard_metrics()`: existing dashboard metrics RPC.
- `capture_daily_metrics()`: existing snapshot/capture function.
- `get_body_part_stats()`: usable for symptom/anatomy body part analytics.
- `get_registrar_trails(days_back integer)`: usable for registrar/location trails.
- `get_conversations(p_user_id uuid, p_limit integer)`: chat conversations API helper.
- `admin_change_facility_status(...)`, `admin_delete_medication_reminder(...)`, and content insert/update RPCs: operational admin actions.

## Current Hardcoded Dashboard Surfaces

### Main Platform Dashboard

File: `app/(dashboard)/dashboard/page.tsx`

Hardcoded KPIs:

- Total Users: `45,234`
- Facilities: `1,287`
- Revenue MTD: `₵287K`
- Transactions: `8,934`
- AI Queries/Day: `23,450`
- Premium Subs: `4,812`
- HCPs: `3,420`
- Security Score: `82/100`

Hardcoded sub-components:

- `CriticalAlerts.tsx`: fake MFA/API alert and stale date.
- `RevenueTrendChart.tsx`: static revenue chart.
- `RevenueStreams.tsx`: static revenue stream values.
- `UsersByPlan.tsx`: static plan distribution.
- `FeatureUsage.tsx`: static usage bars.
- `ActivityFeed.tsx`: static activity events.
- `AIHubOverview.tsx`: static model accuracy, flags, anomalies.
- `RegionalCoverage.tsx`: static facilities/users by region.
- `HealthFeaturesStatus.tsx`: static feature statuses and counts.
- `PendingTasks.tsx`: static pending queues.
- `ComplianceGRA.tsx`: hardcoded GRA ID, VAT filing, scan date, encryption claims.
- `SystemHealth.tsx`: static API latency, DB latency, uptime, sessions, Firebase status.

Action:

- Replace with `useGetDashboardOverviewStats` backed by `get_platform_overview_metrics`.
- Extend the RPC or add server APIs for metrics that cross Supabase tables or require calculation windows.
- Remove/hide revenue, transaction, AI, security score, and compliance claims until source tables contain real data.

### Admins

Files:

- `app/(dashboard)/admins/_components/AdminStats.tsx`
- `app/(dashboard)/admins/_components/ReportsTab.tsx`
- `app/(dashboard)/admins/_components/RolesPermissionsTab.tsx`
- `app/(dashboard)/admins/_components/AdminTable.tsx`

Hardcoded metrics:

- Total Admins `1`, Active `1`, Pending `0`, Inactive `0`, MFA Not Set `1`, Online Now `1`.
- Reports charts use static arrays.
- Roles matrix is static.
- Admin sessions table source is not wired.

Supabase support:

- `user_profiles` includes `is_admin`, `admin_role`, `admin_permissions`, `requires_password_change`, `status`, `last_active`.
- `activity_logs` has real data.
- `admin_activity_logs` and `admin_sessions` exist but are empty.

Action:

- Wire total/active/admin-role counts from `user_profiles`.
- Wire activity feed from `activity_logs`.
- Hide MFA and online-now metrics until `admin_sessions` is populated and MFA state is persisted.

### Users

Files:

- `app/(dashboard)/users/_components/UsersStats.tsx`
- `app/(dashboard)/users/_components/UserSection.jsx`

Hardcoded metrics:

- `UsersStats.tsx` says Total Users `6`, Active `6`, Premium `0`, Pending Verification `0`, Flagged `0`, Delete Requests `0`.

Supabase support:

- `UserSection.jsx` already computes stats from `useUser` query data.
- Real count is `user_profiles = 8`.
- `delete_account_requests = 0`.
- No real premium subscription rows.
- No flagged user table/field was found.

Action:

- Replace `UsersStats.tsx` with the same live query pattern as `UserSection.jsx`.
- Premium should come from `user_subscriptions` only after subscription rows exist.
- Remove “Flagged” unless a `content_moderation_flags`/user risk link is implemented.

### Facilities

Files:

- `app/(dashboard)/facilities/page.tsx`
- `hooks/supabase-calls/useFacilities.ts`

Current state:

- Mostly wired to `facility_profile`, including status counts, top-rated count, reviews, and pending counts.
- Live table count is `facility_profile = 3`, `facility_reviews = 0`, `facility_offerings = 0`.

Action:

- Keep facility total/active/pending/rejected counts.
- Top Rated and Reviews should show zero or empty states until `facility_reviews` or rating tables have data.
- Regional coverage should be computed from `facility_profile.region`.
- Add PostGIS/geospatial RPC for map analytics if distance, clustering, or coverage radius is needed.

### Reviews

File: `app/(dashboard)/reviews/_components/ReviewStats.tsx`

Hardcoded metrics:

- Platform Avg Rating `4.4`
- Total Reviews `28,420`
- Flagged `12`
- Pending Approval `3`

Supabase support:

- `facility_reviews = 0`.
- Columns support `rating`, `is_published`, `is_verified_visit`, `helpful_count`.
- No moderation status column on `facility_reviews`; flagged review metrics would need `content_moderation_flags` or a new field.

Action:

- Replace total and average rating with live aggregates from `facility_reviews`.
- Remove/hide “Flagged” and “Pending Approval” until moderation workflow exists.

### Chats

Files:

- `app/(dashboard)/chats/_components/ChatStats.tsx`
- `app/(dashboard)/chats/_components/GroupsTab.tsx`
- `app/(dashboard)/chats/_components/SupportTab.tsx`
- `hooks/supabase-calls/useChat.ts`
- `hooks/supabase-calls/useConversation.ts`

Hardcoded metrics:

- Total Groups `48`
- Group Members `12,840`
- Unread Support `5`
- Avg Response `2m 14s`
- Satisfaction `94%`

Supabase support:

- `conversations = 2`, `conversation_members = 0`, `messages = 0`, `chat_support = 0`.
- `chat_support` has useful columns: `status`, `priority`, `assigned_to`, `assigned_at`, `resolved_at`, `response_time_minutes`, `category`, `tags`.

Action:

- Wire group count from `conversations` where `is_group = true`.
- Wire support counts from `chat_support`.
- Remove/hide satisfaction until a rating/CSAT table exists.
- Avg response can be computed from `chat_support.response_time_minutes` once rows exist.

### Transactions And Revenue

Files:

- `app/(dashboard)/transactions/_components/TransactionStats.tsx`
- `RecentTransactionsTab.tsx`
- `FailedTransactionsTab.tsx`
- `SubscriptionsTab.tsx`
- `ServiceChargeTab.tsx`
- `PaymentMethods.tsx`
- `RevenueAnalytics.tsx`
- `TaxVATTab.tsx`

Hardcoded metrics/data:

- Total Transactions `3,841`
- Total Revenue `₵142,800`
- Total Customers `12,480`
- Gross Profit `₵127,540`
- Recent/failed/refund/subscription rows are fake.
- Service charge rates and service fee revenue are fake.
- Payment method split is fake.
- VAT/GRA summary is fake.

Supabase support:

- `transaction_records = 0`
- `escrow_transactions = 0`
- `user_subscriptions = 0`
- `subscription_plans = 0`
- `marketing_subscriptions = 1` is plan/product configuration, not paid subscriptions.

Action:

- Remove/hide revenue KPIs, tax/VAT summary, gross profit, customer revenue, payment split, churn, renewal revenue, and service charge revenue until payment integration writes to `transaction_records`.
- Keep the page but show an empty-state financial control center with “awaiting transaction pipeline”.
- Create custom API/RPC once Paystack/MoMo/card events are captured.

### Fitness

Files:

- `app/(dashboard)/fitness/page.tsx`
- `app/(dashboard)/fitness/_tabs/DashboardTab.tsx`
- `app/(dashboard)/fitness/_tabs/ScheduleTab.tsx`

Hardcoded metrics:

- Fitness Users `8,247`
- Active Plans `184`
- Live Challenges `8`
- Exercises Library `1,240`
- FitCoins Issued `2.4M`
- AI-Generated Plans `42`
- Dashboard tab: Active Today, Avg Streak, Avg Completion, Top Challenges, Most Used Plans, FitCoins Leaderboard, Top Exercises by Usage.
- Schedule pipeline: Today `12`, Pending `4`, Approved `84`.

Supabase support:

- `fitness_exercises = 255`
- `fitness_plans = 1`
- `fitness_challenges = 1`
- `fitness_challenge_participants = 1`
- `fitness_generated_workouts = 6`
- `fitness_onboarding_selections = 1`
- `fitness_users = 0`
- `fitness_content_schedule = 0`
- `fitness_ai_calls = 0`

Action:

- Replace page KPIs with live counts.
- Remove FitCoins until a ledger table exists.
- Replace AI plans with `fitness_generated_workouts` count.
- Hide active today, streaks, completion, top usage, and leaderboard until workout/exercise event logs are populated.
- Schedule tab can use `fitness_content_schedule`, but should show zero state now.

### Diseases And Symptoms

Files:

- `app/(dashboard)/diseases/page.tsx`
- `app/(dashboard)/symptoms/page.tsx`
- `hooks/supabase-calls/useCondition.ts`
- `hooks/supabase-calls/useSymptoms.ts`

Current state:

- Conditions and symptoms have the best analytics foundation.
- `useConditionStats` and `useSymptomStats` already compute several live counts.

Hardcoded metrics to remove:

- Disease total likes `124K`.
- Disease average engagement `4.7`.
- Symptom verification rate `94%`.
- Static growth deltas like `+12 month` and `+8.4% month` unless computed from timestamps.

Supabase support:

- Conditions `33`, Symptoms `3`, Categories `44`, Body parts `48`.
- No likes/engagement table exists for these modules.

Action:

- Keep total, category, systemic, top category/body part.
- Remove likes, engagement, verification rate unless tracking columns/events are added.

### Healthy Living

File: `app/(dashboard)/healthy_living/page.tsx`

Current state:

- Total Articles is live from `healthy_living_info`.
- Hardcoded Categories `12`, Total Views `48K`, Avg Rating `4.8`.

Supabase support:

- `healthy_living_info = 3`
- Columns include `view_count`, `status`, `is_featured`, `content_type`, `reading_time_minutes`.
- No rating table/column found.

Action:

- Compute total views from `sum(view_count)`.
- Compute categories only if category taxonomy is modeled; otherwise rename to “Content Types”.
- Remove average rating until rating/helpfulness data exists.

### FAQ

File: `app/(dashboard)/faq/_components/FAQStats.tsx`

Hardcoded metrics:

- Active FAQs `20`
- AI Deflection Rate `41%`
- Categories `9`
- Views This Month `6,280`

Supabase support:

- `faqs = 1`, `faq_categories = 2`.
- Columns include `view_count`, `helpful_count`, `not_helpful_count`, `status`, `is_featured`.

Action:

- Wire active FAQ count, category count, total views/helpfulness.
- Remove AI deflection until support tickets are tagged as deflected/resolved by FAQ or AI.

### Medication Reminder

File: `app/(dashboard)/medication-reminder/_components/MedicationStats.tsx`

Current state:

- Total and active reminders are live.
- Adherence Rate `82%` is hardcoded.

Supabase support:

- `medication_reminders = 4`.
- No medication taken/skipped event table found.

Action:

- Keep total and active.
- Remove adherence rate until reminder delivery and user acknowledgement events exist.

### Delete Account Requests

File: `app/(dashboard)/delete-account-request/_components/DeleteRequestStats.tsx`

Hardcoded metrics:

- Pending Review `4`
- In Verification `2`
- In Grace Period `3`
- Completed `41`
- Cancelled `6`

Supabase support:

- `delete_account_requests = 0`.
- Columns support status, review, rejection, export request metadata.

Action:

- Wire counts by `status`.
- Remove “In Verification” and “Grace Period” unless those statuses are formally used.

### Task Manager

Files:

- `app/(dashboard)/tasks/_components/TaskStats.tsx`
- `app/(dashboard)/tasks/_components/KanbanBoard.tsx`

Hardcoded metrics:

- New Tasks `4`, In Progress `6`, Under Review `3`, Completed `12`.
- Kanban board data is local/static.

Supabase support:

- No task table found.

Action:

- Remove the metrics or create an `admin_tasks` table before treating the task module as live.

### Placeholder Modules

Files:

- `app/(dashboard)/ai-hub/*`
- `app/(dashboard)/bedtracker/page.tsx`
- `app/(dashboard)/facilityscout/page.tsx`
- `app/(dashboard)/jobs/page.tsx`
- `app/(dashboard)/medication-enquiry/page.tsx`
- `app/(dashboard)/notifications/page.tsx`
- `app/(dashboard)/security/page.tsx`

Supabase support exists for many of these, but rows are currently zero:

- BedTracker: `bed_tracker_facilities`, `bed_tracker_alerts`, `ambulance_dispatches`.
- FacilityScout: `data_collectors`, `collector_submissions`, `facility_scout_referrals`.
- Jobs: `job_postings`, `job_applications`.
- Medication Enquiry: `medication_enquiries`, `escrow_transactions`.
- Notifications: `notification_campaigns`, `notification_templates`, `notification_automation_rules`, `platform_broadcasts`.
- Security: `security_threats`, `admin_sessions`, `admin_activity_logs`.
- AI: `fitness_ai_calls`, `fitness_ai_campaigns`, `content_moderation_flags`.

Action:

- Keep as placeholders or ship zero-state dashboards.
- Do not show fake badges/counts in navigation once the analytics refactor starts.

## Metrics To Remove Or Hide Now

Remove or hide until the underlying events/tables exist:

- Revenue MTD, Total Revenue, Gross Profit, VAT payable, payment method share, renewals, upgrades, churn, service fee revenue.
- AI Queries/Day, model accuracy, anomaly alerts, AI content flags, AI deflection rate, AI cost analytics.
- Premium Subs and Users by Plan, because `user_subscriptions` and `subscription_plans` are empty.
- Security Score, MFA Not Set, Online Now, API capacity, uptime, DB latency, last security scan.
- Support satisfaction, average response time, unread support, unless `chat_support` rows and CSAT are added.
- FitCoins issued, fitness streak, active today, average completion, top exercises by usage, most-used plans, leaderboard.
- Reviews total/average/flagged/pending, because `facility_reviews` is empty and moderation data is not linked.
- Medication adherence rate.
- Disease likes and engagement.
- Healthy Living average rating.
- FAQ AI deflection.
- Delete account grace/verification pipeline unless statuses are enforced.
- Task metrics until an `admin_tasks` table exists.
- Regional user coverage until user region/location fields are captured consistently.
- Compliance/GRA identifiers and filing deadlines unless sourced from settings/compliance tables.

## Metrics Safe To Wire Immediately With Supabase SDK

These are compatible with Supabase SDK count/select/grouping patterns:

- Total users, active users, admin users, users by role/status from `user_profiles`.
- Total facilities and facilities by status/type/region from `facility_profile`.
- Pending onboarding requests from `onboarding_requests`.
- Activity log feed and activity counts from `activity_logs`.
- Conditions, symptoms, body part/category counts from content tables.
- Healthy living article count, published/draft count, featured count, total views from `healthy_living_info`.
- FAQ count, active categories, helpful/not helpful totals from `faqs` and `faq_categories`.
- Fitness exercise/plan/challenge/trainer/outdoor counts.
- Generated workouts count from `fitness_generated_workouts`.
- Medication reminder total/active from `medication_reminders`.
- Marketing campaigns by status from `marketing_profile`.
- Marketing subscriptions and discounts counts from `marketing_subscriptions` and `marketing_discounts`.
- Conversations/group count from `conversations`.
- Delete account requests by status from `delete_account_requests`.
- Notification counts from `notifications` once rows exist.

## Custom APIs And RPCs Needed

Use Postgres RPCs for aggregate-heavy dashboard reads. Use Next.js route handlers or Supabase Edge Functions when data must combine Supabase, payment providers, push providers, external AI logs, or security checks.

### 1. `get_platform_overview_metrics(time_filter text)`

Status: referenced by `hooks/supabase-calls/useDashboard.ts`.

Should return:

```json
{
  "totals": {
    "users": 8,
    "facilities": 3,
    "admins": 1,
    "conditions": 33,
    "symptoms": 3,
    "fitnessExercises": 255
  },
  "deltas": {
    "usersPct": 0,
    "facilitiesPct": 0
  },
  "queues": {
    "pendingFacilities": 0,
    "onboardingRequests": 1,
    "deleteRequests": 0,
    "supportTickets": 0
  },
  "status": {
    "generatedAt": "timestamp"
  }
}
```

Implementation:

- Count from `user_profiles`, `facility_profile`, `conditions`, `symptoms`, `fitness_exercises`, `onboarding_requests`, `delete_account_requests`, `chat_support`.
- Compute deltas by comparing `created_at` inside the selected time window with the previous same-length window.
- Return `null` for unavailable domains rather than fake numbers.

### 2. `get_admin_dashboard_metrics(time_filter text)`

Purpose:

- Admin counts, active admins, pending invites, recent admin activity, session count, MFA gap.

Tables:

- `user_profiles`, `user_invites`, `activity_logs`, `admin_activity_logs`, `admin_sessions`.

Dependency:

- MFA requires a persisted MFA state. Until then return `mfaNotSet: null`.

### 3. `get_facility_dashboard_metrics(time_filter text)`

Purpose:

- Total/active/pending/rejected facilities, facilities by type, facilities by region, top rated, reviews total/average.

Tables:

- `facility_profile`, `facility_reviews`, `facility_favorites`, `facility_offerings`.

Notes:

- Top-rated should be calculated only from real review rows.
- Map analytics may need PostGIS RPC for bounding boxes, clusters, and nearest-facility searches.

### 4. `get_user_dashboard_metrics(time_filter text)`

Purpose:

- Total users, active users, new users, deleted users, by role/type/status/sex, users with push token, fitness onboarding completion.

Tables:

- `user_profiles`, `delete_account_requests`, `user_subscriptions`.

Notes:

- “Active” should be based on `last_active` within a selected window, not status alone.

### 5. `get_content_dashboard_metrics(time_filter text)`

Purpose:

- Conditions/symptoms/healthy living/FAQ totals, published/draft/pending statuses, view totals, body part/category coverage.

Tables:

- `conditions`, `symptoms`, `categories`, `body_parts`, `healthy_living_info`, `faqs`, `faq_categories`.

Notes:

- Engagement requires event tables. Do not infer engagement from content counts.

### 6. `get_fitness_dashboard_metrics(time_filter text)`

Purpose:

- Exercises, plans, challenges, participants, generated workouts, onboarding completions, outdoor routes/events/reviews, trainers.

Tables:

- `fitness_exercises`, `fitness_plans`, `fitness_challenges`, `fitness_challenge_participants`, `fitness_generated_workouts`, `fitness_onboarding_selections`, `fitness_outdoor_*`, `fitness_trainers`, `fitness_content_schedule`.

Needs new instrumentation:

- Workout sessions and exercise logs must be populated before active users, streaks, completion rate, top exercises, and leaderboard are real.
- FitCoins needs a ledger table, for example `fitness_coin_ledger`.

### 7. `get_transaction_analytics(time_filter text)`

Purpose:

- Revenue, transaction count, payment split, failed payments, refunds, fees, VAT, subscriptions, churn.

Tables:

- `transaction_records`, `escrow_transactions`, `user_subscriptions`, `subscription_plans`, future payment webhook tables.

Needs custom API:

- Payment provider webhook ingestion: Paystack/MoMo/card provider to `transaction_records`.
- Financial reporting should be server-only with admin/service-role access.
- VAT/GRA reports should be generated from immutable transaction records, not frontend constants.

### 8. `get_support_analytics(time_filter text)`

Purpose:

- Tickets by status/priority/category, unread/unassigned counts, SLA breach count, average first response, average resolution time.

Tables:

- `chat_support`, `conversations`, `messages`, `conversation_members`, `message_reads`.

Needs new instrumentation:

- First response timestamp.
- CSAT rating table or fields.
- Assignment/resolution event log.

### 9. `get_ai_analytics(time_filter text)`

Purpose:

- AI calls by module/model/status, token usage, cost estimate, latency, failed calls, moderation flags.

Tables:

- `fitness_ai_calls`, `fitness_ai_campaigns`, `content_moderation_flags`.

Needs custom API:

- Every AI route should log model name, prompt category, response time, tokens, status, cost, and user/admin/module context.

### 10. `get_security_dashboard(time_filter text)`

Purpose:

- Admin sessions, MFA coverage, threat counts, severity, audit events, suspicious IPs, policy exceptions.

Tables:

- `admin_sessions`, `admin_activity_logs`, `activity_logs`, `security_threats`.

Needs custom API:

- Server-side session telemetry.
- Threat event ingestion.
- MFA status storage.
- Security score algorithm with transparent inputs.

### 11. `get_notification_analytics(time_filter text)`

Purpose:

- Campaigns sent, delivery/read/failure counts, templates, automation rule execution, broadcast performance.

Tables:

- `notification_campaigns`, `notification_templates`, `notification_automation_rules`, `platform_broadcasts`, `notifications`.

Needs custom API:

- Push provider delivery callbacks or scheduled reconciliation.

### 12. `get_bedtracker_analytics(time_filter text)`

Purpose:

- Bed availability, occupancy rate, alerts, ambulance dispatch status, facility coverage.

Tables:

- `bed_tracker_facilities`, `bed_tracker_alerts`, `ambulance_dispatches`.

Needs custom API:

- Facility-side update endpoint or realtime channel.
- Alert threshold automation.
- Dispatch lifecycle events.

### 13. `get_facilityscout_analytics(time_filter text)`

Purpose:

- Collector activity, submissions by status, rewards owed/paid, approval rate, leaderboard.

Tables:

- `data_collectors`, `collector_submissions`, `facility_scout_referrals`.

Needs custom API:

- Submission review workflow.
- Reward ledger/payment status.
- Anti-fraud scoring if rewards become monetary.

## Recommended Data Model Additions

Add only after confirming the product workflow:

- `admin_tasks`: task manager source of truth.
- `analytics_events`: generic event capture for feature usage, views, searches, clicks, exports, broadcasts, and admin actions not already logged.
- `payment_webhook_events`: immutable payment provider webhook log.
- `fitness_coin_ledger`: FitCoins earned/spent/adjusted.
- `support_ticket_events` or expanded `chat_support`: first response, assignment, escalation, CSAT.
- `compliance_settings`: VAT rate, GRA ID, filing due dates, legal/compliance status.
- `system_health_snapshots`: API latency, DB latency, uptime, provider health if these will be shown in-app.
- `ai_usage_logs`: cross-module AI observability, not just fitness AI calls.

## Supabase Usage Plan

Use Supabase tools in this order:

1. `select(..., { count: "exact", head: true })` for basic counts.
2. Filtered counts for status and simple queue cards.
3. Views/RPCs for grouped counts by status/type/region/month.
4. Materialized daily snapshots for trends and expensive aggregates.
5. Realtime subscriptions only for operational queues that need live updates: support, facility approvals, BedTracker, notifications.
6. Storage signed/public URLs only for media display; do not treat storage usage as an analytics source unless a storage audit table is added.
7. Service-role route handlers for sensitive admin analytics.

## Weekly Timeline

### Week 1: Audit, Metric Contract, And Cleanup

Deliverables:

- Create a metric registry mapping every KPI/card/chart to table, query, owner, and status.
- Remove or hide all unsupported metrics listed above.
- Add empty states for zero-data modules.
- Standardize `KpiCard` loading/empty/error states.
- Confirm final status vocabulary for facilities, users, content, tickets, delete requests, campaigns, subscriptions.

### Week 2: Core Supabase Wiring

Deliverables:

- Wire main dashboard counts from `get_platform_overview_metrics`.
- Wire users, admins, facilities, content, FAQ, marketing, medication, and delete request stats from live tables.
- Replace hardcoded activity feed with `activity_logs`.
- Replace regional facility coverage with `facility_profile.region`.
- Add React Query hooks for dashboard stats with shared time filters.

### Week 3: Content, Fitness, And Facility Analytics

Deliverables:

- Add `get_content_dashboard_metrics`.
- Add `get_fitness_dashboard_metrics`.
- Add `get_facility_dashboard_metrics`.
- Wire conditions/symptoms/healthy living/FAQ charts and tables.
- Wire fitness library counts, generated workouts, challenges, outdoor entities.
- Remove FitCoins/streak/completion/leaderboard until event data exists.

### Week 4: Operational Queues And Admin Controls

Deliverables:

- Wire support tickets from `chat_support`.
- Wire conversations/groups from `conversations` and `conversation_members`.
- Wire notification empty state and campaign/template counts.
- Wire onboarding requests and delete account request status counts.
- Design `admin_tasks` if task manager remains in scope.

### Week 5: Financial Data Pipeline

Deliverables:

- Implement payment webhook ingestion into `transaction_records` and `payment_webhook_events`.
- Add `get_transaction_analytics`.
- Wire transaction table, failed/refund filters, payment method breakdown, revenue trend.
- Keep VAT/GRA report disabled until transactions are validated.
- Add finance-only permission checks on transaction APIs.

### Week 6: Enterprise Modules

Deliverables:

- Implement BedTracker API contracts and wire zero/live states.
- Implement FacilityScout submission/reward metrics.
- Implement HCP verification metrics.
- Implement Jobs metrics.
- Implement medication enquiry and escrow status analytics if product workflows are ready.

### Week 7: AI, Security, Compliance, And Health

Deliverables:

- Implement AI usage logging across AI routes.
- Add `get_ai_analytics`.
- Add admin session telemetry and `get_security_dashboard`.
- Replace fake security score with a transparent score or remove it.
- Add compliance settings table before showing GRA/VAT/compliance values.
- Add system health snapshots only if monitoring source is reliable.

### Week 8: Hardening, QA, And Release

Deliverables:

- Load test all dashboard RPCs.
- Add RLS/service-role review for sensitive metrics.
- Add cached daily snapshots for expensive aggregates.
- Add export endpoints where needed.
- QA every dashboard tab with no-data, partial-data, and populated-data states.
- Document analytics ownership and how new modules add metrics.

## Suggested Implementation Order By File

1. `hooks/supabase-calls/useDashboard.ts`: expand return contract and error handling.
2. `app/(dashboard)/dashboard/page.tsx`: replace hardcoded KPI cards with hook data.
3. `app/(dashboard)/dashboard/_components/*`: convert each static component to accept data props.
4. `app/(dashboard)/users/_components/UsersStats.tsx`: replace hardcoded values.
5. `app/(dashboard)/admins/_components/AdminStats.tsx`: replace hardcoded values and hide unsupported MFA/session metrics.
6. `app/(dashboard)/reviews/_components/ReviewStats.tsx`: wire real review totals or empty state.
7. `app/(dashboard)/chats/_components/ChatStats.tsx`: wire `conversations` and `chat_support`.
8. `app/(dashboard)/transactions/_components/*`: hide fake data until transaction pipeline exists.
9. `app/(dashboard)/fitness/page.tsx` and `_tabs/DashboardTab.tsx`: wire safe counts, remove unsupported engagement/FitCoins metrics.
10. `app/(dashboard)/healthy_living/page.tsx`, `symptoms/page.tsx`, `diseases/page.tsx`, `faq/_components/FAQStats.tsx`: keep safe counts and remove fake engagement values.

## Acceptance Criteria

- No user-facing KPI shows a hardcoded business number unless it is clearly marked as mock/demo.
- Every visible metric has a source table/RPC/API documented in the metric registry.
- Empty datasets render honest empty states, not fabricated “enterprise scale” numbers.
- Sensitive analytics use server-side service-role APIs or RPCs with appropriate admin checks.
- Time filters affect all dashboard cards consistently.
- Deltas compare against the previous equivalent period.
- Custom APIs return `null` for unsupported metrics rather than defaulting to fake zero or fake growth.

