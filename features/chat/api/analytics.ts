import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const QuerySchema = z.object({
  timeFilter: z.enum(["7", "30", "90", "year"]).default("30"),
});

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiUser("chats.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = QuerySchema.safeParse({
    timeFilter: req.nextUrl.searchParams.get("timeFilter") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid chat analytics query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const { data, error } = await admin.rpc("get_support_analytics", {
    time_filter: parsed.data.timeFilter,
  });

  if (error) {
    console.error("[chat/analytics] Supabase RPC error:", error.message);
    return NextResponse.json(
      { error: "Failed to load chat analytics." },
      { status: 500 },
    );
  }

  return NextResponse.json({ analytics: data });
}
