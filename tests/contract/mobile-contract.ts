/**
 * What the Expo app depends on in this repo and this database.
 *
 * This file is the frozen surface. Everything NOT listed here — 220-odd API
 * routes, every other RPC, every other table — has no external consumer and
 * can be restructured freely. That is what makes the cleanup tractable.
 *
 * ── Provenance ─────────────────────────────────────────────────────────
 * Extracted mechanically from the 4-Our-Life-App repo on 5 Sept 2026 by
 * grepping hooks/, services/, lib/ and context/ for `/api/` literals and for
 * `.rpc(` / `.from(` call sites.
 *
 * An earlier pass that covered only hooks/ and services/ found 13 routes and
 * MISSED THREE (`/api/auth/device-context`, `/api/auth/device-sign-in/
 * send-otp`, `/api/user/push-token`, all called from lib/ and context/).
 * Treat this list as a floor, and regenerate it rather than trusting it:
 *
 *     bash scripts/cleanup/regenerate-mobile-contract.sh ../4-Our-Life-App
 *
 * ── The rule ───────────────────────────────────────────────────────────
 * Old app builds live on phones for months. Changes to anything below must
 * be ADDITIVE: new optional parameters with defaults, new response fields.
 * Never drop a field, rename a route, reorder an RPC parameter, or tighten
 * an RLS policy on a listed table without shipping a mobile release first.
 */

export interface ContractRoute {
  /** Path as the mobile app calls it. */
  path: string;
  /** File under app/ that serves it, relative to the repo root. */
  file: string;
  /** HTTP verbs the mobile app relies on. */
  methods: string[];
  /** Mobile file that calls it — so you know who breaks. */
  consumer: string;
}

