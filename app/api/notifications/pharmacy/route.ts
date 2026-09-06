import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

/**
 * Pharmacy geo-marketing campaigns (Gap Analysis Part R, R-D4). The four
 * send-rules from the mockup footer are enforced server-side here:
 *   1. Radius must be one of the sanctioned picker values (0.5 / 2 / 5 km).
 *   2. A campaign always carries a name + message — no empty untargeted sends.
 *   3. Channel restricted to push/whatsapp (opt-out handling lives in the
 *      send pipeline, same as broadcasts).
 *   4. Audience count is recorded at create time from the segment preview so
 *      the compliance trail shows who was reachable.
 */
const CreateCampaignSchema = z.object({
  name: z.string().trim().min(1).max(160),
  message: z.string().trim().min(1).max(500),
  pharmacyId: z.uuid().optional().nullable(),
  radiusKm: z.union([z.literal(0.5), z.literal(2), z.literal(5)]),
  audienceCount: z.coerce.number().int().min(0).optional().nullable(),
  channel: z.enum(["push", "whatsapp"]).default("push"),
  scheduledAt: z.iso.datetime().optional().nullable(),
});

export async function GET() {
  const auth = await requireAdminApiUser("notifications.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("pharmacy_marketing_campaigns")
    .select(
      "id, pharmacy_id, name, message, radius_km, audience_count, channel, status, scheduled_at, sent_at, delivery_stats, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    // Table ships with the 20260820 delivery extension; degrade honestly.
    console.error("[notifications/pharmacy GET] Supabase error:", error.message);
    return NextResponse.json({ campaigns: [] });
  }

  return NextResponse.json({ campaigns: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("notifications.create");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const parsed = CreateCampaignSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid pharmacy campaign", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("pharmacy_marketing_campaigns")
    .insert({
      pharmacy_id: parsed.data.pharmacyId ?? null,
      name: parsed.data.name,
      message: parsed.data.message,
      radius_km: parsed.data.radiusKm,
      audience_count: parsed.data.audienceCount ?? null,
      channel: parsed.data.channel,
      status: parsed.data.scheduledAt ? "scheduled" : "draft",
      scheduled_at: parsed.data.scheduledAt ?? null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("[notifications/pharmacy POST] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to create campaign." }, { status: 500 });
  }

  return NextResponse.json({ campaign: data }, { status: 201 });
}
