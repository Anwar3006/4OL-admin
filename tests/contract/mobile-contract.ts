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
  { path: "/api/user/delete-account-request",  file: "app/api/user/delete-account-request/route.ts",  methods: ["GET", "POST", "PATCH"],  consumer: "hooks/use-my-account.ts" },
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

  // ── Added 9 Sept 2026 — Facility Scout mobile submission flow ─────────
  // First mobile dependency on this feature; the other six FacilityScout
  // routes remain admin-console-only. See features/facility-scout/README.md.
  { path: "/api/facilityscout/submissions/upload-url", file: "app/api/facilityscout/submissions/upload-url/route.ts", methods: ["GET"], consumer: "hooks/use-facility-scout.ts" },
];

/**
 * Present in the tree and reachable, but deliberately dead: returns 410 Gone.
 * The mobile app references it only in a comment. Kept listed so nobody
 * "restores" it — it used to run unauthenticated `select *` scans over
 * facility_profile and leak PII.
 */
// Tracked BY FILE PATH, so a `.js` -> `.ts` conversion has to be reflected
// here. E5.1 renamed this one and the suite failed immediately, which is the
// check working: the URL is unchanged and the route still returns 410.
export const DEPRECATED_ROUTES = [
  { path: "/api/search/dynamic", file: "app/api/search/dynamic/route.ts", expectedStatus: 410 },
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

  // Added 5 Sept 2026 with the features/period migration. `/api/period/trivia`
  // is a contracted route and its POST delegates here, so the RPC was as
  // exposed as the route while being free to change — the same gap that let
  // /api/auth/device-sign-in/send-otp call a function that did not exist.
  // Verified to exist with this signature; service_role only, which is why
  // mobile reaches it through the route rather than calling it directly.
  "submit_period_trivia",

  // Added 6 Sept 2026 with the features/chat migration. Three of the seven
  // contracted /api/chat/* routes delegate to these, so mobile depends on them
  // transitively while nothing protected them — the same gap as
  // /api/auth/device-sign-in/send-otp and submit_period_trivia:
  //   /api/chat/messages       -> dispatch_notification
  //   /api/chat/messages/read  -> fn_mark_conversation_read
  //   /api/chat/groups         -> fn_create_group_conversation
  // All three verified to exist with these signatures.
  //
  // fn_make_group_leader is deliberately NOT here: its only caller is the
  // admin-side useConversation hook, not a contracted route.
  "dispatch_notification",
  "fn_create_group_conversation",
  "fn_mark_conversation_read",

  // Added 9 Sept 2026 with the Plasence Phase 0 trust-repair pass.
  // /api/period/me is a contracted route and its POST confirm_period_start
  // action delegates here (the atomic cycle+forecast write period_cycles'
  // missing owner-write RLS policy required) — same gap class as
  // submit_period_trivia and the chat RPCs above. security definer, callable
  // by any authenticated user; scoped internally to auth.uid(), not a
  // parameter.
  "fn_record_period_cycle",
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

  // Added 23 Sept 2026. Written directly by the patient app's Outdoor
  // engagement actions (Will visit / Completed / Like / Rating / Share),
  // upserting on the unique key (user_id, target_type, target_id) — that
  // CONSTRAINT is part of the contract, not just the column list: without it
  // every tap raises instead of updating the existing row.
  "fitness_outdoor_engagements",
  "onboarding_requests",

  // Added 9 Sept 2026 — Facility Scout mobile submission flow. Both written
  // to directly via the RLS-enforced client, not through an API route.
  "facility_scout_config",
  "facility_scout_submissions",
] as const;

/**
 * ── BUSINESS APP (4 Our Life Business, apps/business) ──────────────────
 *
 * The second store app (D14). Everything above this point is the PATIENT app
 * (apps/consumer); the two are frozen independently, and the additive-only
 * rule applies to both.
 *
 * Extracted mechanically from apps/business on 23 Sept 2026 by grepping
 * app/, components/, features/ and lib/ for `.rpc(`, `.from(` and `/api/`
 * literals. Regenerate rather than trusting it:
 *
 *     bash scripts/cleanup/regenerate-mobile-contract.sh ../4-Our-Life-App/apps/business
 *
 * Why this matters more than it looks: the Business app reads tables the
 * patient app never touches, through owner-scoped RLS policies and SECURITY
 * DEFINER functions added in P0-10/11/12 and P1-01/03. Tightening one of
 * those policies is invisible to the patient app's tests and silently empties
 * a Business screen — PostgREST returns no rows, not an error.
 */
