import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPeriodRequestClient } from "@/lib/period-request-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { DEFAULT_CYCLE_LENGTH, DEFAULT_PERIOD_LENGTH, predictNextPeriod, type CycleInput } from "@/lib/period-calculator";
import { generateFertilityInsights } from "@/lib/fertility-insights";

const DateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Goal = z.enum(["track_period", "trying_to_conceive", "pregnancy", "pcos_support"]);
const TtcReadinessStatus = z.enum(["not_started", "planned", "completed", "not_applicable"]);
const OvulationTestResult = z.enum(["negative", "low", "high", "peak", "positive", "invalid"]);

const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("save_settings"),
    goal: Goal,
    typicalCycleLength: z.number().int().min(15).max(60),
    typicalPeriodLength: z.number().int().min(1).max(14),
    timezone: z.string().trim().min(1).max(100),
    locale: z.string().trim().min(2).max(12).default("en"),
    region: z.string().trim().max(60).nullable().optional(),
    onboardingVersion: z.string().trim().max(30).optional(),
    onboardingComplete: z.boolean().default(true),
    remindersEnabled: z.boolean().default(false),
  }),
  z.object({
    action: z.literal("save_ttc_profile"),
    tryingSince: DateString.nullable().optional(),
    conceptionTimeline: z.enum(["soon", "next_3_months", "next_6_months", "this_year", "not_sure"]).nullable().optional(),
    showConceptionLanguage: z.boolean().default(true),
    partnerInvolved: z.boolean().nullable().optional(),
    prenatalVitaminStartedOn: DateString.nullable().optional(),
    preconceptionVisitStatus: TtcReadinessStatus.default("not_started"),
    preconceptionVisitDate: DateString.nullable().optional(),
    medicationReviewStatus: TtcReadinessStatus.default("not_started"),
    vaccineReviewStatus: TtcReadinessStatus.default("not_started"),
    chronicConditionReviewStatus: TtcReadinessStatus.default("not_started"),
    stiScreeningStatus: TtcReadinessStatus.default("not_started"),
    dentalCheckStatus: TtcReadinessStatus.default("not_started"),
    lifestyleFocusAreas: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
    notesCiphertext: z.string().max(20_000).nullable().optional(),
  }),
  z.object({
    action: z.literal("save_ovulation_test"),
    id: z.string().uuid().optional(),
    loggedOn: DateString,
    testedAt: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
    result: OvulationTestResult,
    brand: z.string().trim().max(120).nullable().optional(),
    notesCiphertext: z.string().max(20_000).nullable().optional(),
    clientEventId: z.string().trim().min(8).max(200).optional(),
    appVersion: z.string().trim().max(40).optional(),
    source: z.enum(["user", "device", "offline_sync"]).default("device"),
  }),
  z.object({
    action: z.literal("update_ttc_checklist_progress"),
    checklistItemId: z.string().uuid(),
    status: z.enum(["not_started", "planned", "done", "skipped"]),
    targetDate: DateString.nullable().optional(),
    reminderEnabled: z.boolean().default(false),
    notesCiphertext: z.string().max(20_000).nullable().optional(),
  }),
  z.object({
    action: z.literal("save_preconception_appointment"),
    id: z.string().uuid().optional(),
    appointmentDate: z.string().datetime(),
    timezone: z.string().trim().min(1).max(100).default("UTC"),
    clinicianName: z.string().trim().max(160).nullable().optional(),
    purpose: z.enum(["preconception_visit", "medication_review", "vaccine_review", "fertility_consult", "other"]).default("preconception_visit"),
    status: z.enum(["planned", "completed", "cancelled"]).default("planned"),
    questions: z.array(z.string().trim().min(1).max(500)).max(20).default([]),
    notesCiphertext: z.string().max(20_000).nullable().optional(),
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
    medicationName: z.string().trim().max(120).nullable().optional(),
    noteCiphertext: z.string().max(20_000).optional(),
    noteCategory: z.string().trim().max(80).optional(),
    clientEventId: z.string().trim().min(8).max(200),
    appVersion: z.string().trim().max(40).optional(),
    source: z.enum(["user", "device", "offline_sync"]).default("device"),
  }),
  z.object({
    action: z.literal("record_consent"),
    consentType: z.enum(["tracking", "notifications", "marketing", "research_analytics", "personalization"]),
    granted: z.boolean(),
    policyVersion: z.string().trim().min(1).max(50),
    source: z.enum(["onboarding", "settings", "privacy_center"]),
  }),
  z.object({
    action: z.literal("confirm_period_start"),
    periodStartDate: DateString,
    periodEndDate: DateString.nullable().optional(),
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
    action: z.literal("app_event"),
    eventName: z.enum(["onboarding_complete", "log_save", "sync", "forecast_view", "calendar_correction", "content_search"]),
    platform: z.string().trim().max(40).optional(),
    appVersion: z.string().trim().max(40).optional(),
    status: z.enum(["success", "failure", "warning"]),
    durationMs: z.number().int().min(0).max(600_000).optional(),
    metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
  }),
  // TTC & Fertility writes (mobile api.ts contract). Intimate detail stays
  // encrypted (notes_ciphertext); only the active checklist template and the
  // user's own aggregates come back down in GET.
  z.object({
    action: z.literal("save_ttc_profile"),
    tryingSince: DateString.nullable().optional(),
    conceptionTimeline: z.string().trim().max(80).nullable().optional(),
    showConceptionLanguage: z.boolean().optional(),
    partnerInvolved: z.boolean().optional(),
    prenatalVitaminStartedOn: DateString.nullable().optional(),
    preconceptionVisitStatus: z.string().trim().max(40).nullable().optional(),
    preconceptionVisitDate: DateString.nullable().optional(),
    medicationReviewStatus: z.string().trim().max(40).nullable().optional(),
    vaccineReviewStatus: z.string().trim().max(40).nullable().optional(),
    chronicConditionReviewStatus: z.string().trim().max(40).nullable().optional(),
    stiScreeningStatus: z.string().trim().max(40).nullable().optional(),
    dentalCheckStatus: z.string().trim().max(40).nullable().optional(),
    lifestyleFocusAreas: z.array(z.string().trim().min(1).max(60)).max(12).optional(),
    notesCiphertext: z.string().max(20_000).nullable().optional(),
  }),
  z.object({
    action: z.literal("save_ovulation_test"),
    id: z.string().uuid(),
    loggedOn: DateString,
    testedAt: z.string().trim().max(40).nullable().optional(),
    result: z.string().trim().min(1).max(30),
    brand: z.string().trim().max(120).nullable().optional(),
    notesCiphertext: z.string().max(20_000).nullable().optional(),
    clientEventId: z.string().uuid().nullable().optional(),
    appVersion: z.string().trim().max(40).optional(),
    source: z.enum(["user", "device", "offline_sync"]).default("user"),
  }),
  z.object({
    action: z.literal("update_ttc_checklist_progress"),
    checklistItemId: z.string().uuid(),
    status: z.string().trim().min(1).max(30),
    targetDate: DateString.nullable().optional(),
    reminderEnabled: z.boolean().optional(),
    notesCiphertext: z.string().max(20_000).nullable().optional(),
  }),
  z.object({
    action: z.literal("save_preconception_appointment"),
    id: z.string().uuid(),
    appointmentDate: DateString,
    timezone: z.string().trim().max(80).optional(),
    clinicianName: z.string().trim().max(160).nullable().optional(),
    purpose: z.string().trim().min(1).max(80),
    status: z.string().trim().min(1).max(30),
    questions: z.array(z.string().trim().min(1).max(1000)).max(20).optional(),
    notesCiphertext: z.string().max(20_000).nullable().optional(),
  }),
  z.object({
    action: z.literal("save_notification_preferences"),
    periodReminders: z.boolean().optional(),
    fertileWindowReminders: z.boolean().optional(),
    contentReminders: z.boolean().optional(),
    quietHoursStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
    quietHoursEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
  }),
]);

