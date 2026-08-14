import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const DateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Goal = z.enum(["track_period", "trying_to_conceive", "pregnancy", "pcos_support"]);

const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("save_settings"),
    goal: Goal,
    typicalCycleLength: z.number().int().min(15).max(60),
    typicalPeriodLength: z.number().int().min(1).max(14),
    timezone: z.string().trim().min(1).max(100),
    locale: z.string().trim().min(2).max(12).default("en"),
    onboardingVersion: z.string().trim().max(30).optional(),
    onboardingComplete: z.boolean().default(true),
    remindersEnabled: z.boolean().default(false),
  }),
  z.object({
    action: z.literal("save_daily_log"),
    loggedOn: DateString,
    cycleId: z.string().uuid().optional(),
    flow: z.enum(["none", "spotting", "light", "medium", "heavy"]).nullable().optional(),
    moods: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
    symptoms: z.array(z.object({ name: z.string().trim().min(1).max(80), severity: z.number().int().min(1).max(5).optional() })).max(30).default([]),
    basalBodyTemperature: z.number().min(34).max(42).nullable().optional(),
    temperatureUnit: z.enum(["c", "f"]).default("c"),
    cervicalMucus: z.enum(["dry", "sticky", "creamy", "watery", "egg_white", "other"]).nullable().optional(),
    sexualActivity: z.enum(["none", "protected", "unprotected", "prefer_not_to_say"]).nullable().optional(),
    exerciseMinutes: z.number().int().min(0).max(1440).nullable().optional(),
    medicationLogged: z.boolean().default(false),
    noteCiphertext: z.string().max(20_000).optional(),
    noteCategory: z.string().trim().max(80).optional(),
    clientEventId: z.string().trim().min(8).max(200),
    appVersion: z.string().trim().max(40).optional(),
    source: z.enum(["user", "device", "offline_sync"]).default("device"),
  }),
  z.object({
    action: z.literal("record_consent"),
    consentType: z.enum(["tracking", "notifications", "marketing", "research_analytics"]),
    granted: z.boolean(),
    policyVersion: z.string().trim().min(1).max(50),
    source: z.enum(["onboarding", "settings", "privacy_center"]),
  }),
  z.object({
    action: z.literal("request_correction"),
    cycleId: z.string().uuid(),
    reason: z.string().trim().min(5).max(500),
    proposedValues: z.object({
      period_start_date: DateString.optional(),
      period_end_date: DateString.nullable().optional(),
      cycle_length: z.number().int().min(15).max(60).nullable().optional(),
      period_length: z.number().int().min(1).max(14).nullable().optional(),
    }).refine((value) => Object.keys(value).length > 0, "At least one correction is required"),
  }),
  z.object({
    action: z.literal("privacy_request"),
    requestType: z.enum(["export", "delete", "correct", "restrict"]),
  }),
  z.object({
    action: z.literal("content_event"),
    contentId: z.string().uuid(),
    eventType: z.enum(["impression", "open", "complete", "helpful", "not_helpful", "bookmark", "unbookmark", "share"]),
    appVersion: z.string().trim().max(40).optional(),
  }),
  z.object({
    action: z.literal("trivia_attempt"),
    quizKey: z.string().trim().min(2).max(100),
    questionCount: z.number().int().min(1).max(100),
    correctCount: z.number().int().min(0).max(100),
    points: z.number().int().min(0).max(100_000),
    durationSeconds: z.number().int().min(0).max(86_400).optional(),
    appVersion: z.string().trim().max(40).optional(),
  }).refine((value) => value.correctCount <= value.questionCount, { message: "Correct answers cannot exceed the question count", path: ["correctCount"] }),
  z.object({
    action: z.literal("app_event"),
    eventName: z.enum(["onboarding_complete", "log_save", "sync", "forecast_view", "calendar_correction", "content_search"]),
    platform: z.string().trim().max(40).optional(),
    appVersion: z.string().trim().max(40).optional(),
    status: z.enum(["success", "failure", "warning"]),
    durationMs: z.number().int().min(0).max(600_000).optional(),
    metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
  }),
]);

async function ownerClient() {
  const supabase = await getSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : user };
}