export const BUSINESS_APP_RPCS = [
  // Provider identity and gating (P0-10, P0-16).
  //
  // P1-08b changed what this returns: it is now the MEMBERSHIP list, not the
  // ownership list, and it gained `role`, `department_id`, `department_name`
  // and `permissions`. Those four are additive and the app may ignore them,
  // but the row set is not: it now includes providers the caller is an active
  // `provider_members` row for, not only ones they own. Narrowing it back to
  // owners would sign every staff member out of their own business.
  "get_my_provider_context",
  "get_provider_home",

  // Verification (P0-11).
  "submit_credential",

  // Catalogue (P0-12). Carries the publish guard, so its behaviour is part
  // of the contract, not just its signature.
  "upsert_catalogue_item",

  // Vendor enquiry loop (P1-01). Returns NO patient identity by design;
  // adding identifying columns would be a privacy regression, not an
  // additive change.
  "get_vendor_enquiry_inbox",

  // Vendor fulfilment (P1-03), called by the Sheet 05 Orders screens.
  //
  // `get_vendor_orders` DOES carry customer name and phone — the opposite of
  // the inbox above, and deliberately: a row only appears here once the
  // patient has accepted this vendor's quote. It must never return the
  // pickup code, which belongs to the patient; `has_pickup_code` is a
  // boolean for exactly that reason and turning it into the digits would be
  // a privacy regression.
  "get_vendor_orders",

  // The fulfilment transitions. Each picks its own next status from the
  // order's `fulfilment_mode` — the app does not send one, so adding a
  // status parameter would not be additive.
  "vendor_mark_order_ready",
  "vendor_verify_pickup_code",
  "vendor_mark_delivered",

  // Delivery settings (Sheet 05 screen 5) and the public self-onboarding
  // gate (P0-07). `is_feature_enabled` is called by `anon`, before sign-in.
  "update_my_provider",
  // Sheet 16 review feed — provider-scoped and deliberately excludes customer
  // identity; replies are created only through reply_to_review.
  "get_provider_reviews",
  "reply_to_review",
  "is_feature_enabled",

  // Business → Security (P0-16). Both are shared with the patient app and
  // both are APP-SCOPED — that scoping is the contract, not an optimisation.
  // A `{member,provider}` owner has their personal phone registered under
  // `app='consumer'`; if either of these stopped filtering on `p_app`, the
  // Business app's device list would show that phone and its "sign out other
  // devices" would kill the owner's own medication reminders.
  //
  // `list_my_devices` keeps a no-argument form (both parameters default) so
  // the patient app's existing call is unchanged. Removing those defaults
  // would break it.
  "list_my_devices",
  "revoke_my_device",
  "revoke_my_other_devices",
] as const;

export const BUSINESS_APP_TABLES = [
  // Written anonymously by the public "Request access" flow (Sheet 01).
  // The admin console reads metadata.area_name / gps_address / region from
  // these rows when pre-filling Add Facility — those keys are contracted.
  "onboarding_requests",

  // Lookups, read by anon before an account exists.
  "provider_types",
  "provider_type_requirements",
  "capabilities",

  // Owner-scoped reads.
  "provider_credentials",
  "provider_capabilities",

  // Owner-scoped reads, and owner-scoped writes through
  // `upsert_catalogue_item`. P1-04 added `bulk_pricing jsonb` (wholesale
  // tiers, `[]` when there are none) and `images` holds PUBLIC
  // `catalogue-images` urls only. The RPC applies a FIXED key whitelist to the
  // patch it is handed: an unknown key is ignored, not an error, so a new
  // column is invisible to the app until the function carries it.
  "provider_catalogue_items",

  // Read for `delivery_settings` (Sheet 05 screen 5) under P0-02's
  // owner-or-admin SELECT policy. Writes go through update_my_provider —
  // P0-02 made this table admin-only for UPDATE.
  "providers",

  // P1-05's read-only name-change queue. A provider member can see only the
  // requests for their current provider; approving or rejecting remains an
  // admin RPC and must never be exposed to the Business app.
  "provider_profile_change_requests",

  // Quotes. Written directly under enquiry_responses_provider_insert, which
  // enforces status='offered' + pending_match + ownership. The app relies on
  // that policy rather than an RPC, so the POLICY is contracted.
  "enquiry_responses",

  // The app clears requires_password_change here after setting a password
  // (D9). trg_protect_user_profile_columns permits clearing it and rejects
  // setting it — both halves are contracted.
  "user_profiles",
] as const;

export const BUSINESS_APP_ROUTES = [
  // Mints a signed upload URL for a licence document, bearer-token auth via
  // getRequestUser, ownership re-checked against providers.owner_id.
  "/api/providers/credentials/upload",
] as const;

export const BUSINESS_APP_BUCKETS = [
  // Target of the signed upload URL minted by the route above.
  "provider-credentials",

  // Proof-of-delivery photos (Sheet 05 screen 4). Written DIRECTLY by the
  // app, not through a signed URL: the insert policy is owner-scoped on the
  // first path segment, so the `<provider_id>/…` prefix is contracted.
  // Private, with no UPDATE or DELETE policy — a proof is evidence.
  "delivery-proofs",

  // Product photos (P1-04, Sheet 06 screen 2). Written DIRECTLY by the app.
  //
  // PUBLIC, unlike the two above, and that is the contract: the url this
  // bucket returns is what the patient app renders, and it is the only thing
  // `provider_catalogue_items.images` may hold. Turning it private would blank
  // every product photo in both apps at once.
  //
  // The path is `<provider_id>/<item id or draft uuid>/<slot>.<extension>`
  // with `slot` in 1–3, and the first segment is what the owner-scoped insert AND update policies
  // check (`owns_catalogue_image_folder` → `is_provider_member(…,
  // 'catalogue.manage')`). There is no DELETE policy: replacing a photo
  // overwrites the same object, which is why an UPDATE policy exists here and
  // deliberately does not on `delivery-proofs`.
  "catalogue-images",

  // P1-05's public business-gallery bucket. Paths are exactly
  // `<provider_id>/<slot>.<extension>` with slots 1–6 and are checked by
  // `owns_provider_media_folder` against the member's `profile.edit` grant.
  // INSERT, SELECT and UPDATE are deliberately all present for upsert.
  "provider-media",
] as const;

/**
 * Deep link the admin console's /auth/welcome page opens to hand the app a
 * one-time sign-in token (P0-06, D9). The scheme, the path and both query
 * parameters are contracted: change any of them and every invite link already
 * sent stops working.
 */
export const BUSINESS_APP_DEEP_LINKS = [
  "fourourlifebusiness://auth/confirm?token_hash=<hashed_token>&type=magiclink",
] as const;
