import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { decryptLead, maskMobile } from "@/lib/period-trivia-security";
import {
  PERIOD_METRIC_DEFINITIONS,
  PERIOD_TAB_IDS,
  average,
  calculateRetention,
  clampPage,
  clampPageSize,
  containsSensitiveAudience,
  latestConsents,
  latestCyclePerUser,
  percent,
  safeAudienceSummary,
  type ConsentRecord,
  type CycleRecord,
} from "@/lib/period-tracker";

const TabSchema = z.enum(PERIOD_TAB_IDS);
const StatusSchema = z.string().trim().max(40).optional();

const WriteSchema = z.discriminatedUnion("action", [
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
    tier: z.enum(["cycle_pro", "cycle_pro_ttc", "cycle_pro_insights"]).default("cycle_pro"),
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

const unsafeHtml = (value: string) => /<\s*(script|iframe|object|embed)|javascript\s*:|\bon\w+\s*=/i.test(value);
const slugify = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);

const maskName = (first?: string | null, last?: string | null) => {
  const mask = (value?: string | null) => value ? `${value.slice(0, 1)}${"•".repeat(Math.min(4, Math.max(1, value.length - 1)))}` : "";
  return [mask(first), mask(last)].filter(Boolean).join(" ") || "Anonymous user";
};

async function writeAudit(actorId: string, action: string, resourceType: string, resourceId?: string, metadata: Record<string, unknown> = {}) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("admin_activity_logs").insert({
    actor_id: actorId,
    action,
    resource_type: resourceType,
    resource_id: resourceId ?? null,
    metadata,
  });
  if (error) console.error("[period/audit]", error.message);
}

function profileMaps(profiles: Array<Record<string, any>>) {
  return new Map(profiles.map((profile) => [profile.user_id, profile]));
}

async function loadProfiles(admin: ReturnType<typeof getSupabaseAdmin>, userIds: string[]) {
  if (!userIds.length) return [];
  // region lives on period_user_settings (period-tracker-specific), not
  // user_profiles -- there's no user-level region anywhere else on the
  // platform to join against instead.
  const [{ data: profiles, error: profilesError }, { data: settings }] = await Promise.all([
    admin.from("user_profiles").select("user_id,first_name,last_name").in("user_id", userIds),
    admin.from("period_user_settings").select("user_id,region").in("user_id", userIds),
  ]);
  if (profilesError) {
    console.error("[period/loadProfiles] user_profiles error:", profilesError.message);
    return [];
  }
  const regionByUser = new Map((settings ?? []).map((row) => [row.user_id, row.region]));
  return (profiles ?? []).map((profile) => ({ ...profile, region: regionByUser.get(profile.user_id) ?? null }));
}