export async function GET(request: NextRequest) {
  const { supabase, user } = await getPeriodRequestClient(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [
    settings,
    cycles,
    logs,
    forecasts,
    consents,
    preferences,
    ttcProfile,
    ovulationTests,
    ttcChecklistItems,
    ttcChecklistProgress,
    preconceptionAppointments,
    fertilityInsights,
    content,
    trivia,
    flags,
  ] = await Promise.all([
    supabase.from("period_user_settings").select("tracking_goal,typical_cycle_length,typical_period_length,timezone,locale,onboarding_version,onboarding_completed_at,reminders_enabled,quiet_hours_start,quiet_hours_end,updated_at").eq("user_id", user.id).maybeSingle(),
    supabase.from("period_cycles").select("id,period_start_date,period_end_date,cycle_length,period_length,next_period_forecast,ovulation_forecast,fertile_window,current_phase,source,created_at,updated_at").eq("user_id", user.id).order("period_start_date", { ascending: false }).limit(24),
    supabase.from("period_daily_logs").select("id,cycle_id,logged_on,flow,moods,symptoms,basal_body_temperature,temperature_unit,cervical_mucus,sexual_activity,exercise_minutes,medication_logged,medication_name,note_ciphertext,note_category,source,client_event_id,app_version,sync_status,created_at,updated_at").eq("user_id", user.id).order("logged_on", { ascending: false }).limit(400),
    supabase.from("period_forecasts").select("id,cycle_id,model_key,model_version,predicted_period_start,predicted_ovulation_date,fertile_window,confidence,explanation_code,generated_at,superseded_at").eq("user_id", user.id).is("superseded_at", null).order("generated_at", { ascending: false }).limit(12),
    supabase.from("period_consent_events").select("consent_type,granted,policy_version,source,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
    supabase.from("period_notification_preferences").select("period_reminders,fertile_window_reminders,content_reminders,ovulation_test_reminders,prenatal_vitamin_reminders,preconception_checklist_reminders,quiet_hours_start,quiet_hours_end,timezone,updated_at").eq("user_id", user.id).maybeSingle(),
    supabase.from("period_ttc_profiles").select("trying_since,conception_timeline,show_conception_language,partner_involved,prenatal_vitamin_started_on,preconception_visit_status,preconception_visit_date,medication_review_status,vaccine_review_status,chronic_condition_review_status,sti_screening_status,dental_check_status,lifestyle_focus_areas,notes_ciphertext,created_at,updated_at").eq("user_id", user.id).maybeSingle(),
    supabase.from("period_ovulation_tests").select("id,logged_on,tested_at,result,brand,notes_ciphertext,source,client_event_id,app_version,created_at,updated_at").eq("user_id", user.id).order("logged_on", { ascending: false }).limit(180),
    supabase.from("period_ttc_checklist_items").select("id,code,title,description,category,source_label,source_url,display_order,is_active,updated_at").eq("is_active", true).order("display_order", { ascending: true }),
    supabase.from("period_ttc_checklist_progress").select("checklist_item_id,status,target_date,completed_at,reminder_enabled,notes_ciphertext,created_at,updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }),
    supabase.from("period_preconception_appointments").select("id,appointment_date,timezone,clinician_name,purpose,status,questions,notes_ciphertext,created_at,updated_at").eq("user_id", user.id).order("appointment_date", { ascending: false }).limit(50),
    supabase.from("period_fertility_insights").select("id,cycle_id,insight_date,insight_type,title,message,confidence,evidence,source_model,safety_level,status,expires_at,created_at,updated_at").eq("user_id", user.id).eq("status", "active").order("insight_date", { ascending: false }).limit(20),
    supabase.from("period_content").select("id,title,topic,summary,content_type,locale,tags,media_url,version,body_html,published_at").eq("status", "published").order("published_at", { ascending: false }).limit(100),
    supabase.from("period_trivia_events").select("id,title,status,starts_at,ends_at,timezone").in("status", ["ready", "live", "ended"]).order("starts_at", { ascending: true }).limit(12),
    supabase.from("period_feature_flags").select("key,description,rollout_percent,minimum_app_version").eq("enabled", true),
  ]);

  const firstError = [
    settings,
    cycles,
    logs,
    forecasts,
    consents,
    preferences,
    ttcProfile,
    ovulationTests,
    ttcChecklistItems,
    ttcChecklistProgress,
    preconceptionAppointments,
    fertilityInsights,
    content,
    trivia,
    flags,
  ].find((result) => result.error)?.error;
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

  // G8: surface AI suggestions scheduled to the today_tip channel. Only
  // completed jobs inside their surface window qualify; output shape is read
  // defensively so malformed jobs are skipped, never surfaced raw.
  let tipSuggestions: any[] = [];
  try {
    const adminForTips = getSupabaseAdmin();
    const nowIso = new Date().toISOString();
    const { data: tipJobs } = await adminForTips.from("period_ai_jobs").select("id,output,scheduled_at,surface_duration_weeks").eq("job_type", "content_suggestion").eq("status", "completed").eq("surface_channel", "today_tip").lte("scheduled_at", nowIso).limit(20);
    tipSuggestions = (tipJobs ?? [])
      .filter((job: any) => {
        const windowMs = Math.max(1, Number(job.surface_duration_weeks ?? 2)) * 7 * 86400000;
        return job.scheduled_at && Date.now() - new Date(job.scheduled_at).getTime() <= windowMs;
      })
      .map((job: any) => {
        const output = job.output ?? {};
        const title = typeof output.title === "string" ? output.title : "Today's tip";
        const message = typeof output.summary === "string" ? output.summary : typeof output.message === "string" ? output.message : typeof output.body === "string" ? output.body : "";
        return { recommendationType: "engagement", reasonCode: "ai_today_tip", title, message, sendEligible: false, safetyPolicy: "period-safety-v1" };
      })
      .filter((tip: any) => tip.message.length > 0);
  } catch {
    // Tip surfacing is best-effort.
  }

  // G6: derive today's fertility insight cards and persist any that are new
  // (idempotent per user + insight_type + insight_date). Educational wording
  // only — never pregnancy inference, never diagnosis.
  let insights = (fertilityInsights.data ?? []) as any[];
  try {
    const today = new Date().toISOString().slice(0, 10);
    const drafts = generateFertilityInsights({
      today,
      trackingGoal: settings.data?.tracking_goal ?? null,
      cycles: (cycles.data ?? []) as any[],
      forecasts: (forecasts.data ?? []) as any[],
      dailyLogs: (logs.data ?? []) as any[],
      ovulationTests: (ovulationTests.data ?? []) as any[],
      checklistItems: (ttcChecklistItems.data ?? []) as any[],
      checklistProgress: (ttcChecklistProgress.data ?? []) as any[],
    });
    const existingToday = new Set(insights.filter((row: any) => row.insight_date === today).map((row: any) => row.insight_type));
    const fresh = drafts.filter((draft) => !existingToday.has(draft.insight_type));
    if (fresh.length) {
      const admin = getSupabaseAdmin();
      const { data: created } = await admin.from("period_fertility_insights").insert(fresh.map((draft) => ({ user_id: user.id, insight_type: draft.insight_type, insight_date: draft.insight_date, title: draft.title, summary: draft.summary, confidence: draft.confidence, evidence: draft.evidence, safety_level: draft.safety_level, suggested_action: draft.suggested_action, status: "active" }))).select();
      if (created) insights = [...insights, ...created];
    }
  } catch {
    // Insight generation is best-effort; never block the tracker payload.
  }

  return NextResponse.json({
    settings: settings.data,
    cycles: cycles.data ?? [],
    dailyLogs: logs.data ?? [],
    forecasts: forecasts.data ?? [],
    consentEvents: consents.data ?? [],
    notificationPreferences: preferences.data,
    ttcProfile: ttcProfile.data,
    ovulationTests: ovulationTests.data ?? [],
    ttcChecklistItems: ttcChecklistItems.data ?? [],
    ttcChecklistProgress: ttcChecklistProgress.data ?? [],
    preconceptionAppointments: preconceptionAppointments.data ?? [],
    fertilityInsights: insights,
    content: content.data ?? [],
    triviaEvents: trivia.data ?? [],
    recommendations,
    engagementSuggestions: [...engagementSuggestions, ...tipSuggestions],
    featureFlags: flags.data ?? [],
    serverTime: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await getPeriodRequestClient(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = ActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;

  if (input.action === "save_settings") {
    const { error } = await supabase.from("period_user_settings").upsert({ user_id: user.id, tracking_goal: input.goal, typical_cycle_length: input.typicalCycleLength, typical_period_length: input.typicalPeriodLength, timezone: input.timezone, locale: input.locale, region: input.region ?? null, onboarding_version: input.onboardingVersion ?? null, onboarding_completed_at: input.onboardingComplete ? new Date().toISOString() : null, reminders_enabled: input.remindersEnabled }, { onConflict: "user_id" });
    if (error) return NextResponse.json({ error: "Unable to save settings" }, { status: 500 });

    // Onboarding trial: every newly onboarded user gets the configured free
    // Cycle Pro window (7/14/30 days, or none when set to 0). Provisions at
    // most ONE trial grant per user; after it lapses premium features
    // auto-lock until a subscription or admin grant exists. Service role is
    // required because users have no write policy on grants.
    if (input.onboardingComplete) {
      try {
        const admin = getSupabaseAdmin();
        const [{ data: trialSettings }, { data: priorTrials }] = await Promise.all([
          admin.from("period_premium_settings").select("onboarding_trial_days").maybeSingle(),
          admin.from("period_premium_grants").select("id").eq("user_id", user.id).eq("source", "onboarding_trial").limit(1),
        ]);
        const trialDays = trialSettings?.onboarding_trial_days ?? 0;
        if (trialDays > 0 && !(priorTrials ?? []).length) {
          await admin.from("period_premium_grants").insert({
            user_id: user.id,
            tier: "cycle_pro",
            source: "onboarding_trial",
            reason: `Onboarding trial (${trialDays} days)`,
            starts_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + trialDays * 86400000).toISOString(),
          });
        }
      } catch {
        // Trial provisioning must never block onboarding itself.
      }
    }

    return NextResponse.json({ ok: true });
  }

  if (input.action === "save_ttc_profile") {
    const { error } = await supabase.from("period_ttc_profiles").upsert({
      user_id: user.id,
      trying_since: input.tryingSince ?? null,
      conception_timeline: input.conceptionTimeline ?? null,
      show_conception_language: input.showConceptionLanguage,
      partner_involved: input.partnerInvolved ?? null,
      prenatal_vitamin_started_on: input.prenatalVitaminStartedOn ?? null,
      preconception_visit_status: input.preconceptionVisitStatus,
      preconception_visit_date: input.preconceptionVisitDate ?? null,
      medication_review_status: input.medicationReviewStatus,
      vaccine_review_status: input.vaccineReviewStatus,
      chronic_condition_review_status: input.chronicConditionReviewStatus,
      sti_screening_status: input.stiScreeningStatus,
      dental_check_status: input.dentalCheckStatus,
      lifestyle_focus_areas: input.lifestyleFocusAreas,
      notes_ciphertext: input.notesCiphertext ?? null,
    }, { onConflict: "user_id" });
    if (error) return NextResponse.json({ error: "Unable to save TTC profile" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (input.action === "save_ovulation_test") {
    const payload = {
      user_id: user.id,
      logged_on: input.loggedOn,
      tested_at: input.testedAt ?? null,
      result: input.result,
      brand: input.brand?.trim() || null,
      notes_ciphertext: input.notesCiphertext ?? null,
      source: input.source,
      client_event_id: input.clientEventId ?? null,
      app_version: input.appVersion ?? null,
    };

    if (input.id) {
      const { data, error } = await supabase.from("period_ovulation_tests").update(payload).eq("id", input.id).eq("user_id", user.id).select("id,updated_at").single();
      if (error) return NextResponse.json({ error: "Unable to save ovulation test" }, { status: 500 });
      return NextResponse.json({ ok: true, data });
    }

    if (input.clientEventId) {
      const { data: existing } = await supabase.from("period_ovulation_tests").select("id").eq("user_id", user.id).eq("client_event_id", input.clientEventId).maybeSingle();
      if (existing?.id) {
        const { data, error } = await supabase.from("period_ovulation_tests").update(payload).eq("id", existing.id).eq("user_id", user.id).select("id,updated_at").single();
        if (error) return NextResponse.json({ error: "Unable to save ovulation test" }, { status: 500 });
        return NextResponse.json({ ok: true, data });
      }
    }

    const { data, error } = await supabase.from("period_ovulation_tests").insert(payload).select("id,updated_at").single();
    if (error) return NextResponse.json({ error: "Unable to save ovulation test" }, { status: 500 });
    return NextResponse.json({ ok: true, data }, { status: 201 });
  }

  if (input.action === "update_ttc_checklist_progress") {
    const completedAt = input.status === "done" ? new Date().toISOString() : null;
    const { error } = await supabase.from("period_ttc_checklist_progress").upsert({
      user_id: user.id,
      checklist_item_id: input.checklistItemId,
      status: input.status,
      target_date: input.targetDate ?? null,
      completed_at: completedAt,
      reminder_enabled: input.reminderEnabled,
      notes_ciphertext: input.notesCiphertext ?? null,
    }, { onConflict: "user_id,checklist_item_id" });
    if (error) return NextResponse.json({ error: "Unable to save checklist progress" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (input.action === "save_preconception_appointment") {
    const payload = {
      user_id: user.id,
      appointment_date: input.appointmentDate,
      timezone: input.timezone,
      clinician_name: input.clinicianName?.trim() || null,
      purpose: input.purpose,
      status: input.status,
      questions: input.questions,
      notes_ciphertext: input.notesCiphertext ?? null,
    };

    if (input.id) {
      const { data, error } = await supabase.from("period_preconception_appointments").update(payload).eq("id", input.id).eq("user_id", user.id).select("id,updated_at").single();
      if (error) return NextResponse.json({ error: "Unable to save appointment" }, { status: 500 });
      return NextResponse.json({ ok: true, data });
    }

    const { data, error } = await supabase.from("period_preconception_appointments").insert(payload).select("id,updated_at").single();
    if (error) return NextResponse.json({ error: "Unable to save appointment" }, { status: 500 });
    return NextResponse.json({ ok: true, data }, { status: 201 });
  }

  if (input.action === "save_daily_log") {
    const { data, error } = await supabase.from("period_daily_logs").upsert({ user_id: user.id, cycle_id: input.cycleId ?? null, logged_on: input.loggedOn, flow: input.flow ?? null, moods: input.moods, symptoms: input.symptoms, basal_body_temperature: input.basalBodyTemperature ?? null, temperature_unit: input.temperatureUnit, cervical_mucus: input.cervicalMucus ?? null, sexual_activity: input.sexualActivity ?? null, exercise_minutes: input.exerciseMinutes ?? null, medication_logged: input.medicationLogged, medication_name: input.medicationLogged ? (input.medicationName?.trim() || null) : null, note_ciphertext: input.noteCiphertext ?? null, note_category: input.noteCategory ?? null, client_event_id: input.clientEventId, app_version: input.appVersion ?? null, source: input.source, sync_status: "synced" }, { onConflict: "user_id,logged_on" }).select("id,updated_at").single();
    if (error) return NextResponse.json({ error: "Unable to save daily log" }, { status: 500 });
    return NextResponse.json({ ok: true, data });
  }

  if (input.action === "save_ttc_profile") {
    const { error } = await supabase.from("period_ttc_profiles").upsert({ user_id: user.id, trying_since: input.tryingSince ?? null, conception_timeline: input.conceptionTimeline ?? null, show_conception_language: input.showConceptionLanguage ?? true, partner_involved: input.partnerInvolved ?? false, prenatal_vitamin_started_on: input.prenatalVitaminStartedOn ?? null, preconception_visit_status: input.preconceptionVisitStatus ?? null, preconception_visit_date: input.preconceptionVisitDate ?? null, medication_review_status: input.medicationReviewStatus ?? null, vaccine_review_status: input.vaccineReviewStatus ?? null, chronic_condition_review_status: input.chronicConditionReviewStatus ?? null, sti_screening_status: input.stiScreeningStatus ?? null, dental_check_status: input.dentalCheckStatus ?? null, lifestyle_focus_areas: input.lifestyleFocusAreas ?? [], notes_ciphertext: input.notesCiphertext ?? null }, { onConflict: "user_id" });
    if (error) return NextResponse.json({ error: "Unable to save TTC profile" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (input.action === "save_ovulation_test") {
    const { data, error } = await supabase.from("period_ovulation_tests").upsert({ id: input.id, user_id: user.id, logged_on: input.loggedOn, tested_at: input.testedAt ?? null, result: input.result, brand: input.brand ?? null, notes_ciphertext: input.notesCiphertext ?? null, client_event_id: input.clientEventId ?? null, app_version: input.appVersion ?? null, source: input.source }, { onConflict: "user_id,client_event_id" }).select("id,updated_at").single();
    if (error) return NextResponse.json({ error: "Unable to save ovulation test" }, { status: 500 });
    return NextResponse.json({ ok: true, data });
  }

  if (input.action === "update_ttc_checklist_progress") {
    const { error } = await supabase.from("period_ttc_checklist_progress").upsert({ user_id: user.id, checklist_item_id: input.checklistItemId, status: input.status, target_date: input.targetDate ?? null, reminder_enabled: input.reminderEnabled ?? false, notes_ciphertext: input.notesCiphertext ?? null }, { onConflict: "user_id,checklist_item_id" });
    if (error) return NextResponse.json({ error: "Unable to update checklist progress" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (input.action === "save_preconception_appointment") {
    const { data, error } = await supabase.from("period_preconception_appointments").upsert({ id: input.id, user_id: user.id, appointment_date: input.appointmentDate, timezone: input.timezone ?? "Africa/Accra", clinician_name: input.clinicianName ?? null, purpose: input.purpose, status: input.status, questions: input.questions ?? [], notes_ciphertext: input.notesCiphertext ?? null }).select("id,updated_at").single();
    if (error) return NextResponse.json({ error: "Unable to save appointment" }, { status: 500 });
    return NextResponse.json({ ok: true, data });
  }

  if (input.action === "save_notification_preferences") {
    const { error } = await supabase.from("period_notification_preferences").upsert({ user_id: user.id, period_reminders: input.periodReminders ?? true, fertile_window_reminders: input.fertileWindowReminders ?? true, content_reminders: input.contentReminders ?? false, quiet_hours_start: input.quietHoursStart ?? null, quiet_hours_end: input.quietHoursEnd ?? null }, { onConflict: "user_id" });
    if (error) return NextResponse.json({ error: "Unable to save notification preferences" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (input.action === "record_consent") {
    const { error } = await supabase.from("period_consent_events").insert({ user_id: user.id, consent_type: input.consentType, granted: input.granted, policy_version: input.policyVersion, source: input.source });
    if (error) return NextResponse.json({ error: "Unable to record consent" }, { status: 500 });
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  if (input.action === "confirm_period_start") {
    const [{ data: settings }, { data: history }] = await Promise.all([
      supabase.from("period_user_settings").select("typical_cycle_length,typical_period_length").eq("user_id", user.id).maybeSingle(),
      supabase.from("period_cycles").select("period_start_date,period_length").eq("user_id", user.id).order("period_start_date", { ascending: false }).limit(12),
    ]);
    const typicalCycleLength = settings?.typical_cycle_length ?? DEFAULT_CYCLE_LENGTH;
    const typicalPeriodLength = settings?.typical_period_length ?? DEFAULT_PERIOD_LENGTH;

    const cycleHistory: CycleInput[] = [
      ...(history ?? []),
      { period_start_date: input.periodStartDate, period_length: typicalPeriodLength },
    ];
    const prediction = predictNextPeriod(cycleHistory, input.periodStartDate, typicalPeriodLength);

    const { data: cycle, error: cycleError } = await supabase.from("period_cycles").upsert({
      user_id: user.id,
      period_start_date: input.periodStartDate,
      period_end_date: input.periodEndDate ?? null,
      cycle_length: typicalCycleLength,
      period_length: typicalPeriodLength,
      next_period_forecast: prediction.predictedPeriodStart,
      ovulation_forecast: prediction.predictedOvulationDate,
      source: "user",
    }, { onConflict: "user_id,period_start_date" }).select("id").single();
    if (cycleError) return NextResponse.json({ error: "Unable to confirm the period start date" }, { status: 500 });

    // Retire any prior active forecast before writing the new one — keeps
    // forecast-accuracy history (absolute_error_days) intact for later
    // comparison instead of overwriting it in place.
    await supabase.from("period_forecasts").update({ superseded_at: new Date().toISOString() }).eq("user_id", user.id).is("superseded_at", null);
    const { data: forecast, error: forecastError } = await supabase.from("period_forecasts").insert({
      user_id: user.id,
      cycle_id: cycle.id,
      model_key: prediction.modelKey,
      model_version: "1.0.0",
      predicted_period_start: prediction.predictedPeriodStart,
      predicted_ovulation_date: prediction.predictedOvulationDate,
      fertile_window: `[${prediction.fertileWindowStart},${prediction.fertileWindowEnd}]`,
      confidence: prediction.confidence,
      explanation_code: prediction.conservativeOvulationDate ? "irregular_conservative_available" : null,
    }).select("id,predicted_period_start,predicted_ovulation_date,confidence").single();
    if (forecastError) return NextResponse.json({ error: "Unable to generate a forecast" }, { status: 500 });

    return NextResponse.json({ ok: true, data: { cycleId: cycle.id, forecast } }, { status: 201 });
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

  const { error } = await supabase.from("period_app_events").insert({ user_id: user.id, event_name: input.eventName, platform: input.platform ?? null, app_version: input.appVersion ?? null, status: input.status, duration_ms: input.durationMs ?? null, metadata: input.metadata });
  if (error) return NextResponse.json({ error: "Unable to record app event" }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
