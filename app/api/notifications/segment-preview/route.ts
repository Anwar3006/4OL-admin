import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const SegmentSchema = z.object({
  segmentFilter: z.record(z.string(), z.unknown()),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("notifications.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = SegmentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid segment filter", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const { data, error } = await admin.rpc("get_notification_segment_count", {
    p_segment_filter: parsed.data.segmentFilter,
  });

  if (error) {
    console.error("[notifications/segment-preview] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to preview segment." }, { status: 500 });
  }

  return NextResponse.json(data);
}
