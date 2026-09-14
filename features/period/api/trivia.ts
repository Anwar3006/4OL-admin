import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminClient } from "@/lib/db/admin";
import { getPeriodRequestUserId } from "@/features/period/data/request-auth";
import { encryptLead, normalizeMobile, privacyHash } from "@/features/period/data/trivia-security";

const COOKIE = "plasence_trivia_device";
const SubmitSchema = z.object({
  eventId: z.string().uuid(),
  answers: z.array(z.object({ questionId: z.string().uuid(), option: z.number().int().min(-1).max(5) })).length(10),
  durationSeconds: z.number().int().min(0).max(86400).optional(),
  lead: z.object({
    fullName: z.string().trim().min(2).max(160),
    momoPhone: z.string().trim().min(7).max(32),
    socialPlatform: z.string().trim().min(1).max(40),
    socialHandle: z.string().trim().min(2).max(120),
    consent: z.literal(true), consentVersion: z.literal("trivia-lead-v1"),
  }),
  attribution: z.object({ campaignCode: z.string().max(80).optional(), utmSource: z.string().max(120).optional(), utmMedium: z.string().max(120).optional(), utmCampaign: z.string().max(120).optional() }).optional(),
});

function eventState(event: any, now = new Date()) {
  if (!event) return "unavailable";
  if (now < new Date(event.starts_at)) return "upcoming";
  if (now > new Date(event.ends_at)) return "ended";
  return event.status === "ready" || event.status === "live" ? "live" : "unavailable";
}

// --- Trivia rules enforcement (G3/G4) ---------------------------------------
// Rules are admin-toggled rows in period_trivia_rules; the server is the
// authoritative enforcement point so toggles actually bite.

async function loadTriviaRules(admin: ReturnType<typeof getAdminClient>) {
  const { data } = await admin.from("period_trivia_rules").select("key,value").eq("is_active", true);
  const map: Record<string, string> = {};
  for (const row of data ?? []) map[row.key] = String(row.value);
  const minMatch = (map.minimum_completion_time ?? "").match(/(\d+)/);
  return {
    shuffleEnabled: !/^(false|off|disabled)$/i.test(map.per_device_question_shuffle ?? "true"),
    minimumCompletionSeconds: minMatch ? Number(minMatch[1]) : 0,
  };
}

