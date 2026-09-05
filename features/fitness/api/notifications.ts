import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

/**
 * POST /api/fitness/notifications — manual fitness alert composer
 * (FITNESS_MOCKUP_GAP_ANALYSIS.md, D1/D5). Writes into the SAME shared
 * `notifications` table the main-app inbox reads, via the service-role
 * `notify_fitness()` helper. Automated challenge/streak/billing alerts come
 * from the fn_fitness_* cron functions; this route is the manual channel
 * (e.g. a workout-reminder campaign or a nutrition tip blast).
 *
 * Push dispatch rides the existing expo-push pipeline that already watches
 * the notifications table — no parallel feed is created.
 */

const FITNESS_TYPES = [
  "workout_reminder", "challenge", "streak_alert", "billing", "recovery", "nutrition",
] as const;

const ALLOWED_SCREENS = ["fitness", "challenges", "premium", "fitcoins"] as const;

const SendSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(100),
  type: z.enum(FITNESS_TYPES),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(500),
  // Deep-link target must be one of the fitness screens the mobile
  // notificationRouting allowlist knows about; anything else is dropped.
  screen: z.enum(ALLOWED_SCREENS).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("fitness_notifications.send");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = SendSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }
  const { userIds, type, title, body, screen } = parsed.data;

  const admin = getAdminClient();
  const metadata = screen ? { screen } : {};

  let sent = 0;
  for (const userId of userIds) {
    const { error } = await admin.rpc("notify_fitness", {
      p_user_id: userId,
      p_type: type,
      p_title: title,
      p_body: body,
      p_metadata: metadata,
    });
    if (!error) sent += 1;
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "send_fitness_notifications",
    p_target_table: "notifications",
    p_record_id: type,
    p_description: `Sent fitness alert "${title}" (${type}) to ${sent}/${userIds.length} user(s)`,
  });

  return NextResponse.json({ success: true, sent, failed: userIds.length - sent });
}
