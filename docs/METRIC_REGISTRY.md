# Metric Registry

This registry is the source map for admin dashboard KPIs, charts, and
operational counts. It was seeded from
`ADMIN_DASHBOARD_SUPABASE_ANALYTICS_ROADMAP.md` for Epic 10.1.

Statuses:

- `live`: backed by existing table/query/RPC today.
- `rpc-needed`: source tables exist, but shared aggregation/RPC is needed.
- `empty-state`: table exists but current data is expected to be empty or sparse.
- `instrumentation-needed`: metric should stay hidden/null until event or provider telemetry exists.
- `unsupported`: no reliable source exists; do not show as a real metric.

## Main Platform Dashboard

| Surface | Metric | Source | Query/RPC | Owner | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `dashboard/page.tsx` | Total Users | `user_profiles` | `get_platform_overview_metrics(time_filter)` | Epic 10.2/10.4 | rpc-needed | Count all non-deleted profiles; delta from previous equal window. |
| `dashboard/page.tsx` | Facilities | `facility_profile` | `get_platform_overview_metrics(time_filter)` | Epic 10.2/10.4 | rpc-needed | Include status breakdown for pending/approved/rejected. |
| `dashboard/page.tsx` | Revenue MTD | `transaction_records` | future transaction analytics | Epic 15 | empty-state | Show null/empty until payment ingestion writes real rows. |
| `dashboard/page.tsx` | Transactions | `transaction_records` | future transaction analytics | Epic 15 | empty-state | Current zero is valid only as an empty state, not fake growth. |
| `dashboard/page.tsx` | AI Queries/Day | `fitness_ai_calls` | AI analytics API/RPC | Epic 29 | empty-state | Use real call logs only; no model-accuracy claims. |
| `dashboard/page.tsx` | Premium Subs | `user_subscriptions` | subscription analytics | Epic 16 | empty-state | Do not infer from marketing records. |
| `dashboard/page.tsx` | HCPs | `hcp_verifications` | `get_platform_overview_metrics(time_filter)` | Epic 10.2/25 | rpc-needed | Count verified/pending HCP verification rows. |
| `dashboard/page.tsx` | Security Score | `security_threats`, `admin_sessions`, settings | security dashboard API | Epic 28 | instrumentation-needed | Hide until transparent scoring inputs exist. |
| `CriticalAlerts.tsx` | Critical alerts | `security_threats`, queue tables | dashboard/security APIs | Epic 10.4/28 | rpc-needed | Show real unresolved critical/warning items only. |
| `RevenueTrendChart.tsx` | Revenue trend | `transaction_records` or snapshots | transaction analytics | Epic 10.8/15 | empty-state | Replace static chart with empty state until transactions exist. |
| `RevenueStreams.tsx` | Revenue streams | `transaction_records`, subscriptions, ads | transaction analytics | Epic 15 | empty-state | Do not show VAT/GRA/revenue splits yet. |
| `UsersByPlan.tsx` | Users by plan | `user_subscriptions`, `subscription_plans` | subscription analytics | Epic 10.8/16 | empty-state | Use shadcn donut once rows exist. |
| `FeatureUsage.tsx` | Feature usage | `analytics_events` | analytics event aggregates | Epic 30 | instrumentation-needed | Table/helper now exist with seed mobile events; keep explicit instrumentation-needed state until Epic 30 defines the final event taxonomy and aggregation surface. |
| `ActivityFeed.tsx` | Recent activity | `activity_logs` | direct service-role query/API | Epic 10.5 | live | 1,731 rows in roadmap snapshot. |
| `AIHubOverview.tsx` | AI usage/cost/moderation | `fitness_ai_calls`, `content_moderation_flags` | AI Hub APIs | Epic 29 | empty-state | New Epic 8.1 APIs already expose safe empty states. |
| `RegionalCoverage.tsx` | Facilities by region | `facility_profile.region` | grouped query/RPC | Epic 10.4/13.5 | rpc-needed | Users by region unsupported unless user location is modeled. |
| `HealthFeaturesStatus.tsx` | Content/fitness/medication status | content + fitness + medication tables | `get_platform_overview_metrics(time_filter)` | Epic 10.2/10.4 | rpc-needed | Use exact counts and zero states. |
| `PendingTasks.tsx` | Pending queues | facilities, delete requests, HCP, submissions, reviews | `get_platform_overview_metrics(time_filter)` | Epic 10.2/10.4 | rpc-needed | Do not include fake admin tasks until `admin_tasks` exists. |
| `ComplianceGRA.tsx` | GRA/VAT/compliance | none reliable today | compliance settings + transactions | Epic 28/15 | instrumentation-needed | Hide hardcoded GRA ID, scan date, and encryption claims. |
| `SystemHealth.tsx` | API/DB/env health | `/api/health` | health endpoint | Epic 8.6/10.4 | live | Use explicit provider config states, not fake all-green status. |