function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Deterministic Fisher-Yates permutation for a seed string (per device+event). */
function seededPermutation(length: number, seed: string): number[] {
  const order = Array.from({ length }, (_, index) => index);
  let state = hashSeed(seed) || 1;
  const next = () => {
    state = Math.imul(state ^ (state >>> 15), state | 1);
    state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
  for (let index = length - 1; index > 0; index--) {
    const swap = Math.floor(next() * (index + 1));
    [order[index], order[swap]] = [order[swap], order[index]];
  }
  return order;
}

async function isBlocked(admin: ReturnType<typeof getAdminClient>, deviceHash: string, mobileHash?: string | null) {
  const clauses = [`device_hash.eq.${deviceHash}`];
  if (mobileHash) clauses.push(`mobile_hash.eq.${mobileHash}`);
  const { count } = await admin.from("period_trivia_blocked_devices").select("id", { count: "exact", head: true }).in("status", ["blocked", "under_review"]).or(clauses.join(","));
  return Boolean(count);
}

export async function GET(request: NextRequest) {
  const admin = getAdminClient();
  const now = new Date().toISOString();
  const deviceToken = request.cookies.get(COOKIE)?.value || randomBytes(32).toString("base64url");
  let deviceHash: string;
  try { deviceHash = privacyHash(deviceToken, "device"); }
  catch { return NextResponse.json({ error: "Trivia security is not configured" }, { status: 503 }); }

  const viewerId = await getPeriodRequestUserId(request);
  const { data: events } = await admin.from("period_trivia_events").select("id,title,slug,status,starts_at,ends_at,timezone,leaderboard_publish_at,reward:period_trivia_rewards(name,description,icon,reward_type,value)").in("status", ["ready", "live", "ended"]).gte("ends_at", new Date(Date.now() - 14 * 86400000).toISOString()).order("starts_at", { ascending: true }).limit(20);
  const current = (events ?? []).find((event) => new Date(event.starts_at) <= new Date(now) && new Date(event.ends_at) >= new Date(now));
  const upcoming = (events ?? []).find((event) => new Date(event.starts_at) > new Date(now));
  const ended = [...(events ?? [])].reverse().find((event) => new Date(event.ends_at) < new Date(now));
  const event = current ?? upcoming ?? ended ?? null;
  const state = eventState(event);
  let completed = false;
  let questions: any[] = [];
  let leaderboard: any[] = [];
  let winners: any[] = [];
  let myFulfillment: any[] = [];
  const rules = await loadTriviaRules(admin);
  const { count: blockedCount } = await admin.from("period_trivia_blocked_devices").select("id", { count: "exact", head: true }).eq("device_hash", deviceHash).in("status", ["blocked", "under_review"]);
  const blocked = Boolean(blockedCount);
  if (event) {
    completed = viewerId
      ? Boolean((await admin.from("period_trivia_submissions").select("id", { count: "exact", head: true }).eq("event_id", event.id).eq("user_id", viewerId)).count)
      : false;
    if (state === "live" && !completed && !blocked) {
      const { data } = await admin.from("period_trivia_questions").select("id,position,topic,question,options,difficulty").eq("event_id", event.id).eq("status", "published").eq("validation_status", "valid").order("position");
      let fetched = (data ?? []).length === 10 ? data ?? [] : [];
      if (rules.shuffleEnabled && fetched.length) {
        // Seeded per device+event so shared answer sheets are useless, but a
        // given device always sees the same order within one event.
        const questionOrder = seededPermutation(fetched.length, `${deviceHash}:${event.id}:questions`);
        fetched = questionOrder.map((index) => fetched[index]).map((question: any) => {
          const optionOrder = seededPermutation((question.options ?? []).length, `${deviceHash}:${event.id}:${question.id}:options`);
          return { ...question, options: optionOrder.map((optionIndex: number) => question.options[optionIndex]) };
        });
      }
      questions = fetched;
    }
    if (state === "ended" && new Date() >= new Date(event.leaderboard_publish_at || event.ends_at)) {
      const { data } = await admin.from("period_trivia_submissions").select("id,score,duration_seconds,submitted_at").eq("event_id", event.id).order("score", { ascending: false }).order("duration_seconds", { ascending: true }).order("submitted_at", { ascending: true }).limit(100);
      leaderboard = (data ?? []).map((row, index) => ({ rank: index + 1, participant: `Player ${String(index + 1).padStart(2, "0")}`, score: row.score, durationSeconds: row.duration_seconds }));
      // G14: last-Trivia winners list (mobile-only reveal after the event).
      // Aggregate tier/status only — never user ids or contact detail.
      const { data: winnerRows } = await admin.from("period_trivia_fulfillment").select("tier_label,prize_status,reward:period_trivia_rewards(name)").eq("event_id", event.id).order("created_at", { ascending: true });
      winners = (winnerRows ?? []).map((row: any) => ({ tierLabel: row.tier_label, prizeStatus: row.prize_status, rewardName: row.reward?.name ?? null }));
    }
  }
  // G5: the signed-in player's own prize fulfilment lifecycle.
  if (viewerId) {
    const { data: mine } = await admin.from("period_trivia_fulfillment").select("id,event_id,tier_label,prize_status,prompt_sent_at,confirmed_at,fulfilled_at,reward:period_trivia_rewards(name,description)").eq("user_id", viewerId).order("created_at", { ascending: false }).limit(5);
    myFulfillment = (mine ?? []).map((row: any) => ({ id: row.id, eventId: row.event_id, tierLabel: row.tier_label, prizeStatus: row.prize_status, promptSentAt: row.prompt_sent_at, confirmedAt: row.confirmed_at, fulfilledAt: row.fulfilled_at, rewardName: row.reward?.name ?? null, rewardDescription: row.reward?.description ?? null }));
  }
  const response = NextResponse.json({ event, state, completed, blocked, questions, leaderboard, winners, myFulfillment, serverNow: now });
  if (!request.cookies.get(COOKIE)) response.cookies.set(COOKIE, deviceToken, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 400 });
  return response;
}

