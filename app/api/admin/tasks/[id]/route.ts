import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const MoveTaskSchema = z.object({
  status: z.enum(["new", "in_progress", "under_review", "completed"]),
  boardPosition: z.number().int().min(0),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAdminApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const parsed = MoveTaskSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.rpc("update_admin_task_status", {
    p_task_id: id,
    p_new_status: parsed.data.status,
    p_board_position: parsed.data.boardPosition,
    p_admin_id: user.id,
  });

  if (error) {
    console.error("[admin/tasks/:id PATCH] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to move task." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
