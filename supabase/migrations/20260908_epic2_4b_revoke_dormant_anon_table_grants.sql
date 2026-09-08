-- Epic 2.4 (TASKS.md): reduce the anon grant footprint on tables that
-- already have real RLS policies for OTHER roles but none reachable by
-- anon -- the same dormant-grant pattern fixed for the 56 no-policy-at-all
-- tables in Epic 2.3, just for tables where authenticated/service_role
-- policies exist and anon's grant is the only thing left over.
--
-- Confirmed anon-reachable for real (kept alone, NOT in this list):
--   - onboarding_requests: has an explicit `{public}` INSERT policy
--     (`with_check: true`) -- app/(app)/(public)/RequestLink.tsx submits
--     to it before any session exists (the "request a business/IBP link"
--     form). Caught by first building this list with a buggy
--     roles-array-equality check that silently excluded it, then a second,
--     correct `'anon' = any(roles) or 'public' = any(roles)` pass that
--     matched it -- the discrepancy is what surfaced the form's real
--     dependency before anything was revoked.
--   - is_admin/get_user_app_role/is_app_admin-style function grants:
--     out of scope here (functions, not tables; see epic2_2d).
--
-- Verified there is no other anon-reachable write path: the Expo app's
-- root layout (app/(app)/_layout.tsx) redirects any unauthenticated user
-- out of every route except (public) and (legal), and grepping those two
-- groups for direct Supabase calls turns up exactly one -- the
-- onboarding_requests insert above. No .rpc( calls at all pre-login.
--
-- account/session/user/verification (Better-Auth migration artifacts per
-- user_migration_betterauth_to_supabase.sql) and otp_verifications/
-- device_sign_in_requests have zero direct .from() callers in either repo;
-- otp_verifications is written only via lib/sms.ts's service-role client.
--
-- Verified live: anon-granted table count 169 -> 31 (matches this list's
-- 138 exactly), authenticated untouched at 190. Spot checks: onboarding
-- requests still anon-insertable; healthy_living_info/user_profiles/
-- conditions still selectable as authenticated; anon correctly blocked on
-- healthy_living_info. pnpm test (123 passed) and type-check clean.

revoke all on table
public."account",
  public."activity_logs",
  public."ai_body_part_mappings",
  public."ambulance_dispatches",
  public."analytics_events",
  public."anatomy_hotspots",
  public."anatomy_hotspots_3d",
  public."anatomy_interactions",
  public."anatomy_regions",
  public."app_ledger",
  public."app_reviews",
  public."bed_tracker_alerts",
  public."bed_tracker_facilities",
  public."body_parts",
  public."categories",
  public."challenge_views",
  public."chat_support",
  public."collector_footprints",
  public."collector_submissions",
  public."condition_body_parts",
  public."condition_categories",
  public."condition_causes",
  public."condition_types",
  public."condition_views",
  public."conditions",
  public."conversation_members",
  public."conversations",
  public."data_collectors",
  public."delete_account_requests",
  public."device_sign_in_requests",
  public."download_stats",
  public."drug_aliases",
  public."drug_body_part_rules",
  public."drug_body_parts",
  public."drug_import_batches",
  public."drug_interaction_flags",
  public."drug_interactions",
  public."drug_verification_requests",
  public."drugs",
  public."email_suppressions",
  public."enquiry_responses",
  public."escrow_transactions",
  public."exercise_logs",
  public."exercise_sessions",
  public."exercise_views",
  public."facility_favorites",
  public."facility_offerings",
  public."facility_scout_referrals",
  public."facility_subscriptions",
  public."fitness_ai_calls",
  public."fitness_ai_campaigns",
  public."fitness_body_parts",
  public."fitness_challenge_entries",
  public."fitness_challenge_participants",
  public."fitness_challenge_teams",
  public."fitness_challenges",
  public."fitness_dashboard_cache",
  public."fitness_exercises",
  public."fitness_generated_workouts",
  public."fitness_health_platforms",
  public."fitness_health_sync_logs",
  public."fitness_leaderboards",
  public."fitness_onboarding_selections",
  public."fitness_outdoor_event_participants",
  public."fitness_outdoor_event_registrations",
  public."fitness_outdoor_events",
  public."fitness_outdoor_incentives",
  public."fitness_outdoor_reviews",
  public."fitness_outdoor_routes",
  public."fitness_whatsapp_broadcasts",
  public."fitness_whatsapp_groups",
  public."hcp_digital_cvs",
  public."hcp_verifications",
  public."healthy_living_categories",
  public."healthy_living_info",
  public."healthy_living_views",
  public."ibp",
  public."job_applications",
  public."map_collectors",
  public."map_priority_regions",
  public."medication_adherence",
  public."medication_enquiries",
  public."medication_reminders",
  public."message_reads",
  public."messages",
  public."notification_campaigns",
  public."notifications",
  public."otp_verifications",
  public."period_ai_jobs",
  public."period_ai_model_metrics",
  public."period_ai_recommendations",
  public."period_campaigns",
  public."period_consent_events",
  public."period_content",
  public."period_content_bookmarks",
  public."period_content_categories",
  public."period_content_collection_items",
  public."period_content_collections",
  public."period_content_progress",
  public."period_content_publications",
  public."period_content_sources",
  public."period_cycles",
  public."period_notes",
  public."period_premium_grants",
  public."period_premium_settings",
  public."period_source_chunks",
  public."period_source_documents",
  public."period_source_embeddings",
  public."period_symptom_logs",
  public."period_trivia_blocked_devices",
  public."period_trivia_events",
  public."period_trivia_fulfillment",
  public."period_trivia_leads",
  public."period_trivia_rules",
  public."period_trivia_submissions",
  public."pharmacy_campaigns",
  public."platform_metrics_history",
  public."registrar_locations",
  public."session",
  public."storage_cleanup_queue",
  public."subscription_upgrade_requests",
  public."symptom_body_parts",
  public."symptom_categories",
  public."symptom_causes",
  public."symptom_types",
  public."symptom_views",
  public."symptoms",
  public."top_rated_items",
  public."transaction_records",
  public."twilio_whatsapp_handshakes",
  public."user",
  public."user_invites",
  public."user_notes",
  public."user_profiles",
  public."user_push_tokens",
  public."user_subscriptions",
  public."verification",
  public."workout_reminders"
from anon;

-- condition_stats is a plain (non-security-definer) aggregate view over
-- conditions/categories/body_parts -- not sensitive, but had needless
-- INSERT/UPDATE/DELETE/TRUNCATE grants for anon and authenticated (inert:
-- the view isn't updatable, being pure aggregates). Keep SELECT only.
revoke insert, update, delete, truncate, references, trigger
  on public.condition_stats from anon, authenticated;