export async function POST(request: NextRequest) {
  const deviceToken = request.cookies.get(COOKIE)?.value;
  if (!deviceToken) return NextResponse.json({ error: "A secure device session is required. Refresh and try again." }, { status: 409 });
  const parsed = SubmitSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Complete all 10 answers and the consented lead form.", details: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;
  const admin = getAdminClient();
  const userId = await getPeriodRequestUserId(request);
  if (!userId) return NextResponse.json({ error: "Sign in to submit your Trivia entry." }, { status: 401 });
  const { data: event } = await admin.from("period_trivia_events").select("id,status,starts_at,ends_at").eq("id", input.eventId).maybeSingle();
  if (eventState(event) !== "live") return NextResponse.json({ error: "This Trivia is not accepting submissions." }, { status: 409 });
  const { count: accountEntries, error: accountCheckError } = await admin.from("period_trivia_submissions").select("id", { count: "exact", head: true }).eq("event_id", input.eventId).eq("user_id", userId);
  if (accountCheckError) return NextResponse.json({ error: "Unable to verify Trivia eligibility." }, { status: 500 });
  if (accountEntries) return NextResponse.json({ error: "This account has already completed this Trivia.", completed: true }, { status: 409 });
  const rules = await loadTriviaRules(admin);
  const { data: questions } = await admin.from("period_trivia_questions").select("id,correct_option,options").eq("event_id", input.eventId).eq("status", "published").eq("validation_status", "valid");
  if ((questions ?? []).length !== 10) return NextResponse.json({ error: "This Trivia is not ready." }, { status: 409 });
  const answerMap = new Map(input.answers.map((answer) => [answer.questionId, answer.option]));
  if (new Set(input.answers.map((answer) => answer.questionId)).size !== 10 || questions!.some((question) => !answerMap.has(question.id))) return NextResponse.json({ error: "Answer set does not match this Trivia." }, { status: 400 });

  // G3: blocked devices and blocked mobile numbers never score.
  try {
    const mobileForCheck = normalizeMobile(input.lead.momoPhone);
    if (await isBlocked(admin, privacyHash(request.cookies.get(COOKIE)?.value || "", "device"), privacyHash(mobileForCheck, "mobile"))) {
      return NextResponse.json({ error: "This entry cannot be accepted. Contact support if you believe this is a mistake." }, { status: 403 });
    }
  } catch {
    // Fall through to the unique-constraint guard if hashing fails.
  }

  // G4: minimum completion time — instant answers are bot behaviour.
  if (rules.minimumCompletionSeconds > 0 && (input.durationSeconds ?? 0) < rules.minimumCompletionSeconds) {
    return NextResponse.json({ error: `Trivia takes at least ${rules.minimumCompletionSeconds} seconds — please answer thoughtfully and try again.` }, { status: 429 });
  }

  // G4: undo the per-device option shuffle before scoring so the client's
  // answer indices map back to the canonical option order.
  const deviceHashForScoring = privacyHash(request.cookies.get(COOKIE)?.value || "", "device");
  const score = questions!.filter((question) => {
    const submitted = answerMap.get(question.id) ?? -1;
    const optionCount = (question.options ?? []).length;
    const canonicalOption = rules.shuffleEnabled && optionCount > 0
      ? seededPermutation(optionCount, `${deviceHashForScoring}:${input.eventId}:${question.id}:options`)[submitted] ?? -1
      : submitted;
    return canonicalOption === question.correct_option;
  }).length;
  try {
    const mobile = normalizeMobile(input.lead.momoPhone);
    const deviceHash = privacyHash(deviceToken, "device");
    const mobileHash = privacyHash(mobile, "mobile");
    const { error } = await admin.rpc("submit_period_trivia", {
      p_event_id: input.eventId, p_user_id: userId, p_device_hash: deviceHash, p_mobile_hash: mobileHash,
      p_score: score, p_answers: input.answers, p_duration_seconds: input.durationSeconds ?? null,
      p_full_name_ciphertext: encryptLead(input.lead.fullName), p_mobile_ciphertext: encryptLead(mobile), p_social_platform: input.lead.socialPlatform, p_social_handle_ciphertext: encryptLead(input.lead.socialHandle),
      p_consent_version: input.lead.consentVersion, p_campaign_code: input.attribution?.campaignCode ?? null,
      p_utm_source: input.attribution?.utmSource ?? null, p_utm_medium: input.attribution?.utmMedium ?? null, p_utm_campaign: input.attribution?.utmCampaign ?? null,
    });
    if (error) {
      if (error?.code === "23505") return NextResponse.json({ error: "An entry already exists for this account, device, or mobile number.", completed: true }, { status: 409 });
      throw error;
    }
    return NextResponse.json({ completed: true, score, questionCount: 10, leaderboardAvailableAfter: event!.ends_at });
  } catch (error) {
    console.error("[period/trivia] secure submission failed", error);
    return NextResponse.json({ error: "Unable to securely submit the Trivia. No score was released." }, { status: 500 });
  }
}
