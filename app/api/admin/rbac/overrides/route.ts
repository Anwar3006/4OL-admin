import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  adminAuthErrorResponse,
  requireAdminApiUser,
} from "@/lib/admin-api-auth";
import { PERMISSION_KEYS } from "@/lib/permissions";
import { getAdminClient } from "@/lib/db/admin";

/**
 * Per-user permission overrides (grants/revokes on top of role defaults).
 *
 * POST   /api/admin/rbac/overrides — upsert an override (grant or revoke)
 * DELETE /api/admin/rbac/overrides?userId=&permissionKey= — remove one
 *
 * Gated by roles.edit (super_admin only by default).
 */

const PostOverrideSchema = z.object({
  userId: z.uuid(),
  permissionKey: z.enum(PERMISSION_KEYS as [string, ...string[]]),
  effect: z.enum(["grant", "revoke"]),
  reason: z.string().trim().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("roles.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = PostOverrideSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const { userId, permissionKey, effect, reason } = parsed.data;

  const { error } = await admin.from("admin_user_overrides").upsert(
    {
      user_id: userId,
      permission_key: permissionKey,
      effect,
      reason: reason ?? null,
      granted_by: auth.user.id,
    },
    { onConflict: "user_id,permission_key" },
  );

  if (error) {
    console.error("[admin/rbac/overrides POST] error:", error.message);
    return NextResponse.json({ error: "Failed to save override." }, { status: 500 });
  }

  await admin.from("activity_logs").insert({
    actor_id: auth.user.id,
    actor_name: auth.role,
    action_type: "rbac_override_set",
    target_table: "admin_user_overrides",
    record_id: userId,
    new_data: { permission_key: permissionKey, effect },
  });

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminApiUser("roles.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const userId = req.nextUrl.searchParams.get("userId");
  const permissionKey = req.nextUrl.searchParams.get("permissionKey");
  if (!userId || !permissionKey || !PERMISSION_KEYS.includes(permissionKey)) {
    return NextResponse.json({ error: "userId and valid permissionKey required" }, { status: 400 });
  }

  const admin = getAdminClient();
  const { error } = await admin
    .from("admin_user_overrides")
    .delete()
    .eq("user_id", userId)
    .eq("permission_key", permissionKey);

  if (error) {
    console.error("[admin/rbac/overrides DELETE] error:", error.message);
    return NextResponse.json({ error: "Failed to remove override." }, { status: 500 });
  }

  await admin.from("activity_logs").insert({
    actor_id: auth.user.id,
    actor_name: auth.role,
    action_type: "rbac_override_removed",
    target_table: "admin_user_overrides",
    record_id: userId,
    new_data: { permission_key: permissionKey },
  });

  return NextResponse.json({ success: true });
}