## Admin And Access

| Surface | Metric | Source | Query/RPC | Owner | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `admins/AdminStats.tsx` | Total admins | `user_profiles` | filtered count `is_admin = true` or admin roles | Epic 11 | live | Include role/status breakdown. |
| `admins/AdminStats.tsx` | Active admins | `user_profiles.status` | filtered count | Epic 11 | live | Do not use online-now until sessions are populated. |
| `admins/AdminStats.tsx` | MFA not set | `user_profiles.mfa_enabled` | filtered count | Epic 11/28 | live | Only if column is trusted by auth flow. |
| `admins/ActivityLogsTab.tsx` | Admin activity | `activity_logs`, `admin_activity_logs` | direct query | Epic 11 | live | `admin_activity_logs` may be empty; fall back honestly. |
| `admins/ReportsTab.tsx` | Reports charts | `activity_logs`, `user_profiles` | grouped query | Epic 11 | rpc-needed | Replace static report arrays. |

## Users

| Surface | Metric | Source | Query/RPC | Owner | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `users/UsersStats.tsx` | Total users | `user_profiles` | direct count/hook | Epic 12 | live | Should match `UserSection` live query pattern. |
| `users/UsersStats.tsx` | Active users | `user_profiles.status` | filtered count | Epic 12 | live | Define status vocabulary. |
| `users/UsersStats.tsx` | Premium users | `user_subscriptions` | subscription query | Epic 16 | empty-state | Do not fabricate from profile fields. |
| `users/UsersStats.tsx` | Pending verification | `user_profiles.status` | filtered count | Epic 12 | live | Use `pending_verification`. |
| `users/UsersStats.tsx` | Flagged users | future moderation/risk link | none | Epic 28 | unsupported | Hide until user risk model exists. |
| `users/UsersStats.tsx` | Delete requests | `delete_account_requests` | filtered count | Epic 21 | live | Current zero should render as empty state. |

## Facilities And Reviews

| Surface | Metric | Source | Query/RPC | Owner | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `facilities/page.tsx` | Facility totals/status | `facility_profile` | existing facilities hook | Epic 13 | live | Already mostly wired. |
| `facilities/page.tsx` | Top rated / avg rating | `facility_reviews` | `get_facility_dashboard_metrics(time_filter)` | Epic 13 | live | Empty reviews show an explicit no-review state; do not infer from `facility_profile.rating_average`. |
| `RegionalCoverage.tsx` | Facility regional coverage | `facility_profile.region` | grouped query/RPC | Epic 13.5 | rpc-needed | Feed dashboard chart. |
| `reviews/ReviewStats.tsx` | Total reviews | `facility_reviews` | review stats hook | Epic 13 | live | Current table may be empty. |
| `reviews/ReviewStats.tsx` | Average rating | `facility_reviews.rating` | aggregate query | Epic 13 | live | Null when no rows. |
| `reviews/ReviewStats.tsx` | Flagged/pending reviews | moderation workflow | none | Epic 28 | unsupported | Hide unless moderation status is modeled. |

## Chats And Support

