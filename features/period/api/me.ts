import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPeriodRequestClient } from "@/features/period/data/request-auth";
import { getAdminClient } from "@/lib/db/admin";
import { DEFAULT_CYCLE_LENGTH, DEFAULT_PERIOD_LENGTH, predictNextPeriod, type CycleInput } from "@/features/period/data/period-calculator";
import { generateFertilityInsights, detectBbtShift } from "@/features/period/data/fertility-insights";

const DateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Goal = z.enum(["track_period", "trying_to_conceive", "pregnancy", "pcos_support", "postpartum"]);
const TtcReadinessStatus = z.enum(["not_started", "planned", "completed", "not_applicable"]);
const OvulationTestResult = z.enum(["negative", "low", "high", "peak", "positive", "invalid"]);
const PregnancyTestResult = z.enum(["negative", "faint_positive", "positive", "invalid"]);

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
    action: z.literal("save_pregnancy_test"),
    id: z.string().uuid().optional(),
    loggedOn: DateString,
    testedAt: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
    result: PregnancyTestResult,
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
    reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
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
    // Phase 3: linking a facility marks this a request an admin fulfills
    // (review_appointment_request) rather than a purely self-logged
    // appointment — request_status is derived server-side from this, never
    // accepted directly from the client.
    facilityId: z.string().uuid().nullable().optional(),
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
    action: z.literal("end_period_cycle"),
    periodEndDate: DateString,
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
  z.object({
    action: z.literal("save_notification_preferences"),
    periodReminders: z.boolean().optional(),
    fertileWindowReminders: z.boolean().optional(),
    contentReminders: z.boolean().optional(),
    ovulationTestReminders: z.boolean().optional(),
    prenatalVitaminReminders: z.boolean().optional(),
    preconceptionChecklistReminders: z.boolean().optional(),
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
    pregnancyTests,
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
    supabase.from("period_pregnancy_tests").select("id,logged_on,tested_at,result,brand,notes_ciphertext,source,client_event_id,app_version,created_at,updated_at").eq("user_id", user.id).order("logged_on", { ascending: false }).limit(60),
    supabase.from("period_ttc_checklist_items").select("id,code,title,description,category,source_label,source_url,display_order,is_active,updated_at").eq("is_active", true).order("display_order", { ascending: true }),
    supabase.from("period_ttc_checklist_progress").select("checklist_item_id,status,target_date,reminder_time,completed_at,reminder_enabled,notes_ciphertext,created_at,updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }),
    supabase.from("period_preconception_appointments").select("id,appointment_date,timezone,clinician_name,purpose,status,questions,notes_ciphertext,facility_id,request_status,created_at,updated_at").eq("user_id", user.id).order("appointment_date", { ascending: false }).limit(50),
    supabase.from("period_fertility_insights").select("id,cycle_id,insight_date,insight_type,title,message,confidence,evidence,source_model,safety_level,status,expires_at,created_at,updated_at").eq("user_id", user.id).eq("status", "active").order("insight_date", { ascending: false }).limit(20),
    supabase.from("period_content").select("id,title,slug,topic,summary,content_type,locale,tags,cover_image_url,media_url,reading_minutes,reading_level,version,body_html,published_at").eq("status", "published").order("published_at", { ascending: false }).limit(100),
    // Today/promotional surfaces receive only explicitly reviewed events that
    // have not expired. Drafts must never become visible merely because their
    // date range includes today. Historical results remain available from the
    // dedicated /api/period/trivia endpoint.
    supabase.from("period_trivia_events").select("id,title,slug,status,starts_at,ends_at,timezone,leaderboard_publish_at,reward:period_trivia_rewards(name,description,icon)").eq("status", "ready").gte("ends_at", new Date().toISOString()).order("starts_at", { ascending: true }).limit(12),
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
    pregnancyTests,
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
    const adminForTips = getAdminClient();
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
    // BBT-shift evidence must not span into a prior cycle — the same
    // bounding already applied to confirm_period_start's bbtShiftDetected
    // and the mobile client's ovulationEvidence label. Without this, the
    // "Temperature shift noted" card could compare a stale reading from
    // weeks ago against a fresh one, since logs.data is otherwise just the
    // 400 most recent rows with no cycle boundary.
    const currentCycleStart = cycles.data?.[0]?.period_start_date;
    const currentCycleLogs = currentCycleStart
      ? (logs.data ?? []).filter((log) => log.logged_on >= currentCycleStart)
      : (logs.data ?? []);
    const drafts = generateFertilityInsights({
      today,
      trackingGoal: settings.data?.tracking_goal ?? null,
      cycles: (cycles.data ?? []) as any[],
      forecasts: (forecasts.data ?? []) as any[],
      dailyLogs: currentCycleLogs as any[],
      ovulationTests: (ovulationTests.data ?? []) as any[],
      checklistItems: (ttcChecklistItems.data ?? []) as any[],
      checklistProgress: (ttcChecklistProgress.data ?? []) as any[],
    });
    const existingToday = new Set(insights.filter((row: any) => row.insight_date === today).map((row: any) => row.insight_type));
    const fresh = drafts.filter((draft) => !existingToday.has(draft.insight_type));
    if (fresh.length) {
      const admin = getAdminClient();
      const { data: created } = await admin.from("period_fertility_insights").insert(fresh.map((draft) => ({ user_id: user.id, insight_type: draft.insight_type, insight_date: draft.insight_date, title: draft.title, message: draft.message, confidence: draft.confidence, evidence: draft.evidence, safety_level: draft.safety_level, status: "active" }))).select();
      if (created) insights = [...insights, ...created];
    }
  } catch {
    // Insight generation is best-effort; never block the tracker payload.
  }

  // Fertility Insights are a Cycle Pro feature — Insights screen gating on
  // mobile is client-side (the route itself), but the content must not
  // reach an ineligible client in the first place. Redact rather than skip
  // the entitlement check on failure: an unreadable entitlement should not
  // fail open into premium content.
  try {
    const { data: entitlement } = await supabase.rpc("get_my_entitlement");
    const periodPremium = Boolean((entitlement as { period_premium?: boolean } | null)?.period_premium);
    if (!periodPremium) insights = [];
  } catch {
    insights = [];
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
    pregnancyTests: pregnancyTests.data ?? [],
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
        const admin = getAdminClient();
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

  if (input.action === "save_pregnancy_test") {
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
      const { data, error } = await supabase.from("period_pregnancy_tests").update(payload).eq("id", input.id).eq("user_id", user.id).select("id,updated_at").single();
      if (error) return NextResponse.json({ error: "Unable to save pregnancy test" }, { status: 500 });
      return NextResponse.json({ ok: true, data });
    }

    if (input.clientEventId) {
      const { data: existing } = await supabase.from("period_pregnancy_tests").select("id").eq("user_id", user.id).eq("client_event_id", input.clientEventId).maybeSingle();
      if (existing?.id) {
        const { data, error } = await supabase.from("period_pregnancy_tests").update(payload).eq("id", existing.id).eq("user_id", user.id).select("id,updated_at").single();
        if (error) return NextResponse.json({ error: "Unable to save pregnancy test" }, { status: 500 });
        return NextResponse.json({ ok: true, data });
      }
    }

    const { data, error } = await supabase.from("period_pregnancy_tests").insert(payload).select("id,updated_at").single();
    if (error) return NextResponse.json({ error: "Unable to save pregnancy test" }, { status: 500 });
    return NextResponse.json({ ok: true, data }, { status: 201 });
  }

  if (input.action === "update_ttc_checklist_progress") {
    const completedAt = input.status === "done" ? new Date().toISOString() : null;
    const { error } = await supabase.from("period_ttc_checklist_progress").upsert({
      user_id: user.id,
      checklist_item_id: input.checklistItemId,
      status: input.status,
      target_date: input.targetDate ?? null,
      reminder_time: input.reminderTime ?? null,
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
      facility_id: input.facilityId ?? null,
      request_status: input.facilityId ? "requested" : "self_logged",
    };

    if (input.id) {
      // request_status is intentionally excluded from an update to an
      // existing row — once a facility request is out, only
      // review_appointment_request (admin) or a fresh insert changes its
      // status, not the owner editing other fields.
      const { request_status: _requestStatus, ...updatePayload } = payload;
      const { data, error } = await supabase.from("period_preconception_appointments").update(updatePayload).eq("id", input.id).eq("user_id", user.id).select("id,updated_at").single();
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

  if (input.action === "save_notification_preferences") {
    // Ensure the row exists first (defaults only apply on first creation),
    // then apply only the fields this call actually provided. The previous
    // version upserted every field with a `?? default` fallback on every
    // call, which meant saving just one toggle (e.g. ovulationTestReminders
    // from a dedicated reminders section) silently reset every other
    // preference back to its default — a real clobbering bug once this
    // action has more than one caller.
    await supabase.from("period_notification_preferences").upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });
    const patch: Record<string, unknown> = {};
    if (input.periodReminders !== undefined) patch.period_reminders = input.periodReminders;
    if (input.fertileWindowReminders !== undefined) patch.fertile_window_reminders = input.fertileWindowReminders;
    if (input.contentReminders !== undefined) patch.content_reminders = input.contentReminders;
    if (input.ovulationTestReminders !== undefined) patch.ovulation_test_reminders = input.ovulationTestReminders;
    if (input.prenatalVitaminReminders !== undefined) patch.prenatal_vitamin_reminders = input.prenatalVitaminReminders;
    if (input.preconceptionChecklistReminders !== undefined) patch.preconception_checklist_reminders = input.preconceptionChecklistReminders;
    if (input.quietHoursStart !== undefined) patch.quiet_hours_start = input.quietHoursStart;
    if (input.quietHoursEnd !== undefined) patch.quiet_hours_end = input.quietHoursEnd;
    const { error } = Object.keys(patch).length
      ? await supabase.from("period_notification_preferences").update(patch).eq("user_id", user.id)
      : { error: null };
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

    // Evidence for a newly-started cycle must come from the cycle that just
    // ended. The previous implementation queried on/after the new start date,
    // which ignored the prior cycle's OPKs and could mix unrelated BBT values.
    const previousCycleStart = (history ?? []).find(
      (cycle) => cycle.period_start_date < input.periodStartDate,
    )?.period_start_date;
    const [{ data: recentOpk }, { data: recentTemps }] = previousCycleStart
      ? await Promise.all([
          supabase.from("period_ovulation_tests").select("id").eq("user_id", user.id).gte("logged_on", previousCycleStart).lt("logged_on", input.periodStartDate).in("result", ["positive", "peak"]).limit(1),
          supabase.from("period_daily_logs").select("logged_on,basal_body_temperature").eq("user_id", user.id).gte("logged_on", previousCycleStart).lt("logged_on", input.periodStartDate).not("basal_body_temperature", "is", null).order("logged_on", { ascending: false }).limit(6),
        ])
      : [{ data: [] }, { data: [] }];

    const cycleHistory: CycleInput[] = [
      ...(history ?? []).filter(
        (cycle) => cycle.period_start_date !== input.periodStartDate,
      ),
      { period_start_date: input.periodStartDate, period_length: typicalPeriodLength },
    ];
    const sortedTemps = [...(recentTemps ?? [])].sort((a, b) => a.logged_on.localeCompare(b.logged_on)).map((row) => row.basal_body_temperature as number);
    const bbtShiftDetected = detectBbtShift(sortedTemps) != null;
    const prediction = predictNextPeriod(cycleHistory, input.periodStartDate, typicalPeriodLength, Boolean(recentOpk?.length), bbtShiftDetected);

    // Cycle upsert + forecast supersede + forecast insert happen atomically,
    // as the table owner, inside fn_record_period_cycle. Security definer
    // here is for atomicity, not an RLS gap — period_cycles has had an
    // owner-write policy since 20260814163334_period_tracker_mobile_contract_fixes.sql.
    const { data: result, error: rpcError } = await supabase.rpc("fn_record_period_cycle", {
      p_period_start_date: input.periodStartDate,
      p_period_end_date: input.periodEndDate ?? null,
      p_cycle_length: typicalCycleLength,
      p_period_length: typicalPeriodLength,
      p_next_period_forecast: prediction.predictedPeriodStart,
      p_ovulation_forecast: prediction.predictedOvulationDate,
      p_fertile_window: `[${prediction.fertileWindowStart},${prediction.fertileWindowEnd}]`,
      p_model_key: prediction.modelKey,
      p_model_version: "1.0.0",
      p_confidence: prediction.confidence,
      // ovulationEvidence is a cautious support label (estimated, OPK-supported,
      // BBT pattern, or insufficient data), never proof of an exact ovulation
      // date; the irregular-conservative note is secondary.
      p_explanation_code:
        prediction.ovulationEvidence !== "estimated"
          ? prediction.ovulationEvidence
          : prediction.conservativeOvulationDate
            ? "irregular_conservative_available"
            : null,
    });
    if (rpcError || !result) return NextResponse.json({ error: "Unable to confirm the period start date" }, { status: 500 });

    const { cycle, forecast } = result as { cycle: Record<string, unknown> & { id: string }; forecast: Record<string, unknown> };
    return NextResponse.json({ ok: true, data: { cycleId: cycle.id, cycle, forecast } }, { status: 201 });
  }

  if (input.action === "end_period_cycle") {
    const { data: openCycle } = await supabase.from("period_cycles").select("id,period_start_date").eq("user_id", user.id).is("period_end_date", null).order("period_start_date", { ascending: false }).limit(1).maybeSingle();
    if (!openCycle) return NextResponse.json({ error: "No open period to end" }, { status: 404 });
    if (input.periodEndDate < openCycle.period_start_date) return NextResponse.json({ error: "Period end cannot be before its start" }, { status: 400 });

    const daysBetween = (Date.parse(`${input.periodEndDate}T00:00:00Z`) - Date.parse(`${openCycle.period_start_date}T00:00:00Z`)) / 86_400_000;
    const periodLength = Math.round(daysBetween) + 1;
    const { data: cycle, error } = await supabase.from("period_cycles").update({ period_end_date: input.periodEndDate, period_length: periodLength }).eq("id", openCycle.id).eq("user_id", user.id).select("id,period_start_date,period_end_date,cycle_length,period_length,next_period_forecast,ovulation_forecast,fertile_window,current_phase,source,created_at,updated_at").single();
    if (error) return NextResponse.json({ error: "Unable to end the period" }, { status: 500 });
    return NextResponse.json({ ok: true, data: { cycle } });
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
