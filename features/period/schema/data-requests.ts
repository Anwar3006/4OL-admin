import { z } from "zod";

import { PERIOD_TAB_IDS } from "@/features/period/schema/period-tracker";

/**
 * Request validation for /api/period/data.
 *
 * WriteSchema is a discriminated union over `action` covering every mutation
 * the Period Tracker admin screen can perform — 180-odd lines that used to sit
 * above the handlers and pushed the route file past a thousand lines.
 */
export const TabSchema = z.enum(PERIOD_TAB_IDS);
export const StatusSchema = z.string().trim().max(40).optional();

export const WriteSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create_campaign"),
    name: z.string().trim().min(2).max(160),
    campaignType: z.string().trim().min(2).max(80),
    channel: z.enum(["in_app", "push", "email"]).default("in_app"),
    partnerName: z.string().trim().max(160).optional(),
    region: z.string().trim().max(100).optional(),
    scheduledAt: z.string().datetime().optional(),
    minimumCohortSize: z.number().int().min(100).max(100_000).default(100),
    frequencyCapDays: z.number().int().min(1).max(90).default(7),
  }),
  z.object({
    action: z.literal("create_content"),
    title: z.string().trim().min(2).max(200),
    topic: z.string().trim().min(2).max(100),
    contentType: z.enum(["article", "quick_read", "video", "podcast", "expert_qa"]).default("article"),
    locale: z.string().trim().min(2).max(12).default("en"),
    summary: z.string().trim().max(500).optional(),
    bodyHtml: z.string().trim().min(2).max(50_000),
    tags: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
    coverImageUrl: z.string().url().max(2000).optional(),
    readingMinutes: z.number().int().min(1).max(180).optional(),
    readingLevel: z.enum(["simple", "general", "detailed"]).default("general"),
    featured: z.boolean().default(false),
  }),
  z.object({
    action: z.literal("create_trivia_question"),
    topic: z.string().trim().min(2).max(100),
    question: z.string().trim().min(5).max(500),
    options: z.array(z.string().trim().min(1).max(300)).min(2).max(6),
    correctOption: z.number().int().min(0).max(5),
    explanation: z.string().trim().min(5).max(2000),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]),
    eventId: z.string().uuid().optional(),
    rewardId: z.string().uuid().optional(),
  }).refine((value) => value.correctOption < value.options.length, { message: "Correct option is outside the option list", path: ["correctOption"] }),
  z.object({
    action: z.literal("create_trivia_event"),
    title: z.string().trim().min(3).max(160),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    timezone: z.string().trim().min(3).max(80).default("Africa/Accra"),
    rewardId: z.string().uuid().optional(),
  }),
  z.object({
    action: z.literal("create_trivia_reward"),
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().min(2).max(500),
    icon: z.string().trim().min(1).max(8).default("🏆"),
    rewardType: z.enum(["points", "badge", "discount", "prize", "cash", "airtime"]).default("points"),
    value: z.string().trim().max(120).optional(),
  }),
  z.object({ action: z.literal("review_trivia_event"), id: z.string().uuid() }),
  z.object({
    action: z.literal("update_trivia_question_status"), id: z.string().uuid(),
    status: z.enum(["draft", "review", "published", "archived"]),
  }),
  z.object({
    action: z.literal("bulk_update_trivia_question_status"),
    ids: z.array(z.string().uuid()).min(1).max(50),
    status: z.enum(["draft", "review", "published", "archived"]),
  }),
  z.object({
    action: z.literal("review_safety"),
    id: z.string().uuid(),
    resolution: z.enum(["in_review", "escalated", "resolved", "dismissed"]),
    resolutionCode: z.string().trim().min(2).max(100),
  }),
  z.object({
    action: z.literal("review_note"),
    id: z.string().uuid(),
    resolution: z.enum(["in_review", "cleared", "escalated"]),
    resolutionCode: z.string().trim().min(2).max(100),
  }),
  z.object({
    action: z.literal("review_correction"),
    id: z.string().uuid(),
    resolution: z.enum(["approved", "rejected"]),
  }),
  z.object({
    action: z.literal("review_appointment_request"),
    id: z.string().uuid(),
    resolution: z.enum(["confirmed", "declined"]),
  }),
  z.object({
    action: z.literal("update_content_status"),
    id: z.string().uuid(),
    status: z.enum(["draft", "review", "published", "archived"]),
  }),
  z.object({
    action: z.literal("update_feature_flag"),
    key: z.string().trim().min(2).max(100),
    enabled: z.boolean(),
    rolloutPercent: z.number().int().min(0).max(100),
  }),
  z.object({
    action: z.literal("update_forecast_status"),
    id: z.string().uuid(),
    status: z.enum(["testing", "active", "paused", "retired"]),
  }),
  z.object({
    action: z.literal("audit_export"),
    scope: z.enum(["content", "engagement", "trivia", "forecasts", "quality"]),
    rowCount: z.number().int().min(1).max(100_000),
    reason: z.string().trim().min(5).max(300),
  }),
  z.object({
    action: z.literal("update_campaign_status"),
    id: z.string().uuid(),
    status: z.enum(["scheduled", "paused", "cancelled", "completed"]),
  }),
  z.object({
    action: z.literal("update_privacy_request"),
    id: z.string().uuid(),
    status: z.enum(["verified", "processing", "completed", "rejected"]),
  }),
  z.object({
    action: z.literal("create_content_collection"),
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().max(500).optional(),
    curationType: z.enum(["manual", "ai_suggested", "rule_based"]).default("manual"),
  }),
  z.object({
    action: z.literal("add_content_to_collection"),
    collectionId: z.string().uuid(), contentId: z.string().uuid(),
    reason: z.string().trim().max(300).optional(), displayOrder: z.number().int().min(0).max(10_000).default(0),
  }),
  z.object({ action: z.literal("publish_content_collection"), id: z.string().uuid() }),
  z.object({
    action: z.literal("grant_premium"),
    userId: z.string().uuid(),
    // Collapsed to a single tier (Phase 0 trust repair) — cycle_pro_ttc and
    // cycle_pro_insights had contradictory, overlapping benefit copy while
    // being independently priced/selectable. period_premium_grants.tier is
    // now DB-constrained to this one value too.
    tier: z.literal("cycle_pro").default("cycle_pro"),
    source: z.enum(["manual", "trivia_prize", "goodwill", "clinical_program", "partner", "beta"]).default("manual"),
    reason: z.string().trim().min(2).max(500),
    notes: z.string().trim().max(1000).optional(),
    // No indefinite access: manual grants are capped at 90 days (DB-enforced too).
    durationDays: z.number().int().refine((value) => [7, 14, 30, 60, 90].includes(value), { message: "Duration cap must be 7, 14, 30, 60 or 90 days" }),
  }),
  z.object({ action: z.literal("extend_premium_grant"), id: z.string().uuid(), days: z.number().int().min(1).max(90) }),
  z.object({ action: z.literal("revoke_premium_grant"), id: z.string().uuid() }),
  z.object({
    action: z.literal("update_premium_settings"),
    onboardingTrialDays: z.union([z.literal(0), z.literal(7), z.literal(14), z.literal(30)]),
    expiryReminderDays: z.number().int().min(0).max(14).default(3),
    autoLockOnExpiry: z.boolean().default(true),
    showPaywallOnExpiry: z.boolean().default(true),
  }),
  z.object({
    action: z.literal("create_fulfillment"),
    eventId: z.string().uuid(),
    submissionId: z.string().uuid().optional(),
    tierLabel: z.string().trim().min(2).max(120),
    rewardId: z.string().uuid().optional(),
    notes: z.string().trim().max(1000).optional(),
  }),
  z.object({ action: z.literal("mark_fulfillment_sent"), id: z.string().uuid() }),
  z.object({ action: z.literal("mark_fulfillment_fulfilled"), id: z.string().uuid() }),
  z.object({
    action: z.literal("block_trivia_device"),
    deviceHash: z.string().trim().min(8).max(160),
    mobileHash: z.string().trim().min(8).max(160).optional(),
    userId: z.string().uuid().optional(),
    violation: z.enum(["duplicate_submission", "multi_account_farming", "bot_like_completion", "answer_set_probing", "other"]),
    evidence: z.string().trim().max(1000).optional(),
    status: z.enum(["blocked", "under_review"]).default("blocked"),
  }),
  z.object({ action: z.literal("unblock_trivia_device"), id: z.string().uuid() }),
  z.object({
    action: z.literal("update_trivia_rule"),
    key: z.string().trim().min(2).max(80),
    value: z.string().trim().min(1).max(200),
    isActive: z.boolean(),
  }),
  z.object({
    action: z.literal("schedule_ai_suggestion"),
    jobId: z.string().uuid(),
    scheduledAt: z.string().datetime(),
    frequencyCapDays: z.number().int().min(1).max(90),
    surfaceDurationWeeks: z.number().int().min(1).max(12),
    surfaceChannel: z.enum(["plasence_library", "push_digest", "today_tip"]).default("plasence_library"),
  }),
  z.object({
    action: z.literal("dispatch_campaign"),
    campaignId: z.string().uuid(),
    title: z.string().trim().min(2).max(160),
    message: z.string().trim().min(2).max(500),
  }),
]);