| Surface | Metric | Source | Query/RPC | Owner | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `chats/ChatStats.tsx` | Total groups | `conversations` | `is_group = true` count | Epic 14 | live | Current rows are sparse. |
| `chats/ChatStats.tsx` | Group members | `conversation_members` | count | Epic 14 | live | Zero is valid. |
| `chats/ChatStats.tsx` | Unread support | `chat_support` | status/priority count | Epic 14 | empty-state | Use queue empty state. |
| `chats/ChatStats.tsx` | Avg response | `chat_support.response_time_minutes` | aggregate query | Epic 14 | empty-state | Null until rows exist. |
| `chats/ChatStats.tsx` | Satisfaction | `chat_support.satisfaction_rating` | support analytics | Epic 14 | empty-state | Mobile can now rate closed tickets; null/empty remains valid until closed rated tickets exist. |

## Transactions And Revenue

| Surface | Metric | Source | Query/RPC | Owner | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `transactions/TransactionStats.tsx` | Total transactions | `transaction_records` | transaction analytics API/RPC | Epic 15 | empty-state | Current table has no rows. |
| `transactions/TransactionStats.tsx` | Total revenue | `transaction_records.amount` | transaction analytics API/RPC | Epic 15 | empty-state | Sum completed payments only once ingestion exists. |
| `transactions/*Tabs.tsx` | Recent/failed/refunds | `transaction_records` | filtered query | Epic 15 | empty-state | Remove mock rows. |
| `PaymentMethods.tsx` | Payment method split | `transaction_records.payment_provider` | grouped query | Epic 15 | empty-state | Use shadcn donut after real rows. |
| `RevenueAnalytics.tsx` | Revenue trend | `transaction_records.created_at`, snapshots | grouped query/RPC | Epic 15 | empty-state | Use shadcn trend chart. |
| `TaxVATTab.tsx` | GRA/VAT summary | validated transaction tax fields | none today | Epic 15/28 | instrumentation-needed | Hide until finance pipeline exists. |

## Content And Knowledge Base

| Surface | Metric | Source | Query/RPC | Owner | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `diseases/page.tsx` | Conditions | `conditions` | existing condition stats hook | Epic 19 | live | Keep total/category/systemic counts. |
| `diseases/page.tsx` | Likes/engagement | future events | none | Epic 30 | unsupported | Hide. |
| `symptoms/page.tsx` | Symptoms | `symptoms`, body-part links | existing symptom stats hook | Epic 19 | live | Verification rate unsupported. |
| `healthy_living/page.tsx` | Articles/content | `healthy_living_info` | direct query/hook | Epic 19 | live | Views from `sum(view_count)`. |
| `healthy_living/page.tsx` | Average rating | none | none | Epic 19 | unsupported | Hide until rating/helpfulness exists. |
| `faq/FAQStats.tsx` | Active FAQs/categories | `faqs`, `faq_categories` | direct counts | Epic 19 | live | Use status/category counts. |
| `faq/FAQStats.tsx` | AI deflection | support/AI events | none | Epic 29/30 | instrumentation-needed | Hide. |

## Fitness And Medication

| Surface | Metric | Source | Query/RPC | Owner | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `fitness/page.tsx` | Fitness users | `fitness_onboarding_selections` or future `fitness_users` | fitness KPI RPC/hook | Epic 18 | live | Existing hook returns safe counts. |
| `fitness/page.tsx` | Active plans | `fitness_plans` | fitness KPI RPC/hook | Epic 18 | live | Existing hook. |
| `fitness/page.tsx` | Live challenges | `fitness_challenges` | fitness KPI RPC/hook | Epic 18 | live | Existing hook. |
| `fitness/page.tsx` | Exercise library | `fitness_exercises` | fitness KPI RPC/hook | Epic 18 | live | Existing hook. |
| `fitness/page.tsx` | FitCoins issued | future ledger | none | Epic 18 | instrumentation-needed | Hide or null until ledger exists. |
| `fitness/page.tsx` | AI-generated plans | `fitness_generated_workouts` | fitness KPI RPC/hook | Epic 18/29 | live | Existing count. |
| `medication-reminder/MedicationStats.tsx` | Total/active reminders | `medication_reminders` | medication stats RPC/hook | Epic 20 | live | Already partly wired. |
| `medication-reminder/MedicationStats.tsx` | Adherence rate | future acknowledgement events | none | Epic 20 | instrumentation-needed | Hide. |

