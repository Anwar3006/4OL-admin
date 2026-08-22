import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Part AK (AK-D8/D9) — browser-side security signal intake.
 *
 * Receives automation indicators and copy-event telemetry from
 * components/security/BotSignalCollector.tsx and stores them in
 * bot_signals keyed to the authenticated admin. Any admin role may report
 * (the rows are always scoped to the caller's own id via the service-role
 * insert), so no catalog permission is required.
 */

const SignalSchema = z.object({
  kind: z
    .enum(["headless_indicators", "copy_event", "automation_probe"])
    .catch("automation_probe"),
  detail: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser();
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = SignalSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid signal payload" }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("bot_signals").insert({
      admin_id: auth.user.id,
      kind: parsed.data.kind,
      // Cap the payload so a hostile caller can't use this as free storage.
      detail: JSON.parse(JSON.stringify(parsed.data.detail).slice(0, 4096)),
    });
    if (error) {
      // Migration not applied yet — accept silently (fail-open telemetry).
      return NextResponse.json({ accepted: false, reason: "telemetry_unavailable" });
    }
  } catch {
    return NextResponse.json({ accepted: false, reason: "telemetry_unavailable" });
  }

  return NextResponse.json({ accepted: true });
}
