import { NextRequest, NextResponse } from "next/server";

import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import { auditAdminRead } from "@/lib/security-audit";
import { decryptLead, maskMobile } from "@/features/period/data/trivia-security";
import {
  PERIOD_METRIC_DEFINITIONS,
  average,
  calculateRetention,
  clampPage,
  clampPageSize,
  latestConsents,
  latestCyclePerUser,
  percent,
  safeAudienceSummary,
  type ConsentRecord,
  type CycleRecord,
} from "@/features/period/schema/period-tracker";

import { StatusSchema, TabSchema } from "@/features/period/schema/data-requests";
import { loadProfiles, maskName, pageRows, profileMaps } from "./data-helpers";

/**
 * Reads for every Period Tracker tab.
 *
 * ── Why this is one function and not thirteen ────────────────────────────
 *
 * It reads as a chain of `if (tab === "…")` early returns, which looks like it
 * wants to be a lookup table of independent readers. It is not, and splitting
 * it that way would be a performance regression.
 *
 * Everything below the `consent` branch shares one expensive prelude: a
 * 5,000-row `period_cycles` scan plus profile, consent and daily-log
 * lookups keyed off it. The branches ABOVE that prelude — engagement, content,
 * trivia, forecasts, quality, premium, ttc, logs, corrections, safety, notes,
 * consent — return before it runs and never pay for it.
 *
 * The ordering is the optimisation. Keep new cheap tabs above the prelude, and
 * only put a tab below it if it genuinely needs cycle data.
 */

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
  const admin = getAdminClient();

  // Highly sensitive health data (period/TTC) — one audit row per request,
  // regardless of which tab it resolves to; row count isn't known yet at
  // this point (every branch below queries independently), but the
  // presence + tab is what the >200/hr anomaly flag actually needs.
  void auditAdminRead(user.id, `admin/period/${tab}`, 0, { tab, status, hasQuery: Boolean(query) });

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
      // body_html/metadata/ai_job_id/reviewed_by were missing here, so the
      // Content tab could never show what an AI draft (or a manual entry)
      // actually said -- the row-level "Publish" action was a
      // blind status flip with nothing to read first.
      admin.from("period_content").select("id,title,slug,summary,body_html,topic,content_type,locale,tags,cover_image_url,reading_minutes,reading_level,featured,curation_type,ai_job_id,version,reads,completion_count,helpful_count,not_helpful_count,status,reviewed_by,clinical_reviewed_at,review_expires_at,published_at,created_at,metadata").order("created_at", { ascending: false }).limit(1000),
      admin.from("period_content_publications").select("content_id,channel,status,starts_at,ends_at,featured,featured_until,surfaces,frequency_cap_days,display_order").eq("channel", "plasence_library").limit(1000),
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
      featuredUntil: publicationMap.get(item.id)?.featured_until ?? null,
      surfaces: publicationMap.get(item.id)?.surfaces ?? [],
      frequencyCapDays: publicationMap.get(item.id)?.frequency_cap_days ?? null,
      sourceMenus: [...new Set((sourceMap.get(item.id) ?? []).map((source) => source.source_menu))],
      sourceCount: (sourceMap.get(item.id) ?? []).length,
      helpfulPercent: percent(Number(item.helpful_count), Number(item.helpful_count) + Number(item.not_helpful_count)),
      completionRate: percent(Number(item.completion_count), Number(item.reads)),
    })).filter((row) => (!status || row.status === status) && (!query || JSON.stringify(row).toLowerCase().includes(query)));
    // The suggestions queue is per-article, not per-job: each AI-generated
    // draft is its own row with its own schedule, because the admin grades
    // and schedules articles, not generation runs. Derived from `rows` (no
    // extra query) and enriched with the job that produced it, so the table
    // can show grounding, the model used and the failure reason.
    const jobMap = new Map((aiSuggestions ?? []).map((job) => [job.id, job]));
    const suggestionRows = rows
      .filter((row) => row.ai_job_id && jobMap.has(row.ai_job_id))
      .map((row) => {
        const job = jobMap.get(row.ai_job_id)!;
        const config = (job.configuration ?? {}) as Record<string, unknown>;
        return {
          id: row.id,
          jobId: job.id,
          title: row.title,
          topic: row.topic,
          format: row.content_type ?? config.contentFormat ?? null,
          status: row.status,
          clinicalReviewedAt: row.clinical_reviewed_at,
          sourceMenus: row.sourceMenus,
          sourceCount: row.sourceCount,
          libraryStatus: row.libraryStatus,
          scheduledAt: row.libraryStartsAt,
          featuredUntil: row.featuredUntil,
          surfaces: row.surfaces,
          frequencyCapDays: row.frequencyCapDays,
          jobStatus: job.status,
          jobType: job.job_type,
          errorCode: job.error_code,
          suggestedAt: job.created_at,
        };
      });

    return NextResponse.json({
      ...pageRows(rows, page, pageSize),
      collections: collections ?? [],
      aiSuggestions: suggestionRows,
      aiJobs: aiSuggestions ?? [],
      // Indexed source links, for the AI Suggestions header badge. Capped at
      // the same 5000 the per-content map is, so it is a floor, not a true
      // count -- it stops being accurate only past 5000 links.
      sourceLinkCount: (sourceLinks ?? []).length,
    });
  }

  if (tab === "trivia") {
    const [{ data: questions, error }, { data: submissions }, { data: events }, { data: leads }, { data: rewards }, { data: fulfillments }, { data: blockedDevices }, { data: rules }, { data: rewardTiers }, { data: criteriaTypes }] = await Promise.all([
      admin.from("period_trivia_questions").select("id,event_id,position,topic,question,options,correct_option,explanation,difficulty,status,validation_status,ai_job_id,manual_batch_id,source_refs,reviewed_by,published_at,created_by,created_at").order("created_at", { ascending: false }).limit(1000),
      // Rankings are aggregated below and only the compact result is sent to
      // the browser. Keep the all-time scan server-side so monthly/lifetime
      // boards are based on real submissions rather than display fixtures.
      admin.from("period_trivia_submissions").select("id,event_id,user_id,score,question_count,duration_seconds,submitted_at").order("submitted_at", { ascending: false }).limit(10000),
      admin.from("period_trivia_events").select("id,title,status,starts_at,ends_at,timezone,question_count,reviewed_at,reward_id,leaderboard_publish_at,closed_at").order("starts_at", { ascending: false }).limit(100),
      admin.from("period_trivia_leads").select("id,event_id,submission_id,user_id,full_name_ciphertext,mobile_ciphertext,social_platform,social_handle_ciphertext,consent_version,consented_at,acquisition_source,campaign_code,utm_source,utm_medium,utm_campaign,status,assigned_to,last_contacted_at,created_at").order("created_at", { ascending: false }).limit(1000),
      admin.from("reward_catalog").select("id,name,description,icon,image_url,reward_type,value,amount,currency,domains,fulfillment_method,inventory_count,is_active,created_at").order("created_at", { ascending: false }).limit(100),
      admin.from("period_trivia_fulfillment").select("id,event_id,submission_id,user_id,tier_label,reward_id,prize_status,sent_at,prompt_sent_at,confirmed_at,fulfilled_at,notes,created_at").order("created_at", { ascending: false }).limit(500),
      admin.from("period_trivia_blocked_devices").select("id,device_hash,mobile_hash,user_id,violation,evidence,status,detected_at,unblocked_at").order("detected_at", { ascending: false }).limit(200),
      admin.from("period_trivia_rules").select("key,description,value,enforced_by,is_active,updated_at").order("key"),
      admin.from("reward_tiers").select("id,source_domain,source_id,reward_id,tier_label,tier_order,criteria_type,criteria_params,max_winners,stackable,created_at").eq("source_domain", "trivia").order("tier_order", { ascending: true }).limit(500),
      admin.from("reward_criteria_types").select("key,label,description,params_schema,is_active").eq("is_active", true).order("key"),
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

    const maskedLeads = (leads ?? []).map((lead) => {
      try {
        const name = decryptLead(lead.full_name_ciphertext);
        const mobile = decryptLead(lead.mobile_ciphertext);
        const handle = decryptLead(lead.social_handle_ciphertext);
        return { ...lead, full_name_ciphertext: undefined, mobile_ciphertext: undefined, social_handle_ciphertext: undefined,
          name: `${name.slice(0, 1)}${"•".repeat(Math.max(2, Math.min(8, name.length - 1)))}`, mobile: maskMobile(mobile), socialPlatform: lead.social_platform ?? "Social", socialHandle: `${handle.slice(0, 2)}••••` };
      } catch { return { ...lead, full_name_ciphertext: undefined, mobile_ciphertext: undefined, social_handle_ciphertext: undefined, name: "Encrypted lead", mobile: "Protected", socialPlatform: lead.social_platform ?? "Social", socialHandle: "Protected" }; }
    });

    const submissionRows = submissions ?? [];
    const leadBySubmission = new Map(maskedLeads.map((lead) => [lead.submission_id, lead]));
    const eventRows = events ?? [];
    const now = Date.now();
    const latestEndedEvent = eventRows.find((event) =>
      event.status === "ended" || new Date(event.ends_at).getTime() < now,
    ) ?? null;

    const participantLabel = (submission: (typeof submissionRows)[number]) => {
      const source = submission.user_id ?? submission.id;
      let hash = 0;
      for (let index = 0; index < source.length; index += 1) {
        hash = (Math.imul(hash, 31) + source.charCodeAt(index)) | 0;
      }
      return `Player ${String((Math.abs(hash) % 99) + 1).padStart(2, "0")}`;
    };
    const ranked = (rows: typeof submissionRows) => [...rows].sort((a, b) =>
      Number(b.score) - Number(a.score)
      || Number(a.duration_seconds ?? Number.MAX_SAFE_INTEGER) - Number(b.duration_seconds ?? Number.MAX_SAFE_INTEGER)
      || new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime(),
    );

    const latestRows = latestEndedEvent
      ? ranked(submissionRows.filter((submission) => submission.event_id === latestEndedEvent.id))
      : [];
    const currentRanking = latestRows.slice(0, 100).map((submission, index) => {
      const lead = leadBySubmission.get(submission.id);
      return {
        rank: index + 1,
        participant: participantLabel(submission),
        userId: submission.user_id,
        consentedLead: lead?.mobile ?? null,
        consentVersion: lead?.consent_version ?? null,
        score: submission.score,
        questionCount: submission.question_count,
        durationSeconds: submission.duration_seconds,
        submittedAt: submission.submitted_at,
        deviceCheck: "unique",
      };
    });

    const rankingAnchor = latestEndedEvent?.starts_at
      ? new Date(latestEndedEvent.starts_at)
      : new Date();
    const monthStart = new Date(Date.UTC(rankingAnchor.getUTCFullYear(), rankingAnchor.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(rankingAnchor.getUTCFullYear(), rankingAnchor.getUTCMonth() + 1, 1));
    const monthRows = submissionRows.filter((submission) => {
      const submittedAt = new Date(submission.submitted_at);
      return submittedAt >= monthStart && submittedAt < monthEnd;
    });

    type Aggregate = {
      participant: string;
      userId: string | null;
      events: Set<string>;
      totalScore: number;
      totalQuestions: number;
      perfectScores: number;
      bestTimeSeconds: number | null;
      firstPlayedAt: string;
      lastPlayedAt: string;
    };
    const aggregate = (rows: typeof submissionRows) => {
      const byParticipant = new Map<string, Aggregate>();
      for (const submission of rows) {
        const key = submission.user_id ?? submission.id;
        const existing = byParticipant.get(key);
        const duration = submission.duration_seconds == null ? null : Number(submission.duration_seconds);
        if (!existing) {
          byParticipant.set(key, {
            participant: participantLabel(submission),
            userId: submission.user_id,
            events: new Set([submission.event_id]),
            totalScore: Number(submission.score),
            totalQuestions: Number(submission.question_count),
            perfectScores: Number(submission.score) === Number(submission.question_count) ? 1 : 0,
            bestTimeSeconds: duration,
            firstPlayedAt: submission.submitted_at,
            lastPlayedAt: submission.submitted_at,
          });
          continue;
        }
        existing.events.add(submission.event_id);
        existing.totalScore += Number(submission.score);
        existing.totalQuestions += Number(submission.question_count);
        if (Number(submission.score) === Number(submission.question_count)) existing.perfectScores += 1;
        if (duration != null && (existing.bestTimeSeconds == null || duration < existing.bestTimeSeconds)) existing.bestTimeSeconds = duration;
        if (submission.submitted_at < existing.firstPlayedAt) existing.firstPlayedAt = submission.submitted_at;
        if (submission.submitted_at > existing.lastPlayedAt) existing.lastPlayedAt = submission.submitted_at;
      }
      return [...byParticipant.values()].sort((a, b) =>
        b.totalScore - a.totalScore
        || Number(a.bestTimeSeconds ?? Number.MAX_SAFE_INTEGER) - Number(b.bestTimeSeconds ?? Number.MAX_SAFE_INTEGER)
        || new Date(a.firstPlayedAt).getTime() - new Date(b.firstPlayedAt).getTime(),
      );
    };

    const titleCounts = new Map<string, number>();
    for (const event of eventRows.filter((item) => item.status === "ended" || new Date(item.ends_at).getTime() < now)) {
      const winner = ranked(submissionRows.filter((submission) => submission.event_id === event.id))[0];
      if (winner?.user_id) titleCounts.set(winner.user_id, (titleCounts.get(winner.user_id) ?? 0) + 1);
    }
    const monthlyRanking = aggregate(monthRows).slice(0, 100).map((row, index) => ({
      rank: index + 1,
      participant: row.participant,
      userId: row.userId,
      eventsEntered: row.events.size,
      totalScore: row.totalScore,
      totalQuestions: row.totalQuestions,
      perfectScores: row.perfectScores,
      bestTimeSeconds: row.bestTimeSeconds,
      lastPlayedAt: row.lastPlayedAt,
    }));
    const overallRanking = aggregate(submissionRows).slice(0, 100).map((row, index) => ({
      rank: index + 1,
      participant: row.participant,
      userId: row.userId,
      lifetimeScore: row.totalScore,
      eventsPlayed: row.events.size,
      titlesWon: row.userId ? titleCounts.get(row.userId) ?? 0 : 0,
      memberSince: row.firstPlayedAt,
    }));
    const fulfillmentSubmissionIds = new Set((fulfillments ?? []).map((item) => item.submission_id).filter(Boolean));
    const fulfillmentSubmissions = submissionRows.filter((submission) => fulfillmentSubmissionIds.has(submission.id));
    const eventsWithResults = eventRows.map((event) => {
      const eventSubmissions = submissionRows.filter((submission) => submission.event_id === event.id);
      const scoredQuestions = eventSubmissions.reduce((sum, submission) => sum + Number(submission.question_count), 0);
      const scoreTotal = eventSubmissions.reduce((sum, submission) => sum + Number(submission.score), 0);
      return {
        ...event,
        entryCount: eventSubmissions.length,
        averageScore: eventSubmissions.length
          ? Math.round((scoreTotal / eventSubmissions.length) * 10) / 10
          : null,
        averageScorePercent: percent(scoreTotal, scoredQuestions),
      };
    });
    const thirtyDaysAgo = now - 30 * 86400000;
    const submissions30d = submissionRows.filter((submission) => new Date(submission.submitted_at).getTime() >= thirtyDaysAgo);
    const answers30d = submissions30d.reduce((sum, item) => sum + Number(item.question_count), 0);
    const correct30d = submissions30d.reduce((sum, item) => sum + Number(item.score), 0);

    return NextResponse.json({
      ...pageRows(batchRows, page, pageSize),
      events: eventsWithResults,
      leads: maskedLeads,
      submissions: fulfillmentSubmissions,
      rewards: rewards ?? [],
      fulfillments: fulfillments ?? [],
      blockedDevices: blockedDevices ?? [],
      rules: rules ?? [],
      rewardTiers: rewardTiers ?? [],
      criteriaTypes: criteriaTypes ?? [],
      rankings: {
        latestEvent: latestEndedEvent,
        current: currentRanking,
        monthly: monthlyRanking,
        overall: overallRanking,
        monthLabel: rankingAnchor.toLocaleDateString("en-GH", { month: "long", year: "numeric", timeZone: "Africa/Accra" }),
      },
      summary: {
        attempts30d: submissions30d.length,
        leads30d: maskedLeads.filter((lead) => new Date(lead.created_at).getTime() >= thirtyDaysAgo).length,
        correctRate: percent(correct30d, answers30d),
      },
    });
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
      admin.from("period_user_settings").select("user_id"),
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
    const { data: logs, error } = await admin.from("period_daily_logs").select("id,user_id,cycle_id,logged_on,flow,moods,symptoms,basal_body_temperature,temperature_unit,cervical_mucus,exercise_minutes,medication_logged,medication_name,source,app_version,sync_status,created_at,updated_at").order("logged_on", { ascending: false }).limit(5000);
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
  const [{ data: consents }, { data: dailyLogs }] = await Promise.all([
    userIds.length ? admin.from("period_consent_events").select("user_id,consent_type,granted,policy_version,source,created_at").in("user_id", userIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    userIds.length ? admin.from("period_daily_logs").select("user_id,logged_on,symptoms,created_at").in("user_id", userIds).limit(5000) : Promise.resolve({ data: [] }),
  ]);
  const profiles = profileMaps(await loadProfiles(admin, userIds));
  const consentMap = latestConsents((consents ?? []) as ConsentRecord[]);

  if (tab === "users") {
    const { data: settingsRows } = userIds.length
      ? await admin.from("period_user_settings").select("user_id,tracking_goal,reminders_enabled").in("user_id", userIds)
      : { data: [] as { user_id: string; tracking_goal: string; reminders_enabled: boolean }[] };
    const goalByUser = new Map((settingsRows ?? []).map((row) => [row.user_id, row.tracking_goal]));
    const remindersByUser = new Map((settingsRows ?? []).map((row) => [row.user_id, row.reminders_enabled]));
    const logCounts = new Map<string, number>();
    for (const log of dailyLogs ?? []) logCounts.set(log.user_id, (logCounts.get(log.user_id) ?? 0) + 1);
    const latestCycles = [...latestCyclePerUser(cycleRows).values()];
    const rows = latestCycles.map((cycle) => {
      const marketing = consentMap.get(cycle.user_id)?.get("marketing");
      return {
        id: cycle.user_id,
        user: maskName(profiles.get(cycle.user_id)?.first_name, profiles.get(cycle.user_id)?.last_name),
        userId: cycle.user_id,
        region: profiles.get(cycle.user_id)?.region ?? "Not supplied",
        goal: goalByUser.get(cycle.user_id) ?? "track_period",
        lastPeriod: cycle.period_start_date,
        cycleLength: cycle.cycle_length,
        periodLength: cycle.period_length,
        nextForecast: cycle.next_period_forecast,
        ovulationDate: cycle.ovulation_forecast,
        fertileWindow: cycle.fertile_window,
        currentPhase: cycle.current_phase ?? "Not calculated",
        dailyLogs: logCounts.get(cycle.user_id) ?? 0,
        reminders: remindersByUser.get(cycle.user_id) ?? false,
        // Tri-state like the Consent tab's own marketing column: "not asked"
        // is the honest state until the mobile app offers this consent, and
        // isn't the same thing as a declined "No".
        marketing: !marketing ? "not_asked" : marketing.granted ? "granted" : "declined",
        source: cycle.source,
      };
    }).filter((row) => !query || JSON.stringify(row).toLowerCase().includes(query));
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

  const PHASE_LABELS: Record<string, string> = {
    menstrual: "Menstrual",
    follicular: "Follicular",
    ovulatory: "Ovulatory",
    luteal: "Luteal",
  };
  const phaseCounts = new Map<string, number>();

  const regions = new Map<string, { region: string; userIds: Set<string>; active: Set<string>; newUsers: Set<string>; current: Set<string>; previous: Set<string>; lengths: number[]; irregularUsers: Set<string>; optedIn: Set<string> }>();
  for (const [userId, latest] of latestCyclePerUser(cycleRows)) {
    const phaseLabel = latest.current_phase ? (PHASE_LABELS[latest.current_phase] ?? latest.current_phase.replaceAll("_", " ")) : "Not calculated";
    phaseCounts.set(phaseLabel, (phaseCounts.get(phaseLabel) ?? 0) + 1);
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

  // Onboarding goal is set independently of ever logging a cycle, so this is
  // its own query rather than scoped to `userIds` from the cycle prelude.
  const GOAL_LABELS: Record<string, string> = {
    track_period: "Track Period",
    trying_to_conceive: "Trying to Conceive",
    pregnancy: "Pregnancy",
    pcos_support: "Manage PCOS",
  };
  const { data: settingsRows } = await admin.from("period_user_settings").select("tracking_goal");
  const goalCounts = new Map<string, number>();
  for (const setting of settingsRows ?? []) {
    const label = GOAL_LABELS[setting.tracking_goal] ?? setting.tracking_goal ?? "Track Period";
    goalCounts.set(label, (goalCounts.get(label) ?? 0) + 1);
  }

  // Phase 2 accuracy instrumentation: fn_record_period_cycle backfills
  // confirmed_period_start/absolute_error_days on the forecast a new period
  // start confirms. Null until at least one forecast has been through a
  // full cycle since that migration shipped — sample size grows over time.
  const { data: forecastErrorRows } = await admin.from("period_forecasts").select("absolute_error_days").not("absolute_error_days", "is", null).limit(5000);
  const forecastErrorDays = (forecastErrorRows ?? []).map((row) => row.absolute_error_days as number);

  return NextResponse.json({
    summary: {
      activeTrackers: currentActive.size,
      totalTrackers: userIds.length,
      logs30d: (dailyLogs ?? []).filter((log) => new Date(log.created_at).getTime() >= currentStart).length,
      cycleLogs: cycleRows.length,
      averageCycleLength: average(cycleRows.map((cycle) => cycle.cycle_length)),
      retention: calculateRetention(currentActive, previousActive),
      marketingOptIn: [...consentMap.values()].filter((value) => value.get("marketing")?.granted).length,
      forecastError: average(forecastErrorDays),
      forecastErrorSamples: forecastErrorDays.length,
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
    phaseDistribution: [...phaseCounts.entries()].map(([phase, count]) => ({ phase, count })),
    trackingGoals: [...goalCounts.entries()].map(([goal, count]) => ({ goal, count })),
  });
}