## Operational Modules

| Surface | Metric | Source | Query/RPC | Owner | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `notifications/page.tsx` | Campaigns/logs/templates/rules | `notifications`, `notification_campaigns`, `notification_templates`, `notification_automation_rules` | `/api/notifications` | Epic 8.5/27 | live | Push delivery remains Epic 27. |
| `security/page.tsx` | Threats/audit/settings | `security_threats`, `admin_activity_logs`, `security_settings` | security APIs | Epic 8.3/28 | live | Empty states are valid. |
| `ai/page.tsx` | AI calls/cost/moderation | `fitness_ai_calls`, `content_moderation_flags` | AI APIs | Epic 8.1/29 | live | Empty states are valid. |
| `bedtracker/page.tsx` | Beds/alerts/dispatch | `bed_tracker_facilities`, `bed_tracker_alerts`, `ambulance_dispatches` | `/api/bedtracker` | Epic 8.10/23 | live | Empty states are valid. |
| `facilityscout/page.tsx` | Submissions/collectors/rewards | `collector_submissions`, `data_collectors`, `facility_scout_referrals` | `/api/facilityscout` | Epic 8.10/24 | live | Empty states are valid. |
| `hcp/page.tsx` | HCP verification/chats | `hcp_verifications`, `conversations` | `/api/hcp` | Epic 8.10/25 | live | Empty states are valid. |
| `jobs/page.tsx` | Listings/applicants/plans | `job_postings`, `job_applications`, `subscription_plans` | `/api/jobs` | Epic 8.10/26 | live | Empty states are valid. |
| `delete-account-request/DeleteRequestStats.tsx` | Request status queues | `delete_account_requests` | delete request hook/API | Epic 21 | live | Replace hardcoded status cards. |

## Rules For New Metrics

- Add every new KPI/chart/table count here before shipping it.
- Prefer exact database counts over client-side derived totals.
- Return `null` for unsupported metrics; never fabricate zeros or growth.
- Deltas must compare the selected time window against the immediately
  preceding equal-length window.
- Sensitive analytics must go through admin-gated server routes or RPCs.
- Charts should use `components/charts/*` wrappers from Epic 9.
- For any metric fed by mobile activity, verify the mobile producer writes
  the same canonical table/columns before marking the admin story done.

## Mobile Producer Parity Findings

| Admin metric/source | Mobile producer status | Owning story |
| --- | --- | --- |
| `facility_reviews` for facility ratings/reviews | Fixed: mobile no longer references legacy `facility_ratings` under `app`/`src`; review-backed helpers normalize `comment_text` ↔ `comment` for UI compatibility. | Epic 13.8 |
| `chat_support` for support queues/response analytics | Fixed: mobile support creation uses authenticated `/api/chat/support`, preserving category/tags while deriving requester fields server-side; closed tickets can now submit CSAT to `satisfaction_rating`. | Epics 14.7, 14.8 |
| `analytics_events` for feature usage | Seeded: `analytics_events` table/helper exists and mobile logs facility review and support ticket create/rate events; Epic 30 still owns the final feature-usage taxonomy/dashboard aggregation. | Epic 10.10 / 30.1 |
| `cycles` / `symptoms` / `cycle_statistics` | Mobile period tracker still uses retired `tracker_logs` and old cycle math in several screens. | Epic 17.27 |
| `medication_adherence` or future adherence event table | Notification actions mutate `medication_reminders.status`; no per-dose event history is written. | Epic 20.5 |
| `delete_account_requests` | Mobile Delete Account opens a web page and signs out; it does not create a request row. | Epic 21.5 |
| `user_profiles.expo_push_token` / `fcm_token` | Token helpers exist, but no login/reinstall persistence path was found. | Epic 27.7 |
| `notifications.is_read` / `read_at` | Mobile updates `is_seen`, which does not match the canonical admin/table read-state columns. | Epic 27.8 |
