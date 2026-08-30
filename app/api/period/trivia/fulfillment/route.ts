import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getPeriodRequestUserId } from "@/lib/period-request-auth";

export const runtime = "nodejs";

// Trivia prize fulfilment confirmation (gap-closure G5).
// After the admin marks a prize Sent, the winner sees an in-app prompt; the
// winner confirms receipt here, which moves the lifecycle to Fulfilled and
// closes the loop for the admin Trivia tab. Users can only confirm their own
// rows, and only once the prompt was actually sent.

const ConfirmSchema = z.object({ fulfillmentId: z.string().uuid() });

export async function POST(request: NextRequest) {
  const userId = await getPeriodRequestUserId(request);
  if (!userId) return NextResponse.json({ error: "Sign in to confirm your prize." }, { status: 401 });
  const parsed = ConfirmSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid confirmation request" }, { status: 400 });

  const admin = getSupabaseAdmin();
  const { data: row, error: findError } = await admin
    .from("period_trivia_fulfillment")
    .select("id,prize_status,prompt_sent_at,confirmed_at")
    .eq("id", parsed.data.fulfillmentId)
    .eq("user_id", userId)
    .maybeSingle();
  if (findError) return NextResponse.json({ error: "Unable to confirm your prize" }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Prize record not found" }, { status: 404 });
  if (row.confirmed_at) return NextResponse.json({ ok: true, alreadyConfirmed: true });
  if (!row.prompt_sent_at || row.prize_status === "pending") {
    return NextResponse.json({ error: "Your prize has not been sent yet — you will be prompted once it is." }, { status: 409 });
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from("period_trivia_fulfillment")
    .update({ confirmed_at: now, prize_status: "fulfilled", fulfilled_at: now })
    .eq("id", row.id);
  if (error) return NextResponse.json({ error: "Unable to confirm your prize" }, { status: 500 });
  return NextResponse.json({ ok: true, confirmedAt: now });
}
