import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminApiUser } from "@/lib/admin-api-auth";
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
  }).refine((value) => value.correctOption < value.options.length, { message: "Correct option is outside the option list", path: ["correctOption"] }),
  z.object({
    action: z.literal("create_trivia_event"),
    title: z.string().trim().min(3).max(160),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    timezone: z.string().trim().min(3).max(80).default("Africa/Accra"),
  }),
  z.object({ action: z.literal("review_trivia_event"), id: z.string().uuid() }),
  z.object({
    action: z.literal("update_trivia_question_status"), id: z.string().uuid(),
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
  const { data } = await admin.from("user_profiles").select("user_id,first_name,last_name,region").in("user_id", userIds);
  return data ?? [];
}

function pageRows<T>(rows: T[], page: number, pageSize: number) {
  const total = rows.length;
  return {
    data: rows.slice((page - 1) * pageSize, page * pageSize),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

export async function GET(request: NextRequest) {
  const user = await getAdminApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    const [{ data, error }, { data: publications }, { data: sourceLinks }, { data: collections }] = await Promise.all([
      admin.from("period_content").select("id,title,slug,summary,topic,content_type,locale,tags,cover_image_url,reading_minutes,reading_level,featured,curation_type,version,reads,completion_count,helpful_count,not_helpful_count,status,clinical_reviewed_at,review_expires_at,published_at,created_at").order("created_at", { ascending: false }).limit(1000),
      admin.from("period_content_publications").select("content_id,channel,status,starts_at,ends_at,featured,display_order").eq("channel", "plasence_library").limit(1000),
      admin.from("period_content_sources").select("period_content_id,source_menu,source_id,source_title").limit(5000),
      admin.from("period_content_collections").select("id,title,slug,status,curation_type,display_order,published_at,period_content_collection_items(content_id,display_order)").order("display_order").limit(200),
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
    return NextResponse.json({ ...pageRows(rows, page, pageSize), collections: collections ?? [] });
  }

  if (tab === "trivia") {
    const [{ data: questions, error }, { data: submissions }, { data: events }, { data: leads }] = await Promise.all([
      admin.from("period_trivia_questions").select("id,event_id,position,topic,question,difficulty,status,validation_status,ai_job_id,source_refs,reviewed_by,published_at,created_at").order("created_at", { ascending: false }).limit(1000),
      admin.from("period_trivia_submissions").select("id,event_id,user_id,score,question_count,duration_seconds,submitted_at").gte("submitted_at", new Date(Date.now() - 30 * 86400000).toISOString()).limit(5000),
      admin.from("period_trivia_events").select("id,title,status,starts_at,ends_at,timezone,question_count,reviewed_at").order("starts_at", { ascending: false }).limit(100),
      admin.from("period_trivia_leads").select("id,event_id,submission_id,user_id,full_name_ciphertext,mobile_ciphertext,social_handle_ciphertext,consent_version,consented_at,acquisition_source,campaign_code,utm_source,utm_medium,utm_campaign,status,assigned_to,last_contacted_at,created_at").order("created_at", { ascending: false }).limit(1000),
    ]);
    if (error) return NextResponse.json({ error: "Unable to load trivia" }, { status: 500 });
    const rows = (questions ?? []).filter((row) => (!status || row.status === status) && (!query || JSON.stringify(row).toLowerCase().includes(query)));
    const answers = (submissions ?? []).reduce((sum, item) => sum + Number(item.question_count), 0);
    const correct = (submissions ?? []).reduce((sum, item) => sum + Number(item.score), 0);
    const maskedLeads = (leads ?? []).map((lead) => {
      try {
        const name = decryptLead(lead.full_name_ciphertext);
        const mobile = decryptLead(lead.mobile_ciphertext);
        const handle = decryptLead(lead.social_handle_ciphertext);
        return { ...lead, full_name_ciphertext: undefined, mobile_ciphertext: undefined, social_handle_ciphertext: undefined,
          name: `${name.slice(0, 1)}${"•".repeat(Math.max(2, Math.min(8, name.length - 1)))}`, mobile: maskMobile(mobile), socialHandle: `${handle.slice(0, 2)}••••` };
      } catch { return { ...lead, full_name_ciphertext: undefined, mobile_ciphertext: undefined, social_handle_ciphertext: undefined, name: "Encrypted lead", mobile: "Protected", socialHandle: "Protected" }; }
    });
    return NextResponse.json({ ...pageRows(rows, page, pageSize), events: events ?? [], leads: maskedLeads, submissions: submissions ?? [], summary: { attempts30d: submissions?.length ?? 0, leads30d: maskedLeads.length, correctRate: percent(correct, answers) } });
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
    const grouped = new Map<string, { id: string; eventName: string; platform: string; appVersion: string; success: number; failure: number; warning: number; averageDuration: number | null; latestAt: string }>();
    for (const event of events ?? []) {
      const id = `${event.event_name}:${event.platform ?? "unknown"}:${event.app_version ?? "unknown"}`;
      const row = grouped.get(id) ?? { id, eventName: event.event_name, platform: event.platform ?? "Unknown", appVersion: event.app_version ?? "Unknown", success: 0, failure: 0, warning: 0, averageDuration: null, latestAt: event.occurred_at };
      row[event.status as "success" | "failure" | "warning"] += 1;
      const durations = (events ?? []).filter((item) => `${item.event_name}:${item.platform ?? "unknown"}:${item.app_version ?? "unknown"}` === id).map((item) => item.duration_ms);
      row.averageDuration = average(durations);
      grouped.set(id, row);
    }
    return NextResponse.json({ ...pageRows([...grouped.values()].filter((row) => !query || JSON.stringify(row).toLowerCase().includes(query)), page, pageSize), featureFlags: flags ?? [] });
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
      moodCount: row.moods?.length ?? 0,
      symptomCount: Array.isArray(row.symptoms) ? row.symptoms.length : 0,
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
        marketing: user.get("marketing")?.granted ?? false,
        research: user.get("research_analytics")?.granted ?? false,
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
  const user = await getAdminApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const { data, error } = await admin.from("period_trivia_questions").insert({ topic: input.topic, question: input.question, options: input.options, correct_option: input.correctOption, explanation: input.explanation, difficulty: input.difficulty, status: "draft", created_by: user.id }).select("id").single();
    if (error) return NextResponse.json({ error: "Unable to create trivia question" }, { status: 500 });
    await writeAudit(user.id, "create", "period_trivia_question", data.id);
    return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
  }

  if (input.action === "create_trivia_event") {
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    if (endsAt <= startsAt) return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
    const formatter = new Intl.DateTimeFormat("en-US", { timeZone: input.timezone, weekday: "short" });
    if (formatter.format(startsAt) !== "Fri") return NextResponse.json({ error: "Friday Trivia must start on Friday in the selected timezone" }, { status: 400 });
    const slug = `${input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80)}-${startsAt.toISOString().slice(0, 10)}`;
    const { data, error } = await admin.from("period_trivia_events").insert({ title: input.title, slug, starts_at: input.startsAt, ends_at: input.endsAt, timezone: input.timezone, leaderboard_publish_at: input.endsAt, created_by: user.id }).select("id").single();
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

  const { error } = await admin.from("period_ai_model_metrics").update({ status: input.status }).eq("id", input.id);
  if (error) return NextResponse.json({ error: "Unable to update forecast model" }, { status: 500 });
  await writeAudit(user.id, "status_change", "period_forecast_model", input.id, { status: input.status });
  return NextResponse.json({ ok: true });
}
