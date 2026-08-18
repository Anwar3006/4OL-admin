import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getPeriodRequestUserId } from "@/lib/period-request-auth";
import { encryptLead, normalizeMobile, privacyHash } from "@/lib/period-trivia-security";

export const runtime = "nodejs";
const COOKIE = "plasence_trivia_device";
const SubmitSchema = z.object({
  eventId: z.string().uuid(),
  answers: z.array(z.object({ questionId: z.string().uuid(), option: z.number().int().min(-1).max(5) })).length(10),
  durationSeconds: z.number().int().min(0).max(86400).optional(),
  lead: z.object({
    fullName: z.string().trim().min(2).max(120), mobile: z.string().trim().min(7).max(24),
    socialHandle: z.string().trim().min(2).max(120), consent: z.literal(true), consentVersion: z.literal("trivia-lead-v1"),
  }),
  attribution: z.object({ campaignCode: z.string().max(80).optional(), utmSource: z.string().max(120).optional(), utmMedium: z.string().max(120).optional(), utmCampaign: z.string().max(120).optional() }).optional(),
});

function eventState(event: any, now = new Date()) {
  if (!event) return "unavailable";
  if (now < new Date(event.starts_at)) return "upcoming";
  if (now > new Date(event.ends_at)) return "ended";
  return event.status === "ready" || event.status === "live" ? "live" : "unavailable";
}

export async function GET(request: NextRequest) {
  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();
  const deviceToken = request.cookies.get(COOKIE)?.value || randomBytes(32).toString("base64url");
  let deviceHash: string;
  try { deviceHash = privacyHash(deviceToken, "device"); }
  catch { return NextResponse.json({ error: "Trivia security is not configured" }, { status: 503 }); }

  const { data: events } = await admin.from("period_trivia_events").select("id,title,slug,status,starts_at,ends_at,timezone,leaderboard_publish_at,reward:period_trivia_rewards(name,description,icon)").in("status", ["ready", "live", "ended"]).gte("ends_at", new Date(Date.now() - 14 * 86400000).toISOString()).order("starts_at", { ascending: true }).limit(20);
  const current = (events ?? []).find((event) => new Date(event.starts_at) <= new Date(now) && new Date(event.ends_at) >= new Date(now));
  const upcoming = (events ?? []).find((event) => new Date(event.starts_at) > new Date(now));
  const ended = [...(events ?? [])].reverse().find((event) => new Date(event.ends_at) < new Date(now));
  const event = current ?? upcoming ?? ended ?? null;
  const state = eventState(event);
  let completed = false;
  let questions: any[] = [];
  let leaderboard: any[] = [];
  if (event) {
    completed = Boolean((await admin.from("period_trivia_submissions").select("id", { count: "exact", head: true }).eq("event_id", event.id).eq("device_hash", deviceHash)).count);
    if (state === "live" && !completed) {
      const { data } = await admin.from("period_trivia_questions").select("id,position,topic,question,options,difficulty").eq("event_id", event.id).eq("status", "published").eq("validation_status", "valid").order("position");
      questions = (data ?? []).length === 10 ? data ?? [] : [];
    }
    if (state === "ended" && new Date() >= new Date(event.leaderboard_publish_at || event.ends_at)) {
      const { data } = await admin.from("period_trivia_submissions").select("id,score,duration_seconds,submitted_at").eq("event_id", event.id).order("score", { ascending: false }).order("duration_seconds", { ascending: true }).order("submitted_at", { ascending: true }).limit(100);
      leaderboard = (data ?? []).map((row, index) => ({ rank: index + 1, participant: `Player ${String(index + 1).padStart(2, "0")}`, score: row.score, durationSeconds: row.duration_seconds }));
    }
  }
  const response = NextResponse.json({ event, state, completed, questions, leaderboard, serverNow: now });
  if (!request.cookies.get(COOKIE)) response.cookies.set(COOKIE, deviceToken, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 400 });
  return response;
}

export async function POST(request: NextRequest) {
  const deviceToken = request.cookies.get(COOKIE)?.value;
  if (!deviceToken) return NextResponse.json({ error: "A secure device session is required. Refresh and try again." }, { status: 409 });
  const parsed = SubmitSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Complete all 10 answers and the consented lead form.", details: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;
  const admin = getSupabaseAdmin();
  const { data: event } = await admin.from("period_trivia_events").select("id,status,starts_at,ends_at").eq("id", input.eventId).maybeSingle();
  if (eventState(event) !== "live") return NextResponse.json({ error: "This Trivia is not accepting submissions." }, { status: 409 });
  const { data: questions } = await admin.from("period_trivia_questions").select("id,correct_option").eq("event_id", input.eventId).eq("status", "published").eq("validation_status", "valid");
  if ((questions ?? []).length !== 10) return NextResponse.json({ error: "This Trivia is not ready." }, { status: 409 });
  const answerMap = new Map(input.answers.map((answer) => [answer.questionId, answer.option]));
  if (new Set(input.answers.map((answer) => answer.questionId)).size !== 10 || questions!.some((question) => !answerMap.has(question.id))) return NextResponse.json({ error: "Answer set does not match this Trivia." }, { status: 400 });
  const score = questions!.filter((question) => answerMap.get(question.id) === question.correct_option).length;
  try {
    const mobile = normalizeMobile(input.lead.mobile);
    const deviceHash = privacyHash(deviceToken, "device");
    const mobileHash = privacyHash(mobile, "mobile");
    const userId = await getPeriodRequestUserId(request);
    const { error } = await admin.rpc("submit_period_trivia", {
      p_event_id: input.eventId, p_user_id: userId, p_device_hash: deviceHash, p_mobile_hash: mobileHash,
      p_score: score, p_answers: input.answers, p_duration_seconds: input.durationSeconds ?? null,
      p_full_name_ciphertext: encryptLead(input.lead.fullName), p_mobile_ciphertext: encryptLead(mobile), p_social_handle_ciphertext: encryptLead(input.lead.socialHandle),
      p_consent_version: input.lead.consentVersion, p_campaign_code: input.attribution?.campaignCode ?? null,
      p_utm_source: input.attribution?.utmSource ?? null, p_utm_medium: input.attribution?.utmMedium ?? null, p_utm_campaign: input.attribution?.utmCampaign ?? null,
    });
    if (error) {
      if (error?.code === "23505") return NextResponse.json({ error: "This device or mobile number has already completed this Trivia.", completed: true }, { status: 409 });
      throw error;
    }
    return NextResponse.json({ completed: true, score, questionCount: 10, leaderboardAvailableAfter: event!.ends_at });
  } catch (error) {
    console.error("[period/trivia] secure submission failed", error);
    return NextResponse.json({ error: "Unable to securely submit the Trivia. No score was released." }, { status: 500 });
  }
}