export const CONTRACT_ROUTES: ContractRoute[] = [
  { path: "/api/user/profile",                 file: "app/api/user/profile/route.ts",                 methods: ["GET", "PATCH"],          consumer: "hooks/use-userProfile.tsx" },
  { path: "/api/user/avatar",                  file: "app/api/user/avatar/route.ts",                  methods: ["GET", "PATCH"],          consumer: "hooks/use-userProfile.tsx" },
  { path: "/api/user/active",                  file: "app/api/user/active/route.ts",                  methods: ["POST"],                  consumer: "hooks/use-active-tracking.ts" },
  { path: "/api/user/entitlement",             file: "app/api/user/entitlement/route.ts",             methods: ["GET"],                   consumer: "hooks/use-entitlement.ts" },
  { path: "/api/user/app-config",              file: "app/api/user/app-config/route.ts",              methods: ["GET"],                   consumer: "hooks/use-my-account.ts" },
  { path: "/api/user/activity-logs",           file: "app/api/user/activity-logs/route.ts",           methods: ["GET", "POST"],           consumer: "services/activityLogsService.ts" },
  { path: "/api/user/notifications",           file: "app/api/user/notifications/route.ts",           methods: ["GET", "PATCH", "POST"],  consumer: "hooks/use-notifications.ts" },
  { path: "/api/user/favorites",               file: "app/api/user/favorites/route.ts",               methods: ["GET", "POST", "DELETE"], consumer: "hooks/use-facilities.ts" },
  { path: "/api/user/content-engagement",      file: "app/api/user/content-engagement/route.ts",      methods: ["GET", "POST", "DELETE"], consumer: "hooks/use-content-engagement.ts" },
  { path: "/api/user/delete-account-request",  file: "app/api/user/delete-account-request/route.js",  methods: ["GET", "POST", "PATCH"],  consumer: "hooks/use-my-account.ts" },
  { path: "/api/user/push-token",              file: "app/api/user/push-token/route.ts",              methods: ["PATCH"],                 consumer: "lib/push-tokens.ts" },
  { path: "/api/chat/support",                 file: "app/api/chat/support/route.ts",                 methods: ["GET", "POST", "PATCH"],  consumer: "hooks/use-support-tickets.ts" },
  { path: "/api/fitness/generate",             file: "app/api/fitness/generate/route.ts",             methods: ["POST"],                  consumer: "hooks/use-fitness-onboarding.ts" },
  { path: "/api/subscriptions/requests",       file: "app/api/subscriptions/requests/route.ts",       methods: ["GET", "PATCH"],          consumer: "hooks/use-subscription-upgrade.ts" },
  { path: "/api/auth/device-context",          file: "app/api/auth/device-context/route.ts",          methods: ["GET"],                   consumer: "lib/device-approval.ts" },
  { path: "/api/auth/device-sign-in/send-otp", file: "app/api/auth/device-sign-in/send-otp/route.ts", methods: ["POST"],                  consumer: "lib/device-approval.ts" },

  // ── Added 5 Sept 2026, when the regeneration script could finally run ─
  // All fifteen were live mobile dependencies the whole time; see the
  // provenance note above for how they were missed twice.
  { path: "/api/chat/conversations",           file: "app/api/chat/conversations/route.ts",         methods: ["GET"],                           consumer: "hooks/chat/useConversationList.ts" },
  { path: "/api/chat/messages",                file: "app/api/chat/messages/route.ts",              methods: ["GET", "POST", "PATCH", "DELETE"], consumer: "hooks/chat/useDirectMessages.ts" },
  { path: "/api/chat/messages/read",           file: "app/api/chat/messages/read/route.ts",         methods: ["POST"],                          consumer: "hooks/chat/useDirectMessages.ts" },
  { path: "/api/chat/groups",                  file: "app/api/chat/groups/route.ts",                methods: ["POST"],                          consumer: "hooks/chat/useCreateGroup.ts" },
  { path: "/api/chat/members",                 file: "app/api/chat/members/route.ts",               methods: ["GET", "POST", "PATCH"],          consumer: "hooks/chat/useGroupMembers.ts" },
  { path: "/api/chat/attachment",              file: "app/api/chat/attachment/route.ts",            methods: ["GET"],                           consumer: "app/(app)/(auth)/Chat/[id].tsx" },
  { path: "/api/period/me",                    file: "app/api/period/me/route.ts",                  methods: ["GET", "POST"],                   consumer: "features/plasence/api.ts" },
  { path: "/api/period/library",               file: "app/api/period/library/route.ts",             methods: ["GET", "POST"],                   consumer: "features/plasence/api.ts" },
  { path: "/api/period/trivia",                file: "app/api/period/trivia/route.ts",              methods: ["GET", "POST"],                   consumer: "features/plasence/api.ts" },
  { path: "/api/period/trivia/fulfillment",    file: "app/api/period/trivia/fulfillment/route.ts",  methods: ["POST"],                          consumer: "features/plasence/api.ts" },
  { path: "/api/jobs/attachment",              file: "app/api/jobs/attachment/route.ts",            methods: ["GET"],                           consumer: "app/(app)/(auth)/Jobs/apply/[id].tsx" },
  { path: "/api/medenquiry/attachment",        file: "app/api/medenquiry/attachment/route.ts",      methods: ["GET"],                           consumer: "app/(app)/(auth)/Medication/index.tsx" },
  { path: "/api/send-otp",                     file: "app/api/send-otp/route.ts",                   methods: ["POST"],                          consumer: "components/auth/OTPForm.tsx" },
  { path: "/api/verify-otp",                   file: "app/api/verify-otp/route.ts",                 methods: ["POST"],                          consumer: "components/auth/OTPForm.tsx" },
  { path: "/api/user/redeem-promo",            file: "app/api/user/redeem-promo/route.ts",          methods: ["POST"],                          consumer: "app/(app)/(auth)/(tabs)/(fitness)/premium.tsx" },
];

/**
 * Present in the tree and reachable, but deliberately dead: returns 410 Gone.
 * The mobile app references it only in a comment. Kept listed so nobody
 * "restores" it — it used to run unauthenticated `select *` scans over
 * facility_profile and leak PII.
 */