function pageRows<T>(rows: T[], page: number, pageSize: number) {
  const total = rows.length;
  return {
    data: rows.slice((page - 1) * pageSize, page * pageSize),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminApiUser("period.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const tabResult = TabSchema.safeParse(request.nextUrl.searchParams.get("tab") ?? "overview");
  if (!tabResult.success) return NextResponse.json({ error: "Invalid tab" }, { status: 400 });

  const tab = tabResult.data;
  const page = clampPage(request.nextUrl.searchParams.get("page"));
  const pageSize = clampPageSize(request.nextUrl.searchParams.get("pageSize"));
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  const status = StatusSchema.parse(request.nextUrl.searchParams.get("status") ?? undefined);
  const admin = getSupabaseAdmin();

  if (tab === "engagement") {
    const [{ data: campaigns, error }, { data: events }] = await Promise.all([
      admin.from("period_campaigns").select("*").order("created_at", { ascending: false }).limit(500),
      admin.from("period_notification_events").select("status,occurred_at").gte("occurred_at", new Date(Date.now() - 30 * 86400000).toISOString()).limit(5000),
    ]);
    if (error) return NextResponse.json({ error: "Unable to load engagement data" }, { status: 500 });
    const rows = (campaigns ?? []).map((item) => ({
      ...item,
      audience: safeAudienceSummary(item.target_definition),
      openRate: percent(Number(item.opened_count), Number(item.reached_count)),
      actionRate: percent(Number(item.action_count), Number(item.reached_count)),
    })).filter((row) => (!status || row.status === status) && (!query || JSON.stringify(row).toLowerCase().includes(query)));
    const eventCounts = Object.fromEntries(Object.entries((events ?? []).reduce<Record<string, number>>((acc, event) => {
      acc[event.status] = (acc[event.status] ?? 0) + 1;
      return acc;
    }, {})));
    return NextResponse.json({ ...pageRows(rows, page, pageSize), eventCounts });
  }

  if (tab === "content") {
    const [{ data, error }, { data: publications }, { data: sourceLinks }, { data: collections }, { data: aiSuggestions }] = await Promise.all([
      admin.from("period_content").select("id,title,slug,summary,topic,content_type,locale,tags,cover_image_url,reading_minutes,reading_level,featured,curation_type,version,reads,completion_count,helpful_count,not_helpful_count,status,clinical_reviewed_at,review_expires_at,published_at,created_at").order("created_at", { ascending: false }).limit(1000),
      admin.from("period_content_publications").select("content_id,channel,status,starts_at,ends_at,featured,display_order").eq("channel", "plasence_library").limit(1000),
      admin.from("period_content_sources").select("period_content_id,source_menu,source_id,source_title").limit(5000),
      admin.from("period_content_collections").select("id,title,slug,status,curation_type,display_order,published_at,period_content_collection_items(content_id,display_order)").order("display_order").limit(200),
      admin.from("period_ai_jobs").select("id,job_type,status,source_menus,configuration,output,validation,error_code,created_at,completed_at,scheduled_at,frequency_cap_days,surface_duration_weeks,surface_channel").in("job_type", ["content_suggestion", "content_curation"]).order("created_at", { ascending: false }).limit(200),
    ]);
    if (error) return NextResponse.json({ error: "Unable to load content" }, { status: 500 });
    const publicationMap = new Map((publications ?? []).map((item) => [item.content_id, item]));
    const sourceMap = new Map<string, any[]>();
    (sourceLinks ?? []).forEach((item) => sourceMap.set(item.period_content_id, [...(sourceMap.get(item.period_content_id) ?? []), item]));
    const rows = (data ?? []).map((item) => ({
      ...item,
      libraryStatus: publicationMap.get(item.id)?.status ?? "not_published",
      libraryStartsAt: publicationMap.get(item.id)?.starts_at ?? null,
      sourceMenus: [...new Set((sourceMap.get(item.id) ?? []).map((source) => source.source_menu))],
      sourceCount: (sourceMap.get(item.id) ?? []).length,
      helpfulPercent: percent(Number(item.helpful_count), Number(item.helpful_count) + Number(item.not_helpful_count)),
      completionRate: percent(Number(item.completion_count), Number(item.reads)),
    })).filter((row) => (!status || row.status === status) && (!query || JSON.stringify(row).toLowerCase().includes(query)));
    return NextResponse.json({ ...pageRows(rows, page, pageSize), collections: collections ?? [], aiSuggestions: aiSuggestions ?? [] });
  }

  if (tab === "trivia") {
    const [{ data: questions, error }, { data: submissions }, { data: events }, { data: leads }, { data: rewards }, { data: fulfillments }, { data: blockedDevices }, { data: rules }] = await Promise.all([
      admin.from("period_trivia_questions").select("id,event_id,position,topic,question,options,correct_option,explanation,difficulty,status,validation_status,ai_job_id,manual_batch_id,source_refs,reviewed_by,published_at,created_by,created_at").order("created_at", { ascending: false }).limit(1000),
      admin.from("period_trivia_submissions").select("id,event_id,user_id,score,question_count,duration_seconds,submitted_at").gte("submitted_at", new Date(Date.now() - 30 * 86400000).toISOString()).limit(5000),
      admin.from("period_trivia_events").select("id,title,status,starts_at,ends_at,timezone,question_count,reviewed_at,reward_id").order("starts_at", { ascending: false }).limit(100),
      admin.from("period_trivia_leads").select("id,event_id,submission_id,user_id,full_name_ciphertext,mobile_ciphertext,social_platform,social_handle_ciphertext,consent_version,consented_at,acquisition_source,campaign_code,utm_source,utm_medium,utm_campaign,status,assigned_to,last_contacted_at,created_at").order("created_at", { ascending: false }).limit(1000),
      admin.from("period_trivia_rewards").select("id,name,description,icon,reward_type,value,is_active").eq("is_active", true).order("created_at", { ascending: false }).limit(100),
      admin.from("period_trivia_fulfillment").select("id,event_id,submission_id,user_id,tier_label,reward_id,prize_status,sent_at,prompt_sent_at,confirmed_at,fulfilled_at,notes,created_at").order("created_at", { ascending: false }).limit(500),
      admin.from("period_trivia_blocked_devices").select("id,device_hash,mobile_hash,user_id,violation,evidence,status,detected_at,unblocked_at").order("detected_at", { ascending: false }).limit(200),
      admin.from("period_trivia_rules").select("key,description,value,enforced_by,is_active,updated_at").order("key"),
    ]);
    if (error) return NextResponse.json({ error: "Unable to load trivia" }, { status: 500 });

    // One row per question is unreadable once a batch has 10 rows in it --
    // group by generation session instead: AI batches share ai_job_id
    // (set together, in one request); manual batches share manual_batch_id
    // (the rolling 1-hour window in create_trivia_question above). Any
    // question with neither (legacy rows from before batching existed)
    // falls back to being its own single-question batch.
    const eventById = new Map((events ?? []).map((event) => [event.id, event]));
    type QuestionRow = NonNullable<typeof questions>[number];
    const batches = new Map<string, { batchId: string; source: "manual" | "ai"; createdAt: string; eventId: string | null; questions: QuestionRow[] }>();
    for (const question of questions ?? []) {
      const batchId = question.ai_job_id ?? question.manual_batch_id ?? question.id;
      const existing = batches.get(batchId);
      if (existing) {
        existing.questions.push(question);
        if (question.created_at < existing.createdAt) existing.createdAt = question.created_at;
        if (!existing.eventId && question.event_id) existing.eventId = question.event_id;
      } else {
        batches.set(batchId, { batchId, source: question.ai_job_id ? "ai" : "manual", createdAt: question.created_at, eventId: question.event_id ?? null, questions: [question] });
      }
    }
    const batchRows = [...batches.values()].map((batch) => {
      const statusCounts = batch.questions.reduce<Record<string, number>>((acc, q) => { acc[q.status] = (acc[q.status] ?? 0) + 1; return acc; }, {});
      const validCount = batch.questions.filter((q) => q.validation_status === "valid").length;
      const event = batch.eventId ? eventById.get(batch.eventId) : null;
      return {
        batchId: batch.batchId,
        source: batch.source,
        createdAt: batch.createdAt,
        questionCount: batch.questions.length,
        statusCounts,
        statusSummary: Object.keys(statusCounts).length === 1 ? Object.keys(statusCounts)[0] : Object.entries(statusCounts).map(([key, count]) => `${count} ${key}`).join(", "),
        validSummary: `${validCount}/${batch.questions.length}`,
        eventId: batch.eventId,
        eventTitle: event?.title ?? null,
        rewardAttached: Boolean(event?.reward_id),
        questions: batch.questions,
      };
    })
      .filter((batch) => (!status || Object.keys(batch.statusCounts).includes(status)) && (!query || JSON.stringify(batch).toLowerCase().includes(query)))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    const answers = (submissions ?? []).reduce((sum, item) => sum + Number(item.question_count), 0);
    const correct = (submissions ?? []).reduce((sum, item) => sum + Number(item.score), 0);
    const maskedLeads = (leads ?? []).map((lead) => {
      try {
        const name = decryptLead(lead.full_name_ciphertext);
        const mobile = decryptLead(lead.mobile_ciphertext);
        const handle = decryptLead(lead.social_handle_ciphertext);
        return { ...lead, full_name_ciphertext: undefined, mobile_ciphertext: undefined, social_handle_ciphertext: undefined,
          name: `${name.slice(0, 1)}${"•".repeat(Math.max(2, Math.min(8, name.length - 1)))}`, mobile: maskMobile(mobile), socialPlatform: lead.social_platform ?? "Social", socialHandle: `${handle.slice(0, 2)}••••` };
      } catch { return { ...lead, full_name_ciphertext: undefined, mobile_ciphertext: undefined, social_handle_ciphertext: undefined, name: "Encrypted lead", mobile: "Protected", socialPlatform: lead.social_platform ?? "Social", socialHandle: "Protected" }; }
    });
    return NextResponse.json({ ...pageRows(batchRows, page, pageSize), events: events ?? [], leads: maskedLeads, submissions: submissions ?? [], rewards: rewards ?? [], fulfillments: fulfillments ?? [], blockedDevices: blockedDevices ?? [], rules: rules ?? [], summary: { attempts30d: submissions?.length ?? 0, leads30d: maskedLeads.length, correctRate: percent(correct, answers) } });
  }

  if (tab === "forecasts") {
    const { data, error } = await admin.from("period_ai_model_metrics").select("*").order("metric_date", { ascending: false }).limit(1000);
    if (error) return NextResponse.json({ error: "Unable to load forecast quality" }, { status: 500 });
    const rows = (data ?? []).map((item) => ({
      ...item,
      openRate: percent(Number(item.opened_count), Number(item.recipient_count)),
      actionRate: percent(Number(item.action_count), Number(item.recipient_count)),
    })).filter((row) => (!status || row.status === status) && (!query || JSON.stringify(row).toLowerCase().includes(query)));
    return NextResponse.json(pageRows(rows, page, pageSize));
  }

  if (tab === "quality") {
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const [{ data: events, error }, { data: flags }] = await Promise.all([
      admin.from("period_app_events").select("id,event_name,platform,app_version,status,duration_ms,occurred_at").gte("occurred_at", since).order("occurred_at", { ascending: false }).limit(5000),
      admin.from("period_feature_flags").select("*").order("key"),
    ]);
    if (error) return NextResponse.json({ error: "Unable to load app quality" }, { status: 500 });
    const grouped = new Map<string, { id: string; eventName: string; platform: string; appVersion: string; success: number; failure: number; warning: number; durations: number[]; latestAt: string }>();
    for (const event of events ?? []) {
      const id = `${event.event_name}:${event.platform ?? "unknown"}:${event.app_version ?? "unknown"}`;
      const row = grouped.get(id) ?? { id, eventName: event.event_name, platform: event.platform ?? "Unknown", appVersion: event.app_version ?? "Unknown", success: 0, failure: 0, warning: 0, durations: [] as number[], latestAt: event.occurred_at };
      row[event.status as "success" | "failure" | "warning"] += 1;
      if (event.duration_ms != null) row.durations.push(event.duration_ms);
      grouped.set(id, row);
    }
    const rows = [...grouped.values()].map(({ durations, ...row }) => ({ ...row, averageDuration: average(durations) }));
    return NextResponse.json({ ...pageRows(rows.filter((row) => !query || JSON.stringify(row).toLowerCase().includes(query)), page, pageSize), featureFlags: flags ?? [] });
  }

  if (tab === "premium") {
    const [{ data: settings }, { data: grants, error }] = await Promise.all([
      admin.from("period_premium_settings").select("*").maybeSingle(),
      admin.from("period_premium_grants").select("id,user_id,tier,source,reason,notes,starts_at,expires_at,revoked_at,granted_by,created_at").order("created_at", { ascending: false }).limit(1000),
    ]);
    if (error) return NextResponse.json({ error: "Unable to load premium entitlements" }, { status: 500 });
    const userIds = [...new Set((grants ?? []).map((grant) => grant.user_id))];
    const profiles = profileMaps(await loadProfiles(admin, userIds));
    const nowMs = Date.now();
    const rows = (grants ?? []).map((grant) => ({
      ...grant,
      user: maskName(profiles.get(grant.user_id)?.first_name, profiles.get(grant.user_id)?.last_name),
      region: profiles.get(grant.user_id)?.region ?? "Not supplied",
      daysLeft: grant.revoked_at ? 0 : Math.max(0, Math.ceil((new Date(grant.expires_at).getTime() - nowMs) / 86400000)),
      state: grant.revoked_at ? "revoked" : new Date(grant.expires_at).getTime() <= nowMs ? "expired" : new Date(grant.expires_at).getTime() - nowMs <= 3 * 86400000 ? "expiring" : "active",
    })).filter((row) => (!status || row.state === status) && (!query || JSON.stringify(row).toLowerCase().includes(query)));
    return NextResponse.json({ ...pageRows(rows, page, pageSize), settings: settings ?? null });
  }

  if (tab === "ttc") {
    // TTC & Fertility analytics (TTC_PLAN.md): aggregates and masked metadata
    // only. Intimate per-user detail (sexual activity, encrypted notes) is
    // never exposed here; appointments show a short user id, not a name.
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const [{ data: trackerSettings }, { data: ttcProfiles, error }, { data: checklistItems }, { data: checklistProgress }, { data: ovulationTests }, { data: appointments }, { data: insights }] = await Promise.all([
      admin.from("period_user_settings").select("id"),
      admin.from("period_ttc_profiles").select("user_id,preconception_visit_status,medication_review_status,vaccine_review_status,chronic_condition_review_status,sti_screening_status,dental_check_status,prenatal_vitamin_started_on,created_at").order("created_at", { ascending: false }).limit(5000),
      admin.from("period_ttc_checklist_items").select("id,code,title,category,display_order").eq("is_active", true).order("display_order"),
      admin.from("period_ttc_checklist_progress").select("user_id,checklist_item_id,status").limit(10000),
      admin.from("period_ovulation_tests").select("logged_on,result,brand,source").gte("logged_on", thirtyDaysAgo).limit(10000),
      admin.from("period_preconception_appointments").select("id,user_id,appointment_date,timezone,clinician_name,purpose,status,questions").order("appointment_date", { ascending: false }).limit(500),
      admin.from("period_fertility_insights").select("insight_type,confidence,status,evidence").gte("created_at", sevenDaysAgo).limit(10000),
    ]);
    if (error) return NextResponse.json({ error: "Unable to load TTC data" }, { status: 500 });

    // Checklist readiness: per active item, share of TTC users who marked it
    // done. Readiness status on the TTC profile counts as done too, since it
    // is the same preconception preparation signal.
    const readinessFields: Record<string, string> = {
      preconception_visit: "preconception_visit_status",
      medication_review: "medication_review_status",
      vaccine_review: "vaccine_review_status",
      chronic_condition_review: "chronic_condition_review_status",
      sti_screening: "sti_screening_status",
      dental_check: "dental_check_status",
    };
    const ttcUserCount = (ttcProfiles ?? []).length;
    const doneByItem = new Map<string, Set<string>>();
    for (const row of checklistProgress ?? []) {
      if (row.status === "done") doneByItem.set(row.checklist_item_id, new Set([...(doneByItem.get(row.checklist_item_id) ?? []), row.user_id]));
    }
    for (const item of checklistItems ?? []) {
      const field = readinessFields[item.code];
      if (!field) continue;
      const fromProfile = (ttcProfiles ?? []).filter((profile) => (profile as any)[field] === "completed").map((profile) => profile.user_id);
      doneByItem.set(item.id, new Set([...(doneByItem.get(item.id) ?? []), ...fromProfile]));
    }
    const checklistReadiness = (checklistItems ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      category: item.category,
      doneCount: doneByItem.get(item.id)?.size ?? 0,
      donePercent: percent(doneByItem.get(item.id)?.size ?? 0, ttcUserCount),
    }));
    const checklistHalfCount = (() => {
      const itemCount = (checklistItems ?? []).length || 1;
      const userDoneCounts = new Map<string, number>();
      for (const [, users] of doneByItem) for (const userId of users) userDoneCounts.set(userId, (userDoneCounts.get(userId) ?? 0) + 1);
      return [...userDoneCounts.values()].filter((count) => count >= itemCount / 2).length;
    })();

    // Ovulation tests (30 days): result buckets never imply pregnancy.
    const tests = ovulationTests ?? [];
    const brandCounts = tests.reduce<Record<string, number>>((acc, test) => {
      const brand = (test.brand ?? "Other").trim() || "Other";
      acc[brand] = (acc[brand] ?? 0) + 1;
      return acc;
    }, {});
    const ovulationBreakdown = {
      total: tests.length,
      positive: tests.filter((test) => ["positive", "peak", "high"].includes(test.result)).length,
      negative: tests.filter((test) => ["negative", "low"].includes(test.result)).length,
      invalid: tests.filter((test) => test.result === "invalid").length,
      deviceOrSync: tests.filter((test) => test.source !== "user").length,
      topBrands: Object.entries(brandCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([brand, count]) => `${brand} (${percent(count, tests.length)})`)
        .join(" · ") || "No brands recorded",
    };

    // Insight cards (7 days): non-diagnostic generation quality only.
    const insightGroups = new Map<string, { generated: number; confidences: number[]; dismissed: number; shown: number; evidenceKeys: Set<string> }>();
    for (const insight of insights ?? []) {
      const group = insightGroups.get(insight.insight_type) ?? { generated: 0, confidences: [] as number[], dismissed: 0, shown: 0, evidenceKeys: new Set<string>() };
      group.generated += 1;
      if (insight.confidence != null) group.confidences.push(Number(insight.confidence));
      if (insight.status === "dismissed") group.dismissed += 1;
      if (insight.status !== "superseded") group.shown += 1;
      Object.keys(insight.evidence ?? {}).forEach((key) => group.evidenceKeys.add(key));
      insightGroups.set(insight.insight_type, group);
    }
    const insightBreakdown = [...insightGroups.entries()].map(([insightType, group]) => ({
      id: insightType,
      insightType,
      generated7d: group.generated,
      averageConfidence: group.confidences.length ? (group.confidences.reduce((sum, value) => sum + value, 0) / group.confidences.length).toFixed(2) : null,
      shown: group.shown,
      dismissedPercent: percent(group.dismissed, group.generated),
      evidenceFields: [...group.evidenceKeys].slice(0, 4).join(", ") || "—",
      status: "live",
    })).sort((a, b) => b.generated7d - a.generated7d);

    const visitsPlanned = (appointments ?? []).filter((appointment) => appointment.status === "planned").length;
    const visitsCompleted = (appointments ?? []).filter((appointment) => appointment.status === "completed").length;
    const rows = (appointments ?? []).map((appointment) => ({
      ...appointment,
      questionsCount: Array.isArray(appointment.questions) ? appointment.questions.length : 0,
    })).filter((row) => (!status || row.status === status) && (!query || JSON.stringify(row).toLowerCase().includes(query)));

    return NextResponse.json({
      ...pageRows(rows, page, pageSize),
      stats: {
        ttcProfiles: ttcUserCount,
        adoptionPercent: percent(ttcUserCount, trackerSettings?.length ?? 0),
        checklistHalfPercent: percent(checklistHalfCount, ttcUserCount),
        ovulationTests30d: ovulationBreakdown.total,
        visitsPlanned,
        visitsCompleted,
      },
      checklistReadiness,
      ovulationBreakdown,
      insightBreakdown,
    });
  }

  if (tab === "logs") {
    const { data: logs, error } = await admin.from("period_daily_logs").select("id,user_id,cycle_id,logged_on,flow,moods,symptoms,basal_body_temperature,temperature_unit,cervical_mucus,exercise_minutes,medication_logged,source,app_version,sync_status,created_at,updated_at").order("logged_on", { ascending: false }).limit(5000);
    if (error) return NextResponse.json({ error: "Unable to load daily logs" }, { status: 500 });
    const userIds = [...new Set((logs ?? []).map((row) => row.user_id))];
    const profiles = profileMaps(await loadProfiles(admin, userIds));
    const rows = (logs ?? []).map((row) => ({
      ...row,
      user: maskName(profiles.get(row.user_id)?.first_name, profiles.get(row.user_id)?.last_name),
      region: profiles.get(row.user_id)?.region ?? "Not supplied",
      moodsText: (Array.isArray(row.moods) ? row.moods : []).join(", ") || "—",
      symptomsText: (Array.isArray(row.symptoms) ? row.symptoms : [])
        .map((symptom: any) => (typeof symptom === "string" ? symptom : symptom?.name))
        .filter(Boolean)
        .join(", ") || "—",
    })).filter((row) => (!status || row.sync_status === status) && (!query || JSON.stringify(row).toLowerCase().includes(query)));
    return NextResponse.json(pageRows(rows, page, pageSize));
  }

  if (tab === "corrections") {
    const { data, error } = await admin.from("period_cycle_revisions").select("id,user_id,cycle_id,reason,before_values,proposed_values,forecast_impact,status,requested_by,reviewed_by,reviewed_at,created_at").order("created_at", { ascending: false }).limit(1000);
    if (error) return NextResponse.json({ error: "Unable to load corrections" }, { status: 500 });
    const userIds = [...new Set((data ?? []).map((row) => row.user_id))];
    const profiles = profileMaps(await loadProfiles(admin, userIds));
    const rows = (data ?? []).map((row) => ({ ...row, user: maskName(profiles.get(row.user_id)?.first_name, profiles.get(row.user_id)?.last_name), changes: Object.keys(row.proposed_values ?? {}).join(", ") || "No changes", forecastImpact: safeAudienceSummary(row.forecast_impact) })).filter((row) => (!status || row.status === status) && (!query || JSON.stringify(row).toLowerCase().includes(query)));
    return NextResponse.json(pageRows(rows, page, pageSize));
  }

  if (tab === "safety") {
    const { data, error } = await admin.from("period_safety_flags").select("id,user_id,flag_type,severity,rule_version,trigger_summary,status,assigned_to,resolution_code,due_at,resolved_at,created_at").order("created_at", { ascending: false }).limit(2000);
    if (error) return NextResponse.json({ error: "Unable to load safety review" }, { status: 500 });
    const userIds = [...new Set((data ?? []).map((row) => row.user_id))];
    const profiles = profileMaps(await loadProfiles(admin, userIds));
    const rows = (data ?? []).map((row) => ({ ...row, user: maskName(profiles.get(row.user_id)?.first_name, profiles.get(row.user_id)?.last_name), overdue: Boolean(row.due_at && new Date(row.due_at) < new Date() && !["resolved", "dismissed"].includes(row.status)) })).filter((row) => (!status || row.status === status) && (!query || JSON.stringify(row).toLowerCase().includes(query)));
    return NextResponse.json(pageRows(rows, page, pageSize));
  }

  if (tab === "notes") {
    const { data, error } = await admin.from("period_notes").select("id,user_id,category,flagged_at,flag_reason,review_status,assigned_to,reviewed_by,reviewed_at,resolution_code,created_at").not("flagged_at", "is", null).order("flagged_at", { ascending: false }).limit(2000);
    if (error) return NextResponse.json({ error: "Unable to load flagged note activity" }, { status: 500 });
    const userIds = [...new Set((data ?? []).map((row) => row.user_id))];
    const profiles = profileMaps(await loadProfiles(admin, userIds));
    const rows = (data ?? []).map((row) => ({
      ...row,
      user: maskName(profiles.get(row.user_id)?.first_name, profiles.get(row.user_id)?.last_name),
      region: profiles.get(row.user_id)?.region ?? "Not supplied",
      reason: row.flag_reason || "Rule-based review",
    })).filter((row) => (!status || row.review_status === status) && (!query || JSON.stringify(row).toLowerCase().includes(query)));
    return NextResponse.json(pageRows(rows, page, pageSize));
  }

  if (tab === "consent") {
    const [{ data: consents, error }, { data: requests }] = await Promise.all([
      admin.from("period_consent_events").select("user_id,consent_type,granted,policy_version,source,created_at").order("created_at", { ascending: false }).limit(5000),
      admin.from("period_privacy_requests").select("id,user_id,request_type,status,due_at,completed_at,created_at").order("created_at", { ascending: false }).limit(1000),
    ]);
    if (error) return NextResponse.json({ error: "Unable to load consent" }, { status: 500 });
    const latest = latestConsents((consents ?? []) as ConsentRecord[]);
    const userIds = [...latest.keys()];
    const profiles = profileMaps(await loadProfiles(admin, userIds));
    const rows = userIds.map((userId) => {
      const user = latest.get(userId)!;
      const rowRequests = (requests ?? []).filter((request) => request.user_id === userId);
      return {
        id: userId,
        user: maskName(profiles.get(userId)?.first_name, profiles.get(userId)?.last_name),
        userId,
        region: profiles.get(userId)?.region ?? "Not supplied",
        tracking: user.get("tracking")?.granted ?? false,
        notifications: user.get("notifications")?.granted ?? false,
        // Marketing/research consent aren't offered anywhere in the mobile
        // app yet -- "not_asked" is the honest state for every user until
        // that changes, not a fabricated "declined".
        marketing: !user.has("marketing") ? "not_asked" : user.get("marketing")!.granted ? "granted" : "declined",
        research: !user.has("research_analytics") ? "not_asked" : user.get("research_analytics")!.granted ? "granted" : "declined",
        policyVersion: [...user.values()].map((value) => value.policy_version).sort().at(-1) ?? "—",
        lastChanged: [...user.values()].map((value) => value.created_at).sort().at(-1),
        privacyRequests: rowRequests.length,
        openRequests: rowRequests.filter((request) => !["completed", "rejected", "cancelled"].includes(request.status)).length,
      };
    }).filter((row) => !query || JSON.stringify(row).toLowerCase().includes(query));
    const requestUserIds = [...new Set((requests ?? []).map((request) => request.user_id))];
    const requestProfiles = profileMaps(await loadProfiles(admin, requestUserIds));
    return NextResponse.json({
      ...pageRows(rows, page, pageSize),
      privacyRequests: (requests ?? []).map((request) => ({
        ...request,
        user: maskName(requestProfiles.get(request.user_id)?.first_name, requestProfiles.get(request.user_id)?.last_name),
      })),
    });
  }

  const { data: cycles, error } = await admin.from("period_cycles").select("id,user_id,period_start_date,period_end_date,cycle_length,period_length,next_period_forecast,ovulation_forecast,fertile_window,current_phase,source,created_at").order("period_start_date", { ascending: false }).limit(5000);
  if (error) return NextResponse.json({ error: "Unable to load cycle data" }, { status: 500 });
  const cycleRows = (cycles ?? []) as CycleRecord[];
  const userIds = [...new Set(cycleRows.map((cycle) => cycle.user_id))];
  const [{ data: consents }, { data: noteRows }, { data: dailyLogs }] = await Promise.all([
    userIds.length ? admin.from("period_consent_events").select("user_id,consent_type,granted,policy_version,source,created_at").in("user_id", userIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    userIds.length ? admin.from("period_notes").select("user_id").in("user_id", userIds) : Promise.resolve({ data: [] }),
    userIds.length ? admin.from("period_daily_logs").select("user_id,logged_on,symptoms,created_at").in("user_id", userIds).limit(5000) : Promise.resolve({ data: [] }),
  ]);
  const profiles = profileMaps(await loadProfiles(admin, userIds));
  const consentMap = latestConsents((consents ?? []) as ConsentRecord[]);

  if (tab === "users") {
    const noteCounts = new Map<string, number>();
    for (const note of noteRows ?? []) noteCounts.set(note.user_id, (noteCounts.get(note.user_id) ?? 0) + 1);
    const logCounts = new Map<string, number>();
    for (const log of dailyLogs ?? []) logCounts.set(log.user_id, (logCounts.get(log.user_id) ?? 0) + 1);
    const latestCycles = [...latestCyclePerUser(cycleRows).values()];
    const rows = latestCycles.map((cycle) => ({
      id: cycle.user_id,
      user: maskName(profiles.get(cycle.user_id)?.first_name, profiles.get(cycle.user_id)?.last_name),
      userId: cycle.user_id,
      region: profiles.get(cycle.user_id)?.region ?? "Not supplied",
      lastPeriod: cycle.period_start_date,
      cycleLength: cycle.cycle_length,
      periodLength: cycle.period_length,
      nextForecast: cycle.next_period_forecast,
      ovulationDate: cycle.ovulation_forecast,
      fertileWindow: cycle.fertile_window,
      currentPhase: cycle.current_phase ?? "Not calculated",
      dailyLogs: logCounts.get(cycle.user_id) ?? 0,
      notes: noteCounts.get(cycle.user_id) ?? 0,
      marketingOptIn: consentMap.get(cycle.user_id)?.get("marketing")?.granted === true,
      source: cycle.source,
    })).filter((row) => !query || JSON.stringify(row).toLowerCase().includes(query));
    return NextResponse.json(pageRows(rows, page, pageSize));
  }

  const now = Date.now();
  const currentStart = now - 30 * 86400000;
  const previousStart = now - 60 * 86400000;
  const currentActive = new Set<string>();
  const previousActive = new Set<string>();
  const firstActivity = new Map<string, number>();
  for (const cycle of cycleRows) {
    const at = new Date(cycle.created_at).getTime();
    firstActivity.set(cycle.user_id, Math.min(firstActivity.get(cycle.user_id) ?? at, at));
    if (at >= currentStart) currentActive.add(cycle.user_id);
    else if (at >= previousStart) previousActive.add(cycle.user_id);
  }
  for (const log of dailyLogs ?? []) {
    const at = new Date(log.created_at).getTime();
    firstActivity.set(log.user_id, Math.min(firstActivity.get(log.user_id) ?? at, at));
    if (at >= currentStart) currentActive.add(log.user_id);
    else if (at >= previousStart) previousActive.add(log.user_id);
  }

  const regions = new Map<string, { region: string; userIds: Set<string>; active: Set<string>; newUsers: Set<string>; current: Set<string>; previous: Set<string>; lengths: number[]; irregularUsers: Set<string>; optedIn: Set<string> }>();
  for (const [userId, latest] of latestCyclePerUser(cycleRows)) {
    const region = profiles.get(userId)?.region ?? "Not supplied";
    const row = regions.get(region) ?? { region, userIds: new Set<string>(), active: new Set<string>(), newUsers: new Set<string>(), current: new Set<string>(), previous: new Set<string>(), lengths: [] as number[], irregularUsers: new Set<string>(), optedIn: new Set<string>() };
    row.userIds.add(userId);
    if (currentActive.has(userId)) row.active.add(userId);
    if ((firstActivity.get(userId) ?? 0) >= currentStart) row.newUsers.add(userId);
    if (currentActive.has(userId)) row.current.add(userId);
    if (previousActive.has(userId)) row.previous.add(userId);
    if (consentMap.get(userId)?.get("marketing")?.granted) row.optedIn.add(userId);
    const userLengths = cycleRows.filter((cycle) => cycle.user_id === userId).map((cycle) => cycle.cycle_length).filter((value): value is number => Number.isFinite(value));
    row.lengths.push(...userLengths);
    if (userLengths.length >= 3 && Math.max(...userLengths) - Math.min(...userLengths) > 7) row.irregularUsers.add(userId);
    if (latest.cycle_length && (latest.cycle_length < 15 || latest.cycle_length > 60)) row.irregularUsers.add(userId);
    regions.set(region, row);
  }

  const symptomCounts: Record<string, number> = {};
  for (const log of dailyLogs ?? []) {
    for (const symptom of Array.isArray(log.symptoms) ? log.symptoms : []) {
      const name = typeof symptom === "string" ? symptom : symptom?.name;
      if (name) symptomCounts[name] = (symptomCounts[name] ?? 0) + 1;
    }
  }

  return NextResponse.json({
    summary: {
      activeTrackers: currentActive.size,
      totalTrackers: userIds.length,
      logs30d: (dailyLogs ?? []).filter((log) => new Date(log.created_at).getTime() >= currentStart).length,
      cycleLogs: cycleRows.length,
      averageCycleLength: average(cycleRows.map((cycle) => cycle.cycle_length)),
      retention: calculateRetention(currentActive, previousActive),
      marketingOptIn: [...consentMap.values()].filter((value) => value.get("marketing")?.granted).length,
    },
    definitions: PERIOD_METRIC_DEFINITIONS,
    regions: [...regions.values()].map((row) => ({
      region: row.region,
      activeTrackers: row.active.size,
      totalTrackers: row.userIds.size,
      new30d: row.newUsers.size,
      averageCycle: average(row.lengths),
      retention: calculateRetention(row.current, row.previous),
      irregularRate: percent(row.irregularUsers.size, row.userIds.size),
      marketingOptIn: percent(row.optedIn.size, row.userIds.size),
    })),
    symptoms: Object.entries(symptomCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApiUser("period.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;
  const parsed = WriteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const admin = getSupabaseAdmin();
  const input = parsed.data;

  if (input.action === "create_campaign") {
    const targetDefinition = input.region ? { region: input.region } : {};
    if (containsSensitiveAudience(targetDefinition)) return NextResponse.json({ error: "Sensitive health attributes cannot be used for campaign targeting" }, { status: 400 });
    const { data, error } = await admin.from("period_campaigns").insert({
      name: input.name,
      campaign_type: input.campaignType,
      channel: input.channel,
      target_definition: targetDefinition,
      partner_name: input.partnerName ?? null,
      scheduled_at: input.scheduledAt ?? null,
      status: "draft",
      consent_type: "marketing",
      minimum_cohort_size: input.minimumCohortSize,
      frequency_cap_days: input.frequencyCapDays,
      created_by: user.id,
    }).select("id").single();
    if (error) return NextResponse.json({ error: "Unable to create campaign" }, { status: 500 });
    await writeAudit(user.id, "create", "period_campaign", data.id, { channel: input.channel, scheduledAt: input.scheduledAt ?? null });
    return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
  }

  if (input.action === "dispatch_campaign") {
    // G7: turns a campaign into real in-app notifications. Audience = users
    // whose LATEST consent for the campaign's consent type is granted, minus
    // anyone notified by a Period campaign inside the frequency-cap window.
    // Rejects when the reachable cohort is below the campaign's minimum so
    // small sensitive groups are never singled out.
    const { data: campaign, error: campaignError } = await admin.from("period_campaigns").select("id,status,channel,consent_type,minimum_cohort_size,frequency_cap_days,reached_count").eq("id", input.campaignId).maybeSingle();
    if (campaignError || !campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    if (campaign.status === "completed" || campaign.status === "cancelled") return NextResponse.json({ error: "This campaign has already finished" }, { status: 409 });
    if (campaign.channel !== "in_app") return NextResponse.json({ error: "Only in-app campaigns can be dispatched from here" }, { status: 409 });

    const consentType = campaign.consent_type || "marketing";
    const { data: consentRows, error: consentError } = await admin.from("period_consent_events").select("user_id,granted,created_at").eq("consent_type", consentType).order("created_at", { ascending: false }).limit(20_000);
    if (consentError) return NextResponse.json({ error: "Unable to resolve the campaign audience" }, { status: 500 });
    const optedIn = new Set<string>();
    const seen = new Set<string>();
    for (const row of consentRows ?? []) {
      if (seen.has(row.user_id)) continue;
      seen.add(row.user_id);
      if (row.granted) optedIn.add(row.user_id);
    }

    const capDays = Math.max(1, Number(campaign.frequency_cap_days ?? 7));
    const capSince = new Date(Date.now() - capDays * 86400000).toISOString();
    const { data: recentNotifications, error: recentError } = await admin.from("notifications").select("user_id").eq("type", "period_campaign").gte("created_at", capSince).limit(20_000);
    if (recentError) return NextResponse.json({ error: "Unable to apply the frequency cap" }, { status: 500 });
    const recentlyReached = new Set((recentNotifications ?? []).map((row: any) => row.user_id));
    const audience = [...optedIn].filter((userId) => !recentlyReached.has(userId));

    const minimumCohort = Math.max(25, Number(campaign.minimum_cohort_size ?? 100));
    if (audience.length < minimumCohort) {
      return NextResponse.json({ error: `Reachable cohort is ${audience.length} — below the ${minimumCohort} minimum. Broaden the audience or lower the frequency cap.` }, { status: 409 });
    }

    const { error: insertError } = await admin.from("notifications").insert(audience.map((userId) => ({ user_id: userId, title: input.title, body: input.message, type: "period_campaign", metadata: { campaign_id: campaign.id }, campaign_id: campaign.id })));
    if (insertError) return NextResponse.json({ error: "Unable to deliver the campaign" }, { status: 500 });
    const { error: updateError } = await admin.from("period_campaigns").update({ reached_count: Number(campaign.reached_count ?? 0) + audience.length, sent_at: new Date().toISOString(), status: "completed" }).eq("id", campaign.id);
    if (updateError) return NextResponse.json({ error: "Campaign delivered but its status could not be updated" }, { status: 500 });
    await writeAudit(user.id, "dispatch", "period_campaign", campaign.id, { reached: audience.length, consentType, frequencyCapDays: capDays });
    return NextResponse.json({ ok: true, reached: audience.length });
  }

  if (input.action === "create_content") {
    if (unsafeHtml(input.bodyHtml)) return NextResponse.json({ error: "Content contains unsafe executable HTML" }, { status: 400 });
    const { data, error } = await admin.from("period_content").insert({
      title: input.title,
      topic: input.topic,
      content_type: input.contentType,
      locale: input.locale,
      summary: input.summary ?? null,
      body_html: input.bodyHtml,
      slug: `${slugify(input.title)}-${Date.now().toString(36)}`,
      tags: input.tags,
      cover_image_url: input.coverImageUrl ?? null,
      reading_minutes: input.readingMinutes ?? Math.max(1, Math.ceil(input.bodyHtml.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length / 220)),
      reading_level: input.readingLevel,
      featured: input.featured,
      status: "draft",
      created_by: user.id,
    }).select("id").single();
    if (error) return NextResponse.json({ error: "Unable to create content" }, { status: 500 });
    await writeAudit(user.id, "create", "period_content", data.id);
    return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
  }

  if (input.action === "create_trivia_question") {
    let position: number | null = null;
    if (input.eventId) {
      const { count } = await admin.from("period_trivia_questions").select("id", { count: "exact", head: true }).eq("event_id", input.eventId);
      position = (count ?? 0) + 1;
    }
    // Group manual questions into one reviewable batch: reuse the admin's
    // most recent manual batch if it was started within the last hour,
    // otherwise start a new one. AI-generated batches use ai_job_id instead
    // (set at insert time in /api/ai-hub/period), so this only applies here.
    const { data: recentBatch } = await admin.from("period_trivia_questions")
      .select("manual_batch_id")
      .eq("created_by", user.id)
      .is("ai_job_id", null)
      .gte("created_at", new Date(Date.now() - 60 * 60000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const manualBatchId = recentBatch?.manual_batch_id ?? crypto.randomUUID();
    const { data, error } = await admin.from("period_trivia_questions").insert({ topic: input.topic, question: input.question, options: input.options, correct_option: input.correctOption, explanation: input.explanation, difficulty: input.difficulty, status: "draft", created_by: user.id, event_id: input.eventId ?? null, position, manual_batch_id: manualBatchId }).select("id").single();
    if (error) return NextResponse.json({ error: "Unable to create trivia question" }, { status: 500 });
    if (input.eventId && input.rewardId) {
      await admin.from("period_trivia_events").update({ reward_id: input.rewardId }).eq("id", input.eventId);
    }
    await writeAudit(user.id, "create", "period_trivia_question", data.id);
    return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
  }

  if (input.action === "create_trivia_reward") {
    const { data, error } = await admin.from("period_trivia_rewards").insert({ name: input.name, description: input.description, icon: input.icon, reward_type: input.rewardType, value: input.value ?? null, created_by: user.id }).select("id").single();
    if (error) return NextResponse.json({ error: "Unable to create reward" }, { status: 500 });
    await writeAudit(user.id, "create", "period_trivia_reward", data.id);
    return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
  }

  if (input.action === "create_trivia_event") {
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    if (endsAt <= startsAt) return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
    const formatter = new Intl.DateTimeFormat("en-US", { timeZone: input.timezone, weekday: "short" });
    if (formatter.format(startsAt) !== "Fri") return NextResponse.json({ error: "Friday Trivia must start on Friday in the selected timezone" }, { status: 400 });
    const slug = `${input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80)}-${startsAt.toISOString().slice(0, 10)}`;
    const { data, error } = await admin.from("period_trivia_events").insert({ title: input.title, slug, starts_at: input.startsAt, ends_at: input.endsAt, timezone: input.timezone, leaderboard_publish_at: input.endsAt, created_by: user.id, reward_id: input.rewardId ?? null }).select("id").single();
    if (error) return NextResponse.json({ error: "Unable to create Trivia schedule" }, { status: 500 });
    await writeAudit(user.id, "create", "period_trivia_event", data.id, { startsAt: input.startsAt, endsAt: input.endsAt });
    return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
  }

  if (input.action === "review_trivia_event") {
    const { error } = await admin.rpc("review_period_trivia_event", { p_event_id: input.id, p_reviewer: user.id });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    await writeAudit(user.id, "review", "period_trivia_event", input.id);
    return NextResponse.json({ ok: true });
  }

  if (input.action === "update_trivia_question_status") {
    const published = input.status === "published";
    const { error } = await admin.from("period_trivia_questions").update({ status: input.status, validation_status: published ? "valid" : undefined, reviewed_by: published ? user.id : undefined, published_at: published ? new Date().toISOString() : null }).eq("id", input.id);
    if (error) return NextResponse.json({ error: "Unable to update Trivia question" }, { status: 500 });
    await writeAudit(user.id, `status:${input.status}`, "period_trivia_question", input.id);
    return NextResponse.json({ ok: true });
  }

  if (input.action === "bulk_update_trivia_question_status") {
    const published = input.status === "published";
    const { error } = await admin.from("period_trivia_questions").update({ status: input.status, validation_status: published ? "valid" : undefined, reviewed_by: published ? user.id : undefined, published_at: published ? new Date().toISOString() : null }).in("id", input.ids);
    if (error) return NextResponse.json({ error: "Unable to update Trivia questions" }, { status: 500 });
    await Promise.all(input.ids.map((id) => writeAudit(user.id, `status:${input.status}`, "period_trivia_question", id)));
    return NextResponse.json({ ok: true, count: input.ids.length });
  }

  if (input.action === "review_safety") {
    const final = ["resolved", "dismissed"].includes(input.resolution);
    const { error } = await admin.from("period_safety_flags").update({
      status: input.resolution,
      resolution_code: input.resolutionCode,
      resolved_at: final ? new Date().toISOString() : null,
      resolved_by: final ? user.id : null,
      assigned_to: user.id,
    }).eq("id", input.id);
    if (error) return NextResponse.json({ error: "Unable to update safety review" }, { status: 500 });
    await writeAudit(user.id, "review", "period_safety_flag", input.id, { resolution: input.resolution, resolutionCode: input.resolutionCode });
    return NextResponse.json({ ok: true });
  }

  if (input.action === "review_note") {
    const final = ["cleared", "escalated"].includes(input.resolution);
    const { error } = await admin.from("period_notes").update({
      review_status: input.resolution,
      resolution_code: input.resolutionCode,
      assigned_to: user.id,
      reviewed_by: final ? user.id : null,
      reviewed_at: final ? new Date().toISOString() : null,
    }).eq("id", input.id);
    if (error) return NextResponse.json({ error: "Unable to update note review" }, { status: 500 });
    await writeAudit(user.id, "review", "period_note", input.id, { resolution: input.resolution, resolutionCode: input.resolutionCode });
    return NextResponse.json({ ok: true });
  }

  if (input.action === "review_correction") {
    const { error } = await admin.rpc("review_period_cycle_revision", { p_revision_id: input.id, p_resolution: input.resolution, p_reviewer: user.id });
    if (error) return NextResponse.json({ error: "Unable to review correction" }, { status: 500 });
    await writeAudit(user.id, "review", "period_cycle_revision", input.id, { resolution: input.resolution });
    return NextResponse.json({ ok: true });
  }

  if (input.action === "audit_export") {
    await writeAudit(user.id, "export", "period_tracker", input.scope, { rowCount: input.rowCount, reason: input.reason, containsDirectIdentifiers: false });
    return NextResponse.json({ ok: true });
  }

  if (input.action === "update_content_status") {
    const publish = input.status === "published";
    if (publish) {
      const { data: content } = await admin.from("period_content").select("title,slug,summary,body_html,topic").eq("id", input.id).single();
      if (!content || unsafeHtml(content.body_html)) return NextResponse.json({ error: "Unsafe content cannot be published" }, { status: 400 });
      if (!content.summary?.trim() || !content.topic?.trim()) return NextResponse.json({ error: "A summary and topic are required before Library publication" }, { status: 400 });
      if (!content.slug) {
        const { error: slugError } = await admin.from("period_content").update({ slug: `${slugify(content.title)}-${input.id.slice(0, 8)}` }).eq("id", input.id);
        if (slugError) return NextResponse.json({ error: "Unable to create a unique Library address" }, { status: 500 });
      }
    }
    const { error } = await admin.from("period_content").update({ status: input.status, reviewed_by: publish ? user.id : undefined, clinical_reviewed_at: publish ? new Date().toISOString() : undefined, published_at: publish ? new Date().toISOString() : undefined }).eq("id", input.id);
    if (error) return NextResponse.json({ error: "Unable to update content" }, { status: 500 });
    await writeAudit(user.id, "status_change", "period_content", input.id, { status: input.status });
    return NextResponse.json({ ok: true });
  }

  if (input.action === "create_content_collection") {
    const { data, error } = await admin.from("period_content_collections").insert({ title: input.title, slug: `${slugify(input.title)}-${Date.now().toString(36)}`, description: input.description ?? null, curation_type: input.curationType, created_by: user.id }).select("id").single();
    if (error) return NextResponse.json({ error: "Unable to create Library collection" }, { status: 500 });
    await writeAudit(user.id, "create", "period_content_collection", data.id);
    return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
  }

  if (input.action === "add_content_to_collection") {
    const { data: content } = await admin.from("period_content").select("status").eq("id", input.contentId).maybeSingle();
    if (!content) return NextResponse.json({ error: "Content was not found" }, { status: 404 });
    const { error } = await admin.from("period_content_collection_items").upsert({ collection_id: input.collectionId, content_id: input.contentId, reason: input.reason ?? null, display_order: input.displayOrder, added_by: user.id }, { onConflict: "collection_id,content_id" });
    if (error) return NextResponse.json({ error: "Unable to add content to the collection" }, { status: 500 });
    await writeAudit(user.id, "add_item", "period_content_collection", input.collectionId, { contentId: input.contentId });
    return NextResponse.json({ ok: true });
  }

  if (input.action === "publish_content_collection") {
    const { data: items } = await admin.from("period_content_collection_items").select("content_id,period_content(status)").eq("collection_id", input.id);
    if (!(items ?? []).length || (items ?? []).some((item: any) => item.period_content?.status !== "published")) return NextResponse.json({ error: "Collections require at least one published Library item" }, { status: 409 });
    const { error } = await admin.from("period_content_collections").update({ status: "published", reviewed_by: user.id, published_at: new Date().toISOString() }).eq("id", input.id);
    if (error) return NextResponse.json({ error: "Unable to publish the collection" }, { status: 500 });
    await writeAudit(user.id, "publish", "period_content_collection", input.id);
    return NextResponse.json({ ok: true });
  }

  if (input.action === "update_campaign_status") {
    const { data: campaign, error: campaignError } = await admin.from("period_campaigns").select("id,status,target_definition,minimum_cohort_size,scheduled_at").eq("id", input.id).single();
    if (campaignError || !campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    if (containsSensitiveAudience(campaign.target_definition)) return NextResponse.json({ error: "Campaign contains a prohibited sensitive audience" }, { status: 400 });
    if (input.status === "scheduled") {
      if (!campaign.scheduled_at || new Date(campaign.scheduled_at) <= new Date()) return NextResponse.json({ error: "A future schedule is required before approval" }, { status: 400 });
      const { data: consentRows } = await admin.from("period_consent_events").select("user_id,consent_type,granted,policy_version,source,created_at").eq("consent_type", "marketing").order("created_at", { ascending: false }).limit(10000);
      const latest = latestConsents((consentRows ?? []) as ConsentRecord[]);
      let eligible = [...latest.entries()].filter(([, values]) => values.get("marketing")?.granted).map(([userId]) => userId);
      const region = campaign.target_definition?.region;
      if (region && eligible.length) {
        const { data: eligibleProfiles } = await admin.from("user_profiles").select("user_id,region").in("user_id", eligible);
        eligible = (eligibleProfiles ?? []).filter((profile) => profile.region === region).map((profile) => profile.user_id);
      }
      if (eligible.length < Number(campaign.minimum_cohort_size)) return NextResponse.json({ error: "Consent-safe audience is below the minimum cohort size" }, { status: 409 });
    }
    const { error } = await admin.from("period_campaigns").update({ status: input.status, approved_by: input.status === "scheduled" ? user.id : undefined, approved_at: input.status === "scheduled" ? new Date().toISOString() : undefined }).eq("id", input.id);
    if (error) return NextResponse.json({ error: "Unable to update campaign" }, { status: 500 });
    await writeAudit(user.id, "status_change", "period_campaign", input.id, { status: input.status });
    return NextResponse.json({ ok: true });
  }

  if (input.action === "update_privacy_request") {
    const { error } = await admin.from("period_privacy_requests").update({ status: input.status, assigned_to: user.id, completed_at: input.status === "completed" ? new Date().toISOString() : null }).eq("id", input.id);
    if (error) return NextResponse.json({ error: "Unable to update privacy request" }, { status: 500 });
    await writeAudit(user.id, "status_change", "period_privacy_request", input.id, { status: input.status });
    return NextResponse.json({ ok: true });
  }

  if (input.action === "update_feature_flag") {
    const { error } = await admin.from("period_feature_flags").update({ enabled: input.enabled, rollout_percent: input.rolloutPercent, updated_by: user.id }).eq("key", input.key);
    if (error) return NextResponse.json({ error: "Unable to update feature flag" }, { status: 500 });
    await writeAudit(user.id, "rollout_change", "period_feature_flag", input.key, { enabled: input.enabled, rolloutPercent: input.rolloutPercent });
    return NextResponse.json({ ok: true });
  }

  if (input.action === "grant_premium") {
    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime() + input.durationDays * 86400000);
    const { data, error } = await admin.from("period_premium_grants").insert({
      user_id: input.userId,
      tier: input.tier,
      source: input.source,
      reason: input.reason,
      notes: input.notes ?? null,
      starts_at: startsAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      granted_by: user.id,
    }).select("id").single();
    if (error) return NextResponse.json({ error: "Unable to grant premium access" }, { status: 500 });
    await writeAudit(user.id, "grant", "period_premium_grant", data.id, { userId: input.userId, tier: input.tier, durationDays: input.durationDays, reason: input.reason });
    return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
  }

  if (input.action === "extend_premium_grant") {
    const { data: grant } = await admin.from("period_premium_grants").select("id,starts_at,expires_at,revoked_at").eq("id", input.id).maybeSingle();
    if (!grant) return NextResponse.json({ error: "Grant not found" }, { status: 404 });
    if (grant.revoked_at) return NextResponse.json({ error: "Revoked grants cannot be extended" }, { status: 409 });
    const baseMs = Math.max(Date.now(), new Date(grant.expires_at).getTime());
    const expiresAt = new Date(baseMs + input.days * 86400000);
    const capMs = new Date(grant.starts_at).getTime() + 90 * 86400000;
    if (expiresAt.getTime() > capMs) return NextResponse.json({ error: "Duration cap exceeded — grants cannot run longer than 90 days from their start" }, { status: 400 });
    const { error } = await admin.from("period_premium_grants").update({ expires_at: expiresAt.toISOString() }).eq("id", input.id);
    if (error) return NextResponse.json({ error: "Unable to extend the grant" }, { status: 500 });
    await writeAudit(user.id, "extend", "period_premium_grant", input.id, { days: input.days, expiresAt: expiresAt.toISOString() });
    return NextResponse.json({ ok: true });
  }

  if (input.action === "revoke_premium_grant") {
    const { error } = await admin.from("period_premium_grants").update({ revoked_at: new Date().toISOString(), revoked_by: user.id }).eq("id", input.id).is("revoked_at", null);
    if (error) return NextResponse.json({ error: "Unable to revoke the grant" }, { status: 500 });
    await writeAudit(user.id, "revoke", "period_premium_grant", input.id);
    return NextResponse.json({ ok: true });
  }

  if (input.action === "update_premium_settings") {
    const { error } = await admin.from("period_premium_settings").update({
      onboarding_trial_days: input.onboardingTrialDays,
      expiry_reminder_days: input.expiryReminderDays,
      auto_lock_on_expiry: input.autoLockOnExpiry,
      show_paywall_on_expiry: input.showPaywallOnExpiry,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }).eq("id", 1);
    if (error) return NextResponse.json({ error: "Unable to update premium settings" }, { status: 500 });
    await writeAudit(user.id, "update", "period_premium_settings", "singleton", { onboardingTrialDays: input.onboardingTrialDays });
    return NextResponse.json({ ok: true });
  }

  if (input.action === "create_fulfillment") {
    const { data, error } = await admin.from("period_trivia_fulfillment").insert({
      event_id: input.eventId,
      submission_id: input.submissionId ?? null,
      tier_label: input.tierLabel,
      reward_id: input.rewardId ?? null,
      notes: input.notes ?? null,
    }).select("id").single();
    if (error) return NextResponse.json({ error: "Unable to create the fulfillment entry" }, { status: 500 });
    await writeAudit(user.id, "create", "period_trivia_fulfillment", data.id, { eventId: input.eventId, tierLabel: input.tierLabel });
    return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
  }

  if (input.action === "mark_fulfillment_sent") {
    const { data: entry } = await admin.from("period_trivia_fulfillment").select("id,prize_status").eq("id", input.id).maybeSingle();
    if (!entry) return NextResponse.json({ error: "Fulfillment entry not found" }, { status: 404 });
    if (entry.prize_status === "fulfilled") return NextResponse.json({ error: "Fulfilled prizes cannot move back to sent" }, { status: 409 });
    const now = new Date().toISOString();
    // Marking sent fires the in-app fulfillment prompt for the winner.
    const { error } = await admin.from("period_trivia_fulfillment").update({ prize_status: "sent", sent_at: now, sent_by: user.id, prompt_sent_at: now }).eq("id", input.id);
    if (error) return NextResponse.json({ error: "Unable to mark the prize as sent" }, { status: 500 });
    await writeAudit(user.id, "send", "period_trivia_fulfillment", input.id);
    return NextResponse.json({ ok: true });
  }

  if (input.action === "mark_fulfillment_fulfilled") {
    const { data: entry } = await admin.from("period_trivia_fulfillment").select("id,prize_status").eq("id", input.id).maybeSingle();
    if (!entry) return NextResponse.json({ error: "Fulfillment entry not found" }, { status: 404 });
    if (entry.prize_status === "pending") return NextResponse.json({ error: "Mark the prize as sent before fulfilling it" }, { status: 409 });
    const now = new Date().toISOString();
    const { error } = await admin.from("period_trivia_fulfillment").update({ prize_status: "fulfilled", confirmed_at: now, fulfilled_at: now, fulfilled_by: user.id }).eq("id", input.id);
    if (error) return NextResponse.json({ error: "Unable to mark the prize as fulfilled" }, { status: 500 });
    await writeAudit(user.id, "fulfill", "period_trivia_fulfillment", input.id);
    return NextResponse.json({ ok: true });
  }

  if (input.action === "block_trivia_device") {
    const { data, error } = await admin.from("period_trivia_blocked_devices").insert({
      device_hash: input.deviceHash,
      mobile_hash: input.mobileHash ?? null,
      user_id: input.userId ?? null,
      violation: input.violation,
      evidence: input.evidence ?? null,
      status: input.status,
      blocked_by: input.status === "blocked" ? user.id : null,
    }).select("id").single();
    if (error) return NextResponse.json({ error: "Unable to record the block" }, { status: 500 });
    await writeAudit(user.id, input.status === "blocked" ? "block" : "flag", "period_trivia_blocked_device", data.id, { violation: input.violation });
    return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
  }

  if (input.action === "unblock_trivia_device") {
    const { error } = await admin.from("period_trivia_blocked_devices").update({ status: "unblocked", unblocked_at: new Date().toISOString(), unblocked_by: user.id }).eq("id", input.id);
    if (error) return NextResponse.json({ error: "Unable to unblock the device" }, { status: 500 });
    await writeAudit(user.id, "unblock", "period_trivia_blocked_device", input.id);
    return NextResponse.json({ ok: true });
  }

  if (input.action === "update_trivia_rule") {
    const { error } = await admin.from("period_trivia_rules").update({ value: input.value, is_active: input.isActive, updated_by: user.id, updated_at: new Date().toISOString() }).eq("key", input.key);
    if (error) return NextResponse.json({ error: "Unable to update the trivia rule" }, { status: 500 });
    await writeAudit(user.id, "update", "period_trivia_rule", input.key, { value: input.value, isActive: input.isActive });
    return NextResponse.json({ ok: true });
  }

  if (input.action === "schedule_ai_suggestion") {
    const { data: job } = await admin.from("period_ai_jobs").select("id,status,job_type").eq("id", input.jobId).maybeSingle();
    if (!job) return NextResponse.json({ error: "AI suggestion not found" }, { status: 404 });
    if (!["content_suggestion", "content_curation"].includes(job.job_type)) return NextResponse.json({ error: "Only content suggestion jobs can be scheduled" }, { status: 400 });
    const { error } = await admin.from("period_ai_jobs").update({ scheduled_at: input.scheduledAt, frequency_cap_days: input.frequencyCapDays, surface_duration_weeks: input.surfaceDurationWeeks, surface_channel: input.surfaceChannel, scheduled_by: user.id }).eq("id", input.jobId);
    if (error) return NextResponse.json({ error: "Unable to schedule the suggestion" }, { status: 500 });
    await writeAudit(user.id, "schedule", "period_ai_job", input.jobId, { scheduledAt: input.scheduledAt, frequencyCapDays: input.frequencyCapDays });
    return NextResponse.json({ ok: true });
  }

  const { error } = await admin.from("period_ai_model_metrics").update({ status: input.status }).eq("id", input.id);
  if (error) return NextResponse.json({ error: "Unable to update forecast model" }, { status: 500 });
  await writeAudit(user.id, "status_change", "period_forecast_model", input.id, { status: input.status });
  return NextResponse.json({ ok: true });
}
