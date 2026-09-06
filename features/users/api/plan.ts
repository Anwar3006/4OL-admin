import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

// Admin-driven subscription plan change (mockup "Upgrade Plan" bulk action
// and Premium tab actions). Writes user_subscriptions defensively — the
// table exists but is pre-Epic-16, so shape mismatches surface as errors
// instead of silently succeeding.

const PlanSchema = z.object({
  plan: z.enum(["free", "standard", "premium", "featured"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("users.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id: userId } = await params;
  const parsed = PlanSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid plan payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const { plan } = parsed.data;

  if (plan === "free") {
    // Downgrade: deactivate any active subscription.
    const { error } = await admin
      .from("user_subscriptions")
      .update({ status: "cancelled" })
      .eq("user_id", userId)
      .eq("status", "active");
    if (error) {
      console.error("[users/[id]/plan] downgrade error:", error.message);
      return NextResponse.json(
        { error: `Failed to change plan: ${error.message}` },
        { status: 500 },
      );
    }
  } else {
    // Upgrade/renew: reactivate an existing row, otherwise create one.
    const { data: updated, error: updateError } = await admin
      .from("user_subscriptions")
      .update({ plan, status: "active" })
      .eq("user_id", userId)
      .select("id");
    if (updateError) {
      return NextResponse.json(
        { error: `Failed to change plan: ${updateError.message}` },
        { status: 500 },
      );
    }
    if ((updated ?? []).length === 0) {
      const { error: insertError } = await admin
        .from("user_subscriptions")
        .insert({ user_id: userId, plan, status: "active" });
      if (insertError) {
        return NextResponse.json(
          { error: `Failed to change plan: ${insertError.message}` },
          { status: 500 },
        );
      }
    }
  }

  await admin.from("activity_logs").insert({
    actor_id: auth.user.id,
    action_type: "user_plan_change",
    target_table: "user_subscriptions",
    new_data: { user_id: userId, plan },
  });

  return NextResponse.json({ success: true, plan });
}