export const DEPRECATED_ROUTES = [
  { path: "/api/search/dynamic", file: "app/api/search/dynamic/route.js", expectedStatus: 410 },
];

/** Postgres functions the mobile app calls. Signatures are frozen. */
/**
 * `verify_device_sign_in_otp` and `issue_device_sign_in_otp` were BOTH missing
 * from the database when this list was regenerated on 5 Sept 2026 — the email
 * OTP fallback of device sign-in could not work at all. They exist now
 * (20260905_device_sign_in_otp_functions.sql).
 *
 * `issue_device_sign_in_otp` is listed even though the Expo app never calls it
 * directly: it is called by /api/auth/device-sign-in/send-otp, which mobile
 * DOES call. A route in the contract whose RPC is not is exactly how this was
 * missed — the route looked protected while the thing it delegates to was
 * free to vanish.
 */
export const CONTRACT_RPCS = [
  "activate_fitness_plan",
  "get_anatomy_body_part_bundle",
  "get_anatomy_body_part_items",
  "get_anatomy_premium_config",
  "get_anatomy_quiz",
  "get_anatomy_region_content",
  "get_facilities_map",
  "get_fitcoins_dashboard",
  "get_fitness_activity_history",
  "get_fitness_dashboard",
  "get_fitness_social_proof",
  "get_fitness_week",
  "get_home_carousel",
  "get_outdoor_route_pins",
  "get_public_faqs",
  "global_search",
  "global_search_v2",
  "increment_challenge_view_count",
  "increment_condition_view_count",
  "increment_exercise_view_count",
  "increment_healthy_living_view_count",
  "increment_symptom_view_count",
  "join_fitness_challenge",
  "log_anatomy_interaction",
  "log_device_attestation",
  "log_manual_activity",
  "redeem_fitcoin_reward",
  "request_subscription_upgrade",

  // Added 5 Sept 2026 with the route expansion — the device sign-in, push
  // token and app-review families. All 14 verified to exist in the database.
  "get_app_review_prompt_state",
  "get_device_sign_in_status",
  "get_streak_detail",
  "list_my_devices",
  "log_marketing_event",
  "record_app_review_prompt",
  "register_push_token",
  "report_chat_content",
  "report_device_signal",
  "request_device_sign_in",
  "resolve_device_sign_in",
  "revoke_my_device",
  "submit_app_review",
  "unregister_push_token",
  "issue_device_sign_in_otp",
  "verify_device_sign_in_otp",
] as const;

/**
 * Tables the mobile app reads or writes DIRECTLY through PostgREST.
 *
 * For these, the RLS policy *is* the API. Changing a policy on any of them
 * is a mobile change, and the failure mode is silent: PostgREST returns an
 * empty result set rather than an error, so the app renders "nothing here"
 * instead of failing. See lib/db/README.md.
 */
export const CONTRACT_TABLES = [
  "anatomy_regions",
  "categories",
  "chat_support",
  "condition_categories",
  "conditions",
  "exercise_logs",
  "exercise_sessions",
  "facility_profile",
  "facility_reviews",
  "fitness_challenge_entries",
  "fitness_challenge_leaderboard",
  "fitness_challenge_participants",
  "fitness_challenge_team_leaderboard",
  "fitness_challenge_teams",
  "fitness_challenges",
  "fitness_exercises",
  "fitness_generated_workouts",
  "fitness_onboarding_selections",
  "fitness_plan_days",
  "fitness_plan_exercises",
  "fitness_plans",
  "fitness_user_assignments",
  "healthy_living_categories",
  "healthy_living_info",
  "marketing_profile",
  "medication_adherence",
  "medication_reminders",
  "subscription_upgrade_requests",
  "symptom_categories",
  "symptoms",
  "top_rated_items",
  "user_notes",
  "user_profiles",
  "workout_reminders",

  // Added 5 Sept 2026 with the route expansion.
  "analytics_events",
  "fitness_outdoor_events",
  "fitness_outdoor_routes",
  "onboarding_requests",
] as const;
