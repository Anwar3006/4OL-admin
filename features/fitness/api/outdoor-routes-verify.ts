import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import { ROUTE_CLASSES, ROUTE_VERIFY_ACTIONS } from "@/features/fitness/schema/moderation";

// m-verify-route flow (Gap Analysis Part F, phase 5): Verify & Publish or
// Reject a pending outdoor route. Writes verified_by = calling admin (F.5).
const VerifyRouteSchema = z.object({
  action: z.enum(ROUTE_VERIFY_ACTIONS),
  routeClass: z.enum(ROUTE_CLASSES).optional(),
  fitcoinsReward: z.number().int().min(0).max(10000).optional(),
  note: z.string().trim().max(2000).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiUser("fitness.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const { id } = await params;
  const parsed = VerifyRouteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const { data: route, error: lookupError } = await admin
    .from("fitness_outdoor_routes")
    .select("id, name, verification_status")
    .eq("id", id)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }
  if (!route) {
    return NextResponse.json({ error: "Route not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    verification_status: parsed.data.action === "approve" ? "approved" : "rejected",
    verified_by: user.id,
    verified_at: now,
    verification_note: parsed.data.note ?? null,
    updated_at: now,
  };
  if (parsed.data.action === "approve") {
    if (parsed.data.routeClass) updates.route_class = parsed.data.routeClass;
    if (parsed.data.fitcoinsReward !== undefined) {
      updates.fitcoins_reward = parsed.data.fitcoinsReward;
    }
  }

  const { error } = await admin
    .from("fitness_outdoor_routes")
    .update(updates)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: user.id,
    p_action_type: parsed.data.action === "approve" ? "verify_outdoor_route" : "reject_outdoor_route",
    p_target_table: "fitness_outdoor_routes",
    p_record_id: id,
    p_description: `${parsed.data.action === "approve" ? "Verified & published" : "Rejected"} outdoor route "${route.name}"`,
  });

  return NextResponse.json({ success: true });
}