export async function GET() {
  const { supabase, user } = await ownerClient();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [settings, cycles, logs, forecasts, consents, preferences, content, trivia, flags] = await Promise.all([
    supabase.from("period_user_settings").select("tracking_goal,typical_cycle_length,typical_period_length,timezone,locale,onboarding_version,onboarding_completed_at,reminders_enabled,quiet_hours_start,quiet_hours_end,updated_at").eq("user_id", user.id).maybeSingle(),
    supabase.from("period_cycles").select("id,period_start_date,period_end_date,cycle_length,period_length,next_period_forecast,ovulation_forecast,fertile_window,current_phase,source,created_at,updated_at").eq("user_id", user.id).order("period_start_date", { ascending: false }).limit(24),
    supabase.from("period_daily_logs").select("id,cycle_id,logged_on,flow,moods,symptoms,basal_body_temperature,temperature_unit,cervical_mucus,sexual_activity,exercise_minutes,medication_logged,note_ciphertext,note_category,source,client_event_id,app_version,sync_status,created_at,updated_at").eq("user_id", user.id).order("logged_on", { ascending: false }).limit(400),
    supabase.from("period_forecasts").select("id,cycle_id,model_key,model_version,predicted_period_start,predicted_ovulation_date,fertile_window,confidence,explanation_code,generated_at,superseded_at").eq("user_id", user.id).is("superseded_at", null).order("generated_at", { ascending: false }).limit(12),
    supabase.from("period_consent_events").select("consent_type,granted,policy_version,source,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
    supabase.from("period_notification_preferences").select("period_reminders,fertile_window_reminders,content_reminders,quiet_hours_start,quiet_hours_end,timezone,updated_at").eq("user_id", user.id).maybeSingle(),
    supabase.from("period_content").select("id,title,topic,summary,content_type,locale,tags,media_url,version,body_html,published_at").eq("status", "published").order("published_at", { ascending: false }).limit(100),
    supabase.from("period_trivia_events").select("id,title,status,starts_at,ends_at,timezone").in("status", ["ready", "live", "ended"]).order("starts_at", { ascending: true }).limit(12),
    supabase.from("period_feature_flags").select("key,description,rollout_percent,minimum_app_version").eq("enabled", true),
  ]);

  const firstError = [settings, cycles, logs, forecasts, consents, preferences, content, trivia, flags].find((result) => result.error)?.error;
  if (firstError) {
    console.error("[period/me]", firstError.message);
    return NextResponse.json({ error: "Unable to load Period Tracker data" }, { status: 500 });
  }

  const latestLog = logs.data?.[0];
  const latestCycle = cycles.data?.[0];
  const symptomWords = (latestLog?.symptoms ?? []).map((item: any) => String(item.name ?? item).toLowerCase());
  const phase = String(latestCycle?.current_phase ?? "").toLowerCase();
  const recommendations = (content.data ?? []).map((item: any) => {
    const haystack = `${item.title} ${item.topic} ${(item.tags ?? []).join(" ")}`.toLowerCase();
    const symptomMatch = symptomWords.find((word: string) => haystack.includes(word));
    const phaseMatch = phase && haystack.includes(phase);
    return { ...item, recommendationType: "content", reasonCode: symptomMatch ? "recent_symptom_topic" : phaseMatch ? "current_cycle_phase" : "recent_reviewed_content", reason: symptomMatch ? `Relevant to a symptom you chose to track: ${symptomMatch}` : phaseMatch ? `Relevant to your estimated ${phase} phase` : "Recently published and clinically reviewed", confidence: symptomMatch || phaseMatch ? 0.86 : 0.55 };
  }).sort((a: any, b: any) => b.confidence - a.confidence).slice(0, 8);
  const latestNotificationConsent = consents.data?.find((item: any) => item.consent_type === "notifications");
  const engagementSuggestions = latestNotificationConsent?.granted ? [{ recommendationType: "engagement", reasonCode: "weekly_learning_opt_in", title: "Your weekly Library picks are ready", message: "Explore reviewed content selected from your recent tracker inputs.", sendEligible: true, safetyPolicy: "period-safety-v1" }] : [];

  return NextResponse.json({
    settings: settings.data,
    cycles: cycles.data ?? [],
    dailyLogs: logs.data ?? [],
    forecasts: forecasts.data ?? [],
    consentEvents: consents.data ?? [],
    notificationPreferences: preferences.data,
    content: content.data ?? [],
    triviaEvents: trivia.data ?? [],
    recommendations,
    engagementSuggestions,
    featureFlags: flags.data ?? [],
    serverTime: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await ownerClient();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = ActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;

  if (input.action === "save_settings") {
    const { error } = await supabase.from("period_user_settings").upsert({ user_id: user.id, tracking_goal: input.goal, typical_cycle_length: input.typicalCycleLength, typical_period_length: input.typicalPeriodLength, timezone: input.timezone, locale: input.locale, onboarding_version: input.onboardingVersion ?? null, onboarding_completed_at: input.onboardingComplete ? new Date().toISOString() : null, reminders_enabled: input.remindersEnabled }, { onConflict: "user_id" });
    if (error) return NextResponse.json({ error: "Unable to save settings" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (input.action === "save_daily_log") {
    const { data, error } = await supabase.from("period_daily_logs").upsert({ user_id: user.id, cycle_id: input.cycleId ?? null, logged_on: input.loggedOn, flow: input.flow ?? null, moods: input.moods, symptoms: input.symptoms, basal_body_temperature: input.basalBodyTemperature ?? null, temperature_unit: input.temperatureUnit, cervical_mucus: input.cervicalMucus ?? null, sexual_activity: input.sexualActivity ?? null, exercise_minutes: input.exerciseMinutes ?? null, medication_logged: input.medicationLogged, note_ciphertext: input.noteCiphertext ?? null, note_category: input.noteCategory ?? null, client_event_id: input.clientEventId, app_version: input.appVersion ?? null, source: input.source, sync_status: "synced" }, { onConflict: "user_id,logged_on" }).select("id,updated_at").single();
    if (error) return NextResponse.json({ error: "Unable to save daily log" }, { status: 500 });
    return NextResponse.json({ ok: true, data });
  }

  if (input.action === "record_consent") {
    const { error } = await supabase.from("period_consent_events").insert({ user_id: user.id, consent_type: input.consentType, granted: input.granted, policy_version: input.policyVersion, source: input.source });
    if (error) return NextResponse.json({ error: "Unable to record consent" }, { status: 500 });
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  if (input.action === "request_correction") {
    const { data: cycle, error: cycleError } = await supabase.from("period_cycles").select("id,period_start_date,period_end_date,cycle_length,period_length").eq("id", input.cycleId).eq("user_id", user.id).single();
    if (cycleError || !cycle) return NextResponse.json({ error: "Cycle record not found" }, { status: 404 });
    const { data, error } = await supabase.from("period_cycle_revisions").insert({ cycle_id: input.cycleId, user_id: user.id, requested_by: user.id, reason: input.reason, before_values: cycle, proposed_values: input.proposedValues }).select("id").single();
    if (error) return NextResponse.json({ error: "Unable to request correction" }, { status: 500 });
    return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
  }

  if (input.action === "privacy_request") {
    const due = new Date(Date.now() + 28 * 86400000).toISOString();
    const { data, error } = await supabase.from("period_privacy_requests").insert({ user_id: user.id, request_type: input.requestType, due_at: due }).select("id,due_at").single();
    if (error) return NextResponse.json({ error: "Unable to create privacy request" }, { status: 500 });
    return NextResponse.json({ ok: true, data }, { status: 201 });
  }

  if (input.action === "content_event") {
    const { error } = await supabase.from("period_content_events").insert({ user_id: user.id, content_id: input.contentId, event_type: input.eventType, app_version: input.appVersion ?? null });
    if (error) return NextResponse.json({ error: "Unable to record content activity" }, { status: 500 });
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  if (input.action === "trivia_attempt") {
    const { error } = await supabase.from("period_trivia_attempts").insert({ user_id: user.id, quiz_key: input.quizKey, question_count: input.questionCount, correct_count: input.correctCount, points: input.points, duration_seconds: input.durationSeconds ?? null, app_version: input.appVersion ?? null });
    if (error) return NextResponse.json({ error: "Unable to save trivia attempt" }, { status: 500 });
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const { error } = await supabase.from("period_app_events").insert({ user_id: user.id, event_name: input.eventName, platform: input.platform ?? null, app_version: input.appVersion ?? null, status: input.status, duration_ms: input.durationMs ?? null, metadata: input.metadata });
  if (error) return NextResponse.json({ error: "Unable to record app event" }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
