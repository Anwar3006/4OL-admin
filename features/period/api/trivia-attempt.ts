import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminClient } from "@/lib/db/admin";
import { getPeriodRequestUserId } from "@/features/period/data/request-auth";
import { privacyHash } from "@/features/period/data/trivia-security";

const COOKIE = "plasence_trivia_device";
const StartSchema = z.object({ eventId: z.string().uuid() });

/**
 * Server-side attempt start: stamps started_at before the first question is
 * shown, so submit_period_trivia can compute duration_seconds from a clock
 * the client never controls. See submit_period_trivia in
 * 20260915110000_period_trivia_attempt_and_submit_rpcs.sql.
 */
export async function POST(request: NextRequest) {
  const deviceToken = request.cookies.get(COOKIE)?.value;
  if (!deviceToken) return NextResponse.json({ error: "A secure device session is required. Refresh and try again." }, { status: 409 });
  const parsed = StartSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "A valid Trivia event is required." }, { status: 400 });

  const userId = await getPeriodRequestUserId(request);
  if (!userId) return NextResponse.json({ error: "Sign in to play Trivia." }, { status: 401 });

  let deviceHash: string;
  try { deviceHash = privacyHash(deviceToken, "device"); }
  catch { return NextResponse.json({ error: "Trivia security is not configured" }, { status: 503 }); }

  const admin = getAdminClient();
  const { data, error } = await admin.rpc("start_period_trivia_attempt", {
    p_event_id: parsed.data.eventId, p_user_id: userId, p_device_hash: deviceHash,
  });
  if (error) {
    const alreadyCompleted = /already completed/i.test(error.message);
    return NextResponse.json(
      { error: alreadyCompleted ? "This account has already completed this Trivia." : "This Trivia is not accepting entries right now.", completed: alreadyCompleted },
      { status: 409 },
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.attempt_id) return NextResponse.json({ error: "Unable to start this Trivia." }, { status: 500 });
  return NextResponse.json({ attemptId: row.attempt_id, startedAt: row.started_at });
}
