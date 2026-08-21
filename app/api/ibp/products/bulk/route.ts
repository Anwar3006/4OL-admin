import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Bulk product review (Gap Analysis Part C tab 5: "bulk approve").

const BulkReviewSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(200),
  action: z.enum(["approve", "reject"]),
  reason: z.string().trim().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("ibp.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = BulkReviewSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid bulk review payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await admin
    .from("ibp_products")
    .update({
      status: parsed.data.action === "approve" ? "published" : "rejected",
      rejection_reason: parsed.data.action === "reject" ? parsed.data.reason ?? null : null,
      reviewed_by: auth.user.id,
      reviewed_at: now,
    })
    .in("id", parsed.data.ids);

  if (error) {
    console.error("[ibp/products/bulk] Supabase error:", error.message);
    return NextResponse.json({ error: "Bulk review failed." }, { status: 500 });
  }

  return NextResponse.json({ updated: parsed.data.ids.length });
}
